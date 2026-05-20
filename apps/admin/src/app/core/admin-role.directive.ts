import {
  Directive,
  Input,
  TemplateRef,
  ViewContainerRef,
  inject,
  effect,
} from '@angular/core';
import type { AdminRole } from '@behbehani-cpo/shared-types';
import { AuthService } from '@behbehani-cpo/data-access';

/**
 * Structural directive that renders its host element only when the current user
 * holds ANY of the listed admin roles, OR is a super_admin (which bypasses all
 * role gates implicitly).
 *
 * Usage:
 *   <li *adminRole="['operations_manager', 'sales_agent']">Pipeline</li>
 *
 * The element is removed from the DOM entirely when the condition is false —
 * no lock icons, no dimmed/disabled state.
 */
@Directive({
  selector: '[adminRole]',
  standalone: true,
})
export class AdminRoleDirective {
  private readonly templateRef = inject(TemplateRef<unknown>);
  private readonly vcr = inject(ViewContainerRef);
  private readonly auth = inject(AuthService);

  private _roles: AdminRole[] = [];
  private _rendered = false;

  @Input() set adminRole(roles: AdminRole[]) {
    this._roles = roles;
    this.updateView();
  }

  constructor() {
    // Re-evaluate whenever the user signal changes (e.g. after sign-in/out).
    effect(() => {
      // Reading the signal inside effect registers the dependency.
      void this.auth.user();
      this.updateView();
    });
  }

  private updateView(): void {
    const user = this.auth.user();

    const allowed =
      user !== null &&
      user.role === 'admin' &&
      (user.adminRoles.includes('super_admin') ||
        this._roles.some((r) => user.adminRoles.includes(r)));

    if (allowed && !this._rendered) {
      this.vcr.createEmbeddedView(this.templateRef);
      this._rendered = true;
    } else if (!allowed && this._rendered) {
      this.vcr.clear();
      this._rendered = false;
    }
  }
}
