/**
 * AdminRoleDirective tests.
 *
 * The directive renders its host element when the current user holds ANY of
 * the listed admin roles OR is a `super_admin` (full bypass).
 */
import { Component, signal, WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { AuthService } from '@behbehani-cpo/data-access';
import type { PublicUser, AdminRole } from '@behbehani-cpo/shared-types';
import { AdminRoleDirective } from './admin-role.directive';

// Stub AuthService — just expose a writable signal for `user`.
class AuthStub {
  readonly _user: WritableSignal<PublicUser | null> = signal(null);
  readonly user = this._user.asReadonly();
}

function makeUser(adminRoles: AdminRole[], role: 'admin' | 'customer' | 'dealer' = 'admin'): PublicUser {
  return {
    id: 'u1',
    email: 'admin@behbehani.com',
    mobile: null,
    fullName: 'Test Admin',
    role,
    adminRoles,
    locale: 'en',
  };
}

@Component({
  standalone: true,
  imports: [AdminRoleDirective],
  template: `<span *adminRole="roles" data-testid="gated">visible</span>`,
})
class HostCmp {
  roles: AdminRole[] = ['operations_manager'];
}

function setup() {
  const auth = new AuthStub();
  TestBed.configureTestingModule({
    imports: [HostCmp],
    providers: [{ provide: AuthService, useValue: auth }],
  });
  const fixture = TestBed.createComponent(HostCmp);
  return { auth, fixture };
}

function querySpan(fixture: ReturnType<typeof setup>['fixture']): HTMLElement | null {
  const debug = fixture.debugElement.query(By.css('[data-testid="gated"]'));
  return debug ? (debug.nativeElement as HTMLElement) : null;
}

describe('AdminRoleDirective', () => {
  it('should NOT render the host element when user is null (signed out)', async () => {
    const { fixture } = setup();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(querySpan(fixture)).toBeNull();
  });

  it('should NOT render when the user has none of the listed admin roles', async () => {
    const { auth, fixture } = setup();
    auth._user.set(makeUser(['sales_agent']));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(querySpan(fixture)).toBeNull();
  });

  it('should render when the user has any of the listed admin roles', async () => {
    const { auth, fixture } = setup();
    auth._user.set(makeUser(['operations_manager']));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(querySpan(fixture)?.textContent).toBe('visible');
  });

  it('should render when the user has super_admin regardless of listed roles', async () => {
    const { auth, fixture } = setup();
    fixture.componentInstance.roles = ['finance_officer'];
    auth._user.set(makeUser(['super_admin']));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(querySpan(fixture)).not.toBeNull();
  });

  it('should NOT render when user.role is not "admin" even if adminRoles match', async () => {
    const { auth, fixture } = setup();
    auth._user.set(makeUser(['operations_manager'], 'customer'));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(querySpan(fixture)).toBeNull();
  });

  it('should react to sign-in: hidden, then visible after a matching user is set', async () => {
    const { auth, fixture } = setup();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(querySpan(fixture)).toBeNull();

    auth._user.set(makeUser(['operations_manager']));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(querySpan(fixture)).not.toBeNull();
  });

  it('should react to sign-out: visible, then hidden after user is cleared', async () => {
    const { auth, fixture } = setup();
    auth._user.set(makeUser(['operations_manager']));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(querySpan(fixture)).not.toBeNull();

    auth._user.set(null);
    await fixture.whenStable();
    fixture.detectChanges();
    expect(querySpan(fixture)).toBeNull();
  });
});
