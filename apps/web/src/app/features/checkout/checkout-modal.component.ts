import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { CheckoutModalService } from './checkout-modal.service';
import { OrdersService } from '../../data/orders.service';
import type { PaymentMethodValue, CreateOrderResponseDto } from '@behbehani-cpo/shared-types';

type ModalState =
  | { kind: 'idle' }
  | { kind: 'creating' }
  | { kind: 'confirmed'; order: CreateOrderResponseDto }
  | { kind: 'initiatingPayment' }
  | { kind: 'redirecting' }
  | { kind: 'error'; code: string };

const METHOD_LABELS: Record<string, string> = {
  knet: 'checkout.modal.method.knet',
  card: 'checkout.modal.method.card',
  apple_pay: 'checkout.modal.method.applePay',
  google_pay: 'checkout.modal.method.googlePay',
};

const ERROR_MAP: Record<string, string> = {
  LISTING_ALREADY_RESERVED:     'checkout.modal.error.alreadyReserved',
  LISTING_NOT_AVAILABLE:        'checkout.modal.error.notAvailable',
  RESERVATION_EXPIRED:          'checkout.modal.error.reservationExpired',
  PAYMENT_INIT_FAILED:          'checkout.modal.error.paymentInitFailed',
  PAYMENT_REDIRECT_UNAVAILABLE: 'checkout.modal.error.paymentRedirectUnavailable',
  unauthenticated:              'checkout.modal.error.unauthenticated',
  network_error:                'checkout.modal.error.networkError',
};

