import { ChangeDetectionStrategy, Component, Input, computed, inject, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { LanguageService } from '@behbehani-cpo/shared-i18n';
import { CheckoutModalService } from '../checkout/checkout-modal.service';

/**
 * Sticky pricing sidebar — price, monthly, reserve CTA, seller card and the
 * Behbehani Promise link. Renders inside the desktop-only `<aside>` slot of
 * the VDP. Pure presentational: takes display strings + an avatar initial.
 */
@Component({
  selector: 'app-vdp-pricing-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule],
  template: `
    <div class="sticky top-6 space-y-4">
      <div class="rounded-2xl border border-line bg-white p-5 shadow-brand-sm">
        <div class="mb-3 inline-flex items-center gap-1.5 rounded-pill bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700">
          <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m9 12 2 2 4-4"/></svg>
          {{ 'vdp.price.fair' | translate }}
        </div>
        <div class="font-display text-[32px] font-extrabold leading-none tracking-tight text-ink">{{ priceLabel() }}</div>
        <div class="mt-1.5 text-sm text-muted">
          {{ 'vdp.price.or' | translate }}
          <strong class="text-ink">{{ monthlyLabel() }}/{{ 'vdp.price.mo' | translate }}</strong>
          · {{ 'vdp.price.fromApr' | translate }}
        </div>

        <button type="button" (click)="onReserve()" class="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-pill bg-brand-700 px-5 py-3 text-sm font-bold text-white shadow-brand-sm hover:bg-brand-800">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5l-8-3Z"/></svg>
          {{ 'vdp.cta.reserve' | translate }}
        </button>
        <div class="mt-2 flex items-center justify-center gap-1 text-[11px] text-muted">
          <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
          {{ 'vdp.cta.reserveHint' | translate }}
        </div>
        <button type="button" class="mt-2 inline-flex w-full items-center justify-center rounded-pill border border-line-2 bg-white px-5 py-3 text-sm font-semibold text-ink hover:border-brand-700 hover:text-brand-700">
          {{ 'vdp.cta.testDrive' | translate }}
        </button>

        <hr class="my-4 border-line" />

        <div class="flex items-start gap-3">
          <div class="grid h-10 w-10 flex-shrink-0 place-items-center rounded-full bg-brand-700/10 font-display text-base font-bold text-brand-700">
            {{ avatarChar() }}
          </div>
          <div class="min-w-0">
            <div class="truncate text-sm font-bold text-ink">{{ 'vdp.seller.name' | translate }}</div>
            <div class="mt-0.5 inline-flex items-center gap-1 rounded-pill bg-brand-700/10 px-2 py-0.5 text-[11px] font-semibold text-brand-700">
              <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5l-8-3Z"/></svg>
              {{ 'vdp.seller.certified' | translate }}
            </div>
            <div class="mt-1 flex items-center gap-1 text-xs text-muted">
              <svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor" class="text-brand-500" aria-hidden="true"><path d="M12 2l3 6.5 7 1-5 5 1.2 7L12 17.8 5.8 21.5 7 14.5l-5-5 7-1L12 2z"/></svg>
              4.9 · 312 {{ 'vdp.seller.reviews' | translate }}
            </div>
          </div>
        </div>

        <button type="button" class="mt-4 flex w-full items-start gap-2 rounded-xl bg-surface-soft p-3 text-start text-[12px] text-ink-2 hover:bg-surface-cool">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" class="mt-0.5 flex-shrink-0 text-brand-700" aria-hidden="true"><path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5l-8-3Z"/></svg>
          <span><strong class="text-ink">{{ 'vdp.promise.title' | translate }}</strong> {{ 'vdp.promise.body' | translate }}</span>
        </button>
      </div>

      <div class="flex items-center gap-2 rounded-xl border border-line bg-white px-3 py-2.5 text-[12px] text-muted">
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" class="text-muted-2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 8v5"/><circle cx="12" cy="16.5" r="0.5" fill="currentColor"/></svg>
        {{ 'vdp.views' | translate }}
      </div>
    </div>
  `,
})
export class VdpPricingCardComponent {
  readonly priceLabel = input.required<string>();
  readonly monthlyLabel = input.required<string>();
  readonly brandName = input.required<string>();

  @Input() listingId!: string;

  private readonly language = inject(LanguageService);
  private readonly checkoutModal = inject(CheckoutModalService);

  readonly locale = computed(() => this.language.current());
  readonly avatarChar = computed(() => (this.brandName() || '·').charAt(0));

  onReserve(): void {
    if (this.listingId) {
      this.checkoutModal.open(this.listingId);
    }
  }
}
