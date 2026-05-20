import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface CpoSignoffModalDetail {
  vehicleLabel: string;
  bookingRef: string;
  overallScore: number | null;
  inspectorName: string | null;
}

export interface CpoSignoffConfirmPayload {
  advanceToPhotoshoot: boolean;
}

/**
 * CPO sign-off confirmation modal (§16 D10 / DQ5).
 *
 * Replaces the "Type SIGN OFF" text gate for CPO inspections only.
 * For Concierge inspections the existing text-gate flow is unchanged.
 *
 * Design matches admin-cpo-signoff-confirm.html mockup.
 *
 * Usage in parent:
 *   @if (showCpoModal()) {
 *     <admin-cpo-signoff-confirm-modal
 *       [open]="showCpoModal()"
 *       [detail]="cpoModalDetail()"
 *       (confirm)="onCpoModalConfirm($event)"
 *       (cancel)="showCpoModal.set(false)"
 *     />
 *   }
 */
@Component({
  selector: 'admin-cpo-signoff-confirm-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    @if (open) {
      <!-- Backdrop -->
      <div
        class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40"
        aria-hidden="true"
        (click)="onCancel()"
      ></div>

      <!-- Modal dialog -->
      <div
        role="dialog"
        aria-modal="true"
        [attr.aria-labelledby]="'cpo-modal-title'"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div class="bg-white rounded-2xl shadow-xl w-full max-w-md mx-auto">

          <!-- Modal header -->
          <div class="px-6 pt-6 pb-4 border-b border-slate-100">
            <div class="flex items-start gap-3">
              <!-- Shield / check icon -->
              <div class="w-10 h-10 rounded-full bg-brand-50 border border-brand-200 flex items-center justify-center flex-shrink-0">
                <svg class="w-5 h-5 text-brand-700" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"/>
                </svg>
              </div>
              <div>
                <h2 id="cpo-modal-title" class="text-base font-semibold text-slate-800">Sign off + advance listing?</h2>
                @if (detail) {
                  <p class="text-xs text-slate-500 mt-0.5 font-mono">{{ detail.bookingRef }} · {{ detail.vehicleLabel }}</p>
                }
              </div>
            </div>
          </div>

          <!-- Modal body -->
          <div class="px-6 py-5 space-y-4">

            <!-- What sign-off means -->
            <div class="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 leading-relaxed space-y-1.5">
              <p><strong class="text-slate-800">Signing off</strong> locks the inspection report — no further edits are possible. The system will:</p>
              <ul class="list-disc list-inside space-y-0.5 pl-1 text-slate-500">
                <li>Generate and attach the CPO inspection PDF to the listing</li>
                <li>Mark the report as <span class="font-medium text-slate-700">Signed off</span></li>
                <li>Optionally advance the listing stage to <code class="font-mono text-slate-700">photoshoot</code> (see below)</li>
              </ul>
              <p class="text-slate-500">Corrections after sign-off require a new inspection report. This action cannot be undone.</p>
            </div>

            <!-- Auto-advance checkbox — pre-checked (common path) -->
            <label class="flex items-start gap-3 cursor-pointer p-3 rounded-lg border border-slate-200 hover:bg-brand-50 hover:border-brand-200 transition-colors min-h-[44px]">
              <input
                type="checkbox"
                id="auto-advance"
                class="mt-1 rounded border-slate-300 text-brand-600 focus:ring-brand-500 w-4 h-4 flex-shrink-0"
                [ngModel]="advanceToPhotoshoot()"
                (ngModelChange)="advanceToPhotoshoot.set($event)"
              />
              <div>
                <p class="text-sm font-medium text-slate-800">
                  Move listing to <code class="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-xs text-brand-800">photoshoot</code> stage
                </p>
                <p class="text-xs text-slate-500 mt-0.5">
                  The listing is currently in <code class="font-mono text-xs bg-slate-100 px-1 py-0.5 rounded">inspection</code> stage.
                  Advancing to <code class="font-mono text-xs bg-slate-100 px-1 py-0.5 rounded">photoshoot</code> notifies the photography team.
                </p>
                <p class="text-xs text-slate-400 mt-1 italic">Uncheck if you need to review the listing before advancing.</p>
              </div>
            </label>

            <!-- Summary chip -->
            @if (detail) {
              <div class="flex items-center gap-2 text-xs text-slate-500 px-1">
                <svg class="w-4 h-4 text-brand-600 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                @if (detail.inspectorName) {
                  <span>Inspector: <strong class="text-slate-700">{{ detail.inspectorName }}</strong></span>
                  <span class="text-slate-300">·</span>
                }
                @if (detail.overallScore !== null) {
                  <span>Score: <strong class="text-brand-700">{{ detail.overallScore }}/100</strong></span>
                }
              </div>
            }
          </div>

          <!-- Modal footer -->
          <div class="px-6 pb-6 pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              class="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 min-h-[44px] transition-colors"
              (click)="onCancel()"
            >Cancel</button>
            <button
              type="button"
              class="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 active:scale-[0.98] min-h-[44px] shadow-sm transition-all"
              (click)="onConfirm()"
            >Confirm sign-off</button>
          </div>

        </div>
      </div>
    }
  `,
})
export class CpoSignoffConfirmModalComponent implements OnChanges {
  @Input() open = false;
  @Input() detail: CpoSignoffModalDetail | null = null;

  @Output() confirm = new EventEmitter<CpoSignoffConfirmPayload>();
  @Output() cancel = new EventEmitter<void>();

  protected readonly advanceToPhotoshoot = signal<boolean>(true);

  ngOnChanges(): void {
    // Reset to pre-checked default each time modal opens
    if (this.open) {
      this.advanceToPhotoshoot.set(true);
    }
  }

  protected onConfirm(): void {
    this.confirm.emit({ advanceToPhotoshoot: this.advanceToPhotoshoot() });
  }

  protected onCancel(): void {
    this.cancel.emit();
  }
}
