const express = require("express");
const router = express.Router();

const User = require("../models/User");
const Order = require("../models/Order"); // if exists

// ADMIN DASHBOARD DATA
router.get("/dashboard", async (req, res) => {
  try {
    const users = await User.find().select("name email").sort({ createdAt: -1 });

    let orders = [];
    try {
      orders = await Order.find()
        .populate("user", "name email")
        .sort({ createdAt: -1 });
    } catch (err) {
      orders = []; // orders optional for now
    }

    res.json({
      users,
      orders,
    });
  } catch (error) {
    console.error("Admin dashboard error:", error);
    res.status(500).json({ message: "Failed to load dashboard data" });
  }
});

module.exports = router;
