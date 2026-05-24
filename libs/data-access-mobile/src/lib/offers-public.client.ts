/**
 * OffersPublicApiClient — axios wrapper for the customer-facing offer surface.
 *
 * Endpoints (CONCIERGE_INSPECTION_API_CONTRACT.md v1.0 §3–§4):
 *   GET  /v1/public/concierge/offers/:token              → PublicOfferView
 *   POST /v1/public/concierge/offers/:token/respond      → { offerId, status, listingStockNumber? }
 *
 * IMPORTANT — auth invariant:
 *   The offer routes are NO-AUTH; they are gated by the single-use shared-link
 *   token in the path, not Bearer JWT. The axios instance passed here must NOT
 *   carry the 401-refresh interceptor — an absent Bearer token must not redirect
 *   the customer to sign-in. Same pattern as InspectionsPublicApiClient.
 *   See: apps/mobile/src/services/http.ts (offersPublicApiClient singleton).
 *
 * Cache-key conventions for react-query:
 *   ['offer', token]   — single offer view (read-only after terminal states)
 *
 * Validation:
 *   The GET response is Zod-parsed via PublicOfferViewSchema.parse — contract
 *   drift surfaces at runtime in dev builds rather than silently propagating
 *   wrong types. The POST response shape has no published shared schema, so we
 *   declare a minimal local schema and parse against it (same posture as the
 *   inline guards in the web OffersService).
 */

import type { AxiosInstance } from 'axios';
import { z } from 'zod';
import {
  PublicOfferViewSchema,
  OfferStatusSchema,
  type PublicOfferView,
  type CustomerOfferResponseDto,
} from '@behbehani-cpo/shared-types';

// ─── Local response schema (no shared-types counterpart yet) ─────────────────
// Mirrors the actual server return in offers.service.ts → submitCustomerResponse:
//   { offerId: uuid, status: OfferStatus, listingStockNumber?: string }

export const OfferRespondResponseSchema = z.object({
  offerId: z.string().uuid(),
  status: OfferStatusSchema,
  listingStockNumber: z.string().optional(),
});
export type OfferRespondResponse = z.infer<typeof OfferRespondResponseSchema>;

// ─── Client ───────────────────────────────────────────────────────────────────

export class OffersPublicApiClient {
  /**
   * @param axios A PLAIN (non-intercepted) AxiosInstance. This client must NOT
   *   trigger the 401-refresh interceptor because the offer routes are
   *   unauthenticated — they are token-gated via the path parameter, not Bearer.
   */
  constructor(private readonly axios: AxiosInstance) {}

  /**
   * Fetches the customer-facing offer view by single-use shared-link token.
   *
   * Throws AxiosError on:
   *   404 NOT_FOUND          — unknown / mismatched token
   *   410 TOKEN_EXPIRED      — publicTokenExpiresAt < now
   *   410 OFFER_WITHDRAWN    — admin pulled the offer
   *
   * Accepted / declined / countered offers come back 200 with `canRespond=false`
   * — the UI decides whether to render the picker or the read-only history card.
   */
  async getByToken(token: string): Promise<PublicOfferView> {
    const res = await this.axios.get<unknown>(
      `/v1/public/concierge/offers/${encodeURIComponent(token)}`,
    );
    return PublicOfferViewSchema.parse(res.data);
  }

  /**
   * Submits the customer's accept / decline / counter response.
   *
   * @param token   The shared-link token from the deep link / email / SMS.
   * @param action  Discriminator forwarded to the server's CustomerOfferResponseSchema.
   * @param payload Optional fields: counterAmountFils (counter), reason (decline).
   *
   * Throws AxiosError on:
   *   404 NOT_FOUND          — unknown token
   *   410 TOKEN_EXPIRED      — link expired
   *   410 OFFER_WITHDRAWN    — admin pulled it
   *   409 ALREADY_RESPONDED  — customer already responded once
   *   422 INVALID_COUNTER    — counter missing / non-positive
   *
   * On 'accept' (per §16 D5) the response includes a listingStockNumber — a
   * draft Listing is atomically created and the accepted card surfaces it.
   *
   * D1 compliance: counter is UNLIMITED rounds — callers must NOT add
   * "1 round only" / "single counter" copy at the call site.
   */
  async respond(
    token: string,
    action: 'accept' | 'decline' | 'counter',
    payload?: { counterAmountFils?: number; reason?: string; counterNotes?: string },
  ): Promise<OfferRespondResponse> {
    // Build the discriminated-union body the server expects.
    let body: CustomerOfferResponseDto;
    if (action === 'accept') {
      body = { action: 'accept' };
    } else if (action === 'decline') {
      body = payload?.reason
        ? { action: 'decline', reason: payload.reason }
        : { action: 'decline' };
    } else {
      // counter — counterAmountFils is required by the server schema.
      if (typeof payload?.counterAmountFils !== 'number') {
        throw new Error(
          'OffersPublicApiClient.respond("counter"): counterAmountFils is required',
        );
      }
      body = payload.counterNotes
        ? {
            action: 'counter',
            counterAmountFils: payload.counterAmountFils,
            counterNotes: payload.counterNotes,
          }
        : { action: 'counter', counterAmountFils: payload.counterAmountFils };
    }

    const res = await this.axios.post<unknown>(
      `/v1/public/concierge/offers/${encodeURIComponent(token)}/respond`,
      body,
    );
    return OfferRespondResponseSchema.parse(res.data);
  }
}
