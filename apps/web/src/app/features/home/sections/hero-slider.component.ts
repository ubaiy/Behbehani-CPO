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
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';

interface SlideKey {
  id: 'buy' | 'inspect' | 'finance';
}

const SLIDES: ReadonlyArray<SlideKey> = [{ id: 'buy' }, { id: 'inspect' }, { id: 'finance' }];

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
      <div class="pointer-events-none absolute inset-0 overflow-hidden">
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
              class="inline-flex items-center justify-center gap-3 rounded-pill bg-brand-700 px-6 py-3.5 text-[15px] font-semibold text-white shadow-brand-sm transition-all hover:-translate-y-px hover:bg-brand-600 hover:shadow-brand-blue"
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
              class="inline-flex items-center justify-center gap-2 rounded-pill border border-line bg-white px-6 py-3.5 text-[15px] font-semibold text-ink transition-all hover:border-brand-700 hover:text-brand-700"
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

        <div class="mt-2 flex flex-wrap justify-center gap-3">
          <span class="inline-flex items-center gap-2 rounded-pill border border-line bg-white px-4 py-2 text-[13px] text-ink-2 shadow-brand-sm">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" class="text-brand-700" aria-hidden="true">
              <path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5l-8-3Z" />
            </svg>
            <span><strong class="font-bold text-ink">71-pt</strong> {{ 'home.hero.trust.inspection' | translate }}</span>
          </span>
          <span class="inline-flex items-center gap-2 rounded-pill border border-line bg-white px-4 py-2 text-[13px] text-ink-2 shadow-brand-sm">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" class="text-brand-700" aria-hidden="true">
              <path d="M3 7h11v8H3zM14 10h4l3 3v2h-7z" />
              <circle cx="7" cy="17" r="2" />
              <circle cx="17" cy="17" r="2" />
            </svg>
            <span><strong class="font-bold text-ink">48 hr</strong> {{ 'home.hero.trust.delivery' | translate }}</span>
          </span>
          <span class="inline-flex items-center gap-2 rounded-pill border border-line bg-white px-4 py-2 text-[13px] text-ink-2 shadow-brand-sm">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" class="text-brand-700" aria-hidden="true">
              <path d="M9 14 5 10l4-4M5 10h9a5 5 0 0 1 5 5v3" />
            </svg>
            <span><strong class="font-bold text-ink">3-day</strong> {{ 'home.hero.trust.return' | translate }}</span>
          </span>
        </div>
      </div>
    </section>
  `,
})
export class HeroSliderComponent implements OnInit {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);

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
    /* Navigation hook — wire to router when /browse, /sell, /finance routes land. */
  }

  onSecondary(): void {
    /* Navigation hook — wire to router when /browse, /sell, /finance routes land. */
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
