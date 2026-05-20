import type { AdminRole } from '@behbehani-cpo/shared-types';

/**
 * Named admin-role groups shared across controllers.
 *
 * `super_admin` is implicit via `requireAdminRole`'s middleware bypass — DO NOT
 * include it in any group below. Listing it is a no-op at runtime but spreads
 * the convention thin and makes future audits noisier.
 *
 * When a new role lands in the `AdminRole` enum (`libs/shared/types/src/lib/
 * roles.ts`), update the relevant groups here in a single place rather than
 * hunting through controllers.
 */

// ─── Listings ────────────────────────────────────────────────────────────────

/** Read access to /v1/admin/listings — most staff need to browse inventory. */
export const LISTINGS_READ_ROLES: readonly AdminRole[] = [
  'operations_manager',
  'sales_agent',
  'inspection_officer',
  'finance_officer',
  'content_editor',
  'general_manager',
  'technical_support',
  'customer_support',
];

/** Write access to /v1/admin/listings — tightened to those who actually edit. */
export const LISTINGS_WRITE_ROLES: readonly AdminRole[] = [
  'operations_manager',
  'sales_agent',
  'content_editor',
  'general_manager',
];

// ─── Media (nested under listings) ───────────────────────────────────────────

/** Read + upload media for a listing. */
export const MEDIA_VIEW_ROLES: readonly AdminRole[] = [
  'operations_manager',
  'sales_agent',
  'content_editor',
  'general_manager',
];

/** Manage media (delete, set-primary). Excludes sales_agent. */
export const MEDIA_MANAGE_ROLES: readonly AdminRole[] = [
  'operations_manager',
  'content_editor',
  'general_manager',
];

// ─── Pricing tiers ───────────────────────────────────────────────────────────

/**
 * Read access to pricing tiers. `pricing_manager` needs READ to see the tiers
 * they edit (without it, the list view 403s and the page looks broken).
 */
export const PRICING_READ_ROLES: readonly AdminRole[] = [
  'general_manager',
  'operations_manager',
  'finance_officer',
  'pricing_manager',
];

/** Write access to pricing tiers. */
export const PRICING_WRITE_ROLES: readonly AdminRole[] = [
  'finance_officer',
  'pricing_manager',
];

// ─── Aging engine ────────────────────────────────────────────────────────────

/** Read engine status, runs, distribution, active discounts. */
export const AGING_READ_ROLES: readonly AdminRole[] = [
  'general_manager',
  'operations_manager',
  'finance_officer',
];

/**
 * Trigger run-now / pause. Mirrors pricing write because aging engine and
 * pricing tiers are coupled — whoever authors tiers should be able to drive
 * the engine.
 */
export const AGING_WRITE_ROLES: readonly AdminRole[] = [
  'finance_officer',
  'pricing_manager',
];

// ─── Dashboard ───────────────────────────────────────────────────────────────

/**
 * Read access to /v1/admin/dashboard/kpis. Role-conditional field projection
 * is handled in dashboard.service (some roles get a slimmer DTO).
 *
 * Includes `delivery_dispatcher` and `maintenance_coordinator` so they can see
 * the pipeline at-a-glance bar, even though they don't yet have read access on
 * individual listings (carry-over to reconcile when those modules ship).
 */
export const DASHBOARD_READ_ROLES: readonly AdminRole[] = [
  'general_manager',
  'operations_manager',
  'sales_agent',
  'inspection_officer',
  'finance_officer',
  'customer_support',
  'content_editor',
  'technical_support',
  'delivery_dispatcher',
  'maintenance_coordinator',
  'pricing_manager',
];

// ─── Audit log ───────────────────────────────────────────────────────────────

/** Read access to /v1/admin/audit-log — tight by design. */
export const AUDIT_LOG_READ_ROLES: readonly AdminRole[] = ['general_manager'];

// ─── Admin users management ──────────────────────────────────────────────────

/** Read access to /v1/admin/users — list/get only. */
export const ADMIN_USERS_READ_ROLES: readonly AdminRole[] = ['general_manager'];

// ─── Catalog (brands / models / trims / body types) ─────────────────────────

/**
 * Read access to /v1/admin/catalog/* — anyone who can browse listings can see
 * the catalog (they need it for dropdowns and reference). Mirrors LISTINGS_READ.
 */
export const CATALOG_READ_ROLES: readonly AdminRole[] = [
  'operations_manager',
  'sales_agent',
  'inspection_officer',
  'finance_officer',
  'content_editor',
  'general_manager',
  'technical_support',
  'customer_support',
];

/**
 * Write access to /v1/admin/catalog/* — tight. content_editor owns the brand
 * catalog; general_manager covers cross-team admin work.
 */
export const CATALOG_WRITE_ROLES: readonly AdminRole[] = [
  'content_editor',
  'general_manager',
];

// Note: admin-users WRITE routes (create / update / lifecycle / roles / reset)
// are super_admin-only — call those routes with `requireAdminRole('super_admin')`
// directly. There is intentionally no `ADMIN_USERS_WRITE_ROLES` symbol: spreading
// an empty group through the middleware would short-circuit to "any admin" and
// silently grant write access to every staff member.
