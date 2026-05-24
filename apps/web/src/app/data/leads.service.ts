import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, startWith } from 'rxjs';
import { API_CONFIG } from '@behbehani-cpo/data-access';
import type { LeadSource } from '@behbehani-cpo/shared-types';

/**
 * v1.5-D17a — anonymous lead capture from the customer storefront (VDP).
 *
 * Wraps `POST /v1/public/leads` (B v1.5.25). The endpoint is rate-limited
 * 5/min/IP and REQUIRES an `Idempotency-Key` header. Callers should generate
 * one `idempotencyKey` PER USER-INTENT (not per retry) and pass it in — that's
 * what makes the request idempotent on the server.
 *
 * Mirrors the discriminated-union + `startWith({kind:'loading'})` pattern from
 * `orders.service.ts` so consumers can subscribe and switch on `state.kind`.
 */

// ── Request / response shapes ────────────────────────────────────────────────

/** Sub-source marker stuffed into the `message` field so the admin Leads queue
 *  can distinguish a callback request from a WhatsApp tap. The server's
 *  `LeadSource` enum (`'vdp' | 'callback' | 'other'`) is too coarse to carry
 *  this signal on its own — see B's WIRE.md.                                  */
export type VdpLeadChannel = 'vdp_callback' | 'vdp_whatsapp';

export interface SubmitLeadPayload {
  /** 2–120 chars. Trimmed by server. */
  name: string;
  /** Kuwait E.164 preferred (`+96522XXXXXX`). Server regex accepts any
   *  reasonable phone (7–20 chars). Normalized to E.164 by callers if cheap. */
  phone: string;
  email?: string;
  /** Optional free-text. Max 500 chars. The channel marker is auto-prepended
   *  by `submitLead()` so callers should leave this as the user's actual
   *  message (or omit it). */
  message?: string;
  listingId?: string;
  /** Which CTA was tapped — drives the auto-prepended marker. */
  channel: VdpLeadChannel;
  /** Caller-generated UUID. Reuse the SAME key across retries within one
   *  submit attempt — that's the whole point of idempotency. */
  idempotencyKey: string;
}

export interface LeadCreatedResponse {
  id: string;
  status: string;
  createdAt: string;
}

export type SubmitLeadState =
  | { kind: 'loading' }
  | { kind: 'ok'; value: LeadCreatedResponse }
  | { kind: 'error'; code: 'rate_limited' | 'idempotency_required' | 'validation' | 'network_error' | 'unknown' };

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Generates a v4-ish UUID, falling back to a low-entropy string in SSR or
 *  ancient browsers. Exposed so component code can mint one key once per
 *  submit intent and reuse it on retries. */
export function newIdempotencyKey(): string {
  return globalThis.crypto?.randomUUID?.() ?? `lead-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Maps the VDP channel to the server's coarse `LeadSource` enum. */
function channelToServerSource(channel: VdpLeadChannel): LeadSource {
  return channel === 'vdp_callback' ? 'callback' : 'vdp';
}

/** Prefixes the user-provided message with a `[channel]` tag so admins can
 *  tell callback-requests from WhatsApp-taps in the leads queue. */
function buildMessage(channel: VdpLeadChannel, userMessage?: string): string | undefined {
  const tag = `[${channel}]`;
  const body = userMessage?.trim();
  if (!body) return tag;
  return `${tag} ${body}`.slice(0, 500);
}

// ─────────────────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class LeadsService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(API_CONFIG);

  private url(): string {
    return `${this.config.baseUrl}/public/leads`;
  }

  /**
   * Single one-shot submit. Emits `{kind:'loading'}` immediately then exactly
   * one terminal state. No internal retry — the caller decides if and when to
   * resubmit (and must reuse `idempotencyKey` if so).
   */
  submitLead(payload: SubmitLeadPayload): Observable<SubmitLeadState> {
    const body = {
      customerName:  payload.name.trim(),
      customerPhone: payload.phone.trim(),
      customerEmail: payload.email?.trim() || undefined,
      message:       buildMessage(payload.channel, payload.message),
      listingId:     payload.listingId,
      source:        channelToServerSource(payload.channel),
    };

    const headers = new HttpHeaders({ 'Idempotency-Key': payload.idempotencyKey });

    return this.http.post<LeadCreatedResponse>(this.url(), body, { headers }).pipe(
      map((value) => ({ kind: 'ok' as const, value })),
      catchError((err: HttpErrorResponse) => {
        if (err.status === 0)   return of({ kind: 'error' as const, code: 'network_error' as const });
        if (err.status === 429) return of({ kind: 'error' as const, code: 'rate_limited' as const });
        const code = err.error?.code as string | undefined;
        if (code === 'IDEMPOTENCY_KEY_REQUIRED') return of({ kind: 'error' as const, code: 'idempotency_required' as const });
        if (err.status === 400) return of({ kind: 'error' as const, code: 'validation' as const });
        return of({ kind: 'error' as const, code: 'unknown' as const });
      }),
      startWith({ kind: 'loading' as const }),
    );
  }
}
