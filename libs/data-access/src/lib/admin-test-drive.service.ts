import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type {
  AssignTestDriveBookingInput,
  TestDriveBookingDto,
  TestDriveBookingListFilter,
  TestDriveBookingListResponse,
  UpdateTestDriveBookingInput,
} from '../../../shared/types/src/lib/admin-test-drive.schemas';
import { API_CONFIG } from './api-config';

@Injectable({ providedIn: 'root' })
export class AdminTestDriveService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(API_CONFIG);

  private get base(): string {
    return `${this.config.baseUrl}/admin`;
  }

  /**
   * GET /v1/admin/test-drive-bookings — paginated, filterable list with status counts.
   */
  listBookings(
    query: Partial<TestDriveBookingListFilter>,
  ): Observable<TestDriveBookingListResponse> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) {
        params = params.set(key, String(value));
      }
    }
    return this.http.get<TestDriveBookingListResponse>(
      `${this.base}/test-drive-bookings`,
      { params },
    );
  }

  /**
   * GET /v1/admin/test-drive-bookings/:id — single booking detail.
   */
  getBooking(id: string): Observable<TestDriveBookingDto> {
    return this.http.get<TestDriveBookingDto>(
      `${this.base}/test-drive-bookings/${id}`,
    );
  }

  /**
   * PATCH /v1/admin/test-drive-bookings/:id — update status + scheduledAt + adminNotes.
   */
  updateBooking(
    id: string,
    body: UpdateTestDriveBookingInput,
  ): Observable<TestDriveBookingDto> {
    return this.http.patch<TestDriveBookingDto>(
      `${this.base}/test-drive-bookings/${id}`,
      body,
    );
  }

  /**
   * POST /v1/admin/test-drive-bookings/:id/assign — assign to a staff user.
   */
  assignBooking(
    id: string,
    body: AssignTestDriveBookingInput,
  ): Observable<TestDriveBookingDto> {
    return this.http.post<TestDriveBookingDto>(
      `${this.base}/test-drive-bookings/${id}/assign`,
      body,
    );
  }
}
