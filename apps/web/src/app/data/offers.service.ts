import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';
import { API_CONFIG } from '@behbehani-cpo/data-access';
import type {
  CustomerOfferResponseDto,
  OfferStatus,
  PublicOfferView,
} from '@behbehani-cpo/shared-types';

/**
 * Result of GET /v1/public/concierge/offers/:token.
 * Locked error codes from CONCIERGE_INSPECTION_API_CONTRACT.md v1.0 §3:
 *   NOT_FOUND (404) · TOKEN_EXPIRED (410) · OFFER_WITHDRAWN (410)
 * The page renders `expired` and `withdrawn` as distinct terminal cards.
 * `network_error` covers genuine offline / unreachable host.
 *
 * Important per v1.0 §3 NOTE: accepted / declined / countered offers are NOT
 * server-side errors here — they come back as `ok` with `canRespond=false`
 * and the page decides whether to render the terminal "you accepted" /
 * "you declined" card vs the active picker, based on `status` + `canRespond`.
 */
export type GetOfferResult =
  | { kind: 'ok'; data: PublicOfferView }
  | { kind: 'not_found' }
  | { kind: 'expired' }
  | { kind: 'withdrawn' }
  | { kind: 'network_error' };

/**
 * Result of POST /v1/public/concierge/offers/:token/respond.
 * Locked error codes:
 *   NOT_FOUND (404) · TOKEN_EXPIRED (410) · OFFER_WITHDRAWN (410)
 *   ALREADY_RESPONDED (409) · INVALID_COUNTER (422)
 *
 * The accepted flow returns a `listingStockNumber` so the success card can
 * surface "Your vehicle is logged as BMC-XXXX".
 */
export type SubmitOfferResult =
  | {
      kind: 'ok';
      status: OfferStatus;
      offerId: string;
      listingStockNumber?: string;
    }
  | { kind: 'not_found' }
  | { kind: 'expired' }
  | { kind: 'withdrawn' }
  | { kind: 'already_responded' }
  | { kind: 'invalid_counter' }
  | { kind: 'error'; message: string };

@Injectable({ providedIn: 'root' })
export class OffersService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(API_CONFIG);

  private url(token: string, suffix = ''): string {
    return `${this.config.baseUrl}/public/concierge/offers/${encodeURIComponent(token)}${suffix}`;
  }

  fetch$(token: string): Observable<GetOfferResult> {
    return this.http.get<PublicOfferView>(this.url(token)).pipe(
      map((data) => ({ kind: 'ok' as const, data })),
      catchError((err: HttpErrorResponse) => {
        const code = err.error?.code as string | undefined;
        if (code === 'NOT_FOUND') return of({ kind: 'not_found' as const });
        if (code === 'TOKEN_EXPIRED') return of({ kind: 'expired' as const });
        if (code === 'OFFER_WITHDRAWN') return of({ kind: 'withdrawn' as const });
        if (err.status === 0) return of({ kind: 'network_error' as const });
        return of({ kind: 'not_found' as const });
      }),
    );
  }

  submit$(token: string, body: CustomerOfferResponseDto): Observable<SubmitOfferResult> {
    return this.http
      .post<{ offerId: string; status: OfferStatus; listingStockNumber?: string }>(
        this.url(token, '/respond'),
        body,
      )
      .pipe(
        map((res) => ({
          kind: 'ok' as const,
          status: res.status,
          offerId: res.offerId,
          listingStockNumber: res.listingStockNumber,
        })),
        catchError((err: HttpErrorResponse) => {
          const code = err.error?.code as string | undefined;
          if (code === 'NOT_FOUND') return of({ kind: 'not_found' as const });
          if (code === 'TOKEN_EXPIRED') return of({ kind: 'expired' as const });
          if (code === 'OFFER_WITHDRAWN') return of({ kind: 'withdrawn' as const });
          if (code === 'ALREADY_RESPONDED') return of({ kind: 'already_responded' as const });
          if (code === 'INVALID_COUNTER') return of({ kind: 'invalid_counter' as const });
          return of({
            kind: 'error' as const,
            message: err.error?.message ?? err.message ?? 'Something went wrong.',
          });
        }),
      );
  }
}
