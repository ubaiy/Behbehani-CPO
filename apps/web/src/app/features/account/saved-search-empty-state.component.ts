import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

/**
 * Empty-state card shown when the user has zero saved searches.
 * Presentational: takes the current locale to build the "browse" link.
 */
@Component({
  selector: 'app-saved-search-empty-state',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, TranslateModule],
  template: `
    <div
      class="rounded-3xl border border-line bg-gradient-to-br from-white to-surface-soft/40 p-12 text-center shadow-brand-sm"
    >
      <div class="mx-auto mb-5 w-20 h-20 rounded-3xl bg-brand-100 flex items-center justify-center">
        <svg
          class="w-10 h-10 text-brand-700"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="1.5"
          aria-hidden="true"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          <circle cx="12" cy="11" r="2.5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </div>
      <h2 class="font-display font-bold text-[18px] text-ink mb-2">
        {{ 'account.savedSearches.empty.title' | translate }}
      </h2>
      <p class="text-[14px] text-muted max-w-md mx-auto mb-6">
        {{ 'account.savedSearches.empty.body' | translate }}
      </p>
      <a
        [routerLink]="['/', locale, 'browse']"
        class="inline-flex min-h-[48px] items-center rounded-lg bg-brand-700 px-7 py-3 text-[14px] font-semibold text-white hover:bg-brand-800 transition-colors duration-150 active:scale-[0.98] active:transition-transform shadow-brand-sm"
      >
        {{ 'account.savedSearches.empty.browseCta' | translate }}
      </a>
    </div>
  `,
})
export class SavedSearchEmptyStateComponent {
  @Input({ required: true }) locale!: string;
}
