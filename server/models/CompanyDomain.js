const mongoose = require("mongoose");

const companyDomainSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    hostname: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
    },
    type: {
      type: String,
      enum: ["subdomain", "custom"],
      default: "subdomain",
    },
    isPrimary: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["pending", "active", "inactive", "failed"],
      default: "pending",
      index: true,
    },
    verifiedAt: { type: Date, default: null },
    verificationToken: { type: String, default: "" },
    sslStatus: {
      type: String,
      enum: ["none", "pending", "active", "failed"],
      default: "none",
    },
    /** Path-based login is always available: https://medaxis.../t/{slug} */
    pathLive: { type: Boolean, default: true },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

companyDomainSchema.index({ companyId: 1, isPrimary: 1 });

module.exports = mongoose.model("CompanyDomain", companyDomainSchema);
