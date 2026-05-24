import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, startWith } from 'rxjs';
import { API_CONFIG } from '@behbehani-cpo/data-access';
import {
  SavedSearchDtoSchema,
  SavedSearchListResponseSchema,
} from '@behbehani-cpo/shared-types';
import type {
  CreateSavedSearchInput,
  SavedSearchDto,
  SavedSearchListResponse,
  UpdateSavedSearchInput,
} from '@behbehani-cpo/shared-types';

// ── State unions ──────────────────────────────────────────────────────────────

export type SavedSearchListState =
  | { kind: 'loading' }
  | { kind: 'ok'; value: SavedSearchListResponse }
  | { kind: 'error'; code: 'unauthenticated' | 'network_error' | 'unknown' };

export type SavedSearchDetailState =
  | { kind: 'loading' }
  | { kind: 'ok'; value: SavedSearchDto }
  | { kind: 'error'; code: 'SAVED_SEARCH_NOT_FOUND' | 'unauthenticated' | 'network_error' | 'unknown' };

export type CreateSavedSearchState =
  | { kind: 'loading' }
  | { kind: 'ok'; value: SavedSearchDto }
  | { kind: 'error'; code: 'unauthenticated' | 'network_error' | 'validation' | 'unknown' };

export type UpdateSavedSearchState =
  | { kind: 'loading' }
  | { kind: 'ok'; value: SavedSearchDto }
  | { kind: 'error'; code: 'SAVED_SEARCH_NOT_FOUND' | 'unauthenticated' | 'network_error' | 'validation' | 'unknown' };

export type DeleteSavedSearchState =
  | { kind: 'loading' }
  | { kind: 'ok' }
  | { kind: 'error'; code: 'SAVED_SEARCH_NOT_FOUND' | 'unauthenticated' | 'network_error' | 'unknown' };

// ── Helpers ───────────────────────────────────────────────────────────────────

function newIdempotencyKey(): string {
  return globalThis.crypto?.randomUUID() ?? Math.random().toString(36).slice(2);
}

function idempotencyHeaders(): HttpHeaders {
  return new HttpHeaders({ 'Idempotency-Key': newIdempotencyKey() });
}

// ─────────────────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class SavedSearchesService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(API_CONFIG);

  private baseUrl(): string {
    return `${this.config.baseUrl}/public/me/saved-searches`;
  }

  list(page = 1, pageSize = 20): Observable<SavedSearchListState> {
    const params = new HttpParams()
      .set('page', String(page))
      .set('pageSize', String(pageSize));

    return this.http
      .get<SavedSearchListResponse>(this.baseUrl(), { params })
      .pipe(
        map((raw) => {
          try {
            const value = SavedSearchListResponseSchema.parse(raw);
            return { kind: 'ok' as const, value };
          } catch {
            return { kind: 'error' as const, code: 'network_error' as const };
          }
        }),
        catchError((err: HttpErrorResponse) => {
          if (err.status === 401) return of({ kind: 'error' as const, code: 'unauthenticated' as const });
          if (err.status === 0)   return of({ kind: 'error' as const, code: 'network_error' as const });
          return of({ kind: 'error' as const, code: 'unknown' as const });
        }),
        startWith({ kind: 'loading' as const }),
      );
  }

  getById(id: string): Observable<SavedSearchDetailState> {
    return this.http
      .get<SavedSearchDto>(`${this.baseUrl()}/${encodeURIComponent(id)}`)
      .pipe(
        map((raw) => {
          try {
            const value = SavedSearchDtoSchema.parse(raw);
            return { kind: 'ok' as const, value };
          } catch {
            return { kind: 'error' as const, code: 'network_error' as const };
          }
        }),
        catchError((err: HttpErrorResponse) => {
          if (err.status === 401) return of({ kind: 'error' as const, code: 'unauthenticated' as const });
          if (err.status === 0)   return of({ kind: 'error' as const, code: 'network_error' as const });
          const code = err.error?.code as string | undefined;
          if (code === 'SAVED_SEARCH_NOT_FOUND') return of({ kind: 'error' as const, code: 'SAVED_SEARCH_NOT_FOUND' as const });
          return of({ kind: 'error' as const, code: 'unknown' as const });
        }),
        startWith({ kind: 'loading' as const }),
      );
  }

  create(input: CreateSavedSearchInput): Observable<CreateSavedSearchState> {
    return this.http
      .post<SavedSearchDto>(this.baseUrl(), input, { headers: idempotencyHeaders() })
      .pipe(
        map((raw) => {
          try {
            const value = SavedSearchDtoSchema.parse(raw);
            return { kind: 'ok' as const, value };
          } catch {
            return { kind: 'error' as const, code: 'network_error' as const };
          }
        }),
        catchError((err: HttpErrorResponse) => {
          if (err.status === 401) return of({ kind: 'error' as const, code: 'unauthenticated' as const });
          if (err.status === 0)   return of({ kind: 'error' as const, code: 'network_error' as const });
          const code = err.error?.code as string | undefined;
          if (code === 'VALIDATION_ERROR') return of({ kind: 'error' as const, code: 'validation' as const });
          return of({ kind: 'error' as const, code: 'unknown' as const });
        }),
        startWith({ kind: 'loading' as const }),
      );
  }

  update(id: string, input: UpdateSavedSearchInput): Observable<UpdateSavedSearchState> {
    return this.http
      .patch<SavedSearchDto>(`${this.baseUrl()}/${encodeURIComponent(id)}`, input, { headers: idempotencyHeaders() })
      .pipe(
        map((raw) => {
          try {
            const value = SavedSearchDtoSchema.parse(raw);
            return { kind: 'ok' as const, value };
          } catch {
            return { kind: 'error' as const, code: 'network_error' as const };
          }
        }),
        catchError((err: HttpErrorResponse) => {
          if (err.status === 401) return of({ kind: 'error' as const, code: 'unauthenticated' as const });
          if (err.status === 0)   return of({ kind: 'error' as const, code: 'network_error' as const });
          const code = err.error?.code as string | undefined;
          if (code === 'SAVED_SEARCH_NOT_FOUND') return of({ kind: 'error' as const, code: 'SAVED_SEARCH_NOT_FOUND' as const });
          if (code === 'VALIDATION_ERROR')        return of({ kind: 'error' as const, code: 'validation' as const });
          return of({ kind: 'error' as const, code: 'unknown' as const });
        }),
        startWith({ kind: 'loading' as const }),
      );
  }

  delete(id: string): Observable<DeleteSavedSearchState> {
    return this.http
      .delete(`${this.baseUrl()}/${encodeURIComponent(id)}`, { observe: 'response' })
      .pipe(
        map(() => ({ kind: 'ok' as const })),
        catchError((err: HttpErrorResponse) => {
          if (err.status === 401) return of({ kind: 'error' as const, code: 'unauthenticated' as const });
          if (err.status === 0)   return of({ kind: 'error' as const, code: 'network_error' as const });
          const code = err.error?.code as string | undefined;
          if (code === 'SAVED_SEARCH_NOT_FOUND') return of({ kind: 'error' as const, code: 'SAVED_SEARCH_NOT_FOUND' as const });
          return of({ kind: 'error' as const, code: 'unknown' as const });
        }),
        startWith({ kind: 'loading' as const }),
      );
  }
}
