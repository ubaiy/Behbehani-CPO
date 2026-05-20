import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type {
  AdminOrderListQueryDto,
  AdminOrderListResponseDto,
  AdminOrderStatusUpdateDto,
  AdminOrderCancelDto,
  OrderDetailDto,
  OrderSummaryDto,
} from '@behbehani-cpo/shared-types';
import { API_CONFIG } from './api-config';

@Injectable({ providedIn: 'root' })
export class AdminOrdersService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(API_CONFIG);

  private get base(): string {
    return `${this.config.baseUrl}/admin`;
  }

  /**
   * GET /v1/admin/orders — paginated, filterable order list.
   */
  listOrders(
    query: Partial<AdminOrderListQueryDto>,
  ): Observable<AdminOrderListResponseDto> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) {
        params = params.set(key, String(value));
      }
    }
    return this.http.get<AdminOrderListResponseDto>(
      `${this.base}/orders`,
      { params },
    );
  }

  /**
   * GET /v1/admin/orders/:id — full order detail with payments[].
   */
  getOrder(orderId: string): Observable<OrderDetailDto> {
    return this.http.get<OrderDetailDto>(
      `${this.base}/orders/${orderId}`,
    );
  }

  /**
   * POST /v1/admin/orders/:id/cancel — cancel an order.
   */
  cancelOrder(
    orderId: string,
    body: AdminOrderCancelDto,
  ): Observable<OrderSummaryDto> {
    return this.http.post<OrderSummaryDto>(
      `${this.base}/orders/${orderId}/cancel`,
      body,
    );
  }

  /**
   * POST /v1/admin/orders/:id/status — advance order status.
   */
  updateStatus(
    orderId: string,
    body: AdminOrderStatusUpdateDto,
  ): Observable<OrderSummaryDto> {
    return this.http.post<OrderSummaryDto>(
      `${this.base}/orders/${orderId}/status`,
      body,
    );
  }
}
