# PharmaCore Multi-Tenant SaaS — Architecture & Migration Plan

## Current state (inspected)

- Single-tenant Mongo app: 14 models, **no** `tenantId` / Company / Branch / Module / Subscription.
- Auth: JWT `{ id, username }` + role→permission RBAC; menus DB-driven and permission-filtered.
- Settings is a **singleton**; AdminLayout brand is hardcoded “PharmaCore”.
- Seed on boot; `resyncMenus` wipes all menus (unsafe once multi-tenant).

## Strategy

**Shared database + `tenantId` on every company-owned document** (not separate DBs).

| Actor | Identity |
|-------|----------|
| Platform Super Admin | `User.isPlatformAdmin = true`, `tenantId = null` |
| Pharmacy users | `tenantId` required; never trust body `tenantId` |

Tenant is resolved from: JWT claim → DB user → company status check.

## Phases

1. **Isolation foundation** — Company model, `tenantId` fields + compound indexes, middleware, migrate existing pharmacy → one company.
2. **Registration + Platform Admin UI** — company signup/approval, platform dashboard.
3. **Branding + modules** — per-company CSS vars, logo, enable/disable modules.
4. **Tenant RBAC** — company-scoped roles/menus; company-aware login context.
5. **Branches** — branch inventory/sales, transfers, consolidated reports.
6. **Subscriptions + tests** — plans/limits scaffolding, cross-tenant automated tests.

## Migration rules (non-negotiable)

- Backup before migrate.
- Do **not** delete existing pharmacy data.
- Create one Company from current Settings; backfill `tenantId` on all records.
- Preserve `admin` as **Company Owner** of that pharmacy.
- Create separate **platform** Super Admin (not the same as pharmacy admin).
- Keep login/POS/inventory APIs working after each phase.

## Index changes (examples)

- `User`: unique `{ tenantId, username }`, `{ tenantId, email }` (sparse for platform admins).
- `Sale`: unique `{ tenantId, receiptNumber }`.
- `Purchase`: unique `{ tenantId, purchaseNumber }`.
- `Category`: unique `{ tenantId, name }`.
- `Role`: unique `{ tenantId, name }` (platform permissions catalog may stay global).
