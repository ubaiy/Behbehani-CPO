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
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '@behbehani-cpo/data-access';
import { LanguageService } from '@behbehani-cpo/shared-i18n';
import { SignInModalService } from '../auth/sign-in-modal.service';
import {
  SavedSearchesService,
  SavedSearchListState,
} from '../../data/saved-searches.service';
import type { SavedSearchDto } from '@behbehani-cpo/shared-types';
import { SavedSearchRowComponent } from './saved-search-row.component';
import { SavedSearchEmptyStateComponent } from './saved-search-empty-state.component';

@Component({
  selector: 'app-saved-searches-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    TranslateModule,
    SavedSearchRowComponent,
    SavedSearchEmptyStateComponent,
  ],
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
              <app-saved-search-empty-state [locale]="locale()" />
            } @else if (resp) {
              <!-- Saved-search cards -->
              @for (search of resp.items; track search.id) {
                <app-saved-search-row
                  [search]="search"
                  [locale]="locale()"
                  [renaming]="renamingId() === search.id"
                  [renameValue]="renameValue()"
                  [savingRename]="savingRename()"
                  (toggleNotify)="onToggleNotify($event)"
                  (openRename)="openRenameModal($event)"
                  (cancelRename)="cancelRename()"
                  (submitRename)="submitRename($event)"
                  (renameInput)="onRenameInput($event)"
                  (openDelete)="openDeleteConfirm($event)"
                />
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
