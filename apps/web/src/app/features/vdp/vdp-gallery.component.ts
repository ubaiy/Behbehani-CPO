import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { LanguageService } from '@behbehani-cpo/shared-i18n';

export interface VdpGalleryPhoto {
  cdnUrl: string;
  isHero?: boolean;
}

/**
 * VDP gallery — large primary image with thumbnail strip and prev/next nav.
 * Falls back to a brand-coloured gradient when no photos are available.
 * Pure UI: takes a `photos` list + optional `fallbackUrl`, owns the active
 * index internally.
 */
@Component({
  selector: 'app-vdp-gallery',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule],
  template: `
    <div class="overflow-hidden rounded-2xl border border-line bg-surface-cool">
      <!-- Main -->
      <div class="relative aspect-[16/10] bg-surface-cool">
        @if (current()) {
          <img
            [src]="current()"
            alt=""
            class="h-full w-full object-cover"
            (error)="imageFailed.set(true)"
          />
        }
        @if (!current() || imageFailed()) {
          <div class="h-full w-full" [style.background]="fallbackGradient"></div>
        }

        <!-- Overlay badges -->
        <div class="absolute start-3 top-3 flex flex-wrap gap-1.5">
          <span class="inline-flex items-center gap-1 rounded-pill bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-ink shadow-brand-sm backdrop-blur">
            <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="6" width="18" height="13" rx="2"/><circle cx="12" cy="12.5" r="3.5"/><path d="M8 6l1.5-2h5L16 6"/></svg>
            {{ photoCount() }} {{ 'vdp.gallery.photos' | translate }}
          </span>
          <span class="inline-flex items-center gap-1 rounded-pill bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-ink shadow-brand-sm backdrop-blur">
            <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polygon points="6 4 20 12 6 20 6 4"/></svg>
            {{ 'vdp.gallery.video' | translate }}
          </span>
          <span class="inline-flex items-center gap-1 rounded-pill bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-ink shadow-brand-sm backdrop-blur">
            <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 12a9 9 0 1 1-3.5-7.1"/><path d="M21 4v5h-5"/></svg>
            360°
          </span>
        </div>

        <!-- Prev/Next -->
        @if (photos().length > 1) {
          <button
            type="button"
            class="absolute start-3 top-1/2 inline-grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-ink shadow-brand-sm transition-colors hover:bg-white"
            (click)="prev()"
            [attr.aria-label]="'vdp.gallery.prev' | translate"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true">
              <path [attr.d]="isRtl() ? 'M10 6l6 6-6 6' : 'M14 6l-6 6 6 6'" />
            </svg>
          </button>
          <button
            type="button"
            class="absolute end-3 top-1/2 inline-grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-ink shadow-brand-sm transition-colors hover:bg-white"
            (click)="next()"
            [attr.aria-label]="'vdp.gallery.next' | translate"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true">
              <path [attr.d]="isRtl() ? 'M14 6l-6 6 6 6' : 'M10 6l6 6-6 6'" />
            </svg>
          </button>
        }
      </div>

      <!-- Thumbs -->
      @if (photos().length > 1) {
        <div class="flex gap-2 overflow-x-auto bg-white p-2.5">
          @for (p of photos(); track $index; let i = $index) {
            <button
              type="button"
              class="relative h-16 w-24 flex-shrink-0 overflow-hidden rounded-md border-2 transition-colors"
              [class.border-brand-700]="i === idx()"
              [class.border-transparent]="i !== idx()"
              (click)="select(i)"
              [attr.aria-label]="('vdp.gallery.viewPhoto' | translate) + ' ' + (i + 1)"
              [attr.aria-pressed]="i === idx()"
            >
              <img [src]="p.cdnUrl" alt="" class="h-full w-full object-cover" />
            </button>
          }
        </div>
      }
    </div>
  `,
})
export class VdpGalleryComponent {
  readonly photos = input.required<ReadonlyArray<VdpGalleryPhoto>>();
  readonly fallbackUrl = input<string | null>(null);
  readonly fallbackGradient = 'linear-gradient(135deg, #1E3A8A 0%, #1E293B 100%)';

  private readonly language = inject(LanguageService);
  readonly isRtl = computed(() => this.language.current() === 'ar');

  readonly imageFailed = signal(false);
  readonly idx = signal(0);

  readonly current = computed(() => {
    const list = this.photos();
    if (list.length === 0) return this.fallbackUrl() ?? '';
    const i = Math.min(this.idx(), list.length - 1);
    return list[i]?.cdnUrl ?? this.fallbackUrl() ?? '';
  });

  readonly photoCount = computed(() => Math.max(this.photos().length, 1));

  select(i: number): void {
    this.idx.set(i);
    this.imageFailed.set(false);
  }

  prev(): void {
    const n = this.photos().length;
    if (n === 0) return;
    this.idx.set((this.idx() - 1 + n) % n);
    this.imageFailed.set(false);
  }

  next(): void {
    const n = this.photos().length;
    if (n === 0) return;
    this.idx.set((this.idx() + 1) % n);
    this.imageFailed.set(false);
  }
}
