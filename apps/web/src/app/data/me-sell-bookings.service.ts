import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';
import { API_CONFIG } from '@behbehani-cpo/data-access';
import type {
  ConciergeBookingStatus,
  MySellBookingsListResponse,
} from '@behbehani-cpo/shared-types';

/**
 * Result of GET /v1/public/me/sell-bookings.
 * Auth interceptor (libs/data-access) handles bearer + single-flight
 * refresh-on-410; 401 reaching here means the session is truly gone.
 */
export type ListMySellBookingsResult =
  | {
      kind: 'ok';
      items: ConciergeBookingStatus[];
      total: number;
      page: number;
      pageSize: number;
    }
  | { kind: 'unauthenticated' }
  | { kind: 'network_error' };

@Injectable({ providedIn: 'root' })
export class MeSellBookingsService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(API_CONFIG);

  listMySellBookings(filter: {
    page: number;
    pageSize: number;
  }): Observable<ListMySellBookingsResult> {
    const url = `${this.config.baseUrl}/public/me/sell-bookings`;
    return this.http
      .get<MySellBookingsListResponse>(url, {
        params: { page: String(filter.page), pageSize: String(filter.pageSize) },
      })
      .pipe(
        map((res) => ({
          kind: 'ok' as const,
          items: res.items,
          total: res.total,
          page: res.page,
          pageSize: res.pageSize,
        })),
        catchError((err: HttpErrorResponse) => {
          if (err.status === 401) return of({ kind: 'unauthenticated' as const });
          if (err.status === 0) return of({ kind: 'network_error' as const });
          return of({ kind: 'network_error' as const });
        }),
      );
  }
}
