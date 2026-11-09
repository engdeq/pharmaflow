const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { body, validationResult } = require("express-validator");
const User = require("../models/User");
const Role = require("../models/Role");
const { authenticate } = require("../middleware/auth");
const { getMenusForUser } = require("../services/menuService");
const { ok, fail } = require("../utils/response");
const asyncHandler = require("../utils/asyncHandler");
const { writeAudit } = require("../services/auditService");

const router = express.Router();
const { resolveTenantFromRequest } = require("../services/tenantResolver");

function getToken(user) {
  return jwt.sign(
    {
      id: user._id,
      username: user.username,
      tenantId: user.tenantId || null,
      isPlatformAdmin: Boolean(user.isPlatformAdmin),
    },
    process.env.JWT_SECRET || "pharmacy_dev_secret",
    { expiresIn: "7d" }
  );
}

function collectPermissions(user) {
  const permissions = new Set();
  (user.roles || []).forEach((role) => {
    if (!role.isActive) return;
    (role.permissions || []).forEach((perm) => {
      if (perm?.key) permissions.add(perm.key);
    });
  });
  return permissions;
}

router.post(
  "/register",
  [
    body("username").trim().isLength({ min: 3 }).withMessage("Username must be at least 3 characters."),
    body("email").isEmail().withMessage("Valid email is required."),
    body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters."),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return fail(res, errors.array()[0].msg, 400);

    const { username, email, password } = req.body;
    const existing = await User.findOne({
      $or: [{ username }, { email: email.toLowerCase() }],
    });
    if (existing) return fail(res, "Username or email already exists.", 409);

    return fail(
      res,
      "Open user registration is disabled. Register a pharmacy company or ask your company admin for an invite.",
      403
    );
  })
);

router.post(
  "/login",
  [
    body("username").trim().notEmpty().withMessage("Username is required."),
    body("password").notEmpty().withMessage("Password is required."),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return fail(res, errors.array()[0].msg, 400);

    const { username, password, companySlug } = req.body;
    const Company = require("../models/Company");
    let user = null;

    // Prefer explicit slug, else resolve from hostname /t/:slug (never trust tenantId body)
    let slug = String(companySlug || "").trim().toLowerCase();
    if (!slug) {
      try {
        const hostCtx = await resolveTenantFromRequest(req);
        if (hostCtx?.slug) slug = hostCtx.slug;
      } catch {
        /* ignore */
      }
    }

    // Platform operator login (no pharmacy code)
    if (!slug || slug === "platform") {
      user = await User.findOne({
        username,
        isPlatformAdmin: true,
      }).populate({ path: "roles", populate: { path: "permissions" } });
    }

    // Pharmacy tenant login via company code/slug
    if (!user && slug && slug !== "platform") {
      const company = await Company.findOne({ slug }).lean();
      if (!company) return fail(res, "Pharmacy code not found.", 404);
      user = await User.findOne({
        username,
        tenantId: company._id,
        isPlatformAdmin: { $ne: true },
      }).populate({ path: "roles", populate: { path: "permissions" } });
    }

    // Fallback: unique username lookup (legacy / single match)
    if (!user && !slug) {
      const matches = await User.find({ username, isPlatformAdmin: { $ne: true } }).limit(2);
      if (matches.length === 1) {
        user = await User.findById(matches[0]._id).populate({
          path: "roles",
          populate: { path: "permissions" },
        });
      } else if (matches.length > 1) {
        return fail(res, "Enter your Pharmacy Code to login.", 400);
      }
    }

    if (!user) return fail(res, "Invalid username or password.", 401);

    const match = await bcrypt.compare(password, user.password);
    if (!match) return fail(res, "Invalid username or password.", 401);

    if (user.status !== "active") {
      return fail(res, "Account is inactive.", 403);
    }

    if (!user.isPlatformAdmin) {
      if (!user.tenantId) {
        return fail(res, "No company assigned to this account.", 403);
      }
      const company = await Company.findById(user.tenantId).lean();
      if (!company) return fail(res, "Company not found.", 403);
      if (company.status === "suspended") {
        return fail(res, "Company account is suspended. Contact platform support.", 403);
      }
      if (company.status === "pending") {
        return fail(res, "Company registration is pending approval.", 403);
      }
      if (company.status !== "active") {
        return fail(res, "Company is not active.", 403);
      }
      if (company.subscription?.status === "suspended") {
        return fail(res, "Company subscription is suspended.", 403);
      }
    }

    user.lastLogin = new Date();
    await user.save();

    const token = getToken(user);

    await writeAudit({
      user,
      tenantId: user.tenantId,
      action: "login",
      module: "auth",
      description: `User ${user.username} logged in`,
      ipAddress: req.ip,
    });

    return res.json({
      message: "Login successful.",
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        isPlatformAdmin: Boolean(user.isPlatformAdmin),
        tenantId: user.tenantId || null,
      },
    });
  })
);

