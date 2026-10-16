const mongoose = require("mongoose");

/*
  Order status:   pending -> shipped -> completed (delivered), or cancelled
  Payment status: unpaid -> paid (only after Paystack confirms the money arrived)

  Orders placed through the old WhatsApp checkout are marked paidOffline the first
  time the server starts (see migrateLegacyOrders in services/orders.js).
*/

const STATUSES = ["pending", "shipped", "completed", "cancelled"];

const paymentSchema = new mongoose.Schema(
    {
        reference: { type: String, required: true },
        amountKobo: { type: Number, required: true },
        status: { type: String, enum: ["pending", "paid", "failed"], default: "pending" },
        test: { type: Boolean, default: false },
        paidAt: Date
    },
    { _id: false, timestamps: { createdAt: true, updatedAt: false } }
);

const orderSchema = new mongoose.Schema(
    {
        orderId: {
            type: String,
            unique: true
        },

        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            index: true
        },

        name: String,
        phone: String,
        email: String,
        address: String,
        note: String,

        items: [
            {
                _id: false,
                product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
                name: String,
                size: String,
                qty: Number,
                price: Number,
                image: String
            }
        ],

        // in naira, worked out on the server from the database prices
        total: Number,

        status: {
            type: String,
            default: "pending"
        },

        paymentStatus: {
            type: String,
            enum: ["unpaid", "paid"]
        },

        payments: [paymentSchema],

        paidAt: Date,

        // placed before Paystack (WhatsApp checkout)
        paidOffline: { type: Boolean, default: false },

        // replaced by a newer checkout before being paid
        autoCancelled: { type: Boolean, default: false },

        rider: {
            name: String,
            phone: String
        },

        shippedAt: Date,
        completedAt: Date,
        cancelledAt: Date
    },
    { timestamps: true }
);

orderSchema.index({ "payments.reference": 1 });

module.exports = mongoose.models.Order || mongoose.model("Order", orderSchema);
module.exports.STATUSES = STATUSES;
