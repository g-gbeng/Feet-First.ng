const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },

        password: {
            type: String,
            required: true
        },

        profileImage: {
            type: String,
            default: ""
        },

        isAdmin: {
            type: Boolean,
            default: false
        },

        // Saved items (were kept only in the browser before)
        favorites: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Product"
            }
        ]
    },
    { timestamps: true }
);

// Prevent model overwrite error
module.exports = mongoose.models.User || mongoose.model("User", userSchema);
