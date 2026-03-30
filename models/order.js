const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
{
  orderId: {
    type: String,
    unique: true
  },

  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  name: String,
  phone: String,
  address: String,

  items: [
    {
      name: String,
      size: String,
      qty: Number,
      price: Number,
      image: String
    }
  ],

  total: Number,

  status: {
    type: String,
    default: "pending"
  }
},
{ timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);