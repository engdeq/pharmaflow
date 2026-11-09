const mongoose = require("mongoose");

const globalMenuSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    label: { type: String, required: true, trim: true },
    icon: { type: String, default: "Circle" },
    url: { type: String, default: "" },
    parentName: { type: String, default: null },
    order: { type: Number, default: 0 },
    permissionKey: { type: String, default: "" },
    moduleKey: { type: String, default: "" },
    section: {
      type: String,
      enum: ["operations", "administration", "other"],
      default: "operations",
    },
    plans: {
      type: [String],
      default: () => ["trial", "starter", "professional", "enterprise"],
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

globalMenuSchema.index({ parentName: 1, order: 1 });
globalMenuSchema.index({ section: 1, order: 1 });

module.exports = mongoose.model("GlobalMenu", globalMenuSchema);
