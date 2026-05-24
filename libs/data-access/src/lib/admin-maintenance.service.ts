import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type {
  AdminMaintenanceListQueryDto,
  AdminMaintenanceRequestDetailDto,
  AdminMaintenanceRequestListResponseDto,
  UpdateMaintenanceRequestStatusInput,
} from '@behbehani-cpo/shared-types';
import { API_CONFIG } from './api-config';

@Injectable({ providedIn: 'root' })
export class AdminMaintenanceService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(API_CONFIG);

  private get base(): string {
    return `${this.config.baseUrl}/admin`;
  }

  /**
   * GET /v1/admin/maintenance-requests — paginated, filterable list.
   * Includes statusCounts across all rows.
   */
  listRequests(
    query: Partial<AdminMaintenanceListQueryDto>,
  ): Observable<AdminMaintenanceRequestListResponseDto> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) {
        params = params.set(key, String(value));
      }
    }
    return this.http.get<AdminMaintenanceRequestListResponseDto>(
      `${this.base}/maintenance-requests`,
      { params },
    );
  }

  /**
   * GET /v1/admin/maintenance-requests/:id — full detail.
   */
  getRequest(id: string): Observable<AdminMaintenanceRequestDetailDto> {
    return this.http.get<AdminMaintenanceRequestDetailDto>(
      `${this.base}/maintenance-requests/${id}`,
    );
  }

  /**
   * PATCH /v1/admin/maintenance-requests/:id — update status / adminNotes.
   */
  updateRequest(
    id: string,
    body: UpdateMaintenanceRequestStatusInput,
  ): Observable<AdminMaintenanceRequestDetailDto> {
    return this.http.patch<AdminMaintenanceRequestDetailDto>(
      `${this.base}/maintenance-requests/${id}`,
      body,
    );
  }
}
