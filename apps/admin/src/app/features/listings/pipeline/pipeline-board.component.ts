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
import { RouterLink } from '@angular/router';
import {
  Subject,
  catchError,
  of,
  takeUntil,
} from 'rxjs';

import type {
  AdminRole,
  ChangeStageDto,
  ListingStage,
  ListingSummary,
} from '@behbehani-cpo/shared-types';
import { LISTING_STAGES } from '@behbehani-cpo/shared-types';
import { formatKwd } from '@behbehani-cpo/shared-utils';
import { AdminListingsService } from '@behbehani-cpo/data-access';
import { AdminCatalogService } from '@behbehani-cpo/data-access';
import type { CatalogBrand } from '@behbehani-cpo/data-access';

import {
  STAGE_LABELS,
  agingChipClass,
} from '../../../core/listing-stage.util';
import { AdminRoleDirective } from '../../../core/admin-role.directive';
import { StageTransitionModalComponent } from '../edit/stage-transition-modal.component';

/** Write-capable roles that can drag cards between columns. */
const WRITE_ROLES: AdminRole[] = [
  'operations_manager',
  'sales_agent',
  'content_editor',
  'general_manager',
  'super_admin',
];

/** Age bracket filter options. */
type AgeBracket = 'all' | 'lt20' | '20to44' | 'gte45';

/**
 * Max listings fetched in a single board load. Capped at 100 to match the
 * ListingFilterSchema.pageSize `.max(100)` validator on the API; requesting
 * more makes the endpoint return 422. Bump both in lockstep if the cap grows.
 */
const BOARD_PAGE_SIZE = 100;

@Component({
  selector: 'admin-pipeline-board',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterLink,
    AdminRoleDirective,
    StageTransitionModalComponent,
  ],
  templateUrl: './pipeline-board.component.html',
  styles: [`
    .drop-placeholder {
      background: repeating-linear-gradient(
        135deg,
        #bfdbfe 0px, #bfdbfe 2px,
        #eff6ff 2px, #eff6ff 10px
      );
      border: 2px dashed #60a5fa;
      border-radius: 0.5rem;
    }
  `],
})
export class PipelineBoardComponent implements OnInit, OnDestroy {
  // ── Services ────────────────────────────────────────────────────────────────
  private readonly listingsService = inject(AdminListingsService);
  private readonly catalogService = inject(AdminCatalogService);
  private readonly destroy$ = new Subject<void>();

  // ── Exposed constants ────────────────────────────────────────────────────────
  protected readonly LISTING_STAGES = LISTING_STAGES;
  protected readonly STAGE_LABELS = STAGE_LABELS;
  protected readonly agingChipClass = agingChipClass;
  protected readonly WRITE_ROLES: AdminRole[] = WRITE_ROLES;

  // ── Raw data ─────────────────────────────────────────────────────────────────
  protected readonly allListings = signal<ListingSummary[]>([]);
  protected readonly total = signal<number>(0);
  protected readonly loading = signal<boolean>(true);
  protected readonly error = signal<string | null>(null);
  protected readonly brands = signal<CatalogBrand[]>([]);

  // ── Filter state ──────────────────────────────────────────────────────────────
  protected readonly selectedBrandIds = signal<Set<string>>(new Set());
  protected readonly ageBracket = signal<AgeBracket>('all');
  /** Stages currently hidden (user clicked chip pill to hide column). */
  protected readonly hiddenStages = signal<Set<ListingStage>>(new Set());

  // ── Drag state ────────────────────────────────────────────────────────────────
  protected readonly dragListingId = signal<string | null>(null);
  protected readonly dragOverStage = signal<ListingStage | null>(null);

  // ── Stage transition modal ────────────────────────────────────────────────────
  protected readonly modalOpen = signal(false);
  protected readonly modalFrom = signal<ListingStage>('acquired');
  protected readonly modalTo = signal<ListingStage>('acquired');
  private pendingListingId: string | null = null;

  // ── Computed: filtered listings ──────────────────────────────────────────────
  protected readonly filteredListings = computed<ListingSummary[]>(() => {
    const brandIds = this.selectedBrandIds();
    const bracket = this.ageBracket();
    return this.allListings().filter(l => {
      if (brandIds.size > 0 && !brandIds.has(l.brand.id)) return false;
      if (bracket === 'lt20' && l.daysOnLot >= 20) return false;
      if (bracket === '20to44' && (l.daysOnLot < 20 || l.daysOnLot >= 45)) return false;
      if (bracket === 'gte45' && l.daysOnLot < 45) return false;
      return true;
    });
  });

  // ── Computed: listings grouped by stage ──────────────────────────────────────
  protected readonly listingsByStage = computed<Map<ListingStage, ListingSummary[]>>(() => {
    const map = new Map<ListingStage, ListingSummary[]>();
    for (const stage of LISTING_STAGES) {
      map.set(stage, []);
    }
    for (const l of this.filteredListings()) {
      const col = map.get(l.stage);
      if (col) col.push(l);
    }
    return map;
  });

