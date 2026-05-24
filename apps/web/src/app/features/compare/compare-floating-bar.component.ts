import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  PLATFORM_ID,
  computed,
  inject,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';
import { LanguageService } from '@behbehani-cpo/shared-i18n';
import { CompareSelectionService } from '../../data/compare-selection.service';

/**
 * v1.5-D17b — Fixed bottom-right pill that appears whenever the user has
 * selected 2+ listings to compare. Visible globally (mounted once in the
 * shell), so the selection survives navigation between /browse, /account/
 * favorites, and home.
 *
 * SSR-safe — only renders on the browser because:
 *  - selection is persisted to sessionStorage (server has no access)
 *  - position:fixed with `dir` math is awkward to hydrate cleanly
 *  - the count reads from a signal that's empty on the server anyway
 */
@Component({
  selector: 'app-compare-floating-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule],
  template: `
    @if (isBrowser && visible()) {
      <div
        class="fixed bottom-5 z-40 flex items-center gap-2 rounded-pill border border-brand-300 bg-white px-3 py-2 shadow-brand-lg backdrop-blur"
        style="inset-inline-end: 1.25rem"
        role="region"
        [attr.aria-label]="'compare.cta' | translate"
      >
        <span class="inline-grid h-8 w-8 place-items-center rounded-full bg-brand-700 text-[13px] font-bold text-white tabular-nums" aria-hidden="true">
          {{ count() }}
        </span>
        <span class="hidden text-[13px] font-semibold text-ink sm:inline">
          {{ 'compare.selected' | translate }}
        </span>
        <button
          type="button"
          (click)="onClear()"
          class="inline-grid h-9 w-9 place-items-center rounded-full text-muted-2 hover:bg-surface-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          [attr.aria-label]="'compare.clear' | translate"
          [attr.title]="'compare.clear' | translate"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true">
            <path d="m6 6 12 12M18 6 6 18" />
          </svg>
        </button>
        <button
          type="button"
          (click)="onCompare()"
          class="inline-flex min-h-[44px] items-center gap-1.5 rounded-pill bg-brand-700 px-4 py-2 text-[13px] font-semibold text-white shadow-brand-sm hover:bg-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          <span>{{ 'compare.cta' | translate }}</span>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true">
            <path [attr.d]="isRtl() ? 'M14 6l-6 6 6 6' : 'M10 6l6 6-6 6'" />
          </svg>
        </button>
      </div>
    }
  `,
})
export class CompareFloatingBarComponent {
  private readonly selection = inject(CompareSelectionService);
  private readonly router = inject(Router);
  private readonly language = inject(LanguageService);
  private readonly platformId = inject(PLATFORM_ID);

  protected readonly isBrowser = isPlatformBrowser(this.platformId);

  protected readonly count = this.selection.count;

  /** v1.5-D18b — Track current URL via Router events so we can hide the bar
   *  when the user is already on /compare. SSR-safe via Router (no window). */
  private readonly currentUrl = signal(this.router.url);
  constructor() {
    const destroyRef = inject(DestroyRef);
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(destroyRef),
      )
      .subscribe((e) => this.currentUrl.set(e.urlAfterRedirects));
  }
  private readonly isOnComparePage = computed(() => this.currentUrl().includes('/compare'));

  /** Only show when (a) the user has at least 2 selected (the API minimum)
   *  AND (b) we're not already on the compare screen. */
  protected readonly visible = computed(
    () => this.selection.count() >= 2 && !this.isOnComparePage(),
  );

  protected readonly isRtl = computed(() => this.language.current() === 'ar');

  onClear(): void {
    this.selection.clear();
  }

  onCompare(): void {
    const slugs = this.selection.asArray();
    if (slugs.length < 2) return;
    void this.router.navigate(['/', this.language.current(), 'compare'], {
      queryParams: { slugs: slugs.join(',') },
    });
  }
}
