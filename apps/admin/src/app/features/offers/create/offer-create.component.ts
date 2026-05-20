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

import { AdminInspectionsService } from '@behbehani-cpo/data-access';
import { INSPECTION_RUBRIC } from '@behbehani-cpo/shared-types';
import { OffersService } from '../offers.service';
import { ScoreCircleComponent } from '../../inspections/signoff/score-circle.component';

function formatKwdDisplay(fils: number): string {
  if (!fils) return '';
  const kwd = fils / 1000;
  return kwd.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 3 });
}

function kwdInputToFils(raw: string): number | null {
  const clean = raw.replace(/,/g, '').trim();
  const num = parseFloat(clean);
  if (isNaN(num) || num <= 0) return null;
  return Math.round(num * 1000);
}

function defaultValidUntil(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().split('T')[0];
}

function initials(name: string): string {
  return name.split(' ').slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('');
}

@Component({
  selector: 'admin-offer-create',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, RouterLink, ScoreCircleComponent],
  template: `
    <div class="max-w-5xl mx-auto">

      <!-- Breadcrumb -->
      <nav class="flex items-center gap-1.5 text-xs text-slate-500 mb-5">
        <a routerLink="/operations/inspections" class="hover:text-slate-700">Inspections</a>
        <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>
        @if (detail()) {
          <a [routerLink]="['/operations/inspections', inspectionId]" class="hover:text-slate-700 truncate max-w-xs">{{ detail()!.bookingRef }}</a>
        }
        <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>
        <span class="text-slate-800 font-medium">Create offer</span>
      </nav>

      <!-- Page heading -->
      <div class="mb-5">
        <h1 class="text-xl font-semibold text-slate-800">Create buy offer</h1>
        <p class="text-sm text-slate-500 mt-0.5">Concierge inspection complete — issue a purchase offer to the customer.</p>
      </div>
      @if (error()) {
        <div class="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{{ error() }}</div>
      }

      @if (loadingInspection()) {
        <div class="animate-pulse bg-white rounded-xl border border-slate-200 p-5">
          <div class="flex items-center gap-5">
            <div class="w-20 h-20 rounded-full bg-slate-200 flex-shrink-0"></div>
            <div class="flex-1 space-y-2">
              <div class="h-5 bg-slate-200 rounded w-56"></div>
              <div class="h-3 bg-slate-100 rounded w-36"></div>
            </div>
          </div>
        </div>
      }
      @if (!loadingInspection() && detail(); as d) {
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">

          <!-- Left / main column (spans 2) -->
          <div class="lg:col-span-2 space-y-5">

            <!-- Vehicle summary card -->
            <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <div class="flex items-start gap-4">
                <admin-score-circle [score]="d.overallScore" size="lg" />
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 flex-wrap">
                    <h2 class="text-base font-semibold text-slate-800">{{ d.vehicleLabel }}</h2>
                    <span class="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-semibold bg-brand-100 text-brand-800">Concierge</span>
                  </div>
                  <p class="text-xs text-slate-500 mt-0.5 font-mono">{{ d.bookingRef }}@if (d.vinMasked) { · VIN {{ d.vinMasked }} }</p>
                  <div class="mt-3 flex flex-wrap items-center gap-4 text-xs">
                    <span class="inline-flex items-center gap-1.5 text-slate-600">
                      <span class="w-2 h-2 rounded-full bg-brand-600 flex-shrink-0"></span>
                      <span class="font-semibold tabular-nums">{{ counts().pass }}</span> Pass
                    </span>
                    <span class="inline-flex items-center gap-1.5 text-slate-600">
                      <span class="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0"></span>
                      <span class="font-semibold tabular-nums">{{ counts().advisory }}</span> Advisory
                    </span>
                    <span class="inline-flex items-center gap-1.5 text-slate-600">
                      <span class="w-2 h-2 rounded-full bg-red-600 flex-shrink-0"></span>
                      <span class="font-semibold tabular-nums">{{ counts().fail }}</span> Fail
                    </span>
                    @if (d.inspector) {
                      <span class="text-slate-300">·</span>
                      <span class="text-slate-500">Inspector: <span class="font-medium text-slate-700">{{ d.inspector.fullName }}</span></span>
                    }
                    <span class="text-slate-300">·</span>
                    <span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold bg-slate-100 text-slate-700">Signed off</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Section scores -->
            <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <p class="text-sm font-semibold text-slate-700 mb-3">Inspection section scores</p>
              <div class="divide-y divide-slate-100">
                @for (sec of sectionScores(); track sec.key) {
                  <div class="flex items-center justify-between py-2.5 text-sm">
                    <span class="text-slate-700">{{ sec.labelEn }}</span>
                    <div class="flex items-center gap-2">
                      <div class="w-28 h-1.5 rounded-full bg-slate-100">
                        @if (sec.score !== null) {
                          <div class="h-1.5 rounded-full transition-all"
                            [class.bg-brand-500]="sec.score >= 80"
                            [class.bg-amber-400]="sec.score >= 60 && sec.score < 80"
                            [class.bg-red-500]="sec.score < 60"
                            [style.width.%]="sec.score"></div>
                        }
                      </div>
                      @if (sec.score !== null) {
                        <span class="text-xs font-semibold tabular-nums w-8 text-right"
                          [class.text-brand-700]="sec.score >= 80"
                          [class.text-amber-700]="sec.score >= 60 && sec.score < 80"
                          [class.text-red-600]="sec.score < 60">{{ sec.score }}%</span>
                      } @else {
                        <span class="text-xs text-slate-400 w-8 text-right">—</span>
                      }
                    </div>
                  </div>
                }
              </div>
              @if (itemsNeedingAttention().length > 0) {
                <details class="mt-3">
                  <summary class="text-xs font-semibold text-brand-700 cursor-pointer hover:underline">
                    Show {{ itemsNeedingAttention().length }} items needing attention
                  </summary>
                  <div class="mt-2 space-y-1">
                    @for (item of itemsNeedingAttention(); track item.itemId) {
                      <div class="flex items-center gap-2 text-xs py-1.5 px-2 rounded"
                        [class.bg-red-50]="item.status === 'fail'">
                        @if (item.status === 'fail') {
                          <span class="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-red-600 text-white">FAIL</span>
                        } @else {
                          <span class="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-amber-400 text-amber-900">ADVISORY</span>
                        }
                        <span class="text-slate-700">{{ item.labelEn }}</span>
                      </div>
                    }
                  </div>
                </details>
              }
            </div>

            <!-- Offer form -->
            <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <p class="text-sm font-semibold text-slate-700 mb-4">Offer details</p>

              <!-- Customer info strip -->
              @if (d.customer) {
                <div class="flex items-center gap-3 p-3 rounded-md border border-slate-200 bg-slate-50 mb-5">
                  <div class="w-9 h-9 rounded-full bg-brand-700 flex items-center justify-center flex-shrink-0">
                    <span class="text-xs font-bold text-white">{{ initials(d.customer.fullName) }}</span>
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-slate-800">{{ d.customer.fullName }}</p>
                    <p class="text-xs text-slate-500">{{ d.customer.mobile ?? '' }}@if (d.customer.email) { · {{ d.customer.email }} }</p>
                  </div>
                  <span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 flex-shrink-0">No offer yet</span>
                </div>
              }

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <!-- Offer amount -->
                <div class="sm:col-span-2">
                  <label class="block text-xs font-semibold text-slate-600 mb-1.5" for="offer-amount">
                    Offer amount (KWD)
                    <span class="text-slate-400 font-normal ml-1">— inclusive of all fees</span>
                  </label>
                  <div class="relative">
                    <span class="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-semibold text-slate-400 pointer-events-none">KD</span>
                    <input
                      id="offer-amount"
                      type="text"
                      [ngModel]="offerAmountDisplay()"
                      (ngModelChange)="onAmountInput($event)"
                      placeholder="0"
                      class="w-full pl-14 pr-5 py-3.5 text-2xl font-bold text-slate-800 rounded-lg border-2 border-brand-300 bg-brand-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 min-h-[56px]"
                    />
                  </div>
                  <p class="text-xs text-slate-400 mt-1">Use . for decimals. Market estimate shown on the right.</p>
                </div>

                <!-- Validity date -->
                <div>
                  <label class="block text-xs font-semibold text-slate-600 mb-1.5" for="valid-until">
                    Valid until
                    <span class="text-slate-400 font-normal ml-1">(default +7 days)</span>
                  </label>
                  <input
                    id="valid-until"
                    type="date"
                    [ngModel]="validUntil()"
                    (ngModelChange)="validUntil.set($event)"
                    class="w-full px-3 py-2.5 text-sm rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 min-h-[44px] bg-white"
                  />
                </div>

                <!-- Notification note -->
                <div class="flex flex-col justify-end">
                  <div class="flex items-start gap-2 p-3 rounded-md bg-brand-50 border border-brand-100">
                    <svg class="w-4 h-4 text-brand-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
                    <p class="text-xs text-brand-800">Customer will be notified by <strong>SMS + email</strong> when this offer is sent.</p>
                  </div>
                </div>

                <!-- Internal notes -->
                <div class="sm:col-span-2">
                  <label class="block text-xs font-semibold text-slate-600 mb-1.5" for="internal-notes">
                    Internal notes
                    <span class="text-slate-400 font-normal ml-1">— not visible to customer</span>
                  </label>
                  <textarea
                    id="internal-notes"
                    rows="3"
                    [ngModel]="notes()"
                    (ngModelChange)="notes.set($event)"
                    placeholder="e.g. Priced below estimate due to tyre advisory."
                    class="w-full text-sm rounded-md border border-slate-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none bg-white"
                  ></textarea>
                </div>
              </div>

              @if (validationError()) {
                <p class="mt-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">{{ validationError() }}</p>
              }
            </div>

          </div>

          <!-- Right column: market estimate + offer preview -->
          <div class="space-y-4">
            <!-- Market estimate — static Beta stub per §16 D9 -->
            <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <div class="flex items-center gap-2 mb-3">
                <p class="text-sm font-semibold text-slate-700">Market estimate</p>
                <span class="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-500 uppercase tracking-wide">Beta</span>
              </div>
              <div class="text-center py-4">
                <p class="text-xs text-slate-400 mb-2">Estimated fair range</p>
                <p class="text-2xl font-bold text-slate-800">KD — – —</p>
                <p class="text-xs text-slate-400 mt-1">Based on similar listings</p>
              </div>
              <div class="border-t border-slate-100 pt-3 mt-1 space-y-2">
                <div class="flex justify-between text-xs text-slate-600">
                  <span>Avg. selling price</span>
                  <span class="font-medium text-slate-400">—</span>
                </div>
                <div class="flex justify-between text-xs text-slate-600">
                  <span>Avg. days to sell</span>
                  <span class="font-medium text-slate-400">—</span>
                </div>
                <div class="flex justify-between text-xs text-slate-600">
                  <span>Similar active listings</span>
                  <span class="font-medium text-slate-400">—</span>
                </div>
              </div>
              <p class="text-[10px] text-slate-400 mt-3 italic">Live pricing data feed not yet connected.</p>
            </div>

            <!-- Offer preview card (live-updates) -->
            <div class="bg-brand-700 rounded-xl p-5 text-white shadow-md">
              <p class="text-xs font-semibold uppercase tracking-wide text-brand-200 mb-3">Offer preview</p>
              <div class="space-y-2 text-sm">
                <div class="flex justify-between">
                  <span class="text-brand-200">Amount</span>
                  @if (offerAmountFils()) {
                    <span class="font-bold text-xl">KD {{ offerAmountDisplay() }}</span>
                  } @else {
                    <span class="text-brand-300 italic text-sm">Enter amount</span>
                  }
                </div>
                <div class="flex justify-between text-brand-200">
                  <span>Valid until</span>
                  <span class="text-white font-medium">{{ validUntilFormatted() }}</span>
                </div>
                <div class="flex justify-between text-brand-200">
                  <span>Validity</span>
                  <span class="text-white font-medium">7 days</span>
                </div>
                @if (d.customer) {
                  <div class="flex justify-between text-brand-200">
                    <span>Customer</span>
                    <span class="text-white font-medium truncate ml-2">{{ d.customer.fullName }}</span>
                  </div>
                }
              </div>
            </div>
          </div>

        </div>
      }
    </div>

    <!-- Sticky bottom action bar -->
    <div class="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 shadow-md z-10">
      <div class="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        <p class="text-xs text-slate-500 hidden sm:block">
          @if (detail()?.customer) {
            Offer will be sent to <strong>{{ detail()!.customer!.fullName }}</strong> via SMS + email.
          }
        </p>
        <div class="flex items-center gap-3 ml-auto">
          <a routerLink="/operations/inspections" class="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 min-h-[44px] inline-flex items-center transition-colors">
            Cancel
          </a>
          <button type="button"
            class="rounded-md border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-100 min-h-[44px] transition-colors disabled:opacity-50"
            [disabled]="busy() || !canSubmit()"
            (click)="saveDraft()">
            @if (busy() && submitIntent() === 'draft') { Saving… } @else { Save draft }
          </button>
          <button type="button"
            class="rounded-md bg-brand-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-700 active:scale-[0.98] min-h-[44px] transition-all shadow-sm disabled:opacity-50"
            [disabled]="busy() || !canSubmit()"
            (click)="sendOffer()">
            @if (busy() && submitIntent() === 'send') { Sending… } @else { Send offer }
          </button>
        </div>
      </div>
    </div>
    <div class="h-20"></div>
  `,
})
export class OfferCreateComponent implements OnInit, OnDestroy {
  private readonly inspectionsService = inject(AdminInspectionsService);
  private readonly offersService = inject(OffersService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroy$ = new Subject<void>();

  protected inspectionId = '';

  // The inspection detail is typed loosely to avoid importing the private interface;
  // we only read fields we know exist from the base summary + detail type.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected readonly detail = signal<any>(null);
  protected readonly loadingInspection = signal<boolean>(true);
  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal<boolean>(false);
  protected readonly submitIntent = signal<'draft' | 'send' | null>(null);

  // Form signals
  protected readonly offerAmountDisplay = signal<string>('');
  protected readonly offerAmountFils = signal<number | null>(null);
  protected readonly validUntil = signal<string>(defaultValidUntil());
  protected readonly notes = signal<string>('');

  protected initials = initials;

  protected readonly counts = computed(() => {
    const items = this.detail()?.reportJson?.items ?? [];
    let pass = 0, advisory = 0, fail = 0;
    for (const it of items) {
      if (it.status === 'pass') pass++;
      else if (it.status === 'advisory') advisory++;
      else if (it.status === 'fail') fail++;
    }
    return { pass, advisory, fail };
  });

  protected readonly sectionScores = computed(() => {
    const items = this.detail()?.reportJson?.items ?? [];
    return INSPECTION_RUBRIC.map((sec) => {
      const secItems = items.filter((it: { itemId: string }) => sec.items.some((ri) => ri.id === it.itemId));
      const passes = secItems.filter((it: { status: string }) => it.status === 'pass').length;
      const score = secItems.length === sec.items.length
        ? Math.round((passes / sec.items.length) * 100)
        : null;
      return { key: sec.key, labelEn: sec.labelEn, score };
    });
  });

  protected readonly itemsNeedingAttention = computed(() => {
    const items: Array<{ itemId: string; status: string }> = this.detail()?.reportJson?.items ?? [];
    return items
      .filter((it) => it.status === 'advisory' || it.status === 'fail')
      .map((it) => ({
        itemId: it.itemId,
        status: it.status as 'advisory' | 'fail',
        labelEn: this.labelForItemId(it.itemId),
      }));
  });

  protected readonly validationError = computed<string | null>(() => {
    if (!this.offerAmountFils()) return 'Enter an offer amount.';
    if (!this.validUntil()) return 'Select a validity date.';
    return null;
  });

  protected readonly canSubmit = computed(() => this.validationError() === null && !this.loadingInspection());

  protected readonly validUntilFormatted = computed(() => {
    if (!this.validUntil()) return '—';
    return new Date(this.validUntil()).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  });

  ngOnInit(): void {
    this.inspectionId = this.route.snapshot.paramMap.get('inspectionId') ?? '';
    if (!this.inspectionId) {
      this.error.set('Inspection ID is missing from the route.');
      this.loadingInspection.set(false);
      return;
    }
    this.inspectionsService.get(this.inspectionId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (d) => { this.detail.set(d); this.loadingInspection.set(false); },
      error: (err) => { this.error.set((err as Error)?.message ?? 'Failed to load inspection.'); this.loadingInspection.set(false); },
    });
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  protected onAmountInput(raw: string): void {
    this.offerAmountDisplay.set(raw);
    const fils = kwdInputToFils(raw);
    this.offerAmountFils.set(fils);
  }

  protected saveDraft(): void {
    this.submitIntent.set('draft');
    this.doSubmit();
  }

  protected sendOffer(): void {
    this.submitIntent.set('send');
    this.doSubmit();
  }

  private doSubmit(): void {
    if (!this.canSubmit() || this.busy()) return;
    const fils = this.offerAmountFils();
    if (!fils) return;

    this.busy.set(true);
    this.error.set(null);

    const dto = {
      offerAmountFils: fils,
      validUntil: new Date(this.validUntil()).toISOString(),
      ...(this.notes().trim() ? { notes: this.notes().trim() } : {}),
    };

    this.offersService.create(this.inspectionId, dto).pipe(takeUntil(this.destroy$)).subscribe({
      next: (offer) => {
        this.busy.set(false);
        if (this.submitIntent() === 'send') {
          // Send immediately after creation
          this.offersService.send(offer.id).pipe(takeUntil(this.destroy$)).subscribe({
            next: () => void this.router.navigate(['/operations/offers', offer.id]),
            error: (err) => {
              this.error.set((err as Error)?.message ?? 'Offer created but send failed. Open the offer to send manually.');
              void this.router.navigate(['/operations/offers', offer.id]);
            },
          });
        } else {
          void this.router.navigate(['/operations/offers', offer.id]);
        }
      },
      error: (err) => { this.busy.set(false); this.error.set((err as Error)?.message ?? 'Failed to create offer.'); },
    });
  }

  private labelForItemId(itemId: string): string {
    for (const section of INSPECTION_RUBRIC) {
      const found = section.items.find((it) => it.id === itemId);
      if (found) return found.labelEn;
    }
    return itemId;
  }
}
