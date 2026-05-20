import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { catchError, map, Observable, of, tap, throwError } from 'rxjs';
import type {
  AuthSession,
  PublicUser,
  RefreshDto,
  RegisterWithEmailDto,
  SignInWithEmailDto,
  SignInWithMobileDto,
} from '@behbehani-cpo/shared-types';
import { API_CONFIG } from './api-config';

// ── Discriminated result types (v1.2 locked error codes) ─────────────────────

export type IssueOtpResult =
  | { kind: 'ok'; otpId: string; expiresAt: string }
  | { kind: 'rate_limited' }
  | { kind: 'network_error' };

export type VerifyOtpResult =
  | { kind: 'ok'; session: AuthSession; user: PublicUser }
  | { kind: 'not_found' }
  | { kind: 'expired' }
  | { kind: 'locked' }
  | { kind: 'incorrect' }
  | { kind: 'already_used' }
  | { kind: 'network_error' };

export type GoogleSignInResult =
  | { kind: 'ok'; session: AuthSession; user: PublicUser; isNewAccount: boolean }
  | { kind: 'invalid_token' }
  | { kind: 'expired_token' }
  | { kind: 'email_taken_non_google' }
  | { kind: 'network_error' };

// ─────────────────────────────────────────────────────────────────────────────

const ACCESS_KEY = 'cpo.auth.access';
const REFRESH_KEY = 'cpo.auth.refresh';
const USER_KEY = 'cpo.auth.user';
const EXPIRES_KEY = 'cpo.auth.expires';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(API_CONFIG);

  private readonly _user = signal<PublicUser | null>(this.readStoredUser());
  private readonly _accessTokenExpiresAt = signal<string | null>(this.readStored(EXPIRES_KEY));

  readonly user = this._user.asReadonly();
  readonly isSignedIn = computed(() => this._user() !== null);

  /**
   * ISO-8601 expiry timestamp of the current access token, or null when signed
   * out. Persisted across page loads via localStorage.
   */
  readonly accessTokenExpiresAt = this._accessTokenExpiresAt.asReadonly();

  /**
   * True when the stored access token has passed its expiry time.
   * Defaults to false in SSR (no Date access needed server-side).
   */
  readonly isTokenExpired = computed(() => {
    const exp = this._accessTokenExpiresAt();
    if (!exp) return false;
    try {
      return Date.now() >= new Date(exp).getTime();
    } catch {
      return false;
    }
  });

  signInWithEmail(dto: SignInWithEmailDto): Observable<AuthSession> {
    return this.http
      .post<AuthSession>(`${this.config.baseUrl}/auth/login`, dto)
      .pipe(tap((s) => this.persist(s)));
  }

  signInWithMobile(dto: SignInWithMobileDto): Observable<AuthSession> {
    return this.http
      .post<AuthSession>(`${this.config.baseUrl}/auth/login`, dto)
      .pipe(tap((s) => this.persist(s)));
  }

  refresh(): Observable<AuthSession | null> {
    const refreshToken = this.readStored(REFRESH_KEY);
    if (!refreshToken) return of(null);
    const dto: RefreshDto = { refreshToken };
    return this.http
      .post<AuthSession>(`${this.config.baseUrl}/auth/refresh`, dto)
      .pipe(
        tap((s) => this.persist(s)),
        catchError((err) => {
          this.signOut();
          return throwError(() => err);
        }),
      );
  }

  signOut(): Observable<void> {
    this.clear();
    return of(undefined).pipe(map(() => undefined));
  }

  readAccessToken(): string | null {
    return this.readStored(ACCESS_KEY);
  }

  readRefreshToken(): string | null {
    return this.readStored(REFRESH_KEY);
  }

  /**
   * Register a new account (POST /auth/register).
   * Returns only the created-user subset; the caller is responsible for
   * following up with signInWithEmail() to obtain an active session.
   *
   * 409 Conflict is propagated as-is so the sign-up modal can surface the
   * "already registered — sign in instead" message.
   */
  signUp(dto: RegisterWithEmailDto): Observable<{ id: string; email: string; fullName: string }> {
    return this.http.post<{ id: string; email: string; fullName: string }>(
      `${this.config.baseUrl}/auth/register`,
      dto,
    );
  }

  /**
   * Merge a partial update into the cached current-user signal + localStorage.
   * Used when an admin edits THEIR OWN profile so the sidebar avatar / name
   * reflect the change immediately without forcing a sign-out + sign-in.
   *
   * No-op if no user is signed in.
   */
  patchUser(partial: Partial<PublicUser>): void {
    const current = this._user();
    if (!current) return;
    const next = { ...current, ...partial } as PublicUser;
    this.writeStored(USER_KEY, JSON.stringify(next));
    this._user.set(next);
  }

  // ── v1.2 methods ────────────────────────────────────────────────────────────

  issueOtp(
    identifier: string,
    channel: string,
    purpose: string,
  ): Observable<IssueOtpResult> {
    return this.http
      .post<{ otpId: string; expiresAt: string }>(
        `${this.config.baseUrl}/auth/otp/issue`,
        { identifier, channel, purpose },
      )
      .pipe(
        map((res) => ({ kind: 'ok' as const, otpId: res.otpId, expiresAt: res.expiresAt })),
        catchError((err: HttpErrorResponse) => {
          if (err.status === 0) return of({ kind: 'network_error' as const });
          const code = err.error?.code as string | undefined;
          if (err.status === 429 || code === 'OTP_RATE_LIMITED')
            return of({ kind: 'rate_limited' as const });
          return of({ kind: 'network_error' as const });
        }),
      );
  }

  verifyOtp(
    identifier: string,
    channel: string,
    purpose: string,
    code: string,
  ): Observable<VerifyOtpResult> {
    return this.http
      .post<{ session: AuthSession; user: PublicUser }>(
        `${this.config.baseUrl}/auth/otp/verify`,
        { identifier, channel, purpose, code },
      )
      .pipe(
        map((res) => {
          this.persist(res.session);
          return { kind: 'ok' as const, session: res.session, user: res.user };
        }),
        catchError((err: HttpErrorResponse) => {
          if (err.status === 0) return of({ kind: 'network_error' as const });
          const errorCode = err.error?.code as string | undefined;
          if (errorCode === 'OTP_NOT_FOUND' || err.status === 404)
            return of({ kind: 'not_found' as const });
          if (errorCode === 'OTP_EXPIRED') return of({ kind: 'expired' as const });
          if (errorCode === 'OTP_LOCKED' || err.status === 429)
            return of({ kind: 'locked' as const });
          if (errorCode === 'OTP_INCORRECT') return of({ kind: 'incorrect' as const });
          if (errorCode === 'OTP_ALREADY_USED' || err.status === 409)
            return of({ kind: 'already_used' as const });
          return of({ kind: 'network_error' as const });
        }),
      );
  }

  signInWithGoogle(idToken: string): Observable<GoogleSignInResult> {
    return this.http
      .post<{ session: AuthSession; user: PublicUser }>(
        `${this.config.baseUrl}/auth/google/verify`,
        { idToken },
        { observe: 'response' },
      )
      .pipe(
        map((res) => {
          const body = res.body!;
          this.persist(body.session);
          return {
            kind: 'ok' as const,
            session: body.session,
            user: body.user,
            isNewAccount: res.status === 201,
          };
        }),
        catchError((err: HttpErrorResponse) => {
          if (err.status === 0) return of({ kind: 'network_error' as const });
          const errorCode = err.error?.code as string | undefined;
          if (errorCode === 'TOKEN_EXPIRED') return of({ kind: 'expired_token' as const });
          if (errorCode === 'EMAIL_TAKEN_NON_GOOGLE' || err.status === 409)
            return of({ kind: 'email_taken_non_google' as const });
          if (
            errorCode === 'INVALID_TOKEN' ||
            errorCode === 'TOKEN_INVALID' ||
            err.status === 401
          )
            return of({ kind: 'invalid_token' as const });
          return of({ kind: 'network_error' as const });
        }),
      );
  }

  // ────────────────────────────────────────────────────────────────────────────

  private persist(session: AuthSession): void {
    this.writeStored(ACCESS_KEY, session.accessToken);
    this.writeStored(REFRESH_KEY, session.refreshToken);
    this.writeStored(USER_KEY, JSON.stringify(session.user));
    this.writeStored(EXPIRES_KEY, session.accessTokenExpiresAt);
    this._user.set(session.user);
    this._accessTokenExpiresAt.set(session.accessTokenExpiresAt);
  }

  private clear(): void {
    this.removeStored(ACCESS_KEY);
    this.removeStored(REFRESH_KEY);
    this.removeStored(USER_KEY);
    this.removeStored(EXPIRES_KEY);
    this._user.set(null);
    this._accessTokenExpiresAt.set(null);
  }

  private readStoredUser(): PublicUser | null {
    const raw = this.readStored(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as PublicUser;
    } catch {
      return null;
    }
  }

  private readStored(key: string): string | null {
    if (typeof localStorage === 'undefined') return null;
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  private writeStored(key: string, value: string): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(key, value);
    } catch {
      // ignore
    }
  }

  private removeStored(key: string): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  }
}
