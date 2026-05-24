import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type {
  AdminFeatureWaitlistListFilterDto,
  AdminFeatureWaitlistListResponseDto,
} from '@behbehani-cpo/shared-types';
import { API_CONFIG } from './api-config';

@Injectable({ providedIn: 'root' })
export class AdminFeatureWaitlistService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(API_CONFIG);

  private get base(): string {
    return `${this.config.baseUrl}/admin`;
  }

  /**
   * GET /v1/admin/feature-waitlists — paginated list with per-path counts.
   */
  listWaitlist(
    query: Partial<AdminFeatureWaitlistListFilterDto>,
  ): Observable<AdminFeatureWaitlistListResponseDto> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    }
    return this.http.get<AdminFeatureWaitlistListResponseDto>(
      `${this.base}/feature-waitlists`,
      { params },
    );
  }

  /**
   * GET /v1/admin/feature-waitlists/export — CSV download as Blob.
   *
   * The caller should create an object URL from the blob and trigger a
   * programmatic <a download> click to save the file.
   */
  exportWaitlist(featurePath?: string): Observable<Blob> {
    let params = new HttpParams();
    if (featurePath) {
      params = params.set('featurePath', featurePath);
    }
    return this.http.get(`${this.base}/feature-waitlists/export`, {
      params,
      responseType: 'blob',
    });
  }
}
