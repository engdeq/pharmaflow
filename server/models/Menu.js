const mongoose = require("mongoose");

const menuSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    icon: { type: String, default: "Circle" },
    url: { type: String, default: "" },
    parent: { type: mongoose.Schema.Types.ObjectId, ref: "Menu", default: null },
    order: { type: Number, default: 0 },
    permissionKey: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

menuSchema.index({ parent: 1, order: 1 });

module.exports = mongoose.model("Menu", menuSchema);
