const express = require("express");
const router = express.Router();
const Cart = require("../models/cart");
const auth = require("../middleware/auth");

/* =========================
   GET USER CART
========================= */
router.get("/", auth, async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.user._id })
      .populate("items.productId");

    res.json(cart || { items: [] });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   ADD TO CART
========================= */
router.post("/add", auth, async (req, res) => {
  try {
    const { productId, quantity, size } = req.body;

    let cart = await Cart.findOne({ userId: req.user._id });

    if (!cart) {
      cart = new Cart({
        userId: req.user._id,
        items: []
      });
    }

    const existingItem = cart.items.find(
      item =>
        item.productId.toString() === productId &&
        item.size === size
    );

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.items.push({ productId, quantity, size });
    }

    await cart.save();

    res.json(cart);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   REMOVE FROM CART
========================= */
router.post("/remove", auth, async (req, res) => {
  try {
    const { productId, size } = req.body;

    const cart = await Cart.findOne({ userId: req.user._id });

    if (!cart) return res.json({ items: [] });

    cart.items = cart.items.filter(
      item =>
        !(
          item.productId.toString() === productId &&
          item.size === size
        )
    );

    await cart.save();

    res.json(cart);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;