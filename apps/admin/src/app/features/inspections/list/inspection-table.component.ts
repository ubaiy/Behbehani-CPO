import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import type { InspectionSummaryDto } from '@behbehani-cpo/shared-types';
import {
  KIND_CHIP_CLASS,
  KIND_LABELS,
  STATUS_CHIP_CLASS,
  STATUS_LABELS,
} from '../shared/inspection-labels';

/**
 * Presentational table for the Inspections queue.
 * Extracted from inspection-list to keep the parent under 500 lines.
 */
@Component({
  selector: 'admin-inspection-table',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-slate-50 border-b border-slate-200 text-left">
              <th class="px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-20">Kind</th>
              <th class="px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Vehicle / Customer</th>
              <th class="px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">VIN</th>
              <th class="px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Inspector</th>
              <th class="px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
              <th class="px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-40">Progress</th>
              <th class="px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-center">Score</th>
              <th class="px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Last update</th>
              <th class="px-3 py-3 w-10"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            @if (loading) {
              @for (i of skeletonRows; track i) {
                <tr class="animate-pulse">
                  <td class="px-3 py-3"><div class="h-5 bg-slate-200 rounded w-14"></div></td>
                  <td class="px-3 py-3"><div class="h-4 bg-slate-200 rounded w-44 mb-1"></div><div class="h-3 bg-slate-100 rounded w-28"></div></td>
                  <td class="px-3 py-3"><div class="h-3 bg-slate-200 rounded w-20"></div></td>
                  <td class="px-3 py-3"><div class="h-4 bg-slate-200 rounded w-24"></div></td>
                  <td class="px-3 py-3"><div class="h-5 bg-slate-200 rounded-full w-24"></div></td>
                  <td class="px-3 py-3"><div class="h-2 bg-slate-200 rounded-full w-32"></div></td>
                  <td class="px-3 py-3 text-center"><div class="h-4 bg-slate-200 rounded w-8 mx-auto"></div></td>
                  <td class="px-3 py-3"><div class="h-3 bg-slate-200 rounded w-16"></div></td>
                  <td class="px-3 py-3"></td>
                </tr>
              }
            } @else {
              @for (item of items; track item.id) {
                <tr
                  class="transition-colors"
                  [class.bg-blue-50\/40]="needsAttention(item)"
                  [class.hover:bg-blue-50]="needsAttention(item)"
                  [class.hover:bg-slate-50]="!needsAttention(item)"
                >
                  <td class="px-3 py-3">
                    <span class="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-semibold" [ngClass]="KIND_CHIP_CLASS[item.kind]">
                      {{ KIND_LABELS[item.kind] }}
                    </span>
                  </td>
                  <td class="px-3 py-3">
                    <a [routerLink]="[item.id]" class="font-medium text-slate-800 hover:text-brand-600 leading-tight">{{ item.vehicleLabel }}</a>
                    @if (item.kind === 'cpo' && item.listing) {
                      <p class="text-xs text-slate-400 font-mono mt-0.5">#{{ item.listing.stockNumber }} · Behbehani inventory</p>
                    } @else if (item.kind === 'concierge' && item.customer) {
                      <p class="text-xs text-slate-400 mt-0.5">
                        👤 {{ item.customer.fullName }}@if (item.customer.mobile) { · {{ item.customer.mobile }} }@if (item.locationGovernorate) { · 📍 {{ item.locationGovernorate }} }
                      </p>
                    }
                  </td>
                  <td class="px-3 py-3 font-mono text-xs text-slate-500">
                    @if (item.vinMasked) { {{ item.vinMasked }} } @else { <span class="text-slate-300">—</span> }
                  </td>
                  <td class="px-3 py-3 text-sm whitespace-nowrap">
                    @if (item.inspector) {
                      <span class="text-slate-700">{{ item.inspector.fullName }}</span>
                    } @else {
                      <span class="text-slate-400 italic">Unassigned</span>
                    }
                  </td>
                  <td class="px-3 py-3">
                    <span class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap" [ngClass]="STATUS_CHIP_CLASS[item.status]">
                      @if (item.status === 'awaiting_customer_signature') {
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" aria-hidden="true">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v1m0 14v1m8-9h1M3 12h1m13.66-6.66l-.71.71M6.34 17.66l-.71.71m12.02 0l-.71-.71M6.34 6.34l-.71-.71"/>
                        </svg>
                      }
                      {{ STATUS_LABELS[item.status] }}
                    </span>
                  </td>
                  <td class="px-3 py-3">
                    <div class="flex items-center gap-2">
                      <div class="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          class="h-full transition-all"
                          [class.bg-brand-600]="item.status !== 'signed_off'"
                          [class.bg-slate-400]="item.status === 'signed_off'"
                          [style.width.%]="progressPercent(item)"
                        ></div>
                      </div>
                      <span class="text-xs font-medium tabular-nums whitespace-nowrap"
                        [class.text-slate-600]="item.scoredCount > 0"
                        [class.text-slate-400]="item.scoredCount === 0"
                      >{{ item.scoredCount }}/{{ item.totalCount }}</span>
                    </div>
                  </td>
                  <td class="px-3 py-3 text-center">
                    @if (item.overallScore !== null && item.scoredCount > 0) {
                      <span class="font-semibold tabular-nums"
                        [class.text-slate-700]="item.overallScore >= 70"
                        [class.text-red-700]="item.overallScore < 70"
                      >{{ item.overallScore }}</span>
                    } @else {
                      <span class="text-slate-400 text-xs">—</span>
                    }
                  </td>
                  <td class="px-3 py-3 text-xs text-slate-400 whitespace-nowrap">{{ formatUpdated(item.updatedAt) }}</td>
                  <td class="px-3 py-3 text-right whitespace-nowrap">
                    @if (item.status === 'awaiting_customer_signature') {
                      <a [routerLink]="[item.id, 'signoff']" class="text-xs font-medium text-slate-500 hover:text-brand-600">Resend link →</a>
                    } @else if (item.status === 'signed_off' && item.kind === 'concierge') {
                      <!-- Concierge inspections converge on the buy-offer step
                           after sign-off, so the queue surfaces the create-
                           offer flow as the primary action instead of the
                           read-only report view. -->
                      <a [routerLink]="[item.id, 'offer', 'new']" class="text-xs font-semibold text-brand-600 hover:underline">Create offer →</a>
                    } @else {
                      <a [routerLink]="[item.id]" class="text-xs font-semibold text-brand-600 hover:underline">{{ rowActionLabel(item) }} →</a>
                    }
                  </td>
                </tr>
              }
            }
          </tbody>
        </table>
      </div>
      <ng-content />
    </div>
  `,
})
export class InspectionTableComponent {
  @Input({ required: true }) items!: InspectionSummaryDto[];
  @Input() loading = false;

  protected readonly KIND_LABELS = KIND_LABELS;
  protected readonly KIND_CHIP_CLASS = KIND_CHIP_CLASS;
  protected readonly STATUS_LABELS = STATUS_LABELS;
  protected readonly STATUS_CHIP_CLASS = STATUS_CHIP_CLASS;
  protected readonly skeletonRows = Array.from({ length: 6 }, (_, i) => i);

  protected needsAttention(item: InspectionSummaryDto): boolean {
    return item.status === 'awaiting_inspector_signoff' || item.status === 'awaiting_customer_signature';
  }

  protected progressPercent(item: InspectionSummaryDto): number {
    if (item.totalCount <= 0) return 0;
    return Math.round((item.scoredCount / item.totalCount) * 100);
  }

  protected rowActionLabel(item: InspectionSummaryDto): string {
    switch (item.status) {
      case 'draft':                       return 'Start';
      case 'in_progress':                 return 'Resume';
      case 'awaiting_inspector_signoff':  return 'Review & sign';
      case 'awaiting_customer_signature': return 'Resend link';
      case 'signed_off':                  return 'View report';
    }
  }

  protected formatUpdated(iso: string): string {
    const d = new Date(iso);
    const diffMs = Date.now() - d.getTime();
    const diffH = Math.floor(diffMs / 3_600_000);
    if (diffH < 1) return 'Just now';
    if (diffH < 24) return `${diffH} hr${diffH === 1 ? '' : 's'} ago`;
    const diffD = Math.floor(diffMs / 86_400_000);
    if (diffD === 1) return 'Yesterday';
    if (diffD < 7) return `${diffD} days ago`;
    return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short' }).format(d);
  }
}
