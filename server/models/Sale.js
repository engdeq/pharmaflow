const mongoose = require("mongoose");
const { applyTenantPlugin } = require("../utils/tenantPlugin");

const saleItemSchema = new mongoose.Schema(
  {
    medicine: { type: mongoose.Schema.Types.ObjectId, ref: "Medicine", required: true },
    batch: { type: mongoose.Schema.Types.ObjectId, ref: "MedicineBatch" },
    name: String,
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    total: { type: Number, required: true },
  },
  { _id: false }
);

const saleSchema = new mongoose.Schema(
  {
    receiptNumber: { type: String, required: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "Customer" },
    cashier: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    items: [saleItemSchema],
    subtotal: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    taxRate: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    paymentMethod: {
      type: String,
      enum: ["cash", "bank", "split"],
      default: "cash",
    },
    paymentDetails: {
      cash: { type: Number, default: 0 },
      bank: { type: Number, default: 0 },
    },
    status: {
      type: String,
      enum: ["completed", "refunded", "cancelled"],
      default: "completed",
    },
  },
  { timestamps: true }
);

applyTenantPlugin(saleSchema, { branch: true });
saleSchema.index({ tenantId: 1, receiptNumber: 1 }, { unique: true });
saleSchema.index({ tenantId: 1, createdAt: -1 });

module.exports = mongoose.model("Sale", saleSchema);
