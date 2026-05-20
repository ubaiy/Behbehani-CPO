import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, startWith } from 'rxjs';
import { API_CONFIG } from '@behbehani-cpo/data-access';
import type {
  DocumentKind,
  DocumentListResponseDto,
  DocumentDetailResponseDto,
} from '@behbehani-cpo/shared-types';

// ── State unions ──────────────────────────────────────────────────────────────

export type DocumentsListState =
  | { kind: 'loading' }
  | { kind: 'ok'; value: DocumentListResponseDto }
  | { kind: 'error'; code: string };

export type DocumentDetailState =
  | { kind: 'loading' }
  | { kind: 'ok'; value: DocumentDetailResponseDto }
  | { kind: 'error'; code: string };

// ─────────────────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class DocumentsService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(API_CONFIG);

  private baseUrl(): string {
    return `${this.config.baseUrl}/public/me/documents`;
  }

  list(
    kind?: DocumentKind,
    page = 1,
    pageSize = 20,
  ): Observable<DocumentsListState> {
    let params = new HttpParams()
      .set('page', String(page))
      .set('pageSize', String(pageSize));
    if (kind) {
      params = params.set('kind', kind);
    }

    return this.http
      .get<DocumentListResponseDto>(this.baseUrl(), { params })
      .pipe(
        map((value) => ({ kind: 'ok' as const, value })),
        catchError((err: HttpErrorResponse) => {
          const code = (err.error?.code as string | undefined) ?? 'UNKNOWN_ERROR';
          return of({ kind: 'error' as const, code });
        }),
        startWith({ kind: 'loading' as const }),
      );
  }

  getDownloadUrl(id: string): Observable<DocumentDetailState> {
    return this.http
      .get<DocumentDetailResponseDto>(`${this.baseUrl()}/${encodeURIComponent(id)}`)
      .pipe(
        map((value) => ({ kind: 'ok' as const, value })),
        catchError((err: HttpErrorResponse) => {
          const code = (err.error?.code as string | undefined) ?? 'UNKNOWN_ERROR';
          return of({ kind: 'error' as const, code });
        }),
        startWith({ kind: 'loading' as const }),
      );
  }
}
