import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { LanguageService } from '@behbehani-cpo/shared-i18n';
import { PublicCatalogService } from '../../../data/public-catalog.service';

/**
 * Per-body-type silhouettes. Each is a side profile drawn on a 0..86 × 0..40
 * viewBox so the wheel circles (placed at fixed y=34) line up consistently.
 * Shapes are intentionally chunky-cartoon — they only need to read as
 * distinguishable thumbnails at ~28px tall, not photo-real renders.
 *
 *  • sedan       — three-window low profile
 *  • suv         — tall boxy 4-door with raised roofline
 *  • hatchback   — short, abrupt rear bay (steep tailgate)
 *  • coupe       — long sloping fastback roof, low rear
 *  • convertible — body with no roof (dashed top line)
 *  • pickup      — cab + flat bed
 *  • van         — long rectangular box (commercial-style)
 *  • wagon       — sedan front + extended roof past rear axle
 */
interface BodyVisual {
  /** Main fill path (the body itself). */
  bodyPath: string;
  /** Optional accent strokes drawn AFTER the fill (windows, roof outline, etc). */
  accentPaths?: ReadonlyArray<string>;
  /** Wheel center X coords — different vehicles have different wheelbases. */
  wheels: readonly [number, number];
}

const BODY_VISUALS: Readonly<Record<string, BodyVisual>> = {
  sedan: {
    bodyPath:
      'M5 32 L9 32 Q10 24 18 22 L30 17 Q40 14 50 16 L62 18 Q70 20 76 24 L80 28 L81 32 L75 32 Z',
    accentPaths: [
      // window glass (greenhouse)
      'M22 22 L33 18 Q42 16 50 17 L60 18 L64 24 L24 24 Z',
    ],
    wheels: [22, 64],
  },
  suv: {
    bodyPath:
      'M5 32 L8 32 Q9 22 12 18 L20 12 Q28 9 44 9 L58 10 Q66 12 72 16 L78 22 L80 28 L81 32 L74 32 Z',
    accentPaths: [
      // tall greenhouse - 4 doors
      'M16 18 L22 14 Q30 12 44 12 L58 13 L66 17 L66 24 L16 24 Z',
      'M30 14 L30 24 M44 13 L44 24',
    ],
    wheels: [20, 66],
  },
  hatchback: {
    bodyPath:
      'M5 32 L9 32 Q10 24 16 22 L26 17 Q34 14 44 15 L54 16 L66 28 L80 30 L81 32 L75 32 Z',
    accentPaths: [
      // greenhouse drops sharply at rear (defining hatch shape)
      'M20 22 L30 18 Q38 16 46 17 L54 18 L62 26 L22 26 Z',
    ],
    wheels: [20, 60],
  },
  coupe: {
    bodyPath:
      'M5 32 L9 32 Q10 24 16 22 L26 16 Q40 13 56 16 Q66 18 72 22 L78 28 L79 32 L74 32 Z',
    accentPaths: [
      // long single greenhouse, no rear pillar — fastback feel
      'M22 22 Q34 16 50 16 Q62 17 68 22 L26 22 Z',
    ],
    wheels: [22, 64],
  },
  convertible: {
    bodyPath:
      'M5 32 L9 32 Q10 26 14 24 L22 22 Q34 20 50 21 Q62 22 70 24 L78 28 L79 32 L74 32 Z',
    accentPaths: [
      // dashed roof line = roof down / soft-top open
      'M20 22 L28 16 L48 16 L60 22',
      // windshield post
      'M28 16 L26 22',
    ],
    wheels: [22, 64],
  },
  pickup: {
    bodyPath:
      // cab block + flat bed
      'M5 32 L8 32 L8 26 Q9 22 14 20 L24 14 L38 14 L42 26 L78 26 L80 28 L81 32 L74 32 Z',
    accentPaths: [
      // cab window
      'M16 20 L26 16 L36 16 L38 22 L16 22 Z',
      // bed top rail
      'M42 22 L78 22',
    ],
    wheels: [20, 68],
  },
  van: {
    bodyPath:
      // big rectangular box with rounded front bumper
      'M5 32 L7 32 L7 16 Q8 12 14 11 L70 11 Q78 12 80 18 L80 32 L74 32 Z',
    accentPaths: [
      // front windshield only — slab side
      'M10 16 L22 16 L24 22 L10 22 Z',
      // sliding door split
      'M40 14 L40 28',
      // single rear window
      'M58 14 L72 14 L72 22 L58 22 Z',
    ],
    wheels: [20, 70],
  },
  wagon: {
    bodyPath:
      // sedan front + long flat roof extending past the rear axle
      'M5 32 L9 32 Q10 24 16 22 L24 17 Q36 14 50 15 L68 16 L78 22 L80 28 L81 32 L75 32 Z',
    accentPaths: [
      // long greenhouse
      'M22 22 L30 18 Q40 16 50 16 L66 17 L72 22 L26 22 Z',
      // C-pillar emphasised behind rear axle
      'M62 17 L62 22',
    ],
    wheels: [22, 68],
  },
};

@Component({
  selector: 'app-browse-by-body',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule, RouterLink],
  template: `
    <section class="container-page section">
      <header class="mb-9">
        <div class="section-eyebrow">{{ 'home.bodyTypes.eyebrow' | translate }}</div>
        <h2 class="mt-2 font-display text-[clamp(28px,3.4vw,44px)] font-bold tracking-[-0.025em] text-ink">
          {{ 'home.bodyTypes.title' | translate }}
        </h2>
      </header>
      <div class="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        @for (body of bodyTypes(); track body.id) {
          <a
            [routerLink]="['/', currentLocale(), 'browse']"
            [queryParams]="{ body: body.slug }"
            class="flex flex-col items-center gap-2 rounded-[10px] border border-line bg-white px-2 py-4 text-brand-700 transition-all hover:-translate-y-0.5 hover:border-brand-700 hover:shadow-brand"
          >
            <svg viewBox="0 0 86 40" class="h-10 w-[70px]" aria-hidden="true">
              <g fill="currentColor">
                <path [attr.d]="visualFor(body.slug).bodyPath" />
              </g>
              @for (accent of visualFor(body.slug).accentPaths ?? []; track $index) {
                <path
                  [attr.d]="accent"
                  fill="none"
                  stroke="white"
                  stroke-width="1.4"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              }
              <circle [attr.cx]="visualFor(body.slug).wheels[0]" cy="34" r="4.5" fill="#0B1220" />
              <circle [attr.cx]="visualFor(body.slug).wheels[1]" cy="34" r="4.5" fill="#0B1220" />
            </svg>
            <span class="text-[13px] font-medium text-ink">
              {{ currentLocale() === 'ar' ? body.nameAr : body.nameEn }}
            </span>
          </a>
        }
      </div>
    </section>
  `,
})
export class BrowseByBodyComponent {
  private readonly language = inject(LanguageService);
  private readonly catalog = inject(PublicCatalogService);
  readonly currentLocale = computed(() => this.language.current());
  readonly bodyTypes = toSignal(this.catalog.bodyTypes$(), { initialValue: [] });

  visualFor(slug: string): BodyVisual {
    return BODY_VISUALS[slug] ?? BODY_VISUALS['sedan'];
  }
}
