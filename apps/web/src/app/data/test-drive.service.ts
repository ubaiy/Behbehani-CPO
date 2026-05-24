import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, startWith } from 'rxjs';
import { API_CONFIG } from '@behbehani-cpo/data-access';
import type {
  TestDriveWindow,
  TestDriveLocation,
} from '@behbehani-cpo/shared-types';

/**
 * v1.5-D18c — anonymous Test Drive booking from the customer storefront (VDP).
 *
 * Wraps `POST /v1/public/test-drive-bookings` (B v1.5.29). The endpoint is
 * rate-limited 5/min/IP and REQUIRES an `Idempotency-Key` header. Callers
 * generate one `idempotencyKey` PER USER-INTENT and reuse it on retries.
 *
 * Mirrors the discriminated-union + `startWith({kind:'loading'})` pattern from
 * `leads.service.ts` so consumers can subscribe and switch on `state.kind`.
 *
 * Note: 401 surfaces as the `unavailable` code — that's the documented
 * ASK A→B-6 mount-order bug, where the public test-drive route is presently
 * gated by the auth guard. UI handles it gracefully with a "call us" hint.
 */

// ── Request / response shapes ────────────────────────────────────────────────

export interface SubmitTestDrivePayload {
  /** 2–120 chars. Trimmed by server. */
  customerName: string;
  /** 7–20 chars; server regex `^\+?[0-9\s\-().]{7,20}$`. E.164 preferred. */
  customerPhone: string;
  customerEmail?: string;
  /** YYYY-MM-DD. Server enforces ≥ tomorrow UTC. */
  preferredDate: string;
  preferredWindow: TestDriveWindow;
  location: TestDriveLocation;
  /** Required when location='customer_address'. Max 500. */
  addressLine?: string;
  customerNotes?: string;
  listingId?: string;
}

export interface TestDriveCreatedResponse {
  id: string;
  status: string;
  createdAt: string;
}

export type SubmitTestDriveErrorCode =
  | 'rate_limited'
  | 'unavailable'
  | 'validation'
  | 'network_error'
  | 'unknown';

export type SubmitTestDriveState =
  | { kind: 'loading' }
  | { kind: 'ok'; value: TestDriveCreatedResponse }
  | { kind: 'error'; code: SubmitTestDriveErrorCode };

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Generates a v4-ish UUID, falling back to a low-entropy string in SSR or
 *  ancient browsers. Component code should mint one key per submit-intent and
 *  reuse it on retry — that's what makes the server-side idempotency work. */
export function newTestDriveIdempotencyKey(): string {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `td-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  );
}

// ─────────────────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class TestDriveService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(API_CONFIG);

  private url(): string {
    return `${this.config.baseUrl}/public/test-drive-bookings`;
  }

  /**
   * Single one-shot submit. Emits `{kind:'loading'}` immediately then exactly
   * one terminal state. No internal retry — the caller decides if and when to
   * resubmit (and must reuse `idempotencyKey` if so).
   */
  submitBooking(
    payload: SubmitTestDrivePayload,
    idempotencyKey: string,
  ): Observable<SubmitTestDriveState> {
    const body: Record<string, unknown> = {
      customerName: payload.customerName.trim(),
      customerPhone: payload.customerPhone.trim(),
      preferredDate: payload.preferredDate,
      preferredWindow: payload.preferredWindow,
      location: payload.location,
    };
    if (payload.customerEmail?.trim()) {
      body['customerEmail'] = payload.customerEmail.trim();
    }
    if (payload.addressLine?.trim()) {
      body['addressLine'] = payload.addressLine.trim();
    }
    if (payload.customerNotes?.trim()) {
      body['customerNotes'] = payload.customerNotes.trim();
    }
    if (payload.listingId) {
      body['listingId'] = payload.listingId;
    }

    const headers = new HttpHeaders({ 'Idempotency-Key': idempotencyKey });

    return this.http
      .post<TestDriveCreatedResponse>(this.url(), body, { headers })
      .pipe(
        map((value) => ({ kind: 'ok' as const, value })),
        catchError((err: HttpErrorResponse) => {
          if (err.status === 0) {
            return of({ kind: 'error' as const, code: 'network_error' as const });
          }
          if (err.status === 429) {
            return of({ kind: 'error' as const, code: 'rate_limited' as const });
          }
          if (err.status === 401) {
            // Known mount-order bug (ASK A→B-6) — treat as "temporarily
            // unavailable" so the UI can show a friendly fallback.
            return of({ kind: 'error' as const, code: 'unavailable' as const });
          }
          if (err.status === 400) {
            return of({ kind: 'error' as const, code: 'validation' as const });
          }
          return of({ kind: 'error' as const, code: 'unknown' as const });
        }),
        startWith({ kind: 'loading' as const }),
      );
  }
}
