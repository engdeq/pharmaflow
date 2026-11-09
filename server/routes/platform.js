const express = require("express");
const Company = require("../models/Company");
const User = require("../models/User");
const Branch = require("../models/Branch");
const { authenticate } = require("../middleware/auth");
const { requirePlatformAdmin } = require("../middleware/tenant");
const { ok, fail } = require("../utils/response");
const asyncHandler = require("../utils/asyncHandler");
const { writeAudit } = require("../services/auditService");
const {
  provisionCompany,
  buildSubscription,
  uniqueSlug,
  PLAN_LIMITS,
} = require("../services/companyService");

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
      plans: PLAN_LIMITS,
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
            { slug: new RegExp(q, "i") },
          ],
        }
      : {};
    const companies = await Company.find(filter)
      .populate("ownerUserId", "username email fullName status")
      .sort({ createdAt: -1 })
      .lean();
    return ok(res, companies);
  })
);

router.post(
  "/companies",
  asyncHandler(async (req, res) => {
    const {
      name,
      slug,
      legalName,
      phone,
      email,
      address,
      city,
      country,
      website,
      currency,
      language,
      timezone,
      plan,
      status,
      ownerFullName,
      ownerUsername,
      ownerEmail,
      ownerPhone,
      ownerPassword,
    } = req.body;

    if (!name) return fail(res, "Pharmacy name is required.", 400);
    if (!ownerUsername || !ownerEmail || !ownerPassword) {
      return fail(res, "Owner username, email and password are required.", 400);
    }
    if (String(ownerPassword).length < 6) {
      return fail(res, "Owner password must be at least 6 characters.", 400);
    }

    try {
      const result = await provisionCompany({
        companyInput: {
          name,
          slug,
          legalName,
          phone,
          email,
          address,
          city,
          country,
          website,
          currency,
          language,
          timezone,
        },
        ownerInput: {
          fullName: ownerFullName,
          username: ownerUsername,
          email: ownerEmail,
          phone: ownerPhone,
          password: ownerPassword,
        },
        plan: plan || "trial",
        status: status === "pending" ? "pending" : "active",
        approvedBy: req.user._id,
      });

      await writeAudit({
        user: req.user,
        action: "create",
        module: "platform",
        description: `Registered pharmacy ${result.company.name} (${result.company.slug})`,
        newValues: {
          companyId: result.company._id,
          slug: result.company.slug,
          owner: result.owner.username,
          plan: result.company.subscription?.plan,
        },
        ipAddress: req.ip,
      });

      return ok(
        res,
        {
          company: result.company,
          owner: {
            id: result.owner._id,
            username: result.owner.username,
            email: result.owner.email,
          },
          loginHint: {
            companySlug: result.company.slug,
            username: result.owner.username,
          },
        },
        "Pharmacy company registered.",
        201
      );
    } catch (err) {
      return fail(res, err.message || "Failed to register company.", err.statusCode || 400);
    }
  })
);

router.put(
  "/companies/:id",
  asyncHandler(async (req, res) => {
    const company = await Company.findById(req.params.id);
    if (!company) return fail(res, "Company not found.", 404);

    const allowed = [
      "name",
      "legalName",
      "phone",
      "email",
      "address",
      "city",
      "country",
      "website",
      "logo",
    ];
    allowed.forEach((key) => {
      if (req.body[key] !== undefined) company[key] = req.body[key];
    });

    if (req.body.slug) {
      const nextSlug = String(req.body.slug).toLowerCase().trim();
      const taken = await Company.exists({ slug: nextSlug, _id: { $ne: company._id } });
      if (taken) return fail(res, "Company code/slug already in use.", 409);
      company.slug = nextSlug;
    }

    if (req.body.branding && typeof req.body.branding === "object") {
      company.branding = { ...company.branding.toObject?.() || company.branding, ...req.body.branding };
      if (req.body.branding.pharmacyName) company.name = req.body.branding.pharmacyName;
    }

    if (req.body.settings && typeof req.body.settings === "object") {
      company.settings = { ...company.settings.toObject?.() || company.settings, ...req.body.settings };
    }

    if (req.body.plan) {
      const sub = buildSubscription(req.body.plan);
      company.subscription = {
        ...company.subscription.toObject?.() || company.subscription,
        ...sub,
        status:
          company.status === "suspended"
            ? "suspended"
            : sub.status,
      };
    }

    if (company.branding) {
      company.branding.pharmacyName = company.branding.pharmacyName || company.name;
    }

    await company.save();
    await writeAudit({
      user: req.user,
      action: "update",
      module: "platform",
      description: `Updated pharmacy ${company.name}`,
      ipAddress: req.ip,
    });
    return ok(res, company, "Company updated.");
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
      if (company.subscription) {
        company.subscription.status =
          company.subscription.plan === "trial" ? "trialing" : "active";
      }
    }
    if (status === "suspended") {
      company.suspendedAt = new Date();
      company.suspensionReason = req.body.reason || "";
      if (company.subscription) company.subscription.status = "suspended";
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

router.get(
  "/slug-check/:slug",
  asyncHandler(async (req, res) => {
    const slug = String(req.params.slug || "").toLowerCase();
    const exists = await Company.exists({ slug });
    return ok(res, { slug, available: !exists, suggestion: exists ? await uniqueSlug(slug) : slug });
  })
);

module.exports = router;
