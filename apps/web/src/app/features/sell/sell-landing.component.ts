import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Meta, Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LanguageService } from '@behbehani-cpo/shared-i18n';
import type { PublicCatalogBrand } from '@behbehani-cpo/shared-types';
import { PublicCatalogService } from '../../data/public-catalog.service';

interface StepCopy {
  i: number;
  iconPath: string;
}

const CONCIERGE_STEPS: ReadonlyArray<StepCopy> = [
  { i: 1, iconPath: 'M4 7h3l2-3h6l2 3h3v12H4zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z' },
  { i: 2, iconPath: 'M12 2v3M12 19v3M5 12H2M22 12h-3M19 5l-2 2M7 17l-2 2M19 19l-2-2M7 7 5 5M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z' },
  { i: 3, iconPath: 'M5 13l4 4L19 7' },
];
const SELF_STEPS: ReadonlyArray<StepCopy> = [
  { i: 1, iconPath: 'M4 6h16M4 12h16M4 18h10' },
  { i: 2, iconPath: 'M6 4h12a2 2 0 0 1 2 2v14l-4-3-4 3-4-3-4 3V6a2 2 0 0 1 2-2Z' },
  { i: 3, iconPath: 'M3 12h14M11 6l6 6-6 6' },
];

interface CompareRow {
  feature: string;
  concierge: true | false | string;
  self: true | false | string;
}

interface Review {
  name: string;
  type: 'seller' | 'buyer';
  quote: string;
  date: string;
  initial: string;
}

