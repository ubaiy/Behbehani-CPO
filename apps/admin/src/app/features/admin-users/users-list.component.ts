import {
  ChangeDetectionStrategy,
  Component,
  Injector,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ActivatedRoute, Router } from '@angular/router';
import { toObservable } from '@angular/core/rxjs-interop';
import {
  Subject,
  debounceTime,
  distinctUntilChanged,
  switchMap,
  catchError,
  of,
  firstValueFrom,
  takeUntil,
} from 'rxjs';

import type {
  AdminUserFilter,
  AdminUserSummaryDto,
  AdminUserListResponse,
  AdminUserCreate,
} from '@behbehani-cpo/shared-types';
import { ADMIN_ROLES, ADMIN_ROLE_LABELS } from '@behbehani-cpo/shared-types';
import { AdminUsersService } from '@behbehani-cpo/data-access';
import { AuthService } from '@behbehani-cpo/data-access';
import { ConfirmModalService } from '@behbehani-cpo/shared-ui';
import { AdminRoleDirective } from '../../core/admin-role.directive';
import { CreateUserDrawerComponent } from './create-user-drawer.component';
import {
  PAGE_SIZES,
  STATUS_FILTERS,
  defaultUsersFilter as defaultFilter,
  initials,
  relativeTime,
  type StatusFilter,
} from './users-list.helpers';

