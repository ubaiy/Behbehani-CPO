/**
 * auth.interceptor — 401 redirect behaviour, SSR safety, loop guard.
 *
 * Uses TestBed with provideHttpClient(withInterceptors([authInterceptor])) +
 * HttpTestingController so we can assert real Request/Response flow through
 * the interceptor. AuthService, Router and PLATFORM_ID are stubbed.
 */

import { HttpClient, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';

import { API_CONFIG, ApiConfig } from './api-config';
import { AuthService } from './auth.service';
import { authInterceptor } from './auth.interceptor';

// ─── Stubs ──────────────────────────────────────────────────────────────────

class AuthStub {
  readAccessToken = jest.fn<string | null, []>(() => 'jwt-token');
  signOut = jest.fn(() => of(undefined));
}

class RouterStub {
  navigateByUrl = jest.fn();
}

const BASE = 'http://api.local/v1';

interface SetupOptions {
  signInPath?: ApiConfig['signInPath'];
  platformId?: object | string;
  pathname?: string;
  search?: string;
  token?: string | null;
}

// JSDOM allows assigning to window.location.href (it performs an internal
// navigation), and the resulting Location object reflects the new pathname
// and search. Use that — it's the only reliable way to mutate location in
// JSDOM without monkey-patching non-configurable own properties.
function patchLocation(pathname: string, search: string) {
  // Use a synthetic origin so the URL parses; the interceptor only reads
  // pathname + search so anything well-formed works.
  window.history.replaceState({}, '', `${pathname}${search}`);
}

function setup(opts: SetupOptions = {}) {
  const { signInPath, platformId = 'browser', pathname = '/admin/dashboard', search = '', token = 'jwt-token' } = opts;

  patchLocation(pathname, search);

  const auth = new AuthStub();
  if (token === null) auth.readAccessToken.mockReturnValue(null);
  else auth.readAccessToken.mockReturnValue(token);
  const router = new RouterStub();

  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(withInterceptors([authInterceptor])),
      provideHttpClientTesting(),
      { provide: AuthService, useValue: auth },
      { provide: Router, useValue: router },
      { provide: API_CONFIG, useValue: { baseUrl: BASE, signInPath } as ApiConfig },
      { provide: PLATFORM_ID, useValue: platformId },
    ],
  });

  const http = TestBed.inject(HttpClient);
  const httpMock = TestBed.inject(HttpTestingController);
  return { auth, router, http, httpMock };
}

afterEach(() => {
  TestBed.resetTestingModule();
});

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('authInterceptor — 401 on /auth/login (credentials error)', () => {
  it('does NOT call signOut or navigate on 401 from /auth/login', () => {
    const { auth, router, http, httpMock } = setup();

    http.post(`${BASE}/auth/login`, {}).subscribe({
      next: () => {
        /* not expected */
      },
      error: (err: HttpErrorResponse) => {
        expect(err.status).toBe(401);
      },
    });

    const req = httpMock.expectOne(`${BASE}/auth/login`);
    req.flush({ error: 'Invalid credentials' }, { status: 401, statusText: 'Unauthorized' });

    expect(auth.signOut).not.toHaveBeenCalled();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
    httpMock.verify();
  });
});

describe('authInterceptor — 401 on other admin endpoints', () => {
  it('signs out AND navigates to sign-in with returnUrl', () => {
    const { auth, router, http, httpMock } = setup({
      signInPath: '/auth/sign-in',
      pathname: '/admin/users',
      search: '?status=active',
    });

    http.get(`${BASE}/admin/users`).subscribe({
      next: () => undefined,
      error: () => undefined,
    });

    const req = httpMock.expectOne(`${BASE}/admin/users`);
    req.flush({ error: 'expired' }, { status: 401, statusText: 'Unauthorized' });

    expect(auth.signOut).toHaveBeenCalledTimes(1);
    expect(router.navigateByUrl).toHaveBeenCalledTimes(1);
    const target = router.navigateByUrl.mock.calls[0][0] as string;
    expect(target).toContain('/auth/sign-in');
    expect(target).toContain(`returnUrl=${encodeURIComponent('/admin/users?status=active')}`);
    httpMock.verify();
  });

  it('does not navigate or signOut on non-401 errors', () => {
    const { auth, router, http, httpMock } = setup();

    http.get(`${BASE}/admin/users`).subscribe({
      next: () => undefined,
      error: (err: HttpErrorResponse) => expect(err.status).toBe(500),
    });

    httpMock
      .expectOne(`${BASE}/admin/users`)
      .flush({ error: 'boom' }, { status: 500, statusText: 'Internal Server Error' });

    expect(auth.signOut).not.toHaveBeenCalled();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
    httpMock.verify();
  });
});

describe('authInterceptor — external URLs', () => {
  it('bypasses the catchError block on external URLs even when 401 returned', () => {
    const { auth, router, http, httpMock } = setup();

    // External URL (not starting with baseUrl) — no Authorization added, no signOut.
    http.put('https://s3.amazonaws.com/bucket/key', new Blob()).subscribe({
      next: () => undefined,
      error: () => undefined,
    });

    const req = httpMock.expectOne('https://s3.amazonaws.com/bucket/key');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(auth.signOut).not.toHaveBeenCalled();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
    httpMock.verify();
  });
});

