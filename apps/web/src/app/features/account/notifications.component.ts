import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '@behbehani-cpo/data-access';
import { LanguageService } from '@behbehani-cpo/shared-i18n';
import { SignInModalService } from '../auth/sign-in-modal.service';
import {
  NotificationPreferencesService,
  type NotificationPreferences,
} from '../../data/notification-preferences.service';

type State =
  | { kind: 'loading' }
  | { kind: 'ready'; baseline: NotificationPreferences; draft: NotificationPreferences }
  | { kind: 'saving'; baseline: NotificationPreferences; draft: NotificationPreferences }
  | { kind: 'error'; reason: 'unauthenticated' | 'network_error' };

type Channel = 'email' | 'sms' | 'push';
type MutableCategory = 'bookingUpdates' | 'listingAlerts' | 'marketing';

/** Per-cell grid state — each (category × channel) cell is independent. */
type CellGrid = Record<MutableCategory, Record<Channel, boolean>>;

function deepEqual(a: NotificationPreferences, b: NotificationPreferences): boolean {
  return (
    a.channels.email === b.channels.email &&
    a.channels.sms === b.channels.sms &&
    a.channels.push === b.channels.push &&
    a.categories.bookingUpdates === b.categories.bookingUpdates &&
    a.categories.listingAlerts === b.categories.listingAlerts &&
    a.categories.marketing === b.categories.marketing
  );
}

function clonePrefs(p: NotificationPreferences): NotificationPreferences {
  return { channels: { ...p.channels }, categories: { ...p.categories } };
}

/**
 * Build a per-cell grid from DTO prefs.
 * A cell is "on" when BOTH the channel AND the category are enabled in the DTO.
 */
function buildCellGrid(p: NotificationPreferences): CellGrid {
  const cats: MutableCategory[] = ['bookingUpdates', 'listingAlerts', 'marketing'];
  const chs: Channel[] = ['email', 'sms', 'push'];
  const grid = {} as CellGrid;
  for (const cat of cats) {
    grid[cat] = {} as Record<Channel, boolean>;
    for (const ch of chs) {
      grid[cat][ch] = p.channels[ch] && p.categories[cat];
    }
  }
  return grid;
}

/**
 * Collapse per-cell grid back into DTO shape.
 * A channel is "on" if ANY category cell for that channel is on.
 * A category is "on" if ANY channel cell for that category is on.
 */
function gridToPrefs(grid: CellGrid, base: NotificationPreferences): NotificationPreferences {
  const cats: MutableCategory[] = ['bookingUpdates', 'listingAlerts', 'marketing'];
  const chs: Channel[] = ['email', 'sms', 'push'];
  const channels = { ...base.channels };
  const categories = { ...base.categories };
  for (const ch of chs) {
    channels[ch] = cats.some((cat) => grid[cat][ch]);
  }
  for (const cat of cats) {
    categories[cat] = chs.some((ch) => grid[cat][ch]);
  }
  return { channels, categories };
}

function cloneCellGrid(grid: CellGrid): CellGrid {
  const cats: MutableCategory[] = ['bookingUpdates', 'listingAlerts', 'marketing'];
  const chs: Channel[] = ['email', 'sms', 'push'];
  const out = {} as CellGrid;
  for (const cat of cats) {
    out[cat] = {} as Record<Channel, boolean>;
    for (const ch of chs) {
      out[cat][ch] = grid[cat][ch];
    }
  }
  return out;
}

/**
 * Account — Notification Preferences page.
 * Route: /:locale/account/notifications
 * Contract: CONCIERGE_INSPECTION_API_CONTRACT.md v1.4.2 §6
 * Endpoints 14/15: GET + PUT /v1/public/me/notification-preferences
 */
