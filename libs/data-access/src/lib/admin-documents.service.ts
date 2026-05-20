import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type {
  AdminDocumentUploadUrlRequestDto,
  AdminDocumentUploadUrlResponseDto,
  AdminDocumentFinalizeDto,
  AdminDocumentListQueryDto,
  AdminDocumentListResponseDto,
} from '@behbehani-cpo/shared-types';
import { API_CONFIG } from './api-config';

@Injectable({ providedIn: 'root' })
export class AdminDocumentsService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(API_CONFIG);

  private get base(): string {
    return `${this.config.baseUrl}/admin`;
  }

  /**
   * Step 1 of 3: request a pre-signed S3 PUT URL.
   * Returns { fileKey, uploadUrl, expiresAt }.
   */
  getUploadUrl(
    req: AdminDocumentUploadUrlRequestDto,
  ): Observable<AdminDocumentUploadUrlResponseDto> {
    return this.http.post<AdminDocumentUploadUrlResponseDto>(
      `${this.base}/documents/upload-url`,
      req,
    );
  }

  /**
   * Step 2 of 3: PUT the raw file bytes directly to S3 using the signed URL.
   * The auth interceptor already skips the Authorization header for external
   * URLs (any URL that does not start with config.baseUrl), so the S3 signature
   * remains intact.
   *
   * We still set Content-Type explicitly to match the mime type used when signing.
   */
  uploadFile(uploadUrl: string, file: File, mimeType: string): Observable<void> {
    const headers = new HttpHeaders({ 'Content-Type': mimeType });
    return this.http.put<void>(uploadUrl, file, { headers });
  }

  /**
   * Step 3 of 3: create the Document database row after the S3 upload is complete.
   */
  finalizeUpload(req: AdminDocumentFinalizeDto): Observable<{ id: string }> {
    return this.http.post<{ id: string }>(`${this.base}/documents`, req);
  }

  /**
   * Paginated list of documents belonging to one customer.
   * Endpoint: GET /v1/admin/customers/:customerId/documents
   */
  listCustomerDocuments(
    customerId: string,
    query: Partial<AdminDocumentListQueryDto>,
  ): Observable<AdminDocumentListResponseDto> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) {
        params = params.set(key, String(value));
      }
    }
    return this.http.get<AdminDocumentListResponseDto>(
      `${this.base}/customers/${customerId}/documents`,
      { params },
    );
  }
}
