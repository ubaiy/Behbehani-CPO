import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';
import { API_CONFIG } from '@behbehani-cpo/data-access';
import type {
  ConciergeBookingStatus,
  CreateConciergeInspectionDto,
  CreateConciergeInspectionResponse,
} from '@behbehani-cpo/shared-types';

/**
 * Result of POST /v1/public/concierge/inspections from the storefront's
 * perspective. We surface the API's response on success, a `pending` state
 * for genuine network unavailability (browser offline / API host
 * unreachable), and `error` for everything else. Per
 * CONCIERGE_INSPECTION_API_CONTRACT.md v0.8 the endpoint is live, so 404/501
 * are now treated as real errors (previously masked as `pending`).
 */
export type BookConciergeResult =
  | { kind: 'ok'; data: CreateConciergeInspectionResponse }
  | { kind: 'pending'; message: string }
  | { kind: 'error'; status: number; message: string };

/**
 * Result of GET /v1/public/concierge/inspections/:bookingRef from the
 * customer-facing tracker page. `not_found` covers both unknown refs and
 * CPO rows (the service strips those server-side). `network_error` is the
 * browser-offline / API-unreachable case.
 */
export type GetBookingStatusResult =
  | { kind: 'ok'; data: ConciergeBookingStatus }
  | { kind: 'not_found' }
  | { kind: 'network_error' }
  | { kind: 'error'; status: number; message: string };

@Injectable({ providedIn: 'root' })
export class SellBookingsService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(API_CONFIG);

  private get bookingUrl(): string {
    return `${this.config.baseUrl}/public/concierge/inspections`;
  }

  /**
   * Fetch the public-safe Concierge booking-status snapshot. Used by the
   * `/sell/concierge/status/:bookingRef` tracker page, which polls this every
   * 30 seconds while the booking is still in flight.
   */
  getStatus$(bookingRef: string): Observable<GetBookingStatusResult> {
    const url = `${this.bookingUrl}/${encodeURIComponent(bookingRef)}`;
    return this.http.get<ConciergeBookingStatus>(url).pipe(
      map((data) => ({ kind: 'ok' as const, data })),
      catchError((err: HttpErrorResponse) => {
        if (err.status === 404) return of({ kind: 'not_found' as const });
        if (err.status === 0) return of({ kind: 'network_error' as const });
        return of({
          kind: 'error' as const,
          status: err.status,
          message: err.error?.message ?? err.message ?? 'Something went wrong.',
        });
      }),
    );
  }

  bookConcierge$(dto: CreateConciergeInspectionDto): Observable<BookConciergeResult> {
    return this.http
      .post<CreateConciergeInspectionResponse>(this.bookingUrl, dto)
      .pipe(
        map((data) => ({ kind: 'ok' as const, data })),
        catchError((err: HttpErrorResponse) => {
          /* status === 0 means the browser couldn't reach the API at all
             (offline, DNS failure, CORS preflight rejected). Surface as the
             soft `pending` UX with the call-us fallback. 404/501/etc. are
             real errors now that the endpoint is live (A1/v0.8). */
          if (err.status === 0) {
            return of({
              kind: 'pending' as const,
              message:
                'We could not reach the booking service. Please call +965 22 282 282 to reserve your slot.',
            });
          }
          return of({
            kind: 'error' as const,
            status: err.status,
            message: err.error?.message ?? err.message ?? 'Something went wrong.',
          });
        }),
      );
  }
}
