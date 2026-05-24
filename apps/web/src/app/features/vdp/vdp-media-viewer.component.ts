import { isPlatformBrowser } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LanguageService } from '@behbehani-cpo/shared-i18n';

export interface VdpMediaPhoto {
  cdnUrl: string;
  isHero?: boolean;
}

export interface VdpMediaWalkaround {
  url: string;
  mimeType: string;
  posterUrl: string | null;
  durationS: number | null;
}

export interface VdpMediaSpin360 {
  archiveUrl: string;
  mimeType: string;
  frameCount: number | null;
}

type MediaTab = 'photos' | 'spin' | 'video';

/**
 * Unified VDP media viewer (v1.5-D13). Replaces the 3 stacked cards
 * (gallery + walk-around video + 360° spin) with ONE rounded card and a
 * tab switcher (CarWale pattern).
 *
 * Behavior locks:
 *  - Desktop (≥ sm): tab strip ABOVE the 16:10 viewer.
 *  - Mobile  (< sm): tab strip BELOW the viewer (single markup, reordered
 *    via Tailwind `order-*` utilities).
 *  - Tab strip auto-hides when the listing has only one media type.
 *  - All three panels share a single `aspect-[16/10]` box — no layout
 *    shift on swap.
 *  - The `<video>` element stays mounted (`[hidden]` toggle) so switching
 *    away pauses + remembers `currentTime` and switching back resumes.
 *  - 360° drag-to-scrub overlay = pointer-event behavior ported verbatim
 *    from VdpSpin360Component.
 *  - Thumb strip is shown only on the Photos tab.
 *  - SSR-safe: Photos panel renders server-side; Video + 360° panels
 *    lazy-load via `IntersectionObserver` only after their tab is first
 *    activated.
 */
