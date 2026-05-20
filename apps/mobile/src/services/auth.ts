/**
 * AuthService — W1 foundation (stub-ready for W2 biometric gate).
 *
 * Endpoints consumed:
 *   POST /v1/auth/login   — email or mobile + password → AuthSession
 *   POST /v1/auth/refresh — refreshToken → AuthSession
 *
 * Token storage keys (in expo-secure-store via storage.ts):
 *   auth.accessToken          string
 *   auth.refreshToken         string
 *   auth.accessTokenExpiresAt ISO-8601 string
 *   auth.user                 JSON-encoded PublicUser
 *
 * Biometric gate:
 *   W1: stub — `requireBiometric()` resolves immediately (no-op).
 *   W2: replace stub with expo-local-authentication gate on app resume.
 *
 * NOTE: This module intentionally does NOT import httpClient (services/http.ts)
 * to avoid a circular dependency (http.ts imports auth.ts for token access).
 * The /login and /refresh calls use a raw fetch so the interceptors in http.ts
 * do not apply (they must not — refresh would infinitely recurse otherwise).
 */

import type {
  AuthSession,
  PublicUser,
  SignInWithEmailDto,
  SignInWithMobileDto,
} from '@behbehani-cpo/shared-types';
import { storage } from './storage';

// ─── Storage keys ─────────────────────────────────────────────────────────────

const KEY_ACCESS_TOKEN = 'auth.accessToken';
const KEY_REFRESH_TOKEN = 'auth.refreshToken';
const KEY_EXPIRES_AT = 'auth.accessTokenExpiresAt';
const KEY_USER = 'auth.user';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function apiBase(): string {
  const url = process.env['EXPO_PUBLIC_API_URL'];
  if (!url) {
    throw new Error('EXPO_PUBLIC_API_URL is not set. Add it to your .env.local file.');
  }
  return url.replace(/\/$/, '');
}

async function persistSession(session: AuthSession): Promise<void> {
  await Promise.all([
    storage.setItem(KEY_ACCESS_TOKEN, session.accessToken),
    storage.setItem(KEY_REFRESH_TOKEN, session.refreshToken),
    storage.setItem(KEY_EXPIRES_AT, session.accessTokenExpiresAt),
    storage.setItem(KEY_USER, JSON.stringify(session.user)),
  ]);
}

async function clearSession(): Promise<void> {
  await Promise.all([
    storage.removeItem(KEY_ACCESS_TOKEN),
    storage.removeItem(KEY_REFRESH_TOKEN),
    storage.removeItem(KEY_EXPIRES_AT),
    storage.removeItem(KEY_USER),
  ]);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Signs in with email + password OR mobile + password.
 * Persists the resulting session to secure store.
 *
 * Throws on network error or non-2xx response (message = server error body).
 */
async function signIn(
  credentials:
    | { type: 'email'; email: string; password: string }
    | { type: 'mobile'; mobile: string; password: string },
): Promise<AuthSession> {
  let body: SignInWithEmailDto | SignInWithMobileDto;

  if (credentials.type === 'email') {
    body = { email: credentials.email, password: credentials.password };
  } else {
    body = { mobile: credentials.mobile, password: credentials.password };
  }

  const response = await fetch(`${apiBase()}/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => response.statusText);
    throw new Error(text || `Login failed (${response.status})`);
  }

  const session = (await response.json()) as AuthSession;
  await persistSession(session);
  return session;
}

/**
 * Signs out the current user — clears all stored tokens.
 * No server-side revocation in W1; add DELETE /v1/auth/session in W2.
 */
async function signOut(): Promise<void> {
  await clearSession();
}

/**
 * Returns the stored access token, or null if not authenticated.
 */
async function getAccessToken(): Promise<string | null> {
  return storage.getItem(KEY_ACCESS_TOKEN);
}

/**
 * Returns true if there is a stored access token that has not yet expired.
 * Does NOT validate the token with the server — for that, rely on 401 responses.
 */
async function isAuthenticated(): Promise<boolean> {
  const token = await storage.getItem(KEY_ACCESS_TOKEN);
  if (!token) return false;

  const expiresAt = await storage.getItem(KEY_EXPIRES_AT);
  if (!expiresAt) return true; // Stored but no expiry metadata — treat as valid.

  const expiryMs = new Date(expiresAt).getTime();
  // Consider expired 30 s early to avoid race conditions on slow networks.
  return Date.now() < expiryMs - 30_000;
}

/**
 * Attempts to refresh the access token using the stored refresh token.
 * Persists the new session on success.
 * Calls signOut() and throws if the refresh token is missing or rejected.
 */
async function refreshAccessToken(): Promise<AuthSession> {
  const refreshToken = await storage.getItem(KEY_REFRESH_TOKEN);
  if (!refreshToken) {
    await signOut();
    throw new Error('No refresh token — user must sign in again.');
  }

  const response = await fetch(`${apiBase()}/v1/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    // Refresh rejected — clear session so the app falls back to sign-in.
    await signOut();
    throw new Error(`Token refresh failed (${response.status})`);
  }

  const session = (await response.json()) as AuthSession;
  await persistSession(session);
  return session;
}

/**
 * Returns the stored PublicUser, or null if not authenticated.
 */
async function getUser(): Promise<PublicUser | null> {
  const raw = await storage.getItem(KEY_USER);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PublicUser;
  } catch {
    return null;
  }
}

/**
 * Biometric gate — W1 STUB.
 *
 * In W2 this will:
 *   1. Check LocalAuthentication.hasHardwareAsync() and isEnrolledAsync().
 *   2. Prompt with authenticateAsync({ promptMessage: t('auth.biometricPrompt') }).
 *   3. Throw AuthBiometricError on failure so the app can redirect to PIN/password.
 *
 * Called from app/_layout.tsx on AppState change to 'active'.
 */
async function requireBiometric(): Promise<void> {
  // W1 stub — no-op. Replace in W2.
  return Promise.resolve();
}

/** Minimal shape that http.ts needs from a resolved session. Avoids circular import of full AuthSession. */
export type SessionShape = { accessToken: string };

export const AuthService = {
  signIn,
  signOut,
  getAccessToken,
  isAuthenticated,
  refreshAccessToken,
  getUser,
  requireBiometric,
} as const;
