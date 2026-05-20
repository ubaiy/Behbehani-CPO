/**
 * OrdersPublicApiClient — customer-facing order endpoints (Task #65 / v0.13).
 *
 * Endpoints (shipped by Session B, Day 4-7):
 *   POST /v1/public/orders                       — create reservation/order
 *   POST /v1/public/orders/:id/payment-init      — returns Otto hosted-checkout URL
 *   POST /v1/public/orders/:id/cancel            — 409 if already-processing
 *   GET  /v1/public/me/orders                    — paginated list
 *   GET  /v1/public/me/orders/:id                — detail with payments[]
 *
 * All authenticated routes go through the intercepted httpClient (auth header
 * + 401-refresh single-flight). Response bodies are Zod-validated at the boundary
 * using schemas from @behbehani-cpo/shared-types/order.public.schemas.
 *
 * MOBILE_API_CONTRACT.md v0.11 §4 (polling) + §5 (409 race) + CONCIERGE v1.4.3 §6
 * (Idempotency-Key on cancel).
 */

import type { AxiosInstance, AxiosRequestConfig } from 'axios';
import {
  CreateOrderRequestSchema,
  CreateOrderResponseSchema,
  InitiatePaymentRequestSchema,
  InitiatePaymentResponseSchema,
  OrderDetailSchema,
  OrderListResponseSchema,
  type CreateOrderRequestDto,
  type CreateOrderResponseDto,
  type InitiatePaymentRequestDto,
  type InitiatePaymentResponseDto,
  type OrderDetailDto,
  type OrderListQueryDto,
  type OrderListResponseDto,
} from '@behbehani-cpo/shared-types';

// ─── Client ───────────────────────────────────────────────────────────────────

export class OrdersPublicApiClient {
  /**
   * @param axios Intercepted AxiosInstance (httpClient). All endpoints require auth.
   */
  constructor(private readonly axios: AxiosInstance) {}

  /**
   * Lists the authenticated customer's orders (paginated, newest first).
   * GET /v1/public/me/orders?page=&pageSize=
   */
  async list(query?: Partial<OrderListQueryDto>): Promise<OrderListResponseDto> {
    const params: Record<string, number> = {
      page: query?.page ?? 1,
      pageSize: query?.pageSize ?? 20,
    };
    const res = await this.axios.get<unknown>('/v1/public/me/orders', { params });
    return OrderListResponseSchema.parse(res.data);
  }

  /**
   * Fetches a single order with embedded payments[].
   * GET /v1/public/me/orders/:id
   *
   * Used by the detail screen with react-query's refetchInterval for Otto
   * callback polling (3s for first 60s, 10s for next 5min, then stop).
   */
  async getById(id: string): Promise<OrderDetailDto> {
    const res = await this.axios.get<unknown>(
      `/v1/public/me/orders/${encodeURIComponent(id)}`,
    );
    return OrderDetailSchema.parse(res.data);
  }

  /**
   * Creates a new reservation/order from a listing.
   * POST /v1/public/orders
   *
   * NOTE: The mobile reserve wizard owns the call site; included here for
   * completeness so the client is the single source of truth.
   */
  async create(dto: CreateOrderRequestDto): Promise<CreateOrderResponseDto> {
    const payload = CreateOrderRequestSchema.parse(dto);
    const res = await this.axios.post<unknown>('/v1/public/orders', payload);
    return CreateOrderResponseSchema.parse(res.data);
  }

  /**
   * Initiates the Otto hosted-checkout flow.
   * POST /v1/public/orders/:id/payment-init
   *
   * Returns a hosted-checkout URL the caller opens in the system browser.
   * The Otto webhook redirects back to behbehani-motors://orders/:id/payment-return
   * (per app.json scheme + v0.13 fix).
   */
  async initPayment(
    id: string,
    dto: InitiatePaymentRequestDto,
  ): Promise<InitiatePaymentResponseDto> {
    const payload = InitiatePaymentRequestSchema.parse(dto);
    const res = await this.axios.post<unknown>(
      `/v1/public/orders/${encodeURIComponent(id)}/payment-init`,
      payload,
    );
    return InitiatePaymentResponseSchema.parse(res.data);
  }

  /**
   * Cancels an order. May return 409 with `error.code === 'ORDER_NOT_CANCELLABLE'`
   * if Otto has already started processing (cancel-race).
   * POST /v1/public/orders/:id/cancel
   *
   * @param id        Order UUID.
   * @param idempotencyKey  Required per CONCIERGE v1.4.3 §6 — caller generates
   *                  a uuid client-side per attempt so retries don't double-cancel.
   */
  async cancel(id: string, idempotencyKey: string): Promise<OrderDetailDto> {
    const config: AxiosRequestConfig = {
      headers: { 'Idempotency-Key': idempotencyKey },
    };
    const res = await this.axios.post<unknown>(
      `/v1/public/orders/${encodeURIComponent(id)}/cancel`,
      {},
      config,
    );
    return OrderDetailSchema.parse(res.data);
  }
}
