const mongoose = require("mongoose");

/**
 * Adds tenantId (+ optional branchId) to a schema for multi-company isolation.
 */
function applyTenantPlugin(schema, { branch = false, required = true } = {}) {
  schema.add({
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required,
      index: true,
    },
  });

  if (branch) {
    schema.add({
      branchId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Branch",
        default: null,
        index: true,
      },
    });
  }

  schema.index({ tenantId: 1, createdAt: -1 });
}

module.exports = { applyTenantPlugin };