@Component({
  selector: 'app-vdp-media-viewer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule],
  template: `
    <section class="overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
      <!-- ============ Tab strip (only when 2+ media types) ============ -->
      @if (availableTabs().length > 1) {
        <div class="order-2 flex items-center justify-between border-line bg-white px-2 sm:order-1 sm:border-b sm:px-3 sm:!border-t-0 [&:not(:first-child)]:border-t">
          <div class="flex items-center gap-0.5 overflow-x-auto">
            @for (tab of availableTabs(); track tab.id) {
              <button
                type="button"
                class="media-tab relative inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2.5 text-xs font-semibold transition-colors sm:px-4 sm:py-3 sm:text-[13px]"
                [class.border-brand-700]="activeTab() === tab.id"
                [class.text-brand-700]="activeTab() === tab.id"
                [class.border-transparent]="activeTab() !== tab.id"
                [class.text-muted]="activeTab() !== tab.id"
                [attr.aria-pressed]="activeTab() === tab.id"
                [attr.aria-label]="tab.label"
                (click)="setTab(tab.id)"
              >
                @switch (tab.id) {
                  @case ('photos') {
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="6" width="18" height="13" rx="2"/><circle cx="12" cy="12.5" r="3.5"/><path d="M8 6l1.5-2h5L16 6"/></svg>
                  }
                  @case ('spin') {
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 12a9 9 0 1 1-3.5-7.1"/><path d="M21 4v5h-5"/><circle cx="12" cy="12" r="2.2"/></svg>
                  }
                  @case ('video') {
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none"/></svg>
                  }
                }
                {{ tab.label }}
                @if (tab.chip) {
                  <span
                    class="rounded-pill px-1.5 py-0.5 text-[10px] font-bold sm:px-2 sm:text-[11px]"
                    [class.bg-brand-100]="activeTab() === tab.id"
                    [class.text-brand-700]="activeTab() === tab.id"
                    [class.bg-surface-cool]="activeTab() !== tab.id"
                    [class.text-muted]="activeTab() !== tab.id"
                  >{{ tab.chip }}</span>
                }
              </button>
            }
          </div>
        </div>
      }

      <!-- ============ Viewport (16:10) — shared across all tabs ============ -->
      <div #host class="relative order-1 aspect-[16/10] overflow-hidden bg-surface-cool sm:order-2">

        <!-- ----- Photos panel ----- -->
        @if (activeTab() === 'photos') {
          @if (currentPhoto()) {
            <img
              [src]="currentPhoto()"
              alt=""
              class="h-full w-full object-cover"
              (error)="imageFailed.set(true)"
            />
          }
          @if (!currentPhoto() || imageFailed()) {
            <div class="h-full w-full" [style.background]="fallbackGradient"></div>
          }

          <!-- Photo counter badge (top-left) -->
          <div class="absolute start-3 top-3 flex flex-wrap gap-1.5">
            <span class="inline-flex items-center gap-1 rounded-pill bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-ink shadow-brand-sm backdrop-blur">
              <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="6" width="18" height="13" rx="2"/><circle cx="12" cy="12.5" r="3.5"/><path d="M8 6l1.5-2h5L16 6"/></svg>
              {{ photoCount() }} {{ 'vdp.gallery.photos' | translate }}
            </span>
          </div>

          @if (photos().length > 1) {
            <!-- Bottom-right index pill -->
            <div class="absolute bottom-3 end-3 rounded-pill bg-black/65 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur">
              {{ photoIdx() + 1 }} / {{ photos().length }}
            </div>

            <!-- Prev/Next -->
            <button
              type="button"
              class="absolute start-3 top-1/2 inline-grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/95 text-ink shadow-brand-sm transition-colors hover:bg-white sm:h-11 sm:w-11"
              (click)="prevPhoto()"
              [attr.aria-label]="'vdp.gallery.prev' | translate"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true">
                <path [attr.d]="isRtl() ? 'M10 6l6 6-6 6' : 'M14 6l-6 6 6 6'" />
              </svg>
            </button>
            <button
              type="button"
              class="absolute end-3 top-1/2 inline-grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/95 text-ink shadow-brand-sm transition-colors hover:bg-white sm:h-11 sm:w-11"
              (click)="nextPhoto()"
              [attr.aria-label]="'vdp.gallery.next' | translate"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true">
                <path [attr.d]="isRtl() ? 'M14 6l-6 6 6 6' : 'M10 6l6 6-6 6'" />
              </svg>
            </button>
          }
        }

        <!-- ----- 360° panel ----- -->
        @if (activeTab() === 'spin' && spin360(); as s) {
          @if (spinLoaded()) {
            @if (isSpinMp4()) {
              <div
                class="absolute inset-0 select-none bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"
                [class.cursor-grab]="!spinScrubbing()"
                [class.cursor-grabbing]="spinScrubbing()"
              >
                <video
                  #spinVid
                  class="pointer-events-none h-full w-full object-cover"
                  muted
                  playsinline
                  preload="metadata"
                  [src]="s.archiveUrl"
                  (loadedmetadata)="onSpinLoaded()"
                ></video>
                <div
                  class="absolute inset-0"
                  (pointerdown)="onSpinPointerDown($event)"
                  (pointermove)="onSpinPointerMove($event)"
                  (pointerup)="onSpinPointerUp($event)"
                  (pointercancel)="onSpinPointerUp($event)"
                  (pointerleave)="onSpinPointerUp($event)"
                ></div>
                <span class="absolute bottom-3 start-1/2 inline-flex -translate-x-1/2 items-center gap-2 rounded-pill bg-black/65 px-4 py-1.5 text-[11px] font-semibold text-white backdrop-blur">
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M8 12h8M12 8l-4 4 4 4M12 16l4-4-4-4"/></svg>
                  {{ 'vdp.spin360.dragHint' | translate }}
                </span>
              </div>
            } @else {
              <div class="grid h-full w-full place-items-center bg-surface-soft px-6 text-center">
                <p class="text-sm text-muted">{{ 'vdp.spin360.zipComingSoon' | translate }}</p>
              </div>
            }
          } @else {
            <div class="h-full w-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"></div>
          }
        }

        <!-- ----- Video panel (element STAYS MOUNTED for play-state preservation) ----- -->
        @if (walkaround(); as wa) {
          <div class="absolute inset-0 bg-black" [hidden]="activeTab() !== 'video'">
            @if (videoLoaded()) {
              <video
                #videoEl
                class="h-full w-full"
                controls
                playsinline
                preload="metadata"
                [poster]="wa.posterUrl ?? null"
              >
                <source [src]="wa.url" [type]="wa.mimeType" />
              </video>
            } @else {
              <div class="grid h-full w-full place-items-center text-white/40">
                <svg viewBox="0 0 24 24" width="56" height="56" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" />
                  <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none" />
                </svg>
              </div>
            }
          </div>
        }
      </div>

      <!-- ============ Thumb strip — Photos tab only ============ -->
      @if (activeTab() === 'photos' && photos().length > 1) {
        <div class="order-3 flex gap-2 overflow-x-auto bg-surface-soft p-2.5 sm:p-3">
          @for (p of photos(); track $index; let i = $index) {
            <button
              type="button"
              class="relative h-12 w-16 flex-shrink-0 overflow-hidden rounded-md border-2 transition-colors sm:h-16 sm:w-24"
              [class.border-brand-700]="i === photoIdx()"
              [class.ring-2]="i === photoIdx()"
              [class.ring-brand-200]="i === photoIdx()"
              [class.border-transparent]="i !== photoIdx()"
              (click)="selectPhoto(i)"
              [attr.aria-label]="('vdp.gallery.viewPhoto' | translate) + ' ' + (i + 1)"
              [attr.aria-pressed]="i === photoIdx()"
            >
              <img [src]="p.cdnUrl" alt="" class="h-full w-full object-cover" />
            </button>
          }
        </div>
      }
    </section>
  `,
  styles: [
    ':host { display: block; }',
    /* Flex order swap: tabs above viewer on desktop, below on mobile.
       Children use .order-* utilities + this flex container = swap with
       no duplicated markup. */
    'section { display: flex; flex-direction: column; }',
  ],
})
export class VdpMediaViewerComponent implements AfterViewInit, OnDestroy {
  // -------- inputs --------
  readonly photos = input.required<ReadonlyArray<VdpMediaPhoto>>();
  readonly fallbackUrl = input<string | null>(null);
  readonly walkaround = input<VdpMediaWalkaround | null>(null);
  readonly spin360 = input<VdpMediaSpin360 | null>(null);

