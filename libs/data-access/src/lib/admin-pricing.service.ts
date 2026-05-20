import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type {
  PricingTierDto,
  PricingTierCreate,
  PricingTierUpdate,
  PricingTierListResponse,
  PricingPreviewRequest,
  PricingPreviewResponse,
} from '@behbehani-cpo/shared-types';
import { API_CONFIG } from './api-config';

@Injectable({ providedIn: 'root' })
export class AdminPricingService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(API_CONFIG);

  private get base(): string {
    return `${this.config.baseUrl}/admin/pricing-tiers`;
  }

  list(): Observable<PricingTierListResponse> {
    return this.http.get<PricingTierListResponse>(this.base);
  }

  get(id: string): Observable<PricingTierDto> {
    return this.http.get<PricingTierDto>(`${this.base}/${id}`);
  }

  create(req: PricingTierCreate): Observable<PricingTierDto> {
    return this.http.post<PricingTierDto>(this.base, req);
  }

  update(id: string, req: PricingTierUpdate): Observable<PricingTierDto> {
    return this.http.patch<PricingTierDto>(`${this.base}/${id}`, req);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  preview(req: PricingPreviewRequest): Observable<PricingPreviewResponse> {
    return this.http.post<PricingPreviewResponse>(`${this.base}/preview`, req);
  }
}
