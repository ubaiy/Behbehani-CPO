/**
 * MeSellBookingsApiClient — authenticated customer sell-concierge bookings.
 *
 * Task v0.22.b / STATUS.md API row: `/v1/public/sell-bookings (3 endpoints)`.
 *
 * Endpoints:
 *   GET  /v1/public/me/sell-bookings?page=&pageSize=          — list (paginated)
 *   GET  /v1/public/me/sell-bookings/:bookingRef               — detail by human-readable ref
 *   PATCH /v1/public/me/sell-bookings/:bookingRef              — reschedule (if B supports it)
 *   POST  /v1/public/me/sell-bookings/:bookingRef/cancel       — cancel (B v1.5.14)
 *
 * NOTE — PATCH endpoint: Per STATUS.md the 3 exposed endpoints are list / getByRef
 * / create (POST handled elsewhere by sell.tsx). PATCH for reschedule is ASSUMED
 * here pending B confirmation. See [ASK C→B] in task report.
 *
 * Zod-parsed at boundary — same pattern as MeInspectionsApiClient (Task v0.16).
 * MUST use the intercepted httpClient (auth + 401-refresh).
 */

import type { AxiosInstance, AxiosError } from 'axios';
import {
  CustomerInspectionListResponseSchema,
  ConciergeBookingStatusSchema,
  CustomerPreferenceSchema,
  type CustomerInspectionListResponse,
  type ConciergeBookingStatus,
} from '@behbehani-cpo/shared-types';
import { z } from 'zod';

// ─── Typed cancel errors ──────────────────────────────────────────────────────

export class CancelBookingNotFoundError extends Error {
  constructor() { super('BOOKING_NOT_FOUND'); this.name = 'CancelBookingNotFoundError'; }
}
export class CancelBookingNotCancellableError extends Error {
  constructor() { super('BOOKING_NOT_CANCELLABLE'); this.name = 'CancelBookingNotCancellableError'; }
}
export class CancelBookingValidationError extends Error {
  constructor(public readonly details: unknown) {
    super('VALIDATION_ERROR');
    this.name = 'CancelBookingValidationError';
  }
}

// ─── Reschedule DTO (sent to PATCH) ──────────────────────────────────────────
// Re-uses the CustomerPreference schema; if B's PATCH accepts a different shape,
// update this schema to match.
export const RescheduleBookingDtoSchema = CustomerPreferenceSchema;
export type RescheduleBookingDto = z.infer<typeof RescheduleBookingDtoSchema>;

// ─── Client ──────────────────────────────────────────────────────────────────

export class MeSellBookingsApiClient {
  /**
   * @param axios Intercepted AxiosInstance (httpClient). Auth header + 401-refresh
   *              are handled transparently by the request/response interceptors.
   */
  constructor(private readonly axios: AxiosInstance) {}

  /**
   * Lists the authenticated customer's sell-concierge bookings (paginated, newest first).
   * GET /v1/public/me/sell-bookings?page=&pageSize=
   *
   * Returns the same CustomerInspectionListResponse shape as me/inspections —
   * both expose CustomerInspectionView rows (same DTO surface).
   */
  async list(
    params: { page?: number; pageSize?: number } = {},
  ): Promise<CustomerInspectionListResponse> {
    const res = await this.axios.get<unknown>('/v1/public/me/sell-bookings', {
      params: {
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 20,
      },
    });
    return CustomerInspectionListResponseSchema.parse(res.data);
  }

  /**
   * Fetches a single booking by human-readable bookingRef (e.g. "BMC-CON-001234").
   * GET /v1/public/me/sell-bookings/:bookingRef
   *
   * Returns the slim ConciergeBookingStatus DTO used by the tracker page.
   * Per A's v1.5-D5 lesson: reportLink is null until B surfaces the inspection
   * report ID — this is defensive by design and callers must handle null.
   */
  async getByRef(bookingRef: string): Promise<ConciergeBookingStatus> {
    const res = await this.axios.get<unknown>(
      `/v1/public/me/sell-bookings/${encodeURIComponent(bookingRef)}`,
    );
    return ConciergeBookingStatusSchema.parse(res.data);
  }

  /**
   * Reschedules a booking by updating the customer preference slot.
   * PATCH /v1/public/me/sell-bookings/:bookingRef
   *
   * [ASK C→B]: Confirm B exposes PATCH on this resource and that the body
   * matches CustomerPreference { preferredDate, window }. If not available,
   * disable the Reschedule action in RescheduleModal and add a TODO note.
   *
   * Returns updated ConciergeBookingStatus on success.
   */
  async reschedule(
    bookingRef: string,
    dto: RescheduleBookingDto,
  ): Promise<ConciergeBookingStatus> {
    const validated = RescheduleBookingDtoSchema.parse(dto);
    const res = await this.axios.patch<unknown>(
      `/v1/public/me/sell-bookings/${encodeURIComponent(bookingRef)}`,
      validated,
    );
    return ConciergeBookingStatusSchema.parse(res.data);
  }

  /**
   * Cancels a booking.
   * POST /v1/public/me/sell-bookings/:bookingRef/cancel  (B v1.5.14)
   *
   * Idempotent — re-cancelling a booking in 'draft' that is already cancelled
   * returns the same ConciergeBookingStatus with 200.
   *
   * Errors:
   *   404 → BOOKING_NOT_FOUND       → throws CancelBookingNotFoundError
   *   409 → BOOKING_NOT_CANCELLABLE → throws CancelBookingNotCancellableError
   *   422 → VALIDATION_ERROR        → throws CancelBookingValidationError
   *
   * Callers should invalidate ['sell-bookings'] cache keys after success.
   */
  async cancel(bookingRef: string, body?: { reason?: string }): Promise<ConciergeBookingStatus> {
    // Idempotency-Key: use globalThis.crypto if available (React Native >= 0.73 / Hermes),
    // otherwise fall back to a timestamp+random string that is unique enough for retries.
    const idempotencyKey: string =
      typeof globalThis.crypto?.randomUUID === 'function'
        ? globalThis.crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    try {
      const res = await this.axios.post<unknown>(
        `/v1/public/me/sell-bookings/${encodeURIComponent(bookingRef)}/cancel`,
        body ?? {},
        { headers: { 'Idempotency-Key': idempotencyKey } },
      );
      return ConciergeBookingStatusSchema.parse(res.data);
    } catch (err) {
      const axiosErr = err as AxiosError<{ code?: string; details?: unknown }>;
      const status = axiosErr.response?.status;
      const code = axiosErr.response?.data?.code;
      if (status === 404 || code === 'BOOKING_NOT_FOUND') throw new CancelBookingNotFoundError();
      if (status === 409 || code === 'BOOKING_NOT_CANCELLABLE') throw new CancelBookingNotCancellableError();
      if (status === 422 || code === 'VALIDATION_ERROR') throw new CancelBookingValidationError(axiosErr.response?.data?.details);
      throw err;
    }
  }
}