@Component({
  selector: 'app-checkout-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule],
  template: `
    @if (modal.isOpen()) {
    <div class="fixed inset-0 z-[100] flex items-center justify-center bg-ink/60 p-4 backdrop-blur-sm animate-slide-up-fade"
      (click)="onBackdrop($event)" role="dialog" aria-modal="true" tabindex="-1" [attr.aria-label]="'checkout.modal.title'|translate">
      <div class="relative w-full max-w-[480px] rounded-[20px] bg-white p-6 shadow-brand-lg sm:p-8 max-h-[90dvh] overflow-y-auto">
        <button type="button" (click)="close()" [attr.aria-label]="'checkout.modal.close'|translate"
          class="absolute end-4 top-4 inline-grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-surface-cool hover:text-ink">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 6l12 12M6 18L18 6"/></svg>
        </button>
        <div class="mb-5 flex items-center gap-3">
          <div class="inline-grid h-10 w-10 place-items-center rounded-full bg-brand-700/10 text-brand-700">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5l-8-3Z"/></svg>
          </div>
          <div>
            <h2 class="font-display text-[22px] font-bold leading-tight tracking-[-0.02em] text-ink">{{ 'checkout.modal.title'|translate }}</h2>
            <p class="mt-0.5 text-sm text-muted">{{ 'checkout.modal.sub'|translate }}</p>
          </div>
        </div>

        @if (state().kind === 'idle') {
          <p class="mb-4 text-[13px] font-semibold uppercase tracking-wider text-brand-700">{{ 'checkout.modal.chooseMethod'|translate }}</p>
          @for (m of activeMethods; track m) {
            <button type="button" (click)="selectMethod(m)" [class]="methodBtnClass(m)" class="min-h-[54px]">
              <span class="flex-1 text-start text-[14px] font-semibold">{{ methodLabel(m)|translate }}</span>
              @if (selectedMethod()===m){<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" class="text-brand-700" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m9 12 2 2 4-4"/></svg>}
            </button>
          }
          @for (m of comingSoonMethods; track m) {
            <button type="button" disabled class="relative mt-2 flex w-full items-center gap-3 rounded-xl border-[1.5px] border-brand-200 bg-slate-100 px-4 py-3 cursor-not-allowed min-h-[54px]">
              <span class="flex-1 text-start text-[14px] font-semibold text-brand-700">{{ methodLabel(m)|translate }}</span>
              <span class="rounded-full border border-brand-200 bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-brand-700">{{ 'checkout.modal.comingSoon'|translate }}</span>
            </button>
          }
          @if (errorCode()) {
            <p class="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">{{ errorMessage()|translate }}</p>
            @if (errorCode()==='LISTING_ALREADY_RESERVED') {
              <button type="button" (click)="close()" class="mt-2 inline-flex items-center text-sm font-semibold text-brand-700 hover:text-brand-800 min-h-[44px]">
                {{ 'checkout.modal.error.browseSimilar'|translate }}<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" class="ms-1" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </button>
            }
          }
          <button type="button" (click)="onReserve()" [disabled]="!selectedMethod()"
            class="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-pill bg-brand-700 px-6 py-3.5 text-[15px] font-bold text-white shadow-brand hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50 min-h-[44px]">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5l-8-3Z"/></svg>
            {{ 'checkout.modal.reserveCta'|translate }}
          </button>
          <p class="mt-3 text-center text-[11px] text-muted">{{ 'checkout.modal.reserveHint'|translate }}</p>
        }

        @if (state().kind === 'creating' || state().kind === 'initiatingPayment') {
          <div class="flex flex-col items-center gap-4 py-10">
            <svg class="h-10 w-10 animate-spin text-brand-700" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/></svg>
            <p class="text-[15px] font-semibold text-ink">{{ (state().kind==='creating' ? 'checkout.modal.creating' : 'checkout.modal.connectingOtto')|translate }}</p>
          </div>
        }

        @if (state().kind === 'confirmed') {
          @let confirmed = confirmedOrder();
          @if (confirmed) {
            <div class="rounded-2xl border border-line bg-surface-soft p-5">
              <div class="flex items-center gap-2 text-brand-700">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m9 12 2 2 4-4"/></svg>
                <span class="font-semibold">{{ 'checkout.modal.confirmed.title'|translate }}</span>
              </div>
              <div class="mt-4 space-y-2 text-sm text-ink-2">
                <div class="flex justify-between"><span class="text-muted">{{ 'checkout.modal.confirmed.stock'|translate }}</span><span class="font-semibold text-ink">{{ confirmed.order.stockNumber }}</span></div>
                <div class="flex justify-between"><span class="text-muted">{{ 'checkout.modal.confirmed.reservationFee'|translate }}</span><span class="font-semibold text-ink">{{ fmtFils(confirmed.order.reservationAmountFils) }}</span></div>
                <div class="flex justify-between"><span class="text-muted">{{ 'checkout.modal.confirmed.expiresAt'|translate }}</span><span class="font-semibold text-ink">{{ fmtDate(confirmed.reservationExpiresAt) }}</span></div>
              </div>
            </div>
            <button type="button" (click)="onContinueToPayment()"
              class="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-pill bg-brand-700 px-6 py-3.5 text-[15px] font-bold text-white shadow-brand hover:bg-brand-800 min-h-[44px]">
              {{ 'checkout.modal.confirmed.paymentCta'|translate }}<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </button>
            <button type="button" (click)="close()" class="mt-2 inline-flex w-full items-center justify-center rounded-pill border border-line-2 bg-white px-6 py-3 text-sm font-semibold text-ink hover:bg-surface-cool min-h-[44px]">
              {{ 'checkout.modal.confirmed.doLater'|translate }}
            </button>
          }
        }

        @if (state().kind === 'redirecting') {
          <div class="flex flex-col items-center gap-4 py-10">
            <div class="inline-grid h-14 w-14 place-items-center rounded-full bg-brand-700/10 text-brand-700">
              <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><path d="M15 3h6v6M10 14L21 3"/></svg>
            </div>
            <p class="text-[15px] font-semibold text-ink">{{ 'checkout.modal.redirecting'|translate }}</p>
            <p class="text-sm text-muted">{{ 'checkout.modal.redirectingHint'|translate }}</p>
          </div>
        }

        @if (state().kind === 'error') {
          <div class="flex flex-col items-center gap-4 py-8">
            <div class="inline-grid h-14 w-14 place-items-center rounded-full bg-red-100 text-red-600">
              <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.5v.5"/></svg>
            </div>
            <div class="text-center">
              <p class="text-[15px] font-semibold text-ink">{{ 'checkout.modal.error.title'|translate }}</p>
              <p class="mt-1 text-sm text-muted">{{ errorMessage()|translate }}</p>
            </div>
            <div class="flex gap-3">
              <button type="button" (click)="retry()" class="inline-flex items-center gap-1.5 rounded-lg bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800 min-h-[44px]">{{ 'checkout.modal.error.retry'|translate }}</button>
              <button type="button" (click)="close()" class="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-5 py-2.5 text-sm font-semibold text-ink hover:bg-surface-cool min-h-[44px]">{{ 'checkout.modal.error.cancel'|translate }}</button>
            </div>
          </div>
        }
      </div>
    </div>
    }
  `,
})
export class CheckoutModalComponent {
  readonly modal = inject(CheckoutModalService);
  private readonly orders = inject(OrdersService);
  private readonly platformId = inject(PLATFORM_ID);

