const mongoose = require("mongoose");
const { applyTenantPlugin } = require("../utils/tenantPlugin");

const medicineBatchSchema = new mongoose.Schema(
  {
    medicine: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Medicine",
      required: true,
    },
    batchNumber: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, default: 0 },
    purchasePrice: { type: Number, default: 0 },
    sellingPrice: { type: Number, default: 0 },
    expiryDate: { type: Date, required: true },
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

applyTenantPlugin(medicineBatchSchema, { branch: true });
medicineBatchSchema.index({ tenantId: 1, medicine: 1, expiryDate: 1 });
medicineBatchSchema.index({ tenantId: 1, batchNumber: 1, medicine: 1 });

module.exports = mongoose.model("MedicineBatch", medicineBatchSchema);
