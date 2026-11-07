const mongoose = require("mongoose");

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

medicineSchema.index({ name: "text", genericName: "text", barcode: "text", sku: "text" });

module.exports = mongoose.model("Medicine", medicineSchema);
