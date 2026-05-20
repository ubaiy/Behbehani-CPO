import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { API_CONFIG } from '@behbehani-cpo/data-access';
import { AuthService } from '@behbehani-cpo/data-access';
import type { PublicUser } from '@behbehani-cpo/shared-types';
import type { OtpInitiateResponseDto } from '@behbehani-cpo/shared-types';

// ─── Result unions (v1.3.5 §1) ───────────────────────────────────────────────

export type UpdateProfileResult =
  | { kind: 'ok'; user: PublicUser }
  | { kind: 'validation_error'; message: string }
  | { kind: 'unauthenticated' }
  | { kind: 'network_error' };

export type InitiateChangeResult =
  | { kind: 'ok'; otpId: string; expiresAt: string }
  | { kind: 'validation_error'; message: string }
  | { kind: 'otp_rate_limited' }
  | { kind: 'unauthenticated' }
  | { kind: 'network_error' };

export type VerifyChangeResult =
  | { kind: 'ok'; user: PublicUser }
  | { kind: 'otp_incorrect' }
  | { kind: 'validation_error'; message: string }
  | { kind: 'unauthenticated' }
  | { kind: 'network_error' };

export type ChangePasswordResult =
  | { kind: 'ok' }
  | { kind: 'validation_error'; message: string }
  | { kind: 'unauthenticated' }
  | { kind: 'network_error' };

// ─────────────────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class MeAccountService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(API_CONFIG);
  private readonly auth = inject(AuthService);

  private get base(): string {
    return `${this.config.baseUrl}/public/me`;
  }

  /**
   * PATCH /v1/public/me/profile
   * On success, patches the AuthService user signal so the app re-renders.
   */
  updateProfile(dto: {
    fullName?: string;
    locale?: 'en' | 'ar';
    avatarUrl?: string | null;
  }): Observable<UpdateProfileResult> {
    return this.http.patch<PublicUser>(`${this.base}/profile`, dto).pipe(
      tap((user) => this.auth.patchUser(user)),
      map((user) => ({ kind: 'ok' as const, user })),
      catchError((err: HttpErrorResponse) => this.mapCommon(err)),
    );
  }

  /**
   * POST /v1/public/me/email → 202 {otpId, expiresAt}
   */
  initiateEmailChange(newEmail: string): Observable<InitiateChangeResult> {
    return this.http
      .post<OtpInitiateResponseDto>(`${this.base}/email`, { newEmail })
      .pipe(
        map((res) => ({ kind: 'ok' as const, otpId: res.otpId, expiresAt: res.expiresAt })),
        catchError((err: HttpErrorResponse) => this.mapInitiate(err)),
      );
  }

  /**
   * POST /v1/public/me/email/verify → PublicUser
   * On success, patches the AuthService user signal.
   */
  verifyEmailChange(newEmail: string, code: string): Observable<VerifyChangeResult> {
    return this.http
      .post<PublicUser>(`${this.base}/email/verify`, { newEmail, code })
      .pipe(
        tap((user) => this.auth.patchUser(user)),
        map((user) => ({ kind: 'ok' as const, user })),
        catchError((err: HttpErrorResponse) => this.mapVerify(err)),
      );
  }

  /**
   * POST /v1/public/me/mobile → 202 {otpId, expiresAt}
   */
  initiateMobileChange(newMobile: string): Observable<InitiateChangeResult> {
    return this.http
      .post<OtpInitiateResponseDto>(`${this.base}/mobile`, { newMobile })
      .pipe(
        map((res) => ({ kind: 'ok' as const, otpId: res.otpId, expiresAt: res.expiresAt })),
        catchError((err: HttpErrorResponse) => this.mapInitiate(err)),
      );
  }

  /**
   * POST /v1/public/me/mobile/verify → PublicUser
   * On success, patches the AuthService user signal.
   */
  verifyMobileChange(newMobile: string, code: string): Observable<VerifyChangeResult> {
    return this.http
      .post<PublicUser>(`${this.base}/mobile/verify`, { newMobile, code })
      .pipe(
        tap((user) => this.auth.patchUser(user)),
        map((user) => ({ kind: 'ok' as const, user })),
        catchError((err: HttpErrorResponse) => this.mapVerify(err)),
      );
  }

  /**
   * POST /v1/public/me/password → 204 (no body)
   * `currentPassword` required iff hasPassword === true (caller responsibility).
   */
  changePassword(dto: {
    currentPassword?: string;
    newPassword: string;
  }): Observable<ChangePasswordResult> {
    return this.http
      .post<void>(`${this.base}/password`, dto, { observe: 'response' })
      .pipe(
        map(() => ({ kind: 'ok' as const })),
        catchError((err: HttpErrorResponse) => {
          if (err.status === 0) return of({ kind: 'network_error' as const });
          if (err.status === 401) return of({ kind: 'unauthenticated' as const });
          const msg = err.error?.message as string | undefined;
          return of({ kind: 'validation_error' as const, message: msg ?? 'Password change failed' });
        }),
      );
  }

  // ─── Private error mappers ──────────────────────────────────────────────────

  private mapCommon(err: HttpErrorResponse): Observable<UpdateProfileResult> {
    if (err.status === 0) return of({ kind: 'network_error' as const });
    if (err.status === 401) return of({ kind: 'unauthenticated' as const });
    const msg = err.error?.message as string | undefined;
    return of({ kind: 'validation_error' as const, message: msg ?? 'Request failed' });
  }

  private mapInitiate(err: HttpErrorResponse): Observable<InitiateChangeResult> {
    if (err.status === 0) return of({ kind: 'network_error' as const });
    if (err.status === 401) return of({ kind: 'unauthenticated' as const });
    if (err.status === 429) return of({ kind: 'otp_rate_limited' as const });
    const code = err.error?.code as string | undefined;
    if (code === 'OTP_RATE_LIMITED') return of({ kind: 'otp_rate_limited' as const });
    const msg = err.error?.message as string | undefined;
    return of({ kind: 'validation_error' as const, message: msg ?? 'Request failed' });
  }

  private mapVerify(err: HttpErrorResponse): Observable<VerifyChangeResult> {
    if (err.status === 0) return of({ kind: 'network_error' as const });
    if (err.status === 401) {
      const code = err.error?.code as string | undefined;
      if (code === 'ME_OTP_INVALID') return of({ kind: 'otp_incorrect' as const });
      return of({ kind: 'unauthenticated' as const });
    }
    const msg = err.error?.message as string | undefined;
    return of({ kind: 'validation_error' as const, message: msg ?? 'Verification failed' });
  }
}
