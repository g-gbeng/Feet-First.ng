const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
{
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

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