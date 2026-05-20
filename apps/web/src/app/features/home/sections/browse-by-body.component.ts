import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslateModule } from '@ngx-translate/core';
import { LanguageService } from '@behbehani-cpo/shared-i18n';
import { PublicCatalogService } from '../../../data/public-catalog.service';

const BODY_PATHS: Record<string, string> = {
  sedan: 'M5 30 Q7 25 12 24 L20 18 Q26 14 36 14 L48 14 Q58 14 64 20 L70 26 Q74 26 76 30 L76 34 L5 34 Z',
  suv: 'M6 28 Q8 22 14 22 L20 14 Q26 10 38 10 L52 10 Q62 10 68 16 L74 22 Q78 22 80 26 L80 34 L6 34 Z',
  coupe: 'M6 30 Q8 26 12 25 L24 16 Q34 13 46 14 L58 14 Q68 16 72 22 L76 28 L76 34 L6 34 Z',
  convertible: 'M6 30 Q8 26 12 25 L20 22 Q28 19 38 19 L52 19 Q60 19 64 22 L72 26 Q76 26 78 30 L78 34 L6 34 Z',
  pickup: 'M5 28 L18 28 L24 18 L40 18 L42 28 L80 28 L80 34 L5 34 Z',
  hatchback: 'M6 30 Q8 26 12 25 L22 16 Q28 14 38 14 L50 14 L68 28 L80 30 L80 34 L6 34 Z',
  minivan: 'M6 28 Q8 22 14 21 L18 14 Q24 11 40 11 L58 11 Q70 11 74 18 L78 24 L82 28 L82 34 L6 34 Z',
};

@Component({
  selector: 'app-browse-by-body',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule],
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
          <button
            type="button"
            class="flex flex-col items-center gap-2 rounded-[10px] border border-line bg-white px-2 py-4 text-brand-700 transition-all hover:-translate-y-0.5 hover:border-brand-700 hover:shadow-brand"
          >
            <svg viewBox="0 0 86 40" class="h-10 w-[70px]" aria-hidden="true">
              <g fill="currentColor">
                <path [attr.d]="pathFor(body.slug)" />
              </g>
              <circle cx="22" cy="34" r="4.5" fill="#0B1220" />
              <circle cx="60" cy="34" r="4.5" fill="#0B1220" />
            </svg>
            <span class="text-[13px] font-medium text-ink">
              {{ currentLocale() === 'ar' ? body.nameAr : body.nameEn }}
            </span>
          </button>
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

  pathFor(slug: string): string {
    return BODY_PATHS[slug] ?? BODY_PATHS['sedan'];
  }
}
