const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const User = require("../models/user");
const Order = require("../models/order");
const resend = require("../utils/mailer");
const adminAuth = require("../middleware/adminAuth");


/* ===============================
   ADMIN LOGIN (PUBLIC ROUTE)
================================ */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const admin = await User.findOne({ email, isAdmin: true });
    if (!admin) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      {
        id: admin._id,
        email: admin.email,
        isAdmin: true
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({ token });

  } catch (error) {
    console.error("LOGIN ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
});


/* ===============================
   APPLY AUTH TO ALL ROUTES BELOW
================================ */
router.use(adminAuth);


/* ===============================
   DASHBOARD DATA
================================ */
router.get("/dashboard", async (req, res) => {
  try {

    const users = await User.find()
      .select("name email")
      .sort({ createdAt: -1 });

    const orders = await Order.find()
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    const completedOrders = orders.filter(
      o => o.status === "completed"
    );

    const totalRevenue = completedOrders.reduce(
      (sum, order) => sum + order.total,
      0
    );

    res.json({
      users,
      orders,
      totalRevenue
    });

  } catch (error) {
    console.error("DASHBOARD ERROR:", error);
    res.status(500).json({ message: "Failed to load dashboard data" });
  }
});


/* ===============================
   MARK ORDER AS COMPLETED
================================ */
router.put("/orders/:id/complete", async (req, res) => {
  try {

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    order.status = "completed";
    order.completedAt = new Date();

    await order.save();

    res.json({ message: "Order marked as completed" });

  } catch (err) {
    console.error("COMPLETE ORDER ERROR:", err);
    res.status(500).json({ message: "Failed to update order" });
  }
});


/* ===============================
   DELETE ORDER
================================ */
router.delete("/orders/:id", async (req, res) => {
  try {

    await Order.findByIdAndDelete(req.params.id);

    res.json({ message: "Order deleted successfully" });

  } catch (err) {
    console.error("DELETE ORDER ERROR:", err);
    res.status(500).json({ message: "Failed to delete order" });
  }
});


/* ===============================
   SEND EMAIL
================================ */
router.post("/send-email", async (req, res) => {
  try {

    const { to, subject, message } = req.body;

    if (!to || !subject || !message) {
      return res.status(400).json({ message: "All fields required" });
    }

   /* ===============================
   SEND EMAIL (RESEND)
================================ */
router.post("/send-email", async (req, res) => {
  try {
    const { to, subject, message } = req.body;

    if (!to || !subject || !message) {
      return res.status(400).json({
        message: "All fields are required."
      });
    }

    await resend.emails.send({
      from: "FeetFirst <onboarding@resend.dev>", // Replace after verifying your domain
      to: [to],
      subject: subject,
      html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
      </head>

      <body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">

        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center">

              <table
                width="600"
                cellpadding="30"
                cellspacing="0"
                style="
                  background:#ffffff;
                  margin:40px auto;
                  border-radius:10px;
                  box-shadow:0 5px 20px rgba(0,0,0,.08);
                "
              >

                <tr>
                  <td align="center">

                    <h1
                      style="
                        color:#d4af37;
                        margin:0;
                        font-size:28px;
                      "
                    >
                      FeetFirst.ng
                    </h1>

                    <p
                      style="
                        color:#777;
                        margin-top:8px;
                        font-size:15px;
                      "
                    >
                      Premium Footwear Store
                    </p>

                  </td>
                </tr>

                <tr>
                  <td>

                    <p
                      style="
                        font-size:16px;
                        color:#333;
                        line-height:1.8;
                        white-space:pre-line;
                      "
                    >
                      ${message}
                    </p>

                  </td>
                </tr>

                <tr>
                  <td align="center">

                    <hr style="border:none;border-top:1px solid #eee;">

                    <p
                      style="
                        color:#888;
                        font-size:13px;
                      "
                    >
                      Thank you for choosing
                      <strong>FeetFirst.ng</strong>
                    </p>

                    <p
                      style="
                        color:#bbb;
                        font-size:12px;
                      "
                    >
                      © ${new Date().getFullYear()} FeetFirst.ng. All rights reserved.
                    </p>

                  </td>
                </tr>

              </table>

            </td>
          </tr>
        </table>

      </body>
      </html>
      `
    });

    res.json({
      success: true,
      message: "Email sent successfully."
    });

  } catch (error) {

    console.error("RESEND ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Failed to send email.",
      error: error.message
    });

  }
});

    res.json({ message: "Email sent successfully" });

  } catch (error) {
    console.error("EMAIL ERROR:", error);
    res.status(500).json({ message: "Email failed to send" });
  }
});


module.exports = router;