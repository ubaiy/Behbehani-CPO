import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';
import { API_CONFIG } from '@behbehani-cpo/data-access';
import type {
  CustomerSignDto,
  PublicInspectionSummary,
} from '@behbehani-cpo/shared-types';

/**
 * Result of GET /v1/public/inspection-sign/:token. The four "non-active"
 * states (expired, revoked, already-signed, not-found) are surfaced from the
 * controller so the page can render distinct empty-state cards rather than
 * the signing form. Per CONCIERGE_INSPECTION_API_CONTRACT.md v0.8, the live
 * endpoint backs this — the previous mock-fixture fallback is removed so
 * network failures surface honestly rather than silently rendering fake data.
 */
export type FetchSignPageResult =
  | { kind: 'ok'; data: PublicInspectionSummary; customerFirstName: string }
  | { kind: 'expired' }
  | { kind: 'revoked' }
  | { kind: 'already_signed' }
  | { kind: 'not_found' }
  | { kind: 'network_error' };

export type SubmitSignResult =
  | { kind: 'ok' }
  | { kind: 'token_invalid' }
  | { kind: 'already_signed' }
  | { kind: 'error'; message: string };

@Injectable({ providedIn: 'root' })
export class InspectionSignService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(API_CONFIG);

  private url(token: string): string {
    return `${this.config.baseUrl}/public/inspection-sign/${encodeURIComponent(token)}`;
  }

  fetch$(token: string): Observable<FetchSignPageResult> {
    return this.http
      .get<{ summary: PublicInspectionSummary; customerFirstName: string }>(this.url(token))
      .pipe(
        map((res) => ({
          kind: 'ok' as const,
          data: res.summary,
          customerFirstName: res.customerFirstName,
        })),
        catchError((err: HttpErrorResponse) => {
          /* Map controller error codes to UI states. v0.7 §1.3 locked the
             four codes — NOT_FOUND, TOKEN_REVOKED, TOKEN_EXPIRED,
             ALREADY_SIGNED — and the matching HTTP statuses. */
          const code = err.error?.code as string | undefined;
          if (code === 'TOKEN_EXPIRED') return of({ kind: 'expired' as const });
          if (code === 'TOKEN_REVOKED') return of({ kind: 'revoked' as const });
          if (code === 'ALREADY_SIGNED') return of({ kind: 'already_signed' as const });
          if (code === 'NOT_FOUND') return of({ kind: 'not_found' as const });
          /* status === 0 means the browser couldn't reach the API at all.
             Surface as `network_error` so the page renders a "try again"
             card instead of misleading the customer with a fake report. */
          if (err.status === 0) return of({ kind: 'network_error' as const });
          /* Any other status (5xx, untyped 4xx) — treat as not-found so the
             customer sees a clean empty-state rather than a raw error. */
          return of({ kind: 'not_found' as const });
        }),
      );
  }

  submit$(token: string, body: CustomerSignDto): Observable<SubmitSignResult> {
    return this.http.post(this.url(token), body).pipe(
      map(() => ({ kind: 'ok' as const })),
      catchError((err: HttpErrorResponse) => {
        const code = err.error?.code as string | undefined;
        if (code === 'TOKEN_EXPIRED' || code === 'TOKEN_REVOKED' || code === 'NOT_FOUND') {
          return of({ kind: 'token_invalid' as const });
        }
        if (code === 'ALREADY_SIGNED') {
          return of({ kind: 'already_signed' as const });
        }
        return of({
          kind: 'error' as const,
          message: err.error?.message ?? err.message ?? 'Something went wrong.',
        });
      }),
    );
  }
}
