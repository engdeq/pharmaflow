const BASE_DOMAIN = "medaxis.dirshay.com";

/** Detect pharmacy slug from subdomain or /t/:slug path. */
export function detectTenantSlug(pathname = window.location.pathname) {
  const host = window.location.hostname.toLowerCase();

  if (host !== "localhost" && host !== "127.0.0.1" && host.endsWith(`.${BASE_DOMAIN}`)) {
    const slug = host.slice(0, -(BASE_DOMAIN.length + 1));
    if (slug && !slug.includes(".")) return slug;
  }

  const pathMatch = String(pathname || "").match(/^\/t\/([a-z0-9-]+)(?:\/|$)/i);
  if (pathMatch) return pathMatch[1].toLowerCase();

  return null;
}

export function isPlatformHost() {
  const host = window.location.hostname.toLowerCase();
  return (
    host === BASE_DOMAIN ||
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "www.medaxis.dirshay.com"
  );
}

/** Prefer live HTTPS path link (works now). Subdomain when DNS/SSL ready. */
export function pharmacyLiveUrl(slug, { preferSubdomain = false } = {}) {
  const clean = String(slug || "")
    .trim()
    .toLowerCase();
  if (!clean) return `https://${BASE_DOMAIN}`;
  if (preferSubdomain) return `https://${clean}.${BASE_DOMAIN}`;
  return `https://${BASE_DOMAIN}/t/${clean}`;
}

export function pharmacySubdomainUrl(slug) {
  return pharmacyLiveUrl(slug, { preferSubdomain: true });
}

export { BASE_DOMAIN };
