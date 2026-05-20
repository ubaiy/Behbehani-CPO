import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';
import { API_CONFIG } from '@behbehani-cpo/data-access';

// ── Discriminated result types ────────────────────────────────────────────────

export type SignOutAllResult =
  | { kind: 'ok'; revoked: number }
  | { kind: 'unauthenticated' }
  | { kind: 'network_error' };

// ─────────────────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class SecurityService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(API_CONFIG);

  /**
   * POST /v1/public/me/sign-out-all
   * EA-3: revokes all sessions EXCEPT the caller's (sessionJti is preserved).
   * Returns the count of other devices signed out.
   */
  signOutAll(): Observable<SignOutAllResult> {
    return this.http
      .post<{ revoked: number }>(`${this.config.baseUrl}/public/me/sign-out-all`, null)
      .pipe(
        map((res) => ({ kind: 'ok' as const, revoked: res.revoked })),
        catchError((err: HttpErrorResponse) => {
          if (err.status === 401) return of({ kind: 'unauthenticated' as const });
          return of({ kind: 'network_error' as const });
        }),
      );
  }
}
