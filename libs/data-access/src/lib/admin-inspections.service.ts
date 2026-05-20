import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type {
  CreateInspectionDto,
  InspectionFilter,
  InspectionListResponse,
  InspectionPhotoPresignDto,
  InspectionPhotoPresignResponse,
  InspectionSummaryDto,
  InspectionReportJson,
  SaveInspectionProgressDto,
  SignoffDto,
  SignoffResponse,
} from '@behbehani-cpo/shared-types';
import { API_CONFIG } from './api-config';

/** Admin inspection detail = summary + the full reportJson blob. */
export interface InspectionDetailDto extends InspectionSummaryDto {
  reportJson: InspectionReportJson | null;
}

@Injectable({ providedIn: 'root' })
export class AdminInspectionsService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(API_CONFIG);

  private get base(): string {
    return `${this.config.baseUrl}/admin/inspections`;
  }

  list(filter: Partial<InspectionFilter>): Observable<InspectionListResponse> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filter)) {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    }
    return this.http.get<InspectionListResponse>(this.base, { params });
  }

  get(id: string): Observable<InspectionDetailDto> {
    return this.http.get<InspectionDetailDto>(`${this.base}/${id}`);
  }

  create(dto: CreateInspectionDto): Observable<InspectionDetailDto> {
    return this.http.post<InspectionDetailDto>(this.base, dto);
  }

  saveProgress(id: string, dto: SaveInspectionProgressDto): Observable<InspectionDetailDto> {
    return this.http.patch<InspectionDetailDto>(`${this.base}/${id}`, dto);
  }

  presignPhoto(
    id: string,
    itemId: string,
    dto: InspectionPhotoPresignDto,
  ): Observable<InspectionPhotoPresignResponse> {
    return this.http.post<InspectionPhotoPresignResponse>(
      `${this.base}/${id}/items/${itemId}/photo/presign`,
      dto,
    );
  }

  signoff(id: string, dto: SignoffDto): Observable<SignoffResponse> {
    return this.http.post<SignoffResponse>(`${this.base}/${id}/signoff`, dto);
  }

  resendSignLink(id: string): Observable<SignoffResponse> {
    return this.http.post<SignoffResponse>(`${this.base}/${id}/resend-link`, {});
  }

  revokeSignLink(id: string): Observable<void> {
    return this.http.post<void>(`${this.base}/${id}/revoke-link`, {});
  }
}
