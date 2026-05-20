import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { NgClass } from '@angular/common';

export interface SectionSummary {
  key: string;
  labelEn: string;
  totalItems: number;
  scoredCount: number;
}

/**
 * Sticky chip rail showing per-section scored/total counts.
 * Matches the sticky section nav in mockup 02.
 * Clicking a chip smooth-scrolls to the matching section card (#sec-<key>).
 */
@Component({
  selector: 'admin-inspection-section-nav',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgClass],
  template: `
    <div class="flex flex-wrap gap-2 mb-5 sticky top-0 z-10 bg-slate-50 py-2 -mx-6 px-6 border-b border-slate-100">
      @for (section of sections; track section.key) {
        <button
          type="button"
          class="px-3 py-1.5 rounded-full text-xs font-semibold border inline-flex items-center transition-colors"
          [ngClass]="{
            'bg-brand-600 text-white border-brand-600 hover:bg-brand-700': section.scoredCount === section.totalItems,
            'bg-brand-50 text-brand-700 border-brand-200 hover:bg-brand-100': section.scoredCount > 0 && section.scoredCount < section.totalItems,
            'bg-slate-100 text-slate-600 border-slate-200': section.scoredCount === 0
          }"
          (click)="scrollTo(section.key)"
        >
          {{ section.labelEn }} · {{ section.scoredCount }}/{{ section.totalItems }}
        </button>
      }
    </div>
  `,
})
export class InspectionSectionNavComponent {
  @Input({ required: true }) sections!: SectionSummary[];

  protected scrollTo(key: string): void {
    document.getElementById('sec-' + key)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