@Component({
  selector: 'app-sell-landing',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule, RouterLink],
  template: `
    <!-- ─── HERO ─────────────────────────────────────────────────────── -->
    <section class="relative overflow-hidden bg-gradient-to-br from-brand-900 via-brand-700 to-brand-600 text-white">
      <div class="absolute inset-0 opacity-30" aria-hidden="true">
        <div class="absolute -top-32 -end-32 h-96 w-96 rounded-full bg-brand-400 blur-3xl"></div>
        <div class="absolute -bottom-32 -start-32 h-96 w-96 rounded-full bg-brand-800 blur-3xl"></div>
      </div>
      <div class="container-page section relative grid items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <div class="inline-flex items-center gap-2 rounded-pill bg-white/15 px-3 py-1 text-[12px] font-semibold text-white backdrop-blur">
            <span class="inline-flex -space-x-1">
              <span class="inline-grid h-5 w-5 place-items-center rounded-full bg-brand-500 text-[10px] font-bold text-white ring-2 ring-brand-700">F</span>
              <span class="inline-grid h-5 w-5 place-items-center rounded-full bg-brand-700 text-[10px] font-bold text-white ring-2 ring-brand-700">A</span>
              <span class="inline-grid h-5 w-5 place-items-center rounded-full bg-brand-400 text-[10px] font-bold text-white ring-2 ring-brand-700">M</span>
              <span class="inline-grid h-5 w-5 place-items-center rounded-full bg-brand-600 text-[10px] font-bold text-white ring-2 ring-brand-700">S</span>
            </span>
            {{ 'sell.trustPill' | translate }}
          </div>
          <h1 class="mt-5 font-display text-[clamp(34px,5vw,56px)] font-bold leading-[1.05] tracking-[-0.03em] text-white">
            {{ 'sell.hero.titleA' | translate }}
            <span class="block text-brand-200">{{ 'sell.hero.titleAccent' | translate }}</span>
          </h1>
          <p class="mt-4 max-w-[560px] text-[15px] font-normal leading-relaxed text-white sm:text-[17px]">
            {{ 'sell.hero.sub' | translate }}
          </p>
          <div class="mt-7 flex flex-wrap gap-3">
            <a
              [routerLink]="['/', currentLocale(), 'sell', 'details']"
              class="inline-flex items-center gap-2 rounded-pill bg-white px-5 py-3 text-sm font-semibold text-brand-700 shadow-brand-lg transition-transform hover:-translate-y-0.5 hover:bg-surface-soft active:translate-y-0 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand-700"
            >
              {{ 'sell.hero.startSelling' | translate }}
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true">
                <path [attr.d]="arrowPath()" />
              </svg>
            </a>
            <a
              href="#how"
              class="inline-flex items-center gap-2 rounded-pill border border-white/30 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/20"
            >
              {{ 'sell.hero.howItWorks' | translate }}
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </a>
          </div>
          <ul class="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-[13px] font-normal text-white">
            @for (stat of heroStats; track stat) {
              <li class="inline-flex items-center gap-1.5">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true">
                  <path d="M5 13l4 4L19 7" />
                </svg>
                {{ stat | translate }}
              </li>
            }
          </ul>
        </div>
        <div class="relative hidden lg:block">
          <div class="absolute -start-10 -top-4 z-10 flex w-56 items-center gap-3 rounded-2xl border border-white/10 bg-white/95 p-4 text-ink shadow-brand-lg">
            <span class="inline-grid h-10 w-10 place-items-center rounded-full bg-brand-700 text-white">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7H14.5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </span>
            <div>
              <div class="text-[11px] font-medium text-muted">Average sale price</div>
              <div class="text-sm font-bold text-ink">12% higher</div>
            </div>
          </div>
          <div class="rounded-3xl border border-white/15 bg-white/5 p-6 backdrop-blur-sm">
            <img
              src="https://images.unsplash.com/photo-1542362567-b07e54358753?w=1100&q=80"
              alt=""
              class="aspect-[4/3] w-full rounded-2xl object-cover"
              loading="eager"
            />
            <div class="mt-3 inline-flex items-center gap-2 rounded-pill bg-emerald-500 px-3 py-1 text-[12px] font-semibold text-white">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" aria-hidden="true"><path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
              Sold in 4 days
            </div>
          </div>
          <div class="absolute -end-6 bottom-4 z-10 flex w-48 items-center gap-3 rounded-2xl border border-white/10 bg-white/95 p-4 text-ink shadow-brand-lg">
            <span class="inline-grid h-10 w-10 place-items-center rounded-full bg-brand-700 text-white">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M12 .587l3.668 7.431L24 9.748l-6 5.847 1.415 8.254L12 19.897l-7.415 3.953L6 15.595 0 9.748l8.332-1.73z"/></svg>
            </span>
            <div>
              <div class="text-[11px] font-medium text-muted">Customer rating</div>
              <div class="text-sm font-bold text-ink">4.9 / 5.0</div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ─── BRANDS QUICK-START ──────────────────────────────────────── -->
    <section class="container-page section">
      <header class="mb-7 max-w-2xl">
        <div class="section-eyebrow">{{ 'sell.brands.title' | translate }}</div>
        <h2 class="mt-2 font-display text-[clamp(24px,3vw,32px)] font-bold tracking-[-0.025em] text-ink">
          {{ 'sell.brands.title' | translate }}
        </h2>
        <p class="mt-2 text-[14px] text-muted">{{ 'sell.brands.sub' | translate }}</p>
      </header>
      <div class="grid grid-cols-3 gap-2.5 sm:grid-cols-4 sm:gap-3 lg:grid-cols-8">
        @if (popularBrands().length === 0) {
          @for (i of skeletonSlots; track i) {
            <div class="h-20 rounded-2xl bg-surface-soft animate-pulse" aria-hidden="true"></div>
          }
        } @else {
          @for (b of popularBrands(); track b.id) {
            <a
              [routerLink]="['/', currentLocale(), 'sell', 'details']"
              [queryParams]="{ brand: b.slug }"
              class="group flex flex-col items-center gap-2 rounded-2xl border border-line bg-white p-3 transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-brand active:translate-y-0"
            >
              <span
                class="mb-1 inline-grid h-14 w-14 place-items-center overflow-hidden rounded-full border border-line-2 bg-surface-soft p-2.5 text-brand-700 transition-transform group-hover:scale-105 group-hover:border-brand-700 group-hover:bg-white"
                aria-hidden="true"
              >
                @if (b.logoUrl) {
                  <img [src]="b.logoUrl" alt="" loading="lazy" class="h-8 w-8 object-contain" />
                } @else {
                  <img [src]="fallbackLogo(b.slug)" alt="" loading="lazy" class="h-8 w-8 object-contain" />
                }
              </span>
              <span class="text-[12px] font-medium text-ink-2">{{ currentLocale() === 'ar' ? b.nameAr : b.nameEn }}</span>
            </a>
          }
        }
        <a
          [routerLink]="['/', currentLocale(), 'sell', 'details']"
          class="group flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-brand-300 bg-brand-50/40 p-3 text-brand-700 transition-all hover:-translate-y-0.5 hover:bg-brand-50 active:translate-y-0"
        >
          <span class="inline-grid h-12 w-12 place-items-center rounded-xl bg-white">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
          </span>
          <span class="text-[12px] font-semibold">{{ 'sell.brands.other' | translate }}</span>
        </a>
      </div>
      <div class="mt-7 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-5">
        <a
          [routerLink]="['/', currentLocale(), 'sell', 'details']"
          class="inline-flex items-center gap-2 rounded-pill bg-brand-700 px-6 py-3 text-sm font-semibold text-white shadow-brand-lg transition-transform hover:-translate-y-0.5 hover:bg-brand-800 active:translate-y-0 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
        >
          {{ 'sell.brands.startSelling' | translate }}
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true">
            <path [attr.d]="arrowPath()" />
          </svg>
        </a>
        <span class="inline-flex items-center gap-2 rounded-pill border border-line bg-surface-soft px-4 py-2 text-[13px] font-medium text-ink-2">
          <span aria-hidden="true">🚗</span>
          {{ 'sell.brands.dealerBundles' | translate }}
        </span>
      </div>
    </section>

    <!-- ─── HOW IT WORKS (toggle) ───────────────────────────────────── -->
    <section id="how" class="bg-surface-soft">
      <div class="container-page section">
        <header class="mb-7 max-w-2xl">
          <div class="section-eyebrow">{{ 'sell.how.eyebrow' | translate }}</div>
          <h2 class="mt-2 font-display text-[clamp(24px,3vw,32px)] font-bold tracking-[-0.025em] text-ink">
            {{ 'sell.how.title' | translate }}
          </h2>
          <p class="mt-2 text-[14px] text-muted">{{ 'sell.how.sub' | translate }}</p>
        </header>
        <div class="mb-6 inline-flex rounded-pill border border-line bg-white p-1 shadow-brand-sm">
          <button
            type="button"
            (click)="mode.set('concierge')"
            class="inline-flex items-center gap-2 rounded-pill px-4 py-2 text-[13px] font-semibold transition-colors"
            [class.bg-brand-700]="mode() === 'concierge'"
            [class.text-white]="mode() === 'concierge'"
            [class.text-ink-3]="mode() !== 'concierge'"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5l-8-3Z"/></svg>
            {{ 'sell.how.conciergeTab' | translate }}
            <span class="rounded-pill bg-white/20 px-1.5 py-0.5 text-[10px] font-bold uppercase">{{ 'sell.how.recommended' | translate }}</span>
          </button>
          <button
            type="button"
            (click)="mode.set('self')"
            class="inline-flex items-center gap-2 rounded-pill px-4 py-2 text-[13px] font-semibold transition-colors"
            [class.bg-brand-700]="mode() === 'self'"
            [class.text-white]="mode() === 'self'"
            [class.text-ink-3]="mode() !== 'self'"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>
            {{ 'sell.how.selfTab' | translate }}
          </button>
        </div>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
          @for (step of currentSteps(); track step.i; let i = $index) {
            <article class="relative rounded-2xl border border-line bg-white p-5">
              <div class="mb-3 inline-grid h-8 w-8 place-items-center rounded-full bg-brand-700 text-sm font-bold text-white">{{ step.i }}</div>
              <div class="mb-3 inline-grid h-12 w-12 place-items-center rounded-xl bg-brand-50 text-brand-700">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path [attr.d]="step.iconPath" />
                </svg>
              </div>
              <h3 class="text-[16px] font-bold tracking-tight text-ink">
                {{ 'sell.how.' + mode() + '.step' + step.i + 'Title' | translate }}
              </h3>
              <p class="mt-1.5 text-[13px] leading-relaxed text-muted">
                {{ 'sell.how.' + mode() + '.step' + step.i + 'Sub' | translate }}
              </p>
            </article>
          }
        </div>
      </div>
    </section>

    <!-- ─── COMPARE TABLE ───────────────────────────────────────────── -->
    <section class="container-page section">
      <header class="mb-7 max-w-2xl">
        <div class="section-eyebrow">{{ 'sell.compare.eyebrow' | translate }}</div>
        <h2 class="mt-2 font-display text-[clamp(24px,3vw,32px)] font-bold tracking-[-0.025em] text-ink">
          {{ 'sell.compare.title' | translate }}
        </h2>
        <p class="mt-2 text-[14px] text-muted">{{ 'sell.compare.sub' | translate }}</p>
      </header>
      <div class="overflow-hidden rounded-2xl border border-line bg-white">
        <div class="grid grid-cols-[1.6fr_1fr_1fr] gap-px bg-line">
          <div class="bg-surface-soft px-4 py-3 text-[12px] font-semibold uppercase tracking-wide text-muted sm:px-6 sm:py-4">
            {{ 'sell.compare.features' | translate }}
          </div>
          <div class="bg-brand-50 px-4 py-3 sm:px-6 sm:py-4">
            <div class="inline-flex items-center gap-2 rounded-pill bg-brand-700 px-2.5 py-1 text-[11px] font-semibold text-white">
              <svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor" aria-hidden="true"><path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5l-8-3Z"/></svg>
              {{ 'sell.compare.concierge' | translate }}
            </div>
            <div class="mt-1 text-[11px] font-medium text-brand-700">{{ 'sell.compare.popular' | translate }}</div>
          </div>
          <div class="bg-surface-soft px-4 py-3 sm:px-6 sm:py-4">
            <div class="inline-flex items-center gap-2 rounded-pill border border-line bg-white px-2.5 py-1 text-[11px] font-semibold text-ink-3">
              <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>
              {{ 'sell.compare.self' | translate }}
            </div>
          </div>
          @for (row of compareRows; track row.feature) {
            <div class="bg-white px-4 py-3 text-[13px] text-ink-2 sm:px-6 sm:py-4">{{ 'sell.compare.rows.' + row.feature | translate }}</div>
            <div class="bg-white px-4 py-3 text-[13px] sm:px-6 sm:py-4">
              @if (row.concierge === true) {
                <span class="inline-grid h-5 w-5 place-items-center rounded-full bg-brand-700 text-white"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true"><path d="M5 13l4 4L19 7"/></svg></span>
              } @else if (row.concierge === false) {
                <span class="inline-grid h-5 w-5 place-items-center rounded-full bg-line text-slate-500"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M6 6l12 12M6 18L18 6"/></svg></span>
              } @else {
                <span class="text-ink-2">{{ 'sell.compare.rows.' + row.concierge | translate }}</span>
              }
            </div>
            <div class="bg-white px-4 py-3 text-[13px] sm:px-6 sm:py-4">
              @if (row.self === true) {
                <span class="inline-grid h-5 w-5 place-items-center rounded-full bg-brand-700 text-white"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true"><path d="M5 13l4 4L19 7"/></svg></span>
              } @else if (row.self === false) {
                <span class="inline-grid h-5 w-5 place-items-center rounded-full bg-line text-slate-500"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M6 6l12 12M6 18L18 6"/></svg></span>
              } @else {
                <span class="text-ink-2">{{ 'sell.compare.rows.' + row.self | translate }}</span>
              }
            </div>
          }
          <div class="bg-white px-4 py-4 sm:px-6"></div>
          <div class="bg-white px-4 py-4 sm:px-6">
            <a
              [routerLink]="['/', currentLocale(), 'sell', 'details']"
              class="inline-flex w-full items-center justify-center gap-2 rounded-pill bg-brand-700 px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-brand-800"
            >
              {{ 'sell.compare.chooseConcierge' | translate }}
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path [attr.d]="arrowPath()" /></svg>
            </a>
          </div>
          <div class="bg-white px-4 py-4 sm:px-6">
            <a
              [routerLink]="['/', currentLocale(), 'sell', 'self-service']"
              class="inline-flex w-full items-center justify-center gap-2 rounded-pill border border-line bg-white px-4 py-2.5 text-[13px] font-semibold text-ink-2 transition-colors hover:bg-surface-soft"
            >
              {{ 'sell.compare.chooseSelf' | translate }}
            </a>
          </div>
        </div>
      </div>
    </section>

    <!-- ─── CTA BANNER ─────────────────────────────────────────────── -->
    <section class="bg-gradient-to-br from-brand-900 via-brand-800 to-brand-600 text-white">
      <div class="container-page section text-center">
        <span class="inline-flex items-center gap-2 rounded-pill border border-white/30 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white backdrop-blur">
          {{ 'sell.ctaBanner.badge' | translate }}
        </span>
        <h2 class="mx-auto mt-4 max-w-2xl font-display text-[clamp(24px,3.2vw,36px)] font-bold leading-[1.15] tracking-[-0.025em] text-white">
          {{ 'sell.ctaBanner.title' | translate }}
        </h2>
        <p class="mx-auto mt-3 max-w-xl text-[14px] leading-relaxed text-white/80 sm:text-[15px]">
          {{ 'sell.ctaBanner.sub' | translate }}
        </p>
        <a
          [routerLink]="['/', currentLocale(), 'sell', 'details']"
          class="mt-6 inline-flex items-center gap-2 rounded-pill bg-white px-6 py-3 text-sm font-semibold text-brand-700 shadow-brand-lg transition-transform hover:-translate-y-0.5 hover:bg-surface-soft active:translate-y-0 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand-700"
        >
          {{ 'sell.ctaBanner.cta' | translate }}
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true">
            <path [attr.d]="arrowPath()" />
          </svg>
        </a>
      </div>
    </section>

    <!-- ─── REVIEWS ────────────────────────────────────────────────── -->
    <section class="container-page section">
      <header class="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div class="max-w-2xl">
          <div class="section-eyebrow">{{ 'sell.reviews.eyebrow' | translate }}</div>
          <h2 class="mt-2 font-display text-[clamp(24px,3vw,32px)] font-bold tracking-[-0.025em] text-ink">
            {{ 'sell.reviews.title' | translate }}
          </h2>
        </div>
        <div class="inline-flex items-center gap-2 rounded-pill border border-line bg-surface-soft px-4 py-2 text-[13px] font-medium text-ink-2">
          <span class="inline-flex" aria-hidden="true">
            @for (s of [1, 2, 3, 4, 5]; track s) {
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" class="text-brand-600">
                <path d="M12 .587l3.668 7.431L24 9.748l-6 5.847 1.415 8.254L12 19.897l-7.415 3.953L6 15.595 0 9.748l8.332-1.73z" />
              </svg>
            }
          </span>
          {{ 'sell.reviews.summary' | translate }}
        </div>
      </header>
      <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
        @for (r of reviews(); track r.name) {
          <article class="flex flex-col gap-3 rounded-2xl border border-line bg-white p-5 shadow-brand-sm">
            <div class="inline-flex" aria-hidden="true">
              @for (s of [1, 2, 3, 4, 5]; track s) {
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" class="text-brand-600">
                  <path d="M12 .587l3.668 7.431L24 9.748l-6 5.847 1.415 8.254L12 19.897l-7.415 3.953L6 15.595 0 9.748l8.332-1.73z" />
                </svg>
              }
            </div>
            <span
              class="inline-flex w-fit items-center rounded-pill px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide"
              [class.bg-brand-50]="r.type === 'seller'"
              [class.text-brand-700]="r.type === 'seller'"
              [class.bg-surface-soft]="r.type === 'buyer'"
              [class.text-ink-3]="r.type === 'buyer'"
            >
              {{ (r.type === 'seller' ? 'sell.reviews.seller' : 'sell.reviews.buyer') | translate }}
            </span>
            <p class="text-[14px] leading-relaxed text-ink-2">&ldquo;{{ r.quote }}&rdquo;</p>
            <footer class="mt-auto flex items-center gap-3 pt-2">
              <span class="inline-grid h-9 w-9 place-items-center rounded-full bg-brand-700 text-[13px] font-bold text-white">{{ r.initial }}</span>
              <div class="flex flex-col">
                <strong class="text-[13px] font-semibold text-ink">{{ r.name }}</strong>
                <span class="text-[12px] text-muted">{{ r.date }}</span>
              </div>
            </footer>
          </article>
        }
      </div>
    </section>

    <!-- ─── FAQ ──────────────────────────────────────────────────────── -->
    <section class="bg-surface-soft">
      <div class="container-page section">
        <header class="mb-7 max-w-2xl">
          <div class="section-eyebrow">{{ 'sell.faq.eyebrow' | translate }}</div>
          <h2 class="mt-2 font-display text-[clamp(24px,3vw,32px)] font-bold tracking-[-0.025em] text-ink">
            {{ 'sell.faq.title' | translate }}
          </h2>
          <p class="mt-2 text-[14px] text-muted">{{ 'sell.faq.sub' | translate }}</p>
        </header>
        <div class="flex flex-col gap-2.5">
          @for (n of [1, 2, 3, 4, 5, 6]; track n) {
            <details class="group rounded-xl border border-line bg-white px-4 open:shadow-brand-sm sm:px-5">
              <summary class="flex cursor-pointer list-none items-center justify-between gap-3 py-4 text-[14px] font-semibold text-ink">
                {{ 'sell.faq.q' + n | translate }}
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" class="text-brand-700 transition-transform group-open:rotate-90" aria-hidden="true"><path [attr.d]="arrowPath()" /></svg>
              </summary>
              <p class="pb-4 text-[13px] leading-relaxed text-muted">{{ 'sell.faq.a' + n | translate }}</p>
            </details>
          }
        </div>
      </div>
    </section>

    <!-- ─── HELP CARD ────────────────────────────────────────────────── -->
    <section class="container-page section">
      <div class="overflow-hidden rounded-3xl border border-line bg-gradient-to-br from-white to-surface-soft p-6 sm:p-10">
        <div class="grid items-center gap-8 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <div class="text-4xl">👋</div>
            <div class="section-eyebrow mt-2">{{ 'sell.help.eyebrow' | translate }}</div>
            <h2 class="mt-2 font-display text-[clamp(22px,2.6vw,28px)] font-bold leading-tight tracking-[-0.025em] text-ink">
              {{ 'sell.help.title' | translate }}
            </h2>
            <p class="mt-2 text-[14px] text-muted">{{ 'sell.help.sub' | translate }}</p>
          </div>
          <div class="grid gap-3">
            <a href="https://wa.me/96522282282" target="_blank" rel="noopener" class="flex items-center gap-4 rounded-xl border border-line bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-brand active:translate-y-0">
              <span class="inline-grid h-10 w-10 place-items-center rounded-full bg-emerald-50 text-emerald-600"><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M20.52 3.48A11.86 11.86 0 0 0 12.06 0C5.5 0 .14 5.36.14 11.92c0 2.1.55 4.15 1.59 5.95L0 24l6.27-1.65a11.93 11.93 0 0 0 5.79 1.48h.01c6.55 0 11.92-5.36 11.92-11.92 0-3.18-1.24-6.18-3.47-8.43Z"/></svg></span>
              <div class="flex-1"><div class="text-[14px] font-bold text-ink">{{ 'sell.help.whatsapp' | translate }}</div><div class="text-[12px] text-muted">{{ 'sell.help.whatsappSub' | translate }}</div></div>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" class="text-muted-2" aria-hidden="true"><path [attr.d]="arrowPath()" /></svg>
            </a>
            <a href="tel:+96522282282" class="flex items-center gap-4 rounded-xl border border-line bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-brand active:translate-y-0">
              <span class="inline-grid h-10 w-10 place-items-center rounded-full bg-brand-50 text-brand-700"><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M20 15.5c-1.25 0-2.45-.2-3.57-.57a1 1 0 0 0-1.02.24l-2.2 2.2a15.07 15.07 0 0 1-6.59-6.59l2.2-2.2a1 1 0 0 0 .25-1.02C8.7 6.45 8.5 5.25 8.5 4a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1c0 9.39 7.61 17 17 17a1 1 0 0 0 1-1v-3.5a1 1 0 0 0-1-1Z"/></svg></span>
              <div class="flex-1"><div class="text-[14px] font-bold text-ink">+965 22 282 282</div><div class="text-[12px] text-muted">{{ 'sell.help.phoneSub' | translate }}</div></div>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" class="text-muted-2" aria-hidden="true"><path [attr.d]="arrowPath()" /></svg>
            </a>
            <a href="mailto:sell@behbehanimotors.com" class="flex items-center gap-4 rounded-xl border border-line bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-brand active:translate-y-0">
              <span class="inline-grid h-10 w-10 place-items-center rounded-full bg-surface-cool text-ink-3"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 7h18v12H3zM3 7l9 7 9-7"/></svg></span>
              <div class="flex-1"><div class="text-[14px] font-bold text-ink">{{ 'sell.help.email' | translate }}</div><div class="text-[12px] text-muted">sell&#64;behbehanimotors.com</div></div>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" class="text-muted-2" aria-hidden="true"><path [attr.d]="arrowPath()" /></svg>
            </a>
          </div>
        </div>
      </div>
    </section>
  `,
})
export class SellLandingComponent implements OnInit {
  private readonly language = inject(LanguageService);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly translate = inject(TranslateService);

