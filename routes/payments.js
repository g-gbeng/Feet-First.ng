/*
  Confirming Paystack payments. Two ways in, same result:
  - POST /api/payments/verify  — the customer's browser returns from Paystack
  - POST /api/payments/webhook — Paystack calls the site directly (needs a public URL)
  Either way the server asks Paystack whether the money arrived before marking an order paid.
*/

const Order = require("../models/order");

const paystack = require("../services/paystack");

const { confirmPayment } = require("../services/orders");

const { HttpError } = require("../utils/http");

/* POST /api/payments/verify  { reference }  (signed-in customer) */
async function verify(req, res) {

    const reference = String(req.body?.reference || "");

    if (!/^[A-Za-z0-9.=_-]{6,100}$/.test(reference)) {
        throw new HttpError(400, "Invalid payment reference.");
    }

    const owner = await Order.exists({ "payments.reference": reference, user: req.user._id });

    if (!owner) throw new HttpError(404, "Payment not found.");

    const result = await confirmPayment(reference);

    const payment = result.order.payments.find((p) => p.reference === reference);

    res.json({
        success: true,
        paid: result.paid,
        status: result.paid ? "paid" : result.status,
        orderId: result.order.orderId,
        total: result.order.total,
        test: !!payment?.test,
        message: result.paid ? "Payment successful" : "Payment was not completed"
    });

}

/* POST /api/payments/webhook  (Paystack -> us; raw JSON body) */
async function webhook(req, res) {

    const signature = req.get("x-paystack-signature");

    if (!paystack.signatureIsValid(req.body, signature)) {
        return res.status(401).json({ success: false });
    }

    let event;

    try {
        event = JSON.parse(req.body.toString("utf8"));
    } catch {
        return res.status(400).json({ success: false });
    }

    // Answer quickly; Paystack retries on failure, and confirmPayment is safe to repeat
    res.status(200).json({ success: true });

    if (event.event === "charge.success" && event.data?.reference) {
        confirmPayment(String(event.data.reference)).catch((err) =>
            console.error("Webhook payment confirmation failed:", err.message)
        );
    }

}

module.exports = { verify, webhook };
