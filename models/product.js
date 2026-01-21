const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },

    variant: {
      type: String
    },

    brand: {
      type: String,
      required: true
    },

    price: {
      type: Number,
      required: true
    },

    sizes: {
      type: [Number],
      default: [8, 9, 10]
    },

    image: {
      type: String,
      required: true
    },

    inStock: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

/*
  This prevents:
  OverwriteModelError: Cannot overwrite `Product` model once compiled
*/
module.exports =
  mongoose.models.Product || mongoose.model("Product", productSchema);
