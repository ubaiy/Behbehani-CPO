import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type {
  ChangeStageDto,
  CreateListingDto,
  ListingDetail,
  ListingFilter,
  ListingSummary,
  Paginated,
  UpdateListingDto,
} from '@behbehani-cpo/shared-types';
import { API_CONFIG } from './api-config';

@Injectable({ providedIn: 'root' })
export class AdminListingsService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(API_CONFIG);

  private get base(): string {
    return `${this.config.baseUrl}/admin/listings`;
  }

  /**
   * Fetch a paginated list of listings, optionally filtered.
   * Undefined/null filter values are omitted from the query string.
   */
  list(filter: Partial<ListingFilter>): Observable<Paginated<ListingSummary>> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filter)) {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    }
    return this.http.get<Paginated<ListingSummary>>(this.base, { params });
  }

  /** Fetch a single listing by ID. */
  get(id: string): Observable<ListingDetail> {
    return this.http.get<ListingDetail>(`${this.base}/${id}`);
  }

  /** Create a new listing (starts in `acquired` stage). */
  create(dto: CreateListingDto): Observable<ListingDetail> {
    return this.http.post<ListingDetail>(this.base, dto);
  }

  /** Partial-update a listing's core fields. Stage changes must use changeStage(). */
  update(id: string, dto: UpdateListingDto): Observable<ListingDetail> {
    return this.http.patch<ListingDetail>(`${this.base}/${id}`, dto);
  }

  /**
   * Transition a listing through the pipeline.
   * Requires a confirm modal at the call site (page-level concern).
   * Save Draft must NEVER call this with stage === 'listed'.
   */
  changeStage(id: string, dto: ChangeStageDto): Observable<ListingDetail> {
    return this.http.post<ListingDetail>(`${this.base}/${id}/stage`, dto);
  }

  /** Soft-archive a listing (removes it from the active pipeline). */
  archive(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  /**
   * Toggle the operator-curated "Featured" flag.
   * Idempotent — re-featuring a featured listing is a no-op server-side.
   */
  setFeatured(id: string, featured: boolean): Observable<ListingDetail> {
    return this.http.post<ListingDetail>(`${this.base}/${id}/featured`, { featured });
  }
}
