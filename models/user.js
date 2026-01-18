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
      lowercase: true
    },
    password: {
      type: String,
      required: true
    },
    profileImage: {
      type: String,
      default: ""
    }
  },
  { timestamps: true }
);

// ✅ Prevent model overwrite error
module.exports = mongoose.models.User || mongoose.model("User", userSchema);
