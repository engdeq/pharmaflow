const mongoose = require("mongoose");

const purchaseItemSchema = new mongoose.Schema(
  {
    medicine: { type: mongoose.Schema.Types.ObjectId, ref: "Medicine", required: true },
    name: String,
    quantity: { type: Number, required: true },
    purchasePrice: { type: Number, required: true },
    batchNumber: { type: String, required: true },
    expiryDate: { type: Date, required: true },
    total: { type: Number, required: true },
  },
  { _id: false }
);

const purchaseSchema = new mongoose.Schema(
  {
    purchaseNumber: { type: String, required: true, unique: true },
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier", required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    items: [purchaseItemSchema],
    totalCost: { type: Number, default: 0 },
    paymentStatus: {
      type: String,
      enum: ["pending", "partial", "paid"],
      default: "pending",
    },
    status: {
      type: String,
      enum: ["draft", "approved", "cancelled"],
      default: "draft",
    },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    approvedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Purchase", purchaseSchema);
