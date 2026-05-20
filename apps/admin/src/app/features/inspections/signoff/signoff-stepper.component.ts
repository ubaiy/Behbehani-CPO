import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import type { InspectionKind, InspectionStatus } from '@behbehani-cpo/shared-types';

interface StepDef {
  idx: number;
  label: string;
  active: boolean;
  complete: boolean;
}

/**
 * Step indicator — 4 steps for Concierge, 3 for CPO.
 * Matches the progress-steps panel in mockup 03.
 */
@Component({
  selector: 'admin-signoff-stepper',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-white rounded-xl border border-slate-200 p-3 mb-5 overflow-x-auto">
      <div class="flex items-center gap-3 text-xs min-w-fit">
        @for (step of steps; track step.idx) {
          <div
            class="flex items-center gap-2 font-semibold"
            [class.text-brand-700]="step.active || step.complete"
            [class.text-slate-400]="!step.active && !step.complete"
            [class.font-medium]="!step.active && !step.complete"
          >
            <span
              class="w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0"
              [class.bg-brand-600]="step.active || step.complete"
              [class.text-white]="step.active || step.complete"
              [class.bg-slate-100]="!step.active && !step.complete"
              [class.text-slate-500]="!step.active && !step.complete"
            >{{ step.idx }}</span>
            {{ step.label }}
          </div>
          @if (!$last) {
            <div
              class="h-px flex-1 min-w-[24px]"
              [class.bg-brand-600]="step.complete"
              [class.bg-slate-200]="!step.complete"
            ></div>
          }
        }
      </div>
    </div>
  `,
})
export class SignoffStepperComponent {
  @Input({ required: true }) kind!: InspectionKind;
  @Input({ required: true }) status!: InspectionStatus;

  get steps(): StepDef[] {
    const isConcierge = this.kind === 'concierge';
    const s = this.status;
    // Step 1 is "active" only while we're literally still on the review page
    // (i.e. inspector hasn't signed yet). Once past that, it's complete-only.
    const onReview = s === 'in_progress' || s === 'awaiting_inspector_signoff';
    const base: StepDef[] = [
      { idx: 1, label: 'Review report', active: onReview, complete: true },
      {
        idx: 2,
        label: 'Inspector sign-off',
        active: s === 'awaiting_inspector_signoff',
        complete: s === 'awaiting_customer_signature' || s === 'signed_off',
      },
    ];
    if (isConcierge) {
      base.push({
        idx: 3,
        label: 'Customer signature',
        active: s === 'awaiting_customer_signature',
        complete: s === 'signed_off',
      });
    }
    base.push({
      idx: isConcierge ? 4 : 3,
      label: 'PDF generated',
      active: false,
      complete: s === 'signed_off',
    });
    return base;
  }
}
