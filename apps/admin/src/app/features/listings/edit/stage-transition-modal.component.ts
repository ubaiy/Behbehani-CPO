import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
  signal,
  WritableSignal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import type { ListingStage } from '@behbehani-cpo/shared-types';
import { STAGE_LABELS, STAGE_CHIP_CLASS } from '../../../core/listing-stage.util';

/**
 * Confirmation modal for pipeline stage transitions.
 *
 * Usage:
 *   <admin-stage-transition-modal
 *     [from]="currentStage"
 *     [to]="targetStage"
 *     [open]="modalOpen"
 *     (confirm)="onConfirm($event)"
 *     (cancel)="onCancel()"
 *   />
 *
 * `open` accepts a WritableSignal<boolean> OR a plain boolean bound with
 * change-detection (the component calls showModal/close internally whenever
 * `open` flips via ngOnChanges).
 */
@Component({
  selector: 'admin-stage-transition-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <dialog
      #dialogRef
      class="rounded-xl border border-slate-200 shadow-xl backdrop:bg-slate-900/40 p-0 w-full max-w-md"
      (click)="onBackdropClick($event)"
      (keydown.escape)="onEscape()"
    >
      <div class="p-6">
        <!-- Header -->
        <h2 class="text-base font-semibold text-slate-800 mb-4">
          Move listing from
          <span
            class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ml-1 mr-1"
            [ngClass]="stageChipClass(from)"
          >{{ stageLabel(from) }}</span>
          to
          <span
            class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ml-1"
            [ngClass]="stageChipClass(to)"
          >{{ stageLabel(to) }}</span>?
        </h2>

        <!-- Stage arrow visualisation -->
        <div class="flex items-center gap-3 mb-5 p-3 bg-slate-50 rounded-lg border border-slate-100">
          <span
            class="inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold"
            [ngClass]="stageChipClass(from)"
          >{{ stageLabel(from) }}</span>
          <svg class="w-5 h-5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6"/>
          </svg>
          <span
            class="inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold"
            [ngClass]="stageChipClass(to)"
          >{{ stageLabel(to) }}</span>
        </div>

        <!-- Reason textarea (optional) -->
        <div class="mb-5">
          <label class="block text-xs font-medium text-slate-600 mb-1">
            Reason
            <span class="text-slate-400 font-normal ml-1">(optional)</span>
          </label>
          <textarea
            [(ngModel)]="reason"
            rows="3"
            maxlength="500"
            placeholder="Briefly describe why you are moving this listing to {{ stageLabel(to) }}…"
            class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white resize-none placeholder-slate-400"
          ></textarea>
          <p class="mt-1 text-xs text-slate-400 text-right">{{ reason.length }}/500</p>
        </div>

        <!-- Action buttons -->
        <div class="flex items-center justify-end gap-2.5">
          <button
            type="button"
            (click)="onCancel()"
            class="px-4 py-2 rounded-md text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-1"
          >
            Cancel
          </button>
          <button
            type="button"
            (click)="onConfirm()"
            class="px-4 py-2 rounded-md text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
          >
            Confirm transition
          </button>
        </div>
      </div>
    </dialog>
  `,
})
export class StageTransitionModalComponent implements OnChanges {
  @ViewChild('dialogRef') private readonly dialogRef!: ElementRef<HTMLDialogElement>;

  @Input({ required: true }) from!: ListingStage;
  @Input({ required: true }) to!: ListingStage;

  /**
   * Controls visibility. Accepts either:
   *   - a `WritableSignal<boolean>` (signal-based parent)
   *   - a plain boolean via property binding + `openChange` output (two-way)
   */
  @Input() open: WritableSignal<boolean> | boolean = false;
  @Output() openChange = new EventEmitter<boolean>();

  @Output() readonly confirm = new EventEmitter<{ reason: string | null }>();
  @Output() readonly cancel = new EventEmitter<void>();

  protected reason = '';

  readonly stageLabel = (s: ListingStage): string => STAGE_LABELS[s] ?? s;
  readonly stageChipClass = (s: ListingStage): string => STAGE_CHIP_CLASS[s] ?? '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] || changes['from'] || changes['to']) {
      const isOpen = this.resolveOpen();
      // Dialog may not be in the DOM on first change — defer to microtask.
      queueMicrotask(() => {
        const el = this.dialogRef?.nativeElement;
        if (!el) return;
        if (isOpen && !el.open) {
          this.reason = '';
          el.showModal();
        } else if (!isOpen && el.open) {
          el.close();
        }
      });
    }
  }

  protected onBackdropClick(event: MouseEvent): void {
    const el = this.dialogRef.nativeElement;
    const rect = el.getBoundingClientRect();
    const clickedOutside =
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom;
    if (clickedOutside) {
      this.onCancel();
    }
  }

  protected onEscape(): void {
    this.onCancel();
  }

  protected onCancel(): void {
    this.closeDialog();
    this.cancel.emit();
  }

  protected onConfirm(): void {
    this.closeDialog();
    this.confirm.emit({ reason: this.reason.trim() || null });
  }

  private closeDialog(): void {
    const el = this.dialogRef?.nativeElement;
    if (el?.open) el.close();
    // Update whichever binding style the parent used.
    if (typeof this.open === 'function') {
      (this.open as WritableSignal<boolean>).set(false);
    } else {
      this.openChange.emit(false);
    }
  }

  private resolveOpen(): boolean {
    if (typeof this.open === 'function') {
      return (this.open as WritableSignal<boolean>)();
    }
    return !!this.open;
  }
}
