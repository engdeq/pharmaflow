const express = require("express");
const bcrypt = require("bcryptjs");
const Company = require("../models/Company");
const CompanyDomain = require("../models/CompanyDomain");
const GlobalMenu = require("../models/GlobalMenu");
const Menu = require("../models/Menu");
const SubscriptionPlan = require("../models/SubscriptionPlan");
const User = require("../models/User");
const Branch = require("../models/Branch");
const { seedHierarchicalMenus } = require("../seed/resyncMenus");
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
  backfillCompanyDomains,
  livePharmacyUrl,
  ensureCompanyDomain,
} = require("../services/companyService");
const {
  ensureDefaultPlans,
  ensureDefaultGlobalMenus,
} = require("../services/platformCatalog");

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
      trialCompanies,
      activeSubscriptions,
      planGroups,
    ] = await Promise.all([
      Company.countDocuments(),
      Company.countDocuments({ status: "active" }),
      Company.countDocuments({ status: "suspended" }),
      Company.countDocuments({ status: "pending" }),
      User.countDocuments({ isPlatformAdmin: { $ne: true } }),
      Branch.countDocuments(),
      Company.countDocuments({ "subscription.plan": "trial" }),
      Company.countDocuments({ "subscription.status": { $in: ["active", "trialing"] } }),
      Company.aggregate([{ $group: { _id: "$subscription.plan", value: { $sum: 1 } } }]),
    ]);

    return ok(res, {
      totalCompanies,
      activeCompanies,
      suspendedCompanies,
      pendingCompanies,
      totalUsers,
      totalBranches,
      trialCompanies,
      activeSubscriptions,
      plans: PLAN_LIMITS,
      subscriptionDistribution: planGroups.map((p) => ({
        name: p._id || "unknown",
        value: p.value,
      })),
      registrationGrowth: [
        { name: "Total", companies: totalCompanies },
        { name: "Active", companies: activeCompanies },
        { name: "Trial", companies: trialCompanies },
        { name: "Pending", companies: pendingCompanies },
        { name: "Suspended", companies: suspendedCompanies },
      ],
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
      logo,
      tagline,
      branding,
      primaryColor,
      secondaryColor,
      registrationNumber,
      licenseNumber,
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
          registrationNumber,
          licenseNumber,
          phone,
          email,
          address,
          city,
          country,
          website,
          currency,
          language,
          timezone,
          logo,
          tagline,
          primaryColor,
          secondaryColor,
          branding: branding || {},
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
          liveUrl: result.liveUrl,
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
          domain: result.domain,
          liveUrl: result.liveUrl,
          loginHint: {
            companySlug: result.company.slug,
            username: result.owner.username,
            liveUrl: result.liveUrl,
            openNow: true,
          },
        },
        "Pharmacy registered — live link ready.",
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
      if (req.body.branding.logo !== undefined) company.logo = req.body.branding.logo;
    }
    if (req.body.logo !== undefined) {
      company.logo = req.body.logo;
      company.branding = {
        ...(company.branding?.toObject?.() || company.branding || {}),
        logo: req.body.logo,
      };
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
    await ensureCompanyDomain(company);
    await writeAudit({
      user: req.user,
      action: "update",
      module: "platform",
      description: `Updated pharmacy ${company.name}`,
      ipAddress: req.ip,
    });
    return ok(res, { company, liveUrl: livePharmacyUrl(company.slug) }, "Company updated.");
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
    await ensureCompanyDomain(company);
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

router.get(
  "/domains",
  asyncHandler(async (_req, res) => {
    // Ensure every company has a domain row (automatic)
    await backfillCompanyDomains();
    const domains = await CompanyDomain.find()
      .populate("companyId", "name slug status")
      .sort({ createdAt: -1 })
      .lean();
    const enriched = domains.map((d) => ({
      ...d,
      liveUrl: livePharmacyUrl(d.companyId?.slug),
      pathLive: d.pathLive !== false,
    }));
    return ok(res, enriched);
  })
);

router.post(
  "/domains/sync",
  asyncHandler(async (_req, res) => {
    const results = await backfillCompanyDomains();
    return ok(res, results, `Synced ${results.length} company domains.`);
  })
);

router.post(
  "/domains",
  asyncHandler(async (req, res) => {
    const companyId = req.body.companyId;
    const base = String(process.env.MEDAXIS_BASE_DOMAIN || "medaxis.dirshay.com").toLowerCase();
    let hostname = String(req.body.hostname || "").trim().toLowerCase();
    const type = req.body.type === "custom" ? "custom" : "subdomain";
    const company = await Company.findById(companyId);
    if (!company) return fail(res, "Company not found.", 404);

    if (!hostname && type === "subdomain") {
      const slug = String(req.body.slug || company.slug).toLowerCase();
      hostname = `${slug}.${base}`;
    }
    if (!hostname) return fail(res, "hostname is required.", 400);

    const taken = await CompanyDomain.exists({ hostname });
    if (taken) return fail(res, "Hostname already assigned.", 409);

    if (req.body.isPrimary) {
      await CompanyDomain.updateMany({ companyId: company._id }, { $set: { isPrimary: false } });
    }

    const domain = await CompanyDomain.create({
      companyId: company._id,
      tenantId: company._id,
      hostname,
      type,
      isPrimary: Boolean(req.body.isPrimary ?? true),
      status: req.body.status || "pending",
      sslStatus: req.body.sslStatus || "none",
      notes: req.body.notes || "",
    });

    await writeAudit({
      user: req.user,
      action: "create",
      module: "platform",
      description: `Assigned domain ${hostname} to ${company.name}`,
      ipAddress: req.ip,
    });

    return ok(res, domain, "Domain registered (pending DNS/SSL verification).", 201);
  })
);

router.put(
  "/domains/:id",
  asyncHandler(async (req, res) => {
    const domain = await CompanyDomain.findById(req.params.id);
    if (!domain) return fail(res, "Domain not found.", 404);

    if (req.body.hostname) {
      const hostname = String(req.body.hostname).trim().toLowerCase();
      const taken = await CompanyDomain.exists({ hostname, _id: { $ne: domain._id } });
      if (taken) return fail(res, "Hostname already assigned.", 409);
      domain.hostname = hostname;
    }
    if (req.body.type) domain.type = req.body.type === "custom" ? "custom" : "subdomain";
    if (req.body.status) domain.status = req.body.status;
    if (req.body.sslStatus) domain.sslStatus = req.body.sslStatus;
    if (req.body.notes !== undefined) domain.notes = req.body.notes;
    if (req.body.isPrimary) {
      await CompanyDomain.updateMany(
        { companyId: domain.companyId, _id: { $ne: domain._id } },
        { $set: { isPrimary: false } }
      );
      domain.isPrimary = true;
    } else if (req.body.isPrimary === false) {
      domain.isPrimary = false;
    }

    await domain.save();
    return ok(res, domain, "Domain updated.");
  })
);

router.delete(
  "/domains/:id",
  asyncHandler(async (req, res) => {
    const domain = await CompanyDomain.findByIdAndDelete(req.params.id);
    if (!domain) return fail(res, "Domain not found.", 404);
    return ok(res, { id: req.params.id }, "Domain removed.");
  })
);

/* ---------- Global Menus ---------- */
router.get(
  "/global-menus",
  asyncHandler(async (_req, res) => {
    const menus = await ensureDefaultGlobalMenus();
    return ok(res, menus);
  })
);

router.post(
  "/global-menus",
  asyncHandler(async (req, res) => {
    const name = String(req.body.name || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_");
    if (!name || !req.body.label) return fail(res, "name and label are required.", 400);
    const exists = await GlobalMenu.exists({ name });
    if (exists) return fail(res, "Menu name already exists.", 409);

    const menu = await GlobalMenu.create({
      name,
      label: req.body.label,
      icon: req.body.icon || "Circle",
      url: req.body.url || "",
      parentName: req.body.parentName || null,
      order: Number(req.body.order || 0),
      permissionKey: req.body.permissionKey || "",
      moduleKey: req.body.moduleKey || "",
      section: req.body.section || "operations",
      plans: Array.isArray(req.body.plans) ? req.body.plans : undefined,
      isActive: req.body.isActive !== false,
    });
    return ok(res, menu, "Global menu created.", 201);
  })
);

router.put(
  "/global-menus/:id",
  asyncHandler(async (req, res) => {
    const menu = await GlobalMenu.findById(req.params.id);
    if (!menu) return fail(res, "Menu not found.", 404);
    [
      "label",
      "icon",
      "url",
      "parentName",
      "permissionKey",
      "moduleKey",
      "section",
    ].forEach((k) => {
      if (req.body[k] !== undefined) menu[k] = req.body[k];
    });
    if (req.body.order !== undefined) menu.order = Number(req.body.order);
    if (req.body.plans) menu.plans = req.body.plans;
    if (req.body.isActive !== undefined) menu.isActive = Boolean(req.body.isActive);
    await menu.save();
    return ok(res, menu, "Global menu updated.");
  })
);

router.delete(
  "/global-menus/:id",
  asyncHandler(async (req, res) => {
    const menu = await GlobalMenu.findByIdAndDelete(req.params.id);
    if (!menu) return fail(res, "Menu not found.", 404);
    return ok(res, { id: req.params.id }, "Global menu deleted.");
  })
);

/* ---------- Per-company menus (platform controls each pharmacy separately) ---------- */
router.get(
  "/companies/:id/menus",
  asyncHandler(async (req, res) => {
    const company = await Company.findById(req.params.id).lean();
    if (!company) return fail(res, "Company not found.", 404);

    let menus = await Menu.find({ tenantId: company._id }).sort({ order: 1 }).lean();
    if (!menus.length) {
      await seedHierarchicalMenus(company._id);
      menus = await Menu.find({ tenantId: company._id }).sort({ order: 1 }).lean();
    }

    const parentMap = Object.fromEntries(menus.map((m) => [String(m._id), m.name]));
    const rows = menus.map((m) => ({
      ...m,
      parentName: m.parent ? parentMap[String(m.parent)] || "" : "",
    }));

    return ok(res, {
      company: {
        id: company._id,
        name: company.name,
        slug: company.slug,
        phone: company.phone,
        email: company.email,
        status: company.status,
      },
      menus: rows,
    });
  })
);

router.put(
  "/companies/:id/menus/:menuId",
  asyncHandler(async (req, res) => {
    const company = await Company.findById(req.params.id);
    if (!company) return fail(res, "Company not found.", 404);

    const menu = await Menu.findOne({ _id: req.params.menuId, tenantId: company._id });
    if (!menu) return fail(res, "Menu not found for this company.", 404);

    if (req.body.isActive !== undefined) menu.isActive = Boolean(req.body.isActive);
    if (req.body.label !== undefined) menu.label = req.body.label;
    if (req.body.order !== undefined) menu.order = Number(req.body.order);
    if (req.body.icon !== undefined) menu.icon = req.body.icon;
    await menu.save();

    await writeAudit({
      user: req.user,
      action: "update",
      module: "platform-menus",
      description: `${menu.isActive ? "Enabled" : "Disabled"} menu "${menu.label}" for ${company.name}`,
      ipAddress: req.ip,
    });

    return ok(res, menu, menu.isActive ? "Menu enabled for company." : "Menu disabled for company.");
  })
);

router.post(
  "/companies/:id/menus/resync",
  asyncHandler(async (req, res) => {
    const company = await Company.findById(req.params.id);
    if (!company) return fail(res, "Company not found.", 404);
    await seedHierarchicalMenus(company._id);
    const menus = await Menu.find({ tenantId: company._id }).sort({ order: 1 }).lean();
    return ok(res, menus, "Company menus resynced from platform template.");
  })
);

/* ---------- Subscription Plans ---------- */
router.get(
  "/plans",
  asyncHandler(async (_req, res) => {
    const plans = await ensureDefaultPlans();
    return ok(res, plans);
  })
);

router.post(
  "/plans",
  asyncHandler(async (req, res) => {
    const code = String(req.body.code || "")
      .trim()
      .toLowerCase();
    if (!code || !req.body.name) return fail(res, "code and name are required.", 400);
    if (await SubscriptionPlan.exists({ code })) return fail(res, "Plan code exists.", 409);
    const plan = await SubscriptionPlan.create({
      code,
      name: req.body.name,
      description: req.body.description || "",
      priceMonthly: Number(req.body.priceMonthly || 0),
      priceYearly: Number(req.body.priceYearly || 0),
      currency: req.body.currency || "USD",
      userLimit: Number(req.body.userLimit || 10),
      branchLimit: Number(req.body.branchLimit || 1),
      trialDays: Number(req.body.trialDays || 0),
      modules: req.body.modules || [],
      features: req.body.features || [],
      isActive: req.body.isActive !== false,
      sortOrder: Number(req.body.sortOrder || 0),
    });
    return ok(res, plan, "Plan created.", 201);
  })
);

router.put(
  "/plans/:id",
  asyncHandler(async (req, res) => {
    const plan = await SubscriptionPlan.findById(req.params.id);
    if (!plan) return fail(res, "Plan not found.", 404);
    [
      "name",
      "description",
      "currency",
      "modules",
      "features",
    ].forEach((k) => {
      if (req.body[k] !== undefined) plan[k] = req.body[k];
    });
    ["priceMonthly", "priceYearly", "userLimit", "branchLimit", "trialDays", "sortOrder"].forEach(
      (k) => {
        if (req.body[k] !== undefined) plan[k] = Number(req.body[k]);
      }
    );
    if (req.body.isActive !== undefined) plan.isActive = Boolean(req.body.isActive);
    await plan.save();
    return ok(res, plan, "Plan updated.");
  })
);

/* ---------- Billing ---------- */
router.get(
  "/billing",
  asyncHandler(async (_req, res) => {
    const [companies, plans] = await Promise.all([
      Company.find()
        .select("name slug status email subscription logo createdAt")
        .sort({ createdAt: -1 })
        .lean(),
      ensureDefaultPlans(),
    ]);
    const planMap = Object.fromEntries(plans.map((p) => [p.code, p]));
    const rows = companies.map((c) => {
      const code = c.subscription?.plan || "trial";
      const plan = planMap[code];
      return {
        companyId: c._id,
        name: c.name,
        slug: c.slug,
        status: c.status,
        email: c.email,
        plan: code,
        planName: plan?.name || code,
        subscriptionStatus: c.subscription?.status || "-",
        trialEndsAt: c.subscription?.trialEndsAt || null,
        renewalDate: c.subscription?.renewalDate || null,
        userLimit: c.subscription?.userLimit ?? plan?.userLimit,
        branchLimit: c.subscription?.branchLimit ?? plan?.branchLimit,
        priceMonthly: plan?.priceMonthly ?? 0,
        currency: plan?.currency || "USD",
      };
    });
    const mrr = rows
      .filter((r) => r.status === "active" && r.subscriptionStatus !== "trialing")
      .reduce((sum, r) => sum + Number(r.priceMonthly || 0), 0);
    return ok(res, {
      rows,
      summary: {
        companies: rows.length,
        active: rows.filter((r) => r.status === "active").length,
        trialing: rows.filter((r) => r.subscriptionStatus === "trialing").length,
        mrr,
      },
      plans,
    });
  })
);

router.put(
  "/billing/:companyId/plan",
  asyncHandler(async (req, res) => {
    const company = await Company.findById(req.params.companyId);
    if (!company) return fail(res, "Company not found.", 404);
    const planCode = String(req.body.plan || "").toLowerCase();
    const catalog = await SubscriptionPlan.findOne({ code: planCode, isActive: true });
    const sub = catalog
      ? {
          plan: catalog.code,
          status: catalog.trialDays > 0 ? "trialing" : "active",
          trialEndsAt:
            catalog.trialDays > 0
              ? new Date(Date.now() + catalog.trialDays * 24 * 60 * 60 * 1000)
              : null,
          renewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          userLimit: catalog.userLimit,
          branchLimit: catalog.branchLimit,
          moduleLimits: {},
        }
      : buildSubscription(planCode);
    company.subscription = { ...(company.subscription?.toObject?.() || company.subscription || {}), ...sub };
    if (catalog?.modules?.length) company.enabledModules = catalog.modules;
    await company.save();
    await writeAudit({
      user: req.user,
      action: "update",
      module: "billing",
      description: `Changed plan for ${company.name} → ${sub.plan}`,
      ipAddress: req.ip,
    });
    return ok(res, company, "Subscription plan updated.");
  })
);

/* ---------- Platform Users ---------- */
router.get(
  "/users",
  asyncHandler(async (_req, res) => {
    const users = await User.find({ isPlatformAdmin: true })
      .select("-password -resetToken -resetTokenExpires")
      .sort({ createdAt: -1 })
      .lean();
    return ok(res, users);
  })
);

router.post(
  "/users",
  asyncHandler(async (req, res) => {
    const { username, email, password, fullName, phone } = req.body;
    if (!username || !email || !password) {
      return fail(res, "username, email and password are required.", 400);
    }
    if (String(password).length < 6) return fail(res, "Password must be at least 6 characters.", 400);

    const exists = await User.findOne({
      isPlatformAdmin: true,
      $or: [{ username }, { email: String(email).toLowerCase() }],
    });
    if (exists) return fail(res, "Platform username or email already exists.", 409);

    const user = await User.create({
      username: String(username).trim(),
      email: String(email).toLowerCase().trim(),
      password: await bcrypt.hash(password, 10),
      fullName: fullName || username,
      phone: phone || "",
      isPlatformAdmin: true,
      tenantId: null,
      status: "active",
      isProtected: false,
      roles: [],
    });

    const safe = user.toObject();
    delete safe.password;
    return ok(res, safe, "Platform user created.", 201);
  })
);

router.put(
  "/users/:id",
  asyncHandler(async (req, res) => {
    const user = await User.findOne({ _id: req.params.id, isPlatformAdmin: true });
    if (!user) return fail(res, "Platform user not found.", 404);
    if (user.isProtected && req.body.status === "inactive") {
      return fail(res, "Protected platform user cannot be deactivated.", 403);
    }
    if (req.body.fullName !== undefined) user.fullName = req.body.fullName;
    if (req.body.phone !== undefined) user.phone = req.body.phone;
    if (req.body.email !== undefined) user.email = String(req.body.email).toLowerCase();
    if (req.body.status) user.status = req.body.status;
    if (req.body.password) {
      if (String(req.body.password).length < 6) {
        return fail(res, "Password must be at least 6 characters.", 400);
      }
      user.password = await bcrypt.hash(req.body.password, 10);
    }
    await user.save();
    const safe = user.toObject();
    delete safe.password;
    return ok(res, safe, "Platform user updated.");
  })
);

module.exports = router;
