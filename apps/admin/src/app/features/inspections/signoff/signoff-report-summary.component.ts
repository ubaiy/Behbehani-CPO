import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

export interface SectionScoreRow {
  key: string;
  labelEn: string;
  itemCount: number;
  score: number | null;
}

export interface AttentionItem {
  itemId: string;
  labelEn: string;
  status: 'advisory' | 'fail';
  notes: string | null;
}

/**
 * Two-column grid: section scores on the left, items needing attention on the right.
 * Extracted from inspection-signoff to keep it under 500 lines.
 */
@Component({
  selector: 'admin-signoff-report-summary',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">

      <div class="bg-white rounded-xl border border-slate-200 p-4">
        <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Section scores</p>
        <ul class="space-y-2.5 text-sm">
          @for (section of sectionScores; track section.key) {
            <li class="flex items-center justify-between">
              <span class="text-slate-700">
                {{ section.labelEn }} <span class="text-slate-400 text-xs">({{ section.itemCount }} items)</span>
              </span>
              <span class="font-semibold tabular-nums text-sm"
                [class.text-red-700]="section.score !== null && section.score < 80"
                [class.text-slate-700]="section.score === null || section.score >= 80"
              >{{ section.score !== null ? section.score : '—' }}</span>
            </li>
          }
        </ul>
      </div>

      <div class="bg-white rounded-xl border border-slate-200 p-4">
        <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Items needing attention</p>
        @if (attentionItems.length === 0) {
          <p class="text-xs text-slate-400 italic">No advisories or failures.</p>
        } @else {
          <ul class="space-y-2.5 text-sm">
            @for (it of attentionItems; track it.itemId) {
              <li class="flex items-start gap-2">
                <span class="mt-1 inline-block w-2 h-2 rounded-full flex-shrink-0"
                  [class.bg-amber-500]="it.status === 'advisory'"
                  [class.bg-red-600]="it.status === 'fail'"
                ></span>
                <div class="flex-1 min-w-0">
                  <p class="font-medium text-slate-700">{{ it.labelEn }}</p>
                  @if (it.notes) { <p class="text-xs text-slate-500 mt-0.5">{{ it.notes }}</p> }
                </div>
              </li>
            }
          </ul>
        }
      </div>

    </div>
  `,
})
export class SignoffReportSummaryComponent {
  @Input({ required: true }) sectionScores!: SectionScoreRow[];
  @Input({ required: true }) attentionItems!: AttentionItem[];
}
