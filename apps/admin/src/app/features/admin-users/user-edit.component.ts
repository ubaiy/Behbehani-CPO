import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject, firstValueFrom, takeUntil } from 'rxjs';

import type {
  AdminUserDetailDto,
  AdminUserUpdate,
  AuditLogEntryDto,
} from '@behbehani-cpo/shared-types';
import { ADMIN_ROLES, ADMIN_ROLE_LABELS } from '@behbehani-cpo/shared-types';
import type { AdminRole } from '@behbehani-cpo/shared-types';

import {
  AdminAuditLogService,
  AdminUsersService,
  AuthService,
} from '@behbehani-cpo/data-access';
import { ConfirmModalService } from '@behbehani-cpo/shared-ui';
import { AdminRoleDirective } from '../../core/admin-role.directive';
import { CAPABILITIES } from './user-edit-capabilities';
import { UserAuditSectionComponent } from './user-audit-section.component';
import { UserLockoutHistoryComponent } from './user-lockout-history.component';

type UserStatus = 'active' | 'locked' | 'disabled';
type ActiveTab = 'profile' | 'roles' | 'security' | 'audit';

@Component({
  selector: 'admin-user-edit',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    AdminRoleDirective,
    UserAuditSectionComponent,
    UserLockoutHistoryComponent,
  ],
  templateUrl: './user-edit.component.html',
})
export class AdminUserEditComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  protected readonly router = inject(Router);
  private readonly userService = inject(AdminUsersService);
  private readonly auditSvc = inject(AdminAuditLogService);
  private readonly confirm = inject(ConfirmModalService);
  protected readonly auth = inject(AuthService);

  private readonly destroy$ = new Subject<void>();

  // ── Constants exposed to template ─────────────────────────────────────────
  protected readonly ADMIN_ROLES = ADMIN_ROLES;
  protected readonly ADMIN_ROLE_LABELS = ADMIN_ROLE_LABELS;
  protected readonly CAPABILITIES = CAPABILITIES;
  protected readonly superAdminRoles: AdminRole[] = ['super_admin'];

  // ── Route / state ─────────────────────────────────────────────────────────
  protected readonly userId = signal<string>('');
  protected readonly user = signal<AdminUserDetailDto | null>(null);
  protected readonly loading = signal(true);
  protected readonly loadError = signal(false);

  // ── Tab ───────────────────────────────────────────────────────────────────
  protected readonly activeTab = signal<ActiveTab>('profile');

  // ── Profile form state ────────────────────────────────────────────────────
  protected readonly saving = signal(false);
  // 'noop' = nothing to save; rendered as a neutral pill, not green/red.
  protected readonly saveStatus = signal<'idle' | 'saved' | 'noop' | 'error'>('idle');
  protected readonly saveMessage = signal('');

  protected readonly form: FormGroup = this.fb.group({
    fullName: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(200)]],
    email: ['', [Validators.email]],
    mobile: ['', []],
    locale: ['en', Validators.required],
  });

  // ── Roles state ───────────────────────────────────────────────────────────
  protected readonly selectedRoles = signal<Set<AdminRole>>(new Set());
  protected readonly initialRoles = signal<Set<AdminRole>>(new Set());
  protected readonly savingRoles = signal(false);

  protected readonly rolesChanged = computed(() => {
    const sel = this.selectedRoles();
    const init = this.initialRoles();
    if (sel.size !== init.size) return true;
    for (const r of sel) {
      if (!init.has(r)) return true;
    }
    return false;
  });

  protected readonly capabilities = computed(() =>
    CAPABILITIES.map((cap) => ({
      ...cap,
      granted: cap.check(this.selectedRoles()),
    })),
  );

  // ── Security state ────────────────────────────────────────────────────────
  protected readonly statusAction = signal<'idle' | 'working'>('idle');
  protected readonly generatedPassword = signal<string | null>(null);
  protected readonly passwordCopied = signal(false);
  private passwordTimer: ReturnType<typeof setTimeout> | null = null;

  // ── Audit log state ───────────────────────────────────────────────────────
  protected readonly auditExpanded = signal(true);
  protected readonly auditEntries = signal<AuditLogEntryDto[]>([]);
  protected readonly auditLoading = signal(false);
  protected readonly auditError = signal(false);

  // ── Derived ───────────────────────────────────────────────────────────────
  protected readonly userInitials = computed(() => {
    const name = this.user()?.fullName ?? '';
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join('');
  });

  protected readonly userStatus = computed<UserStatus>(() => {
    return this.user()?.status ?? 'active';
  });

  protected readonly showLockoutHistory = computed(() => {
    const u = this.user();
    return u !== null && (u.failedLoginCount > 0 || u.lockedUntil !== null);
  });

  /** Self-protection: current user editing their own profile. */
  protected readonly isSelf = computed(() => {
    const me = this.auth.user();
    return me !== null && me.id === this.userId();
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.userId.set(id);
    this.loadUser(id);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.passwordTimer) clearTimeout(this.passwordTimer);
  }

  // ── Tab ───────────────────────────────────────────────────────────────────
  protected setTab(tab: ActiveTab): void {
    this.activeTab.set(tab);
  }

  // ── Load ──────────────────────────────────────────────────────────────────
  private loadUser(id: string): void {
    this.loading.set(true);
    this.loadError.set(false);

    this.userService
      .get(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (u) => {
          this.user.set(u);
          this.loading.set(false);
          this.patchForm(u);
          const roleSet = new Set<AdminRole>(u.adminRoles as AdminRole[]);
          this.selectedRoles.set(roleSet);
          this.initialRoles.set(new Set(roleSet));
          this.loadAuditLog(id);
        },
        error: () => {
          this.loading.set(false);
          this.loadError.set(true);
        },
      });
  }

  private patchForm(u: AdminUserDetailDto): void {
    this.form.patchValue({
      fullName: u.fullName ?? '',
      email: u.email ?? '',
      mobile: u.mobile ?? '',
      locale: u.locale ?? 'en',
    });
  }

  private loadAuditLog(id: string): void {
    this.auditLoading.set(true);
    this.auditError.set(false);

    this.auditSvc
      .list({ actorId: id, page: 1, pageSize: 10, sort: 'newest' })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.auditEntries.set(res.items);
          this.auditLoading.set(false);
        },
        error: () => {
          this.auditLoading.set(false);
          this.auditError.set(true);
        },
      });
  }

  // ── Profile save ──────────────────────────────────────────────────────────
  protected saveProfile(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.showSaveStatus('error', 'Please fill in all required fields.');
      return;
    }

    const id = this.userId();
    const original = this.user();
    if (!original) return;

    // Build a diff dto — only include fields whose form value differs from the
    // currently-loaded user. This kills two things at once:
    //  1. The 422 "At least one field must be provided" path that surfaced as a
    //     generic "Save failed" toast when the user hit Save without changing
    //     anything (admin-pass carry-over N9).
    //  2. Wasteful PATCH round-trips that would have audit-logged a no-op.
    const v = this.form.value as Record<string, unknown>;
    const dto: AdminUserUpdate = {};

    const fullName = v['fullName'] != null ? String(v['fullName']) : '';
    if (fullName && fullName !== (original.fullName ?? '')) dto.fullName = fullName;

    if (v['email'] !== undefined) {
      const next = v['email'] === null || v['email'] === '' ? null : String(v['email']);
      if (next !== (original.email ?? null)) dto.email = next;
    }

    if (v['mobile'] !== undefined) {
      const next = v['mobile'] === null || v['mobile'] === '' ? null : String(v['mobile']);
      if (next !== (original.mobile ?? null)) dto.mobile = next;
    }

    if (v['locale']) {
      const next = v['locale'] as 'en' | 'ar';
      if (next !== original.locale) dto.locale = next;
    }

    if (Object.keys(dto).length === 0) {
      this.showSaveStatus('noop', 'No changes to save.');
      return;
    }

    this.saving.set(true);
    this.userService
      .update(id, dto)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          this.user.set(updated);
          // If the admin edited their OWN profile, sync the AuthService cache
          // so the sidebar (and anything else reading auth.user()) reflects the
          // change without requiring a sign-out.
          if (this.isSelf()) {
            this.auth.patchUser({
              fullName: updated.fullName,
              email: updated.email,
              mobile: updated.mobile,
              locale: updated.locale,
            });
          }
          this.saving.set(false);
          this.showSaveStatus('saved', 'Profile saved.');
        },
        error: () => {
          this.saving.set(false);
          this.showSaveStatus('error', 'Save failed. Please try again.');
        },
      });
  }

  protected cancelProfile(): void {
    const u = this.user();
    if (u) this.patchForm(u);
    this.form.markAsPristine();
  }

  // ── Roles ─────────────────────────────────────────────────────────────────
  protected toggleRole(role: AdminRole): void {
    const current = new Set(this.selectedRoles());
    // Self-protection: cannot remove own super_admin.
    if (role === 'super_admin' && this.isSelf() && current.has(role)) return;

    if (current.has(role)) {
      current.delete(role);
    } else {
      current.add(role);
    }
    this.selectedRoles.set(current);
  }

  protected isSuperAdminChipDisabled(role: AdminRole): boolean {
    return role === 'super_admin' && this.isSelf() && this.selectedRoles().has(role);
  }

  protected saveRoles(): void {
    if (!this.rolesChanged()) return;
    this.savingRoles.set(true);

    const id = this.userId();
    const roles = [...this.selectedRoles()] as AdminRole[];

    this.userService
      .assignRoles(id, { adminRoles: roles })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          this.user.set(updated);
          const roleSet = new Set<AdminRole>(updated.adminRoles as AdminRole[]);
          this.selectedRoles.set(roleSet);
          this.initialRoles.set(new Set(roleSet));
          this.savingRoles.set(false);
          this.showSaveStatus('saved', 'Roles updated.');
        },
        error: () => {
          this.savingRoles.set(false);
          this.showSaveStatus('error', 'Failed to update roles.');
        },
      });
  }

  // ── Status actions ────────────────────────────────────────────────────────
  protected setStatus(target: UserStatus): void {
    const current = this.userStatus();
    if (current === target) return;
    void this.doSetStatus(current, target);
  }

  private async doSetStatus(
    current: UserStatus,
    target: UserStatus,
  ): Promise<void> {
    const id = this.userId();
    const label = target === 'locked' ? 'Lock' : target === 'disabled' ? 'Disable' : 'Enable';
    const body =
      target === 'locked'
        ? 'Lock this account? The user will be unable to sign in until unlocked.'
        : target === 'disabled'
          ? 'Disable this account? The user will be unable to sign in and will be hidden from active user lists.'
          : 'Re-enable this account? The user will regain sign-in access.';

    let call$: ReturnType<typeof this.userService.lock>;

    if (target === 'locked') {
      call$ = this.userService.lock(id, {});
    } else if (target === 'disabled') {
      call$ = this.userService.disable(id, {});
    } else {
      // 'active'
      call$ = current === 'locked'
        ? this.userService.unlock(id, {})
        : this.userService.enable(id, {});
    }

    const ok = await this.confirm.open({
      title: `${label} account`,
      body,
      variant: target === 'active' ? 'standard' : 'destructive',
      confirmLabel: label,
      onConfirm: () => firstValueFrom(call$).then((u) => { this.user.set(u); }),
    });

    if (!ok) return;
  }

  // ── Password reset ────────────────────────────────────────────────────────
  protected resetPassword(): void {
    void this.doResetPassword();
  }

  private async doResetPassword(): Promise<void> {
    const id = this.userId();
    const ok = await this.confirm.open({
      title: 'Reset password',
      body: 'This generates a new temporary password for the user and forces a password change on next sign-in. This action cannot be undone.',
      variant: 'destructive',
      requireTyped: 'RESET',
      confirmLabel: 'Reset password',
      onConfirm: async () => {
        const res = await firstValueFrom(
          this.userService.resetPassword(id, { mode: 'generate' }),
        );
        if (res.generatedPassword) {
          this.generatedPassword.set(res.generatedPassword);
          // Auto-clear after 30 seconds.
          if (this.passwordTimer) clearTimeout(this.passwordTimer);
          this.passwordTimer = setTimeout(() => {
            this.generatedPassword.set(null);
          }, 30_000);
        }
      },
    });

    void ok; // outcome handled via onConfirm
  }

  protected copyPassword(): void {
    const pw = this.generatedPassword();
    if (!pw) return;
    void navigator.clipboard.writeText(pw).then(() => {
      this.passwordCopied.set(true);
      setTimeout(() => this.passwordCopied.set(false), 2000);
    });
  }

  protected dismissPassword(): void {
    this.generatedPassword.set(null);
    if (this.passwordTimer) clearTimeout(this.passwordTimer);
  }

  // ── Audit log ─────────────────────────────────────────────────────────────
  protected toggleAudit(): void {
    this.auditExpanded.set(!this.auditExpanded());
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  protected formatDate(iso: string | null | undefined): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  protected relativeTime(iso: string | null | undefined): string {
    if (!iso) return '—';
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hr ago`;
    return `${Math.floor(hrs / 24)} days ago`;
  }

  private showSaveStatus(status: 'saved' | 'noop' | 'error', message: string): void {
    this.saveStatus.set(status);
    this.saveMessage.set(message);
    setTimeout(() => this.saveStatus.set('idle'), 3500);
  }
}
