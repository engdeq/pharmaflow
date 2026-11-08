const mongoose = require("mongoose");
const { applyTenantPlugin } = require("../utils/tenantPlugin");

/** @deprecated Prefer Company.settings / Company.branding — kept for migration compatibility */
const settingsSchema = new mongoose.Schema(
  {
    pharmacyName: { type: String, default: "Pharmacy Manager" },
    logo: { type: String, default: "" },
    address: { type: String, default: "" },
    phone: { type: String, default: "" },
    email: { type: String, default: "" },
    currency: { type: String, default: "USD" },
    taxRate: { type: Number, default: 0 },
    receiptFooter: { type: String, default: "Thank you for your purchase!" },
    lowStockThreshold: { type: Number, default: 10 },
    dateFormat: { type: String, default: "YYYY-MM-DD" },
    language: { type: String, default: "en" },
    theme: { type: String, enum: ["light", "dark", "system"], default: "light" },
  },
  { timestamps: true }
);

applyTenantPlugin(settingsSchema, { required: false });
settingsSchema.index({ tenantId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model("Settings", settingsSchema);
