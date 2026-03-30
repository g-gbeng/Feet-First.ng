const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const User = require("../models/user");
const Order = require("../models/order");
const transporter = require("../utils/mailer");
const adminAuth = require("../middleware/adminAuth");

router.use(adminAuth);
/* ===============================
   ADMIN LOGIN
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
    res.status(500).json({ message: "Server error" });
  }
});


/* ===============================
   DASHBOARD DATA
================================ */
router.get("/dashboard", adminAuth, async (req, res) => {
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
    res.status(500).json({ message: "Failed to load dashboard data" });
  }
});


/* ===============================
   MARK ORDER AS COMPLETED
================================ */
router.put("/orders/:id/complete", adminAuth, async (req, res) => {
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
    res.status(500).json({ message: "Failed to update order" });
  }
});


/* ===============================
   DELETE ORDER
================================ */
router.delete("/orders/:id", adminAuth, async (req, res) => {
  try {

    await Order.findByIdAndDelete(req.params.id);

    res.json({ message: "Order deleted successfully" });

  } catch (err) {
    res.status(500).json({ message: "Failed to delete order" });
  }
});


/* ===============================
   EMAIL TEMPLATE FUNCTION
================================ */



/* ===============================
   SEND EMAIL (FIXED)
================================ */
router.post("/send-email", adminAuth, async (req, res) => {

  try {

    const { to, subject, message } = req.body;

    if (!to || !subject || !message) {
      return res.status(400).json({ message: "All fields required" });
    }

    await transporter.sendMail({
  from: `"FeetFirst" <${process.env.EMAIL_USER}>`,
  to,
  subject,
  html: `
    <!DOCTYPE html>
    <html>
      <body style="margin:0; padding:0; background:#f4f4f4; font-family: Arial, sans-serif;">
        
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center">

              <table width="600" cellpadding="20" cellspacing="0" style="background:white; margin-top:30px; border-radius:10px;">
                
                <tr>
                  <td align="center">
                    <h2 style="color:#d4af37; margin:0;">
                      FeetFirstng
                    </h2>
                  </td>
                </tr>

                <tr>
                  <td>
                  

                    <p style="line-height:1.6;">
                      ${message}
                    </p>
                  </td>
                </tr>

                <tr>
                  <td>
                    <hr>
                    <p style="font-size:12px; color:gray; text-align:center;">
                      FeetFirst • Premium Footwear Store
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

    res.json({ message: "Email sent successfully" });

  } catch (error) {

    console.error("EMAIL ERROR:", error);
    res.status(500).json({ message: "Email failed to send" });

  }

});


module.exports = router;