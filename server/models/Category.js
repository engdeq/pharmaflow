const mongoose = require("mongoose");
const { applyTenantPlugin } = require("../utils/tenantPlugin");

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    icon: { type: String, default: "Tag" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

applyTenantPlugin(categorySchema);
categorySchema.index({ tenantId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model("Category", categorySchema);
