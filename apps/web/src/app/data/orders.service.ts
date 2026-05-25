import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, startWith } from 'rxjs';
import { API_CONFIG } from '@behbehani-cpo/data-access';
import {
  CreateOrderResponseSchema,
  InitiatePaymentResponseSchema,
  OrderSummarySchema,
} from '@behbehani-cpo/shared-types';
import type {
  CreateOrderRequestDto,
  CreateOrderResponseDto,
  InitiatePaymentRequestDto,
  InitiatePaymentResponseDto,
  OrderDetailDto,
  OrderListResponseDto,
  OrderSummaryDto,
} from '@behbehani-cpo/shared-types';

// ── State unions ──────────────────────────────────────────────────────────────

export type OrdersListState =
  | { kind: 'loading' }
  | { kind: 'ok'; value: OrderListResponseDto }
  | { kind: 'error'; code: string };

export type OrderDetailState =
  | { kind: 'loading' }
  | { kind: 'ok'; value: OrderDetailDto }
  | { kind: 'error'; code: string };

export type CreateOrderState =
  | { kind: 'loading' }
  | { kind: 'ok'; value: CreateOrderResponseDto }
  | { kind: 'error'; code: 'LISTING_ALREADY_RESERVED' | 'LISTING_NOT_AVAILABLE' | 'IDEMPOTENCY_KEY_REQUIRED' | 'unauthenticated' | 'network_error' | 'unknown' };

export type InitiatePaymentState =
  | { kind: 'loading' }
  | { kind: 'ok'; value: InitiatePaymentResponseDto }
  | { kind: 'error'; code: 'RESERVATION_EXPIRED' | 'PAYMENT_INIT_FAILED' | 'PAYMENT_NOT_FOUND' | 'unauthenticated' | 'network_error' | 'unknown' };

export type CancelOrderState =
  | { kind: 'loading' }
  | { kind: 'ok'; value: OrderSummaryDto }
  | { kind: 'error'; code: 'ORDER_NOT_CANCELLABLE' | 'PAYMENT_NOT_FOUND' | 'unauthenticated' | 'network_error' | 'unknown' };

// ── Helpers ───────────────────────────────────────────────────────────────────

