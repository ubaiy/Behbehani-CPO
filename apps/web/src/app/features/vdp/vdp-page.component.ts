import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { switchMap, tap } from 'rxjs/operators';
import { of } from 'rxjs';
import { LanguageService } from '@behbehani-cpo/shared-i18n';
import { PublicCatalogService } from '../../data/public-catalog.service';
import type { ListingPublicDetail } from '../../data/public-catalog.service';
import type { FeaturedCar } from '../../data/catalog.types';
import { fmtKm, fmtKwd } from '../../data/kwd';
import { CarCardComponent } from '../home/sections/car-card.component';
import { VdpGalleryComponent } from './vdp-gallery.component';
import type { VdpGalleryPhoto } from './vdp-gallery.component';
import { VdpFinanceCalcComponent } from './vdp-finance-calc.component';
import { VdpInspectionComponent } from './vdp-inspection.component';
import { VdpPricingCardComponent } from './vdp-pricing-card.component';

/**
 * Vehicle Detail Page. Routes: `/:locale/listings/:slug`.
 *
 * Loads the listing via `PublicCatalogService.detail$()` (which caches per-
 * slug and falls back to a mock detail if the API isn't ready). Renders:
 * gallery, specs grid, features, vehicle history, inspection summary,
 * finance calculator, delivery, similar cars, sticky pricing sidebar and
 * mobile CTA bar.
 *
 * Extended detail fields from the DTO are treated as optional — the
 * template applies sensible defaults (em-dash, `—`) so the page never
 * breaks while the backend rolls out the richer payload.
 */
