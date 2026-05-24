import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { LanguageService } from '@behbehani-cpo/shared-i18n';
import type { FeaturedCar } from '../../data/catalog.types';
import { fmtKm, fmtKwd } from '../../data/kwd';
/* v1.5-D11e: BRANDS lookup gone — using car().brandNameEn/Ar from API. */
import { HeartToggleService } from '../../data/heart-toggle.service';

/**
 * List-view row card. Wider, image on the left, full spec line on the right,
 * "View details" button. Paired with `BrowsePageComponent` when view='list'.
 */
@Component({
  selector: 'app-browse-car-row',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule],
  template: `
    <article
      class="group grid cursor-pointer grid-cols-1 overflow-hidden rounded-2xl border border-line bg-white transition-all hover:-translate-y-0.5 hover:border-transparent hover:shadow-brand-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 sm:grid-cols-[280px_1fr]"
      role="link"
      tabindex="0"
      (click)="openDetail()"
      (keydown.enter)="openDetail()"
      (keydown.space)="$event.preventDefault(); openDetail()"
      [attr.aria-label]="car().model + ' ' + car().year"
    >
      <div class="relative aspect-[16/10] overflow-hidden bg-surface-cool sm:aspect-auto">
        @if (!imageFailed()) {
          <img [src]="car().image" alt="" loading="lazy" (error)="imageFailed.set(true)" class="h-full w-full object-cover" />
        } @else {
          <div class="h-full w-full" [style.background]="'linear-gradient(135deg, ' + car().fallbackColor + ' 0%, #1E293B 100%)'" aria-hidden="true"></div>
        }
        <span class="absolute start-3 top-3 inline-flex items-center gap-1 rounded-pill bg-brand-700 px-2.5 py-0.5 text-[11px] font-semibold text-white">
          {{ 'car.badges.' + car().badge | translate }}
        </span>
      </div>
      <div class="flex flex-col gap-3 p-4 sm:p-5">
        <div class="flex items-start justify-between gap-3">
          <div>
            <div class="text-xs font-medium text-muted">{{ brandName() }} · {{ car().year }}</div>
            <h3 class="mt-0.5 font-display text-[18px] font-bold leading-snug text-ink sm:text-[20px]">{{ car().model }}</h3>
          </div>
          <button
            type="button"
            class="inline-grid h-11 w-11 place-items-center rounded-full bg-surface-soft transition-colors hover:bg-white hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            [class.text-red-600]="isSaved()"
            [class.text-muted-2]="!isSaved()"
            (click)="toggleHeart($event)"
            [attr.title]="(isSaved() ? 'common.heart.saved' : 'common.heart.save') | translate"
            [attr.aria-label]="(isSaved() ? 'common.heart.saved' : 'common.heart.save') | translate"
            [attr.aria-pressed]="isSaved()"
          >
            @if (isSaved()) {
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
                <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
              </svg>
            } @else {
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
              </svg>
            }
          </button>
        </div>

        <div class="flex flex-wrap gap-3 text-[13px] text-muted-2">
          <span class="inline-flex items-center gap-1">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 6v6l4 2" /></svg>
            {{ mileage() }}
          </span>
          <span class="inline-flex items-center gap-1">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 21V7a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v14M3 21h11M16 21V11l4 1v6a2 2 0 0 1-2 2M16 11l-2-2" /></svg>
            {{ car().fuel }}
          </span>
          <span class="inline-flex items-center gap-1">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 14l2-5h10l2 5M3 14h18v5H3z" /><circle cx="7" cy="17.5" r="1.5" fill="currentColor" /><circle cx="17" cy="17.5" r="1.5" fill="currentColor" /></svg>
            {{ car().transmission }}
          </span>
        </div>

        @if (car().inspected) {
          <div class="flex flex-wrap gap-1.5">
            <span class="inline-flex items-center gap-1 rounded-pill bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700">
              <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5l-8-3Z" /></svg>
              {{ 'car.badges.inspected' | translate }}
            </span>
          </div>
        }

        <div class="mt-auto flex items-end justify-between gap-2 border-t border-line pt-3">
          <div>
            <div class="font-display text-[20px] font-bold tracking-tight text-ink">{{ priceLabel() }}</div>
            <div class="mt-0.5 text-xs text-muted">{{ monthlyLabel() }}</div>
          </div>
          <button type="button" class="inline-flex items-center gap-1.5 rounded-pill bg-brand-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-800" (click)="$event.stopPropagation(); openDetail()">
            {{ 'browse.viewDetails' | translate }}
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path [attr.d]="currentLocale() === 'ar' ? 'M14 6l-6 6 6 6' : 'M10 6l6 6-6 6'" /></svg>
          </button>
        </div>
      </div>
    </article>
  `,
})
export class BrowseCarRowComponent implements OnInit {
  readonly car = input.required<FeaturedCar>();
  readonly imageFailed = signal(false);

  private readonly language = inject(LanguageService);
  private readonly router = inject(Router);
  private readonly heartToggle = inject(HeartToggleService);
  readonly currentLocale = computed(() => this.language.current());

  readonly isSaved = computed(() => this.heartToggle.savedIds().has(this.car().id));

  ngOnInit(): void {
    this.heartToggle.hydrate([this.car().id]);
  }

  /** v1.5-D11e: prefer the API-supplied display name (populated by
      toFeaturedCar), fall back to the slug if absent. */
  readonly brandName = computed(() => {
    const c = this.car();
    const localized = this.currentLocale() === 'ar' ? c.brandNameAr : c.brandNameEn;
    return localized || c.brand;
  });

  readonly mileage = computed(() => fmtKm(this.car().mileage, this.currentLocale()));
  readonly priceLabel = computed(() => fmtKwd(this.car().price, this.currentLocale()));
  readonly monthlyLabel = computed(() => {
    const m = fmtKwd(this.car().monthly, this.currentLocale());
    return this.currentLocale() === 'ar' ? `من ${m}/شهر` : `from ${m}/mo`;
  });

  toggleHeart(event: Event): void {
    event.stopPropagation();
    this.heartToggle.toggle(this.car().id).subscribe();
  }

  /** Navigate to the VDP. Uses `slug` from real API data; falls back to `id`
      for legacy mock entries that pre-date the slug field. */
  openDetail(): void {
    const c = this.car();
    const slugOrId = c.slug ?? c.id;
    this.router.navigate(['/', this.currentLocale(), 'listings', slugOrId]);
  }
}
