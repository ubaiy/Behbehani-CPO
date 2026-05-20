import type { AdminRole } from '@behbehani-cpo/shared-types';

/**
 * Capability matrix shown on the user-edit Roles tab. Each row tells the admin
 * which features the selected role set unlocks. Pure data — no Angular wiring —
 * extracted from user-edit.component.ts to keep that file under the 500-line cap.
 *
 * NOTE: keep these `check` predicates in lockstep with the backend's
 * `requireAdminRole` calls + role groups in `apps/api/src/auth/role-groups.ts`.
 */
export interface Capability {
  label: string;
  detail: string;
  /** Returns true when the role set grants this capability. */
  check: (roles: Set<AdminRole>) => boolean;
}

export const CAPABILITIES: Capability[] = [
  {
    label: 'View listings',
    detail: '',
    check: () => true,
  },
  {
    label: 'Edit listings (stage, description, media)',
    detail: '',
    check: (r) =>
      r.has('super_admin') ||
      r.has('operations_manager') ||
      r.has('general_manager') ||
      r.has('sales_agent') ||
      r.has('content_editor'),
  },
  {
    label: 'Run aging engine',
    detail: 'needs finance_officer or super_admin',
    check: (r) => r.has('super_admin') || r.has('finance_officer'),
  },
  {
    label: 'Access pricing rules',
    detail: 'needs finance_officer or pricing_manager',
    check: (r) =>
      r.has('super_admin') ||
      r.has('finance_officer') ||
      r.has('pricing_manager'),
  },
  {
    label: 'View customer audit log',
    detail: 'needs general_manager or super_admin',
    check: (r) => r.has('super_admin') || r.has('general_manager'),
  },
  {
    label: 'Manage admin users',
    detail: 'needs super_admin',
    check: (r) => r.has('super_admin'),
  },
];
