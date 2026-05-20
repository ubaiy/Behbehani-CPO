import { InjectionToken } from '@angular/core';

export interface ApiConfig {
  /** Base URL of the platform API, e.g. http://localhost:3000/v1 */
  baseUrl: string;

  /**
   * Where to redirect when a 401 hits the auth interceptor.
   *
   * - String form: a single absolute path. Use for the admin app where the
   *   sign-in route is locale-agnostic (e.g. `'/auth/sign-in'`).
   * - Function form: derived per-request. Use for the web storefront where the
   *   sign-in route is locale-prefixed (`/en/auth/sign-in`, `/ar/auth/sign-in`).
   *   The function receives the current browser pathname so it can extract the
   *   locale segment.
   *
   * Defaults to `'/sign-in'` if omitted (current Sprint 0 placeholder).
   */
  signInPath?: string | ((currentPathname: string) => string);
}

export const API_CONFIG = new InjectionToken<ApiConfig>('API_CONFIG');
