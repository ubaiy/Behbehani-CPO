import {
  ChangeDetectionStrategy,
  Component,
  PLATFORM_ID,
  inject,
  input,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { environment } from '../../../environments/environment';
import { VdpLeadCallbackModalComponent } from './vdp-lead-callback-modal.component';

/**
 * v1.5-D17a — Lead-capture CTA row for the VDP.
 *
 * Renders TWO secondary buttons under the sticky pricing card's Reserve CTA:
 *
 *   1. "Request Callback" — opens `<app-vdp-lead-callback-modal>`.
 *   2. "Chat on WhatsApp" — fires `POST /v1/public/leads` (source: `vdp`,
 *      message prefixed `[vdp_whatsapp]`) BEFORE opening `wa.me`, so the
 *      admin sees the intent even if the customer never actually sends
 *      the message in WhatsApp.
 *
 * Pure presentational — takes listing identifiers as inputs.
 */
@Component({
  selector: 'app-vdp-lead-actions',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule, VdpLeadCallbackModalComponent],
  template: `
    <div class="grid grid-cols-2 gap-2">
      <button
        type="button"
        (click)="openCallback()"
        class="inline-flex items-center justify-center gap-1.5 rounded-pill border border-line-2 bg-white px-3 py-2.5 text-[13px] font-semibold text-ink shadow-brand-sm hover:border-brand-700 hover:text-brand-700 min-h-[44px]"
      >
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.8a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.35 1.84.59 2.8.72A2 2 0 0 1 22 16.92Z"/>
        </svg>
        <span class="truncate">{{ 'vdp.leads.callbackCta' | translate }}</span>
      </button>

      <button
        type="button"
        (click)="openWhatsAppGate()"
        class="inline-flex items-center justify-center gap-1.5 rounded-pill border border-brand-700 bg-brand-700 px-3 py-2.5 text-[13px] font-semibold text-white shadow-brand-sm hover:bg-brand-800 min-h-[44px]"
      >
        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
          <path d="M20.52 3.48A12 12 0 0 0 3.48 20.52L2 22l1.55-1.45A12 12 0 1 0 20.52 3.48Zm-8.52 18a9.94 9.94 0 0 1-5.07-1.39l-.36-.21-3.04.82.82-2.96-.24-.38A10 10 0 1 1 12 21.48ZM17.4 14.4c-.3-.15-1.76-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.34.22-.64.07-.3-.15-1.26-.46-2.4-1.49-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.34.45-.51.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51l-.57-.01c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.49 0 1.47 1.07 2.88 1.22 3.08.15.2 2.1 3.21 5.1 4.5.71.31 1.27.49 1.7.63.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2-1.41.25-.69.25-1.28.17-1.41-.07-.13-.27-.2-.57-.35Z"/>
        </svg>
        <span class="truncate">{{ 'vdp.leads.whatsappCta' | translate }}</span>
      </button>
    </div>

    <!-- v1.5-D18a — Two modal instances driven by separate signals. The
         shared component switches its form via the [mode] input. -->
    <app-vdp-lead-callback-modal
      [open]="callbackOpen()"
      [listingId]="listingId()"
      mode="callback"
      (closed)="closeCallback()"
    />
    <app-vdp-lead-callback-modal
      [open]="whatsappOpen()"
      [listingId]="listingId()"
      mode="whatsapp"
      (closed)="closeWhatsAppGate()"
      (submitted)="onWhatsAppGateSubmitted()"
    />
  `,
})
export class VdpLeadActionsComponent {
  /** UUID of the listing being viewed — attached to both lead records. */
  readonly listingId = input<string | undefined>(undefined);
  /** Display strings for the WhatsApp deep-link message. */
  readonly year = input<number | string>('');
  readonly makeName = input<string>('');
  readonly modelName = input<string>('');
  readonly stockNumber = input<string | undefined>(undefined);

  readonly callbackOpen = signal(false);
  readonly whatsappOpen = signal(false);

  private readonly translate = inject(TranslateService);
  private readonly platformId = inject(PLATFORM_ID);

  openCallback(): void {
    this.callbackOpen.set(true);
  }

  closeCallback(): void {
    this.callbackOpen.set(false);
  }

  /** v1.5-D18a — Open the shared lead-modal in `whatsapp` mode. The user
   *  enters name + phone; on successful POST the modal fires `submitted`
   *  and we hand off to wa.me below. Placeholder values are gone. */
  openWhatsAppGate(): void {
    this.whatsappOpen.set(true);
  }

  closeWhatsAppGate(): void {
    this.whatsappOpen.set(false);
  }

  onWhatsAppGateSubmitted(): void {
    this.whatsappOpen.set(false);
    this.openWhatsApp();
  }

  private openWhatsApp(): void {
    if (typeof window === 'undefined') return;

    const prefix = this.translate.instant('vdp.leads.whatsappPrefix');
    const stock  = this.stockNumber() ? ` (${this.stockNumber()})` : '';
    const url    = window.location.href;
    const desc   = `${this.year()} ${this.makeName()} ${this.modelName()}`.trim();
    const text   = `${prefix} ${desc}${stock} — ${url}`;

    const phone = environment.dealerPhoneE164.replace(/[^\d]/g, '');
    const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  }
}
