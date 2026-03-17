const express = require("express");
const router = express.Router();
const Order = require("../models/order");
const Cart = require("../models/cart");
const auth = require("../middleware/auth");
const generateOrderId = require("../utils/generateOrderId");

router.post("/", auth, async (req, res) => {
  try {
    const { total } = req.body;

    const cart = await Cart.findOne({ userId: req.user._id });

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    const orderId = await generateOrderId();

    const order = new Order({
      orderId,
      user: req.user._id,
      items: cart.items,
      total,
      status: "pending"
    });

    await order.save();

    // Clear cart after order
    cart.items = [];
    await cart.save();

    res.json({
      orderId
    });

  } catch (err) {
    res.status(500).json({ message: "Order failed" });
  }
});

module.exports = router;