  readonly state = signal<ModalState>({ kind: 'idle' });
  readonly selectedMethod = signal<PaymentMethodValue | null>(null);
  readonly errorCode = signal<string | null>(null);

  private pendingOrderId: string | null = null;

  readonly activeMethods: PaymentMethodValue[] = ['knet', 'card'];
  readonly comingSoonMethods: PaymentMethodValue[] = ['apple_pay', 'google_pay'];

  readonly confirmedOrder = computed(() => {
    const s = this.state();
    return s.kind === 'confirmed' ? s.order : null;
  });

  readonly errorMessage = computed(() =>
    ERROR_MAP[this.errorCode() ?? ''] ?? 'checkout.modal.error.generic',
  );

  constructor() {
    effect(() => {
      if (!isPlatformBrowser(this.platformId)) return;
      document.body.style.overflow = this.modal.isOpen() ? 'hidden' : '';
    });
    effect(() => {
      if (this.modal.isOpen()) {
        this.state.set({ kind: 'idle' });
        this.selectedMethod.set(null);
        this.errorCode.set(null);
        this.pendingOrderId = null;
      }
    }, { allowSignalWrites: true });
  }

  methodLabel(method: string): string { return METHOD_LABELS[method] ?? method; }

  selectMethod(method: PaymentMethodValue): void { this.selectedMethod.set(method); this.errorCode.set(null); }

  methodBtnClass(method: PaymentMethodValue): string {
    const base = 'mt-2 flex w-full items-center gap-3 rounded-xl border-[1.5px] px-4 py-3 transition-colors';
    return this.selectedMethod() === method
      ? `${base} border-brand-700 bg-brand-50 text-brand-700`
      : `${base} border-line bg-white text-ink hover:border-brand-300`;
  }

  onReserve(): void {
    const method = this.selectedMethod();
    const listingId = this.modal.listingId();
    if (!method || !listingId) return;
    this.state.set({ kind: 'creating' });
    this.errorCode.set(null);
    this.orders.create({ listingId, paymentMethod: method }).subscribe((s) => {
      if (s.kind === 'loading') return;
      if (s.kind === 'ok') {
        this.pendingOrderId = s.value.order.id;
        this.state.set({ kind: 'confirmed', order: s.value });
      } else {
        this.errorCode.set(s.code);
        this.state.set({ kind: 'error', code: s.code });
      }
    });
  }

  onContinueToPayment(): void {
    const orderId = this.pendingOrderId;
    const method = this.selectedMethod();
    if (!orderId || !method) return;
    this.state.set({ kind: 'initiatingPayment' });
    this.orders.initiatePayment(orderId, { method }).subscribe((s) => {
      if (s.kind === 'loading') return;
      if (s.kind === 'ok') {
        // v1.5-D17: defensive guard against missing hostedPaymentUrl. With B's
        // v1.5.28 PAYMENT_BYPASS_MODE, the URL always points at our own
        // /checkout/return page so this branch is normally not hit. But if a
        // future API change ever returns a payload without `hostedPaymentUrl`
        // we'd otherwise call `window.open(undefined, '_blank')` and silently
        // open a blank tab — surface a real error state instead.
        const url = s.value.hostedPaymentUrl;
        if (!url) {
          this.errorCode.set('PAYMENT_REDIRECT_UNAVAILABLE');
          this.state.set({ kind: 'error', code: 'PAYMENT_REDIRECT_UNAVAILABLE' });
          return;
        }
        this.state.set({ kind: 'redirecting' });
        if (isPlatformBrowser(this.platformId)) {
          window.open(url, '_blank');
          setTimeout(() => this.modal.close(), 1500);
        }
      } else {
        this.errorCode.set(s.code);
        this.state.set({ kind: 'error', code: s.code });
      }
    });
  }

  retry(): void { this.errorCode.set(null); this.state.set({ kind: 'idle' }); }
  close(): void { this.modal.close(); }
  onBackdrop(e: MouseEvent): void { if (e.target === e.currentTarget) this.close(); }

  @HostListener('document:keydown.escape')
  onEscape(): void { if (this.modal.isOpen()) this.close(); }

  fmtFils(fils: string): string {
    try { return `KWD ${(Number(BigInt(fils)) / 1000).toFixed(3)}`; }
    catch { return 'KWD —'; }
  }
  fmtDate(iso: string): string {
    try { return new Date(iso).toLocaleDateString('en-KW', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
    catch { return iso; }
  }
}
