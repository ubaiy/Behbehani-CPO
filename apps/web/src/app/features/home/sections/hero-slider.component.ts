import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  HostListener,
  OnInit,
  PLATFORM_ID,
  computed,
  inject,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';
import { LanguageService } from '@behbehani-cpo/shared-i18n';

interface SlideKey {
  id: 'buy' | 'inspect' | 'finance';
  /** Where the primary CTA should send the user. */
  primaryRoute: ReadonlyArray<string>;
  /** Where the secondary CTA should send the user. */
  secondaryRoute: ReadonlyArray<string>;
}

/* Per-slide CTA routes. Built as path segments (locale prefix prepended by the
   component at click time) so we never have to string-concat URLs. The "finance"
   slide currently routes to /browse because there's no /finance landing yet. */
const SLIDES: ReadonlyArray<SlideKey> = [
  { id: 'buy', primaryRoute: ['browse'], secondaryRoute: ['sell'] },
  { id: 'inspect', primaryRoute: ['browse'], secondaryRoute: [] },
  { id: 'finance', primaryRoute: ['browse'], secondaryRoute: ['browse'] },
];

const AUTO_ADVANCE_MS = 6000;

@Component({
  selector: 'app-hero-slider',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule],
  template: `
    <section
      class="relative overflow-hidden bg-[radial-gradient(ellipse_at_top,theme(colors.brand.50)_0%,#fff_60%)] py-14 sm:py-16 lg:pt-[72px] lg:pb-20"
      (mouseenter)="paused.set(true)"
      (mouseleave)="paused.set(false)"
      (focusin)="paused.set(true)"
      (focusout)="paused.set(false)"
      (touchstart)="onTouchStart($event)"
      (touchmove)="onTouchMove($event)"
      (touchend)="onTouchEnd()"
      tabindex="0"
      aria-roledescription="carousel"
      [attr.aria-label]="'home.hero.label' | translate"
    >
      <!-- Subtle radial overlay layered on top of the base background so the
           hero reads as more than just one flat gradient — the bg-grid uses a
           tiny SVG checker baked in as a data: URL, brand-blue 04-opacity. -->
      <div class="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          class="absolute inset-0 opacity-[0.35]"
          style="background-image: radial-gradient(circle at 20% 20%, rgba(30,58,138,0.10), transparent 45%), radial-gradient(circle at 80% 30%, rgba(30,58,138,0.08), transparent 50%);"
        ></div>
        <div
          class="absolute inset-0 opacity-[0.04]"
          style="background-image: url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2228%22 height=%2228%22 viewBox=%220 0 28 28%22><path d=%22M0 0h28v28H0z%22 fill=%22none%22/><path d=%22M0 14h28M14 0v28%22 stroke=%22%231E3A8A%22 stroke-width=%220.7%22/></svg>'); background-size: 28px 28px;"
        ></div>
        <div class="absolute -left-20 -top-20 h-[360px] w-[360px] rounded-full bg-brand-400/55 blur-[40px]"></div>
        <div class="absolute -right-24 top-32 h-[420px] w-[420px] rounded-full bg-brand-100/90 blur-[40px]"></div>
        <div class="absolute -bottom-32 left-1/3 h-[480px] w-[480px] rounded-full bg-brand-50 blur-[40px]"></div>
        <span class="absolute left-[8%] top-20 h-3.5 w-3.5 rounded-full bg-brand-700/70" aria-hidden="true"></span>
        <span class="absolute right-[10%] top-48 h-2 w-2 rounded-full bg-brand-500" aria-hidden="true"></span>
        <span class="absolute bottom-44 left-[12%] h-2.5 w-2.5 rounded-full bg-brand-400/80" aria-hidden="true"></span>
      </div>

      <div class="container-page relative z-10">
        <div class="mx-auto max-w-[760px] text-center">
          <div
            class="mb-6 inline-flex items-center gap-2 rounded-pill border border-line bg-white px-3 py-1.5 text-[12px] font-medium text-ink-2 shadow-brand-sm sm:mb-7 sm:px-4 sm:py-2 sm:text-[13px]"
          >
            <span class="h-1.5 w-1.5 rounded-full bg-brand-700" aria-hidden="true"></span>
            <span>{{ slideKey('eyebrow') | translate }}</span>
          </div>

          <h1 class="font-display text-[clamp(32px,7vw,68px)] font-bold leading-[1.08] tracking-[-0.03em] text-ink sm:leading-[1.05] sm:tracking-[-0.035em]">
            {{ slideKey('titleA') | translate }}<br />
            <em class="not-italic text-brand-700">{{ slideKey('titleB') | translate }}</em>
          </h1>

          <p class="mx-auto mt-5 max-w-[580px] text-[15px] leading-relaxed text-muted sm:mt-6 sm:text-[clamp(15px,1.4vw,18px)]">
            {{ slideKey('sub') | translate }}
          </p>

          <div class="mt-7 flex w-full flex-col justify-center gap-2.5 sm:mt-9 sm:w-auto sm:flex-row sm:flex-wrap sm:gap-3">
            <button
              type="button"
              class="inline-flex items-center justify-center gap-3 rounded-pill bg-brand-700 px-6 py-3.5 text-[15px] font-semibold text-white shadow-brand-sm transition-all hover:-translate-y-px hover:bg-brand-600 hover:shadow-brand-blue active:scale-[0.98]"
              (click)="onPrimary()"
            >
              <span>{{ slideKey('ctaPrimary') | translate }}</span>
              <span class="inline-grid h-6 w-6 place-items-center rounded-full bg-white/20" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4">
                  <path [attr.d]="dirArrow()" />
                </svg>
              </span>
            </button>
            <button
              type="button"
              class="inline-flex items-center justify-center gap-2 rounded-pill border border-line bg-white px-6 py-3.5 text-[15px] font-semibold text-ink transition-all hover:border-brand-700 hover:text-brand-700 active:scale-[0.98]"
              (click)="onSecondary()"
            >
              {{ slideKey('ctaSecondary') | translate }}
            </button>
          </div>
        </div>

        <div class="mx-auto mt-12 flex max-w-[420px] items-center justify-center gap-3">
          <button
            type="button"
            class="inline-grid h-10 w-10 place-items-center rounded-full border border-line bg-white text-ink hover:border-brand-700 hover:text-brand-700"
            (click)="prev()"
            [attr.aria-label]="'home.hero.previousSlide' | translate"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true">
              <path [attr.d]="dirArrowPrev()" />
            </svg>
          </button>
          <div class="flex items-center gap-2" role="tablist">
            @for (s of slides; track s.id; let i = $index) {
              <button
                type="button"
                role="tab"
                [attr.aria-selected]="i === index()"
                [attr.aria-label]="('home.hero.goToSlide' | translate) + ' ' + (i + 1)"
                (click)="goTo(i)"
                class="h-1 rounded-full transition-all"
                [class.w-11]="i === index()"
                [class.bg-brand-700]="i === index()"
                [class.w-6]="i !== index()"
                [class.bg-line-2]="i !== index()"
              ></button>
            }
          </div>
          <button
            type="button"
            class="inline-grid h-10 w-10 place-items-center rounded-full border border-line bg-white text-ink hover:border-brand-700 hover:text-brand-700"
            (click)="next()"
            [attr.aria-label]="'home.hero.nextSlide' | translate"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true">
              <path [attr.d]="dirArrow()" />
            </svg>
          </button>
        </div>

        <!-- Trust chips upgrade: bigger cards with icon + title + sub-label,
             arranged as flex-wrap so 3-in-a-row on desktop but stack on mobile. -->
        <div class="mt-8 flex flex-wrap items-stretch justify-center gap-3 sm:gap-4">
          <div class="flex items-center gap-3 rounded-xl border border-line bg-white px-4 py-3 shadow-brand-sm">
            <span class="inline-grid h-9 w-9 flex-shrink-0 place-items-center rounded-full bg-brand-50 text-brand-700" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2">
                <path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5l-8-3Z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            </span>
            <div class="text-start">
              <div class="text-[13px] font-bold leading-tight text-ink">{{ 'home.hero.trustInspectionTitle' | translate }}</div>
              <div class="text-[11px] leading-snug text-muted">{{ 'home.hero.trustInspectionSub' | translate }}</div>
            </div>
          </div>
          <div class="flex items-center gap-3 rounded-xl border border-line bg-white px-4 py-3 shadow-brand-sm">
            <span class="inline-grid h-9 w-9 flex-shrink-0 place-items-center rounded-full bg-brand-50 text-brand-700" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2">
                <path d="M3 7h11v8H3zM14 10h4l3 3v2h-7z" />
                <circle cx="7" cy="17" r="2" />
                <circle cx="17" cy="17" r="2" />
              </svg>
            </span>
            <div class="text-start">
              <div class="text-[13px] font-bold leading-tight text-ink">{{ 'home.hero.trustDeliveryTitle' | translate }}</div>
              <div class="text-[11px] leading-snug text-muted">{{ 'home.hero.trustDeliverySub' | translate }}</div>
            </div>
          </div>
          <div class="flex items-center gap-3 rounded-xl border border-line bg-white px-4 py-3 shadow-brand-sm">
            <span class="inline-grid h-9 w-9 flex-shrink-0 place-items-center rounded-full bg-brand-50 text-brand-700" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2">
                <path d="M9 14 5 10l4-4M5 10h9a5 5 0 0 1 5 5v3" />
              </svg>
            </span>
            <div class="text-start">
              <div class="text-[13px] font-bold leading-tight text-ink">{{ 'home.hero.trustReturnTitle' | translate }}</div>
              <div class="text-[11px] leading-snug text-muted">{{ 'home.hero.trustReturnSub' | translate }}</div>
            </div>
          </div>
        </div>

        <!-- Social-proof stat row — bolder numbers, smaller labels, brand-blue
             accent icons. Centered + wraps for mobile. -->
        <div class="mt-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-center">
          <div class="inline-flex items-center gap-2">
            <span class="inline-grid h-7 w-7 flex-shrink-0 place-items-center rounded-full bg-brand-100 text-brand-700" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4">
                <path d="m3 17 6-6 4 4 8-8" />
                <path d="M14 7h7v7" />
              </svg>
            </span>
            <span class="text-[13px] font-semibold text-ink-2">{{ 'home.hero.statCarsSold' | translate }}</span>
          </div>
          <div class="inline-flex items-center gap-2">
            <span class="inline-grid h-7 w-7 flex-shrink-0 place-items-center rounded-full bg-brand-100 text-brand-700" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4">
                <circle cx="12" cy="12" r="9" />
                <path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" />
              </svg>
            </span>
            <span class="text-[13px] font-semibold text-ink-2">{{ 'home.hero.statSatisfaction' | translate }}</span>
          </div>
          <div class="inline-flex items-center gap-2">
            <span class="inline-grid h-7 w-7 flex-shrink-0 place-items-center rounded-full bg-brand-100 text-brand-700" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4">
                <path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5l-8-3Z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            </span>
            <span class="text-[13px] font-semibold text-ink-2">{{ 'home.hero.statInspections' | translate }}</span>
          </div>
        </div>
      </div>
    </section>
  `,
})
export class HeroSliderComponent implements OnInit {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly language = inject(LanguageService);

