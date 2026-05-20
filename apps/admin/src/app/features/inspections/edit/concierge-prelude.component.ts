import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import type { InspectionDetailDto } from '@behbehani-cpo/data-access';

/**
 * 3-card prelude shown only when inspection.kind === 'concierge'.
 * Matches the Vehicle / Customer / Inspection location grid in mockup 02.
 *
 * Vehicle/location/customer-email fields come from the InspectionSummaryDto
 * concierge snapshot (populated only when kind === 'concierge'). Each row
 * keeps a `—` fallback for genuinely-null values (e.g. transmission optional
 * at intake).
 */
@Component({
  selector: 'admin-concierge-prelude',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">

      <!-- Vehicle snapshot -->
      <div class="bg-white rounded-xl border border-slate-200 p-4">
        <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/>
          </svg>
          Vehicle (customer-provided)
        </p>
        <dl class="text-sm space-y-1.5">
          <div class="flex justify-between">
            <dt class="text-slate-500">Year</dt>
            <dd class="text-slate-800 font-medium tabular-nums">{{ inspection.vehicleYear ?? '—' }}</dd>
          </div>
          <div class="flex justify-between">
            <dt class="text-slate-500">Make / Model</dt>
            <dd class="text-slate-800 font-medium">{{ makeModel() || inspection.vehicleLabel || '—' }}</dd>
          </div>
          <div class="flex justify-between">
            <dt class="text-slate-500">VIN</dt>
            <dd class="text-slate-800 font-mono text-xs">{{ inspection.vinMasked || '—' }}</dd>
          </div>
          <div class="flex justify-between">
            <dt class="text-slate-500">Mileage</dt>
            <dd class="text-slate-800 font-medium tabular-nums">
              @if (inspection.vehicleMileageKm !== null) {
                {{ formatMileage(inspection.vehicleMileageKm) }}
              } @else { — }
            </dd>
          </div>
          <div class="flex justify-between">
            <dt class="text-slate-500">Transmission</dt>
            <dd class="text-slate-800 font-medium">{{ inspection.vehicleTransmission || '—' }}</dd>
          </div>
        </dl>
      </div>

      <!-- Customer card -->
      @if (inspection.customer) {
        <div class="bg-white rounded-xl border border-slate-200 p-4 flex flex-col">
          <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
            </svg>
            Customer
          </p>
          <div class="flex items-center gap-2.5 mb-2">
            <div class="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
              <span class="text-xs font-bold text-brand-700">{{ initials(inspection.customer.fullName) }}</span>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-slate-800 truncate">{{ inspection.customer.fullName }}</p>
              @if (inspection.customer.mobile) {
                <p class="text-xs text-slate-500">{{ inspection.customer.mobile }}</p>
              }
            </div>
          </div>
          <dl class="text-sm space-y-1.5 flex-1">
            <div class="flex justify-between">
              <dt class="text-slate-500">Customer</dt>
              <dd class="text-slate-800 font-medium">{{ inspection.customer.fullName }}</dd>
            </div>
            @if (inspection.customer.mobile) {
              <div class="flex justify-between">
                <dt class="text-slate-500">Mobile</dt>
                <dd class="text-slate-800 font-mono text-xs">{{ inspection.customer.mobile }}</dd>
              </div>
            }
            <div class="flex justify-between">
              <dt class="text-slate-500">Email</dt>
              <dd class="text-slate-800 text-xs truncate max-w-[12rem]">{{ inspection.customer.email || '—' }}</dd>
            </div>
          </dl>
          <button
            type="button"
            class="mt-3 text-xs font-medium text-brand-600 hover:underline text-left min-h-[44px]"
          >View profile →</button>
        </div>
      }

      <!-- Inspection location -->
      <div class="bg-white rounded-xl border border-slate-200 p-4">
        <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
          </svg>
          Inspection location
        </p>
        <p class="text-sm font-medium text-slate-800">On-site · Concierge</p>
        <p class="text-xs text-slate-500 mt-1">Inspector attends customer's location.</p>
        <p class="text-xs text-slate-600 mt-1">Address: <span class="text-slate-800">{{ inspection.locationAddress || '—' }}</span></p>
        <p class="text-xs text-slate-600 mt-0.5">Governorate: <span class="text-slate-800">{{ inspection.locationGovernorate || '—' }}</span></p>
        <div class="mt-3 inline-flex items-center gap-1 rounded-full bg-brand-50 border border-brand-100 px-2 py-1 text-xs font-medium text-brand-700">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          Started {{ inspection.startedAt ? formatStarted(inspection.startedAt) : '—' }}
        </div>
      </div>

    </div>
  `,
})
export class ConciergePreludeComponent {
  @Input({ required: true }) inspection!: InspectionDetailDto;

  protected initials(name: string): string {
    return name.split(' ').slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('');
  }

  protected makeModel(): string {
    const parts = [this.inspection.vehicleBrandName, this.inspection.vehicleModelName].filter(Boolean);
    return parts.join(' ');
  }

  protected formatMileage(km: number): string {
    return `${km.toLocaleString('en-US')} km`;
  }

  protected formatStarted(iso: string): string {
    return new Date(iso).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
