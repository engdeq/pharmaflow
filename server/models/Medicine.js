const mongoose = require("mongoose");
const { applyTenantPlugin } = require("../utils/tenantPlugin");

const medicineSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    genericName: { type: String, default: "" },
    brand: { type: String, default: "" },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
    sku: { type: String, default: "" },
    barcode: { type: String, default: "" },
    manufacturer: { type: String, default: "" },
    purchasePrice: { type: Number, default: 0 },
    sellingPrice: { type: Number, required: true, default: 0 },
    minStock: { type: Number, default: 10 },
    unit: { type: String, default: "pcs" },
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier" },
    description: { type: String, default: "" },
    image: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

applyTenantPlugin(medicineSchema, { branch: true });
medicineSchema.index({ name: "text", genericName: "text", barcode: "text", sku: "text" });
medicineSchema.index({ tenantId: 1, name: 1 });
medicineSchema.index({ tenantId: 1, barcode: 1 });
medicineSchema.index({ tenantId: 1, sku: 1 });

module.exports = mongoose.model("Medicine", medicineSchema);
