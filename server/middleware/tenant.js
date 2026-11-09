const Company = require("../models/Company");
const { fail } = require("../utils/response");

/**
 * Never trust tenantId from the client body.
 * Resolve from authenticated user + company status.
 */
async function resolveTenant(req, res, next) {
  try {
    if (!req.user) return fail(res, "Authentication required.", 401);

    req.isPlatformAdmin = Boolean(req.user.isPlatformAdmin);
    req.tenantId = req.user.tenantId ? String(req.user.tenantId) : null;
    req.company = null;
    req.branchIds = (req.user.branchIds || []).map((id) => String(id));

    // Host/path hint for auditing & future subdomain routing (never trusts body tenantId)
    try {
      const { resolveTenantFromRequest } = require("../services/tenantResolver");
      req.hostTenant = await resolveTenantFromRequest(req);
    } catch {
      req.hostTenant = null;
    }

    if (req.isPlatformAdmin) {
      return next();
    }

    if (!req.tenantId) {
      return fail(res, "No company assigned to this account.", 403);
    }

    const company = await Company.findById(req.tenantId).lean();
    if (!company) {
      return fail(res, "Company not found.", 403);
    }
    if (company.status === "suspended") {
      return fail(res, "Company account is suspended. Contact support.", 403);
    }
    if (company.status === "pending") {
      return fail(res, "Company registration is pending approval.", 403);
    }
    if (company.status !== "active") {
      return fail(res, "Company is not active.", 403);
    }

    req.company = company;
    return next();
  } catch (error) {
    return fail(res, "Failed to resolve company context.", 500);
  }
}

function requirePlatformAdmin(req, res, next) {
  if (!req.isPlatformAdmin) {
    return fail(res, "Platform administrator access required.", 403);
  }
  return next();
}

function requireTenant(req, res, next) {
  if (req.isPlatformAdmin) {
    return fail(res, "Platform admins cannot access pharmacy tenant APIs directly.", 403);
  }
  if (!req.tenantId) {
    return fail(res, "Tenant context required.", 403);
  }
  return next();
}

/** Build a Mongo filter locked to the authenticated tenant. */
function tenantFilter(req, extra = {}) {
  if (!req.tenantId) {
    const err = new Error("Tenant context required.");
    err.statusCode = 403;
    throw err;
  }
  return { tenantId: req.tenantId, ...extra };
}

/** Strip any client-supplied tenant fields from payloads. */
function sanitizeTenantPayload(body = {}) {
  const clean = { ...body };
  delete clean.tenantId;
  delete clean.companyId;
  delete clean.isPlatformAdmin;
  return clean;
}

module.exports = {
  resolveTenant,
  requirePlatformAdmin,
  requireTenant,
  tenantFilter,
  sanitizeTenantPayload,
};
