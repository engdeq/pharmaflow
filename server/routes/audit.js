const express = require("express");
const AuditLog = require("../models/AuditLog");
const { authenticate, requirePermission } = require("../middleware/auth");
const { requireTenant } = require("../middleware/tenant");
const { ok } = require("../utils/response");
const asyncHandler = require("../utils/asyncHandler");
const { withTenant } = require("../utils/tenantScope");

const router = express.Router();
router.use(authenticate);
router.use(requireTenant);
router.use(requirePermission("audit.view"));

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.min(100, parseInt(req.query.limit || "30", 10));
    const filter = withTenant(req, {});
    if (req.query.module) filter.module = req.query.module;

    const [items, total] = await Promise.all([
      AuditLog.find(filter)
        .populate("user", "username fullName")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      AuditLog.countDocuments(filter),
    ]);

    return ok(res, { items, total, page, limit });
  })
);

module.exports = router;