  readonly slides = SLIDES;
  readonly index = signal(0);
  readonly paused = signal(false);
  readonly dir = signal<'ltr' | 'rtl'>('ltr');

  private touchX = 0;
  private touchActive = false;

  readonly dirArrow = computed(() => (this.dir() === 'rtl' ? 'M14 6l-6 6 6 6' : 'M10 6l6 6-6 6'));
  readonly dirArrowPrev = computed(() => (this.dir() === 'rtl' ? 'M10 6l6 6-6 6' : 'M14 6l-6 6 6 6'));

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.dir.set(document.documentElement.getAttribute('dir') === 'rtl' ? 'rtl' : 'ltr');
    interval(AUTO_ADVANCE_MS)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (!this.paused()) this.next();
      });
  }

  slideKey(part: 'eyebrow' | 'titleA' | 'titleB' | 'sub' | 'ctaPrimary' | 'ctaSecondary'): string {
    return `home.hero.slides.${this.slides[this.index()].id}.${part}`;
  }

  goTo(i: number): void {
    const n = this.slides.length;
    this.index.set(((i % n) + n) % n);
  }

  next(): void {
    this.goTo(this.index() + 1);
  }

  prev(): void {
    this.goTo(this.index() - 1);
  }

  onPrimary(): void {
    const segs = this.slides[this.index()].primaryRoute;
    void this.router.navigate(['/', this.language.current(), ...segs]);
  }

  onSecondary(): void {
    const segs = this.slides[this.index()].secondaryRoute;
    if (segs.length === 0) {
      /* Inspect slide secondary CTA is "How it works" — no dedicated page yet;
         scroll to the #how anchor on the home page instead of going nowhere. */
      if (!isPlatformBrowser(this.platformId)) return;
      const el = document.querySelector('app-how-it-works');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    void this.router.navigate(['/', this.language.current(), ...segs]);
  }

  onTouchStart(e: TouchEvent): void {
    this.touchX = e.touches[0].clientX;
    this.touchActive = true;
  }

  onTouchMove(e: TouchEvent): void {
    if (!this.touchActive) return;
    const dx = e.touches[0].clientX - this.touchX;
    if (Math.abs(dx) > 50) {
      this.touchActive = false;
      const swipingForward = this.dir() === 'rtl' ? dx > 0 : dx < 0;
      if (swipingForward) this.next();
      else this.prev();
    }
  }

  onTouchEnd(): void {
    this.touchActive = false;
  }

  @HostListener('keydown', ['$event'])
  onKey(e: KeyboardEvent): void {
    if (e.key === 'ArrowRight') {
      if (this.dir() === 'rtl') this.prev();
      else this.next();
      e.preventDefault();
    } else if (e.key === 'ArrowLeft') {
      if (this.dir() === 'rtl') this.next();
      else this.prev();
      e.preventDefault();
    }
  }
}
