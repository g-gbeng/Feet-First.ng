const mongoose = require("mongoose");

/*
  One entry per email sent (an ALL USERS email is one entry with many recipients).
  Covers the admin's emails and the automatic ones (welcome, order updates),
  so the admin can see what went out and why anything failed.
*/
const KINDS = ["admin", "welcome", "order-confirmed", "order-shipped", "order-delivered"];

const emailLogSchema = new mongoose.Schema(
    {
        kind: { type: String, enum: KINDS, required: true },

        // what the admin typed in "Recipient" (e.g. ALL USERS), or the address
        toLabel: String,

        recipients: [String], // first 500 addresses
        recipientCount: { type: Number, default: 0 },

        subject: String,

        // the admin's message, or a short note for automatic emails
        message: String,

        template: { name: String },

        orderId: String,

        status: { type: String, enum: ["sent", "partial", "failed", "skipped"], required: true },
        sent: { type: Number, default: 0 },
        failed: { type: Number, default: 0 },
        failedRecipients: [String], // first 100
        reasons: [String], // why emails failed: distinct reasons, first 5

        sentBy: String
    },
    { timestamps: { createdAt: true, updatedAt: false } }
);

emailLogSchema.index({ createdAt: -1 });

module.exports = mongoose.models.EmailLog || mongoose.model("EmailLog", emailLogSchema);
module.exports.KINDS = KINDS;
