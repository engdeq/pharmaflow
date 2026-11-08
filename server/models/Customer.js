const mongoose = require("mongoose");
const { applyTenantPlugin } = require("../utils/tenantPlugin");

const customerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, default: "" },
    email: { type: String, default: "" },
    address: { type: String, default: "" },
    totalSpending: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

applyTenantPlugin(customerSchema);
customerSchema.index({ tenantId: 1, name: 1 });
customerSchema.index({ tenantId: 1, phone: 1 });

module.exports = mongoose.model("Customer", customerSchema);
