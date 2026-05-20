import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  PLATFORM_ID,
  computed,
  inject,
  signal,
  OnInit,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { LanguageService } from '@behbehani-cpo/shared-i18n';
import { OrdersService } from '../../data/orders.service';
import type { OrderSummaryDto } from '@behbehani-cpo/shared-types';

type ReturnPageState =
  | { kind: 'polling' }
  | { kind: 'paid'; order: OrderSummaryDto }
  | { kind: 'cancelled' }
  | { kind: 'timeout' }
  | { kind: 'error' };

const POLL_INTERVAL_MS = 1500;
const POLL_TIMEOUT_MS  = 10_000;

@Component({
  selector: 'app-checkout-return-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule, RouterLink],
  template: `
    <div class="container-page py-8 mx-auto max-w-4xl">

      <!-- Back link -->
      <a
        [routerLink]="['/', locale(), 'browse']"
        class="mb-6 inline-flex items-center text-[13px] font-medium text-brand-700 hover:text-brand-900 hover:underline"
      >
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" class="me-1" aria-hidden="true">
          <path d="M14 6l-6 6 6 6"/>
        </svg>
        {{ 'checkout.return.backToBrowse' | translate }}
      </a>

      <!-- ── POLLING ── -->
      @if (pageState().kind === 'polling') {
        <div class="rounded-3xl border border-line bg-white p-6 sm:p-8 text-center shadow-brand-sm">
          <svg class="mx-auto h-12 w-12 animate-spin text-brand-700" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
          </svg>
          <p class="mt-4 text-[16px] font-semibold text-ink">{{ 'checkout.return.verifying' | translate }}</p>
          <p class="mt-1.5 text-sm text-muted">{{ 'checkout.return.verifyingHint' | translate }}</p>
        </div>
      }

      <!-- ── PAID success ── -->
      @if (pageState().kind === 'paid') {
        @let order = paidOrder();
        <div
          class="rounded-3xl p-6 sm:p-8 text-white"
          style="background: linear-gradient(135deg, #1E3A8A 0%, #1D4ED8 60%, #2563EB 100%);"
        >
          <div class="mb-4 inline-grid h-14 w-14 place-items-center rounded-full bg-white/20">
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2.4" class="text-white" aria-hidden="true">
              <circle cx="12" cy="12" r="9"/><path d="m9 12 2 2 4-4"/>
            </svg>
          </div>
          <h1 class="font-display text-[clamp(24px,3vw,36px)] font-extrabold leading-tight tracking-[-0.025em] text-white">
            {{ 'checkout.return.paid.title' | translate }}
          </h1>
          <p class="mt-2 text-[14px] text-white/80">{{ 'checkout.return.paid.sub' | translate }}</p>
        </div>

        @if (order) {
          <div class="mt-6 rounded-3xl border border-line bg-white p-6 sm:p-8 shadow-brand-sm">
            <h2 class="mb-4 font-display text-lg font-bold text-ink">{{ 'checkout.return.paid.orderSummary' | translate }}</h2>
            <div class="space-y-3 text-sm">
              <div class="flex justify-between">
                <span class="text-muted">{{ 'checkout.return.paid.stockNumber' | translate }}</span>
                <span class="font-semibold text-ink">{{ order.stockNumber }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-muted">{{ 'checkout.return.paid.reservationFee' | translate }}</span>
                <span class="font-semibold text-ink">{{ fmtFils(order.reservationAmountFils) }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-muted">{{ 'checkout.return.paid.status' | translate }}</span>
                <span class="inline-flex items-center rounded-full bg-brand-50 px-2.5 py-0.5 text-[11px] font-medium text-brand-700 border border-brand-200">
                  {{ 'checkout.return.paid.statusPaid' | translate }}
                </span>
              </div>
            </div>
            <a
              [routerLink]="['/', locale(), 'account', 'orders']"
              class="mt-6 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-pill bg-brand-700 px-6 py-3 text-[15px] font-bold text-white shadow-brand transition-colors hover:bg-brand-800"
            >
              {{ 'checkout.return.paid.viewOrderCta' | translate }}
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </a>
          </div>
        }
      }

      <!-- ── TIMEOUT: payment still processing ── -->
      @if (pageState().kind === 'timeout') {
        <div class="rounded-3xl border border-line bg-white p-6 sm:p-8 text-center shadow-brand-sm">
          <div class="mx-auto mb-4 inline-grid h-14 w-14 place-items-center rounded-full bg-brand-700/10 text-brand-700">
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>
            </svg>
          </div>
          <h1 class="font-display text-[22px] font-bold text-ink">{{ 'checkout.return.timeout.title' | translate }}</h1>
          <p class="mt-2 text-sm text-muted max-w-sm mx-auto">{{ 'checkout.return.timeout.body' | translate }}</p>
          <a
            [routerLink]="['/', locale(), 'account', 'orders']"
            class="mt-5 inline-flex min-h-[44px] items-center gap-2 rounded-pill bg-brand-700 px-6 py-3 text-sm font-bold text-white shadow-brand hover:bg-brand-800"
          >
            {{ 'checkout.return.timeout.ordersCta' | translate }}
          </a>
        </div>
      }

      <!-- ── CANCELLED ── -->
      @if (pageState().kind === 'cancelled') {
        <div class="rounded-3xl border border-line bg-white p-6 sm:p-8 text-center shadow-brand-sm">
          <div class="mx-auto mb-4 inline-grid h-14 w-14 place-items-center rounded-full bg-slate-100 text-slate-500">
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/>
            </svg>
          </div>
          <h1 class="font-display text-[22px] font-bold text-ink">{{ 'checkout.return.cancelled.title' | translate }}</h1>
          <p class="mt-2 text-sm text-muted max-w-sm mx-auto">{{ 'checkout.return.cancelled.body' | translate }}</p>
          <div class="mt-5 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              [routerLink]="['/', locale(), 'browse']"
              class="inline-flex min-h-[44px] items-center gap-2 rounded-pill bg-brand-700 px-6 py-3 text-sm font-bold text-white shadow-brand hover:bg-brand-800"
            >
              {{ 'checkout.return.cancelled.browseCta' | translate }}
            </a>
            <a
              [routerLink]="['/', locale(), 'account', 'orders']"
              class="inline-flex min-h-[44px] items-center gap-2 rounded-pill border border-line bg-white px-6 py-3 text-sm font-semibold text-ink hover:border-brand-700 hover:text-brand-700"
            >
              {{ 'checkout.return.cancelled.ordersCta' | translate }}
            </a>
          </div>
        </div>
      }

      <!-- ── ERROR ── -->
      @if (pageState().kind === 'error') {
        <div class="rounded-3xl border border-line bg-white p-6 sm:p-8 text-center shadow-brand-sm">
          <div class="mx-auto mb-4 inline-grid h-14 w-14 place-items-center rounded-full bg-red-100 text-red-600">
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.5v.5"/>
            </svg>
          </div>
          <h1 class="font-display text-[22px] font-bold text-ink">{{ 'checkout.return.error.title' | translate }}</h1>
          <p class="mt-2 text-sm text-muted max-w-sm mx-auto">{{ 'checkout.return.error.body' | translate }}</p>
          <a
            [routerLink]="['/', locale(), 'account', 'orders']"
            class="mt-5 inline-flex min-h-[44px] items-center gap-2 rounded-pill border border-brand-200 bg-brand-50 px-6 py-3 text-sm font-semibold text-brand-700 hover:bg-brand-100"
          >
            {{ 'checkout.return.error.ordersCta' | translate }}
          </a>
        </div>
      }

    </div>
  `,
})
export class CheckoutReturnPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly orders = inject(OrdersService);
  private readonly language = inject(LanguageService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);

  readonly locale = computed(() => this.language.current());

  readonly pageState = signal<ReturnPageState>({ kind: 'polling' });

  readonly paidOrder = computed(() => {
    const s = this.pageState();
    return s.kind === 'paid' ? s.order : null;
  });

  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private pollTimeout: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    const url = this.router.url;
    const isCancelRoute = url.includes('/checkout/cancel');
    const orderId = this.route.snapshot.queryParamMap.get('orderId');

    if (isCancelRoute) {
      this.pageState.set({ kind: 'cancelled' });
      return;
    }

    if (!orderId) {
      this.pageState.set({ kind: 'error' });
      return;
    }

    if (!isPlatformBrowser(this.platformId)) {
      return; // SSR — skip polling
    }

    this.startPolling(orderId);

    this.destroyRef.onDestroy(() => this.stopPolling());
  }

  private startPolling(orderId: string): void {
    // immediate first check
    this.checkOrder(orderId);

    this.pollInterval = setInterval(() => {
      this.checkOrder(orderId);
    }, POLL_INTERVAL_MS);

    this.pollTimeout = setTimeout(() => {
      this.stopPolling();
      const current = this.pageState();
      if (current.kind === 'polling') {
        this.pageState.set({ kind: 'timeout' });
        // redirect to /account/orders after 3s
        setTimeout(() => {
          void this.router.navigate(['/', this.locale(), 'account', 'orders']);
        }, 3000);
      }
    }, POLL_TIMEOUT_MS);
  }

  private checkOrder(orderId: string): void {
    this.orders.getDetail(orderId).subscribe((s) => {
      if (s.kind === 'loading') return;
      if (s.kind === 'error') {
        this.stopPolling();
        this.pageState.set({ kind: 'error' });
        return;
      }
      if (s.kind === 'ok') {
        const status = s.value.status;
        if (status === 'paid' || status === 'delivery_scheduled' || status === 'delivered' || status === 'completed') {
          this.stopPolling();
          this.pageState.set({ kind: 'paid', order: s.value });
        } else if (status === 'cancelled') {
          this.stopPolling();
          this.pageState.set({ kind: 'cancelled' });
        }
        // else keep polling
      }
    });
  }

  private stopPolling(): void {
    if (this.pollInterval !== null) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    if (this.pollTimeout !== null) {
      clearTimeout(this.pollTimeout);
      this.pollTimeout = null;
    }
  }

  fmtFils(fils: string): string {
    try { return `KWD ${(Number(BigInt(fils)) / 1000).toFixed(3)}`; }
    catch { return 'KWD —'; }
  }
}
