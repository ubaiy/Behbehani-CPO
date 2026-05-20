import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import type { OfferKpiDto } from '../offers.service';

@Component({
  selector: 'admin-offer-kpi-strip',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <p class="text-xs text-slate-500 font-medium mb-1">Pending response</p>
        <p class="text-2xl font-bold text-amber-600 tabular-nums">{{ kpi.pendingResponse }}</p>
        <p class="text-xs text-slate-400 mt-0.5">Awaiting customer</p>
      </div>
      <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <p class="text-xs text-slate-500 font-medium mb-1">Counters open</p>
        <p class="text-2xl font-bold text-brand-600 tabular-nums">{{ kpi.countersOpen }}</p>
        <p class="text-xs text-slate-400 mt-0.5">Need admin response</p>
      </div>
      <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <p class="text-xs text-slate-500 font-medium mb-1">Accepted this week</p>
        <p class="text-2xl font-bold text-slate-800 tabular-nums">{{ kpi.acceptedThisWeek }}</p>
        <p class="text-xs text-slate-400 mt-0.5">Converted</p>
      </div>
      <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <p class="text-xs text-slate-500 font-medium mb-1">Expired this week</p>
        <p class="text-2xl font-bold text-red-600 tabular-nums">{{ kpi.expiredThisWeek }}</p>
        <p class="text-xs text-slate-400 mt-0.5">No response by deadline</p>
      </div>
    </div>
  `,
})
export class OfferKpiStripComponent {
  @Input({ required: true }) kpi!: OfferKpiDto;
}