  // -------- DI --------
  private readonly language = inject(LanguageService);
  private readonly platformId = inject(PLATFORM_ID);

  // -------- shared --------
  readonly isRtl = computed(() => this.language.current() === 'ar');
  readonly fallbackGradient = 'linear-gradient(135deg, #1E3A8A 0%, #1E293B 100%)';

  // -------- state --------
  readonly activeTab = signal<MediaTab>('photos');
  readonly photoIdx = signal(0);
  readonly imageFailed = signal(false);
  readonly videoLoaded = signal(false);
  readonly spinLoaded = signal(false);
  readonly spinScrubbing = signal(false);

  // -------- view refs --------
  private readonly host = viewChild<ElementRef<HTMLElement>>('host');
  private readonly videoEl = viewChild<ElementRef<HTMLVideoElement>>('videoEl');
  private readonly spinVid = viewChild<ElementRef<HTMLVideoElement>>('spinVid');

  // -------- 360° drag state (ported verbatim from VdpSpin360Component) --------
  private startX = 0;
  private startTime = 0;
  private duration = 0;
  private pointerId: number | null = null;

  // -------- video state preservation --------
  private lastVideoTime = 0;
  private observer: IntersectionObserver | null = null;

  // -------- derived: tab list --------
  readonly availableTabs = computed<ReadonlyArray<{ id: MediaTab; label: string; chip: string | null }>>(() => {
    // Depend on locale signal so labels re-translate on language toggle.
    void this.language.current();
    const tabs: Array<{ id: MediaTab; label: string; chip: string | null }> = [];
    // Photos always present (could be just the hero fallback).
    tabs.push({
      id: 'photos',
      label: this.t('vdp.media.tabs.photos'),
      chip: this.photos().length > 0 ? String(this.photos().length) : null,
    });
    if (this.spin360()) {
      tabs.push({ id: 'spin', label: this.t('vdp.media.tabs.spin'), chip: null });
    }
    const wa = this.walkaround();
    if (wa) {
      tabs.push({
        id: 'video',
        label: this.t('vdp.media.tabs.video'),
        chip: wa.durationS != null ? `${Math.round(wa.durationS)}s` : null,
      });
    }
    return tabs;
  });

  // -------- derived: photos --------
  readonly photoCount = computed(() => Math.max(this.photos().length, 1));
  readonly currentPhoto = computed(() => {
    const list = this.photos();
    if (list.length === 0) return this.fallbackUrl() ?? '';
    const i = Math.min(this.photoIdx(), list.length - 1);
    return list[i]?.cdnUrl ?? this.fallbackUrl() ?? '';
  });

  // -------- derived: 360° --------
  readonly isSpinMp4 = computed(() => this.spin360()?.mimeType === 'video/mp4');

  // -------- translation helper (synchronous, signal-friendly) --------
  private readonly translate = inject(TranslateService);

  constructor() {
    // Keep activeTab valid if inputs change (e.g., listing without walkaround
    // ever and tab was somehow 'video' — defensive).
    effect(() => {
      const tabs = this.availableTabs().map((t) => t.id);
      if (!tabs.includes(this.activeTab())) {
        this.activeTab.set(tabs[0] ?? 'photos');
      }
    });

    // Lazy-load gating: when user switches to spin/video for the first time,
    // mount the heavy media. Stays mounted thereafter.
    effect(() => {
      const t = this.activeTab();
      if (!isPlatformBrowser(this.platformId)) return;
      if (t === 'video' && !this.videoLoaded()) this.videoLoaded.set(true);
      if (t === 'spin' && !this.spinLoaded()) this.spinLoaded.set(true);
    });
  }

