/*
  Admin: login, dashboard, order status, emails.
  Admins are user accounts with isAdmin: true (create one with `npm run seed:admin`).
*/

const express = require("express");
const bcrypt = require("bcryptjs");

const router = express.Router();

const User = require("../models/user");
const Order = require("../models/order");

const adminAuth = require("../middleware/adminAuth");
const rateLimit = require("../middleware/rateLimit");

const email = require("../services/email");

const { HttpError, signIn, signOut, text, isObjectId, EMAIL, normalisePhone } = require("../utils/http");

const { STATUSES } = Order;

const loginLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: "Too many login attempts. Please wait 15 minutes and try again."
});

/* ============================================================
   LOGIN (PUBLIC)
============================================================ */

router.post("/login", loginLimit, async (req, res) => {

    const adminEmail = text(req.body.email, 120).toLowerCase();
    const password = String(req.body.password || "");

    if (!adminEmail || !password) throw new HttpError(400, "Email and password are required.");

    const admin = await User.findOne({ email: adminEmail, isAdmin: true });

    if (!admin || !(await bcrypt.compare(password, admin.password))) {
        throw new HttpError(401, "Invalid admin credentials.");
    }

    signIn(res, "admin", { id: admin._id, isAdmin: true });

    res.json({ success: true, admin: { name: admin.name, email: admin.email } });

});

router.post("/logout", (req, res) => {

    signOut(res, "admin");

    res.json({ success: true });

});

/* ============================================================
   EVERYTHING BELOW REQUIRES ADMIN LOGIN
============================================================ */

router.use(adminAuth);

router.get("/me", (req, res) => {

    res.json({ success: true, admin: { name: req.admin.name, email: req.admin.email } });

});

function adminView(o) {

    const paidPayment = (o.payments || []).find((p) => p.status === "paid");

    return {
        _id: o._id,
        orderId: o.orderId || String(o._id),
        name: o.name || o.user?.name || "Unknown",
        email: o.email || o.user?.email || "",
        account: o.user ? { name: o.user.name, email: o.user.email } : null,
        phone: o.phone || "",
        address: o.address || "",
        note: o.note || "",
        items: (o.items || []).map((i) => ({ name: i.name, size: i.size, qty: i.qty, price: i.price, image: i.image })),
        total: o.total || 0,
        status: o.status,
        paymentStatus: o.paymentStatus,
        paidOffline: !!o.paidOffline,
        testPayment: !!paidPayment?.test,
        paidReference: paidPayment?.reference || "",
        rider: o.rider || null,
        createdAt: o.createdAt,
        paidAt: o.paidAt,
        shippedAt: o.shippedAt,
        completedAt: o.completedAt
    };

}

/* ============================================================
   DASHBOARD
   (totals worked out here rather than in the database, so it
   runs the same on any MongoDB-compatible database)
============================================================ */

router.get("/dashboard", async (req, res) => {

    const [users, orders] = await Promise.all([
        User.find({}, { name: 1, email: 1, isAdmin: 1, createdAt: 1 }).sort({ createdAt: -1 }).lean(),
        Order.find({ autoCancelled: { $ne: true } }).populate("user", "name email").sort({ createdAt: -1 }).lean()
    ]);

    const ordersPerUser = new Map();

    for (const order of orders) {
        if (order.user) ordersPerUser.set(String(order.user._id), (ordersPerUser.get(String(order.user._id)) || 0) + 1);
    }

    const paid = orders.filter((o) => o.paymentStatus === "paid" && o.status !== "cancelled");

    const stats = {
        users: users.filter((u) => !u.isAdmin).length,
        toFulfil: paid.filter((o) => o.status === "pending" || o.status === "shipped").length,
        unpaid: orders.filter((o) => o.paymentStatus !== "paid" && o.status !== "cancelled").length,
        completed: paid.filter((o) => o.status === "completed").length,
        revenue: paid.reduce((sum, o) => sum + (o.total || 0), 0)
    };

    res.json({
        success: true,
        stats,
        users: users.map((u) => ({
            _id: u._id,
            name: u.name,
            email: u.email,
            isAdmin: !!u.isAdmin,
            createdAt: u.createdAt,
            orders: ordersPerUser.get(String(u._id)) || 0
        })),
        orders: orders.map(adminView),
        emailReady: email.isConfigured()
    });

});

