const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
      quantity: { type: Number, required: true },
      size: Number
    }
  ],
  total: { type: Number, required: true },
  status: { type: String, default: 'pending' }, // pending, shipped, delivered
  shippingAddress: String
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