@Component({
  selector: 'admin-users-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    AdminRoleDirective,
    CreateUserDrawerComponent,
  ],
  templateUrl: './users-list.component.html',
})
export class UsersListComponent implements OnInit, OnDestroy {
  // ─── Services ──────────────────────────────────────────────────────────────
  private readonly usersService = inject(AdminUsersService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly confirm = inject(ConfirmModalService);
  private readonly fb = inject(FormBuilder);
  // Captured at construction time to satisfy NG0203 in ngOnInit.
  private readonly injector = inject(Injector);
  private readonly destroy$ = new Subject<void>();

  // ─── Exposed constants ──────────────────────────────────────────────────────
  protected readonly ADMIN_ROLES = ADMIN_ROLES;
  protected readonly ADMIN_ROLE_LABELS = ADMIN_ROLE_LABELS;
  protected readonly STATUS_FILTERS = STATUS_FILTERS;
  protected readonly pageSizes = PAGE_SIZES;
  protected readonly skeletonRows = Array.from({ length: 8 }, (_, i) => i);
  protected readonly initials = initials;
  protected readonly relativeTime = relativeTime;

  // ─── List state ─────────────────────────────────────────────────────────────
  protected readonly filter = signal<Partial<AdminUserFilter>>(defaultFilter());
  protected readonly items = signal<AdminUserSummaryDto[]>([]);
  protected readonly total = signal<number>(0);
  protected readonly loading = signal<boolean>(true);
  protected readonly error = signal<string | null>(null);
  protected readonly openMenuId = signal<string | null>(null);

  // ─── Role filter dropdown ───────────────────────────────────────────────────
  protected readonly roleDropdownOpen = signal(false);
  protected readonly selectedRoles = signal<string[]>([]);

  // ─── Generated-password alert (after create or reset-password) ─────────────
  protected readonly generatedPasswordAlert = signal<string | null>(null);
  private alertTimeout: ReturnType<typeof setTimeout> | null = null;

  // ─── Drawer (create user) ──────────────────────────────────────────────────
  protected readonly drawerOpen = signal(false);
  protected readonly drawerSaving = signal(false);
  protected readonly drawerError = signal<string | null>(null);

  // ─── Derived signals ────────────────────────────────────────────────────────
  protected readonly actorId = computed(() => this.auth.user()?.id ?? null);
  protected readonly currentPage = computed(() => this.filter().page ?? 1);
  protected readonly currentPageSize = computed(() => this.filter().pageSize ?? 25);
  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.total() / this.currentPageSize())),
  );
  protected readonly rangeStart = computed(() =>
    this.total() === 0 ? 0 : (this.currentPage() - 1) * this.currentPageSize() + 1,
  );
  protected readonly rangeEnd = computed(() =>
    Math.min(this.currentPage() * this.currentPageSize(), this.total()),
  );
  protected readonly pageNumbers = computed<number[]>(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages: number[] = [1];
    if (current > 3) pages.push(-1);
    for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) {
      pages.push(p);
    }
    if (current < total - 2) pages.push(-1);
    pages.push(total);
    return pages;
  });

  // ─── Create-user form ───────────────────────────────────────────────────────
  protected readonly form: FormGroup = this.fb.group({
    fullName: ['', [Validators.required, Validators.maxLength(200)]],
    email: ['', [Validators.email]],
    mobile: ['', [Validators.pattern(/^(\+965)?[569]\d{7}$/)]],
    accountType: ['admin', Validators.required],
    adminRoles: [[] as string[]],
    passwordMode: ['generate', Validators.required],
    password: [''],
    requirePasswordChangeOnNextSignIn: [true],
  });

  // ─── Debounced search subject ───────────────────────────────────────────────
  private readonly searchSubject = new Subject<string>();

  // ─── Lifecycle ──────────────────────────────────────────────────────────────

  ngOnInit(): void {
    // Seed filter from URL query params
    const params = this.route.snapshot.queryParamMap;
    const seeded: Partial<AdminUserFilter> = { ...defaultFilter() };
    const q = params.get('q');
    if (q) seeded.q = q;
    const status = params.get('status') as AdminUserFilter['status'] | null;
    if (status) seeded.status = status;
    const sort = params.get('sort') as AdminUserFilter['sort'] | null;
    if (sort) seeded.sort = sort;
    const page = params.get('page');
    if (page) seeded.page = Number(page);
    const pageSize = params.get('pageSize');
    if (pageSize) seeded.pageSize = Number(pageSize);
    const rolesParam = params.getAll('adminRoles');
    if (rolesParam.length) {
      seeded.adminRoles = rolesParam as AdminUserFilter['adminRoles'];
      this.selectedRoles.set(rolesParam);
    }
    this.filter.set(seeded);

    // Debounced search
    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((q) => {
        this.filter.update((f) => ({ ...f, q: q || undefined, page: 1 }));
      });

    // Reactive fetch on every filter change — injector passed explicitly for NG0203
    toObservable(this.filter, { injector: this.injector })
      .pipe(
        switchMap((f) => {
          this.loading.set(true);
          this.error.set(null);
          this.pushQueryParams(f);
          return this.usersService.list(f).pipe(
            catchError((err) => {
              this.error.set((err as Error)?.message ?? 'Failed to load users.');
              return of<AdminUserListResponse>({ items: [], total: 0, page: 1, pageSize: f.pageSize ?? 25 });
            }),
          );
        }),
        takeUntil(this.destroy$),
      )
      .subscribe((result: AdminUserListResponse) => {
        this.items.set(result.items);
        this.total.set(result.total);
        this.loading.set(false);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.alertTimeout !== null) clearTimeout(this.alertTimeout);
  }

  // ─── Filter handlers ────────────────────────────────────────────────────────

  protected onSearchInput(q: string): void {
    this.searchSubject.next(q);
  }

  protected setStatus(status: StatusFilter): void {
    this.filter.update((f) => ({ ...f, status, page: 1 }));
  }

  protected toggleRoleFilter(role: string): void {
    this.selectedRoles.update((current) => {
      const next = current.includes(role)
        ? current.filter((r) => r !== role)
        : [...current, role];
      const adminRoles = next.length > 0 ? (next as AdminUserFilter['adminRoles']) : undefined;
      this.filter.update((f) => ({ ...f, adminRoles, page: 1 }));
      return next;
    });
  }

  protected resetFilters(): void {
    this.selectedRoles.set([]);
    this.filter.set(defaultFilter());
  }

  protected toggleRoleDropdown(): void {
    this.roleDropdownOpen.update((v) => !v);
  }

  protected closeRoleDropdown(): void {
    this.roleDropdownOpen.set(false);
  }

  // ─── Pagination ─────────────────────────────────────────────────────────────

  protected goToPage(page: number): void {
    this.filter.update((f) => ({ ...f, page }));
  }

  protected onPageSizeChange(pageSize: number): void {
    this.filter.update((f) => ({ ...f, pageSize, page: 1 }));
  }

  // ─── Row menu ───────────────────────────────────────────────────────────────

  protected toggleMenu(id: string): void {
    this.openMenuId.update((current) => (current === id ? null : id));
  }

  protected closeMenu(): void {
    this.openMenuId.set(null);
  }

  // ─── Status chip classes ────────────────────────────────────────────────────

  protected statusChipClass(status: string): string {
    switch (status) {
      case 'active':
        return 'bg-brand-50 text-brand-700';
      case 'locked':
        return 'bg-red-50 text-red-700';
      case 'disabled':
        return 'bg-slate-100 text-slate-600';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  }

  // ─── Sensitive actions ──────────────────────────────────────────────────────

  protected async onLock(user: AdminUserSummaryDto): Promise<void> {
    const ok = await this.confirm.open({
      variant: 'destructive',
      title: `Lock account — ${user.fullName}?`,
      body: `This will prevent ${user.fullName} from signing in. You can unlock the account at any time.`,
      confirmLabel: 'Lock account',
      cancelLabel: 'Cancel',
      requireTyped: 'LOCK',
      onConfirm: async () => { await firstValueFrom(this.usersService.lock(user.id, {})); },
    });
    if (ok) this.refreshList();
    this.closeMenu();
  }

  protected async onUnlock(user: AdminUserSummaryDto): Promise<void> {
    const ok = await this.confirm.open({
      variant: 'destructive',
      title: `Unlock account — ${user.fullName}?`,
      body: `This will restore sign-in access for ${user.fullName}.`,
      confirmLabel: 'Unlock account',
      cancelLabel: 'Cancel',
      onConfirm: async () => { await firstValueFrom(this.usersService.unlock(user.id, {})); },
    });
    if (ok) this.refreshList();
    this.closeMenu();
  }

  protected async onDisable(user: AdminUserSummaryDto): Promise<void> {
    const ok = await this.confirm.open({
      variant: 'severe',
      title: `Disable account — ${user.fullName}?`,
      body: `This will permanently suspend ${user.fullName}'s account. They will not be able to sign in until re-enabled.`,
      confirmLabel: 'Disable account',
      cancelLabel: 'Cancel',
      requireTyped: 'DISABLE',
      onConfirm: async () => { await firstValueFrom(this.usersService.disable(user.id, {})); },
    });
    if (ok) this.refreshList();
    this.closeMenu();
  }

  protected async onEnable(user: AdminUserSummaryDto): Promise<void> {
    const ok = await this.confirm.open({
      variant: 'destructive',
      title: `Re-enable account — ${user.fullName}?`,
      body: `This will restore access for ${user.fullName}.`,
      confirmLabel: 'Enable account',
      cancelLabel: 'Cancel',
      onConfirm: async () => { await firstValueFrom(this.usersService.enable(user.id, {})); },
    });
    if (ok) this.refreshList();
    this.closeMenu();
  }

  protected async onResetPassword(user: AdminUserSummaryDto): Promise<void> {
    let generatedPw: string | null = null;
    const ok = await this.confirm.open({
      variant: 'destructive',
      title: `Reset password — ${user.fullName}?`,
      body: `A new temporary password will be generated and shown once. The user will be required to change it on next sign-in.`,
      confirmLabel: 'Reset password',
      cancelLabel: 'Cancel',
      onConfirm: async () => {
        const result = await firstValueFrom(
          this.usersService.resetPassword(user.id, { mode: 'generate' }),
        );
        generatedPw = result.generatedPassword;
      },
    });
    if (ok && generatedPw) {
      this.showGeneratedPasswordAlert(generatedPw);
    }
    this.closeMenu();
  }

  // ─── Drawer (create user) ──────────────────────────────────────────────────

  protected openCreateDrawer(): void {
    this.form.reset({
      fullName: '',
      email: '',
      mobile: '',
      accountType: 'admin',
      adminRoles: [],
      passwordMode: 'generate',
      password: '',
      requirePasswordChangeOnNextSignIn: true,
    });
    this.drawerError.set(null);
    this.drawerOpen.set(true);
  }

  protected closeDrawer(): void {
    this.drawerOpen.set(false);
    this.drawerError.set(null);
  }

  protected toggleDrawerRole(role: string): void {
    const current: string[] = this.form.get('adminRoles')?.value ?? [];
    const updated = current.includes(role)
      ? current.filter((r) => r !== role)
      : [...current, role];
    this.form.get('adminRoles')?.setValue(updated);
  }

  protected saveUser(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const val = this.form.value as {
      fullName: string;
      email: string;
      mobile: string;
      accountType: 'admin' | 'customer';
      adminRoles: string[];
      passwordMode: 'generate' | 'manual';
      password: string;
      requirePasswordChangeOnNextSignIn: boolean;
    };

    // Local validations mirroring Zod refinements
    if (!val.email && !val.mobile) {
      this.drawerError.set('Either email or mobile is required.');
      return;
    }
    if (val.accountType === 'admin' && val.adminRoles.length === 0) {
      this.drawerError.set('Staff users must have at least one admin role.');
      return;
    }
    if (val.passwordMode === 'manual' && (!val.password || val.password.length < 8)) {
      this.drawerError.set('Password must be at least 8 characters.');
      return;
    }

    const payload: AdminUserCreate = {
      fullName: val.fullName,
      email: val.email || null,
      mobile: val.mobile || null,
      accountType: val.accountType,
      adminRoles: val.adminRoles as AdminUserCreate['adminRoles'],
      locale: 'en',
      passwordMode: val.passwordMode,
      password: val.passwordMode === 'manual' ? val.password : undefined,
      requirePasswordChangeOnNextSignIn: val.requirePasswordChangeOnNextSignIn,
    };

    this.drawerSaving.set(true);
    this.drawerError.set(null);

    this.usersService
      .create(payload)
      .pipe(
        catchError((err) => {
          this.drawerError.set((err as Error)?.message ?? 'Create failed. Please try again.');
          this.drawerSaving.set(false);
          return of(null);
        }),
        takeUntil(this.destroy$),
      )
      .subscribe((result) => {
        if (!result) return;
        this.drawerSaving.set(false);
        this.closeDrawer();
        this.refreshList();
        if (result.generatedPassword) {
          this.showGeneratedPasswordAlert(result.generatedPassword);
        }
      });
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private refreshList(): void {
    // Nudge filter signal identity to trigger a fresh fetch
    this.filter.update((f) => ({ ...f }));
  }

  private showGeneratedPasswordAlert(pw: string): void {
    if (this.alertTimeout !== null) clearTimeout(this.alertTimeout);
    this.generatedPasswordAlert.set(pw);
    this.alertTimeout = setTimeout(() => {
      this.generatedPasswordAlert.set(null);
    }, 30_000);
  }

  protected dismissAlert(): void {
    if (this.alertTimeout !== null) clearTimeout(this.alertTimeout);
    this.generatedPasswordAlert.set(null);
  }

  protected copyToClipboard(text: string): void {
    void navigator.clipboard.writeText(text);
  }

  private pushQueryParams(f: Partial<AdminUserFilter>): void {
    const queryParams: Record<string, string | number | string[] | undefined> = {};
    if (f.q) queryParams['q'] = f.q;
    if (f.status && f.status !== 'all') queryParams['status'] = f.status;
    if (f.sort && f.sort !== 'createdAt:desc') queryParams['sort'] = f.sort;
    if (f.adminRoles?.length) queryParams['adminRoles'] = f.adminRoles;
    if (f.page && f.page !== 1) queryParams['page'] = f.page;
    if (f.pageSize && f.pageSize !== 25) queryParams['pageSize'] = f.pageSize;

    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      replaceUrl: true,
      queryParamsHandling: '',
    });
  }
}
