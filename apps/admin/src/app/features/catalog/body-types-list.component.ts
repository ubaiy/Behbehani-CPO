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
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';

import type { AdminRole, BodyTypeDto } from '@behbehani-cpo/shared-types';
import { AdminCatalogAdminService } from '@behbehani-cpo/data-access';
import { ConfirmModalService } from '@behbehani-cpo/shared-ui';
import { AdminRoleDirective } from '../../core/admin-role.directive';
import { slugify } from '@behbehani-cpo/shared-utils';

type StatusFilter = 'all' | 'active' | 'inactive';

interface BodyTypeDraft {
  nameEn: string;
  nameAr: string;
  slug: string;
}

const PAGE_SIZES = [10, 25, 50, 100] as const;
const DEFAULT_PAGE_SIZE = 25;

@Component({
  selector: 'admin-body-types-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, AdminRoleDirective],
  templateUrl: './body-types-list.component.html',
})
export class BodyTypesListComponent implements OnInit, OnDestroy {
  private readonly catalog = inject(AdminCatalogAdminService);
  private readonly confirm = inject(ConfirmModalService);
  private readonly destroy$ = new Subject<void>();

  protected readonly writeRoles: AdminRole[] = ['content_editor', 'general_manager'];
  protected readonly pageSizes = PAGE_SIZES;

  protected readonly bodyTypes = signal<BodyTypeDto[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly query = signal('');
  protected readonly statusFilter = signal<StatusFilter>('all');
  protected readonly page = signal(1);
  protected readonly pageSize = signal<number>(DEFAULT_PAGE_SIZE);

  protected readonly creating = signal(false);
  protected readonly draft = signal<BodyTypeDraft>({ nameEn: '', nameAr: '', slug: '' });

  protected readonly editingId = signal<string | null>(null);
  protected readonly editDraft = signal<BodyTypeDraft>({ nameEn: '', nameAr: '', slug: '' });

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
      .listBodyTypes({
        q: this.query() || undefined,
        status: this.statusFilter(),
        page: this.page(),
        pageSize: this.pageSize(),
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.bodyTypes.set(res.items);
          this.total.set(res.total);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Failed to load body types.');
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

  // ── Create ───────────────────────────────────────────────────────────────

  protected startCreate(): void {
    this.creating.set(true);
    this.draft.set({ nameEn: '', nameAr: '', slug: '' });
  }

  protected cancelCreate(): void {
    this.creating.set(false);
  }

  protected updateDraftName(value: string): void {
    const d = this.draft();
    this.draft.set({ ...d, nameEn: value, slug: d.slug || slugify(value) });
  }

  protected updateDraftNameAr(value: string): void {
    this.draft.set({ ...this.draft(), nameAr: value });
  }

  protected updateDraftSlug(value: string): void {
    this.draft.set({ ...this.draft(), slug: value });
  }

  protected saveCreate(): void {
    const d = this.draft();
    if (!d.nameEn || !d.nameAr || !d.slug) {
      this.error.set('All fields are required.');
      return;
    }
    this.catalog.createBodyType({ ...d, isActive: true }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.creating.set(false);
        this.load();
      },
      error: (err: { error?: { error?: string } }) => {
        this.error.set(err.error?.error ?? 'Create failed.');
      },
    });
  }

  // ── Edit ─────────────────────────────────────────────────────────────────

  protected startEdit(bt: BodyTypeDto): void {
    this.editingId.set(bt.id);
    this.editDraft.set({ nameEn: bt.nameEn, nameAr: bt.nameAr, slug: bt.slug });
  }

  protected cancelEdit(): void {
    this.editingId.set(null);
  }

  protected updateEditName(value: string): void {
    this.editDraft.set({ ...this.editDraft(), nameEn: value });
  }
  protected updateEditNameAr(value: string): void {
    this.editDraft.set({ ...this.editDraft(), nameAr: value });
  }
  protected updateEditSlug(value: string): void {
    this.editDraft.set({ ...this.editDraft(), slug: value });
  }

  protected saveEdit(bt: BodyTypeDto): void {
    const d = this.editDraft();
    this.catalog.updateBodyType(bt.id, d).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.editingId.set(null);
        this.load();
      },
      error: (err: { error?: { error?: string } }) => {
        this.error.set(err.error?.error ?? 'Update failed.');
      },
    });
  }

  protected async toggleActive(bt: BodyTypeDto): Promise<void> {
    if (bt.isActive && bt.listingCount > 0) {
      const ok = await this.confirm.open({
        variant: 'destructive',
        title: `Deactivate ${bt.nameEn}?`,
        body: `${bt.listingCount} listing${bt.listingCount === 1 ? '' : 's'} reference this body type. They will keep working, but the body type will be hidden from new-listing dropdowns + customer browse.`,
        confirmLabel: 'Deactivate',
        cancelLabel: 'Cancel',
      });
      if (!ok) return;
    }
    this.catalog.setBodyTypeActive(bt.id, !bt.isActive).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => this.load(),
      error: () => this.error.set('Failed to update status.'),
    });
  }
}