  readonly currentLocale = computed(() => this.language.current());
  readonly arrowPath = computed(() => (this.currentLocale() === 'ar' ? 'M14 6l-6 6 6 6' : 'M10 6l6 6-6 6'));

  readonly mode = signal<'concierge' | 'self'>('concierge');
  readonly currentSteps = computed(() => (this.mode() === 'concierge' ? CONCIERGE_STEPS : SELF_STEPS));

  private readonly catalog = inject(PublicCatalogService);
  private readonly allBrands = toSignal(this.catalog.brands$(), {
    initialValue: [] as ReadonlyArray<PublicCatalogBrand>,
  });
  readonly popularBrands = computed<ReadonlyArray<PublicCatalogBrand>>(() => this.allBrands().slice(0, 7));
  readonly skeletonSlots: ReadonlyArray<number> = [0, 1, 2, 3, 4, 5, 6, 7];

  /** Google Favicon CDN fallback when API has no `logoUrl`. */
  fallbackLogo(slug: string): string {
    return `https://www.google.com/s2/favicons?domain=${slug}.com&sz=128`;
  }

  readonly heroStats = ['sell.hero.stat1', 'sell.hero.stat2', 'sell.hero.stat3'];

  readonly reviews = signal<ReadonlyArray<Review>>([
    {
      name: 'Ahmad K.',
      type: 'seller',
      quote: 'Inspection at my driveway, fair offer the next morning, paid same day. Could not have been smoother.',
      date: '12 May 2026',
      initial: 'A',
    },
    {
      name: 'Fatima A.',
      type: 'buyer',
      quote: 'The car matched the inspection report exactly. Zero surprises, zero pressure — the way buying a used car should be.',
      date: '5 May 2026',
      initial: 'F',
    },
    {
      name: 'Yousef M.',
      type: 'seller',
      quote: 'Listed in the morning, sold by the weekend. The concierge team handled the MOI transfer for me.',
      date: '28 Apr 2026',
      initial: 'Y',
    },
  ]);

  readonly compareRows: ReadonlyArray<CompareRow> = [
    { feature: 'inspection', concierge: true, self: false },
    { feature: 'photography', concierge: true, self: false },
    { feature: 'cashOffer', concierge: true, self: false },
    { feature: 'validity', concierge: 'validityC', self: 'validityS' },
    { feature: 'calls', concierge: 'callsC', self: 'callsS' },
    { feature: 'payment', concierge: 'paymentC', self: 'paymentS' },
    { feature: 'fee', concierge: 'feeC', self: 'feeS' },
    { feature: 'marketing', concierge: true, self: false },
  ];

  ngOnInit(): void {
    const set = () => {
      const t = this.translate.instant('sell.metaTitle');
      const d = this.translate.instant('sell.metaDescription');
      this.title.setTitle(t);
      this.meta.updateTag({ name: 'description', content: d });
      this.meta.updateTag({ property: 'og:title', content: t });
      this.meta.updateTag({ property: 'og:description', content: d });
    };
    set();
    this.translate.onLangChange.subscribe(set);
  }
}
