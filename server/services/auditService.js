const AuditLog = require("../models/AuditLog");

async function writeAudit({
  user,
  action,
  module,
  description = "",
  ipAddress = "",
  previousValues = null,
  newValues = null,
}) {
  try {
    await AuditLog.create({
      user: user?._id || user || null,
      action,
      module,
      description,
      ipAddress,
      previousValues,
      newValues,
    });
  } catch (error) {
    console.error("Audit log failed:", error.message);
  }
}

module.exports = { writeAudit };
