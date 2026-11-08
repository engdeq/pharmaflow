const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { fail } = require("../utils/response");
const { resolveTenant } = require("./tenant");

async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
      return fail(res, "Authentication required.", 401);
    }

    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET || "pharmacy_dev_secret"
    );

    const user = await User.findById(payload.id)
      .populate({
        path: "roles",
        populate: { path: "permissions" },
      })
      .select("-password");

    if (!user || user.status !== "active") {
      return fail(res, "Account is inactive or not found.", 401);
    }

    const permissions = new Set();
    if (user.isPlatformAdmin) {
      permissions.add("*");
      permissions.add("platform.manage");
    }
    (user.roles || []).forEach((role) => {
      if (!role.isActive) return;
      (role.permissions || []).forEach((perm) => {
        if (perm?.key) permissions.add(perm.key);
      });
    });

    req.user = user;
    req.permissions = permissions;

    return resolveTenant(req, res, next);
  } catch (error) {
    return fail(res, "Session expired. Please login again.", 401);
  }
}

/** Authenticate without requiring an active company (login helpers, platform). */
async function authenticateSoft(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return fail(res, "Authentication required.", 401);

    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET || "pharmacy_dev_secret"
    );
    const user = await User.findById(payload.id)
      .populate({ path: "roles", populate: { path: "permissions" } })
      .select("-password");

    if (!user || user.status !== "active") {
      return fail(res, "Account is inactive or not found.", 401);
    }

    const permissions = new Set();
    if (user.isPlatformAdmin) {
      permissions.add("*");
      permissions.add("platform.manage");
    }
    (user.roles || []).forEach((role) => {
      if (!role.isActive) return;
      (role.permissions || []).forEach((perm) => {
        if (perm?.key) permissions.add(perm.key);
      });
    });

    req.user = user;
    req.permissions = permissions;
    req.isPlatformAdmin = Boolean(user.isPlatformAdmin);
    req.tenantId = user.tenantId ? String(user.tenantId) : null;
    req.company = null;
    next();
  } catch (error) {
    return fail(res, "Session expired. Please login again.", 401);
  }
}

function requirePermission(...keys) {
  return (req, res, next) => {
    if (!req.permissions) {
      return fail(res, "Forbidden.", 403);
    }

    const isSuper = [...req.permissions].includes("*");
    const allowed = isSuper || keys.some((key) => req.permissions.has(key));

    if (!allowed) {
      return fail(res, "You do not have permission for this action.", 403);
    }

    next();
  };
}

module.exports = { authenticate, authenticateSoft, requirePermission };
