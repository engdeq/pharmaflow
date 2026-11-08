const mongoose = require("mongoose");
const { applyTenantPlugin } = require("../utils/tenantPlugin");

const supplierSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    contactPerson: { type: String, default: "" },
    phone: { type: String, default: "" },
    email: { type: String, default: "" },
    address: { type: String, default: "" },
    companyName: { type: String, default: "" },
    outstandingBalance: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

applyTenantPlugin(supplierSchema);
supplierSchema.index({ tenantId: 1, name: 1 });

module.exports = mongoose.model("Supplier", supplierSchema);
