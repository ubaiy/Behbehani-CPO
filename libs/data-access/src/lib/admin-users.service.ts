import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type {
  AdminUserFilter,
  AdminUserListResponse,
  AdminUserDetailDto,
  AdminUserCreate,
  AdminUserCreateResponse,
  AdminUserUpdate,
  AdminUserAssignRoles,
  AdminUserLock,
  AdminUserUnlock,
  AdminUserDisable,
  AdminUserEnable,
  AdminUserResetPassword,
  AdminUserResetPasswordResponse,
} from '@behbehani-cpo/shared-types';
import { API_CONFIG } from './api-config';

@Injectable({ providedIn: 'root' })
export class AdminUsersService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(API_CONFIG);

  private get base(): string {
    return `${this.config.baseUrl}/admin/users`;
  }

  /** Fetch a paginated, filtered list of users. */
  list(filter: Partial<AdminUserFilter>): Observable<AdminUserListResponse> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filter)) {
      if (value === undefined || value === null || value === '') continue;
      if (Array.isArray(value)) {
        for (const v of value) {
          params = params.append(key, String(v));
        }
      } else {
        params = params.set(key, String(value));
      }
    }
    return this.http.get<AdminUserListResponse>(this.base, { params });
  }

  /** Fetch a single user by ID. */
  get(id: string): Observable<AdminUserDetailDto> {
    return this.http.get<AdminUserDetailDto>(`${this.base}/${id}`);
  }

  /** Create a new user (staff or customer). */
  create(dto: AdminUserCreate): Observable<AdminUserCreateResponse> {
    return this.http.post<AdminUserCreateResponse>(this.base, dto);
  }

  /** Partial-update a user's profile fields. */
  update(id: string, dto: AdminUserUpdate): Observable<AdminUserDetailDto> {
    return this.http.patch<AdminUserDetailDto>(`${this.base}/${id}`, dto);
  }

  /** Replace the full set of admin roles for a user. */
  assignRoles(id: string, dto: AdminUserAssignRoles): Observable<AdminUserDetailDto> {
    return this.http.post<AdminUserDetailDto>(`${this.base}/${id}/roles`, dto);
  }

  /** Lock a user account (prevents sign-in). */
  lock(id: string, dto: AdminUserLock): Observable<AdminUserDetailDto> {
    return this.http.post<AdminUserDetailDto>(`${this.base}/${id}/lock`, dto);
  }

  /** Unlock a previously locked account. */
  unlock(id: string, dto: AdminUserUnlock): Observable<AdminUserDetailDto> {
    return this.http.post<AdminUserDetailDto>(`${this.base}/${id}/unlock`, dto);
  }

  /** Soft-disable a user account. */
  disable(id: string, dto: AdminUserDisable): Observable<AdminUserDetailDto> {
    return this.http.post<AdminUserDetailDto>(`${this.base}/${id}/disable`, dto);
  }

  /** Re-enable a previously disabled account. */
  enable(id: string, dto: AdminUserEnable): Observable<AdminUserDetailDto> {
    return this.http.post<AdminUserDetailDto>(`${this.base}/${id}/enable`, dto);
  }

  /** Reset a user's password (generate or set manually). */
  resetPassword(
    id: string,
    dto: AdminUserResetPassword,
  ): Observable<AdminUserResetPasswordResponse> {
    return this.http.post<AdminUserResetPasswordResponse>(
      `${this.base}/${id}/reset-password`,
      dto,
    );
  }
}
