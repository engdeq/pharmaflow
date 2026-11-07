const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 40,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    fullName: { type: String, default: "" },
    phone: { type: String, default: "" },
    roles: [{ type: mongoose.Schema.Types.ObjectId, ref: "Role" }],
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    lastLogin: { type: Date, default: null },
    resetToken: { type: String, default: null },
    resetTokenExpires: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
