import {
  ChangeDetectionStrategy,
  Component,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '@behbehani-cpo/data-access';
import { LanguageService } from '@behbehani-cpo/shared-i18n';
import { SignInModalService } from '../auth/sign-in-modal.service';
import {
  SavedSearchesService,
  SavedSearchListState,
} from '../../data/saved-searches.service';
import type { SavedSearchDto, SavedSearchQueryPayload } from '@behbehani-cpo/shared-types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  try {
    const diffMs = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diffMs / 60_000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins} minutes ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hours ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days} days ago`;
    const months = Math.floor(days / 30);
    return `${months} months ago`;
  } catch {
    return '';
  }
}

function filterSummary(payload: SavedSearchQueryPayload): string {
  const parts: string[] = [];
  if (payload.brands?.length) parts.push(payload.brands.slice(0, 2).join(', '));
  if (payload.year_min || payload.year_max) {
    const min = payload.year_min ?? '—';
    const max = payload.year_max ?? '—';
    parts.push(`${min}–${max}`);
  }
  if (payload.price_min_fils !== undefined || payload.price_max_fils !== undefined) {
    const minKwd = payload.price_min_fils !== undefined
      ? `KWD ${(payload.price_min_fils / 1000).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
      : null;
    const maxKwd = payload.price_max_fils !== undefined
      ? `KWD ${(payload.price_max_fils / 1000).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
      : null;
    if (minKwd && maxKwd) parts.push(`${minKwd}–${maxKwd}`);
    else if (minKwd) parts.push(`From ${minKwd}`);
    else if (maxKwd) parts.push(`Up to ${maxKwd}`);
  }
  if (parts.length === 0 && payload.body_types?.length) parts.push(payload.body_types[0]);
  if (parts.length === 0 && payload.fuel_types?.length) parts.push(payload.fuel_types[0]);
  return parts.slice(0, 3).join(' · ') || 'All filters';
}

function payloadToQueryParams(payload: SavedSearchQueryPayload): Record<string, string | string[]> {
  const p: Record<string, string | string[]> = {};
  if (payload.brands?.length) p['brands'] = payload.brands;
  if (payload.models?.length) p['models'] = payload.models;
  if (payload.year_min !== undefined) p['year_min'] = String(payload.year_min);
  if (payload.year_max !== undefined) p['year_max'] = String(payload.year_max);
  if (payload.price_min_fils !== undefined) p['price_min_fils'] = String(payload.price_min_fils);
  if (payload.price_max_fils !== undefined) p['price_max_fils'] = String(payload.price_max_fils);
  if (payload.body_types?.length) p['body_types'] = payload.body_types;
  if (payload.transmissions?.length) p['transmissions'] = payload.transmissions;
  if (payload.fuel_types?.length) p['fuel_types'] = payload.fuel_types;
  if (payload.exterior_colors?.length) p['exterior_colors'] = payload.exterior_colors;
  if (payload.regional_specs?.length) p['regional_specs'] = payload.regional_specs;
  if (payload.inspection_flag !== undefined) p['inspection_flag'] = String(payload.inspection_flag);
  if (payload.warranty_flag !== undefined) p['warranty_flag'] = String(payload.warranty_flag);
  if (payload.sort_by) p['sort_by'] = payload.sort_by;
  if (payload.mileage_min_km !== undefined) p['mileage_min_km'] = String(payload.mileage_min_km);
  if (payload.mileage_max_km !== undefined) p['mileage_max_km'] = String(payload.mileage_max_km);
  return p;
}

// ─────────────────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-saved-searches-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, TranslateModule],
  template: `
    <!-- Compact hero header (Part C.4) -->
      <header class="mb-6 rounded-3xl bg-gradient-to-br from-brand-50 via-white to-brand-50/40 border border-brand-100 px-6 py-5 flex items-center gap-4">
        <span class="inline-grid h-14 w-14 flex-shrink-0 place-items-center rounded-2xl bg-brand-700 text-white shadow-brand-sm" aria-hidden="true">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
          </svg>
        </span>
        <div class="min-w-0">
          <h1 class="font-display text-[22px] sm:text-[26px] font-bold text-ink mb-0.5 tracking-[-0.02em]">
            {{ 'account.shell.page.savedSearches.title' | translate }}
          </h1>
          <p class="text-[13px] text-muted">
            {{ 'account.shell.page.savedSearches.sub' | translate }}
          </p>
        </div>
      </header>

      <!-- Content area -->
      <main class="pb-4">
        <div class="flex flex-col gap-3">

          @if (listState().kind === 'loading') {
            <!-- Skeleton rows -->
            @for (_ of skeletons; track $index) {
              <div class="rounded-2xl border border-line bg-white p-4 shadow-brand-sm animate-pulse">
                <div class="flex items-start gap-3">
                  <div class="flex flex-1 flex-col gap-2">
                    <div class="h-3.5 w-2/5 rounded bg-gray-200"></div>
                    <div class="h-3 w-1/3 rounded bg-gray-100"></div>
                    <div class="h-3 w-1/4 rounded bg-gray-100"></div>
                  </div>
                  <div class="h-6 w-10 flex-shrink-0 rounded-full bg-gray-100"></div>
                </div>
                <div class="mt-4 flex gap-2">
                  <div class="h-8 w-24 rounded-full bg-gray-200"></div>
                  <div class="h-8 w-16 rounded bg-gray-100"></div>
                  <div class="h-8 w-14 rounded bg-gray-100"></div>
                </div>
              </div>
            }
          } @else if (listState().kind === 'error') {
            <!-- Error state -->
            <div class="rounded-2xl border border-line bg-white p-10 text-center shadow-brand-sm">
              <p class="text-[14px] text-muted">{{ 'account.savedSearches.error.body' | translate }}</p>
              <button
                type="button"
                (click)="reload()"
                class="mt-4 min-h-[44px] rounded-lg border border-brand-200 bg-brand-50 px-5 py-2 text-[14px] font-medium text-brand-700 transition-colors hover:bg-brand-100"
              >
                {{ 'account.savedSearches.error.retry' | translate }}
              </button>
            </div>
          } @else if (listState().kind === 'ok') {
            @let resp = okValue();
            @if (resp && resp.items.length === 0) {
              <!-- Empty state (illustrated SVG: bookmark + search) -->
              <div class="rounded-3xl border border-line bg-gradient-to-br from-white to-surface-soft/40 p-12 text-center shadow-brand-sm">
                <div class="mx-auto mb-5 w-20 h-20 rounded-3xl bg-brand-100 flex items-center justify-center">
                  <svg class="w-10 h-10 text-brand-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
                    <circle cx="12" cy="11" r="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </div>
                <h2 class="font-display font-bold text-[18px] text-ink mb-2">{{ 'account.savedSearches.empty.title' | translate }}</h2>
                <p class="text-[14px] text-muted max-w-md mx-auto mb-6">{{ 'account.savedSearches.empty.body' | translate }}</p>
                <a
                  [routerLink]="['/', locale(), 'browse']"
                  class="inline-flex min-h-[48px] items-center rounded-lg bg-brand-700 px-7 py-3 text-[14px] font-semibold text-white hover:bg-brand-800 transition-colors duration-150 active:scale-[0.98] active:transition-transform shadow-brand-sm"
                >
                  {{ 'account.savedSearches.empty.browseCta' | translate }}
                </a>
              </div>
            } @else if (resp) {
              <!-- Saved-search cards -->
              @for (search of resp.items; track search.id) {
                <div class="rounded-2xl border border-line bg-white p-4 shadow-brand-sm hover:shadow-brand hover:border-brand-200 transition-all duration-200">
                  <!-- Top row: name + notify toggle -->
                  <div class="flex items-start justify-between gap-3">
                    <div class="flex-1 min-w-0">
                      @if (renamingId() === search.id) {
                        <!-- Inline rename input -->
                        <div class="flex items-center gap-2">
                          <input
                            type="text"
                            [value]="renameValue()"
                            (input)="onRenameInput($event)"
                            class="flex-1 rounded-lg border border-brand-300 px-3 py-1.5 text-[14px] text-ink focus:border-brand-700 focus:outline-none"
                            [attr.placeholder]="'account.savedSearches.rename.placeholder' | translate"
                          />
                          <button
                            type="button"
                            (click)="submitRename(search)"
                            [disabled]="savingRename()"
                            class="min-h-[36px] rounded-lg bg-brand-700 px-3 py-1 text-[13px] font-medium text-white hover:bg-brand-800 disabled:opacity-50"
                          >
                            {{ 'account.savedSearches.rename.save' | translate }}
                          </button>
                          <button
                            type="button"
                            (click)="cancelRename()"
                            class="min-h-[36px] rounded-lg border border-line px-3 py-1 text-[13px] text-ink-2 hover:bg-gray-50"
                          >
                            {{ 'account.savedSearches.rename.cancel' | translate }}
                          </button>
                        </div>
                      } @else {
                        <h3 class="text-[15px] font-bold text-ink truncate">{{ search.name }}</h3>
                        <p class="mt-1 text-[12px] text-muted">{{ summary(search.queryPayload) }}</p>
                      }
                    </div>
                    <!-- Notify toggle -->
                    <button
                      type="button"
                      (click)="onToggleNotify(search)"
                      [attr.aria-label]="(search.notifyOnMatch ? 'account.savedSearches.card.notifyOn' : 'account.savedSearches.card.notifyOff') | translate"
                      [attr.aria-pressed]="search.notifyOnMatch"
                      class="relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 mt-0.5"
                      [class]="search.notifyOnMatch ? 'bg-brand-700' : 'bg-slate-200'"
                    >
                      <span
                        class="inline-block h-4 w-4 rounded-full bg-white shadow transition-transform"
                        [class]="search.notifyOnMatch ? 'translate-x-6' : 'translate-x-1'"
                      ></span>
                    </button>
                  </div>

                  <!-- Match info -->
                  <p class="mt-3 text-[13px] text-brand-700">
                    <strong>{{ search.matchCountAtCreation ?? 0 }}</strong>
                    {{ 'account.savedSearches.card.matchesWhenSaved' | translate }}
                    @if (search.lastNotifiedAt) {
                      <span class="text-muted">
                        &nbsp;·&nbsp;{{ 'account.savedSearches.card.lastChecked' | translate }} {{ lastChecked(search.lastNotifiedAt) }}
                      </span>
                    }
                  </p>

                  <!-- Actions row -->
                  <div class="mt-4 flex items-center gap-2 flex-wrap">
                    <a
                      [routerLink]="['/', locale(), 'browse']"
                      [queryParams]="queryParams(search.queryPayload)"
                      class="inline-flex items-center gap-1 rounded-full bg-brand-700 text-white px-4 py-1.5 text-[13px] font-semibold hover:bg-brand-800 min-h-[44px] transition-colors"
                    >
                      {{ 'account.savedSearches.card.viewResults' | translate }}
                    </a>
                    <button
                      type="button"
                      (click)="openRenameModal(search)"
                      class="text-[13px] text-brand-700 hover:text-brand-900 hover:underline min-h-[44px] px-2"
                    >
                      {{ 'account.savedSearches.card.rename' | translate }}
                    </button>
                    <button
                      type="button"
                      (click)="openDeleteConfirm(search)"
                      class="text-[13px] text-red-600 hover:text-red-700 hover:underline min-h-[44px] px-2"
                    >
                      {{ 'account.savedSearches.card.delete' | translate }}
                    </button>
                  </div>
                </div>
              }

              <!-- Pagination -->
              @if (totalPages() > 1) {
                <div class="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    (click)="prevPage()"
                    [disabled]="currentPage() <= 1"
                    class="min-h-[44px] rounded-lg border border-line bg-white px-4 py-2 text-[13px] font-medium text-ink-2 transition-colors hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {{ 'account.savedSearches.pagination.prev' | translate }}
                  </button>
                  <span class="text-[13px] text-muted">
                    {{ 'account.savedSearches.pagination.pageOf' | translate: { page: currentPage(), total: totalPages() } }}
                  </span>
                  <button
                    type="button"
                    (click)="nextPage()"
                    [disabled]="currentPage() >= totalPages()"
                    class="min-h-[44px] rounded-lg border border-line bg-white px-4 py-2 text-[13px] font-medium text-ink-2 transition-colors hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {{ 'account.savedSearches.pagination.next' | translate }}
                  </button>
                </div>
              }
            }
          }

        </div>
      </main>

      <!-- Delete confirm modal -->
      @if (deletingSearch()) {
        <div
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          role="dialog"
          aria-modal="true"
          (click)="cancelDelete()"
        >
          <div
            class="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
            (click)="$event.stopPropagation()"
          >
            <h2 class="text-[16px] font-bold text-ink">{{ 'account.savedSearches.delete.title' | translate }}</h2>
            <p class="mt-2 text-[13px] text-muted">{{ 'account.savedSearches.delete.body' | translate }}</p>
            <div class="mt-5 flex items-center justify-end gap-3">
              <button
                type="button"
                (click)="cancelDelete()"
                class="min-h-[44px] rounded-lg border border-line bg-white px-4 py-2 text-[13px] font-medium text-ink-2 hover:bg-gray-50 transition-colors"
              >
                {{ 'account.savedSearches.delete.cancel' | translate }}
              </button>
              <button
                type="button"
                (click)="confirmDelete()"
                [disabled]="deletingInProgress()"
                class="min-h-[44px] rounded-lg bg-red-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {{ 'account.savedSearches.delete.confirm' | translate }}
              </button>
            </div>
          </div>
        </div>
      }
  `,
})
export class SavedSearchesPageComponent {
  readonly auth = inject(AuthService);
  private readonly savedSearches = inject(SavedSearchesService);
  private readonly language = inject(LanguageService);
  private readonly signInModal = inject(SignInModalService);
  private readonly platformId = inject(PLATFORM_ID);

  readonly locale = computed(() => this.language.current());
  readonly skeletons = [1, 2, 3];

  readonly currentPage = signal(1);
  readonly listState = signal<SavedSearchListState>({ kind: 'loading' });

  readonly okValue = computed(() => {
    const s = this.listState();
    return s.kind === 'ok' ? s.value : null;
  });

  readonly totalPages = computed(() => {
    const v = this.okValue();
    if (!v) return 1;
    return Math.ceil(v.total / v.pageSize) || 1;
  });

  // Rename state
  readonly renamingId = signal<string | null>(null);
  readonly renameValue = signal('');
  readonly savingRename = signal(false);

  // Delete state
  readonly deletingSearch = signal<SavedSearchDto | null>(null);
  readonly deletingInProgress = signal(false);

  constructor() {
    effect(() => {
      if (isPlatformBrowser(this.platformId) && !this.auth.isSignedIn()) {
        this.signInModal.open();
      }
    }, { allowSignalWrites: true });

    effect(() => {
      const page = this.currentPage();
      if (!this.auth.isSignedIn()) return;
      this.listState.set({ kind: 'loading' });
      this.savedSearches.list(page).subscribe((s) => this.listState.set(s));
    }, { allowSignalWrites: true });
  }

  reload(): void {
    this.listState.set({ kind: 'loading' });
    this.savedSearches.list(this.currentPage()).subscribe((s) => this.listState.set(s));
  }

  prevPage(): void {
    const p = this.currentPage();
    if (p > 1) this.currentPage.set(p - 1);
  }

  nextPage(): void {
    const p = this.currentPage();
    if (p < this.totalPages()) this.currentPage.set(p + 1);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  summary(payload: SavedSearchQueryPayload): string {
    return filterSummary(payload);
  }

  queryParams(payload: SavedSearchQueryPayload): Record<string, string | string[]> {
    return payloadToQueryParams(payload);
  }

  lastChecked(iso: string): string {
    return relativeTime(iso);
  }

  // ── Notify toggle (optimistic) ────────────────────────────────────────────

  onToggleNotify(search: SavedSearchDto): void {
    const newVal = !search.notifyOnMatch;
    // Optimistic update: mutate the list in-place
    const state = this.listState();
    if (state.kind !== 'ok') return;
    const updatedItems = state.value.items.map((item) =>
      item.id === search.id ? { ...item, notifyOnMatch: newVal } : item
    );
    this.listState.set({ kind: 'ok', value: { ...state.value, items: updatedItems } });

    this.savedSearches.update(search.id, { notifyOnMatch: newVal }).subscribe((s) => {
      if (s.kind === 'error') {
        // Revert on error
        const revertState = this.listState();
        if (revertState.kind !== 'ok') return;
        const revertedItems = revertState.value.items.map((item) =>
          item.id === search.id ? { ...item, notifyOnMatch: !newVal } : item
        );
        this.listState.set({ kind: 'ok', value: { ...revertState.value, items: revertedItems } });
      }
    });
  }

  // ── Rename ────────────────────────────────────────────────────────────────

  openRenameModal(search: SavedSearchDto): void {
    this.renamingId.set(search.id);
    this.renameValue.set(search.name);
  }

  cancelRename(): void {
    this.renamingId.set(null);
    this.renameValue.set('');
    this.savingRename.set(false);
  }

  onRenameInput(event: Event): void {
    this.renameValue.set((event.target as HTMLInputElement).value);
  }

  submitRename(search: SavedSearchDto): void {
    const newName = this.renameValue().trim();
    if (!newName || newName === search.name) {
      this.cancelRename();
      return;
    }
    this.savingRename.set(true);
    this.savedSearches.update(search.id, { name: newName }).subscribe((s) => {
      if (s.kind === 'ok') {
        const state = this.listState();
        if (state.kind === 'ok') {
          const updatedItems = state.value.items.map((item) =>
            item.id === search.id ? { ...item, name: newName } : item
          );
          this.listState.set({ kind: 'ok', value: { ...state.value, items: updatedItems } });
        }
      }
      this.cancelRename();
    });
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  openDeleteConfirm(search: SavedSearchDto): void {
    this.deletingSearch.set(search);
  }

  cancelDelete(): void {
    this.deletingSearch.set(null);
    this.deletingInProgress.set(false);
  }

  confirmDelete(): void {
    const search = this.deletingSearch();
    if (!search) return;
    this.deletingInProgress.set(true);
    this.savedSearches.delete(search.id).subscribe((s) => {
      if (s.kind === 'ok') {
        const state = this.listState();
        if (state.kind === 'ok') {
          const filteredItems = state.value.items.filter((item) => item.id !== search.id);
          this.listState.set({
            kind: 'ok',
            value: { ...state.value, items: filteredItems, total: Math.max(0, state.value.total - 1) },
          });
        }
      }
      this.cancelDelete();
    });
  }
}
