import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type {
  AgingEngineStatusDto,
  AgingRunDto,
  AgingActiveDiscountListResponse,
  AgingDistribution,
  AgingRunNowRequest,
  AgingPauseRequest,
} from '@behbehani-cpo/shared-types';
import { API_CONFIG } from './api-config';

export interface AgingActiveDiscountOpts {
  page: number;
  pageSize: number;
  stage?: string;
  tierId?: string;
  brandId?: string;
  daysMin?: number;
  daysMax?: number;
  q?: string;
}

@Injectable({ providedIn: 'root' })
export class AdminAgingService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(API_CONFIG);

  private get base(): string {
    return `${this.config.baseUrl}/admin/aging`;
  }

  status(): Observable<AgingEngineStatusDto> {
    return this.http.get<AgingEngineStatusDto>(`${this.base}/status`);
  }

  listRuns(opts?: { page?: number; limit?: number }): Observable<AgingRunDto[]> {
    let params = new HttpParams();
    if (opts?.page !== undefined) params = params.set('page', String(opts.page));
    if (opts?.limit !== undefined) params = params.set('limit', String(opts.limit));
    return this.http.get<AgingRunDto[]>(`${this.base}/runs`, { params });
  }

  listActiveDiscounts(opts: AgingActiveDiscountOpts): Observable<AgingActiveDiscountListResponse> {
    let params = new HttpParams()
      .set('page', String(opts.page))
      .set('pageSize', String(opts.pageSize));
    if (opts.stage) params = params.set('stage', opts.stage);
    if (opts.tierId) params = params.set('tierId', opts.tierId);
    if (opts.brandId) params = params.set('brandId', opts.brandId);
    if (opts.daysMin !== undefined) params = params.set('daysMin', String(opts.daysMin));
    if (opts.daysMax !== undefined) params = params.set('daysMax', String(opts.daysMax));
    if (opts.q) params = params.set('q', opts.q);
    return this.http.get<AgingActiveDiscountListResponse>(`${this.base}/active-discounts`, { params });
  }

  distribution(): Observable<AgingDistribution> {
    return this.http.get<AgingDistribution>(`${this.base}/distribution`);
  }

  runNow(req: AgingRunNowRequest): Observable<AgingRunDto> {
    return this.http.post<AgingRunDto>(`${this.base}/run-now`, req);
  }

  pause(req: AgingPauseRequest): Observable<{ paused: boolean }> {
    return this.http.post<{ paused: boolean }>(`${this.base}/pause`, req);
  }
}
