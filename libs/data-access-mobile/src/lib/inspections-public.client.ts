/**
 * InspectionsPublicApiClient — placeholder for concierge inspection-sign endpoints.
 *
 * TODO (W2 / storefront-session dependency):
 *   Pending confirmation from storefront session that the following endpoints are shipped:
 *     GET  /v1/public/inspection-sign/:token  — fetch inspection details by single-use token
 *     POST /v1/public/inspection-sign/:token  — submit customer signature
 *
 *   Per ARCHITECTURE.md §11 Risk #5: "confirm the storefront session has shipped (or is
 *   shipping) these endpoints; otherwise mobile cannot render this flow and the
 *   universal-link entry in app.json is dead weight."
 *
 * IMPORTANT: The inspection-sign route is NO-AUTH. The axios instance passed here
 * must NOT have the 401-refresh interceptor attached (or the request config must set
 * skipAuthRefresh: true). Using the intercepted instance with an expired/absent token
 * would redirect to sign-in, which would break the unauthenticated signing flow.
 * See: apps/mobile/app/inspection-sign/[token].tsx for the route-level comment.
 */

import type { AxiosInstance } from 'axios';

// ─── Placeholder types (replace with shared-types imports once schemas land) ──

export interface InspectionSignTokenResponse {
  /** Inspection report ID */
  id: string;
  /** Human-readable customer name for the signature screen */
  customerName: string;
  /** Vehicle summary string, e.g. "2021 Toyota Camry" */
  vehicleSummary: string;
  /** Whether the token has already been used (signatures submitted) */
  completed: boolean;
  /** ISO-8601 expiry for the signing link */
  expiresAt: string;
}

export interface SubmitSignatureDto {
  /**
   * Base64-encoded PNG of the drawn signature, max 500 KB decoded.
   * Must be validated on the client before sending.
   */
  signaturePng: string;
  /** How the signature was collected */
  signatureMethod: 'drawn' | 'typed';
  /** Customer-typed name (required when signatureMethod === 'typed') */
  typedName?: string;
}

export interface SubmitSignatureResponse {
  success: boolean;
  signedAt: string; // ISO-8601
}

// ─── Client ───────────────────────────────────────────────────────────────────

export class InspectionsPublicApiClient {
  /**
   * @param axios A PLAIN (non-intercepted) AxiosInstance. This client must NOT
   *   trigger the 401-refresh interceptor because the inspection-sign route is
   *   unauthenticated — it is token-gated via the path parameter, not Bearer auth.
   */
  constructor(private readonly axios: AxiosInstance) {}

  /**
   * Fetches inspection details for the signature screen.
   * Uses a single-use token from the deep link (behbehani-cpo://inspection-sign/:token).
   *
   * TODO: Add Zod parse once shared-types inspection-sign schemas are published
   *   by the storefront session (MOBILE_API_CONTRACT.md §1.6 / §13 dependency).
   */
  async getSignToken(token: string): Promise<InspectionSignTokenResponse> {
    const res = await this.axios.get<InspectionSignTokenResponse>(
      `/v1/public/inspection-sign/${encodeURIComponent(token)}`,
    );
    // TODO: Replace cast with Zod schema.parse(res.data) once schema is in shared-types
    return res.data;
  }

  /**
   * Submits the customer's drawn or typed signature.
   *
   * NOTE: Validates PNG size before sending — server rejects > 500 KB.
   * The signature pad in the UI should downsample before calling this method.
   */
  async submitSignature(
    token: string,
    dto: SubmitSignatureDto,
  ): Promise<SubmitSignatureResponse> {
    // Guard: roughly estimate base64 size (4/3 ratio) before network call.
    const estimatedBytes = (dto.signaturePng.length * 3) / 4;
    if (estimatedBytes > 500 * 1024) {
      throw new Error(
        `Signature PNG exceeds 500 KB limit (estimated ${Math.round(estimatedBytes / 1024)} KB). Downsample before submitting.`,
      );
    }

    const res = await this.axios.post<SubmitSignatureResponse>(
      `/v1/public/inspection-sign/${encodeURIComponent(token)}`,
      dto,
    );
    // TODO: Replace cast with Zod schema.parse(res.data) once schema is in shared-types
    return res.data;
  }
}
