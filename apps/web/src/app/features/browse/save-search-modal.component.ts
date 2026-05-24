import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { SaveSearchModalService } from './save-search-modal.service';
import { SavedSearchesService } from '../../data/saved-searches.service';
import type { CreateSavedSearchInput } from '@behbehani-cpo/shared-types';

type ModalState =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'success'; name: string }
  | { kind: 'error'; message: string };

const ERROR_MAP: Record<string, string> = {
  network_error:  'savedSearches.modal.errors.network',
  VALIDATION_ERROR: 'savedSearches.modal.errors.validation',
};

@Component({
  selector: 'app-save-search-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule, RouterLink],
  template: `
    @if (modal.isOpen()) {
    <div
      class="fixed inset-0 z-[100] flex items-center justify-center bg-ink/60 p-4 backdrop-blur-sm"
      (click)="onBackdrop($event)"
      role="dialog"
      aria-modal="true"
      tabindex="-1"
      [attr.aria-label]="'savedSearches.modal.title' | translate"
    >
      <div class="relative w-full max-w-[440px] rounded-[20px] bg-white p-6 shadow-brand-lg sm:p-8 max-h-[90dvh] overflow-y-auto">
        <!-- Close -->
        <button
          type="button"
          (click)="close()"
          [attr.aria-label]="'savedSearches.modal.cancelCta' | translate"
          class="absolute end-4 top-4 inline-grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-surface-cool hover:text-ink"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 6l12 12M6 18L18 6"/></svg>
        </button>

        <!-- Header -->
        <div class="mb-5 flex items-center gap-3">
          <div class="inline-grid h-10 w-10 place-items-center rounded-full bg-brand-700/10 text-brand-700">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
          </div>
          <div>
            <h2 class="font-display text-[20px] font-bold leading-tight tracking-[-0.02em] text-ink">
              {{ 'savedSearches.modal.title' | translate }}
            </h2>
          </div>
        </div>

        <!-- IDLE — form -->
        @if (state().kind === 'idle' || state().kind === 'saving') {
          <div class="space-y-4">
            <div>
              <label for="save-search-name" class="mb-1.5 block text-[13px] font-semibold text-ink">
                {{ 'savedSearches.modal.nameLabel' | translate }}
              </label>
              <input
                id="save-search-name"
                type="text"
                [value]="name()"
                (input)="onNameInput($any($event.target).value)"
                [placeholder]="'savedSearches.modal.namePlaceholder' | translate"
                maxlength="120"
                [disabled]="state().kind === 'saving'"
                class="w-full rounded-xl border border-line-2 bg-white px-4 py-2.5 text-sm text-ink outline-none placeholder:text-muted focus:border-brand-700 focus:ring-2 focus:ring-brand-700/20 disabled:opacity-50 min-h-[44px]"
                [class.border-red-400]="showNameError()"
              />
              @if (showNameError()) {
                <p class="mt-1 text-[12px] text-red-600" role="alert">
                  @if (name().length === 0) {
                    {{ 'savedSearches.modal.errors.nameRequired' | translate }}
                  } @else {
                    {{ 'savedSearches.modal.errors.nameTooLong' | translate }}
                  }
                </p>
              }
            </div>

            <!-- Notify toggle -->
            <div class="flex items-center justify-between rounded-xl border border-line-2 bg-surface-soft px-4 py-3">
              <div>
                <p class="text-[13px] font-semibold text-ink">{{ 'savedSearches.modal.notifyLabel' | translate }}</p>
                <p class="mt-0.5 text-[11px] text-muted">{{ 'savedSearches.modal.notifyHelp' | translate }}</p>
              </div>
              <button
                type="button"
                role="switch"
                [attr.aria-checked]="notifyOnMatch()"
                (click)="notifyOnMatch.update(v => !v)"
                [disabled]="state().kind === 'saving'"
                class="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2 disabled:opacity-50"
                [class.bg-brand-700]="notifyOnMatch()"
                [class.bg-slate-200]="!notifyOnMatch()"
              >
                <span
                  class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                  [class.translate-x-5]="notifyOnMatch()"
                  [class.translate-x-0]="!notifyOnMatch()"
                ></span>
              </button>
            </div>

            <!-- Actions -->
            <div class="flex gap-3 pt-1">
              <button
                type="button"
                (click)="onSave()"
                [disabled]="state().kind === 'saving'"
                class="inline-flex flex-1 items-center justify-center gap-2 rounded-pill bg-brand-700 px-5 py-3 text-sm font-bold text-white shadow-brand hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50 min-h-[44px]"
              >
                @if (state().kind === 'saving') {
                  <svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/></svg>
                  {{ 'savedSearches.modal.savingCta' | translate }}
                } @else {
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                  {{ 'savedSearches.modal.saveCta' | translate }}
                }
              </button>
              <button
                type="button"
                (click)="close()"
                [disabled]="state().kind === 'saving'"
                class="inline-flex items-center justify-center rounded-pill border border-line bg-white px-5 py-3 text-sm font-semibold text-ink hover:bg-surface-cool disabled:opacity-50 min-h-[44px]"
              >
                {{ 'savedSearches.modal.cancelCta' | translate }}
              </button>
            </div>
          </div>
        }

        <!-- SUCCESS -->
        @if (state().kind === 'success') {
          @let successState = asSuccess(state());
          <div class="flex flex-col items-center gap-4 py-4 text-center">
            <div class="inline-grid h-14 w-14 place-items-center rounded-full bg-brand-700/10 text-brand-700">
              <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m9 12 2 2 4-4"/></svg>
            </div>
            <div>
              <p class="text-[16px] font-bold text-ink">{{ 'savedSearches.modal.successTitle' | translate }}</p>
              <p class="mt-1 text-sm text-muted">
                {{ 'savedSearches.modal.successBody' | translate : { name: successState?.name ?? '' } }}
              </p>
            </div>
            <a
              [routerLink]="['/account/saved-searches']"
              (click)="close()"
              class="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-800 min-h-[44px]"
            >
              {{ 'savedSearches.modal.viewListCta' | translate }}
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </a>
          </div>
        }

        <!-- ERROR -->
        @if (state().kind === 'error') {
          <div class="flex flex-col items-center gap-4 py-6 text-center">
            <div class="inline-grid h-14 w-14 place-items-center rounded-full bg-brand-100 text-brand-700">
              <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.5v.5"/></svg>
            </div>
            <div>
              <p class="text-[15px] font-semibold text-ink">{{ 'savedSearches.modal.errors.generic' | translate }}</p>
              <p class="mt-1 text-sm text-muted">{{ asError(state())?.message | translate }}</p>
            </div>
            <div class="flex gap-3">
              <button
                type="button"
                (click)="retry()"
                class="inline-flex items-center gap-1.5 rounded-lg bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800 min-h-[44px]"
              >
                {{ 'savedSearches.modal.saveCta' | translate }}
              </button>
              <button
                type="button"
                (click)="close()"
                class="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-5 py-2.5 text-sm font-semibold text-ink hover:bg-surface-cool min-h-[44px]"
              >
                {{ 'savedSearches.modal.cancelCta' | translate }}
              </button>
            </div>
          </div>
        }
      </div>
    </div>
    }
  `,
})
export class SaveSearchModalComponent {
  readonly modal = inject(SaveSearchModalService);
  private readonly savedSearches = inject(SavedSearchesService);
  private readonly platformId = inject(PLATFORM_ID);

