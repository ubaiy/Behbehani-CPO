import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import type {
  InspectionItemResult,
  InspectionItemStatus,
  RubricItem,
} from '@behbehani-cpo/shared-types';
import {
  ITEM_STATUS_LABELS,
  ITEM_STATUS_OFF_CLASS,
  ITEM_STATUS_ON_CLASS,
} from '../shared/inspection-labels';

/**
 * Single rubric item row: PASS / ADVISORY / FAIL pills + optional notes/photos.
 *
 * Notes and photo upload are revealed only when status ∈ {advisory, fail} —
 * keeps the form lightweight when most items are PASS.
 *
 * Touch targets are ≥ 44 px so this works on tablets in the field
 * (per feedback_inspection_ux memory).
 */
@Component({
  selector: 'admin-inspection-item-row',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="px-4 sm:px-5 py-4" [class.bg-red-50\/40]="result?.status === 'fail'">
      <div class="flex items-start justify-between gap-3 flex-wrap">
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-slate-800">{{ item.labelEn }}</p>
          @if (item.hintEn) {
            <p class="text-xs text-slate-500 mt-0.5">{{ item.hintEn }}</p>
          }
        </div>
        <div class="inline-flex rounded-full border border-slate-200 bg-slate-50 p-0.5 flex-shrink-0">
          @for (status of STATUSES; track status) {
            <button
              type="button"
              [disabled]="readonly"
              [attr.aria-pressed]="result?.status === status"
              [attr.aria-label]="'Mark ' + ITEM_STATUS_LABELS[status]"
              class="inline-flex items-center justify-center gap-1 rounded-full min-h-[36px] px-3 text-[11px] font-semibold tracking-wide uppercase transition-all active:scale-[0.97] disabled:opacity-60 disabled:cursor-not-allowed"
              [ngClass]="result?.status === status ? ITEM_STATUS_ON_CLASS[status] : ITEM_STATUS_OFF_CLASS"
              (click)="onStatus(status)"
            >
              @switch (status) {
                @case ('pass') {
                  <svg class="w-3 h-3 shrink-0" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
                  </svg>
                }
                @case ('advisory') {
                  <svg class="w-3 h-3 shrink-0" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
                  </svg>
                }
                @case ('fail') {
                  <svg class="w-3 h-3 shrink-0" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12"/>
                  </svg>
                }
              }
              <span>{{ ITEM_STATUS_LABELS[status] }}</span>
            </button>
          }
        </div>
      </div>
      @if (!result?.status && !readonly) {
        <p class="text-xs text-slate-400 italic mt-2">Not yet scored.</p>
      }

      @if (result?.status === 'advisory' || result?.status === 'fail') {
        <div class="mt-3">
          <label class="block text-xs font-medium text-slate-600 mb-1">
            Notes
            @if (result?.status === 'fail') {
              <span class="text-slate-400">(required when FAIL)</span>
            }
          </label>
          <textarea
            rows="2"
            maxlength="280"
            [ngModel]="result?.notes ?? ''"
            (ngModelChange)="onNotes($event)"
            [disabled]="readonly"
            [placeholder]="result?.status === 'fail' ? 'Describe the failure — required.' : 'Add a note explaining the advisory…'"
            class="w-full text-sm rounded-md border px-3 py-2 focus:outline-none focus:ring-2 bg-white disabled:bg-slate-50 disabled:cursor-not-allowed"
            [class.border-red-300]="result?.status === 'fail'"
            [class.focus:ring-red-500]="result?.status === 'fail'"
            [class.border-slate-300]="result?.status !== 'fail'"
            [class.focus:ring-brand-500]="result?.status !== 'fail'"
          ></textarea>
          <p class="text-xs text-slate-400 mt-1 text-right">
            {{ (result?.notes?.length ?? 0) }} / 280 characters
          </p>
        </div>

        <div class="mt-3">
          <p class="text-xs font-medium text-slate-600 mb-1.5">
            Photo evidence
            <span class="text-slate-400">(optional · up to 3)</span>
          </p>
          <div class="flex items-center gap-2 flex-wrap">
            @for (key of result?.photoKeys ?? []; track key; let idx = $index) {
              <!-- overflow-visible so the remove button's touch area can extend beyond the thumbnail -->
              <div class="relative w-20 h-20 rounded-lg bg-slate-100 border border-slate-200 overflow-visible">
                <img [src]="photoUrlFor(key)" alt="evidence" class="w-full h-full object-cover rounded-lg" loading="lazy"/>
                @if (!readonly) {
                  <button
                    type="button"
                    class="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:bg-red-50 after:content-[''] after:absolute after:inset-[-11px]"
                    aria-label="Remove photo"
                    (click)="onRemovePhoto(idx)"
                  >
                    <svg class="w-3 h-3 text-slate-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                  </button>
                }
              </div>
            }
            @if (!readonly && (result?.photoKeys?.length ?? 0) < 3) {
              <label class="w-20 h-20 rounded-lg border-2 border-dashed border-slate-300 text-slate-400 hover:text-brand-600 hover:border-brand-400 flex flex-col items-center justify-center text-xs gap-1 cursor-pointer">
                @if (uploading) {
                  <svg class="animate-spin w-5 h-5 text-brand-600" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Uploading…
                } @else {
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/>
                  </svg>
                  Take / upload
                  <!-- capture="environment" opens the back camera on tablets/phones; desktop falls back to picker -->
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    class="sr-only"
                    (change)="onFileSelected($event)"
                  />
                }
              </label>
            }
          </div>
          @if (uploadError) {
            <p class="text-xs text-red-600 mt-1.5">{{ uploadError }}</p>
          }
        </div>
      }
    </div>
  `,
})
export class InspectionItemRowComponent {
  @Input({ required: true }) item!: RubricItem;
  @Input() result: InspectionItemResult | null = null;
  @Input() readonly = false;
  @Input() uploading = false;
  @Input() uploadError: string | null = null;

  @Output() statusChange = new EventEmitter<InspectionItemStatus>();
  @Output() notesChange = new EventEmitter<string>();
  @Output() photoPick = new EventEmitter<File>();
  @Output() photoRemove = new EventEmitter<number>();

  protected readonly STATUSES: InspectionItemStatus[] = ['pass', 'advisory', 'fail'];
  protected readonly ITEM_STATUS_LABELS = ITEM_STATUS_LABELS;
  protected readonly ITEM_STATUS_ON_CLASS = ITEM_STATUS_ON_CLASS;
  protected readonly ITEM_STATUS_OFF_CLASS = ITEM_STATUS_OFF_CLASS;

  protected onStatus(status: InspectionItemStatus): void {
    if (this.readonly) return;
    this.statusChange.emit(status);
  }

  protected onNotes(value: string): void {
    if (this.readonly) return;
    this.notesChange.emit(value);
  }

  protected onFileSelected(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.photoPick.emit(file);
  }

  protected onRemovePhoto(idx: number): void {
    if (this.readonly) return;
    this.photoRemove.emit(idx);
  }

  protected photoUrlFor(key: string): string {
    return key.startsWith('http') ? key : `/${key}`;
  }
}
