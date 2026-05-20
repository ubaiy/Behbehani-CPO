import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import type {
  BrandDto,
  BrandCreate,
  BrandUpdate,
  BrandListResponse,
  BrandLogoPresignRequest,
  BrandLogoPresignResponse,
  ModelDto,
  ModelCreate,
  ModelUpdate,
  ModelListResponse,
  TrimDto,
  TrimCreate,
  TrimUpdate,
  BodyTypeDto,
  BodyTypeCreate,
  BodyTypeUpdate,
  BodyTypeListResponse,
} from '@behbehani-cpo/shared-types';
import { API_CONFIG } from './api-config';

/**
 * Admin write/CRUD client for /v1/admin/catalog. Mirrors the public-read
 * AdminCatalogService but covers create/update/active-toggle/logo flows.
 */
@Injectable({ providedIn: 'root' })
export class AdminCatalogAdminService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(API_CONFIG);

  private get base(): string {
    return `${this.config.baseUrl}/admin/catalog`;
  }

  // ─── Brand ─────────────────────────────────────────────────────────────────

  listBrands(
    params: { status?: 'all' | 'active' | 'inactive'; q?: string; page?: number; pageSize?: number } = {},
  ): Observable<BrandListResponse> {
    return this.http.get<BrandListResponse>(`${this.base}/brands`, { params: this.scrub(params) });
  }

  getBrand(id: string): Observable<BrandDto> {
    return this.http.get<BrandDto>(`${this.base}/brands/${id}`);
  }

  createBrand(dto: BrandCreate): Observable<BrandDto> {
    return this.http.post<BrandDto>(`${this.base}/brands`, dto);
  }

  updateBrand(id: string, dto: BrandUpdate): Observable<BrandDto> {
    return this.http.patch<BrandDto>(`${this.base}/brands/${id}`, dto);
  }

  setBrandActive(id: string, isActive: boolean): Observable<BrandDto & { referencingListings: number }> {
    return this.http.post<BrandDto & { referencingListings: number }>(
      `${this.base}/brands/${id}/active`,
      { isActive },
    );
  }

  /**
   * Upload a brand logo: presign → PUT to S3 → PATCH the brand with the
   * resulting publicUrl. Returns the updated brand.
   */
  uploadBrandLogo(brandId: string, file: File): Observable<BrandDto> {
    const presignReq: BrandLogoPresignRequest = {
      contentType: file.type === 'image/svg+xml' ? 'image/svg+xml' : 'image/png',
      byteSize: file.size,
    };
    return this.http
      .post<BrandLogoPresignResponse>(`${this.base}/brands/${brandId}/logo/presign`, presignReq)
      .pipe(
        switchMap((presign) =>
          this.http
            .put(presign.uploadUrl, file, { headers: { 'Content-Type': presignReq.contentType } })
            .pipe(switchMap(() => this.updateBrand(brandId, { logoUrl: presign.publicUrl }))),
        ),
      );
  }

  removeBrandLogo(brandId: string): Observable<BrandDto> {
    return this.http.delete<BrandDto>(`${this.base}/brands/${brandId}/logo`);
  }

  // ─── Model ─────────────────────────────────────────────────────────────────

  listModelsByBrand(
    brandId: string,
    params: { status?: 'all' | 'active' | 'inactive'; q?: string; page?: number; pageSize?: number } = {},
  ): Observable<ModelListResponse & { brand: BrandDto }> {
    return this.http.get<ModelListResponse & { brand: BrandDto }>(
      `${this.base}/brands/${brandId}/models`,
      { params: this.scrub(params) },
    );
  }

  createModel(dto: ModelCreate): Observable<ModelDto> {
    return this.http.post<ModelDto>(`${this.base}/models`, dto);
  }

  updateModel(id: string, dto: ModelUpdate): Observable<ModelDto> {
    return this.http.patch<ModelDto>(`${this.base}/models/${id}`, dto);
  }

  setModelActive(id: string, isActive: boolean): Observable<ModelDto & { referencingListings: number }> {
    return this.http.post<ModelDto & { referencingListings: number }>(
      `${this.base}/models/${id}/active`,
      { isActive },
    );
  }

  // ─── Trim ──────────────────────────────────────────────────────────────────

  createTrim(dto: TrimCreate): Observable<TrimDto> {
    return this.http.post<TrimDto>(`${this.base}/trims`, dto);
  }

  updateTrim(id: string, dto: TrimUpdate): Observable<TrimDto> {
    return this.http.patch<TrimDto>(`${this.base}/trims/${id}`, dto);
  }

  setTrimActive(id: string, isActive: boolean): Observable<TrimDto> {
    return this.http.post<TrimDto>(`${this.base}/trims/${id}/active`, { isActive });
  }

  // ─── Body type ─────────────────────────────────────────────────────────────

  listBodyTypes(
    params: { status?: 'all' | 'active' | 'inactive'; q?: string; page?: number; pageSize?: number } = {},
  ): Observable<BodyTypeListResponse> {
    return this.http.get<BodyTypeListResponse>(`${this.base}/body-types`, { params: this.scrub(params) });
  }

  createBodyType(dto: BodyTypeCreate): Observable<BodyTypeDto> {
    return this.http.post<BodyTypeDto>(`${this.base}/body-types`, dto);
  }

  updateBodyType(id: string, dto: BodyTypeUpdate): Observable<BodyTypeDto> {
    return this.http.patch<BodyTypeDto>(`${this.base}/body-types/${id}`, dto);
  }

  setBodyTypeActive(id: string, isActive: boolean): Observable<BodyTypeDto & { referencingListings: number }> {
    return this.http.post<BodyTypeDto & { referencingListings: number }>(
      `${this.base}/body-types/${id}/active`,
      { isActive },
    );
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  /** Drop undefined/null/empty-string params so Angular's HttpClient sends a tidy querystring. */
  private scrub(params: Record<string, string | number | undefined>): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') out[k] = String(v);
    }
    return out;
  }
}
