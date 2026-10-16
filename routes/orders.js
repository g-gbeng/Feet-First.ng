/*
  Placing and viewing orders. Payment is through Paystack (see services/orders.js).
*/

const express = require("express");

const router = express.Router();

const Order = require("../models/order");
const Cart = require("../models/cart");
const Product = require("../models/product");

const auth = require("../middleware/auth");

const generateOrderId = require("../utils/generateOrderId");

const { startPayment } = require("../services/orders");

const { HttpError, text, isObjectId, EMAIL, normalisePhone, publicBase } = require("../utils/http");

router.use(auth);

const callbackUrl = (req) => `${publicBase(req)}/payment-callback.html`;

/* What a customer sees of their order (no internal payment details) */
function customerView(order) {

    const o = order.toObject ? order.toObject() : order;

    return {
        _id: o._id,
        orderId: o.orderId,
        items: (o.items || []).map((item) => ({
            name: item.name,
            image: item.image,
            size: item.size,
            qty: item.qty,
            price: item.price
        })),
        name: o.name,
        phone: o.phone,
        email: o.email,
        address: o.address,
        note: o.note,
        total: o.total,
        status: o.status,
        paymentStatus: o.paymentStatus,
        paidOffline: !!o.paidOffline,
        rider: o.status === "shipped" && o.rider ? { name: o.rider.name || "", phone: o.rider.phone || "" } : null,
        paidAt: o.paidAt,
        shippedAt: o.shippedAt,
        completedAt: o.completedAt,
        createdAt: o.createdAt
    };

}

/*
=========================================
CHECKOUT
POST /api/orders/checkout  { name, phone, email, address, note }

Creates the order from the cart (prices from the database, never the browser)
and starts a Paystack payment. Returns { order, authorizationUrl }:
the browser goes to authorizationUrl to pay.
=========================================
*/

router.post("/checkout", async (req, res) => {

    const name = text(req.body.name, 80);
    const phone = normalisePhone(req.body.phone);
    const email = text(req.body.email || req.user.email, 120).toLowerCase();
    const address = text(req.body.address, 500);
    const note = text(req.body.note, 500);

    const errors = {};

    if (!name) errors.name = "Enter your full name.";
    if (!phone) errors.phone = "Enter an 11-digit phone number, e.g. 08012345678.";
    if (!EMAIL.test(email)) errors.email = "Enter a valid email address for your receipt.";
    if (address.length < 5) errors.address = "Enter your delivery address.";

    if (Object.keys(errors).length) {
        throw new HttpError(400, "Please check the highlighted fields.", { errors });
    }

    const cart = await Cart.findOne({ userId: req.user._id });

    if (!cart || cart.items.length === 0) throw new HttpError(400, "Your cart is empty.");

    const products = await Product.find({ _id: { $in: cart.items.map((i) => i.productId) } }).lean();

    const byId = new Map(products.map((p) => [String(p._id), p]));

    const unavailable = [];

    let total = 0;

    const items = [];

    for (const line of cart.items) {

        const product = byId.get(String(line.productId));

        if (!product || !product.inStock || !product.sizes.includes(line.size)) {
            unavailable.push(product ? `${product.name} (size ${line.size})` : "A removed product");
            continue;
        }

        total += product.price * line.quantity;

        items.push({
            product: product._id,
            name: product.name,
            size: String(line.size),
            qty: line.quantity,
            price: product.price,
            image: product.image
        });

    }

    if (unavailable.length) {
        throw new HttpError(400, `${unavailable.join(", ")} is no longer available. Please remove it from your cart.`);
    }

    // An earlier checkout the customer never paid for is replaced by this one.
    // (If they did pay it after all, it comes back automatically.)
    await Order.updateMany(
        { user: req.user._id, paymentStatus: "unpaid", status: "pending" },
        { $set: { status: "cancelled", autoCancelled: true, cancelledAt: new Date() } }
    );

    let order;

    for (let attempt = 0; !order; attempt++) {
        try {
            order = await Order.create({
                orderId: generateOrderId(),
                user: req.user._id,
                name,
                phone,
                email,
                address,
                note,
                items,
                total,
                status: "pending",
                paymentStatus: "unpaid"
            });
        } catch (err) {
            if (err.code !== 11000 || attempt >= 3) throw err; // same order number at the same moment: try another
        }
    }

    const payment = await startPayment(order, callbackUrl(req));

    res.status(201).json({
        success: true,
        order: customerView(order),
        authorizationUrl: payment.authorizationUrl,
        test: payment.test
    });

});

/*
=========================================
PAY FOR AN UNPAID ORDER (again)
POST /api/orders/:id/pay
=========================================
*/

router.post("/:id/pay", async (req, res) => {

    const order = isObjectId(req.params.id) && await Order.findOne({ _id: req.params.id, user: req.user._id });

    if (!order) throw new HttpError(404, "Order not found.");

    if (order.paymentStatus === "paid") throw new HttpError(400, "This order has already been paid.");

    if (order.status === "cancelled" && !order.autoCancelled) {
        throw new HttpError(400, "This order was cancelled. Please place a new order.");
    }

    if (!order.email) order.email = req.user.email;

    if (order.status === "cancelled" && order.autoCancelled) {

        // paying an order that a newer checkout replaced: bring it back, and set the newer unpaid one aside
        await Order.updateMany(
            { user: req.user._id, _id: { $ne: order._id }, paymentStatus: "unpaid", status: "pending" },
            { $set: { status: "cancelled", autoCancelled: true, cancelledAt: new Date() } }
        );

        order.status = "pending";
        order.autoCancelled = false;
        order.cancelledAt = undefined;

    }

    const payment = await startPayment(order, callbackUrl(req));

    res.json({ success: true, authorizationUrl: payment.authorizationUrl, test: payment.test });

});

/*
=========================================
MY ORDERS
GET /api/orders/mine
Orders replaced by a newer checkout are left out.
=========================================
*/

router.get("/mine", async (req, res) => {

    const orders = await Order.find({ user: req.user._id, autoCancelled: { $ne: true } })
        .sort({ createdAt: -1 })
        .limit(100);

    res.json({ success: true, orders: orders.map(customerView) });

});

module.exports = router;