/* ============================================================
   ORDER STATUS
   PATCH /api/admin/orders/:id/status  { status, riderName?, riderPhone? }
   - unpaid orders can only stay pending or be cancelled
   - shipping sends the customer the rider's details; delivery sends a thank-you
============================================================ */

router.patch("/orders/:id/status", async (req, res) => {

    const status = String(req.body.status || "");

    if (!STATUSES.includes(status)) throw new HttpError(400, "Unknown status.");

    const order = isObjectId(req.params.id) && await Order.findById(req.params.id).populate("user", "name email");

    if (!order) throw new HttpError(404, "Order not found.");

    if (order.paymentStatus !== "paid" && !["pending", "cancelled"].includes(status)) {
        throw new HttpError(400, "This order hasn't been paid yet, so it can only stay pending or be cancelled.");
    }

    const previous = order.status;

    if (status === "shipped") {

        const riderName = text(req.body.riderName, 80);
        const riderPhoneRaw = text(req.body.riderPhone, 20);
        const riderPhone = riderPhoneRaw ? normalisePhone(riderPhoneRaw) : "";

        if (riderPhoneRaw && !riderPhone) throw new HttpError(400, "Rider's phone number must be 11 digits.");

        order.rider = { name: riderName, phone: riderPhone };

    }

    order.status = status;

    const now = new Date();

    if (status !== previous) {
        if (status === "shipped") order.shippedAt = now;
        if (status === "completed") order.completedAt = now;
        if (status === "cancelled") order.cancelledAt = now;
    }

    // orders from before checkout asked for an email
    if (!order.email && order.user?.email) order.email = order.user.email;

    await order.save();

    if (status !== previous || (status === "shipped" && req.body.resend)) {
        if (status === "shipped") email.orderShipped(order);
        if (status === "completed") email.orderDelivered(order);
    }

    if (status === "cancelled" && previous !== "cancelled" && order.paymentStatus === "paid" && !order.paidOffline) {
        console.warn(`Order ${order.orderId} was cancelled after payment. Refund it from the Paystack dashboard.`);
    }

    res.json({ success: true, order: adminView(order.toObject()) });

});

/* ============================================================
   DELETE ORDER
   Orders paid through Paystack are kept as a record (cancel them instead).
============================================================ */

router.delete("/orders/:id", async (req, res) => {

    const order = isObjectId(req.params.id) && await Order.findById(req.params.id);

    if (!order) throw new HttpError(404, "Order not found.");

    if (order.paymentStatus === "paid" && !order.paidOffline) {
        throw new HttpError(400, "Orders paid through Paystack can't be deleted, so there's a record of the payment. Cancel it instead.");
    }

    await order.deleteOne();

    res.json({ success: true, message: "Order deleted." });

});

/* ============================================================
   SEND EMAIL
   POST /api/admin/send-email  { to: "ALL USERS" | email, subject, message }
   "ALL USERS" sends a separate email to each customer, so nobody sees the others' addresses.
============================================================ */

router.post("/send-email", async (req, res) => {

    const to = text(req.body.to, 120);
    const subject = text(req.body.subject, 150);
    const message = text(req.body.message, 10000);

    if (!to || !subject || !message) throw new HttpError(400, "Recipient, subject and message are all required.");

    if (!email.isConfigured()) {
        throw new HttpError(503, "Email isn't set up yet: add RESEND_API_KEY to the server's settings.");
    }

    let recipients;

    if (to.toUpperCase() === "ALL USERS") {

        recipients = (await User.find({ isAdmin: { $ne: true } }, { email: 1 }).lean()).map((u) => u.email);

        if (!recipients.length) throw new HttpError(400, "There are no customers to email yet.");

    } else {

        if (!EMAIL.test(to)) throw new HttpError(400, "Enter a valid email address, or choose ALL USERS.");

        recipients = [to.toLowerCase()];

    }

    const result = await email.custom(recipients, subject, message);

    if (result.sent === 0) {
        throw new HttpError(502, "The email couldn't be sent. Check the server log for the reason from Resend.");
    }

    res.json({
        success: true,
        sent: result.sent,
        failed: result.failed,
        message: result.failed
            ? `Sent to ${result.sent} of ${recipients.length} recipients. ${result.failed} failed (see the server log).`
            : `Email sent to ${result.sent} recipient${result.sent === 1 ? "" : "s"}.`
    });

});

module.exports = router;
