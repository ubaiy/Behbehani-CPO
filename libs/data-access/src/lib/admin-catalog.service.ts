import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { API_CONFIG } from './api-config';

export interface CatalogBrand {
  id: string;
  slug: string;
  nameEn: string;
  nameAr: string;
  logoUrl: string | null;
}

export interface CatalogTrim {
  id: string;
  name: string;
}

export interface CatalogModel {
  id: string;
  slug: string;
  nameEn: string;
  nameAr: string;
  trims: CatalogTrim[];
}

export interface CatalogBodyType {
  id: string;
  slug: string;
  nameEn: string;
  nameAr: string;
}

/** Envelope shape returned by catalog endpoints. */
interface ItemsEnvelope<T> {
  items: T[];
}

@Injectable({ providedIn: 'root' })
export class AdminCatalogService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(API_CONFIG);

  private get base(): string {
    return `${this.config.baseUrl}/catalog`;
  }

  /** Fetch all vehicle brands. */
  brands(): Observable<CatalogBrand[]> {
    return this.http
      .get<ItemsEnvelope<CatalogBrand>>(`${this.base}/brands`)
      .pipe(map((res) => res.items));
  }

  /** Fetch all models for a given brand, including their trim variants. */
  models(brandId: string): Observable<CatalogModel[]> {
    return this.http
      .get<ItemsEnvelope<CatalogModel>>(`${this.base}/brands/${brandId}/models`)
      .pipe(map((res) => res.items));
  }

  /** Fetch all body-type options (sedan, SUV, etc.). */
  bodyTypes(): Observable<CatalogBodyType[]> {
    return this.http
      .get<ItemsEnvelope<CatalogBodyType>>(`${this.base}/body-types`)
      .pipe(map((res) => res.items));
  }
}
