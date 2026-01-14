const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  category: { type: String },
  sizes: [Number],          // available shoe sizes
  stock: { type: Number, default: 0 },
  description: String,
  image: String             // path or URL to image
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
