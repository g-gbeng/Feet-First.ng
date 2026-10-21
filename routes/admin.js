/*
  Admin: login, dashboard, order status, emails.
  Admins are user accounts with isAdmin: true (create one with `npm run seed:admin`).
*/

const express = require("express");
const bcrypt = require("bcryptjs");

const router = express.Router();

const User = require("../models/user");
const Order = require("../models/order");
const EmailTemplate = require("../models/emailTemplate");
const EmailLog = require("../models/emailLog");
const Setting = require("../models/setting");

const adminAuth = require("../middleware/adminAuth");
const rateLimit = require("../middleware/rateLimit");

const email = require("../services/email");
const delivery = require("../services/delivery");

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
        subtotal: o.subtotal ?? ((o.total || 0) - (o.delivery?.fee || 0)),
        delivery: o.delivery?.zone ? { zoneLabel: o.delivery.zoneLabel, area: o.delivery.area, fee: o.delivery.fee } : null,
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

    if (status !== previous || (status === "shipped" && req.body.notifyAgain)) {
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
   DELIVERY FEES
   GET /api/admin/delivery-fees  ->  zones with their current fee
   PUT /api/admin/delivery-fees  { mainland, island, outskirts }
   New fees apply to new checkouts; orders already placed keep their fee.
============================================================ */

router.get("/delivery-fees", async (req, res) => {

    res.json({ success: true, zones: await delivery.options() });

});

router.put("/delivery-fees", async (req, res) => {

    await delivery.saveFees(req.body);

    res.json({ success: true, zones: await delivery.options() });

});

/* ============================================================
   EMAIL TEMPLATES
   Placeholders {{name}}, {{firstName}} and {{email}} are filled in
   for each recipient when the email is sent.
============================================================ */

// The drafts that were in .env, added once so there's something to start from
const STARTER_TEMPLATES = [
    {
        name: "Welcome",
        subject: "Welcome to FeetFirst.ng",
        message: "Hello {{firstName}},\n\nWelcome to the FeetFirst.ng family! Your registration has been successfully completed.\n\nHave fun shopping!"
    },
    {
        name: "Order shipped (rider details)",
        subject: "Your FeetFirst.ng order is on its way",
        message: "Hello {{firstName}},\n\nYour order [order number] has been shipped.\n\nThe rider's details are:\nRider name: [name]\nRider number: [number]\n\nThank you for shopping with FeetFirst.ng."
    },
    {
        name: "Order delivered",
        subject: "Your FeetFirst.ng order has been delivered",
        message: "Hello {{firstName}},\n\nYour order [order number] has been delivered. We at FeetFirst.ng hope you enjoy your package.\n\nThank you for shopping with FeetFirst.ng."
    }
];

async function addStarterTemplates() {

    // the flag makes sure deleted starter templates don't come back
    const claimed = await Setting.updateOne(
        { _id: "starterTemplates" },
        { $setOnInsert: { value: true } },
        { upsert: true }
    );

    if (claimed.upsertedCount === 1 && (await EmailTemplate.countDocuments()) === 0) {
        await EmailTemplate.insertMany(STARTER_TEMPLATES);
    }

}

function templateInput(body) {

    const name = text(body.name, 80);
    const subject = text(body.subject, 150);
    const message = String(body.message ?? "").replace(/\r\n/g, "\n").trim().slice(0, 10000);

    const errors = {};

    if (!name) errors.templateName = "Give the template a name.";
    if (!subject) errors.templateSubject = "Enter a subject.";
    if (!message) errors.templateMessage = "Enter the message.";

    if (Object.keys(errors).length) throw new HttpError(400, Object.values(errors)[0], { errors });

    return { name, subject, message };

}

async function checkNameFree(name, exceptId) {

    const all = await EmailTemplate.find({}, { name: 1 }).lean();

    const taken = all.some((t) => t.name.toLowerCase() === name.toLowerCase() && String(t._id) !== String(exceptId));

    if (taken) {
        throw new HttpError(400, "There's already a template with that name.", { errors: { templateName: "There's already a template with that name." } });
    }

}

const templateView = (t) => ({ _id: t._id, name: t.name, subject: t.subject, message: t.message, updatedAt: t.updatedAt });

router.get("/templates", async (req, res) => {

    await addStarterTemplates();

    const templates = await EmailTemplate.find().sort({ name: 1 }).lean();

    res.json({ success: true, templates: templates.map(templateView) });

});

router.post("/templates", async (req, res) => {

    const input = templateInput(req.body);

    if ((await EmailTemplate.countDocuments()) >= 100) throw new HttpError(400, "You can keep up to 100 templates. Delete one first.");

    await checkNameFree(input.name);

    const template = await EmailTemplate.create(input);

    res.status(201).json({ success: true, template: templateView(template) });

});

router.put("/templates/:id", async (req, res) => {

    const template = isObjectId(req.params.id) && await EmailTemplate.findById(req.params.id);

    if (!template) throw new HttpError(404, "Template not found.");

    const input = templateInput(req.body);

    await checkNameFree(input.name, template._id);

    template.set(input);

    await template.save();

    res.json({ success: true, template: templateView(template) });

});

router.delete("/templates/:id", async (req, res) => {

    const result = isObjectId(req.params.id) && await EmailTemplate.deleteOne({ _id: req.params.id });

    if (!result || result.deletedCount === 0) throw new HttpError(404, "Template not found.");

    res.json({ success: true });

});

/* ============================================================
   SEND EMAIL
   POST /api/admin/send-email  { to: "ALL USERS" | email, subject, message, templateId? }
   "ALL USERS" sends a separate email to each customer, so nobody sees the others' addresses.
============================================================ */

router.post("/send-email", async (req, res) => {

    const to = text(req.body.to, 120);
    const subject = text(req.body.subject, 150);
    const message = String(req.body.message ?? "").replace(/\r\n/g, "\n").trim().slice(0, 10000);

    if (!to || !subject || !message) throw new HttpError(400, "Recipient, subject and message are all required.");

    if (!email.isConfigured()) {
        throw new HttpError(503, "Email isn't set up yet: add BREVO_API_KEY to the server's settings.");
    }

    let people;
    let toLabel;

    if (to.toUpperCase() === "ALL USERS") {

        people = await User.find({ isAdmin: { $ne: true } }, { email: 1, name: 1 }).lean();

        if (!people.length) throw new HttpError(400, "There are no customers to email yet.");

        toLabel = "ALL USERS";

    } else {

        if (!EMAIL.test(to)) throw new HttpError(400, "Enter a valid email address, or choose ALL USERS.");

        const address = to.toLowerCase();

        // a customer's own name fills in {{name}}; anyone else gets "Customer"
        const customer = await User.findOne({ email: address }, { email: 1, name: 1 }).lean();

        people = [customer || { email: address }];

        toLabel = address;

    }

    const template = isObjectId(req.body.templateId) ? await EmailTemplate.findById(req.body.templateId).lean() : null;

    const result = await email.custom(people, subject, message, {
        toLabel,
        template: template ? template.name : undefined,
        sentBy: req.admin.email
    });

    if (result.sent === 0) {
        throw new HttpError(502, `The email couldn't be sent. ${result.reasons[0] || "Check the server log."}`);
    }

    res.json({
        success: true,
        sent: result.sent,
        failed: result.failed,
        message: result.failed
            ? `Sent to ${result.sent} of ${people.length} recipients. ${result.failed} failed: see Email history.`
            : `Email sent to ${result.sent} recipient${result.sent === 1 ? "" : "s"}.`
    });

});

/* ============================================================
   EMAIL HISTORY
   GET /api/admin/email-history?type=all|admin|automatic&q=...&before=<date>
   Newest first, 30 at a time; pass the last entry's date as "before" for more.
============================================================ */

router.get("/email-history", async (req, res) => {

    const filter = {};

    if (req.query.type === "admin") filter.kind = "admin";
    if (req.query.type === "automatic") filter.kind = { $ne: "admin" };
    if (req.query.type === "problems") filter.status = { $in: ["failed", "partial", "skipped"] };

    const before = new Date(String(req.query.before || ""));

    if (!Number.isNaN(before.getTime())) filter.createdAt = { $lt: before };

    const q = typeof req.query.q === "string" ? req.query.q.trim().toLowerCase().slice(0, 100) : "";

    // searching is done here (not in the database) so it runs the same on any MongoDB-compatible database
    const pageSize = 30;

    let items = [];
    let cursorDate = filter.createdAt;
    let more = false;

    for (let round = 0; round < 20; round++) {

        const batch = await EmailLog.find(cursorDate ? { ...filter, createdAt: cursorDate } : filter)
            .sort({ createdAt: -1 })
            .limit(200)
            .lean();

        const matching = q
            ? batch.filter((e) => [e.subject, e.toLabel, e.orderId, e.template?.name, ...(e.recipients || [])].some((v) => String(v || "").toLowerCase().includes(q)))
            : batch;

        items.push(...matching);

        if (items.length > pageSize) {
            more = true;
            break;
        }

        if (batch.length < 200) break;

        cursorDate = { $lt: batch[batch.length - 1].createdAt };

    }

    if (items.length > pageSize) {
        items = items.slice(0, pageSize);
        more = true;
    }

    res.json({ success: true, items, more });

});

module.exports = router;