function newIdempotencyKey(): string {
  // v1.5-D20 hot fix: `crypto.randomUUID()` requires a SECURE CONTEXT (HTTPS).
  // On plain HTTP deployments (e.g. http://3.122.54.102), `crypto` is defined
  // but `randomUUID` is NOT — so `crypto?.randomUUID()` would call undefined()
  // and throw TypeError. Use the optional-call form `?.()` to short-circuit
  // when the method itself is absent, then fall back to a Math.random key.
  return globalThis.crypto?.randomUUID?.() ?? `idem-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function idempotencyHeaders(): HttpHeaders {
  return new HttpHeaders({ 'Idempotency-Key': newIdempotencyKey() });
}

// ─────────────────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class OrdersService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(API_CONFIG);

  private baseUrl(): string {
    return `${this.config.baseUrl}/public/me/orders`;
  }

  private ordersUrl(): string {
    return `${this.config.baseUrl}/public/orders`;
  }

  list(page = 1, pageSize = 20): Observable<OrdersListState> {
    const params = new HttpParams()
      .set('page', String(page))
      .set('pageSize', String(pageSize));

    return this.http
      .get<OrderListResponseDto>(this.baseUrl(), { params })
      .pipe(
        map((value) => ({ kind: 'ok' as const, value })),
        catchError((err: HttpErrorResponse) => {
          const code = (err.error?.code as string | undefined) ?? 'UNKNOWN_ERROR';
          return of({ kind: 'error' as const, code });
        }),
        startWith({ kind: 'loading' as const }),
      );
  }

  getDetail(id: string): Observable<OrderDetailState> {
    return this.http
      .get<OrderDetailDto>(`${this.baseUrl()}/${encodeURIComponent(id)}`)
      .pipe(
        map((value) => ({ kind: 'ok' as const, value })),
        catchError((err: HttpErrorResponse) => {
          const code = (err.error?.code as string | undefined) ?? 'UNKNOWN_ERROR';
          return of({ kind: 'error' as const, code });
        }),
        startWith({ kind: 'loading' as const }),
      );
  }

  create(req: CreateOrderRequestDto): Observable<CreateOrderState> {
    return this.http
      .post<CreateOrderResponseDto>(this.ordersUrl(), req, { headers: idempotencyHeaders() })
      .pipe(
        map((raw) => {
          try {
            const value = CreateOrderResponseSchema.parse(raw);
            return { kind: 'ok' as const, value };
          } catch {
            return { kind: 'error' as const, code: 'network_error' as const };
          }
        }),
        catchError((err: HttpErrorResponse) => {
          if (err.status === 401) return of({ kind: 'error' as const, code: 'unauthenticated' as const });
          if (err.status === 0)   return of({ kind: 'error' as const, code: 'network_error' as const });
          const code = err.error?.code as string | undefined;
          if (code === 'LISTING_ALREADY_RESERVED') return of({ kind: 'error' as const, code: 'LISTING_ALREADY_RESERVED' as const });
          if (code === 'LISTING_NOT_AVAILABLE')    return of({ kind: 'error' as const, code: 'LISTING_NOT_AVAILABLE' as const });
          if (code === 'IDEMPOTENCY_KEY_REQUIRED') return of({ kind: 'error' as const, code: 'IDEMPOTENCY_KEY_REQUIRED' as const });
          return of({ kind: 'error' as const, code: 'unknown' as const });
        }),
        startWith({ kind: 'loading' as const }),
      );
  }

  initiatePayment(orderId: string, req: InitiatePaymentRequestDto): Observable<InitiatePaymentState> {
    const url = `${this.ordersUrl()}/${encodeURIComponent(orderId)}/payment`;
    return this.http
      .post<InitiatePaymentResponseDto>(url, req, { headers: idempotencyHeaders() })
      .pipe(
        map((raw) => {
          try {
            const value = InitiatePaymentResponseSchema.parse(raw);
            return { kind: 'ok' as const, value };
          } catch {
            return { kind: 'error' as const, code: 'network_error' as const };
          }
        }),
        catchError((err: HttpErrorResponse) => {
          if (err.status === 401) return of({ kind: 'error' as const, code: 'unauthenticated' as const });
          if (err.status === 0)   return of({ kind: 'error' as const, code: 'network_error' as const });
          const code = err.error?.code as string | undefined;
          if (code === 'RESERVATION_EXPIRED')  return of({ kind: 'error' as const, code: 'RESERVATION_EXPIRED' as const });
          if (code === 'PAYMENT_INIT_FAILED')  return of({ kind: 'error' as const, code: 'PAYMENT_INIT_FAILED' as const });
          if (code === 'PAYMENT_NOT_FOUND')    return of({ kind: 'error' as const, code: 'PAYMENT_NOT_FOUND' as const });
          return of({ kind: 'error' as const, code: 'unknown' as const });
        }),
        startWith({ kind: 'loading' as const }),
      );
  }

  cancel(orderId: string): Observable<CancelOrderState> {
    const url = `${this.ordersUrl()}/${encodeURIComponent(orderId)}/cancel`;
    return this.http
      .post<OrderSummaryDto>(url, {})
      .pipe(
        map((raw) => {
          try {
            const value = OrderSummarySchema.parse(raw);
            return { kind: 'ok' as const, value };
          } catch {
            return { kind: 'error' as const, code: 'network_error' as const };
          }
        }),
        catchError((err: HttpErrorResponse) => {
          if (err.status === 401) return of({ kind: 'error' as const, code: 'unauthenticated' as const });
          if (err.status === 0)   return of({ kind: 'error' as const, code: 'network_error' as const });
          const code = err.error?.code as string | undefined;
          if (code === 'ORDER_NOT_CANCELLABLE') return of({ kind: 'error' as const, code: 'ORDER_NOT_CANCELLABLE' as const });
          if (code === 'PAYMENT_NOT_FOUND')     return of({ kind: 'error' as const, code: 'PAYMENT_NOT_FOUND' as const });
          return of({ kind: 'error' as const, code: 'unknown' as const });
        }),
        startWith({ kind: 'loading' as const }),
      );
  }
}
