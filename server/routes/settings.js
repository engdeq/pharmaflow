const express = require("express");
const Settings = require("../models/Settings");
const Company = require("../models/Company");
const { authenticate, requirePermission } = require("../middleware/auth");
const { requireTenant, sanitizeTenantPayload } = require("../middleware/tenant");
const { ok } = require("../utils/response");
const asyncHandler = require("../utils/asyncHandler");
const { writeAudit } = require("../services/auditService");

const router = express.Router();
router.use(authenticate);
router.use(requireTenant);

function companySettingsView(company) {
  const settings = company.settings || {};
  const branding = company.branding || {};
  return {
    source: "company",
    pharmacyName: branding.pharmacyName || company.name || "",
    logo: branding.logo || company.logo || "",
    address: company.address || "",
    phone: company.phone || "",
    email: company.email || "",
    currency: settings.currency || "USD",
    taxRate: settings.taxRate || 0,
    taxEnabled: settings.taxEnabled || false,
    receiptFooter: settings.receiptFooter || "",
    lowStockThreshold: settings.lowStockThreshold || 10,
    dateFormat: settings.dateFormat || "YYYY-MM-DD",
    language: settings.language || "en",
    theme: settings.theme || "light",
    timezone: settings.timezone || "UTC",
    branding,
    settings,
  };
}

router.get(
  "/",
  asyncHandler(async (req, res) => {
    if (req.company) {
      return ok(res, companySettingsView(req.company));
    }

    let settings = await Settings.findOne({ tenantId: req.tenantId });
    if (!settings) {
      settings = await Settings.create({ tenantId: req.tenantId });
    }
    return ok(res, settings);
  })
);

router.put(
  "/",
  requirePermission("settings.manage"),
  asyncHandler(async (req, res) => {
    const body = sanitizeTenantPayload(req.body);

    if (req.company || req.tenantId) {
      const company = await Company.findById(req.tenantId);
      if (company) {
        const prev = {
          settings: company.settings?.toObject?.() || company.settings,
          branding: company.branding?.toObject?.() || company.branding,
        };

        const settingsPatch = body.settings || {};
        const brandingPatch = body.branding || {};

        // Flat legacy fields map into company.settings / branding
        if (body.currency != null) settingsPatch.currency = body.currency;
        if (body.taxRate != null) settingsPatch.taxRate = body.taxRate;
        if (body.taxEnabled != null) settingsPatch.taxEnabled = body.taxEnabled;
        if (body.receiptFooter != null) settingsPatch.receiptFooter = body.receiptFooter;
        if (body.lowStockThreshold != null) {
          settingsPatch.lowStockThreshold = body.lowStockThreshold;
        }
        if (body.dateFormat != null) settingsPatch.dateFormat = body.dateFormat;
        if (body.language != null) settingsPatch.language = body.language;
        if (body.theme != null) settingsPatch.theme = body.theme;
        if (body.timezone != null) settingsPatch.timezone = body.timezone;

        if (body.pharmacyName != null) brandingPatch.pharmacyName = body.pharmacyName;
        if (body.logo != null) brandingPatch.logo = body.logo;

        company.settings = { ...(company.settings?.toObject?.() || company.settings || {}), ...settingsPatch };
        company.branding = { ...(company.branding?.toObject?.() || company.branding || {}), ...brandingPatch };

        if (body.address != null) company.address = body.address;
        if (body.phone != null) company.phone = body.phone;
        if (body.email != null) company.email = body.email;
        if (brandingPatch.logo != null && !company.logo) company.logo = brandingPatch.logo;

        await company.save();
        req.company = company.toObject();

        await writeAudit({
          user: req.user,
          action: "update",
          module: "settings",
          description: "Updated company settings",
          previousValues: prev,
          newValues: { settings: company.settings, branding: company.branding },
          ipAddress: req.ip,
          tenantId: req.tenantId,
        });

        return ok(res, companySettingsView(company), "Settings updated.");
      }
    }

    let settings = await Settings.findOne({ tenantId: req.tenantId });
    if (!settings) settings = await Settings.create({ tenantId: req.tenantId });
    const prev = settings.toObject();
    Object.assign(settings, body);
    settings.tenantId = req.tenantId;
    await settings.save();
    await writeAudit({
      user: req.user,
      action: "update",
      module: "settings",
      description: "Updated system settings",
      previousValues: prev,
      newValues: settings,
      ipAddress: req.ip,
      tenantId: req.tenantId,
    });
    return ok(res, settings, "Settings updated.");
  })
);

module.exports = router;
