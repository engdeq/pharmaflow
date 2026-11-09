# MedAxis — Multi-Tenant SaaS Architecture

Product: **MedAxis**  
Platform app: **MedAxis Control Center** (`/platform`)  
Main URL: **https://medaxis.dirshay.com**

## Separation rule

| Environment | Who | UI | Data |
|-------------|-----|----|------|
| Platform Control Center | Platform Super Admin / platform staff | `PlatformLayout` + MedAxis branding | Cross-tenant ops only via `/api/platform/*` |
| Pharmacy Admin | Company users | `AdminLayout` + company branding | Strict `tenantId` isolation |

Never mix platform sidebar with pharmacy sidebar.

## Tenant resolution (server)

Priority order (never trust body `tenantId`):

1. Authenticated JWT → `user.tenantId` / `isPlatformAdmin`
2. Hostname → `CompanyDomain` / `Company.slug` (e.g. `shafi.medaxis.dirshay.com`)
3. Dev path → `/t/:slug/...` (localhost)

## Domains

- Platform: `medaxis.dirshay.com/platform`
- Pharmacy (prod target): `{slug}.medaxis.dirshay.com`
- Dev: `localhost:5173/platform` and `localhost:5173/t/{slug}/dashboard`

Wildcard DNS + SSL for `*.medaxis.dirshay.com` are required before claiming live subdomains.

## Progressive delivery

1. HTTPS main domain + MedAxis Control Center shell (this slice)
2. Domain management + hostname resolution
3. Global menu catalog + tenant menu derivation
4. Module / plan assignment
5. Platform RBAC vs Tenant RBAC catalogs
6. Isolation automated tests
