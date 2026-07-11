const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const User = require("../models/user");
const Order = require("../models/order");

const resend = require("../utils/mailer");
const adminAuth = require("../middleware/adminAuth");

/* ============================================================
   ADMIN LOGIN (PUBLIC)
============================================================ */

router.post("/login", async (req, res) => {
  try {

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required."
      });
    }

    const admin = await User.findOne({
      email,
      isAdmin: true
    });

    if (!admin) {
      return res.status(401).json({
        message: "Invalid credentials."
      });
    }

    const passwordMatch = await bcrypt.compare(
      password,
      admin.password
    );

    if (!passwordMatch) {
      return res.status(401).json({
        message: "Invalid credentials."
      });
    }

    const token = jwt.sign(
      {
        id: admin._id,
        email: admin.email,
        isAdmin: true
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d"
      }
    );

    res.json({
      token
    });

  } catch (err) {

    console.error("ADMIN LOGIN ERROR");
    console.error(err);

    res.status(500).json({
      message: "Server error."
    });

  }
});


/* ============================================================
   EVERYTHING BELOW THIS LINE REQUIRES ADMIN LOGIN
============================================================ */

router.use(adminAuth);


/* ============================================================
   DASHBOARD
============================================================ */

router.get("/dashboard", async (req, res) => {

  try {

    const users = await User.find()
      .select("name email")
      .sort({ createdAt: -1 });

    const orders = await Order.find()
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    const completedOrders = orders.filter(
      order => order.status === "completed"
    );

    const totalRevenue = completedOrders.reduce(
      (sum, order) => sum + order.total,
      0
    );

    res.json({

      users,

      orders,

      totalRevenue,

      totalUsers: users.length,

      totalCompletedOrders: completedOrders.length

    });

  } catch (err) {

    console.error("DASHBOARD ERROR");
    console.error(err);

    res.status(500).json({
      message: "Unable to load dashboard."
    });

  }

});

/* ============================================================
   MARK ORDER AS COMPLETED
============================================================ */

router.put("/orders/:id/complete", async (req, res) => {

  try {

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        message: "Order not found."
      });
    }

    order.status = "completed";
    order.completedAt = new Date();

    await order.save();

    res.json({
      success: true,
      message: "Order marked as completed."
    });

  } catch (err) {

    console.error("COMPLETE ORDER ERROR");
    console.error(err);

    res.status(500).json({
      success: false,
      message: "Failed to update order."
    });

  }

});


/* ============================================================
   DELETE ORDER
============================================================ */

router.delete("/orders/:id", async (req, res) => {

  try {

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        message: "Order not found."
      });
    }

    await Order.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Order deleted successfully."
    });

  } catch (err) {

    console.error("DELETE ORDER ERROR");
    console.error(err);

    res.status(500).json({
      success: false,
      message: "Failed to delete order."
    });

  }

});


/* ============================================================
   SEND EMAIL (RESEND)
============================================================ */

router.post("/send-email", async (req, res) => {

  try {

    const { to, subject, message } = req.body;

   if(
    !to ||
    (Array.isArray(to) && to.length===0) ||
    !subject ||
    !message
){
    return res.status(400).json({
        message:"All fields required."
    });
}

    const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
</head>

<body style="margin:0;padding:40px;background:#f4f4f4;font-family:Segoe UI,Arial,sans-serif;">

<table
align="center"
width="650"
cellpadding="0"
cellspacing="0"
style="
background:#ffffff;
border-radius:12px;
overflow:hidden;
box-shadow:0 8px 30px rgba(0,0,0,.08);
">

<tr>

<td
style="
background:#d4af37;
padding:30px;
text-align:center;
color:white;
font-size:30px;
font-weight:bold;
"
>

FeetFirst.ng

</td>

</tr>

<tr>

<td
style="
padding:40px;
font-size:16px;
line-height:1.8;
color:#333;
white-space:pre-line;
"
>

${message}

</td>

</tr>

<tr>

<td
style="
padding:25px;
background:#fafafa;
text-align:center;
font-size:13px;
color:#888;
"
>

Thank you for choosing
<strong>FeetFirst.ng</strong>

<br><br>

© ${new Date().getFullYear()} FeetFirst.ng

</td>

</tr>

</table>

</body>

</html>
`;

console.log("=========== EMAIL REQUEST ===========");
console.log("TO:", to);
console.log("SUBJECT:", subject);
console.log("MESSAGE:", message);
console.log("=====================================");

    const response = await resend.emails.send({

    from: "FeetFirst <onboarding@resend.dev>",
    to: [to],
    subject,
    html

});

if (response.error) {

    console.error(response.error);

    return res.status(response.error.statusCode || 500).json({

        success: false,
        message: response.error.message

    });

}

res.json({

    success: true,
    message: "Email sent successfully."

});

  } catch (err) {

    console.error("RESEND EMAIL ERROR");
    console.error(err);

    res.status(500).json({

      success: false,

      message: err.message || "Failed to send email."

    });

  }

});

module.exports = router;