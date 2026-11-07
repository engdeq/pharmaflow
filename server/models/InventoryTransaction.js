const mongoose = require("mongoose");

const inventoryTransactionSchema = new mongoose.Schema(
  {
    medicine: { type: mongoose.Schema.Types.ObjectId, ref: "Medicine", required: true },
    batch: { type: mongoose.Schema.Types.ObjectId, ref: "MedicineBatch" },
    type: {
      type: String,
      enum: ["stock_in", "stock_out", "adjustment", "sale", "purchase", "expiry_writeoff"],
      required: true,
    },
    quantity: { type: Number, required: true },
    previousQty: { type: Number, default: 0 },
    newQty: { type: Number, default: 0 },
    reference: { type: String, default: "" },
    notes: { type: String, default: "" },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("InventoryTransaction", inventoryTransactionSchema);
