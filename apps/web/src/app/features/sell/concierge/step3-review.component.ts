import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

/**
 * Step 3 body — "Review". Read-only summaries + per-section edit links.
 * Emits `(edit)` with the target step number so parent can jump back.
 */
@Component({
  selector: 'app-concierge-step3-review',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, TranslateModule],
  template: `
    <!-- Promise block -->
    <div class="rounded-2xl border border-brand-200 bg-brand-50 p-4 mb-5 flex items-start gap-3">
      <span class="inline-grid h-9 w-9 place-items-center rounded-full bg-brand-700 text-white flex-shrink-0">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M5 13l4 4L19 7"/></svg>
      </span>
      <div>
        <p class="text-[13px] font-semibold text-brand-900">{{ 'sell.concierge.reviewStep.promiseHeader' | translate }}</p>
        <ul class="mt-1 text-[12px] text-brand-800 space-y-0.5 list-disc pl-5">
          <li>{{ 'sell.concierge.reviewStep.promise1' | translate }}</li>
          <li>{{ 'sell.concierge.reviewStep.promise2' | translate }}</li>
          <li>{{ 'sell.concierge.reviewStep.promise3' | translate }}</li>
        </ul>
      </div>
    </div>

    <!-- Review cards -->
    <div class="space-y-3">
      <!-- Vehicle -->
      <div class="rounded-2xl border border-line bg-white p-4 flex items-center justify-between">
        <div class="flex items-center gap-3 min-w-0">
          <span class="inline-grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 16l1.5-4h11L19 16M5 16h14v3H5zM7 19v2M17 19v2"/></svg>
          </span>
          <div class="min-w-0">
            <div class="text-[11px] font-semibold uppercase tracking-wide text-muted">{{ 'sell.concierge.reviewStep.vehicleSection' | translate }}</div>
            <div class="text-[14px] font-semibold text-ink truncate">{{ vehicleText() }}</div>
          </div>
        </div>
        <a [routerLink]="['/', locale(), 'sell', 'details']" class="text-[12px] font-semibold text-brand-700 hover:text-brand-800">{{ 'sell.concierge.reviewStep.edit' | translate }}</a>
      </div>

      <!-- Location -->
      <div class="rounded-2xl border border-line bg-white p-4 flex items-center justify-between">
        <div class="flex items-center gap-3 min-w-0">
          <span class="inline-grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z"/></svg>
          </span>
          <div class="min-w-0">
            <div class="text-[11px] font-semibold uppercase tracking-wide text-muted">{{ 'sell.concierge.reviewStep.locationSection' | translate }}</div>
            <div class="text-[14px] font-semibold text-ink truncate">{{ locationText() }}</div>
          </div>
        </div>
        <button type="button" (click)="edit.emit(1)" class="text-[12px] font-semibold text-brand-700 hover:text-brand-800">{{ 'sell.concierge.reviewStep.edit' | translate }}</button>
      </div>

      <!-- Schedule -->
      <div class="rounded-2xl border border-line bg-white p-4 flex items-center justify-between">
        <div class="flex items-center gap-3 min-w-0">
          <span class="inline-grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/></svg>
          </span>
          <div class="min-w-0">
            <div class="text-[11px] font-semibold uppercase tracking-wide text-muted">{{ 'sell.concierge.reviewStep.whenSection' | translate }}</div>
            <div class="text-[14px] font-semibold text-ink truncate">{{ whenText() }}</div>
          </div>
        </div>
        <button type="button" (click)="edit.emit(1)" class="text-[12px] font-semibold text-brand-700 hover:text-brand-800">{{ 'sell.concierge.reviewStep.edit' | translate }}</button>
      </div>

      <!-- Contact -->
      <div class="rounded-2xl border border-line bg-white p-4 flex items-center justify-between">
        <div class="flex items-center gap-3 min-w-0">
          <span class="inline-grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.12.96.34 1.9.66 2.81a2 2 0 01-.45 2.11L8 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.91.32 1.85.54 2.81.66A2 2 0 0122 16.92z"/></svg>
          </span>
          <div class="min-w-0">
            <div class="text-[11px] font-semibold uppercase tracking-wide text-muted">{{ 'sell.concierge.reviewStep.contactSection' | translate }}</div>
            <div class="text-[14px] font-semibold text-ink truncate">{{ contactText() }}</div>
          </div>
        </div>
        <button type="button" (click)="edit.emit(2)" class="text-[12px] font-semibold text-brand-700 hover:text-brand-800">{{ 'sell.concierge.reviewStep.edit' | translate }}</button>
      </div>
    </div>
  `,
})
export class ConciergeStep3ReviewComponent {
  readonly vehicleText = input<string>('');
  readonly locationText = input<string>('');
  readonly whenText = input<string>('');
  readonly contactText = input<string>('');
  readonly locale = input<'en' | 'ar'>('en');

  readonly edit = output<1 | 2>();
}
