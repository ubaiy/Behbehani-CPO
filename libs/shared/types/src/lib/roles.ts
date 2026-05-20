/**
 * Roles shared between API and frontends.
 * Plan reference: SRS FR-ADM-002 enumerates 12 admin sub-roles.
 */

export const USER_ROLES = ['customer', 'dealer', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const ADMIN_ROLES = [
  'super_admin',
  'general_manager',
  'operations_manager',
  'sales_agent',
  'inspection_officer',
  'auction_operator',
  'delivery_dispatcher',
  'maintenance_coordinator',
  'finance_officer',
  'pricing_manager',
  'customer_support',
  'content_editor',
  'technical_support',
] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export const ADMIN_ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: 'Super Admin',
  general_manager: 'General Manager',
  operations_manager: 'Operations Manager',
  sales_agent: 'Sales Agent',
  inspection_officer: 'Inspection Officer',
  auction_operator: 'Auction Operator',
  delivery_dispatcher: 'Delivery Dispatcher',
  maintenance_coordinator: 'Maintenance Coordinator',
  finance_officer: 'Finance Officer',
  pricing_manager: 'Pricing Manager',
  customer_support: 'Customer Support',
  content_editor: 'Content Editor',
  technical_support: 'Technical Support',
};
