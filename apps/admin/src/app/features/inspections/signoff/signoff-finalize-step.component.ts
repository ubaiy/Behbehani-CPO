import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

/**
 * Concierge "Type SIGN OFF" finalize step, extracted from inspection-signoff
 * to keep the parent under 500 lines. Handles only the Concierge kind;
 * CPO kind uses the modal approach instead.
 */
@Component({
  selector: 'admin-signoff-finalize-step',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="bg-white rounded-xl border border-slate-200 p-5">
      <p class="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
        <span class="w-6 h-6 rounded-full bg-brand-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">4</span>
        Finalize report
      </p>
      <div class="mb-4">
        <label class="block text-xs font-medium text-slate-600 mb-1">
          Type <code class="font-mono bg-slate-100 px-1.5 py-0.5 rounded">{{ confirmToken }}</code> to confirm both signatures
        </label>
        <input type="text"
          [ngModel]="confirmText"
          (ngModelChange)="confirmTextChange.emit($event)"
          placeholder="SIGN OFF"
          autocomplete="off"
          class="w-full max-w-sm text-sm rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 min-h-[44px]"/>
      </div>
      @if (validationMessage) {
        <p class="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2 mb-4">{{ validationMessage }}</p>
      }
      <div class="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 flex-wrap">
        <a routerLink=".." class="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 min-h-[44px] inline-flex items-center">Cancel</a>
        <button type="button"
          class="rounded-md px-4 py-1.5 text-sm font-semibold min-h-[44px] transition-colors"
          [ngClass]="canSubmit ? 'bg-brand-600 text-white hover:bg-brand-700' : 'bg-slate-100 text-slate-400 cursor-not-allowed'"
          [disabled]="!canSubmit || busy"
          (click)="submitClick.emit()"
        >@if (busy) { Submitting… } @else { {{ submitLabel }} }</button>
      </div>
    </div>
  `,
})
export class SignoffFinalizeStepComponent {
  @Input({ required: true }) confirmToken!: string;
  @Input({ required: true }) confirmText!: string;
  @Input() validationMessage: string | null = null;
  @Input() canSubmit = false;
  @Input() busy = false;
  @Input() submitLabel = 'Sign off & generate PDF';

  @Output() confirmTextChange = new EventEmitter<string>();
  @Output() submitClick = new EventEmitter<void>();
}
