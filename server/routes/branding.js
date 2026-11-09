const express = require("express");
const Company = require("../models/Company");
const { authenticate, requirePermission } = require("../middleware/auth");
const { requireTenant } = require("../middleware/tenant");
const { ok, fail } = require("../utils/response");
const asyncHandler = require("../utils/asyncHandler");
const { writeAudit } = require("../services/auditService");

const router = express.Router();
router.use(authenticate, requireTenant);

router.get(
  "/",
  requirePermission("settings.manage", "branding.manage", "dashboard.view"),
  asyncHandler(async (req, res) => {
    const company = await Company.findById(req.tenantId).lean();
    if (!company) return fail(res, "Company not found.", 404);
    return ok(res, {
      name: company.name,
      slug: company.slug,
      logo: company.logo,
      branding: company.branding || {},
      settings: company.settings || {},
      subscription: company.subscription || {},
    });
  })
);

router.put(
  "/",
  requirePermission("settings.manage", "branding.manage"),
  asyncHandler(async (req, res) => {
    const company = await Company.findById(req.tenantId);
    if (!company) return fail(res, "Company not found.", 404);

    const prev = {
      name: company.name,
      branding: company.branding,
      logo: company.logo,
    };

    if (req.body.name) company.name = req.body.name;
    if (req.body.logo !== undefined) company.logo = req.body.logo;

    if (req.body.branding && typeof req.body.branding === "object") {
      company.branding = {
        ...(company.branding?.toObject?.() || company.branding || {}),
        ...req.body.branding,
      };
      if (req.body.branding.pharmacyName) {
        company.name = req.body.branding.pharmacyName;
      }
      if (req.body.branding.logo !== undefined) {
        company.logo = req.body.branding.logo;
      }
    }

    if (req.body.settings && typeof req.body.settings === "object") {
      company.settings = {
        ...(company.settings?.toObject?.() || company.settings || {}),
        ...req.body.settings,
      };
    }

    await company.save();
    await writeAudit({
      user: req.user,
      tenantId: req.tenantId,
      action: "update",
      module: "branding",
      description: "Updated company branding",
      previousValues: prev,
      newValues: { name: company.name, branding: company.branding },
      ipAddress: req.ip,
    });

    return ok(
      res,
      {
        name: company.name,
        slug: company.slug,
        logo: company.logo,
        branding: company.branding,
        settings: company.settings,
      },
      "Branding saved."
    );
  })
);

module.exports = router;
