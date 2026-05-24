import { z } from 'zod';

/**
 * v1.5.29 — Test Drive Booking DTOs.
 *
 * Public surface: POST /v1/public/test-drive-bookings (anonymous, rate-limited, idempotency-keyed)
 * Admin surface:  GET/PATCH /v1/admin/test-drive-bookings, POST /v1/admin/test-drive-bookings/:id/assign
 */

// ─── Enum schemas ─────────────────────────────────────────────────────────────

export const TestDriveWindowSchema = z.enum(['morning', 'afternoon', 'evening']);
export type TestDriveWindow = z.infer<typeof TestDriveWindowSchema>;

export const TestDriveLocationSchema = z.enum(['showroom', 'customer_address']);
export type TestDriveLocation = z.infer<typeof TestDriveLocationSchema>;

export const TestDriveStatusSchema = z.enum([
  'requested',
  'scheduled',
  'confirmed',
  'completed',
  'no_show',
  'cancelled',
]);
export type TestDriveStatus = z.infer<typeof TestDriveStatusSchema>;

// ─── Embedded sub-schemas ─────────────────────────────────────────────────────

export const TestDriveAssignedUserSchema = z.object({
  id:       z.string().uuid(),
  fullName: z.string(),
  email:    z.string().nullable(),
}).nullable();
export type TestDriveAssignedUser = z.infer<typeof TestDriveAssignedUserSchema>;

export const TestDriveListingSchema = z.object({
  id:          z.string().uuid(),
  stockNumber: z.string(),
  titleEn:     z.string(),
}).nullable();
export type TestDriveListing = z.infer<typeof TestDriveListingSchema>;

// ─── Full admin DTO ───────────────────────────────────────────────────────────

export const TestDriveBookingDtoSchema = z.object({
  id:              z.string().uuid(),
  listing:         TestDriveListingSchema,
  customerName:    z.string(),
  customerPhone:   z.string(),
  customerEmail:   z.string().nullable(),
  preferredDate:   z.string(),
  preferredWindow: TestDriveWindowSchema,
  location:        TestDriveLocationSchema,
  addressLine:     z.string().nullable(),
  customerNotes:   z.string().nullable(),
  status:          TestDriveStatusSchema,
  scheduledAt:     z.string().datetime().nullable(),
  completedAt:     z.string().datetime().nullable(),
  adminNotes:      z.string().nullable(),
  assignedTo:      TestDriveAssignedUserSchema,
  idempotencyKey:  z.string().nullable(),
  createdAt:       z.string().datetime(),
  updatedAt:       z.string().datetime(),
});
export type TestDriveBookingDto = z.infer<typeof TestDriveBookingDtoSchema>;

// ─── List filter ──────────────────────────────────────────────────────────────

export const TestDriveBookingListFilterSchema = z.object({
  status:   TestDriveStatusSchema.optional(),
  search:   z.string().max(200).optional(),
  page:     z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type TestDriveBookingListFilter = z.infer<typeof TestDriveBookingListFilterSchema>;

// ─── Status counts ────────────────────────────────────────────────────────────

export const TestDriveStatusCountsSchema = z.object({
  requested: z.number().int().nonnegative(),
  scheduled: z.number().int().nonnegative(),
  confirmed: z.number().int().nonnegative(),
  completed: z.number().int().nonnegative(),
  no_show:   z.number().int().nonnegative(),
  cancelled: z.number().int().nonnegative(),
});
export type TestDriveStatusCounts = z.infer<typeof TestDriveStatusCountsSchema>;

// ─── List response ────────────────────────────────────────────────────────────

export const TestDriveBookingListResponseSchema = z.object({
  items:        z.array(TestDriveBookingDtoSchema),
  total:        z.number().int().nonnegative(),
  page:         z.number().int().min(1),
  pageSize:     z.number().int().min(1),
  statusCounts: TestDriveStatusCountsSchema,
});
export type TestDriveBookingListResponse = z.infer<typeof TestDriveBookingListResponseSchema>;

// ─── Public create input ──────────────────────────────────────────────────────

/**
 * POST /v1/public/test-drive-bookings — anonymous test drive booking.
 * Idempotency-Key header handled at controller level.
 */
export const CreateTestDriveBookingPublicInputSchema = z
  .object({
    customerName: z.string().trim().min(2).max(120),
    customerPhone: z
      .string()
      .trim()
      .regex(/^\+?[0-9\s\-().]{7,20}$/, 'Invalid phone number')
      .max(20),
    customerEmail:   z.string().trim().email().max(255).optional(),
    preferredDate:   z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format'),
    preferredWindow: TestDriveWindowSchema,
    location:        TestDriveLocationSchema,
    addressLine:     z.string().trim().max(500).optional(),
    customerNotes:   z.string().trim().max(1000).optional(),
    listingId:       z.string().uuid().optional(),
  })
  .refine(
    (data) => {
      // preferredDate must be >= tomorrow UTC
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
      const preferred = new Date(data.preferredDate + 'T00:00:00Z');
      return preferred >= tomorrow;
    },
    { message: 'Preferred date must be at least tomorrow', path: ['preferredDate'] },
  )
  .refine(
    (data) => {
      if (data.location === 'customer_address') {
        return !!data.addressLine && data.addressLine.trim().length > 0;
      }
      return true;
    },
    { message: 'Address is required when location is customer_address', path: ['addressLine'] },
  );
export type CreateTestDriveBookingPublicInput = z.infer<
  typeof CreateTestDriveBookingPublicInputSchema
>;

// ─── Admin PATCH input ────────────────────────────────────────────────────────

/**
 * State machine:
 *   requested → scheduled, cancelled
 *   scheduled → confirmed, cancelled
 *   confirmed → completed, no_show, cancelled
 *   completed, no_show, cancelled → (terminal)
 *
 * scheduledAt is REQUIRED when transitioning to 'scheduled'.
 */
export const UpdateTestDriveBookingInputSchema = z
  .object({
    status:      TestDriveStatusSchema.optional(),
    scheduledAt: z.string().datetime().optional().nullable(),
    adminNotes:  z.string().max(100000).optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.status === 'scheduled') {
        return !!data.scheduledAt;
      }
      return true;
    },
    { message: 'scheduledAt is required when transitioning to scheduled', path: ['scheduledAt'] },
  );
export type UpdateTestDriveBookingInput = z.infer<typeof UpdateTestDriveBookingInputSchema>;

// ─── Admin assign input ───────────────────────────────────────────────────────

export const AssignTestDriveBookingInputSchema = z.object({
  userId: z.string().uuid(),
});
export type AssignTestDriveBookingInput = z.infer<typeof AssignTestDriveBookingInputSchema>;

// ─── Error codes ──────────────────────────────────────────────────────────────

export const TEST_DRIVE_ERROR_CODES = [
  'TEST_DRIVE_NOT_FOUND',
  'TEST_DRIVE_INVALID_STATUS_TRANSITION',
  'TEST_DRIVE_ASSIGNEE_NOT_FOUND',
  'TEST_DRIVE_IDEMPOTENCY_CONFLICT',
] as const;
export type TestDriveErrorCode = (typeof TEST_DRIVE_ERROR_CODES)[number];

// ─── Public create response ───────────────────────────────────────────────────

export const CreateTestDriveBookingPublicResponseSchema = z.object({
  id:        z.string().uuid(),
  status:    TestDriveStatusSchema,
  createdAt: z.string().datetime(),
});
export type CreateTestDriveBookingPublicResponse = z.infer<
  typeof CreateTestDriveBookingPublicResponseSchema
>;
