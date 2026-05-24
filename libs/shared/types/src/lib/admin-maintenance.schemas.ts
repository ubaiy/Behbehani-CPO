import { z } from 'zod';
import {
  MaintenanceRequestStatusSchema,
  MaintenanceConcernCategorySchema,
  MaintenancePreferredWindowSchema,
} from './maintenance-request.public.schemas.js';
import { KuwaitGovernorateSchema } from './me-account.schemas.js';

/**
 * v1.5.12a — Admin maintenance-request queue DTOs.
 *
 * Mirrors admin-order.schemas.ts structure.
 * Customer info is joined on the server side (no ownership check).
 * Status transitions are enforced by the service layer state machine.
 */

// ─── Customer summary (embedded in list + detail) ─────────────────────────────

export const AdminMaintenanceCustomerSchema = z.object({
  id:       z.string().uuid(),
  fullName: z.string(),
  mobile:   z.string().nullable(),
  email:    z.string().nullable(),
});
export type AdminMaintenanceCustomer = z.infer<typeof AdminMaintenanceCustomerSchema>;

// ─── Vehicle listing summary (embedded, nullable) ─────────────────────────────

export const AdminMaintenanceVehicleListingSchema = z.object({
  id:          z.string().uuid(),
  stockNumber: z.string(),
}).nullable();
export type AdminMaintenanceVehicleListing = z.infer<typeof AdminMaintenanceVehicleListingSchema>;

// ─── Summary row (list view) ──────────────────────────────────────────────────

export const AdminMaintenanceRequestSummarySchema = z.object({
  id:                z.string(),
  customer:          AdminMaintenanceCustomerSchema,
  vehicleListingId:  z.string().uuid().nullable(),
  vehicleListing:    AdminMaintenanceVehicleListingSchema,
  vehicleFreeText:   z.string().nullable(),
  governorate:       KuwaitGovernorateSchema,
  pickupAddressLine: z.string(),
  preferredWindow:   MaintenancePreferredWindowSchema,
  preferredDate:     z.string(),
  concernCategory:   MaintenanceConcernCategorySchema,
  concernNotes:      z.string(),
  status:            MaintenanceRequestStatusSchema,
  adminNotes:        z.string().nullable(),
  scheduledFor:      z.string().datetime().nullable(),
  cancellationReason: z.string().nullable(),
  createdAt:         z.string().datetime(),
  updatedAt:         z.string().datetime(),
});
export type AdminMaintenanceRequestSummaryDto = z.infer<typeof AdminMaintenanceRequestSummarySchema>;

// ─── Detail view (identical to summary for now) ───────────────────────────────

export const AdminMaintenanceRequestDetailSchema = AdminMaintenanceRequestSummarySchema;
export type AdminMaintenanceRequestDetailDto = AdminMaintenanceRequestSummaryDto;

// ─── List query ───────────────────────────────────────────────────────────────

export const AdminMaintenanceListQuerySchema = z.object({
  status:   MaintenanceRequestStatusSchema.optional(),
  search:   z.string().max(200).optional(),
  page:     z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type AdminMaintenanceListQueryDto = z.infer<typeof AdminMaintenanceListQuerySchema>;

// ─── Status counts (across all rows) ─────────────────────────────────────────

export const MaintenanceStatusCountsSchema = z.object({
  pending_review: z.number().int().nonnegative(),
  scheduled:      z.number().int().nonnegative(),
  in_progress:    z.number().int().nonnegative(),
  completed:      z.number().int().nonnegative(),
  cancelled:      z.number().int().nonnegative(),
});
export type MaintenanceStatusCounts = z.infer<typeof MaintenanceStatusCountsSchema>;

// ─── List response ────────────────────────────────────────────────────────────

export const AdminMaintenanceRequestListResponseSchema = z.object({
  items:        z.array(AdminMaintenanceRequestSummarySchema),
  total:        z.number().int().nonnegative(),
  page:         z.number().int().min(1),
  pageSize:     z.number().int().min(1),
  statusCounts: MaintenanceStatusCountsSchema,
});
export type AdminMaintenanceRequestListResponseDto = z.infer<typeof AdminMaintenanceRequestListResponseSchema>;

// ─── Admin PATCH input — status transition + notes ────────────────────────────

/**
 * Admin status transition rules (enforced by refine + service state machine):
 *
 *   pending_review → { scheduled, cancelled }
 *   scheduled      → { in_progress, cancelled }
 *   in_progress    → { completed, cancelled }
 *   completed      → terminal (service rejects)
 *   cancelled      → terminal (service rejects)
 *
 * Field requirements:
 *   status = 'scheduled'  → scheduledFor (ISO datetime) + adminNotes (≥5 chars) REQUIRED
 *   status = 'cancelled'  → cancellationReason (≥5 chars) REQUIRED
 *   PATCH without status  → only adminNotes updated
 */
export const UpdateMaintenanceRequestStatusInputSchema = z
  .object({
    status:             MaintenanceRequestStatusSchema.optional(),
    scheduledFor:       z.string().datetime().optional().nullable(),
    adminNotes:         z.string().min(0).max(2000).optional().nullable(),
    cancellationReason: z.string().min(5).max(500).optional(),
  })
  .refine(
    (v) =>
      v.status !== 'scheduled' ||
      (v.scheduledFor != null && (v.adminNotes ?? '').length >= 5),
    {
      message: 'scheduled status requires scheduledFor + adminNotes (≥5 chars)',
      path: ['scheduledFor'],
    },
  )
  .refine(
    (v) =>
      v.status !== 'cancelled' ||
      (v.cancellationReason != null && v.cancellationReason.length >= 5),
    {
      message: 'cancelled status requires cancellationReason (≥5 chars)',
      path: ['cancellationReason'],
    },
  );
export type UpdateMaintenanceRequestStatusInput = z.infer<typeof UpdateMaintenanceRequestStatusInputSchema>;

// ─── Error codes ──────────────────────────────────────────────────────────────

export const ADMIN_MAINTENANCE_ERROR_CODES = [
  'MAINTENANCE_REQUEST_NOT_FOUND',
  'MAINTENANCE_INVALID_STATUS_TRANSITION',
] as const;
export type AdminMaintenanceErrorCode = (typeof ADMIN_MAINTENANCE_ERROR_CODES)[number];