@Component({
  selector: 'app-vdp-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslateModule,
    RouterLink,
    CarCardComponent,
    VdpGalleryComponent,
    VdpFinanceCalcComponent,
    VdpInspectionComponent,
    VdpPricingCardComponent,
  ],
  template: `
    @if (loading()) {
      <div class="mx-auto w-full max-w-container px-4 py-10 lg:px-6">
        <div class="aspect-[16/9] animate-pulse rounded-2xl bg-surface-cool"></div>
      </div>
    } @else if (!car()) {
      <div class="mx-auto flex w-full max-w-container flex-col items-center gap-3 px-4 py-20 text-center lg:px-6">
        <h1 class="font-display text-2xl font-bold text-ink">{{ 'vdp.notFound.title' | translate }}</h1>
        <p class="max-w-sm text-sm text-muted">{{ 'vdp.notFound.sub' | translate }}</p>
        <a [routerLink]="['/', locale(), 'browse']" class="rounded-pill bg-brand-700 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-800">
          {{ 'vdp.notFound.cta' | translate }}
        </a>
      </div>
    } @else {
      <!-- ===== TOP: breadcrumb + title ===== -->
      <header class="border-b border-line bg-surface-soft">
        <div class="mx-auto w-full max-w-container px-4 py-5 lg:px-6 lg:py-6">
          <nav class="mb-3 flex items-center gap-1.5 text-[12px] font-medium text-muted-2" [attr.aria-label]="'vdp.breadcrumb' | translate">
            <a [routerLink]="['/', locale()]" class="hover:text-brand-700">{{ 'nav.home' | translate }}</a>
            <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path [attr.d]="isRtl() ? 'M14 6l-6 6 6 6' : 'M10 6l6 6-6 6'"/></svg>
            <a [routerLink]="['/', locale(), 'browse']" class="hover:text-brand-700">{{ 'nav.buy' | translate }}</a>
            <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path [attr.d]="isRtl() ? 'M14 6l-6 6 6 6' : 'M10 6l6 6-6 6'"/></svg>
            <a [routerLink]="['/', locale(), 'browse']" [queryParams]="{ brand: car()!.brand.slug }" class="hover:text-brand-700">{{ brandName() }}</a>
            <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path [attr.d]="isRtl() ? 'M14 6l-6 6 6 6' : 'M10 6l6 6-6 6'"/></svg>
            <span class="text-ink-2">{{ modelName() }}</span>
          </nav>

          <div class="flex flex-wrap items-start justify-between gap-4">
            <div class="min-w-0 flex-1">
              <div class="text-sm font-medium text-muted-2">{{ brandName() }} · {{ car()!.year }}</div>
              <h1 class="mt-1 font-display text-[clamp(24px,3vw,34px)] font-bold tracking-tight text-ink">
                {{ titleText() }}
              </h1>
              <div class="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-2">
                <span>{{ mileageLabel() }}</span>
                <span aria-hidden="true">·</span>
                <span>{{ transmissionLabel() }}</span>
                <span aria-hidden="true">·</span>
                <span>{{ fuelLabel() }}</span>
                @if (car()!.gccSpec) {
                  <span aria-hidden="true">·</span>
                  <span>{{ 'vdp.spec.gcc' | translate }}</span>
                }
              </div>
              <div class="mt-3 flex flex-wrap gap-1.5">
                @if (car()!.inspected) {
                  <span class="inline-flex items-center gap-1 rounded-pill bg-brand-700 px-2.5 py-1 text-[11px] font-semibold text-white">
                    <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5l-8-3Z"/></svg>
                    {{ 'vdp.tag.inspected' | translate }}
                  </span>
                }
                <span class="inline-flex items-center gap-1 rounded-pill bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white">
                  <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="9"/></svg>
                  {{ 'vdp.tag.warranty' | translate }}
                </span>
                <span class="inline-flex items-center gap-1 rounded-pill bg-amber-500 px-2.5 py-1 text-[11px] font-semibold text-white">
                  <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/></svg>
                  {{ 'vdp.tag.return' | translate }}
                </span>
                <span class="inline-flex items-center gap-1 rounded-pill bg-slate-600 px-2.5 py-1 text-[11px] font-semibold text-white">
                  <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M3 7h13v10H3zM16 11h4l1 2v3h-5"/><circle cx="7" cy="18" r="1.5"/><circle cx="18" cy="18" r="1.5"/></svg>
                  {{ 'vdp.tag.delivery' | translate }}
                </span>
              </div>
            </div>

            <div class="flex gap-2">
              <button type="button" class="inline-flex items-center gap-1.5 rounded-pill border border-line-2 bg-white px-3.5 py-2 text-sm font-semibold text-ink shadow-brand-sm hover:border-brand-700 hover:text-brand-700" (click)="toggleFav()" [attr.aria-pressed]="fav()">
                @if (fav()) {
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" class="text-red-600" aria-hidden="true"><path d="M12 21s-7-4.5-9.5-9C.8 8 3 4 7 4c2 0 3.5 1 5 3 1.5-2 3-3 5-3 4 0 6.2 4 4.5 8-2.5 4.5-9.5 9-9.5 9Z"/></svg>
                } @else {
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 21s-7-4.5-9.5-9C.8 8 3 4 7 4c2 0 3.5 1 5 3 1.5-2 3-3 5-3 4 0 6.2 4 4.5 8-2.5 4.5-9.5 9-9.5 9Z"/></svg>
                }
                <span>{{ (fav() ? 'vdp.actions.saved' : 'vdp.actions.save') | translate }}</span>
              </button>
              <button type="button" class="inline-flex items-center gap-1.5 rounded-pill border border-line-2 bg-white px-3.5 py-2 text-sm font-semibold text-ink shadow-brand-sm hover:border-brand-700 hover:text-brand-700" (click)="share()">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/></svg>
                <span>{{ 'vdp.actions.share' | translate }}</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <!-- ===== MAIN GRID ===== -->
      <div class="mx-auto w-full max-w-container px-4 py-6 lg:px-6 lg:py-8">
        <div class="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px] lg:gap-8">
          <main class="min-w-0 space-y-6">
            <!-- Gallery -->
            <app-vdp-gallery [photos]="galleryPhotos()" [fallbackUrl]="car()!.heroPhotoUrl" />

            <!-- Specifications -->
            <section class="rounded-2xl border border-line bg-white p-5 lg:p-6">
              <h2 class="mb-4 font-display text-xl font-bold text-ink">{{ 'vdp.specs.title' | translate }}</h2>
              <div class="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 lg:grid-cols-4">
                @for (s of specs(); track s.label) {
                  <div class="flex items-start gap-2">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" class="mt-0.5 flex-shrink-0 text-muted" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 8v5l3 2"/></svg>
                    <div class="min-w-0">
                      <div class="text-[11px] uppercase tracking-wider text-muted">{{ s.label }}</div>
                      <div class="truncate text-sm font-semibold text-ink">{{ s.value }}</div>
                    </div>
                  </div>
                }
              </div>
            </section>

            <!-- Features & equipment (static groups — DTO doesn't carry these yet) -->
            <section class="rounded-2xl border border-line bg-white p-5 lg:p-6">
              <h2 class="mb-4 font-display text-xl font-bold text-ink">{{ 'vdp.features.title' | translate }}</h2>
              <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                @for (g of featureGroups; track g.key) {
                  <div>
                    <h4 class="mb-2 text-sm font-bold text-ink">{{ ('vdp.features.groups.' + g.key) | translate }}</h4>
                    <ul class="space-y-1.5">
                      @for (item of g.items; track item) {
                        <li class="flex items-start gap-1.5 text-[13px] text-ink-2">
                          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.4" class="mt-0.5 flex-shrink-0 text-brand-700" aria-hidden="true"><path d="m5 12 5 5L20 7"/></svg>
                          <span>{{ ('vdp.features.items.' + item) | translate }}</span>
                        </li>
                      }
                    </ul>
                  </div>
                }
              </div>
            </section>

            <!-- Vehicle history -->
            <section class="rounded-2xl border border-line bg-white p-5 lg:p-6">
              <h2 class="mb-4 font-display text-xl font-bold text-ink">{{ 'vdp.history.title' | translate }}</h2>
              <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div class="flex items-start gap-3 rounded-xl bg-surface-soft p-4">
                  <div class="font-display text-2xl font-extrabold text-brand-700">{{ car()!.previousOwners ?? 1 }}</div>
                  <div>
                    <div class="text-sm font-semibold text-ink">{{ 'vdp.history.owners' | translate }}</div>
                    <div class="text-xs text-muted">{{ 'vdp.history.ownersHint' | translate }}</div>
                  </div>
                </div>
                <div class="flex items-start gap-3 rounded-xl bg-surface-soft p-4">
                  <div class="font-display text-2xl font-extrabold" [class.text-emerald-600]="!car()!.accidentHistory" [class.text-amber-600]="car()!.accidentHistory">
                    {{ car()!.accidentHistory ? '1+' : 0 }}
                  </div>
                  <div>
                    <div class="text-sm font-semibold text-ink">{{ 'vdp.history.accidents' | translate }}</div>
                    <div class="text-xs text-muted">{{ (car()!.accidentHistory ? 'vdp.history.accidentsMinor' : 'vdp.history.accidentsClean') | translate }}</div>
                  </div>
                </div>
                <div class="flex items-start gap-3 rounded-xl bg-surface-soft p-4">
                  <div class="font-display text-sm font-bold text-brand-700">
                    {{ (car()!.serviceHistory ? 'vdp.history.serviceAvailable' : 'vdp.history.serviceUnknown') | translate }}
                  </div>
                  <div>
                    <div class="text-sm font-semibold text-ink">{{ 'vdp.history.service' | translate }}</div>
                    <div class="text-xs text-muted">{{ 'vdp.history.serviceHint' | translate }}</div>
                  </div>
                </div>
                <div class="flex items-start gap-3 rounded-xl bg-surface-soft p-4">
                  <div class="text-emerald-600">
                    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m9 12 2 2 4-4"/></svg>
                  </div>
                  <div>
                    <div class="text-sm font-semibold text-ink">{{ 'vdp.history.title2' | translate }}</div>
                    <div class="text-xs text-muted">{{ 'vdp.history.titleHint' | translate }}</div>
                  </div>
                </div>
              </div>
            </section>

            <!-- Inspection (only if data present) -->
            @if (car()!.inspectionReport) {
              <app-vdp-inspection
                [overallScore]="car()!.inspectionReport!.overallScore"
                [inspectedAt]="car()!.inspectionReport!.inspectedAt"
              />
            }

            <!-- Finance calculator -->
            <app-vdp-finance-calc [priceKwd]="priceKwd()" />

            <!-- Delivery & returns -->
            <section class="rounded-2xl border border-line bg-white p-5 lg:p-6">
              <header class="mb-4 flex items-center gap-2.5">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" class="text-brand-700" aria-hidden="true"><path d="M3 7h13v10H3zM16 11h4l1 2v3h-5"/><circle cx="7" cy="18" r="1.5"/><circle cx="18" cy="18" r="1.5"/></svg>
                <h2 class="font-display text-xl font-bold text-ink">{{ 'vdp.delivery.title' | translate }}</h2>
              </header>
              <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div class="rounded-xl bg-surface-soft p-4">
                  <h4 class="text-sm font-bold text-ink">{{ 'vdp.delivery.home.title' | translate }}</h4>
                  <p class="mt-1 text-sm text-muted">{{ 'vdp.delivery.home.sub' | translate }}</p>
                </div>
                <div class="rounded-xl bg-surface-soft p-4">
                  <h4 class="text-sm font-bold text-ink">{{ 'vdp.delivery.return.title' | translate }}</h4>
                  <p class="mt-1 text-sm text-muted">{{ 'vdp.delivery.return.sub' | translate }}</p>
                </div>
                <div class="rounded-xl bg-surface-soft p-4">
                  <h4 class="text-sm font-bold text-ink">{{ 'vdp.delivery.aftercare.title' | translate }}</h4>
                  <p class="mt-1 text-sm text-muted">{{ 'vdp.delivery.aftercare.sub' | translate }}</p>
                </div>
              </div>
            </section>

            <!-- Similar cars -->
            @if (similarCars().length > 0) {
              <section>
                <div class="mb-4 flex items-end justify-between">
                  <div>
                    <div class="text-xs font-semibold uppercase tracking-wider text-brand-700">
                      {{ 'vdp.similar.eyebrow' | translate }}
                    </div>
                    <h2 class="font-display text-xl font-bold text-ink">{{ 'vdp.similar.title' | translate }}</h2>
                  </div>
                </div>
                <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  @for (c of similarCars(); track c.id) {
                    <app-car-card [car]="c" />
                  }
                </div>
              </section>
            }
          </main>

          <!-- ===== STICKY SIDEBAR (lg+) ===== -->
          <aside class="hidden lg:block">
            <app-vdp-pricing-card
              [priceLabel]="priceLabel()"
              [monthlyLabel]="monthlyLabel()"
              [brandName]="brandName()"
            />
          </aside>
        </div>
      </div>

      <!-- ===== MOBILE STICKY CTA ===== -->
      <div class="sticky bottom-0 z-30 flex items-center justify-between gap-3 border-t border-line bg-white/95 px-4 py-3 shadow-[0_-4px_12px_rgba(15,23,42,0.06)] backdrop-blur lg:hidden">
        <div class="min-w-0">
          <div class="truncate font-display text-lg font-bold text-ink">{{ priceLabel() }}</div>
          <div class="text-xs text-muted">{{ monthlyLabel() }}/{{ 'vdp.price.mo' | translate }}</div>
        </div>
        <button type="button" class="inline-flex flex-shrink-0 items-center gap-1.5 rounded-pill bg-brand-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-800">
          {{ 'vdp.cta.reserve' | translate }}
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path [attr.d]="isRtl() ? 'M14 6l-6 6 6 6' : 'M10 6l6 6-6 6'"/></svg>
        </button>
      </div>
    }
  `,
})
export class VdpPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly catalog = inject(PublicCatalogService);
  private readonly language = inject(LanguageService);
  private readonly translate = inject(TranslateService);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);

  readonly locale = computed(() => this.language.current());
  readonly isRtl = computed(() => this.locale() === 'ar');
  readonly fav = signal(false);

  /** Has the detail$ observable emitted at least once? Flipped by `tap`
      below — used so we can distinguish "still fetching" from "fetched as
      null" (the latter renders the not-found state). */
  private readonly loaded = signal(false);

  /** Slug from the URL — switchMap means the same component can re-fetch
      if the user navigates from one VDP straight to another. */
  private readonly detail$ = this.route.paramMap.pipe(
    tap(() => this.loaded.set(false)),
    switchMap((pm) => {
      const slug = pm.get('slug');
      return slug ? this.catalog.detail$(slug) : of(null);
    }),
    tap(() => this.loaded.set(true)),
  );

  readonly car = toSignal(this.detail$, { initialValue: null as ListingPublicDetail | null });
  readonly loading = computed(() => !this.loaded() && this.car() === null);

  /** Featured-car pool for similar-cars rail. */
  private readonly listResp = toSignal(
    this.catalog.list$({ pageSize: 12, sort: 'featured' }),
    { initialValue: [] as ReadonlyArray<FeaturedCar> },
  );

  readonly priceKwd = computed(() => {
    const c = this.car();
    if (!c) return 0;
    return Math.round(Number(c.priceFils) / 1000);
  });

  readonly monthlyKwd = computed(() => {
    const c = this.car();
    if (!c) return 0;
    return Math.round(Number(c.monthlyFils) / 1000);
  });

  readonly priceLabel = computed(() => fmtKwd(this.priceKwd(), this.locale()));
  readonly monthlyLabel = computed(() => fmtKwd(this.monthlyKwd(), this.locale()));
  readonly mileageLabel = computed(() => {
    const c = this.car();
    return c ? fmtKm(c.mileageKm, this.locale()) : '';
  });

  readonly brandName = computed(() => {
    const c = this.car();
    if (!c) return '';
    return this.locale() === 'ar' ? c.brand.nameAr : c.brand.nameEn;
  });

  readonly modelName = computed(() => {
    const c = this.car();
    if (!c) return '';
    return this.locale() === 'ar' ? c.model.nameAr : c.model.nameEn;
  });

  readonly titleText = computed(() => {
    const c = this.car();
    if (!c) return '';
    if (this.locale() === 'ar' && c.titleAr) return c.titleAr;
    return c.titleEn || `${c.year} ${this.brandName()} ${this.modelName()}`;
  });

  readonly transmissionLabel = computed(() => {
    const c = this.car();
    if (!c) return '';
    return this.translate.instant('vdp.transmission.' + c.transmission);
  });

  readonly fuelLabel = computed(() => {
    const c = this.car();
    if (!c) return '';
    return this.translate.instant('vdp.fuel.' + c.fuelType);
  });

  readonly galleryPhotos = computed<ReadonlyArray<VdpGalleryPhoto>>(() => {
    const c = this.car();
    if (!c) return [];
    const list = c.photos ?? [];
    if (list.length > 0) {
      return [...list]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((p) => ({ cdnUrl: p.cdnUrl, isHero: p.isHero }));
    }
    return c.heroPhotoUrl ? [{ cdnUrl: c.heroPhotoUrl, isHero: true }] : [];
  });

  readonly specs = computed<ReadonlyArray<{ label: string; value: string }>>(() => {
    const c = this.car();
    if (!c) return [];
    const t = (k: string) => this.translate.instant(k);
    const dash = '—';
    const vin = `••••••${c.id.slice(-6)}`;
    return [
      { label: t('vdp.spec.year'),        value: String(c.year) },
      { label: t('vdp.spec.mileage'),     value: fmtKm(c.mileageKm, this.locale()) },
      { label: t('vdp.spec.fuel'),        value: this.fuelLabel() },
      { label: t('vdp.spec.transmission'),value: this.transmissionLabel() },
      { label: t('vdp.spec.cylinders'),   value: c.cylinders ? String(c.cylinders) : (c.fuelType === 'electric' ? 'EV' : dash) },
      { label: t('vdp.spec.drive'),       value: c.drivetrain ? t('vdp.drivetrain.' + c.drivetrain) : dash },
      { label: t('vdp.spec.seats'),       value: c.seats ? String(c.seats) : dash },
      { label: t('vdp.spec.body'),        value: this.locale() === 'ar' ? c.bodyType.nameAr : c.bodyType.nameEn },
      { label: t('vdp.spec.exterior'),    value: c.exteriorColor || dash },
      { label: t('vdp.spec.interior'),    value: c.interiorColor || dash },
      { label: t('vdp.spec.specs'),       value: c.gccSpec ? t('vdp.spec.gcc') : dash },
      { label: t('vdp.spec.vin'),         value: vin },
    ];
  });

  readonly featureGroups: ReadonlyArray<{ key: string; items: ReadonlyArray<string> }> = [
    { key: 'safety',      items: ['airbags6', 'absEbd', 'laneKeep', 'blindSpot', 'adaptiveCruise', 'cam360'] },
    { key: 'comfort',     items: ['leather', 'heatedSeats', 'dualZoneClimate', 'sunroof', 'powerTailgate', 'keylessEntry'] },
    { key: 'technology',  items: ['display12', 'wirelessCarplay', 'androidAuto', 'boseSound', 'wirelessCharging', 'headsUp'] },
    { key: 'performance', items: ['sportMode', 'paddleShifters', 'adaptiveSusp', 'launchControl', 'brembo', 'alloy20'] },
  ];

  readonly similarCars = computed<ReadonlyArray<FeaturedCar>>(() => {
    const c = this.car();
    if (!c) return [];
    return this.listResp()
      .filter((x) => x.brand === c.brand.slug && x.id !== c.id)
      .slice(0, 3);
  });

  constructor() {
    /* SEO. */
    effect(() => {
      const c = this.car();
      if (!c) return;
      const t = this.titleText();
      this.title.setTitle(`${t} — Behbehani Motors`);
      this.meta.updateTag({
        name: 'description',
        content: this.translate.instant('vdp.metaDescription', { title: t, price: this.priceLabel() }),
      });
    });
  }

  toggleFav(): void {
    this.fav.update((v) => !v);
  }

  share(): void {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(typeof window !== 'undefined' ? window.location.href : '').catch(() => undefined);
    }
  }
}
