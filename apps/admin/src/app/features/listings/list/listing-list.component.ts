import {
  ChangeDetectionStrategy,
  Component,
  Injector,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
import { ConfirmModalService } from '@behbehani-cpo/shared-ui';

import type {
  ListingFilter,
  ListingStage,
  ListingSummary,
  Paginated,
} from '@behbehani-cpo/shared-types';
import { LISTING_STAGES } from '@behbehani-cpo/shared-types';
import { formatKwd } from '@behbehani-cpo/shared-utils';
import { AdminListingsService } from '@behbehani-cpo/data-access';
import { AdminCatalogService } from '@behbehani-cpo/data-access';
import { AuthService } from '@behbehani-cpo/data-access';

import {
  STAGE_LABELS,
  STAGE_CHIP_CLASS,
  agingChipClass,
} from '../../../core/listing-stage.util';
import { AdminRoleDirective } from '../../../core/admin-role.directive';
import { ListingFiltersComponent } from './listing-filters.component';

/** Page size options exposed to the template. */
const PAGE_SIZES = [10, 25, 50, 100] as const;

/** Default empty filter applied on init or reset. */
function defaultFilter(): Partial<ListingFilter> {
  return { page: 1, pageSize: 25 };
}

@Component({
  selector: 'admin-listing-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    AdminRoleDirective,
    ListingFiltersComponent,
  ],
  template: `
    <!-- ── Page header ──────────────────────────────────── -->
    <div class="flex items-center justify-between mb-5">
      <div>
        <h1 class="text-xl font-semibold text-slate-800">Vehicle Listings</h1>
        <p class="text-sm text-slate-500 mt-0.5">
          @if (loading()) {
            Loading…
          } @else {
            {{ total() }} vehicles total
          }
        </p>
      </div>

      <div class="flex items-center gap-2.5">
        <a
          routerLink="new"
          *adminRole="['operations_manager','sales_agent','content_editor','general_manager']"
          class="inline-flex items-center gap-1.5 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 transition-colors"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
          </svg>
          New Listing
        </a>
      </div>
    </div>

    <!-- ── Filters ───────────────────────────────────────── -->
    <admin-listing-filters
      [brands]="brands()"
      [models]="models()"
      [bodyTypes]="bodyTypes()"
      [filter]="filter()"
      (filterChange)="onFilterChange($event)"
      (brandChange)="onBrandChange($event)"
      (reset)="resetFilters()"
    />

    <!-- ── Results summary ──────────────────────────────── -->
    <div class="flex items-center justify-between mb-2 px-1">
      <p class="text-sm text-slate-500">
        Showing
        <span class="font-medium text-slate-700">{{ rangeStart() }}–{{ rangeEnd() }}</span>
        of
        <span class="font-medium text-slate-700">{{ total() }}</span>
        results
      </p>
    </div>

    <!-- ── Error banner ──────────────────────────────────── -->
    @if (error()) {
      <div class="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {{ error() }}
      </div>
    }

    <!-- ── Empty state ───────────────────────────────────── -->
    @if (!loading() && items().length === 0) {
      <div class="bg-white rounded-xl border border-slate-200 p-16 flex flex-col items-center justify-center text-center">
        <div class="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
          <svg class="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
        </div>
        <h3 class="text-base font-semibold text-slate-700 mb-1">No listings match your filters</h3>
        <p class="text-sm text-slate-400 max-w-xs mb-6">
          Try adjusting the search terms, stage, or price range.
        </p>
        <div class="flex items-center gap-3">
          <button
            type="button"
            class="text-sm font-medium text-brand-600 hover:underline"
            (click)="resetFilters()"
          >
            Reset filters
          </button>
        </div>
      </div>
    }

    <!-- ── Table ─────────────────────────────────────────── -->
    @if (loading() || items().length > 0) {
      <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-slate-50 border-b border-slate-200">
                <th class="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide w-16">Photo</th>
                <th class="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Vehicle</th>
                <th class="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">VIN</th>
                <th class="px-3 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Price</th>
                <th class="px-3 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Days</th>
                <th class="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Stage</th>
                <th class="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Agent</th>
                <th class="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Updated</th>
                <th class="px-3 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              @if (loading()) {
                @for (i of skeletonRows; track i) {
                  <tr class="animate-pulse">
                    <td class="px-3 py-3"><div class="w-14 h-10 rounded-md bg-slate-200"></div></td>
                    <td class="px-3 py-3"><div class="h-4 bg-slate-200 rounded w-40 mb-1"></div><div class="h-3 bg-slate-100 rounded w-20"></div></td>
                    <td class="px-3 py-3"><div class="h-3 bg-slate-200 rounded w-24"></div></td>
                    <td class="px-3 py-3 text-right"><div class="h-4 bg-slate-200 rounded w-24 ml-auto"></div></td>
                    <td class="px-3 py-3 text-center"><div class="h-4 bg-slate-200 rounded w-8 mx-auto"></div></td>
                    <td class="px-3 py-3"><div class="h-5 bg-slate-200 rounded-full w-20"></div></td>
                    <td class="px-3 py-3"><div class="h-4 bg-slate-200 rounded w-24"></div></td>
                    <td class="px-3 py-3"><div class="h-3 bg-slate-200 rounded w-16"></div></td>
                    <td class="px-3 py-3"></td>
                  </tr>
                }
              } @else {
                @for (item of items(); track item.id; let odd = $odd) {
                  <tr
                    class="hover:bg-slate-50 transition-colors group"
                    [class.bg-slate-50/30]="odd"
                  >
                    <!-- Thumbnail -->
                    <td class="px-3 py-3">
                      <div class="w-14 h-10 rounded-md bg-slate-200 overflow-hidden flex items-center justify-center flex-shrink-0">
                        @if (item.heroPhotoUrl) {
                          <img
                            [src]="item.heroPhotoUrl"
                            [alt]="item.titleEn"
                            class="w-full h-full object-cover"
                            loading="lazy"
                            (error)="onImgError($event)"
                          />
                        } @else {
                          <svg class="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"/>
                          </svg>
                        }
                      </div>
                    </td>

                    <!-- Title / Stock # -->
                    <td class="px-3 py-3">
                      <div class="flex items-center gap-1.5">
                        <a
                          [routerLink]="[item.id]"
                          class="font-medium text-slate-800 hover:text-brand-600 leading-tight"
                        >{{ item.titleEn }}</a>
                        @if (item.featuredAt) {
                          <svg class="w-3.5 h-3.5 flex-shrink-0 text-brand-600" fill="currentColor" viewBox="0 0 20 20" aria-label="Featured" title="Featured">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.293z"/>
                          </svg>
                        }
                      </div>
                      <span class="text-xs text-slate-400 font-mono mt-0.5 block">#{{ item.stockNumber }}</span>
                    </td>

                    <!-- VIN masked -->
                    <td class="px-3 py-3 font-mono text-xs text-slate-500">{{ item.vinMasked }}</td>

                    <!-- Price -->
                    <td class="px-3 py-3 text-right font-medium text-slate-800 tabular-nums whitespace-nowrap">
                      {{ formatPrice(item.priceFils) }}
                    </td>

                    <!-- Days on lot -->
                    <td class="px-3 py-3 text-center">
                      <span
                        class="text-sm font-semibold"
                        [ngClass]="agingChipClass(item.daysOnLot) || 'text-slate-700'"
                      >{{ item.daysOnLot }}</span>
                    </td>

                    <!-- Stage -->
                    <td class="px-3 py-3">
                      <span
                        class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap"
                        [ngClass]="STAGE_CHIP_CLASS[item.stage]"
                      >{{ STAGE_LABELS[item.stage] }}</span>
                    </td>

                    <!-- Assigned salesperson -->
                    <td class="px-3 py-3 text-sm whitespace-nowrap">
                      @if (item.assignedSales) {
                        <span class="text-slate-600">{{ item.assignedSales.fullName }}</span>
                      } @else {
                        <span class="text-slate-400 italic">Unassigned</span>
                      }
                    </td>

                    <!-- Last updated -->
                    <td class="px-3 py-3 text-xs text-slate-400 whitespace-nowrap">
                      {{ formatUpdated(item.updatedAt) }}
                    </td>

                    <!-- Row action menu -->
                    <td class="px-3 py-3 relative">
                      <div class="relative inline-block text-left" #menuWrapper>
                        <button
                          type="button"
                          class="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                          (click)="toggleMenu(item.id)"
                          [attr.aria-expanded]="openMenuId() === item.id"
                          aria-haspopup="true"
                        >
                          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/>
                          </svg>
                        </button>

                        @if (openMenuId() === item.id) {
                          <div
                            class="absolute right-0 z-20 mt-1 w-44 rounded-md bg-white shadow-lg border border-slate-200 py-1 text-sm"
                            role="menu"
                          >
                            <!-- Always visible: View -->
                            <a
                              [routerLink]="[item.id]"
                              class="flex items-center gap-2 px-3 py-1.5 text-slate-700 hover:bg-slate-50"
                              role="menuitem"
                              (click)="closeMenu()"
                            >
                              <svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                              </svg>
                              View
                            </a>

                            <!-- Always visible: Edit -->
                            <a
                              [routerLink]="[item.id]"
                              [queryParams]="{ edit: '1' }"
                              class="flex items-center gap-2 px-3 py-1.5 text-slate-700 hover:bg-slate-50"
                              role="menuitem"
                              (click)="closeMenu()"
                            >
                              <svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                              </svg>
                              Edit
                            </a>

                            <!-- Write actions: gated by role -->
                            <ng-container *adminRole="['operations_manager','sales_agent','content_editor','general_manager']">
                              <button
                                type="button"
                                class="flex w-full items-center gap-2 px-3 py-1.5 text-slate-700 hover:bg-slate-50"
                                role="menuitem"
                                (click)="onMoveStage(item); closeMenu()"
                              >
                                <svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7"/>
                                </svg>
                                Move stage
                              </button>

                              <button
                                type="button"
                                class="flex w-full items-center gap-2 px-3 py-1.5 text-slate-700 hover:bg-slate-50"
                                role="menuitem"
                                (click)="onToggleFeatured(item); closeMenu()"
                              >
                                <svg class="w-3.5 h-3.5"
                                     [class.text-brand-600]="item.featuredAt"
                                     [class.text-slate-400]="!item.featuredAt"
                                     [attr.fill]="item.featuredAt ? 'currentColor' : 'none'"
                                     stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                  <path stroke-linecap="round" stroke-linejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
                                </svg>
                                {{ item.featuredAt ? 'Unfeature' : 'Feature' }}
                              </button>

                              <hr class="my-1 border-slate-100"/>

                              <button
                                type="button"
                                class="flex w-full items-center gap-2 px-3 py-1.5 text-red-600 hover:bg-red-50"
                                role="menuitem"
                                (click)="onArchive(item); closeMenu()"
                              >
                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"/>
                                </svg>
                                Archive
                              </button>
                            </ng-container>
                          </div>
                        }
                      </div>
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>

        <!-- ── Pagination ─────────────────────────────────── -->
        <div class="flex items-center justify-between px-4 py-3 border-t border-slate-200">
          <!-- Page size selector -->
          <div class="flex items-center gap-2">
            <label class="text-xs text-slate-500" for="page-size-select">Rows per page:</label>
            <select
              id="page-size-select"
              class="text-xs rounded border border-slate-300 py-1 px-2 bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
              [ngModel]="currentPageSize()"
              (ngModelChange)="onPageSizeChange($event)"
            >
              @for (size of pageSizes; track size) {
                <option [value]="size">{{ size }}</option>
              }
            </select>
          </div>

          <!-- Page buttons -->
          <div class="flex items-center gap-1">
            <button
              type="button"
              class="px-2 py-1 text-xs rounded border border-slate-300 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40"
              [disabled]="currentPage() <= 1"
              (click)="goToPage(currentPage() - 1)"
              aria-label="Previous page"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/>
              </svg>
            </button>

            @for (pg of pageNumbers(); track pg) {
              @if (pg === -1) {
                <span class="px-1 text-xs text-slate-400">…</span>
              } @else {
                <button
                  type="button"
                  class="px-2.5 py-1 text-xs rounded border font-semibold"
                  [class.border-brand-600]="pg === currentPage()"
                  [class.bg-brand-600]="pg === currentPage()"
                  [class.text-white]="pg === currentPage()"
                  [class.border-slate-300]="pg !== currentPage()"
                  [class.bg-white]="pg !== currentPage()"
                  [class.text-slate-700]="pg !== currentPage()"
                  [class.hover:bg-slate-50]="pg !== currentPage()"
                  (click)="goToPage(pg)"
                >{{ pg }}</button>
              }
            }

            <button
              type="button"
              class="px-2 py-1 text-xs rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              [disabled]="currentPage() >= totalPages()"
              (click)="goToPage(currentPage() + 1)"
              aria-label="Next page"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class ListingListComponent implements OnInit {
  // ─── Services ───────────────────────────────────────────────────────────────
  private readonly listingsService = inject(AdminListingsService);
  private readonly catalogService = inject(AdminCatalogService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly confirm = inject(ConfirmModalService);
  // Captured here (constructor-time injection context) so toObservable() can be
  // called later in ngOnInit without throwing NG0203.
  private readonly injector = inject(Injector);
  private readonly destroy$ = new Subject<void>();

  // ─── Exposed constants ──────────────────────────────────────────────────────
  protected readonly STAGE_LABELS = STAGE_LABELS;
  protected readonly STAGE_CHIP_CLASS = STAGE_CHIP_CLASS;
  protected readonly LISTING_STAGES = LISTING_STAGES;
  protected readonly agingChipClass = agingChipClass;
  protected readonly pageSizes = PAGE_SIZES;
  protected readonly skeletonRows = Array.from({ length: 8 }, (_, i) => i);

  // ─── State signals ──────────────────────────────────────────────────────────
  protected readonly filter = signal<Partial<ListingFilter>>(defaultFilter());
  protected readonly items = signal<ListingSummary[]>([]);
  protected readonly total = signal<number>(0);
  protected readonly loading = signal<boolean>(true);
  protected readonly error = signal<string | null>(null);
  protected readonly brands = signal<Array<{ id: string; slug: string; nameEn: string; nameAr: string; logoUrl: string | null }>>([]);
  protected readonly models = signal<Array<{ id: string; slug: string; nameEn: string; nameAr: string; trims: Array<{ id: string; name: string }> }>>([]);
  protected readonly bodyTypes = signal<Array<{ id: string; slug: string; nameEn: string; nameAr: string }>>([]);
  protected readonly openMenuId = signal<string | null>(null);

  // ─── Derived signals ─────────────────────────────────────────────────────────
  protected readonly currentPage = computed(() => this.filter().page ?? 1);
  protected readonly currentPageSize = computed(() => this.filter().pageSize ?? 25);
  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.total() / this.currentPageSize()))
  );
  protected readonly rangeStart = computed(() =>
    this.total() === 0 ? 0 : (this.currentPage() - 1) * this.currentPageSize() + 1
  );
  protected readonly rangeEnd = computed(() =>
    Math.min(this.currentPage() * this.currentPageSize(), this.total())
  );
  protected readonly pageNumbers = computed<number[]>(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages: number[] = [1];
    if (current > 3) pages.push(-1);
    for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) pages.push(p);
    if (current < total - 2) pages.push(-1);
    pages.push(total);
    return pages;
  });

  // ─── Debounced search subject ─────────────────────────────────────────────────
  private readonly searchSubject = new Subject<string>();

  ngOnInit(): void {
    // Seed filter from URL query params (preserves state on refresh)
    const params = this.route.snapshot.queryParamMap;
    const seeded: Partial<ListingFilter> = { ...defaultFilter() };
    const q = params.get('q');
    if (q) seeded.q = q;
    const brandId = params.get('brandId');
    if (brandId) seeded.brandId = brandId;
    const modelId = params.get('modelId');
    if (modelId) seeded.modelId = modelId;
    const bodyTypeId = params.get('bodyTypeId');
    if (bodyTypeId) seeded.bodyTypeId = bodyTypeId;
    const stage = params.get('stage') as ListingStage | null;
    if (stage && (LISTING_STAGES as readonly string[]).includes(stage)) seeded.stage = stage;
    const minYear = params.get('minYear');
    if (minYear) seeded.minYear = Number(minYear);
    const maxYear = params.get('maxYear');
    if (maxYear) seeded.maxYear = Number(maxYear);
    const minPrice = params.get('minPriceFils');
    if (minPrice) seeded.minPriceFils = Number(minPrice);
    const maxPrice = params.get('maxPriceFils');
    if (maxPrice) seeded.maxPriceFils = Number(maxPrice);
    const featured = params.get('featured');
    if (featured === 'true') seeded.featured = true;
    if (featured === 'false') seeded.featured = false;
    const page = params.get('page');
    if (page) seeded.page = Number(page);
    const pageSize = params.get('pageSize');
    if (pageSize) seeded.pageSize = Number(pageSize);
    this.filter.set(seeded);

    // Load catalog dropdowns once
    this.catalogService.brands().pipe(takeUntil(this.destroy$)).subscribe({
      next: b => this.brands.set(b),
      error: err => console.error('[ListingList] Failed to load brands', err),
    });
    this.catalogService.bodyTypes().pipe(takeUntil(this.destroy$)).subscribe({
      next: bt => this.bodyTypes.set(bt),
      error: err => console.error('[ListingList] Failed to load body types', err),
    });

    // Cascade models when filter already has a brandId
    if (seeded.brandId) {
      this.catalogService.models(seeded.brandId).pipe(takeUntil(this.destroy$)).subscribe(m => this.models.set(m));
    }

    // Debounce search input and fold back into filter signal
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$),
    ).subscribe(q => {
      this.filter.update(f => ({ ...f, q: q || undefined, page: 1 }));
    });

    // Reactive fetch: every time filter changes, switchMap to new API call.
    // Pass injector explicitly because ngOnInit is OUTSIDE Angular's
    // constructor-time injection context (NG0203).
    toObservable(this.filter, { injector: this.injector })
      .pipe(
        switchMap(f => {
          this.loading.set(true);
          this.error.set(null);
          this.pushQueryParams(f);
          return this.listingsService.list(f).pipe(
            catchError(err => {
              this.error.set((err as Error)?.message ?? 'Failed to load listings.');
              return of<Paginated<ListingSummary>>({ items: [], total: 0, page: 1, pageSize: f.pageSize ?? 25 });
            })
          );
        }),
        takeUntil(this.destroy$),
      )
      .subscribe((result: Paginated<ListingSummary>) => {
        this.items.set(result.items);
        this.total.set(result.total);
        this.loading.set(false);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ─── Filter handlers ────────────────────────────────────────────────────────

  protected onFilterChange(partial: Partial<ListingFilter>): void {
    this.filter.update(f => ({ ...f, ...partial, page: 1 }));
  }

  /**
   * Handle search separately so debounce lives in searchSubject.
   * The filters child calls this with a raw string; we debounce here.
   */
  protected onSearchInput(q: string): void {
    this.searchSubject.next(q);
  }

  protected onBrandChange(brandId: string | undefined): void {
    this.models.set([]);
    this.filter.update(f => ({ ...f, brandId: brandId || undefined, modelId: undefined, page: 1 }));
    if (brandId) {
      this.catalogService.models(brandId).pipe(takeUntil(this.destroy$)).subscribe(m => this.models.set(m));
    }
  }

  protected resetFilters(): void {
    this.models.set([]);
    this.filter.set(defaultFilter());
  }

  // ─── Pagination handlers ─────────────────────────────────────────────────────

  protected goToPage(page: number): void {
    this.filter.update(f => ({ ...f, page }));
  }

  protected onPageSizeChange(pageSize: number): void {
    this.filter.update(f => ({ ...f, pageSize, page: 1 }));
  }

  // ─── Row action handlers ────────────────────────────────────────────────────

  protected toggleMenu(id: string): void {
    this.openMenuId.update(current => (current === id ? null : id));
  }

  protected closeMenu(): void {
    this.openMenuId.set(null);
  }

  protected onMoveStage(item: ListingSummary): void {
    // Navigate to the edit page where stage transitions are handled
    void this.router.navigate([item.id], {
      relativeTo: this.route,
      queryParams: { stage: '1' },
    });
  }

  protected onArchive(item: ListingSummary): void {
    void this.handleArchive(item);
  }

  /**
   * Toggle the Featured flag. Refetches the current page so the star badge
   * + menu label update without leaving the listing page. No confirm modal —
   * this is a low-risk reversible curation action.
   */
  protected onToggleFeatured(item: ListingSummary): void {
    const next = !item.featuredAt;
    this.listingsService
      .setFeatured(item.id, next)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => this.filter.update((f) => ({ ...f })),
        error: (err) => this.error.set((err as Error)?.message ?? 'Failed to update Featured flag.'),
      });
  }

  private async handleArchive(item: ListingSummary): Promise<void> {
    const ok = await this.confirm.open({
      title: 'Archive vehicle',
      body: `Archive "${item.titleEn}" (#${item.stockNumber})?\n\nThis will remove it from active inventory.`,
      variant: 'destructive',
      requireTyped: 'ARCHIVE',
      confirmLabel: 'Archive vehicle',
      onConfirm: () => firstValueFrom(this.listingsService.archive(item.id)),
    });
    if (ok) {
      // Refetch current page by nudging the filter signal identity
      this.filter.update(f => ({ ...f }));
    }
  }

  // ─── Image fallback ──────────────────────────────────────────────────────────

  /**
   * Swap a broken CDN image to a branded SVG placeholder.
   * Guard flag prevents an infinite loop if the data-URI itself fails.
   */
  protected onImgError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img.dataset['fallbackApplied'] === 'true') return;
    img.dataset['fallbackApplied'] = 'true';
    img.src =
      'data:image/svg+xml;utf8,' +
      encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 40">' +
        '<rect width="64" height="40" fill="#dbeafe"/>' +
        '<path d="M10 28 L16 18 Q17 16 19 16 L45 16 Q47 16 48 18 L54 28 Q55 30 53 30 L11 30 Q9 30 10 28Z" fill="#93c5fd"/>' +
        '<rect x="14" y="30" width="6" height="4" rx="2" fill="#1d4ed8"/>' +
        '<rect x="44" y="30" width="6" height="4" rx="2" fill="#1d4ed8"/>' +
        '<rect x="20" y="18" width="10" height="8" rx="1" fill="#bfdbfe"/>' +
        '<rect x="34" y="18" width="10" height="8" rx="1" fill="#bfdbfe"/>' +
        '</svg>',
      );
  }

  // ─── Display helpers ────────────────────────────────────────────────────────

  /**
   * priceFils is a BigInt serialised as a string in the API response.
   * Divide by 1000 to get KWD, then format.
   */
  protected formatPrice(filsString: string): string {
    const fils = Number(filsString);
    if (Number.isNaN(fils)) return '—';
    return formatKwd(fils / 1000);
  }

  protected formatUpdated(iso: string): string {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffH = Math.floor(diffMs / 3_600_000);
    if (diffH < 1) return 'Just now';
    if (diffH < 24) return `${diffH} hr${diffH === 1 ? '' : 's'} ago`;
    const diffD = Math.floor(diffMs / 86_400_000);
    if (diffD === 1) return 'Yesterday';
    if (diffD < 7) return `${diffD} days ago`;
    return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short' }).format(d);
  }

  // ─── URL sync ────────────────────────────────────────────────────────────────

  private pushQueryParams(f: Partial<ListingFilter>): void {
    const queryParams: Record<string, string | number | undefined> = {};
    if (f.q) queryParams['q'] = f.q;
    if (f.brandId) queryParams['brandId'] = f.brandId;
    if (f.modelId) queryParams['modelId'] = f.modelId;
    if (f.bodyTypeId) queryParams['bodyTypeId'] = f.bodyTypeId;
    if (f.stage) queryParams['stage'] = f.stage;
    if (f.minYear) queryParams['minYear'] = f.minYear;
    if (f.maxYear) queryParams['maxYear'] = f.maxYear;
    if (f.minPriceFils) queryParams['minPriceFils'] = f.minPriceFils;
    if (f.maxPriceFils) queryParams['maxPriceFils'] = f.maxPriceFils;
    if (f.featured !== undefined) queryParams['featured'] = String(f.featured);
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
