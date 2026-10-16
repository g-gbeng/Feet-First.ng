const mongoose = require("mongoose");

/* One cart per account, kept on the server so it follows the customer to any device */
const cartSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },

        items: [
            {
                _id: false,
                productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
                quantity: { type: Number, default: 1, min: 1 },
                size: { type: Number, required: true }
            }
        ]
    },
    { timestamps: true }
);

module.exports = mongoose.models.Cart || mongoose.model("Cart", cartSchema);