/** Public: resolve pharmacy branding/slug from hostname or ?slug= / path hint */
router.get(
  "/tenant-context",
  asyncHandler(async (req, res) => {
    const Company = require("../models/Company");
    const querySlug = String(req.query.slug || "").trim().toLowerCase();
    let company = null;

    if (querySlug) {
      company = await Company.findOne({ slug: querySlug }).lean();
    } else {
      const hostCtx = await resolveTenantFromRequest(req);
      if (hostCtx?.company) company = hostCtx.company;
    }

    if (!company) {
      return ok(res, {
        mode: "platform",
        slug: null,
        name: "MedAxis",
        logo: "",
        branding: null,
        loginUrl: "/platform",
      });
    }

    return ok(res, {
      mode: "pharmacy",
      slug: company.slug,
      name: company.name,
      status: company.status,
      logo: company.logo || company.branding?.logo || "",
      branding: company.branding || {},
      livePath: `/t/${company.slug}`,
      subdomain: `${company.slug}.${process.env.MEDAXIS_BASE_DOMAIN || "medaxis.dirshay.com"}`,
    });
  })
);

router.get(
  "/me",
  authenticate,
  asyncHandler(async (req, res) => {
    return ok(res, {
      id: req.user._id,
      username: req.user.username,
      email: req.user.email,
      fullName: req.user.fullName,
      phone: req.user.phone,
      status: req.user.status,
      lastLogin: req.user.lastLogin,
      isPlatformAdmin: Boolean(req.isPlatformAdmin),
      tenantId: req.tenantId,
      branchIds: req.branchIds || [],
      company: req.company
        ? {
            id: req.company._id,
            name: req.company.name,
            slug: req.company.slug,
            status: req.company.status,
            logo: req.company.logo || req.company.branding?.logo || "",
            branding: req.company.branding || {},
            settings: req.company.settings || {},
            enabledModules: req.company.enabledModules || [],
            subscription: req.company.subscription || {},
          }
        : null,
      roles: (req.user.roles || []).map((r) => ({
        id: r._id,
        name: r.name,
      })),
      permissions: [...req.permissions],
    });
  })
);

router.get(
  "/my-menus",
  authenticate,
  asyncHandler(async (req, res) => {
    if (req.isPlatformAdmin) {
      return ok(res, [
        {
          id: "platform-dashboard",
          name: "platform_dashboard",
          label: "Platform Dashboard",
          icon: "LayoutDashboard",
          url: "/platform",
          order: 1,
          children: [],
        },
        {
          id: "platform-companies",
          name: "platform_companies",
          label: "Companies",
          icon: "Building2",
          url: "/platform/companies",
          order: 2,
          children: [],
        },
      ]);
    }
    const tree = await getMenusForUser(req.permissions, {
      tenantId: req.tenantId,
      enabledModules: req.company?.enabledModules,
    });
    return ok(res, tree);
  })
);

router.post(
  "/logout",
  authenticate,
  asyncHandler(async (req, res) => {
    await writeAudit({
      user: req.user,
      action: "logout",
      module: "auth",
      description: `User ${req.user.username} logged out`,
      ipAddress: req.ip,
    });
    return ok(res, null, "Logged out.");
  })
);

router.post(
  "/forgot-password",
  [body("email").isEmail()],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return fail(res, errors.array()[0].msg, 400);

    const user = await User.findOne({ email: req.body.email.toLowerCase() });
    if (!user) {
      return ok(res, null, "If the email exists, a reset token was generated.");
    }

    const token = crypto.randomBytes(32).toString("hex");
    user.resetToken = token;
    user.resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    // Email stub — return token in data for local/dev use
    return ok(
      res,
      { resetToken: token },
      "If the email exists, a reset token was generated."
    );
  })
);

router.post(
  "/reset-password",
  [
    body("token").notEmpty(),
    body("password").isLength({ min: 6 }),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return fail(res, errors.array()[0].msg, 400);

    const user = await User.findOne({
      resetToken: req.body.token,
      resetTokenExpires: { $gt: new Date() },
    });

    if (!user) return fail(res, "Invalid or expired reset token.", 400);

    user.password = await bcrypt.hash(req.body.password, 10);
    user.resetToken = null;
    user.resetTokenExpires = null;
    await user.save();

    return ok(res, null, "Password reset successful.");
  })
);

module.exports = router;
