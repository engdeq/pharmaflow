const express = require("express");
const Company = require("../models/Company");
const User = require("../models/User");
const Branch = require("../models/Branch");
const { authenticate } = require("../middleware/auth");
const { requirePlatformAdmin } = require("../middleware/tenant");
const { ok, fail } = require("../utils/response");
const asyncHandler = require("../utils/asyncHandler");
const { writeAudit } = require("../services/auditService");

const router = express.Router();
router.use(authenticate, requirePlatformAdmin);

router.get(
  "/stats",
  asyncHandler(async (_req, res) => {
    const [
      totalCompanies,
      activeCompanies,
      suspendedCompanies,
      pendingCompanies,
      totalUsers,
      totalBranches,
    ] = await Promise.all([
      Company.countDocuments(),
      Company.countDocuments({ status: "active" }),
      Company.countDocuments({ status: "suspended" }),
      Company.countDocuments({ status: "pending" }),
      User.countDocuments({ isPlatformAdmin: { $ne: true } }),
      Branch.countDocuments(),
    ]);

    return ok(res, {
      totalCompanies,
      activeCompanies,
      suspendedCompanies,
      pendingCompanies,
      totalUsers,
      totalBranches,
    });
  })
);

router.get(
  "/companies",
  asyncHandler(async (req, res) => {
    const q = (req.query.q || "").trim();
    const filter = q
      ? {
          $or: [
            { name: new RegExp(q, "i") },
            { email: new RegExp(q, "i") },
            { legalName: new RegExp(q, "i") },
          ],
        }
      : {};
    const companies = await Company.find(filter).sort({ createdAt: -1 }).lean();
    return ok(res, companies);
  })
);

router.put(
  "/companies/:id/status",
  asyncHandler(async (req, res) => {
    const status = req.body.status;
    if (!["active", "suspended", "pending", "rejected"].includes(status)) {
      return fail(res, "Invalid status.", 400);
    }
    const company = await Company.findById(req.params.id);
    if (!company) return fail(res, "Company not found.", 404);
    const prev = company.status;
    company.status = status;
    if (status === "active") {
      company.approvedAt = new Date();
      company.approvedBy = req.user._id;
      company.suspendedAt = null;
      company.suspensionReason = "";
    }
    if (status === "suspended") {
      company.suspendedAt = new Date();
      company.suspensionReason = req.body.reason || "";
    }
    await company.save();
    await writeAudit({
      user: req.user,
      action: "update_status",
      module: "platform",
      description: `Company ${company.name}: ${prev} → ${status}`,
      ipAddress: req.ip,
    });
    return ok(res, company, `Company marked ${status}.`);
  })
);

module.exports = router;
