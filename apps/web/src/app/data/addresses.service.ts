import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, Signal, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { API_CONFIG } from '@behbehani-cpo/data-access';
import type { AddressDto, AddressInputDto, AddressPatchDto } from '@behbehani-cpo/shared-types';

// ─── Result unions ────────────────────────────────────────────────────────────

/**
 * Result of GET /v1/public/me/addresses.
 * Contract: CONCIERGE_INSPECTION_API_CONTRACT.md v1.3.5 §1 (endpoint 9).
 */
export type ListResult =
  | { kind: 'ok'; addresses: AddressDto[] }
  | { kind: 'unauthenticated' }
  | { kind: 'network_error' };

/**
 * Result of POST / PATCH / DELETE / default endpoints.
 * EA-2: all mutations return the full updated Address[] list.
 * Contract: v1.3.5 §1 (endpoints 10–13).
 */
export type MutationResult =
  | { kind: 'ok'; addresses: AddressDto[] }
  | { kind: 'validation_error'; message: string }
  | { kind: 'not_found' }
  | { kind: 'unauthenticated' }
  | { kind: 'network_error' };

// ─── Service ──────────────────────────────────────────────────────────────────

/**
 * Stateful service for /v1/public/me/addresses.
 *
 * The EA-2 pattern (every mutation returns the full updated list) lets us
 * eliminate per-call re-fetches. Each mutation taps the response and replaces
 * the `_addresses` signal with the fresh list from the server.
 */
@Injectable({ providedIn: 'root' })
export class AddressesService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(API_CONFIG);

  private readonly _addresses = signal<AddressDto[]>([]);

  /** Readonly signal, auto-synced after every list() call and every mutation. */
  readonly addresses: Signal<AddressDto[]> = this._addresses.asReadonly();

  // ── helpers ──────────────────────────────────────────────────────────────────

  private url(suffix = ''): string {
    return `${this.config.baseUrl}/public/me/addresses${suffix}`;
  }

  private syncAddresses(items: AddressDto[]): void {
    this._addresses.set(items);
  }

  private handleMutationError(err: HttpErrorResponse): Observable<MutationResult> {
    if (err.status === 0) return of({ kind: 'network_error' as const });
    if (err.status === 401 || err.status === 403)
      return of({ kind: 'unauthenticated' as const });
    if (err.status === 404) return of({ kind: 'not_found' as const });
    if (err.status === 422 || err.status === 400) {
      const message: string = err.error?.message ?? err.message ?? 'Validation failed.';
      return of({ kind: 'validation_error' as const, message });
    }
    return of({ kind: 'network_error' as const });
  }

  // ── public API ───────────────────────────────────────────────────────────────

  /**
   * GET /v1/public/me/addresses
   * Returns addresses sorted default-first, then createdAt-asc (server-sorted).
   * Populates the `addresses` signal on success.
   */
  list(): Observable<ListResult> {
    return this.http.get<AddressDto[]>(this.url()).pipe(
      tap((items) => this.syncAddresses(items)),
      map((items) => ({ kind: 'ok' as const, addresses: items })),
      catchError((err: HttpErrorResponse) => {
        if (err.status === 0) return of({ kind: 'network_error' as const });
        if (err.status === 401 || err.status === 403)
          return of({ kind: 'unauthenticated' as const });
        return of({ kind: 'network_error' as const });
      }),
    );
  }

  /**
   * POST /v1/public/me/addresses
   * Body shape: AddressInputDto (label, governorate, area, block, street, building, unit?, lat?, lng?, isDefault?)
   * EA-2: response is the full updated Address[].
   */
  create(dto: AddressInputDto & { isDefault?: boolean }): Observable<MutationResult> {
    return this.http.post<AddressDto[]>(this.url(), dto).pipe(
      tap((items) => this.syncAddresses(items)),
      map((items) => ({ kind: 'ok' as const, addresses: items })),
      catchError((err: HttpErrorResponse) => this.handleMutationError(err)),
    );
  }

  /**
   * PATCH /v1/public/me/addresses/:id
   * Partial shape; omitted fields are unchanged server-side.
   * EA-2: response is the full updated Address[].
   */
  update(id: string, dto: AddressPatchDto & { isDefault?: boolean }): Observable<MutationResult> {
    return this.http.patch<AddressDto[]>(this.url(`/${encodeURIComponent(id)}`), dto).pipe(
      tap((items) => this.syncAddresses(items)),
      map((items) => ({ kind: 'ok' as const, addresses: items })),
      catchError((err: HttpErrorResponse) => this.handleMutationError(err)),
    );
  }

  /**
   * DELETE /v1/public/me/addresses/:id
   * Server atomically promotes the next default when the deleted address was
   * the default (partial-unique-default invariant).
   * EA-2: response is the full updated Address[].
   */
  delete(id: string): Observable<MutationResult> {
    return this.http.delete<AddressDto[]>(this.url(`/${encodeURIComponent(id)}`)).pipe(
      tap((items) => this.syncAddresses(items)),
      map((items) => ({ kind: 'ok' as const, addresses: items })),
      catchError((err: HttpErrorResponse) => this.handleMutationError(err)),
    );
  }

  /**
   * POST /v1/public/me/addresses/:id/default
   * Atomically clears the existing default and sets this one inside a DB
   * transaction (partial-unique-default invariant maintained server-side).
   * EA-2: response is the full updated Address[].
   */
  setDefault(id: string): Observable<MutationResult> {
    return this.http
      .post<AddressDto[]>(this.url(`/${encodeURIComponent(id)}/default`), {})
      .pipe(
        tap((items) => this.syncAddresses(items)),
        map((items) => ({ kind: 'ok' as const, addresses: items })),
        catchError((err: HttpErrorResponse) => this.handleMutationError(err)),
      );
  }
}