@Component({
  selector: 'app-account-notifications',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, TranslateModule],
  template: `
    <!-- ===== COMPACT HERO HEADER (Part C.4) ===== -->
    <header class="mb-6 rounded-3xl bg-gradient-to-br from-brand-50 via-white to-brand-50/40 border border-brand-100 px-6 py-5 flex items-center gap-4">
      <span class="inline-grid h-14 w-14 flex-shrink-0 place-items-center rounded-2xl bg-brand-700 text-white shadow-brand-sm" aria-hidden="true">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
        </svg>
      </span>
      <div class="min-w-0">
        <h1 class="font-display text-[22px] sm:text-[26px] font-bold text-ink mb-0.5 tracking-[-0.02em]">
          {{ 'account.shell.page.notifications.title' | translate }}
        </h1>
        <p class="text-[13px] text-muted">
          {{ 'account.shell.page.notifications.sub' | translate }}
        </p>
      </div>
    </header>

    <!-- ===== MAIN ===== -->
    <main>

      <!-- LOADING SKELETON -->
      @if (state().kind === 'loading') {
        <div class="rounded-3xl border border-line bg-white p-8 shadow-brand-sm animate-pulse">
          <div class="h-5 w-40 bg-slate-200 rounded mb-6"></div>
          @for (i of [1, 2, 3, 4]; track i) {
            <div class="flex gap-6 mb-5 items-center">
              <div class="h-4 flex-1 bg-slate-200 rounded"></div>
              <div class="h-6 w-10 bg-slate-200 rounded-full"></div>
              <div class="h-6 w-10 bg-slate-200 rounded-full"></div>
              <div class="h-6 w-10 bg-slate-200 rounded-full"></div>
            </div>
          }
        </div>
      }

      <!-- ERROR STATE -->
      @else if (state().kind === 'error') {
        <div class="rounded-3xl border border-line bg-white p-10 text-center shadow-brand-sm">
          @if (asError(state()).reason === 'unauthenticated') {
            <p class="text-[14px] text-muted">
              {{ 'account.notifications.signInRequired.body' | translate }}
            </p>
          } @else {
            <p class="text-[14px] text-muted mb-4">
              {{ 'account.notifications.errors.network' | translate }}
            </p>
            <button
              (click)="load()"
              type="button"
              class="px-5 py-2 bg-brand-700 text-white text-[13px] font-semibold
                     rounded-lg hover:bg-brand-800 transition-colors min-h-[44px]"
            >
              {{ 'account.notifications.errors.retry' | translate }}
            </button>
          }
        </div>
      }

      <!-- READY + SAVING -->
      @else if (state().kind === 'ready' || state().kind === 'saving') {
        <div class="rounded-3xl border border-line bg-white shadow-brand-sm overflow-hidden">

          <!-- DESKTOP TABLE -->
          <div class="hidden sm:block p-6 sm:p-8">
            <!-- Column headers -->
            <div class="grid gap-x-6 mb-4 items-end"
                 style="grid-template-columns: 1fr 64px 64px 80px">
              <div></div>
              <div class="text-center">
                <span class="text-[11px] font-semibold text-muted uppercase tracking-wider block">
                  {{ 'account.notifications.channels.email' | translate }}
                </span>
              </div>
              <div class="text-center">
                <span class="text-[11px] font-semibold text-muted uppercase tracking-wider block">
                  {{ 'account.notifications.channels.sms' | translate }}
                </span>
              </div>
              <div class="text-center">
                <span class="text-[11px] font-semibold text-muted uppercase tracking-wider block">
                  {{ 'account.notifications.channels.push' | translate }}
                </span>
                <span class="text-[10px] text-muted/70 block leading-tight mt-0.5">
                  {{ 'account.notifications.pushCaption' | translate }}
                </span>
              </div>
            </div>

            <!-- Grid rows -->
            <div class="divide-y divide-line">
              @for (row of gridRows; track row.cat) {
                <div class="grid gap-x-6 py-4 items-center"
                     style="grid-template-columns: 1fr 64px 64px 80px">
                  <span class="text-[14px] font-medium text-ink">
                    {{ row.labelKey | translate }}
                  </span>

                  @if (row.locked) {
                    <!-- locked security pills × 3 channels -->
                    @for (ch of channels; track ch) {
                      <div class="flex justify-center">
                        <span
                          class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full
                                 bg-brand-50 text-brand-700 border border-brand-200
                                 text-[11px] font-semibold select-none"
                          [title]="'account.notifications.securityTooltip' | translate"
                        >
                          <svg class="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor"
                               stroke-width="2.5" viewBox="0 0 24 24" aria-hidden="true">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                            <path stroke-linecap="round" d="M7 11V7a5 5 0 0110 0v4"/>
                          </svg>
                          {{ 'account.notifications.securityRequired' | translate }}
                        </span>
                      </div>
                    }
                  } @else {
                    <!-- mutable toggles -->
                    @for (ch of channels; track ch) {
                      <div class="flex justify-center">
                        <button
                          type="button"
                          [attr.aria-pressed]="getCellValue(row.cat, ch)"
                          [attr.aria-label]="(row.labelKey | translate) + ' ' + ('account.notifications.channels.' + ch | translate)"
                          [disabled]="state().kind === 'saving'"
                          (click)="onToggle(row.cat, ch)"
                          class="relative focus-visible:outline focus-visible:outline-2
                                 focus-visible:outline-offset-2 focus-visible:outline-brand-700
                                 disabled:opacity-50 disabled:cursor-not-allowed rounded-full"
                          style="width:40px;height:44px;display:flex;align-items:center;justify-content:center;"
                        >
                          <span
                            class="relative block rounded-full transition-colors duration-200"
                            style="width:40px;height:22px;"
                            [class.bg-brand-700]="getCellValue(row.cat, ch)"
                            [class.bg-slate-200]="!getCellValue(row.cat, ch)"
                          >
                            <span
                              class="absolute top-[2px] bg-white rounded-full shadow transition-all duration-200"
                              style="width:18px;height:18px;"
                              [style.left]="getCellValue(row.cat, ch) ? '20px' : '2px'"
                            ></span>
                          </span>
                        </button>
                      </div>
                    }
                  }
                </div>
              }
            </div>
          </div>

          <!-- MOBILE CARDS (one per category) -->
          <div class="sm:hidden divide-y divide-line">
            @for (row of gridRows; track row.cat) {
              <div class="p-5">
                <p class="text-[14px] font-semibold text-ink mb-3">
                  {{ row.labelKey | translate }}
                </p>

                @if (row.locked) {
                  <div class="flex flex-wrap gap-2">
                    @for (ch of channels; track ch) {
                      <span
                        class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full
                               bg-brand-50 text-brand-700 border border-brand-200
                               text-[11px] font-semibold select-none"
                        [title]="'account.notifications.securityTooltip' | translate"
                      >
                        <svg class="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor"
                             stroke-width="2.5" viewBox="0 0 24 24" aria-hidden="true">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                          <path stroke-linecap="round" d="M7 11V7a5 5 0 0110 0v4"/>
                        </svg>
                        {{ 'account.notifications.channels.' + ch | translate }}
                      </span>
                    }
                  </div>
                } @else {
                  <div class="flex flex-wrap gap-5">
                    @for (ch of channels; track ch) {
                      <button
                        type="button"
                        [attr.aria-pressed]="getCellValue(row.cat, ch)"
                        [attr.aria-label]="(row.labelKey | translate) + ' ' + ('account.notifications.channels.' + ch | translate)"
                        [disabled]="state().kind === 'saving'"
                        (click)="onToggle(row.cat, ch)"
                        class="flex items-center gap-2 min-h-[44px] focus-visible:outline
                               focus-visible:outline-2 focus-visible:outline-brand-700 rounded
                               disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span
                          class="relative block rounded-full transition-colors duration-200 flex-shrink-0"
                          style="width:40px;height:22px;"
                          [class.bg-brand-700]="getCellValue(row.cat, ch)"
                          [class.bg-slate-200]="!getCellValue(row.cat, ch)"
                        >
                          <span
                            class="absolute top-[2px] bg-white rounded-full shadow transition-all duration-200"
                            style="width:18px;height:18px;"
                            [style.left]="getCellValue(row.cat, ch) ? '20px' : '2px'"
                          ></span>
                        </span>
                        <span class="text-[13px] text-ink-2">
                          {{ 'account.notifications.channels.' + ch | translate }}
                        </span>
                      </button>
                    }
                  </div>
                }
              </div>
            }
          </div>

          <!-- FOOTER -->
          <div
            class="px-6 sm:px-8 pb-6 sm:pb-8 pt-4 border-t border-line
                   flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
          >
            <p class="text-[12px] text-muted">
              {{ 'account.notifications.applyCaption' | translate }}
            </p>
            <div class="flex items-center gap-3">
              @if (isDirty()) {
                <span class="text-[12px] text-muted italic">
                  {{ 'account.notifications.dirtyHint' | translate }}
                </span>
              }
              <button
                type="button"
                (click)="onSave()"
                [disabled]="!isDirty() || state().kind === 'saving'"
                class="min-h-[44px] px-6 py-2.5 rounded-xl font-semibold text-[14px] transition-colors
                       bg-brand-700 text-white hover:bg-brand-800 active:bg-brand-900
                       disabled:opacity-40 disabled:cursor-not-allowed"
              >
                @if (state().kind === 'saving') {
                  {{ 'account.notifications.savingCta' | translate }}
                } @else {
                  {{ 'account.notifications.saveCta' | translate }}
                }
              </button>
            </div>
          </div>
        </div>

        <!-- SUCCESS TOAST -->
        @if (showToast()) {
          <div
            class="fixed bottom-6 inset-x-0 flex justify-center z-50 pointer-events-none"
            role="status"
            aria-live="polite"
          >
            <div
              class="bg-brand-700 text-white px-5 py-3 rounded-xl shadow-brand
                     text-[14px] font-medium pointer-events-auto"
            >
              {{ 'account.notifications.savedToast' | translate }}
            </div>
          </div>
        }
      }
    </main>
  `,
})
export class AccountNotificationsComponent {
  readonly auth = inject(AuthService);
  private readonly svc = inject(NotificationPreferencesService);
  private readonly signInModal = inject(SignInModalService);
  private readonly language = inject(LanguageService);
  private readonly translate = inject(TranslateService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly titleSvc = inject(Title);
  private readonly meta = inject(Meta);
  private readonly destroyRef = inject(DestroyRef);

  readonly locale = computed(() => this.language.current());
  readonly state = signal<State>({ kind: 'loading' });
  readonly showToast = signal(false);

  /**
   * Per-cell grid signal — each (category × channel) coordinate is independent.
   * This is the source of truth for the toggle UI; the DTO shape is derived from
   * this on save via gridToPrefs().
   */
  readonly cells = signal<CellGrid>(buildCellGrid({
    channels: { email: false, sms: false, push: false },
    categories: { bookingUpdates: false, listingAlerts: false, marketing: false, accountSecurity: true },
  }));

  readonly channels: Channel[] = ['email', 'sms', 'push'];

  readonly gridRows: { cat: MutableCategory | 'accountSecurity'; labelKey: string; locked: boolean }[] = [
    { cat: 'bookingUpdates', labelKey: 'account.notifications.categories.bookingUpdates', locked: false },
    { cat: 'listingAlerts', labelKey: 'account.notifications.categories.listingAlerts', locked: false },
    { cat: 'marketing', labelKey: 'account.notifications.categories.marketing', locked: false },
    { cat: 'accountSecurity', labelKey: 'account.notifications.categories.accountSecurity', locked: true },
  ];

  readonly isDirty = computed(() => {
    const s = this.state();
    if (s.kind !== 'ready') return false;
    // Derive current draft from cells grid and compare against baseline
    const currentDraft = gridToPrefs(this.cells(), s.baseline);
    return !deepEqual(s.baseline, currentDraft);
  });

  constructor() {
    effect(
      () => {
        if (isPlatformBrowser(this.platformId) && !this.auth.isSignedIn()) {
          this.signInModal.open();
        }
      },
      { allowSignalWrites: true },
    );

    effect(() => {
      this.translate
        .get('account.notifications.metaTitle')
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((t: string) => {
          this.titleSvc.setTitle(t);
          this.meta.updateTag({ name: 'description', content: t });
        });
    });

    this.load();
  }

  load(): void {
    if (!this.auth.isSignedIn()) return;
    this.state.set({ kind: 'loading' });
    this.svc
      .get()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (result.kind === 'ok') {
          this.cells.set(buildCellGrid(result.prefs));
          this.state.set({
            kind: 'ready',
            baseline: result.prefs,
            draft: clonePrefs(result.prefs),
          });
        } else {
          this.state.set({ kind: 'error', reason: result.kind });
        }
      });
  }

  /**
   * Cell value for category × channel intersection.
   * Reads from the per-cell grid signal so each cell is fully independent.
   */
  getCellValue(cat: MutableCategory | 'accountSecurity', ch: Channel): boolean {
    const s = this.state();
    if (s.kind !== 'ready' && s.kind !== 'saving') return false;
    if (cat === 'accountSecurity') return true;
    return this.cells()[cat as MutableCategory][ch];
  }

  /**
   * Toggle a single (category × channel) cell.
   * Mutates only that coordinate in the cells grid — no other cell is affected.
   */
  onToggle(cat: MutableCategory | 'accountSecurity', ch: Channel): void {
    if (cat === 'accountSecurity') return;
    const s = this.state();
    if (s.kind !== 'ready') return;

    const mutableCat = cat as MutableCategory;
    const next = cloneCellGrid(this.cells());
    next[mutableCat][ch] = !next[mutableCat][ch];
    this.cells.set(next);
  }

  onSave(): void {
    const s = this.state();
    if (s.kind !== 'ready' || !this.isDirty()) return;

    const baseline = s.baseline;
    // Derive DTO from the per-cell grid
    const draft = gridToPrefs(this.cells(), baseline);

    this.state.set({ kind: 'saving', baseline, draft });
    this.svc
      .save(draft)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (result.kind === 'ok') {
          this.cells.set(buildCellGrid(result.prefs));
          this.state.set({ kind: 'ready', baseline: result.prefs, draft: clonePrefs(result.prefs) });
          this.triggerToast(3000);
        } else if (result.kind === 'validation_error') {
          // accountSecurity=false rejected — revert cells to baseline and stay on page
          this.cells.set(buildCellGrid(baseline));
          this.state.set({ kind: 'ready', baseline, draft: clonePrefs(baseline) });
        } else {
          this.state.set({ kind: 'error', reason: result.kind });
        }
      });
  }

  /** Narrow helper for error state used in template. */
  asError(s: State): { kind: 'error'; reason: 'unauthenticated' | 'network_error' } {
    return s as { kind: 'error'; reason: 'unauthenticated' | 'network_error' };
  }

  private triggerToast(ms: number): void {
    this.showToast.set(true);
    if (isPlatformBrowser(this.platformId)) {
      setTimeout(() => this.showToast.set(false), ms);
    }
  }
}
