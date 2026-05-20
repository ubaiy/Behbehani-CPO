import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { CustomerSignatureMethod } from '@behbehani-cpo/shared-types';
import { SignaturePadComponent } from './signature-pad.component';

/**
 * Customer-signature section for Concierge inspections.
 * Toggles between "in-person" (signature pad) and "send signing link".
 * Matches the signature method grid in mockup 03.
 */
@Component({
  selector: 'admin-customer-signature-mode',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, SignaturePadComponent],
  template: `
    <!-- Method selection cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">

      <!-- Option A: In-person -->
      <label
        class="relative rounded-lg border-2 p-4 cursor-pointer min-h-[44px] transition-colors"
        [class.border-brand-600]="method === 'in_person'"
        [class.bg-brand-50/40]="method === 'in_person'"
        [class.border-slate-200]="method !== 'in_person'"
        [class.bg-white]="method !== 'in_person'"
        [class.hover:border-slate-300]="method !== 'in_person'"
      >
        <div class="flex items-start gap-3">
          <input
            type="radio"
            name="sig-method"
            class="mt-1 text-brand-600 focus:ring-brand-500"
            value="in_person"
            [checked]="method === 'in_person'"
            (change)="methodChange.emit('in_person')"
          />
          <div class="flex-1">
            <p class="text-sm font-semibold text-slate-800 mb-1">📍 Customer is here now</p>
            <p class="text-xs text-slate-600">Hand them the tablet. The signature pad will appear below.</p>
            <p class="text-xs text-slate-500 mt-2">Default for Concierge — inspector is at the customer's location.</p>
          </div>
        </div>
      </label>

      <!-- Option B: Remote link -->
      <label
        class="relative rounded-lg border-2 p-4 cursor-pointer min-h-[44px] transition-colors"
        [class.border-brand-600]="method === 'remote_link'"
        [class.bg-brand-50/40]="method === 'remote_link'"
        [class.border-slate-200]="method !== 'remote_link'"
        [class.bg-white]="method !== 'remote_link'"
        [class.hover:border-slate-300]="method !== 'remote_link'"
      >
        <div class="flex items-start gap-3">
          <input
            type="radio"
            name="sig-method"
            class="mt-1 text-brand-600 focus:ring-brand-500"
            value="remote_link"
            [checked]="method === 'remote_link'"
            (change)="methodChange.emit('remote_link')"
          />
          <div class="flex-1">
            <p class="text-sm font-semibold text-slate-800 mb-1">✉ Send signing link</p>
            <p class="text-xs text-slate-600">Generates a secure link sent via SMS + email. Valid for 7 days.</p>
            <p class="text-xs text-slate-500 mt-2">Use when the customer wasn't available or wants more review time.</p>
          </div>
        </div>
      </label>

    </div>

    <!-- In-person: signature pad section -->
    @if (method === 'in_person') {
      <div class="border-t border-slate-100 pt-5">

        @if (customerName) {
          <div class="flex items-start gap-3 mb-3 p-3 rounded-md bg-slate-50 border border-slate-200">
            <div class="w-9 h-9 rounded-full bg-slate-300 flex items-center justify-center flex-shrink-0">
              <span class="text-xs font-bold text-white">{{ initials(customerName) }}</span>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-slate-800">{{ customerName }}</p>
              @if (customerMobile) {
                <p class="text-xs text-slate-500 font-mono">{{ customerMobile }}</p>
              }
            </div>
            <span class="text-xs text-brand-700 font-semibold hidden md:inline">Hand the tablet to this person</span>
          </div>
        }

        <!-- Drawn signature pad -->
        <p class="text-xs font-medium text-slate-600 mb-1.5">Signature (draw with finger / pen)</p>
        <admin-signature-pad (signatureChange)="signatureChange.emit($event)" />
        <p class="text-xs text-slate-400 mb-3 mt-1.5">Drawn signature stored as inline SVG path on the inspection record.</p>

        <!-- Typed name + Civil ID -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <div>
            <label class="block text-xs font-medium text-slate-600 mb-1">Type your full name (matches Civil ID)</label>
            <input
              type="text"
              [ngModel]="typedName"
              (ngModelChange)="typedNameChange.emit($event)"
              maxlength="200"
              class="w-full text-sm rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 min-h-[44px]"
              placeholder="Full legal name"
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-600 mb-1">Civil ID / Passport last 4 digits (optional)</label>
            <input
              type="text"
              [ngModel]="civilIdLast4"
              (ngModelChange)="civilIdLast4Change.emit($event)"
              maxlength="4"
              inputmode="numeric"
              class="w-full text-sm rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono min-h-[44px]"
              placeholder="0421"
            />
          </div>
        </div>

        <!-- Customer acknowledgement checkboxes -->
        <div class="space-y-2 mb-4">
          <label class="flex items-start gap-2 cursor-pointer min-h-[44px]">
            <input
              type="checkbox"
              class="mt-1 rounded border-slate-300 text-brand-600 focus:ring-brand-500 w-4 h-4"
              [ngModel]="ackOwner"
              (ngModelChange)="ackOwnerChange.emit($event)"
            />
            <span class="text-sm text-slate-700">I confirm I am the owner of this vehicle (or am authorized to represent the owner).</span>
          </label>
          <label class="flex items-start gap-2 cursor-pointer min-h-[44px]">
            <input
              type="checkbox"
              class="mt-1 rounded border-slate-300 text-brand-600 focus:ring-brand-500 w-4 h-4"
              [ngModel]="ackAccurate"
              (ngModelChange)="ackAccurateChange.emit($event)"
            />
            <span class="text-sm text-slate-700">I have reviewed the inspection findings above and acknowledge them as accurate.</span>
          </label>
          <label class="flex items-start gap-2 cursor-pointer min-h-[44px]">
            <input
              type="checkbox"
              class="mt-1 rounded border-slate-300 text-brand-600 focus:ring-brand-500 w-4 h-4"
              [ngModel]="ackUseForOffer"
              (ngModelChange)="ackUseForOfferChange.emit($event)"
            />
            <span class="text-sm text-slate-700">I understand this signed report will be used by Behbehani to formulate a purchase offer for my vehicle.</span>
          </label>
        </div>
      </div>
    }
  `,
})
export class CustomerSignatureModeComponent {
  @Input({ required: true }) method!: CustomerSignatureMethod;
  @Input() customerName = '';
  @Input() customerMobile: string | null = null;
  @Input() typedName = '';
  @Input() civilIdLast4 = '';
  @Input() ackOwner = false;
  @Input() ackAccurate = false;
  @Input() ackUseForOffer = false;

  @Output() methodChange = new EventEmitter<CustomerSignatureMethod>();
  @Output() signatureChange = new EventEmitter<string>();
  @Output() typedNameChange = new EventEmitter<string>();
  @Output() civilIdLast4Change = new EventEmitter<string>();
  @Output() ackOwnerChange = new EventEmitter<boolean>();
  @Output() ackAccurateChange = new EventEmitter<boolean>();
  @Output() ackUseForOfferChange = new EventEmitter<boolean>();

  protected initials(name: string): string {
    return name.split(' ').slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('');
  }
}
