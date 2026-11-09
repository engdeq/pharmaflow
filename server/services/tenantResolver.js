const Company = require("../models/Company");

const PLATFORM_HOSTS = new Set(
  String(process.env.PLATFORM_HOSTS || "medaxis.dirshay.com,localhost,127.0.0.1")
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean)
);

const BASE_DOMAIN = String(process.env.MEDAXIS_BASE_DOMAIN || "medaxis.dirshay.com").toLowerCase();

/**
 * Resolve tenant context from hostname / path.
 * Never trusts client-supplied tenantId.
 */
async function resolveTenantFromRequest(req) {
  const hostHeader = String(req.headers["x-tenant-host"] || req.headers.host || "")
    .split(":")[0]
    .toLowerCase();

  const path = String(req.originalUrl || req.url || "");
  const pathSlugMatch = path.match(/\/t\/([a-z0-9-]+)(?:\/|$)/i);
  if (pathSlugMatch) {
    const company = await Company.findOne({ slug: pathSlugMatch[1].toLowerCase() }).lean();
    if (company) {
      return {
        mode: "path",
        host: hostHeader,
        slug: company.slug,
        tenantId: String(company._id),
        company,
        isPlatformHost: false,
      };
    }
  }

  if (!hostHeader || PLATFORM_HOSTS.has(hostHeader)) {
    return {
      mode: "platform",
      host: hostHeader,
      slug: null,
      tenantId: null,
      company: null,
      isPlatformHost: true,
    };
  }

  // shafi.medaxis.dirshay.com → slug = shafi
  if (hostHeader.endsWith(`.${BASE_DOMAIN}`)) {
    const slug = hostHeader.slice(0, -(BASE_DOMAIN.length + 1));
    if (slug && !slug.includes(".")) {
      const company = await Company.findOne({ slug }).lean();
      if (company) {
        return {
          mode: "subdomain",
          host: hostHeader,
          slug: company.slug,
          tenantId: String(company._id),
          company,
          isPlatformHost: false,
        };
      }
    }
  }

  // Custom domain (future): CompanyDomain collection
  try {
    const CompanyDomain = require("../models/CompanyDomain");
    const domain = await CompanyDomain.findOne({
      hostname: hostHeader,
      status: "active",
    }).lean();
    if (domain?.companyId) {
      const company = await Company.findById(domain.companyId).lean();
      if (company) {
        return {
          mode: "custom_domain",
          host: hostHeader,
          slug: company.slug,
          tenantId: String(company._id),
          company,
          isPlatformHost: false,
        };
      }
    }
  } catch {
    /* model may not exist yet during early boot */
  }

  return {
    mode: "unknown",
    host: hostHeader,
    slug: null,
    tenantId: null,
    company: null,
    isPlatformHost: false,
  };
}

module.exports = {
  resolveTenantFromRequest,
  PLATFORM_HOSTS,
  BASE_DOMAIN,
};