  readonly state = signal<ModalState>({ kind: 'idle' });
  readonly name = signal('');
  readonly notifyOnMatch = signal(false);
  readonly touched = signal(false);

  readonly showNameError = computed(() => {
    if (!this.touched()) return false;
    const n = this.name().trim();
    return n.length === 0 || n.length > 120;
  });

  constructor() {
    effect(() => {
      if (isPlatformBrowser(this.platformId)) {
        document.body.style.overflow = this.modal.isOpen() ? 'hidden' : '';
      }
    });
    effect(
      () => {
        if (this.modal.isOpen()) {
          this.state.set({ kind: 'idle' });
          this.name.set('');
          this.notifyOnMatch.set(false);
          this.touched.set(false);
        }
      },
      { allowSignalWrites: true },
    );
  }

  onNameInput(value: string): void {
    this.name.set(value);
    this.touched.set(true);
  }

  onSave(): void {
    this.touched.set(true);
    const trimmed = this.name().trim();
    if (trimmed.length === 0 || trimmed.length > 120) return;
    const payload = this.modal.payload();
    if (!payload) return;

    const input: CreateSavedSearchInput = {
      name: trimmed,
      queryPayload: payload,
      notifyOnMatch: this.notifyOnMatch(),
    };

    this.state.set({ kind: 'saving' });
    this.savedSearches.create(input).subscribe((s) => {
      if (s.kind === 'loading') return;
      if (s.kind === 'ok') {
        this.state.set({ kind: 'success', name: trimmed });
        if (isPlatformBrowser(this.platformId)) {
          setTimeout(() => this.modal.close(), 2000);
        }
      } else {
        const msg = ERROR_MAP[s.code] ?? 'savedSearches.modal.errors.generic';
        this.state.set({ kind: 'error', message: msg });
      }
    });
  }

  retry(): void {
    this.state.set({ kind: 'idle' });
  }

  close(): void {
    this.modal.close();
  }

  onBackdrop(e: MouseEvent): void {
    if (e.target === e.currentTarget) this.close();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.modal.isOpen()) this.close();
  }

  asSuccess(s: ModalState): { kind: 'success'; name: string } | null {
    return s.kind === 'success' ? s : null;
  }

  asError(s: ModalState): { kind: 'error'; message: string } | null {
    return s.kind === 'error' ? s : null;
  }
}
