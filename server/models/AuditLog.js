const mongoose = require("mongoose");
const { applyTenantPlugin } = require("../utils/tenantPlugin");

const auditLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    action: { type: String, required: true },
    module: { type: String, required: true },
    description: { type: String, default: "" },
    ipAddress: { type: String, default: "" },
    previousValues: { type: mongoose.Schema.Types.Mixed },
    newValues: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

// Platform audits may have null tenantId
applyTenantPlugin(auditLogSchema, { required: false });
auditLogSchema.index({ tenantId: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model("AuditLog", auditLogSchema);
