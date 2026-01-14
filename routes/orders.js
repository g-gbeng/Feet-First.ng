const express = require('express');
const router = express.Router();
const Order = require('../models/Order');

// Create a new order
router.post('/create', async (req, res) => {
  const { userId, items, total, shippingAddress } = req.body;
  try {
    const order = await Order.create({ userId, items, total, shippingAddress });
    res.status(201).json(order);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all orders for a user
router.get('/:userId', async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.params.userId }).populate('items.productId');
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});
// GET /api/orders/admin - For admin dashboard
router.get('/admin', async (req, res) => {
  try {
    const pendingOrders = await Order.find({ status: 'pending' }).populate('user', 'name email');
    const completedOrders = await Order.find({ status: 'completed' }).populate('user', 'name email');

    res.json({ pendingOrders, completedOrders });
  } catch (err) {
    console.error('Error fetching orders:', err);
    res.status(500).json({ message: 'Server error' });
  }
});