describe('authInterceptor — signInPath resolution', () => {
  it('string form is used verbatim', () => {
    const { router, http, httpMock } = setup({
      signInPath: '/admin/auth/sign-in',
      pathname: '/admin/users',
    });

    http.get(`${BASE}/admin/users`).subscribe({ next: () => undefined, error: () => undefined });
    httpMock
      .expectOne(`${BASE}/admin/users`)
      .flush({}, { status: 401, statusText: 'Unauthorized' });

    const target = router.navigateByUrl.mock.calls[0][0] as string;
    expect(target.startsWith('/admin/auth/sign-in?')).toBe(true);
    httpMock.verify();
  });

  it('function form is called with the current pathname and its return value is used', () => {
    const signInPath = jest.fn((p: string) => `/${p.split('/')[1]}/auth/sign-in`);
    const { router, http, httpMock } = setup({
      signInPath,
      pathname: '/ar/dashboard',
    });

    http.get(`${BASE}/admin/users`).subscribe({ next: () => undefined, error: () => undefined });
    httpMock
      .expectOne(`${BASE}/admin/users`)
      .flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(signInPath).toHaveBeenCalledWith('/ar/dashboard');
    const target = router.navigateByUrl.mock.calls[0][0] as string;
    expect(target.startsWith('/ar/auth/sign-in?')).toBe(true);
    httpMock.verify();
  });

  it('defaults to /sign-in when signInPath is not configured', () => {
    const { router, http, httpMock } = setup({
      signInPath: undefined,
      pathname: '/admin/users',
    });

    http.get(`${BASE}/admin/users`).subscribe({ next: () => undefined, error: () => undefined });
    httpMock
      .expectOne(`${BASE}/admin/users`)
      .flush({}, { status: 401, statusText: 'Unauthorized' });

    const target = router.navigateByUrl.mock.calls[0][0] as string;
    expect(target.startsWith('/sign-in?')).toBe(true);
    httpMock.verify();
  });
});

describe('authInterceptor — SSR safety', () => {
  it('does NOT navigate when running on the server (PLATFORM_ID != browser), but DOES still signOut', () => {
    const { auth, router, http, httpMock } = setup({
      signInPath: '/auth/sign-in',
      pathname: '/admin/users',
      platformId: 'server',
    });

    http.get(`${BASE}/admin/users`).subscribe({ next: () => undefined, error: () => undefined });
    httpMock
      .expectOne(`${BASE}/admin/users`)
      .flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(auth.signOut).toHaveBeenCalledTimes(1);
    expect(router.navigateByUrl).not.toHaveBeenCalled();
    httpMock.verify();
  });
});

describe('authInterceptor — loop guard', () => {
  it('does not redirect when already on a sign-in page (path ends with /auth/sign-in)', () => {
    const { router, http, httpMock } = setup({
      signInPath: '/auth/sign-in',
      pathname: '/en/auth/sign-in',
    });

    http.get(`${BASE}/admin/users`).subscribe({ next: () => undefined, error: () => undefined });
    httpMock
      .expectOne(`${BASE}/admin/users`)
      .flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(router.navigateByUrl).not.toHaveBeenCalled();
    httpMock.verify();
  });

  it('does not redirect when pathname is exactly the resolved signInPath', () => {
    const { router, http, httpMock } = setup({
      signInPath: '/admin/auth/sign-in',
      pathname: '/admin/auth/sign-in',
    });

    http.get(`${BASE}/admin/users`).subscribe({ next: () => undefined, error: () => undefined });
    httpMock
      .expectOne(`${BASE}/admin/users`)
      .flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(router.navigateByUrl).not.toHaveBeenCalled();
    httpMock.verify();
  });
});

describe('authInterceptor — header attachment', () => {
  it('skips the interceptor flow entirely when no access token is stored', () => {
    const { auth, router, http, httpMock } = setup({ token: null });

    http.get(`${BASE}/admin/users`).subscribe({ next: () => undefined, error: () => undefined });
    const req = httpMock.expectOne(`${BASE}/admin/users`);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({}, { status: 401, statusText: 'Unauthorized' });

    // With no token the interceptor short-circuits BEFORE catchError is wired.
    expect(auth.signOut).not.toHaveBeenCalled();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
    httpMock.verify();
  });

  it('attaches the bearer token to internal-API requests', () => {
    const { http, httpMock } = setup({ token: 'abc.def.ghi' });
    http.get(`${BASE}/admin/users`).subscribe({ next: () => undefined, error: () => undefined });
    const req = httpMock.expectOne(`${BASE}/admin/users`);
    expect(req.request.headers.get('Authorization')).toBe('Bearer abc.def.ghi');
    req.flush({});
    httpMock.verify();
  });
});