  // ── Computed: visible columns ────────────────────────────────────────────────
  protected readonly visibleStages = computed<ListingStage[]>(() => {
    const hidden = this.hiddenStages();
    return LISTING_STAGES.filter(s => !hidden.has(s));
  });

  // ── Overflow banner ──────────────────────────────────────────────────────────
  protected readonly showCapBanner = computed(() => this.total() > BOARD_PAGE_SIZE);

  ngOnInit(): void {
    this.loadListings();

    this.catalogService.brands()
      .pipe(takeUntil(this.destroy$))
      .subscribe(b => this.brands.set(b));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Data loading ──────────────────────────────────────────────────────────────

  private loadListings(): void {
    this.loading.set(true);
    this.error.set(null);
    this.listingsService.list({ pageSize: BOARD_PAGE_SIZE, page: 1 })
      .pipe(
        catchError(err => {
          this.error.set((err as Error)?.message ?? 'Failed to load listings.');
          return of({ items: [], total: 0, page: 1, pageSize: BOARD_PAGE_SIZE });
        }),
        takeUntil(this.destroy$),
      )
      .subscribe(result => {
        this.allListings.set(result.items);
        this.total.set(result.total);
        this.loading.set(false);
      });
  }

  // ── Filter handlers ───────────────────────────────────────────────────────────

  protected toggleBrand(brandId: string): void {
    this.selectedBrandIds.update(set => {
      const next = new Set(set);
      if (next.has(brandId)) {
        next.delete(brandId);
      } else {
        next.add(brandId);
      }
      return next;
    });
  }

  protected onAgeBracketChange(bracket: AgeBracket): void {
    this.ageBracket.set(bracket);
  }

  protected toggleStageVisibility(stage: ListingStage): void {
    this.hiddenStages.update(set => {
      const next = new Set(set);
      if (next.has(stage)) {
        next.delete(stage);
      } else {
        next.add(stage);
      }
      return next;
    });
  }

  // ── Drag-and-drop handlers ────────────────────────────────────────────────────

  protected onDragStart(event: DragEvent, listingId: string): void {
    this.dragListingId.set(listingId);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', listingId);
    }
  }

  protected onDragEnd(): void {
    this.dragListingId.set(null);
    this.dragOverStage.set(null);
  }

  protected onDragOver(event: DragEvent, stage: ListingStage): void {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
    this.dragOverStage.set(stage);
  }

  protected onDragLeave(stage: ListingStage): void {
    if (this.dragOverStage() === stage) {
      this.dragOverStage.set(null);
    }
  }

  protected onDrop(event: DragEvent, targetStage: ListingStage): void {
    event.preventDefault();
    this.dragOverStage.set(null);

    const listingId = this.dragListingId();
    if (!listingId) return;

    const listing = this.allListings().find(l => l.id === listingId);
    if (!listing) return;

    const sourceStage = listing.stage;
    if (sourceStage === targetStage) {
      this.dragListingId.set(null);
      return;
    }

    // Open confirm modal before executing transition.
    this.pendingListingId = listingId;
    this.modalFrom.set(sourceStage);
    this.modalTo.set(targetStage);
    this.modalOpen.set(true);
    this.dragListingId.set(null);
  }

  // ── Modal event handlers ──────────────────────────────────────────────────────

  protected onModalConfirm(event: { reason: string | null }): void {
    this.modalOpen.set(false);
    const id = this.pendingListingId;
    if (!id) return;

    const targetStage = this.modalTo();
    const dto: ChangeStageDto = {
      stage: targetStage,
      ...(event.reason ? { reason: event.reason } : {}),
    };

    // Optimistic update: move card immediately.
    this.allListings.update(listings =>
      listings.map(l => l.id === id ? { ...l, stage: targetStage } : l)
    );

    this.listingsService.changeStage(id, dto)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          // Refresh the full board to sync server state.
          this.loadListings();
        },
        error: (err) => {
          // Revert optimistic update.
          console.error('Stage transition failed:', err);
          this.loadListings();
        },
      });

    this.pendingListingId = null;
  }

  protected onModalCancel(): void {
    this.modalOpen.set(false);
    this.pendingListingId = null;
  }

  // ── Display helpers ───────────────────────────────────────────────────────────

  protected formatPrice(filsString: string): string {
    const fils = Number(filsString);
    if (Number.isNaN(fils)) return '—';
    return formatKwd(fils / 1000);
  }

  protected getColumnCount(stage: ListingStage): number {
    return this.listingsByStage().get(stage)?.length ?? 0;
  }

  protected getColumnItems(stage: ListingStage): ListingSummary[] {
    return this.listingsByStage().get(stage) ?? [];
  }

  protected isDragOver(stage: ListingStage): boolean {
    return this.dragOverStage() === stage;
  }

  protected isDragging(listingId: string): boolean {
    return this.dragListingId() === listingId;
  }

  protected isStageHidden(stage: ListingStage): boolean {
    return this.hiddenStages().has(stage);
  }

  protected isBrandSelected(brandId: string): boolean {
    return this.selectedBrandIds().has(brandId);
  }
}
