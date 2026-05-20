import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

/**
 * 4-tile KPI strip for the Inspections queue page.
 * Matches mockup 01 visual: white cards with brand-50/blue-200 highlight
 * on "Awaiting sign-off".
 */
export interface InspectionQueueKpi {
  awaitingStart: number;
  inProgress: number;
  awaitingSignoff: number;
  awaitingCustomerSig: number;
  signedOffThisWeek: number;
  avgScoreThisWeek: number | null;
  advisoryCountThisWeek: number;
}

@Component({
  selector: 'admin-inspection-kpi-strip',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-5">

      <!-- Awaiting start -->
      <div class="bg-white rounded-xl border border-slate-200 p-4">
        <p class="text-xs font-medium text-slate-500 uppercase">Awaiting start</p>
        <p class="text-2xl font-bold text-slate-800 tabular-nums mt-1">{{ kpi.awaitingStart }}</p>
        <p class="text-xs text-slate-400 mt-1">listings in inspection stage with no report yet</p>
      </div>

      <!-- In progress -->
      <div class="bg-white rounded-xl border border-slate-200 p-4">
        <p class="text-xs font-medium text-slate-500 uppercase">In progress</p>
        <p class="text-2xl font-bold text-slate-800 tabular-nums mt-1">{{ kpi.inProgress }}</p>
        <p class="text-xs text-slate-400 mt-1">draft reports — some items scored</p>
      </div>

      <!-- Awaiting sign-off — highlighted in blue -->
      <div class="bg-blue-50 rounded-xl border border-blue-200 p-4">
        <p class="text-xs font-medium text-blue-700 uppercase">Awaiting sign-off</p>
        <p class="text-2xl font-bold text-blue-900 tabular-nums mt-1">{{ kpi.awaitingSignoff }}</p>
        <p class="text-xs text-blue-700 mt-1">all items scored, ready to finalize</p>
      </div>

      <!-- Signed off this week -->
      <div class="bg-white rounded-xl border border-slate-200 p-4">
        <p class="text-xs font-medium text-slate-500 uppercase">Signed off (this week)</p>
        <p class="text-2xl font-bold text-slate-800 tabular-nums mt-1">{{ kpi.signedOffThisWeek }}</p>
        @if (kpi.avgScoreThisWeek !== null) {
          <p class="text-xs text-slate-400 mt-1">
            avg score {{ kpi.avgScoreThisWeek }}/100
            @if (kpi.advisoryCountThisWeek > 0) {
              · {{ kpi.advisoryCountThisWeek }} with advisories
            }
          </p>
        } @else {
          <p class="text-xs text-slate-400 mt-1">no completed inspections yet</p>
        }
      </div>

    </div>
  `,
})
export class InspectionKpiStripComponent {
  @Input({ required: true }) kpi!: InspectionQueueKpi;
}
