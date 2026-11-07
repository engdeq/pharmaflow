const express = require("express");
const Permission = require("../models/Permission");
const { authenticate, requirePermission } = require("../middleware/auth");
const { ok } = require("../utils/response");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();
router.use(authenticate, requirePermission("permissions.manage", "roles.manage"));

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const permissions = await Permission.find().sort({ module: 1, action: 1 });
    const grouped = permissions.reduce((acc, perm) => {
      if (!acc[perm.module]) acc[perm.module] = [];
      acc[perm.module].push(perm);
      return acc;
    }, {});
    return ok(res, { items: permissions, grouped });
  })
);

module.exports = router;
