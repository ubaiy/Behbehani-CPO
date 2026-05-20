import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { OfferSummaryDto } from '@behbehani-cpo/shared-types';

function formatTs(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function formatKwd(fils: number): string {
  return `KD ${(fils / 1000).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 3 })}`;
}

interface TimelineEntry {
  id: string;
  kind: 'offer_sent' | 'customer_countered' | 'admin_declined' | 'admin_accepted' | 'admin_countered' | 'expired' | 'withdrawn' | 'drafted';
  label: string;
  subLabel: string | null;
  ts: string;
  isCurrent: boolean;
  dotClass: string;
}

@Component({
  selector: 'admin-offer-timeline',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  styles: [`
    .timeline-item:not(:last-child)::before {
      content: '';
      position: absolute;
      left: 7px;
      top: 20px;
      bottom: -8px;
      width: 2px;
      background: #bfdbfe;
    }
  `],
  template: `
    <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <p class="text-sm font-semibold text-slate-700 mb-4">Offer history</p>
      <ol class="space-y-0 pl-0">
        @for (entry of entries; track entry.id; let last = $last) {
          <li class="relative pl-7 pb-6 timeline-item" [class.pb-0]="last">
            <div class="absolute left-0 top-1.5 w-4 h-4 rounded-full border-2 border-white ring-2 flex-shrink-0"
              [ngClass]="entry.dotClass"
              [class.animate-pulse]="entry.isCurrent"></div>
            <div>
              <div class="flex items-center gap-2 flex-wrap">
                <p class="text-sm font-semibold"
                  [class.text-brand-700]="entry.isCurrent"
                  [class.text-slate-800]="!entry.isCurrent">{{ entry.label }}</p>
                <span class="text-xs text-slate-400">{{ formatTs(entry.ts) }}</span>
                @if (entry.isCurrent) {
                  <span class="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold bg-brand-100 text-brand-800 uppercase tracking-wide">Current</span>
                }
              </div>
              @if (entry.subLabel) {
                <p class="text-xs mt-0.5 italic"
                  [class.text-brand-700]="entry.isCurrent"
                  [class.text-slate-500]="!entry.isCurrent">{{ entry.subLabel }}</p>
              }
            </div>
          </li>
        }
      </ol>
    </div>
  `,
})
export class OfferTimelineComponent {
  protected formatTs = formatTs;

  private _chain: OfferSummaryDto[] = [];
  private _current: OfferSummaryDto | null = null;

  entries: TimelineEntry[] = [];

  @Input({ required: true })
  set chain(value: OfferSummaryDto[]) {
    this._chain = value;
    this.buildEntries();
  }

  @Input({ required: true })
  set current(value: OfferSummaryDto | null) {
    this._current = value;
    this.buildEntries();
  }

  private buildEntries(): void {
    const entries: TimelineEntry[] = [];
    const all = [...this._chain];
    if (this._current && !all.find((o) => o.id === this._current!.id)) {
      all.push(this._current);
    }
    // Sort oldest-first
    all.sort((a, b) => a.createdAt.localeCompare(b.createdAt));

    for (const offer of all) {
      const isCurrentOffer = offer.id === this._current?.id;
      const round = all.indexOf(offer) + 1;

      // Sent/created entry
      entries.push({
        id: `${offer.id}-sent`,
        kind: offer.status === 'drafted' ? 'drafted' : 'offer_sent',
        label: offer.status === 'drafted'
          ? `Offer #${round} drafted at ${formatKwd(offer.offerAmountFils)}`
          : `Offer #${round} issued at ${formatKwd(offer.offerAmountFils)}`,
        subLabel: null,
        ts: offer.createdAt,
        isCurrent: isCurrentOffer && (offer.status === 'sent' || offer.status === 'drafted'),
        dotClass: 'bg-brand-600 ring-brand-200',
      });

      // Customer counter
      if (
        (offer.status === 'countered_by_customer' || offer.status === 'countered_by_admin') &&
        offer.counterAmountFils !== null
      ) {
        entries.push({
          id: `${offer.id}-counter`,
          kind: 'customer_countered',
          label: `Customer countered at ${formatKwd(offer.counterAmountFils)}`,
          subLabel: null,
          ts: offer.respondedAt ?? offer.createdAt,
          isCurrent: isCurrentOffer && offer.status === 'countered_by_customer',
          dotClass: isCurrentOffer && offer.status === 'countered_by_customer'
            ? 'bg-brand-500 ring-brand-300'
            : 'bg-slate-300 ring-slate-100',
        });
      }

      // Admin counter
      if (offer.status === 'countered_by_admin' && (offer as OfferSummaryDto & { adminCounterAmountFils?: number | null }).adminCounterAmountFils) {
        const adminFils = (offer as OfferSummaryDto & { adminCounterAmountFils?: number | null }).adminCounterAmountFils!;
        entries.push({
          id: `${offer.id}-admin-counter`,
          kind: 'admin_countered',
          label: `Admin countered at ${formatKwd(adminFils)}`,
          subLabel: null,
          ts: offer.createdAt,
          isCurrent: isCurrentOffer && offer.status === 'countered_by_admin',
          dotClass: isCurrentOffer && offer.status === 'countered_by_admin'
            ? 'bg-brand-500 ring-brand-300'
            : 'bg-brand-400 ring-brand-100',
        });
      }

      // Terminal states
      if (offer.status === 'declined') {
        entries.push({
          id: `${offer.id}-declined`,
          kind: 'admin_declined',
          label: 'Admin declined counter',
          subLabel: null,
          ts: offer.respondedAt ?? offer.createdAt,
          isCurrent: false,
          dotClass: 'bg-red-400 ring-red-100',
        });
      }
      if (offer.status === 'accepted') {
        entries.push({
          id: `${offer.id}-accepted`,
          kind: 'admin_accepted',
          label: `Accepted at ${formatKwd(offer.counterAmountFils ?? offer.offerAmountFils)}`,
          subLabel: null,
          ts: offer.respondedAt ?? offer.createdAt,
          isCurrent: false,
          dotClass: 'bg-brand-600 ring-brand-200',
        });
      }
      if (offer.status === 'expired') {
        entries.push({
          id: `${offer.id}-expired`,
          kind: 'expired',
          label: 'Offer expired',
          subLabel: null,
          ts: offer.validUntil,
          isCurrent: false,
          dotClass: 'bg-red-300 ring-red-100',
        });
      }
      if (offer.status === 'withdrawn') {
        entries.push({
          id: `${offer.id}-withdrawn`,
          kind: 'withdrawn',
          label: 'Offer withdrawn',
          subLabel: null,
          ts: offer.createdAt,
          isCurrent: false,
          dotClass: 'bg-slate-400 ring-slate-100',
        });
      }
    }

    this.entries = entries;
  }
}
