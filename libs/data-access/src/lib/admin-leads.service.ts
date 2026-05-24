import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type {
  AssignLeadInput,
  LeadDto,
  LeadListFilter,
  LeadListResponse,
  UpdateLeadInput,
} from '../../../shared/types/src/lib/admin-lead.schemas';
import { API_CONFIG } from './api-config';

@Injectable({ providedIn: 'root' })
export class AdminLeadsService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(API_CONFIG);

  private get base(): string {
    return `${this.config.baseUrl}/admin`;
  }

  /**
   * GET /v1/admin/leads — paginated, filterable list with status counts.
   */
  listLeads(query: Partial<LeadListFilter>): Observable<LeadListResponse> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) {
        params = params.set(key, String(value));
      }
    }
    return this.http.get<LeadListResponse>(`${this.base}/leads`, { params });
  }

  /**
   * GET /v1/admin/leads/:id — single lead detail.
   */
  getLead(id: string): Observable<LeadDto> {
    return this.http.get<LeadDto>(`${this.base}/leads/${id}`);
  }

  /**
   * PATCH /v1/admin/leads/:id — update status + notes.
   */
  updateLead(id: string, body: UpdateLeadInput): Observable<LeadDto> {
    return this.http.patch<LeadDto>(`${this.base}/leads/${id}`, body);
  }

  /**
   * POST /v1/admin/leads/:id/assign — assign to a staff user.
   */
  assignLead(id: string, body: AssignLeadInput): Observable<LeadDto> {
    return this.http.post<LeadDto>(`${this.base}/leads/${id}/assign`, body);
  }
}
