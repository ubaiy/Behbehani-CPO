import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { LanguageService } from '@behbehani-cpo/shared-i18n';
import type { CarBadge, FeaturedCar } from '../../../data/catalog.types';
import { fmtKm, fmtKwd } from '../../../data/kwd';
/* v1.5-D11e: BRANDS lookup gone — using car().brandNameEn/Ar from API. */
import { HeartToggleService } from '../../../data/heart-toggle.service';
import { CompareSelectionService, COMPARE_MAX } from '../../../data/compare-selection.service';

interface BadgeStyle {
  cls: string;
  showShield: boolean;
}

/** Map design car badges → Royal/Gold/Red/Slate variants from styles-base.css `.badge-*`. */
const BADGE_STYLES: Record<CarBadge, BadgeStyle> = {
  premium: { cls: 'bg-brand-600 text-white', showShield: false },
  priceDrop: { cls: 'bg-red-600 text-white', showShield: false },
  selfListed: { cls: 'bg-slate-600 text-white', showShield: false },
  inspected: { cls: 'bg-brand-700 text-white', showShield: true },
  lowMileage: { cls: 'bg-brand-700 text-white', showShield: false },
  recentlyAdded: { cls: 'bg-brand-700 text-white', showShield: false },
};

@Component({
  selector: 'app-car-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule],
  template: `
    <article
      class="group flex cursor-pointer flex-col overflow-hidden rounded-[20px] border border-line bg-white transition-all hover:-translate-y-1.5 hover:border-transparent hover:shadow-brand-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
      role="link"
      tabindex="0"
      (click)="openDetail()"
      (keydown.enter)="openDetail()"
      (keydown.space)="$event.preventDefault(); openDetail()"
      [attr.aria-label]="car().model + ' ' + car().year"
    >
      <div class="relative aspect-[16/10] overflow-hidden bg-surface-cool">
        @if (!imageFailed()) {
          <img
            [src]="car().image"
            alt=""
            loading="lazy"
            (error)="imageFailed.set(true)"
            class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        } @else {
          <div
            class="h-full w-full"
            [style.background]="'linear-gradient(135deg, ' + car().fallbackColor + ' 0%, #1E293B 100%)'"
            aria-hidden="true"
          ></div>
        }
        <div class="absolute start-3 top-3 flex max-w-[calc(100%-60px)] flex-col items-start gap-1.5">
          <span
            class="inline-flex items-center gap-1 rounded-pill px-2.5 py-0.5 text-[11px] font-semibold leading-tight"
            [class]="badgeStyle().cls"
          >
            @if (badgeStyle().showShield) {
              <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true">
                <path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5l-8-3Z" />
              </svg>
            }
            {{ 'car.badges.' + car().badge | translate }}
          </span>
          @if (showInspectedExtra()) {
            <span class="inline-flex items-center gap-1 rounded-pill bg-white/95 px-2.5 py-0.5 text-[11px] font-semibold text-ink shadow-brand-sm backdrop-blur">
              <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.4" class="text-brand-700" aria-hidden="true">
                <path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5l-8-3Z" />
              </svg>
              {{ 'car.badges.inspected' | translate }}
            </span>
          }
        </div>
        <button
          type="button"
          class="absolute end-3 top-3 inline-grid h-11 w-11 place-items-center rounded-full bg-white/85 shadow-brand-sm backdrop-blur transition-colors hover:bg-white hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          [class.text-red-600]="isSaved()"
          [class.text-muted-2]="!isSaved()"
          (click)="toggleHeart($event)"
          [attr.aria-label]="(isSaved() ? 'common.heart.saved' : 'common.heart.save') | translate"
          [attr.title]="(isSaved() ? 'common.heart.saved' : 'common.heart.save') | translate"
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
        <!-- v1.5-D17b: compare checkbox — bottom-end of image so it never collides with badges. -->
        @if (compareSlug()) {
          <button
            type="button"
            (click)="toggleCompare($event)"
            class="absolute bottom-3 end-3 inline-flex min-h-[36px] items-center gap-1.5 rounded-pill bg-white/95 px-2.5 py-1 text-[11px] font-semibold shadow-brand-sm backdrop-blur transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            [class.text-brand-700]="isCompareSelected()"
            [class.text-ink-2]="!isCompareSelected() && !compareCapped()"
            [class.text-muted-2]="!isCompareSelected() && compareCapped()"
            [class.opacity-60]="!isCompareSelected() && compareCapped()"
            [attr.aria-pressed]="isCompareSelected()"
            [attr.aria-label]="(isCompareSelected() ? 'compare.selected' : 'compare.select') | translate"
            [attr.title]="(isCompareSelected() ? 'compare.selected' : (compareCapped() ? 'compare.cap' : 'compare.select')) | translate"
          >
            <span class="inline-grid h-4 w-4 place-items-center rounded-sm border-2 transition-colors"
              [class.border-brand-700]="isCompareSelected()"
              [class.bg-brand-700]="isCompareSelected()"
              [class.border-line-2]="!isCompareSelected()"
              aria-hidden="true"
            >
              @if (isCompareSelected()) {
                <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="white" stroke-width="3" aria-hidden="true">
                  <path d="M5 12l5 5L20 7" />
                </svg>
              }
            </span>
            <span>{{ 'compare.select' | translate }}</span>
          </button>
        }
      </div>
      <div class="flex flex-1 flex-col p-3.5 sm:p-4">
        <div class="text-xs font-medium text-muted">{{ brandName() }} · {{ car().year }}</div>
        <h3 class="mb-2.5 mt-1 font-display text-[16px] font-bold leading-snug tracking-tight text-ink sm:text-[17px]">
          {{ car().model }}
        </h3>
        <div class="mb-3.5 flex flex-wrap gap-3 text-xs text-muted-2">
          <span class="inline-flex items-center gap-1">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M12 6v6l4 2" />
              <circle cx="12" cy="12" r="9" />
            </svg>
            {{ mileage() }}
          </span>
          <span class="inline-flex items-center gap-1">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M3 21V7a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v14M3 21h11M16 21V11l4 1v6a2 2 0 0 1-2 2M16 11l-2-2" />
            </svg>
            {{ car().fuel }}
          </span>
          <span class="inline-flex items-center gap-1">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M5 14l2-5h10l2 5M3 14h18v5H3z" />
              <circle cx="7" cy="17.5" r="1.5" fill="currentColor" />
              <circle cx="17" cy="17.5" r="1.5" fill="currentColor" />
            </svg>
            {{ transmissionLabel() }}
          </span>
        </div>
        <div class="mt-auto flex items-end justify-between gap-2 border-t border-line pt-3">
          <div>
            <div class="font-display text-[20px] font-bold tracking-tight text-ink">{{ priceLabel() }}</div>
            <div class="mt-0.5 text-xs text-muted">{{ monthlyLabel() }}</div>
          </div>
          <button
            type="button"
            class="inline-grid h-9 w-9 place-items-center rounded-full bg-brand-700 text-white transition-transform group-hover:translate-x-1 hover:bg-brand-800"
            [attr.aria-label]="'car.view' | translate"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true">
              <path [attr.d]="currentLocale() === 'ar' ? 'M14 6l-6 6 6 6' : 'M10 6l6 6-6 6'" />
            </svg>
          </button>
        </div>
      </div>
    </article>
  `,
})
export class CarCardComponent implements OnInit {
  readonly car = input.required<FeaturedCar>();
  readonly imageFailed = signal(false);

