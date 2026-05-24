import {
  ChangeDetectionStrategy, Component, DestroyRef, OnDestroy,
  PLATFORM_ID, computed, effect, inject, signal,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { LanguageService } from '@behbehani-cpo/shared-i18n';
import { OrdersService } from '../../data/orders.service';
import type { OrderDetailDto, OrderStatusValue, PaymentMethodValue, PaymentStatusValue } from '@behbehani-cpo/shared-types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function filsToKwd(f: string): string {
  try { return `KWD ${(Number(BigInt(f)) / 1000).toFixed(3)}`; } catch { return 'KWD —'; }
}
function longDate(iso: string | null): string {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch { return iso; }
}
function relativeTime(iso: string): string {
  try {
    const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
    if (m < 1) return 'Just now'; if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24); return d < 30 ? `${d}d ago` : `${Math.floor(d / 30)}mo ago`;
  } catch { return ''; }
}
function statusPillClass(s: OrderStatusValue): string {
  if (s === 'reservation_pending' || s === 'payment_pending') return 'bg-brand-100 text-brand-700';
  if (s === 'confirmed' || s === 'paid' || s === 'delivery_scheduled') return 'bg-brand-50 text-brand-700 border border-brand-200';
  if (s === 'delivered' || s === 'completed') return 'bg-brand-700 text-white';
  if (s === 'cancelled') return 'bg-slate-100 text-slate-600 border border-slate-200';
  return 'bg-brand-50 text-brand-700';
}
function pmtStatusClass(s: PaymentStatusValue): string {
  if (s === 'succeeded') return 'bg-brand-50 text-brand-700 border border-brand-200';
  if (s === 'pending')   return 'bg-brand-100 text-brand-700';
  return 'bg-slate-100 text-slate-600 border border-slate-200';
}
function computeCountdown(expiresAt: string): { label: string; expired: boolean; urgent: boolean } {
  try {
    const ms = new Date(expiresAt).getTime() - Date.now();
    if (ms <= 0) return { label: '', expired: true, urgent: false };
    const t = Math.floor(ms / 1000), h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    return { label: h > 0 ? `${h}h ${pad(m)}m ${pad(s)}s` : `${m}m ${pad(s)}s`, expired: false, urgent: ms < 3_600_000 };
  } catch { return { label: '', expired: true, urgent: false }; }
}

