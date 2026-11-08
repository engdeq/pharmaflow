const mongoose = require("mongoose");
const { applyTenantPlugin } = require("../utils/tenantPlugin");

const roleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    permissions: [{ type: mongoose.Schema.Types.ObjectId, ref: "Permission" }],
    isSystem: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

applyTenantPlugin(roleSchema, { required: true });
roleSchema.index({ tenantId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model("Role", roleSchema);
