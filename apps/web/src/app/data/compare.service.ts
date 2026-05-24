import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, startWith } from 'rxjs';
import { API_CONFIG } from '@behbehani-cpo/data-access';
import type { ListingPublicDetail } from './public-catalog.service';

/**
 * v1.5-D17b — Side-by-side listing comparison response from
 * `GET /v1/public/listings/compare?slugs=X,Y[,Z[,W]]`.
 *
 * Declared inline because the API surfaces this contract via its own
 * controller (apps/api/src/listings/listings-public.controller.ts) without
 * a shared-types entry. Keep this shape mirrored if B updates the endpoint.
 */
export interface ListingCompareRow {
  /** One of 16 comparable field keys (priceFils, mileageKm, year, …). */
  key: string;
  labelEn: string;
  labelAr: string;
  /** Aligned to `items[]` by index. */
  values: ReadonlyArray<string | number | boolean | null>;
  /** True when not all values are equal — used to highlight the row. */
  differs: boolean;
}

export interface ListingCompareResponse {
  /** Order preserved from input slug order. */
  items: ReadonlyArray<ListingPublicDetail>;
  rows: ReadonlyArray<ListingCompareRow>;
}

/* ── State unions — mirror orders.service.ts style. ──────────────────────── */

export type CompareFetchState =
  | { kind: 'loading' }
  | { kind: 'ok'; value: ListingCompareResponse }
  | { kind: 'error'; code: 'not_found'; missingSlugs: ReadonlyArray<string> }
  | { kind: 'error'; code: 'invalid_query' | 'network_error' | 'unknown' };

@Injectable({ providedIn: 'root' })
export class CompareService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(API_CONFIG);

  private endpoint(): string {
    return `${this.config.baseUrl}/public/listings/compare`;
  }

  /**
   * Fetch the comparison payload for 2–4 slugs. Returns a discriminated-union
   * observable that emits `loading` first and then `ok | error`. Never throws.
   */
  fetch(slugs: ReadonlyArray<string>): Observable<CompareFetchState> {
    /* Client-side guard so we don't even call the API with an obviously bad
       query. Server enforces the same 2-4 cap. */
    const cleaned = slugs.map((s) => s.trim()).filter(Boolean);
    if (cleaned.length < 2 || cleaned.length > 4) {
      return of<CompareFetchState>({ kind: 'error', code: 'invalid_query' });
    }

    const params = new HttpParams().set('slugs', cleaned.join(','));

    return this.http.get<ListingCompareResponse>(this.endpoint(), { params }).pipe(
      map((value) => ({ kind: 'ok' as const, value })),
      catchError((err: HttpErrorResponse) => {
        if (err.status === 0) {
          return of<CompareFetchState>({ kind: 'error', code: 'network_error' });
        }
        if (err.status === 404) {
          const missing = Array.isArray(err.error?.missingSlugs)
            ? (err.error.missingSlugs as string[])
            : [];
          return of<CompareFetchState>({
            kind: 'error',
            code: 'not_found',
            missingSlugs: missing,
          });
        }
        if (err.status === 400) {
          return of<CompareFetchState>({ kind: 'error', code: 'invalid_query' });
        }
        return of<CompareFetchState>({ kind: 'error', code: 'unknown' });
      }),
      startWith<CompareFetchState>({ kind: 'loading' }),
    );
  }
}
