import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import type { ConciergeBookingStatus, InspectionStatus } from '@behbehani-cpo/shared-types';

export type TrackerStep = 'assigned' | 'inspection' | 'sign';
export type StepState = 'done' | 'active' | 'pending';

/**
 * 4-step timeline visualization for the concierge tracker (v2 redesign).
 *
 * Pure presentational: takes the slim `ConciergeBookingStatus` DTO and a
 * formatter, derives 4 step states from `status` + `inspectorAssigned`, and
 * renders the brand-blue (NOT emerald — brand-lock) timeline.
 *
 * The 4 steps map to the existing `InspectionStatus` enum:
 *   1. Booking received  → always done once DTO is loaded
 *   2. Inspector assigned → derived from `inspectorAssigned`
 *   3. Inspection on-site → status === 'in_progress'
 *   4. Sign + offer       → status === 'awaiting_customer_signature' / 'signed_off'
 */
@Component({
  selector: 'app-tracker-timeline',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, TranslateModule],
  template: `
    <div class="rounded-3xl border border-line bg-white p-6 shadow-brand-sm">
      <div class="text-[11px] font-semibold uppercase tracking-wider text-muted">
        {{ 'sell.conciergeTracker.progressLabel' | translate }}
      </div>

      <ol class="mt-4 relative">
        <div class="absolute left-[15px] top-3 bottom-3 w-0.5 bg-line" aria-hidden="true"></div>

        <!-- Step 1: received -->
        <li class="relative flex gap-4 pb-5">
          <span class="z-10 inline-grid h-8 w-8 place-items-center rounded-full bg-brand-700 text-white flex-shrink-0">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true"><path d="M5 13l4 4L19 7"/></svg>
          </span>
          <div class="flex-1 pt-1">
            <div class="text-[14px] font-bold text-ink">{{ 'sell.conciergeTracker.timeline.received' | translate }}</div>
            @if (data?.customerPreference; as pref) {
              <div class="text-[12px] text-muted">{{ formatDate(pref.preferredDate) }}</div>
            }
          </div>
        </li>

        <!-- Step 2: assigned -->
        <li class="relative flex gap-4 pb-5" [class.opacity-60]="stepState('assigned') === 'pending'">
          @switch (stepState('assigned')) {
            @case ('done') {
              <span class="z-10 inline-grid h-8 w-8 place-items-center rounded-full bg-brand-700 text-white flex-shrink-0">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true"><path d="M5 13l4 4L19 7"/></svg>
              </span>
            }
            @case ('active') {
              <span class="z-10 inline-grid h-8 w-8 place-items-center rounded-full bg-brand-700 text-white flex-shrink-0 ring-4 ring-brand-100">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" class="animate-pulse" aria-hidden="true"><circle cx="12" cy="12" r="6"/></svg>
              </span>
            }
            @default {
              <span class="z-10 inline-grid h-8 w-8 place-items-center rounded-full bg-white border-2 border-line text-muted flex-shrink-0">
                <span class="text-[13px] font-bold">2</span>
              </span>
            }
          }
          <div class="flex-1 pt-1">
            <div class="flex flex-wrap items-center gap-2">
              <div class="text-[14px] font-bold" [class.text-ink]="stepState('assigned') !== 'pending'" [class.text-ink-3]="stepState('assigned') === 'pending'">
                {{ 'sell.conciergeTracker.timeline.assigned' | translate }}
              </div>
              @if (stepState('assigned') === 'active') {
                <span class="text-[10px] font-bold uppercase tracking-wider text-brand-700 bg-brand-50 px-2 py-0.5 rounded">
                  {{ 'sell.conciergeTracker.timeline.inProgress' | translate }}
                </span>
              }
            </div>
            @if (inspectorName) {
              <div class="text-[12px] text-muted">
                {{ 'sell.conciergeTracker.timeline.assignedSub' | translate: { name: inspectorName, time: ('sell.conciergeTracker.timeline.assignedSubFallback' | translate) } }}
              </div>
            }
          </div>
        </li>

        <!-- Step 3: inspection -->
        <li class="relative flex gap-4 pb-5" [class.opacity-60]="stepState('inspection') === 'pending'">
          @switch (stepState('inspection')) {
            @case ('done') {
              <span class="z-10 inline-grid h-8 w-8 place-items-center rounded-full bg-brand-700 text-white flex-shrink-0">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true"><path d="M5 13l4 4L19 7"/></svg>
              </span>
            }
            @case ('active') {
              <span class="z-10 inline-grid h-8 w-8 place-items-center rounded-full bg-brand-700 text-white flex-shrink-0 ring-4 ring-brand-100">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" class="animate-pulse" aria-hidden="true"><circle cx="12" cy="12" r="6"/></svg>
              </span>
            }
            @default {
              <span class="z-10 inline-grid h-8 w-8 place-items-center rounded-full bg-white border-2 border-line text-muted flex-shrink-0">
                <span class="text-[13px] font-bold">3</span>
              </span>
            }
          }
          <div class="flex-1 pt-1">
            <div class="text-[14px] font-bold" [class.text-ink]="stepState('inspection') !== 'pending'" [class.text-ink-3]="stepState('inspection') === 'pending'">
              {{ 'sell.conciergeTracker.timeline.inspection' | translate }}
            </div>
            @if (data?.customerPreference; as pref) {
              <div class="text-[12px] text-muted">
                {{ formatDate(pref.preferredDate) }} · {{ ('sell.concierge.status.window.' + pref.window) | translate }}
              </div>
            }
          </div>
        </li>

        <!-- Step 4: sign -->
        <li class="relative flex gap-4" [class.opacity-60]="stepState('sign') === 'pending'">
          @switch (stepState('sign')) {
            @case ('done') {
              <span class="z-10 inline-grid h-8 w-8 place-items-center rounded-full bg-brand-700 text-white flex-shrink-0">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true"><path d="M5 13l4 4L19 7"/></svg>
              </span>
            }
            @case ('active') {
              <span class="z-10 inline-grid h-8 w-8 place-items-center rounded-full bg-brand-700 text-white flex-shrink-0 ring-4 ring-brand-100">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" class="animate-pulse" aria-hidden="true"><circle cx="12" cy="12" r="6"/></svg>
              </span>
            }
            @default {
              <span class="z-10 inline-grid h-8 w-8 place-items-center rounded-full bg-white border-2 border-line text-muted flex-shrink-0">
                <span class="text-[13px] font-bold">4</span>
              </span>
            }
          }
          <div class="flex-1 pt-1">
            <div class="text-[14px] font-bold" [class.text-ink]="stepState('sign') !== 'pending'" [class.text-ink-3]="stepState('sign') === 'pending'">
              {{ 'sell.conciergeTracker.timeline.signOffer' | translate }}
            </div>
            <div class="text-[12px] text-muted">{{ 'sell.conciergeTracker.timeline.signOfferSub' | translate }}</div>
          </div>
        </li>
      </ol>

      @if (data?.signLinkAvailable) {
        <div class="mt-5 rounded-2xl bg-brand-50 px-4 py-3">
          <p class="text-[13px] font-semibold text-brand-800">
            {{ 'sell.concierge.status.signReady.title' | translate }}
          </p>
          <p class="mt-1 text-[12px] text-brand-700">
            {{ 'sell.concierge.status.signReady.sub' | translate }}
          </p>
        </div>
      }
    </div>
  `,
})
export class TrackerTimelineComponent {
  @Input({ required: true }) data!: ConciergeBookingStatus | null;
  @Input() inspectorName: string | null = null;
  @Input({ required: true }) formatDate!: (iso: string) => string;

  stepState(step: TrackerStep): StepState {
    const d = this.data;
    if (!d) return 'pending';
    const s: InspectionStatus = d.status;
    const assigned = d.inspectorAssigned;
    switch (step) {
      case 'assigned':
        if (s === 'in_progress' || s === 'awaiting_inspector_signoff' || s === 'awaiting_customer_signature' || s === 'signed_off') return 'done';
        return assigned ? 'active' : (s === 'draft' ? 'active' : 'pending');
      case 'inspection':
        if (s === 'awaiting_inspector_signoff' || s === 'awaiting_customer_signature' || s === 'signed_off') return 'done';
        if (s === 'in_progress') return 'active';
        return 'pending';
      case 'sign':
        if (s === 'signed_off') return 'done';
        if (s === 'awaiting_customer_signature') return 'active';
        return 'pending';
    }
  }
}