// ─────────────────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-order-detail-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, TranslateModule],
  template: `
    <!-- Back link → orders list (kept; this is a sub-page within the orders flow, not the hub) -->
    <div class="mb-4">
      <a [routerLink]="['/', locale(), 'account', 'orders']" class="inline-flex items-center text-[13px] font-medium text-brand-700 hover:text-brand-900 hover:underline">
        ← {{ 'account.orderDetail.backToOrders' | translate }}
      </a>
    </div>

    @if (pageState().kind === 'loading') {
      <div class="flex flex-col gap-4">
        <div class="rounded-2xl animate-pulse bg-brand-100 h-24"></div>
        <div class="rounded-2xl border border-line bg-white p-6 animate-pulse flex flex-col gap-3">
          <div class="h-4 w-1/2 rounded bg-gray-200"></div><div class="h-3 w-1/3 rounded bg-gray-100"></div>
        </div>
      </div>
    } @else if (pageState().kind === 'not_found') {
      <div class="rounded-2xl border border-line bg-white p-10 text-center shadow-brand-sm">
        <p class="text-[15px] font-semibold text-ink">{{ 'account.orderDetail.notFound.title' | translate }}</p>
        <p class="mt-1.5 text-[13px] text-muted">{{ 'account.orderDetail.notFound.body' | translate }}</p>
        <a [routerLink]="['/', locale(), 'account', 'orders']" class="mt-5 inline-flex min-h-[44px] items-center rounded-lg bg-brand-700 px-5 py-2.5 text-[14px] font-medium text-white hover:bg-brand-800 transition-colors">{{ 'account.orderDetail.backToOrders' | translate }}</a>
      </div>
    } @else if (pageState().kind === 'error') {
      <div class="rounded-2xl border border-line bg-white p-10 text-center shadow-brand-sm">
        <p class="text-[14px] text-muted">{{ 'account.orders.error.body' | translate }}</p>
        <button type="button" (click)="retryLoad()" class="mt-4 min-h-[44px] rounded-lg border border-brand-200 bg-brand-50 px-5 py-2 text-[14px] font-medium text-brand-700 hover:bg-brand-100 transition-colors">{{ 'account.orders.error.retry' | translate }}</button>
      </div>
    } @else if (pageState().kind === 'ok') {
      @let order = okOrder();
      @if (order) {
        <!-- Compact hero header (Part C.4) -->
        <header class="mb-6 rounded-3xl bg-gradient-to-br from-brand-50 via-white to-brand-50/40 border border-brand-100 px-6 py-5 flex items-center gap-4">
          <span class="inline-grid h-14 w-14 flex-shrink-0 place-items-center rounded-2xl bg-brand-700 text-white shadow-brand-sm" aria-hidden="true">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
            </svg>
          </span>
          <div class="min-w-0">
            <p class="text-[11px] font-semibold uppercase tracking-widest text-muted mb-1">{{ 'account.orderDetail.eyebrow' | translate }}</p>
            <h1 class="font-display text-[22px] sm:text-[26px] font-bold text-ink mb-0.5 tracking-[-0.02em]">{{ 'account.orderDetail.orderNumber' | translate: { num: order.stockNumber } }}</h1>
            <p class="text-[13px] text-muted">
              <span [class]="'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium me-2 ' + pill(order.status)">{{ 'account.orders.status.' + order.status | translate }}</span>
              {{ 'account.orderDetail.reservedAgo' | translate: { when: rel(order.reservedAt) } }}
            </p>
          </div>
        </header>

        <div class="pb-4 flex flex-col gap-4">
          @if (showTimer(order.status)) {
            <div class="rounded-2xl border border-brand-200 bg-white p-5 shadow-brand-sm">
              @if (cd().expired) {
                <p class="text-[15px] font-semibold text-red-600">{{ 'account.orderDetail.countdown.expired' | translate }}</p>
              } @else {
                <div class="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <p class="text-[12px] font-medium uppercase tracking-wide text-muted mb-1">{{ 'account.orderDetail.countdown.label' | translate }}</p>
                    <p [class]="'text-[26px] font-extrabold tabular-nums ' + (cd().urgent ? 'text-red-600' : 'text-brand-700')">{{ cd().label }}</p>
                  </div>
                  <svg class="h-10 w-10 text-brand-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z"/></svg>
                </div>
                <p class="mt-2 text-[12px] text-muted">{{ 'account.orderDetail.countdown.help' | translate }}</p>
              }
            </div>
          }

          <div class="rounded-2xl border border-line bg-white p-5 shadow-brand-sm">
            <h2 class="text-[13px] font-semibold uppercase tracking-wide text-brand-700 mb-4">{{ 'account.orderDetail.summary.title' | translate }}</h2>
            <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
              <div><dt class="text-[11px] text-muted uppercase tracking-wide">{{ 'account.orderDetail.summary.stockNumber' | translate }}</dt><dd class="text-[15px] font-bold text-ink mt-0.5">{{ order.stockNumber }}</dd></div>
              <div><dt class="text-[11px] text-muted uppercase tracking-wide">{{ 'account.orderDetail.summary.status' | translate }}</dt><dd class="mt-0.5"><span [class]="'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ' + pill(order.status)">{{ 'account.orders.status.' + order.status | translate }}</span></dd></div>
              <div><dt class="text-[11px] text-muted uppercase tracking-wide">{{ 'account.orderDetail.summary.total' | translate }}</dt><dd class="text-[14px] font-semibold text-ink mt-0.5">{{ fmt(order.totalAmountFils) }}</dd></div>
              <div><dt class="text-[11px] text-muted uppercase tracking-wide">{{ 'account.orderDetail.summary.paid' | translate }}</dt><dd class="text-[14px] font-semibold text-ink mt-0.5">{{ fmt(order.paidAmountFils) }}</dd></div>
              <div><dt class="text-[11px] text-muted uppercase tracking-wide">{{ 'account.orderDetail.summary.reservationFee' | translate }}</dt><dd class="text-[14px] font-semibold text-ink mt-0.5">{{ fmt(order.reservationAmountFils) }}</dd></div>
              <div><dt class="text-[11px] text-muted uppercase tracking-wide">{{ 'account.orderDetail.summary.reservedAt' | translate }}</dt><dd class="text-[13px] text-ink mt-0.5">{{ long(order.reservedAt) }}</dd></div>
              @if (order.completedAt) {
                <div><dt class="text-[11px] text-muted uppercase tracking-wide">{{ 'account.orderDetail.summary.completedAt' | translate }}</dt><dd class="text-[13px] text-ink mt-0.5">{{ long(order.completedAt) }}</dd></div>
              }
              @if (order.cancelledAt) {
                <div><dt class="text-[11px] text-muted uppercase tracking-wide">{{ 'account.orderDetail.summary.cancelledAt' | translate }}</dt><dd class="text-[13px] text-red-600 mt-0.5">{{ long(order.cancelledAt) }}</dd></div>
              }
            </dl>
          </div>

          @if (order.payments.length > 0) {
            <div class="rounded-2xl border border-line bg-white p-5 shadow-brand-sm overflow-x-auto">
              <h2 class="text-[13px] font-semibold uppercase tracking-wide text-brand-700 mb-4">{{ 'account.orders.payments.title' | translate }}</h2>
              <table class="w-full text-left text-[13px]">
                <thead><tr class="border-b border-line">
                  <th class="pb-2 pr-4 text-[11px] font-semibold uppercase tracking-wide text-muted">{{ 'account.orderDetail.payments.colMethod' | translate }}</th>
                  <th class="pb-2 pr-4 text-[11px] font-semibold uppercase tracking-wide text-muted">{{ 'account.orderDetail.payments.colAmount' | translate }}</th>
                  <th class="pb-2 pr-4 text-[11px] font-semibold uppercase tracking-wide text-muted">{{ 'account.orderDetail.payments.colStatus' | translate }}</th>
                  <th class="pb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">{{ 'account.orderDetail.payments.colDate' | translate }}</th>
                </tr></thead>
                <tbody class="divide-y divide-line">
                  @for (pmt of sorted(order); track pmt.id) {
                    <tr>
                      <td class="py-3 pr-4 font-medium text-ink">{{ ('account.orderDetail.payments.method.' + pmt.method) | translate }}</td>
                      <td class="py-3 pr-4 font-semibold text-ink tabular-nums">{{ fmt(pmt.amountFils) }}</td>
                      <td class="py-3 pr-4"><span [class]="'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ' + pmtPill(pmt.status)">{{ ('account.orderDetail.payments.status.' + pmt.status) | translate }}</span></td>
                      <td class="py-3 text-muted text-[12px]">{{ long(pmt.initiatedAt) }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }

          @if (canCancel(order.status)) {
            <div class="rounded-2xl border border-red-100 bg-white p-5 shadow-brand-sm">
              <h2 class="text-[13px] font-semibold uppercase tracking-wide text-red-700 mb-2">{{ 'account.orderDetail.cancel.sectionTitle' | translate }}</h2>
              <p class="text-[13px] text-muted mb-4">{{ 'account.orderDetail.cancel.sectionBody' | translate }}</p>
              <button type="button" (click)="openCancel()" class="min-h-[44px] rounded-lg bg-red-600 px-5 py-2.5 text-[14px] font-medium text-white hover:bg-red-700 transition-colors">{{ 'account.orderDetail.cancel.button' | translate }}</button>
            </div>
          }
        </div>

        @if (showModal()) {
          <div class="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
            <div class="absolute inset-0 bg-black/40" (click)="closeCancel()"></div>
            <div class="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
              <h3 class="text-[16px] font-semibold text-ink mb-2">{{ 'account.orderDetail.cancel.modalTitle' | translate }}</h3>
              <p class="text-[13px] text-muted mb-6">{{ 'account.orderDetail.cancel.modalBody' | translate: { amount: fmt(order.reservationAmountFils) } }}</p>
              @if (cancelState().kind === 'error') {
                <p class="mb-4 text-[13px] text-red-600 rounded-lg border border-red-200 bg-red-50 px-3 py-2">{{ cancelErrMsg() }}</p>
              }
              <div class="flex gap-3 justify-end">
                <button type="button" (click)="closeCancel()" [disabled]="cancelState().kind === 'loading'" class="min-h-[44px] rounded-lg border border-line bg-white px-5 py-2 text-[14px] font-medium text-ink-2 hover:bg-gray-50 transition-colors disabled:opacity-50">{{ 'account.orderDetail.cancel.modalDismiss' | translate }}</button>
                <button type="button" (click)="confirmCancel(order.id)" [disabled]="cancelState().kind === 'loading'" class="min-h-[44px] rounded-lg bg-red-600 px-5 py-2.5 text-[14px] font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2">
                  @if (cancelState().kind === 'loading') { <svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg> }
                  {{ 'account.orderDetail.cancel.modalConfirm' | translate }}
                </button>
              </div>
            </div>
          </div>
        }
      }
    }
  `,
})
export class OrderDetailPageComponent implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly svc = inject(OrdersService);
  private readonly language = inject(LanguageService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);

  readonly locale = computed(() => this.language.current());
  private readonly orderId = signal('');

  readonly pageState = signal<
    | { kind: 'loading' }
    | { kind: 'ok'; value: OrderDetailDto }
    | { kind: 'not_found' }
    | { kind: 'error'; code: string }
  >({ kind: 'loading' });

  readonly cancelState = signal<{ kind: 'idle' } | { kind: 'loading' } | { kind: 'error'; code: string }>({ kind: 'idle' });
  readonly showModal = signal(false);
  readonly cd = signal<{ label: string; expired: boolean; urgent: boolean }>({ label: '', expired: false, urgent: false });
  private timerHandle: ReturnType<typeof setInterval> | null = null;

  readonly okOrder = computed(() => { const s = this.pageState(); return s.kind === 'ok' ? s.value : null; });
  readonly cancelErrMsg = computed(() => {
    const s = this.cancelState();
    return s.kind === 'error' ? (s.code === 'ORDER_NOT_CANCELLABLE' ? 'Order is no longer cancellable.' : 'Something went wrong. Please try again.') : '';
  });

  constructor() {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.orderId.set(id);
    this.loadDetail(id);
    effect(() => {
      const o = this.okOrder();
      if (o && (o.status === 'reservation_pending' || o.status === 'payment_pending') && isPlatformBrowser(this.platformId)) {
        this.startTimer(o.reservationExpiresAt);
      }
    });
    this.destroyRef.onDestroy(() => this.clearTimer());
  }

  ngOnDestroy(): void { this.clearTimer(); }

  private loadDetail(id: string): void {
    this.pageState.set({ kind: 'loading' });
    this.svc.getDetail(id).subscribe((s) => {
      if (s.kind === 'loading') return;
      if (s.kind === 'ok') { this.pageState.set({ kind: 'ok', value: s.value }); return; }
      if (s.code === 'NOT_FOUND' || s.code === 'ORDER_NOT_FOUND') { this.pageState.set({ kind: 'not_found' }); return; }
      this.pageState.set({ kind: 'error', code: s.code });
    });
  }

  retryLoad(): void { this.loadDetail(this.orderId()); }

  private startTimer(expiresAt: string): void {
    this.clearTimer();
    const tick = () => this.cd.set(computeCountdown(expiresAt));
    tick();
    this.timerHandle = setInterval(tick, 1000);
  }
  private clearTimer(): void { if (this.timerHandle !== null) { clearInterval(this.timerHandle); this.timerHandle = null; } }

  openCancel(): void { this.cancelState.set({ kind: 'idle' }); this.showModal.set(true); }
  closeCancel(): void { if (this.cancelState().kind !== 'loading') this.showModal.set(false); }

  confirmCancel(orderId: string): void {
    if (this.cancelState().kind === 'loading') return;
    this.cancelState.set({ kind: 'loading' });
    this.svc.cancel(orderId).subscribe((s) => {
      if (s.kind === 'loading') return;
      if (s.kind === 'ok') { this.showModal.set(false); this.cancelState.set({ kind: 'idle' }); this.loadDetail(orderId); return; }
      this.cancelState.set({ kind: 'error', code: s.code });
      if (s.code === 'ORDER_NOT_CANCELLABLE') this.loadDetail(orderId);
    });
  }

  // Template helpers
  pill(s: OrderStatusValue): string { return statusPillClass(s); }
  pmtPill(s: PaymentStatusValue): string { return pmtStatusClass(s); }
  canCancel(s: OrderStatusValue): boolean { return s === 'reservation_pending' || s === 'confirmed'; }
  showTimer(s: OrderStatusValue): boolean { return s === 'reservation_pending' || s === 'payment_pending'; }
  fmt(f: string): string { return filsToKwd(f); }
  long(iso: string | null): string { return longDate(iso); }
  rel(iso: string): string { return relativeTime(iso); }
  sorted(o: OrderDetailDto) { return [...o.payments].sort((a, b) => new Date(b.initiatedAt).getTime() - new Date(a.initiatedAt).getTime()); }
}
