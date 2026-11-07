const express = require("express");
const Settings = require("../models/Settings");
const { authenticate, requirePermission } = require("../middleware/auth");
const { ok } = require("../utils/response");
const asyncHandler = require("../utils/asyncHandler");
const { writeAudit } = require("../services/auditService");

const router = express.Router();

router.get(
  "/",
  authenticate,
  asyncHandler(async (_req, res) => {
    let settings = await Settings.findOne();
    if (!settings) settings = await Settings.create({});
    return ok(res, settings);
  })
);

router.put(
  "/",
  authenticate,
  requirePermission("settings.manage"),
  asyncHandler(async (req, res) => {
    let settings = await Settings.findOne();
    if (!settings) settings = await Settings.create({});
    const prev = settings.toObject();
    Object.assign(settings, req.body);
    await settings.save();
    await writeAudit({
      user: req.user,
      action: "update",
      module: "settings",
      description: "Updated system settings",
      previousValues: prev,
      newValues: settings,
      ipAddress: req.ip,
    });
    return ok(res, settings, "Settings updated.");
  })
);

module.exports = router;
