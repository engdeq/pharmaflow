const mongoose = require("mongoose");

const brandingSchema = new mongoose.Schema(
  {
    logo: { type: String, default: "" },
    favicon: { type: String, default: "" },
    pharmacyName: { type: String, default: "" },
    tagline: { type: String, default: "" },
    primaryColor: { type: String, default: "#748CF8" },
    secondaryColor: { type: String, default: "#5A6FD8" },
    sidebarColor: { type: String, default: "#FFFFFF" },
    sidebarActiveColor: { type: String, default: "#748CF8" },
    headerColor: { type: String, default: "#FFFFFF" },
    buttonColor: { type: String, default: "#748CF8" },
    backgroundColor: { type: String, default: "#F5F7FB" },
    loginBranding: { type: String, default: "" },
    receiptBranding: { type: String, default: "" },
    emailBranding: { type: String, default: "" },
  },
  { _id: false }
);

const companySettingsSchema = new mongoose.Schema(
  {
    currency: { type: String, default: "USD" },
    language: { type: String, default: "en" },
    timezone: { type: String, default: "UTC" },
    dateFormat: { type: String, default: "YYYY-MM-DD" },
    taxRate: { type: Number, default: 0 },
    taxEnabled: { type: Boolean, default: false },
    receiptFooter: { type: String, default: "Thank you for your purchase!" },
    lowStockThreshold: { type: Number, default: 10 },
    theme: { type: String, enum: ["light", "dark", "system"], default: "light" },
  },
  { _id: false }
);

const subscriptionSchema = new mongoose.Schema(
  {
    plan: {
      type: String,
      enum: ["trial", "starter", "professional", "enterprise"],
      default: "trial",
    },
    status: {
      type: String,
      enum: ["trialing", "active", "past_due", "suspended", "cancelled"],
      default: "trialing",
    },
    trialEndsAt: { type: Date, default: null },
    renewalDate: { type: Date, default: null },
    userLimit: { type: Number, default: 10 },
    branchLimit: { type: Number, default: 1 },
    moduleLimits: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { _id: false }
);

const companySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    /** Unique code used for login + future subdomain (e.g. acme → acme.domain) */
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      match: [/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid company slug"],
    },
    legalName: { type: String, default: "" },
    registrationNumber: { type: String, default: "" },
    licenseNumber: { type: String, default: "" },
    phone: { type: String, default: "" },
    email: { type: String, default: "", lowercase: true, trim: true },
    address: { type: String, default: "" },
    city: { type: String, default: "" },
    country: { type: String, default: "" },
    website: { type: String, default: "" },
    logo: { type: String, default: "" },
    status: {
      type: String,
      enum: ["pending", "active", "suspended", "rejected"],
      default: "pending",
      index: true,
    },
    ownerUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    branding: { type: brandingSchema, default: () => ({}) },
    settings: { type: companySettingsSchema, default: () => ({}) },
    enabledModules: {
      type: [String],
      default: () => [
        "dashboard",
        "medicines",
        "categories",
        "pos",
        "sales",
        "inventory",
        "purchases",
        "suppliers",
        "customers",
        "expiry",
        "reports",
        "users",
        "roles",
        "settings",
      ],
    },
    subscription: { type: subscriptionSchema, default: () => ({}) },
    approvedAt: { type: Date, default: null },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    suspendedAt: { type: Date, default: null },
    suspensionReason: { type: String, default: "" },
  },
  { timestamps: true }
);

companySchema.index({ email: 1 });
companySchema.index({ name: 1 });
companySchema.index({ status: 1, createdAt: -1 });

companySchema.pre("validate", function ensureSlug(next) {
  if (!this.slug && this.name) {
    this.slug = String(this.name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40);
  }
  next();
});

module.exports = mongoose.model("Company", companySchema);
