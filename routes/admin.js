const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const User = require("../models/user");
const Order = require("../models/order");

/* ===============================
   ADMIN AUTH MIDDLEWARE
================================ */
function adminAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded.isAdmin) {
      return res.status(403).json({ message: "Access denied" });
    }

    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

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

    res.json({
      token,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email
      }
    });
  } catch (error) {
    console.error("Admin login error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/* ===============================
   ADMIN DASHBOARD (PROTECTED)
================================ */
router.get("/dashboard", adminAuth, async (req, res) => {
  try {
    const users = await User.find()
      .select("name email")
      .sort({ createdAt: -1 });

    let orders = [];
    try {
      orders = await Order.find()
        .populate("user", "name email")
        .sort({ createdAt: -1 });
    } catch {
      orders = [];
    }

    res.json({
      users,
      orders
    });
  } catch (error) {
    console.error("Admin dashboard error:", error);
    res.status(500).json({ message: "Failed to load dashboard data" });
  }
});

module.exports = router;