  private readonly language = inject(LanguageService);
  private readonly router = inject(Router);
  private readonly heartToggle = inject(HeartToggleService);
  private readonly compareSelection = inject(CompareSelectionService);
  readonly currentLocale = computed(() => this.language.current());

  /** Computed from the reactive saved-IDs set — updates automatically on toggle. */
  readonly isSaved = computed(() => this.heartToggle.savedIds().has(this.car().id));

  /* ── v1.5-D17b: compare cart integration ───────────────────────────────── */
  /** Slug is required to compare — older mock entries without a slug get the
      checkbox hidden entirely (the template guards on this). */
  readonly compareSlug = computed(() => this.car().slug ?? '');
  readonly isCompareSelected = computed(() => {
    const s = this.compareSlug();
    return !!s && this.compareSelection.isSelected(s);
  });
  /** True when the user is at the 3-car cap AND this card isn't already in
      the cart — used to dim the checkbox so it's clear why it won't add. */
  readonly compareCapped = computed(
    () => this.compareSelection.count() >= COMPARE_MAX && !this.isCompareSelected(),
  );

  ngOnInit(): void {
    // Per-card hydration fallback: efficient for single-car contexts (VDP, home rail).
    // Browse page hydrates the whole visible page at once via heartToggle.hydrate().
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

  readonly transmissionLabel = computed(() => {
    const t = this.car().transmission;
    if (this.currentLocale() === 'ar') return t === 'Automatic' ? 'أوتوماتيك' : 'يدوي';
    return t === 'Automatic' ? 'Auto' : 'Manual';
  });

  readonly monthlyLabel = computed(() => {
    const m = fmtKwd(this.car().monthly, this.currentLocale());
    return this.currentLocale() === 'ar' ? `من ${m}/شهر` : `from ${m}/mo`;
  });

  readonly badgeStyle = computed<BadgeStyle>(() => BADGE_STYLES[this.car().badge]);

  /** When the badge already conveys premium/price-drop/etc., still surface "Inspected" as a secondary chip if the car is inspected. */
  readonly showInspectedExtra = computed(() => this.car().inspected && this.car().badge !== 'inspected');

  toggleHeart(event: Event): void {
    event.stopPropagation();
    this.heartToggle.toggle(this.car().id).subscribe();
  }

  /** Add/remove this card's slug from the global compare cart. Stops the
      click from bubbling to the card's `openDetail()` handler. */
  toggleCompare(event: Event): void {
    event.stopPropagation();
    const slug = this.compareSlug();
    if (!slug) return;
    this.compareSelection.toggle(slug);
  }

  /** Navigate to the VDP. Uses `slug` from real API data; falls back to `id`
      for legacy mock entries that pre-date the slug field. */
  openDetail(): void {
    const c = this.car();
    const slugOrId = c.slug ?? c.id;
    this.router.navigate(['/', this.currentLocale(), 'listings', slugOrId]);
  }
}
