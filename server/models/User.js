const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      default: null,
      index: true,
    },
    /** Platform-level operator — not a pharmacy user */
    isPlatformAdmin: { type: Boolean, default: false, index: true },
    username: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 40,
    },
    email: {
      type: String,
      required: true,
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
    branchIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Branch" }],
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    /** Locked system account — cannot edit, disable, or delete */
    isProtected: { type: Boolean, default: false },
    lastLogin: { type: Date, default: null },
    resetToken: { type: String, default: null },
    resetTokenExpires: { type: Date, default: null },
  },
  { timestamps: true }
);

// Pharmacy users: unique per tenant. Platform admins: unique globally (tenantId null).
userSchema.index(
  { tenantId: 1, username: 1 },
  { unique: true, partialFilterExpression: { tenantId: { $type: "objectId" } } }
);
userSchema.index(
  { tenantId: 1, email: 1 },
  { unique: true, partialFilterExpression: { tenantId: { $type: "objectId" } } }
);
userSchema.index(
  { username: 1 },
  { unique: true, partialFilterExpression: { isPlatformAdmin: true } }
);
userSchema.index(
  { email: 1 },
  { unique: true, partialFilterExpression: { isPlatformAdmin: true } }
);

module.exports = mongoose.model("User", userSchema);
