import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';
import { API_CONFIG } from '@behbehani-cpo/data-access';
import type { NotificationPreferencesDto } from '@behbehani-cpo/shared-types';

/**
 * Discriminated-union results for GET /v1/public/me/notification-preferences.
 * Contract: CONCIERGE_INSPECTION_API_CONTRACT.md v1.3.0 §6.1, v1.4.2 §6.
 * The endpoint always returns defaults when column is NULL — `unauthenticated`
 * means 401 (session gone), `network_error` means status 0 / unreachable.
 */
export type GetResult =
  | { kind: 'ok'; prefs: NotificationPreferencesDto }
  | { kind: 'unauthenticated' }
  | { kind: 'network_error' };

/**
 * Discriminated-union results for PUT /v1/public/me/notification-preferences.
 * Zod refuses `categories.accountSecurity: false` with 422 → `validation_error`.
 */
export type SaveResult =
  | { kind: 'ok'; prefs: NotificationPreferencesDto }
  | { kind: 'validation_error' }
  | { kind: 'unauthenticated' }
  | { kind: 'network_error' };

/** Writeable subset of preferences — accountSecurity is always literal true. */
export type NotificationPreferences = NotificationPreferencesDto;

@Injectable({ providedIn: 'root' })
export class NotificationPreferencesService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(API_CONFIG);

  private get endpoint(): string {
    return `${this.config.baseUrl}/public/me/notification-preferences`;
  }

  get(): Observable<GetResult> {
    return this.http.get<NotificationPreferencesDto>(this.endpoint).pipe(
      map((prefs) => ({ kind: 'ok' as const, prefs })),
      catchError((err: HttpErrorResponse) => {
        if (err.status === 401) return of({ kind: 'unauthenticated' as const });
        if (err.status === 0) return of({ kind: 'network_error' as const });
        return of({ kind: 'network_error' as const });
      }),
    );
  }

  save(prefs: NotificationPreferences): Observable<SaveResult> {
    return this.http.put<NotificationPreferencesDto>(this.endpoint, prefs).pipe(
      map((saved) => ({ kind: 'ok' as const, prefs: saved })),
      catchError((err: HttpErrorResponse) => {
        if (err.status === 401) return of({ kind: 'unauthenticated' as const });
        if (err.status === 422) return of({ kind: 'validation_error' as const });
        if (err.status === 0) return of({ kind: 'network_error' as const });
        return of({ kind: 'network_error' as const });
      }),
    );
  }
}
