import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import type { OfferDetailDto, OfferSummaryDto } from '@behbehani-cpo/shared-types';
import { OffersService } from '../offers.service';
import { OFFER_STATUS_CHIP_CLASS, OFFER_STATUS_LABELS, OFFER_TERMINAL_STATUSES } from '../shared/offer-labels';
import { OfferTimelineComponent } from './offer-timeline.component';

function formatKwd(fils: number): string {
  return `KD ${(fils / 1000).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 3 })}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function validityDaysRemaining(validUntil: string): number {
  return Math.max(0, Math.ceil((new Date(validUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
}

function initials(name: string): string {
  return name.split(' ').slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('');
}

@Component({
  selector: 'admin-offer-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, RouterLink, OfferTimelineComponent],
  template: `
    <div class="max-w-5xl mx-auto">

      <!-- Breadcrumb + back link -->
      <div class="flex items-center gap-2 mb-5">
        <a routerLink="/operations/offers" class="inline-flex items-center gap-1 text-sm text-brand-700 hover:underline font-medium">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
          All offers
        </a>
      </div>

      @if (error()) {
        <div class="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{{ error() }}</div>
      }

      @if (loading()) {
        <div class="animate-pulse space-y-4">
          <div class="bg-white rounded-xl border border-slate-200 p-5">
            <div class="h-6 bg-slate-200 rounded w-64 mb-3"></div>
            <div class="h-4 bg-slate-100 rounded w-96"></div>
          </div>
        </div>
      }

      @if (!loading() && offer(); as o) {

        <!-- Hero state card -->
        <div class="bg-white rounded-xl shadow-sm p-5 mb-5 ring-1"
          [class.border-brand-200]="needsAction()"
          [class.ring-brand-100]="needsAction()"
          [class.border-slate-200]="!needsAction()"
          [class.ring-slate-50]="!needsAction()">

          <div class="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div class="flex items-center gap-2 mb-1 flex-wrap">
                <h1 class="text-lg font-semibold text-slate-800">Offer — {{ o.bookingRef }}</h1>
                <span class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold border"
                  [ngClass]="chipClass(o.status)">
                  {{ statusLabel(o.status) }}
                </span>
              </div>
              <p class="text-sm text-slate-500">{{ o.vehicleLabel }} — {{ o.customerFullName }}</p>
            </div>
            <div class="text-right flex-shrink-0">
              <p class="text-xs text-slate-400 mb-1">Current offer amount</p>
              <p class="text-2xl font-bold text-slate-800 tabular-nums">{{ formatKwd(o.offerAmountFils) }}</p>
              @if (!isTerminal()) {
                <p class="text-xs text-slate-500 mt-0.5">
                  Valid until {{ formatDate(o.validUntil) }}
                  @if (daysRemaining() > 0) {
                    <span class="font-medium text-amber-700">({{ daysRemaining() }} day{{ daysRemaining() === 1 ? '' : 's' }} remaining)</span>
                  } @else {
                    <span class="font-medium text-red-600">(Expired)</span>
                  }
                </p>
              }
            </div>
          </div>

          <!-- Customer counter call-out -->
          @if (o.status === 'countered_by_customer' && o.counterAmountFils !== null) {
            <div class="mt-4 p-3 rounded-lg bg-brand-50 border border-brand-200 flex items-start gap-3">
              <svg class="w-5 h-5 text-brand-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>
              <div>
                <p class="text-sm font-semibold text-brand-800">Customer countered at <span class="tabular-nums">{{ formatKwd(o.counterAmountFils) }}</span></p>
                @if (o.counterNotes) {
                  <p class="text-xs text-brand-700 mt-0.5 italic">"{{ o.counterNotes }}"</p>
                }
                @if (o.respondedAt) {
                  <p class="text-xs text-slate-400 mt-1">Received {{ formatDate(o.respondedAt) }}</p>
                }
              </div>
            </div>
          }

          <!-- Admin counter call-out -->
          @if (o.status === 'countered_by_admin') {
            <div class="mt-4 p-3 rounded-lg bg-brand-50 border border-brand-200 flex items-start gap-3">
              <svg class="w-5 h-5 text-brand-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>
              <div>
                <p class="text-sm font-semibold text-brand-800">Admin countered — awaiting customer response</p>
                <p class="text-xs text-slate-500 mt-0.5">BMC will respond within 24 hours (customer reminder scheduled).</p>
              </div>
            </div>
          }

          <!-- Accepted + draft listing link (§16 D5) -->
          @if (o.status === 'accepted' && draftListingStockNumber()) {
            <div class="mt-4 p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center gap-3">
              <svg class="w-5 h-5 text-brand-600 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/></svg>
              <p class="text-sm text-slate-700 flex-1">
                Draft listing <strong class="text-brand-700 font-mono">{{ draftListingStockNumber() }}</strong> created —
                <a [routerLink]="['/inventory/listings', draftListingId()]" class="text-brand-700 font-semibold hover:underline">open in listings ↗</a>
              </p>
            </div>
          }

          <!-- Action buttons — conditional on status -->
          @if (o.status === 'countered_by_customer') {
            <div class="mt-4 flex items-center gap-2 flex-wrap">
              <button type="button"
                class="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 active:scale-[0.98] min-h-[44px] shadow-sm transition-all disabled:opacity-50"
                [disabled]="busy()"
                (click)="acceptCounter()">Accept customer's counter</button>
              <button type="button"
                class="rounded-md border border-brand-300 bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-100 min-h-[44px] transition-colors disabled:opacity-50"
                [disabled]="busy()"
                (click)="showAdminCounter.set(true)">Re-issue at different price</button>
              <button type="button"
                class="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 min-h-[44px] transition-colors disabled:opacity-50"
                [disabled]="busy()"
                (click)="declineCounter()">Decline counter</button>
              <button type="button"
                class="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 min-h-[44px] transition-colors ml-auto disabled:opacity-50"
                [disabled]="busy()"
                (click)="withdraw()">Withdraw offer</button>
            </div>
          }

          @if (o.status === 'sent') {
            <div class="mt-4 flex items-center gap-2 flex-wrap">
              <button type="button"
                class="rounded-md border border-brand-300 bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-100 min-h-[44px] transition-colors disabled:opacity-50"
                [disabled]="busy()"
                (click)="showAdminCounter.set(true)">Re-issue at different price</button>
              <button type="button"
                class="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 min-h-[44px] transition-colors ml-auto disabled:opacity-50"
                [disabled]="busy()"
                (click)="withdraw()">Withdraw offer</button>
            </div>
          }

          @if (o.status === 'drafted') {
            <div class="mt-4 flex items-center gap-2 flex-wrap">
              <button type="button"
                class="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 min-h-[44px] shadow-sm transition-all disabled:opacity-50"
                [disabled]="busy()"
                (click)="sendOffer()">Send offer to customer</button>
            </div>
          }

          <!-- Admin counter inline panel -->
          @if (showAdminCounter()) {
            <div class="mt-4 p-4 rounded-lg border border-brand-200 bg-brand-50/40 space-y-3">
              <p class="text-sm font-semibold text-slate-700">Re-issue / admin counter amount</p>
              <div class="flex items-center gap-3 flex-wrap">
                <div class="relative">
                  <span class="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">KD</span>
                  <input type="text" [ngModel]="adminCounterDisplay()" (ngModelChange)="onAdminCounterInput($event)"
                    placeholder="0" class="pl-9 pr-3 py-2 text-sm font-bold text-slate-800 rounded-md border-2 border-brand-300 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 min-h-[44px] w-36"/>
                </div>
                <textarea rows="2" [ngModel]="adminCounterNotes()" (ngModelChange)="adminCounterNotes.set($event)"
                  placeholder="Optional note to accompany the counter…"
                  class="flex-1 min-w-[200px] text-sm rounded-md border border-slate-300 px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"></textarea>
              </div>
              <div class="flex items-center gap-2">
                <button type="button"
                  class="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 min-h-[44px] disabled:opacity-50"
                  [disabled]="busy() || !adminCounterFils()"
                  (click)="submitAdminCounter()">Send admin counter</button>
                <button type="button"
                  class="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 min-h-[44px]"
                  (click)="showAdminCounter.set(false); adminCounterDisplay.set(''); adminCounterFils.set(null)">Cancel</button>
              </div>
            </div>
          }

        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">

          <!-- Main column -->
          <div class="lg:col-span-2 space-y-5">

            <!-- Offer history timeline -->
            <admin-offer-timeline [chain]="o.offerHistory" [current]="o" />

            <!-- Linked inspection collapsible -->
            <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <details>
                <summary class="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-slate-50 transition-colors list-none">
                  <div class="flex items-center gap-3">
                    <svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                    <p class="text-sm font-semibold text-slate-700">Linked inspection — {{ o.bookingRef }}</p>
                    <span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold bg-slate-100 text-slate-700">Signed off</span>
                  </div>
                  <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>
                </summary>
                <div class="px-5 pb-4 border-t border-slate-100 pt-4">
                  <div class="flex items-center justify-between">
                    <div>
                      <p class="text-sm font-semibold text-slate-800">{{ o.vehicleLabel }}</p>
                      <p class="text-xs text-slate-500 mt-0.5">Inspection completed · Signed off</p>
                    </div>
                    <a [routerLink]="['/operations/inspections', o.inspectionId]"
                       class="text-xs font-semibold text-brand-700 hover:underline">Open full report ↗</a>
                  </div>
                </div>
              </details>
            </div>

          </div>

          <!-- Right sidebar -->
          <div class="space-y-4">

            <!-- Customer card -->
            <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Customer</p>
              <div class="flex items-center gap-3 mb-4">
                <div class="w-10 h-10 rounded-full bg-brand-700 flex items-center justify-center flex-shrink-0">
                  <span class="text-sm font-bold text-white">{{ initials(o.customerFullName) }}</span>
                </div>
                <div>
                  <p class="text-sm font-semibold text-slate-800">{{ o.customerFullName }}</p>
                </div>
              </div>

              <!-- Public offer link copy -->
              <div class="pt-3 border-t border-slate-100">
                <p class="text-xs font-medium text-slate-600 mb-1.5">Customer offer link</p>
                <div class="flex items-center gap-1.5">
                  <div class="flex-1 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-500 font-mono truncate">
                    {{ publicLinkDisplay() }}
                  </div>
                  <button type="button"
                    class="rounded-md bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 min-h-[36px] transition-colors flex-shrink-0"
                    (click)="copyPublicLink(o.publicToken)">Copy</button>
                </div>
                <p class="text-[10px] text-slate-400 mt-1">Opens the customer offer view page.</p>
              </div>
            </div>

            <!-- Offer metadata -->
            <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-5 text-sm">
              <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Offer metadata</p>
              <div class="space-y-2.5">
                <div class="flex justify-between">
                  <span class="text-slate-500">Round #</span>
                  <span class="font-medium text-slate-700">{{ roundNumber() }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-slate-500">Created</span>
                  <span class="font-medium text-slate-700">{{ formatDate(o.createdAt) }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-slate-500">Issued by</span>
                  <span class="font-medium text-slate-700">{{ o.createdByFullName }}</span>
                </div>
                @if (!isTerminal()) {
                  <div class="flex justify-between">
                    <span class="text-slate-500">Expires</span>
                    <span class="font-medium" [class.text-amber-700]="daysRemaining() <= 3" [class.text-slate-700]="daysRemaining() > 3">
                      {{ formatDate(o.validUntil) }}
                    </span>
                  </div>
                }
              </div>
            </div>

          </div>
        </div>
      }
    </div>
  `,
})
export class OfferDetailComponent implements OnInit, OnDestroy {
  private readonly service = inject(OffersService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroy$ = new Subject<void>();

  protected readonly offer = signal<OfferDetailDto | null>(null);
  protected readonly loading = signal<boolean>(true);
  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal<boolean>(false);

  // Admin counter inline state
  protected readonly showAdminCounter = signal<boolean>(false);
  protected readonly adminCounterDisplay = signal<string>('');
  protected readonly adminCounterFils = signal<number | null>(null);
  protected readonly adminCounterNotes = signal<string>('');

  // §16 D5 — draft listing created on acceptance
  protected readonly draftListingStockNumber = signal<string | null>(null);
  protected readonly draftListingId = signal<string | null>(null);

  protected formatKwd = formatKwd;
  protected formatDate = formatDate;
  protected initials = initials;

  private offerId = '';

  protected readonly isTerminal = computed(() => {
    const s = this.offer()?.status;
    return s ? OFFER_TERMINAL_STATUSES.has(s) : false;
  });

  protected readonly needsAction = computed(() =>
    this.offer()?.status === 'countered_by_customer',
  );

  protected readonly daysRemaining = computed(() =>
    this.offer() ? validityDaysRemaining(this.offer()!.validUntil) : 0,
  );

  protected readonly roundNumber = computed(() => {
    const history = this.offer()?.offerHistory ?? [];
    return history.length > 0 ? history.length : 1;
  });

  protected readonly publicLinkDisplay = computed(() => {
    const token = this.offer()?.publicToken ?? '';
    if (!token) return '—';
    return `bmc.kw/offer/${token.slice(0, 8)}…`;
  });

  protected statusLabel(status: OfferDetailDto['status']): string {
    return OFFER_STATUS_LABELS[status];
  }

  protected chipClass(status: OfferDetailDto['status']): string {
    return OFFER_STATUS_CHIP_CLASS[status];
  }

  ngOnInit(): void {
    this.offerId = this.route.snapshot.paramMap.get('id') ?? '';
    if (!this.offerId) {
      this.error.set('Offer ID missing from route.');
      this.loading.set(false);
      return;
    }
    this.loadOffer();
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  protected acceptCounter(): void {
    if (!confirm('Accept the customer\'s counter-offer? This will mark the offer as accepted and create a draft listing.')) return;
    this.busy.set(true);
    this.service.respondToCounter(this.offerId, 'accept').pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.busy.set(false); this.loadOffer(); },
      error: (err) => { this.busy.set(false); this.error.set((err as Error)?.message ?? 'Action failed.'); },
    });
  }

  protected declineCounter(): void {
    if (!confirm('Decline the customer\'s counter-offer?')) return;
    this.busy.set(true);
    this.service.respondToCounter(this.offerId, 'decline').pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.busy.set(false); this.loadOffer(); },
      error: (err) => { this.busy.set(false); this.error.set((err as Error)?.message ?? 'Action failed.'); },
    });
  }

  protected withdraw(): void {
    if (!confirm('Withdraw this offer? The customer will be notified.')) return;
    this.busy.set(true);
    this.service.withdraw(this.offerId).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.busy.set(false); this.loadOffer(); },
      error: (err) => { this.busy.set(false); this.error.set((err as Error)?.message ?? 'Action failed.'); },
    });
  }

  protected sendOffer(): void {
    this.busy.set(true);
    this.service.send(this.offerId).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.busy.set(false); this.loadOffer(); },
      error: (err) => { this.busy.set(false); this.error.set((err as Error)?.message ?? 'Failed to send.'); },
    });
  }

  protected onAdminCounterInput(raw: string): void {
    this.adminCounterDisplay.set(raw);
    const clean = raw.replace(/,/g, '').trim();
    const num = parseFloat(clean);
    this.adminCounterFils.set(isNaN(num) || num <= 0 ? null : Math.round(num * 1000));
  }

  protected submitAdminCounter(): void {
    const fils = this.adminCounterFils();
    if (!fils) return;
    this.busy.set(true);
    this.service.submitAdminCounter(this.offerId, {
      counterAmountFils: fils,
      ...(this.adminCounterNotes().trim() ? { counterNotes: this.adminCounterNotes().trim() } : {}),
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.busy.set(false);
        this.showAdminCounter.set(false);
        this.adminCounterDisplay.set('');
        this.adminCounterFils.set(null);
        this.adminCounterNotes.set('');
        this.loadOffer();
      },
      error: (err) => { this.busy.set(false); this.error.set((err as Error)?.message ?? 'Counter failed.'); },
    });
  }

  protected copyPublicLink(token: string): void {
    const url = `${window.location.origin}/sell/concierge/offer/${token}`;
    void navigator.clipboard?.writeText(url);
  }

  private loadOffer(): void {
    this.loading.set(true);
    this.error.set(null);
    this.service.get(this.offerId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (o) => {
        this.offer.set(o);
        this.loading.set(false);
        // F3: listingStockNumber + listingId are now first-class fields on
        // OfferDetailDto (OfferDetailDtoSchema extended). No cast needed.
        if (o.status === 'accepted' && o.listingStockNumber) {
          this.draftListingStockNumber.set(o.listingStockNumber);
          this.draftListingId.set(o.listingId ?? null);
        }
      },
      error: (err) => { this.error.set((err as Error)?.message ?? 'Failed to load offer.'); this.loading.set(false); },
    });
  }
}
