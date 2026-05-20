import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type {
  AuditLogFilter,
  AuditLogListResponse,
  AuditLogActionListResponse,
  AuditLogResourceListResponse,
} from '@behbehani-cpo/shared-types';
import { API_CONFIG } from './api-config';

@Injectable({ providedIn: 'root' })
export class AdminAuditLogService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(API_CONFIG);

  private get base(): string {
    return `${this.config.baseUrl}/admin/audit-log`;
  }

  /** Fetch a paginated, filtered list of audit log entries. */
  list(filter: Partial<AuditLogFilter>): Observable<AuditLogListResponse> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filter)) {
      if (value === undefined || value === null || value === '') continue;
      params = params.set(key, String(value));
    }
    return this.http.get<AuditLogListResponse>(this.base, { params });
  }

  /** Fetch distinct action vocabulary for the Action dropdown. */
  listActions(): Observable<AuditLogActionListResponse> {
    return this.http.get<AuditLogActionListResponse>(`${this.base}/actions`);
  }

  /** Fetch distinct resource vocabulary for the Resource dropdown. */
  listResources(): Observable<AuditLogResourceListResponse> {
    return this.http.get<AuditLogResourceListResponse>(`${this.base}/resources`);
  }

  /**
   * Fetch the CSV export as a Blob and trigger a browser download.
   * Goes through HttpClient so the auth interceptor attaches the Bearer token
   * (a plain `window.open(url)` would bypass the interceptor → 401 → forced
   * sign-out on a separate tab; that was the prior implementation's bug).
   *
   * page and pageSize are intentionally excluded — the export covers the full
   * filtered result set (up to the server-side 10,000-row cap; over that the
   * API returns 413 and we surface that to the caller via the observable).
   */
  exportCsv(
    filter: Omit<Partial<AuditLogFilter>, 'page' | 'pageSize'>,
  ): Observable<Blob> {
    let params = new HttpParams().set('format', 'csv');
    for (const [key, value] of Object.entries(filter)) {
      if (value === undefined || value === null || value === '') continue;
      params = params.set(key, String(value));
    }
    return this.http.get(`${this.base}/export`, {
      params,
      responseType: 'blob',
    });
  }

  /**
   * Trigger a browser download for the given Blob with a sensible filename.
   * SSR-safe (no-ops when not in a browser).
   */
  static downloadBlob(blob: Blob, filename: string): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }
}
