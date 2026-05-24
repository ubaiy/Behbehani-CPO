import { z } from 'zod';
import { KuwaitGovernorateSchema } from './me-account.schemas.js';

/**
 * Maintenance pickup request — public DTOs.
 *
 * v1.5.7 — customer maintenance pickup capture for /v1/public/me/maintenance-requests.
 *
 * KuwaitGovernorateSchema is re-exported from me-account.schemas (6 KW values).
 * PreferredWindow values (morning/afternoon/evening) are re-used via
 * MaintenancePreferredWindowSchema defined here to keep this module self-contained
 * for mobile consumers.
 *
 * Service + controller live in apps/api/src/maintenance-requests/.
 */

// ─── Enum schemas ─────────────────────────────────────────────────────────────

/**
 * Preferred time window — mirrors the PreferredWindow Prisma enum used by the
 * InspectionReport model. Same 3 values; named separately for mobile API clarity.
 */
export const MaintenancePreferredWindowSchema = z.enum([
  'morning',
  'afternoon',
  'evening',
]);
export type MaintenancePreferredWindow = z.infer<typeof MaintenancePreferredWindowSchema>;

export const MaintenanceConcernCategorySchema = z.enum([
  'oil_change',
  'brakes',
  'tires',
  'electrical',
  'engine',
  'other',
]);
export type MaintenanceConcernCategory = z.infer<typeof MaintenanceConcernCategorySchema>;

export const MaintenanceRequestStatusSchema = z.enum([
  'pending_review',
  'scheduled',
  'in_progress',
  'completed',
  'cancelled',
]);
export type MaintenanceRequestStatus = z.infer<typeof MaintenanceRequestStatusSchema>;

// NOTE: KuwaitGovernorateSchema is also exported from me-account.schemas (via barrel).
// Mobile consumers can import it from '@behbehani-cpo/shared-types' directly.

// ─── DTO ──────────────────────────────────────────────────────────────────────

export const MaintenanceRequestDtoSchema = z.object({
  id:               z.string(),
  customerId:       z.string().uuid(),
  vehicleListingId: z.string().uuid().nullable(),
  vehicleFreeText:  z.string().nullable(),
  governorate:      KuwaitGovernorateSchema,
  pickupAddressLine: z.string(),
  preferredWindow:  MaintenancePreferredWindowSchema,
  preferredDate:    z.string(), // ISO-8601 date string (no time component)
  concernCategory:  MaintenanceConcernCategorySchema,
  concernNotes:     z.string(),
  status:           MaintenanceRequestStatusSchema,
  adminNotes:       z.string().nullable(),
  scheduledFor:     z.string().datetime().nullable(),
  createdAt:        z.string().datetime(),
  updatedAt:        z.string().datetime(),
});
export type MaintenanceRequestDto = z.infer<typeof MaintenanceRequestDtoSchema>;

// ─── Paginated list response ──────────────────────────────────────────────────

export const MaintenanceRequestListResponseSchema = z.object({
  items:    z.array(MaintenanceRequestDtoSchema),
  total:    z.number().int().min(0),
  page:     z.number().int().min(1),
  pageSize: z.number().int().min(1),
});
export type MaintenanceRequestListResponse = z.infer<typeof MaintenanceRequestListResponseSchema>;

// ─── Create input ─────────────────────────────────────────────────────────────

export const CreateMaintenanceRequestInputSchema = z
  .object({
    vehicleListingId:  z.string().uuid().nullable().optional(),
    vehicleFreeText:   z.string().min(1).max(200).nullable().optional(),
    governorate:       KuwaitGovernorateSchema,
    pickupAddressLine: z.string().min(1).max(200),
    preferredWindow:   MaintenancePreferredWindowSchema,
    preferredDate:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'preferredDate must be YYYY-MM-DD'),
    concernCategory:   MaintenanceConcernCategorySchema,
    concernNotes:      z.string().min(1).max(500),
  })
  .refine(
    (d) => d.vehicleListingId != null || (d.vehicleFreeText != null && d.vehicleFreeText.trim().length > 0),
    {
      message: 'Either vehicleListingId or vehicleFreeText must be provided',
      path:    ['vehicleListingId'],
    },
  );
export type CreateMaintenanceRequestInput = z.infer<typeof CreateMaintenanceRequestInputSchema>;

// ─── Update input (customer-editable fields only) ─────────────────────────────

export const UpdateMaintenanceRequestInputSchema = z
  .object({
    pickupAddressLine: z.string().min(1).max(200).optional(),
    preferredWindow:   MaintenancePreferredWindowSchema.optional(),
    preferredDate:     z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'preferredDate must be YYYY-MM-DD')
      .optional(),
    concernCategory:   MaintenanceConcernCategorySchema.optional(),
    concernNotes:      z.string().min(1).max(500).optional(),
  })
  .refine(
    (d) => Object.values(d).some((v) => v !== undefined),
    { message: 'At least one field must be provided for update' },
  );
export type UpdateMaintenanceRequestInput = z.infer<typeof UpdateMaintenanceRequestInputSchema>;

// ─── Error codes ──────────────────────────────────────────────────────────────

export const MAINTENANCE_REQUEST_ERROR_CODES = [
  'MAINTENANCE_REQUEST_NOT_FOUND',
  'MAINTENANCE_REQUEST_NOT_CANCELLABLE',
  'MAINTENANCE_REQUEST_NOT_EDITABLE',
] as const;
export type MaintenanceRequestErrorCode = (typeof MAINTENANCE_REQUEST_ERROR_CODES)[number];
