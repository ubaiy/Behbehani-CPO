import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';
import { API_CONFIG } from '@behbehani-cpo/data-access';
import type {
  SavedListingSummary,
  SavedListingListResponse,
} from '@behbehani-cpo/shared-types';

// ── Discriminated result types ────────────────────────────────────────────────

export type ListSavedListingsResult =
  | { kind: 'ok'; items: SavedListingSummary[]; total: number; page: number; pageSize: number }
  | { kind: 'unauthenticated' }
  | { kind: 'network_error' };

export type SaveListingResult =
  | { kind: 'ok'; saved: boolean; createdAt: string }
  | { kind: 'unauthenticated' }
  | { kind: 'listing_not_found' }
  | { kind: 'network_error' };

export type UnsaveListingResult =
  | { kind: 'ok'; removed: boolean }
  | { kind: 'unauthenticated' }
  | { kind: 'network_error' };

export type CheckSavedListingsResult =
  | { kind: 'ok'; savedListingIds: string[] }
  | { kind: 'unauthenticated' }
  | { kind: 'network_error' };

// ─────────────────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class SavedListingsService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(API_CONFIG);

  private get base(): string {
    return `${this.config.baseUrl}/public/me/saved-listings`;
  }

  listSavedListings(filter: {
    page: number;
    pageSize: number;
  }): Observable<ListSavedListingsResult> {
    return this.http
      .get<SavedListingListResponse>(this.base, {
        params: { page: String(filter.page), pageSize: String(filter.pageSize) },
      })
      .pipe(
        map((res) => ({
          kind: 'ok' as const,
          items: res.items as SavedListingSummary[],
          total: res.total,
          page: res.page,
          pageSize: res.pageSize,
        })),
        catchError((err: HttpErrorResponse) => {
          if (err.status === 401) return of({ kind: 'unauthenticated' as const });
          return of({ kind: 'network_error' as const });
        }),
      );
  }

  saveListing(listingId: string): Observable<SaveListingResult> {
    return this.http
      .post<{ saved: boolean; createdAt: string }>(
        `${this.base}/${encodeURIComponent(listingId)}`,
        {},
      )
      .pipe(
        map((res) => ({ kind: 'ok' as const, saved: res.saved, createdAt: res.createdAt })),
        catchError((err: HttpErrorResponse) => {
          if (err.status === 401) return of({ kind: 'unauthenticated' as const });
          if (err.status === 404) return of({ kind: 'listing_not_found' as const });
          return of({ kind: 'network_error' as const });
        }),
      );
  }

  unsaveListing(listingId: string): Observable<UnsaveListingResult> {
    return this.http
      .delete<{ removed: boolean }>(`${this.base}/${encodeURIComponent(listingId)}`)
      .pipe(
        map((res) => ({ kind: 'ok' as const, removed: res.removed })),
        catchError((err: HttpErrorResponse) => {
          if (err.status === 401) return of({ kind: 'unauthenticated' as const });
          return of({ kind: 'network_error' as const });
        }),
      );
  }

  checkSavedListings(listingIds: string[]): Observable<CheckSavedListingsResult> {
    if (listingIds.length === 0) {
      return of({ kind: 'ok' as const, savedListingIds: [] });
    }
    // Cap at 50 per API contract
    const ids = listingIds.slice(0, 50);
    return this.http
      .get<{ savedListingIds: string[] }>(`${this.base}/check`, {
        params: { listingIds: ids.join(',') },
      })
      .pipe(
        map((res) => ({ kind: 'ok' as const, savedListingIds: res.savedListingIds })),
        catchError((err: HttpErrorResponse) => {
          if (err.status === 401) return of({ kind: 'unauthenticated' as const });
          return of({ kind: 'network_error' as const });
        }),
      );
  }
}
