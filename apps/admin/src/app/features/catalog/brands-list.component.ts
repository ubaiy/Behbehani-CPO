import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';

import type { AdminRole, BrandDto } from '@behbehani-cpo/shared-types';
import { AdminCatalogAdminService } from '@behbehani-cpo/data-access';
import { ConfirmModalService } from '@behbehani-cpo/shared-ui';
import { AdminRoleDirective } from '../../core/admin-role.directive';
import { BrandEditDrawerComponent } from './brand-edit-drawer.component';

type StatusFilter = 'all' | 'active' | 'inactive';

const PAGE_SIZES = [10, 25, 50, 100] as const;
const DEFAULT_PAGE_SIZE = 25;

@Component({
  selector: 'admin-brands-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, RouterLink, AdminRoleDirective, BrandEditDrawerComponent],
  templateUrl: './brands-list.component.html',
})
export class BrandsListComponent implements OnInit, OnDestroy {
  private readonly catalog = inject(AdminCatalogAdminService);
  private readonly confirm = inject(ConfirmModalService);
  private readonly destroy$ = new Subject<void>();

  protected readonly writeRoles: AdminRole[] = ['content_editor', 'general_manager'];
  protected readonly pageSizes = PAGE_SIZES;

  protected readonly brands = signal<BrandDto[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly query = signal('');
  protected readonly statusFilter = signal<StatusFilter>('all');
  protected readonly page = signal(1);
  protected readonly pageSize = signal<number>(DEFAULT_PAGE_SIZE);

  protected readonly drawerOpen = signal(false);
  protected readonly drawerMode = signal<'create' | 'edit'>('create');
  protected readonly drawerBrand = signal<BrandDto | null>(null);

  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.total() / this.pageSize())),
  );
  protected readonly rangeStart = computed(() =>
    this.total() === 0 ? 0 : (this.page() - 1) * this.pageSize() + 1,
  );
  protected readonly rangeEnd = computed(() =>
    Math.min(this.page() * this.pageSize(), this.total()),
  );
  protected readonly pageNumbers = computed<number[]>(() => {
    const total = this.totalPages();
    const current = this.page();
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const out: number[] = [1];
    if (current > 3) out.push(-1);
    for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) out.push(p);
    if (current < total - 2) out.push(-1);
    out.push(total);
    return out;
  });

  private readonly search$ = new Subject<void>();

  ngOnInit(): void {
    this.load();
    this.search$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => this.load());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private load(): void {
    this.loading.set(true);
    this.catalog
      .listBrands({
        q: this.query() || undefined,
        status: this.statusFilter(),
        page: this.page(),
        pageSize: this.pageSize(),
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.brands.set(res.items);
          this.total.set(res.total);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Failed to load brands.');
          this.loading.set(false);
        },
      });
  }

  protected onQueryChange(value: string): void {
    this.query.set(value);
    this.page.set(1);
    this.search$.next();
  }

  protected setStatus(s: StatusFilter): void {
    this.statusFilter.set(s);
    this.page.set(1);
    this.load();
  }

  protected goToPage(page: number): void {
    if (page < 1 || page > this.totalPages() || page === this.page()) return;
    this.page.set(page);
    this.load();
  }

  protected onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.page.set(1);
    this.load();
  }

  protected openCreate(): void {
    this.drawerMode.set('create');
    this.drawerBrand.set(null);
    this.drawerOpen.set(true);
  }

  protected openEdit(brand: BrandDto): void {
    this.drawerMode.set('edit');
    this.drawerBrand.set(brand);
    this.drawerOpen.set(true);
  }

  protected closeDrawer(): void {
    this.drawerOpen.set(false);
    this.drawerBrand.set(null);
  }

  protected onDrawerSaved(): void {
    this.closeDrawer();
    this.load();
  }

  protected async toggleActive(brand: BrandDto): Promise<void> {
    const goingInactive = brand.isActive;
    if (goingInactive && brand.listingCount > 0) {
      const ok = await this.confirm.open({
        variant: 'destructive',
        title: `Deactivate ${brand.nameEn}?`,
        body: `Deactivating ${brand.nameEn} will hide it from customer browse + the create-listing dropdown. ${brand.listingCount} existing listing${brand.listingCount === 1 ? '' : 's'} will continue to display correctly.`,
        confirmLabel: 'Deactivate',
        cancelLabel: 'Cancel',
      });
      if (!ok) return;
    }
    this.catalog.setBrandActive(brand.id, !brand.isActive).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => this.load(),
      error: () => this.error.set('Failed to update status.'),
    });
  }

  protected initials(name: string): string {
    return name.charAt(0).toUpperCase();
  }
}
