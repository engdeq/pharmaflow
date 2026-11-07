const express = require("express");
const MedicineBatch = require("../models/MedicineBatch");
const { authenticate, requirePermission } = require("../middleware/auth");
const { ok } = require("../utils/response");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();
router.use(authenticate, requirePermission("expiry.view"));

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const now = new Date();
    const d7 = new Date(now.getTime() + 7 * 86400000);
    const d30 = new Date(now.getTime() + 30 * 86400000);
    const d90 = new Date(now.getTime() + 90 * 86400000);

    const batches = await MedicineBatch.find({ quantity: { $gt: 0 } })
      .populate("medicine", "name")
      .populate("supplier", "name")
      .sort({ expiryDate: 1 });

    const groups = {
      expired: [],
      days7: [],
      days30: [],
      days90: [],
      safe: [],
    };

    batches.forEach((b) => {
      const item = b.toObject();
      if (b.expiryDate < now) groups.expired.push(item);
      else if (b.expiryDate <= d7) groups.days7.push(item);
      else if (b.expiryDate <= d30) groups.days30.push(item);
      else if (b.expiryDate <= d90) groups.days90.push(item);
      else groups.safe.push(item);
    });

    return ok(res, groups);
  })
);

module.exports = router;
