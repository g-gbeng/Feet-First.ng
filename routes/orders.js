const express = require("express");
const router = express.Router();
const Order = require("../models/order");
const auth = require("../middleware/auth");
const generateOrderId = require("../utils/generateOrderId");

router.post("/", auth, async (req, res) => {
  try {
    const { items, total, name, phone, address } = req.body;

    // ✅ Validate incoming data
    if (!items || items.length === 0) {
      return res.status(400).json({ message: "No items in order" });
    }

    if (!total) {
      return res.status(400).json({ message: "Total is required" });
    }

    const orderId = await generateOrderId();

    const order = new Order({
      orderId,
      user: req.user._id,
      name,
      phone,
      address,
      items,
      total,
      status: "pending"
    });

    await order.save();

    res.status(201).json({
      message: "Order created successfully",
      orderId,
      order
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Order failed" });
  }
});

module.exports = router;