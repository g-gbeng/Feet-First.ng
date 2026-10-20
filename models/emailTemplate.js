const mongoose = require("mongoose");

/*
  Reusable emails for the admin's Send email form.
  Placeholders such as {{firstName}} are filled in for each recipient when sending.
*/
const emailTemplateSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true, maxlength: 80 },
        subject: { type: String, required: true, trim: true, maxlength: 150 },
        message: { type: String, required: true, maxlength: 10000 }
    },
    { timestamps: true }
);

module.exports = mongoose.models.EmailTemplate || mongoose.model("EmailTemplate", emailTemplateSchema);
