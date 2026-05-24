import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

export interface InspectorInfo {
  fullName: string;
  initials: string;
  firstName: string;
  rating: string;
  completedCount: number;
  whatsappE164: string;
  callE164: string;
}

/**
 * "Your inspector" card for the concierge tracker (v2 redesign).
 *
 * Pure presentational. Brand-lock note: WhatsApp button uses brand-700 (not
 * emerald-500 from the source mockup); rating star is filled brand-700 (not
 * amber/yellow). Per memory `feedback_match_mockup_fidelity.md` we ALSO
 * preserve layout fidelity — avatar gradient, two-button row, exact spacing.
 */
@Component({
  selector: 'app-tracker-inspector-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, TranslateModule],
  template: `
    @if (inspector) {
      <div class="rounded-3xl border border-line bg-white p-5 shadow-brand-sm">
        <div class="text-[11px] font-semibold uppercase tracking-wider text-muted">
          {{ 'sell.conciergeTracker.inspector.title' | translate }}
        </div>
        <div class="mt-3 flex items-center gap-4">
          <div
            class="h-14 w-14 rounded-full bg-gradient-to-br from-brand-200 to-brand-400 flex-shrink-0 grid place-items-center text-white font-display font-bold text-[20px]"
            aria-hidden="true"
          >
            {{ inspector.initials }}
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-[15px] font-bold text-ink">{{ inspector.fullName }}</div>
            <div class="flex flex-wrap items-center gap-2 text-[12px] text-muted mt-0.5">
              <span class="inline-flex items-center gap-0.5">
                <svg viewBox="0 0 20 20" width="12" height="12" fill="currentColor" class="text-brand-700" aria-hidden="true">
                  <path d="M10 1l2.6 5.6 6.4.9-4.5 4.5 1.1 6.4L10 15.4l-5.6 3 1.1-6.4L1 7.5l6.4-.9L10 1z"/>
                </svg>
                {{ inspector.rating }}
              </span>
              <span aria-hidden="true">·</span>
              <span>{{ 'sell.conciergeTracker.inspector.completed' | translate: { count: inspector.completedCount } }}</span>
            </div>
          </div>
        </div>
        <div class="mt-4 grid grid-cols-2 gap-2">
          <a
            [href]="whatsappHref(inspector.whatsappE164)"
            target="_blank"
            rel="noopener"
            class="inline-flex items-center justify-center gap-2 rounded-pill bg-brand-700 px-4 py-2.5 text-[13px] font-bold text-white hover:bg-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
              <path d="M17.5 14.4c-.3-.1-1.7-.8-2-1-.3-.1-.5-.1-.7.1-.2.3-.8 1-1 1.2-.2.2-.4.2-.7.1-.3-.1-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6.1-.1.3-.4.4-.5.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5-.1-.1-.7-1.6-.9-2.2-.2-.5-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5 1.8.7 2.5.8 3.4.7.5-.1 1.7-.7 1.9-1.3.2-.7.2-1.2.2-1.3-.1-.2-.2-.2-.5-.3z"/>
              <path d="M12 2C6.5 2 2 6.5 2 12c0 1.8.5 3.5 1.3 4.9L2 22l5.2-1.4c1.3.7 2.9 1.1 4.8 1.1 5.5 0 10-4.5 10-10S17.5 2 12 2zm0 18c-1.7 0-3.2-.5-4.5-1.3l-.3-.2-3.2.9.8-3.1-.2-.3C3.8 14.7 3 13.4 3 12c0-5 4-9 9-9s9 4 9 9-4 9-9 9z"/>
            </svg>
            {{ 'sell.conciergeTracker.inspector.whatsapp' | translate: { firstName: inspector.firstName } }}
          </a>
          <a
            [href]="'tel:' + inspector.callE164"
            class="inline-flex items-center justify-center gap-2 rounded-pill bg-white border border-line px-4 py-2.5 text-[13px] font-bold text-ink hover:bg-surface-cool focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.12.96.34 1.9.66 2.81a2 2 0 01-.45 2.11L8 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.91.32 1.85.54 2.81.66A2 2 0 0122 16.92z"/>
            </svg>
            {{ 'sell.conciergeTracker.inspector.call' | translate }}
          </a>
        </div>
      </div>
    }
  `,
})
export class TrackerInspectorCardComponent {
  @Input() inspector: InspectorInfo | null = null;

  whatsappHref(e164: string): string {
    return `https://wa.me/${e164.replace(/^\+/, '')}`;
  }
}
