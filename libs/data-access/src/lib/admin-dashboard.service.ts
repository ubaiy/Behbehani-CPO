import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type { DashboardKpisDto } from '@behbehani-cpo/shared-types';
import { API_CONFIG } from './api-config';

@Injectable({ providedIn: 'root' })
export class AdminDashboardService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(API_CONFIG);

  private get base(): string {
    return `${this.config.baseUrl}/admin/dashboard`;
  }

  kpis(): Observable<DashboardKpisDto> {
    return this.http.get<DashboardKpisDto>(`${this.base}/kpis`);
  }
}