  // -------- lifecycle --------
  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const el = this.host()?.nativeElement;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      // No IO support — eagerly load heavy media if they exist.
      if (this.walkaround()) this.videoLoaded.set(true);
      if (this.spin360()) this.spinLoaded.set(true);
      return;
    }
    // Pre-warm: once the card scrolls into view, allow heavy media to mount
    // on first tab activation. We don't force-mount until the tab is opened.
    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            this.observer?.disconnect();
            this.observer = null;
            break;
          }
        }
      },
      { rootMargin: '200px 0px' },
    );
    this.observer.observe(el);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.observer = null;
  }

  // -------- tab control --------
  setTab(next: MediaTab): void {
    const prev = this.activeTab();
    if (prev === next) return;
    // Leaving video: pause + remember currentTime.
    if (prev === 'video') {
      const v = this.videoEl()?.nativeElement;
      if (v) {
        this.lastVideoTime = v.currentTime;
        try { v.pause(); } catch { /* noop */ }
      }
    }
    this.activeTab.set(next);
    // Entering video: restore currentTime once the element exists.
    if (next === 'video' && isPlatformBrowser(this.platformId)) {
      queueMicrotask(() => {
        const v = this.videoEl()?.nativeElement;
        if (v && Number.isFinite(this.lastVideoTime) && this.lastVideoTime > 0) {
          try { v.currentTime = this.lastVideoTime; } catch { /* noop */ }
        }
      });
    }
  }

  // -------- photos --------
  selectPhoto(i: number): void {
    this.photoIdx.set(i);
    this.imageFailed.set(false);
  }

  prevPhoto(): void {
    const n = this.photos().length;
    if (n === 0) return;
    this.photoIdx.set((this.photoIdx() - 1 + n) % n);
    this.imageFailed.set(false);
  }

  nextPhoto(): void {
    const n = this.photos().length;
    if (n === 0) return;
    this.photoIdx.set((this.photoIdx() + 1) % n);
    this.imageFailed.set(false);
  }

  /** Keyboard nav — arrows scrub photos when Photos tab is active. */
  @HostListener('keydown.arrowleft', ['$event'])
  onArrowLeft(ev: Event): void {
    if (this.activeTab() !== 'photos' || this.photos().length <= 1) return;
    ev.preventDefault();
    this.isRtl() ? this.nextPhoto() : this.prevPhoto();
  }

  @HostListener('keydown.arrowright', ['$event'])
  onArrowRight(ev: Event): void {
    if (this.activeTab() !== 'photos' || this.photos().length <= 1) return;
    ev.preventDefault();
    this.isRtl() ? this.prevPhoto() : this.nextPhoto();
  }

  // -------- 360° drag-to-scrub (ported verbatim from VdpSpin360Component) --------
  onSpinLoaded(): void {
    const v = this.spinVid()?.nativeElement;
    if (v && Number.isFinite(v.duration) && v.duration > 0) {
      this.duration = v.duration;
      try { v.pause(); v.currentTime = 0; } catch { /* noop */ }
    }
  }

  onSpinPointerDown(ev: PointerEvent): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const v = this.spinVid()?.nativeElement;
    if (!v || !this.duration) return;
    this.spinScrubbing.set(true);
    this.startX = ev.clientX;
    this.startTime = v.currentTime;
    this.pointerId = ev.pointerId;
    const target = ev.target as Element | null;
    try { target?.setPointerCapture?.(ev.pointerId); } catch { /* noop */ }
  }

  onSpinPointerMove(ev: PointerEvent): void {
    if (!this.spinScrubbing()) return;
    const v = this.spinVid()?.nativeElement;
    if (!v || !this.duration) return;
    const target = ev.currentTarget as HTMLElement | null;
    const width = target?.clientWidth ?? 1;
    const delta = ev.clientX - this.startX;
    const fraction = delta / width;
    let next = this.startTime + fraction * this.duration;
    next = ((next % this.duration) + this.duration) % this.duration;
    try { v.currentTime = next; } catch { /* noop */ }
  }

  onSpinPointerUp(ev: PointerEvent): void {
    if (!this.spinScrubbing()) return;
    this.spinScrubbing.set(false);
    const target = ev.target as Element | null;
    if (this.pointerId !== null) {
      try { target?.releasePointerCapture?.(this.pointerId); } catch { /* noop */ }
    }
    this.pointerId = null;
  }

  // -------- internal helpers --------
  /** Translate.instant wrapper — falls back to key when service is absent. */
  private t(key: string): string {
    try {
      return this.translate?.instant?.(key) ?? key;
    } catch {
      return key;
    }
  }
}
