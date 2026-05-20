import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { LanguageService } from '@behbehani-cpo/shared-i18n';

/**
 * Behbehani inspection summary card. Renders the overall score as a big
 * percentage with the date it was inspected. The full 71-point breakdown
 * isn't in the public DTO yet — we surface a "Full report coming soon"
 * placeholder so the section stays informative without inventing data.
 */
@Component({
  selector: 'app-vdp-inspection',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule],
  template: `
    <section class="rounded-2xl border border-line bg-gradient-to-br from-brand-700/[0.04] to-brand-700/[0.01] p-5 lg:p-6">
      <header class="flex flex-wrap items-start justify-between gap-4">
        <div class="flex items-start gap-3">
          <div class="grid h-12 w-12 flex-shrink-0 place-items-center rounded-full bg-brand-700 text-white">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5l-8-3Z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          </div>
          <div>
            <h2 class="font-display text-xl font-bold text-ink">
              {{ 'vdp.inspection.title' | translate }}
            </h2>
            <p class="mt-0.5 text-sm text-muted">
              {{ 'vdp.inspection.sub' | translate }}
              @if (inspectedAtLabel()) {
                · {{ inspectedAtLabel() }}
              }
            </p>
          </div>
        </div>
        @if (scoreLabel()) {
          <div class="text-end">
            <div class="font-display text-[34px] font-extrabold leading-none text-brand-700">
              {{ scoreLabel() }}
            </div>
            <div class="mt-1 text-xs font-semibold text-muted">
              {{ 'vdp.inspection.overall' | translate }}
            </div>
          </div>
        }
      </header>

      <div class="mt-5 rounded-xl border border-dashed border-line bg-white p-4">
        <p class="text-sm text-muted-2">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" class="me-1 inline align-text-bottom text-muted" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>
          {{ 'vdp.inspection.fullReportSoon' | translate }}
        </p>
      </div>
    </section>
  `,
})
export class VdpInspectionComponent {
  readonly overallScore = input<number | null>(null);
  readonly inspectedAt = input<string | null>(null);

  private readonly language = inject(LanguageService);
  readonly locale = computed(() => this.language.current());

  readonly scoreLabel = computed(() => {
    const s = this.overallScore();
    if (s === null || s === undefined) return null;
    return `${Math.round(s)}%`;
  });

  readonly inspectedAtLabel = computed(() => {
    const at = this.inspectedAt();
    if (!at) return null;
    const d = new Date(at);
    if (Number.isNaN(d.getTime())) return null;
    return new Intl.DateTimeFormat(this.locale() === 'ar' ? 'ar-KW' : 'en-KW', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(d);
  });
}
