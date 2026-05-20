import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type {
  AdminCounterDto,
  CreateOfferDto,
  OfferDetailDto,
  OfferListFilter,
  OfferListResponse,
  OfferStatus,
} from '@behbehani-cpo/shared-types';
import { API_CONFIG } from '@behbehani-cpo/data-access';

export interface OfferKpiDto {
  pendingResponse: number;
  countersOpen: number;
  acceptedThisWeek: number;
  expiredThisWeek: number;
}

@Injectable({ providedIn: 'root' })
export class OffersService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(API_CONFIG);

  private get base(): string {
    return `${this.config.baseUrl}/admin/offers`;
  }

  list(filter: Partial<OfferListFilter>): Observable<OfferListResponse> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filter)) {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    }
    return this.http.get<OfferListResponse>(this.base, { params });
  }

  /** KPI strip — derived client-side from list; backend may expose a dedicated
   *  endpoint later. For now we fetch without status filter and aggregate. */
  getKpi(): Observable<OfferKpiDto> {
    return this.http.get<OfferKpiDto>(`${this.base}/kpi`);
  }

  get(id: string): Observable<OfferDetailDto> {
    return this.http.get<OfferDetailDto>(`${this.base}/${id}`);
  }

  /**
   * Create a new offer for a signed-off Concierge inspection.
   * POST /v1/admin/inspections/:inspectionId/offer
   */
  create(inspectionId: string, dto: CreateOfferDto): Observable<OfferDetailDto> {
    return this.http.post<OfferDetailDto>(
      `${this.config.baseUrl}/admin/inspections/${inspectionId}/offer`,
      dto,
    );
  }

  /**
   * Send a drafted offer to the customer.
   * POST /v1/admin/offers/:id/send
   */
  send(id: string): Observable<{ status: 'sent' }> {
    return this.http.post<{ status: 'sent' }>(`${this.base}/${id}/send`, {});
  }

  /**
   * Admin counter-offer (§16 D1 unlimited rounds).
   * PATCH /v1/admin/offers/:id/counter
   */
  submitAdminCounter(id: string, dto: AdminCounterDto): Observable<OfferDetailDto> {
    return this.http.patch<OfferDetailDto>(`${this.base}/${id}/counter`, dto);
  }

  /**
   * Admin responds to a customer counter (accept or decline).
   * POST /v1/admin/offers/:id/respond-counter
   */
  respondToCounter(
    id: string,
    action: 'accept' | 'decline',
  ): Observable<{ offerId: string; status: OfferStatus }> {
    return this.http.post<{ offerId: string; status: OfferStatus }>(
      `${this.base}/${id}/respond-counter`,
      { action },
    );
  }

  /**
   * Admin withdraws an offer in drafted or sent state.
   * POST /v1/admin/offers/:id/withdraw
   */
  withdraw(id: string): Observable<void> {
    return this.http.post<void>(`${this.base}/${id}/withdraw`, {});
  }
}
