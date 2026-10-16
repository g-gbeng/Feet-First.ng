/*
  Starting payments and confirming them.

  The flow:
  1. Checkout creates the order from the customer's cart (prices come from the
     database, never from the browser) and starts a Paystack payment for it.
  2. The customer pays on Paystack and is sent back to payment-callback.html,
     which asks the server to confirm. Paystack also calls the webhook directly.
  3. confirmPayment() asks Paystack whether the money really arrived, checks the
     amount, and marks the order paid exactly once, however many times it's called.
*/

const Order = require("../models/order");
const Cart = require("../models/cart");
const User = require("../models/user");

const paystack = require("./paystack");
const email = require("./email");

const { HttpError } = require("../utils/http");

/* -------------------------------------------------
   STARTING A PAYMENT
------------------------------------------------- */

async function startPayment(order, callbackUrl) {

    const amountKobo = Math.round(order.total * 100);

    const reference = paystack.newReference(order.orderId);

    const result = await paystack.initialize({
        email: order.email,
        amountKobo,
        reference,
        callbackUrl,
        metadata: {
            orderId: order.orderId,
            customerName: order.name,
            phone: order.phone
        }
    });

    order.payments.push({
        reference: result.reference || reference,
        amountKobo,
        test: !!result.test
    });

    await order.save();

    return { authorizationUrl: result.authorizationUrl, reference: result.reference || reference, test: !!result.test };

}

/* -------------------------------------------------
   CONFIRMING A PAYMENT
------------------------------------------------- */

/*
  Safe to call many times for the same reference (browser return, webhook,
  background check): only the first successful call changes anything.
  Returns { order, paid, status }.
*/
async function confirmPayment(reference) {

    let order = await Order.findOne({ "payments.reference": reference });

    if (!order) throw new HttpError(404, "Payment not found.");

    let payment = order.payments.find((p) => p.reference === reference);

    if (payment.status === "paid") {
        return { order, paid: true, status: "paid" };
    }

    const result = await paystack.verify(reference, payment.amountKobo);

    if (!result.paid) {

        if (["failed", "abandoned", "reversed"].includes(result.status) && payment.status === "pending") {
            payment.status = "failed";
            await order.save();
        }

        return { order, paid: false, status: result.status || "pending" };

    }

    if (result.amountKobo !== payment.amountKobo || (result.currency && result.currency !== "NGN")) {
        console.error(`Payment ${reference}: amount mismatch (expected ${payment.amountKobo}, got ${result.amountKobo} ${result.currency})`);
        throw new HttpError(400, "The amount paid does not match this order. Please contact us.");
    }

    const now = new Date();

    // Only one caller can move the order from unpaid to paid
    const claim = await Order.updateOne(
        { _id: order._id, paymentStatus: "unpaid" },
        { $set: { paymentStatus: "paid", paidAt: now } }
    );

    order = await Order.findById(order._id);

    payment = order.payments.find((p) => p.reference === reference);

    if (payment.status !== "paid") {
        payment.status = "paid";
        payment.paidAt = now;
        await order.save();
    }

    if (claim.modifiedCount === 1) {

        await afterPaid(order);

    } else if (order.payments.filter((p) => p.status === "paid").length > 1) {

        // e.g. paid in two browser tabs: the order is paid once, the extra payment should be refunded
        console.warn(`Order ${order.orderId} was paid more than once (latest: ${reference}). Refund the extra payment in your Paystack dashboard.`);

    }

    return { order, paid: true, status: "paid" };

}

/*
  Runs once, after the first confirmation:
  - an order that was set aside because the customer started a newer checkout
    goes back to pending, because they did pay for it
  - the paid items leave the customer's cart
  - the customer gets a confirmation email
*/
async function afterPaid(order) {

    if (order.status === "cancelled" && order.autoCancelled) {
        order.status = "pending";
        order.autoCancelled = false;
        order.cancelledAt = undefined;
        await order.save();
    }

    if (order.status === "cancelled") {
        console.warn(`Order ${order.orderId} was paid after being cancelled. Refund it in your Paystack dashboard, or reopen it.`);
    }

    const paid = new Set(order.items.map((item) => `${item.product}:${item.size}`));

    const cart = await Cart.findOne({ userId: order.user });

    if (cart) {
        cart.items = cart.items.filter((item) => !paid.has(`${item.productId}:${item.size}`));
        await cart.save();
    }

    email.orderConfirmed(order);

}

/* -------------------------------------------------
   BACKGROUND CHECK
------------------------------------------------- */

/*
  A customer can pay and close the page before coming back to the site.
  Every 15 minutes, ask Paystack about payments started 10 minutes to 2 days ago
  that are still pending. (Skipped in test mode, where every check says "paid".)
*/
function startPaymentChecks() {

    if (paystack.isTestMode()) return;

    const run = async () => {

        const now = Date.now();

        const orders = await Order.find({
            paymentStatus: "unpaid",
            payments: {
                $elemMatch: {
                    status: "pending",
                    createdAt: { $lte: new Date(now - 10 * 60 * 1000), $gte: new Date(now - 2 * 24 * 60 * 60 * 1000) }
                }
            }
        }).limit(50);

        for (const order of orders) {
            for (const payment of order.payments.filter((p) => p.status === "pending")) {
                try {
                    await confirmPayment(payment.reference);
                } catch (err) {
                    console.error(`Payment check for ${payment.reference} failed:`, err.message);
                }
            }
        }

    };

    setInterval(() => run().catch((err) => console.error("Payment check failed:", err.message)), 15 * 60 * 1000).unref();

}

/* -------------------------------------------------
   ORDERS FROM BEFORE PAYSTACK
------------------------------------------------- */

/*
  Orders placed through the old WhatsApp checkout have no payment status.
  Once, at start-up: count them as paid outside the site (so they keep showing
  as normal orders and in revenue), except cancelled ones. They also get the
  customer's account email, so status emails can reach them.
*/
async function migrateLegacyOrders() {

    const legacy = await Order.find({ paymentStatus: { $exists: false } }, { user: 1, email: 1, status: 1 }).lean();

    if (!legacy.length) return;

    const userIds = [...new Set(legacy.filter((o) => o.user && !o.email).map((o) => String(o.user)))];

    const users = await User.find({ _id: { $in: userIds } }, { email: 1 }).lean();

    const emails = new Map(users.map((u) => [String(u._id), u.email]));

    let paidCount = 0;

    for (const order of legacy) {

        const set = order.status === "cancelled"
            ? { paymentStatus: "unpaid" }
            : { paymentStatus: "paid", paidOffline: true };

        if (set.paidOffline) paidCount++;

        if (!order.email && order.user && emails.has(String(order.user))) {
            set.email = emails.get(String(order.user));
        }

        await Order.updateOne({ _id: order._id, paymentStatus: { $exists: false } }, { $set: set });

    }

    console.log(`Updated ${legacy.length} order(s) from before Paystack: ${paidCount} marked "paid before Paystack".`);

}

module.exports = { startPayment, confirmPayment, startPaymentChecks, migrateLegacyOrders };
