import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

/**
 * Post-submit success state. Kept identical to v1 so existing
 * conciergeSuccess.* i18n keys stay untouched.
 */
@Component({
  selector: 'app-concierge-success-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, TranslateModule],
  template: `
    <div class="mx-auto max-w-2xl rounded-3xl border border-brand-200 bg-white p-6 shadow-brand sm:p-10">
      <div class="inline-flex items-center gap-2 rounded-pill bg-brand-100 px-3 py-1 text-[11px] font-semibold text-brand-700">
        <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true"><path d="M5 13l4 4L19 7"/></svg>
        {{ 'sell.conciergeSuccess.badge' | translate }}
      </div>
      <h1 class="mt-4 font-display text-[clamp(22px,2.6vw,30px)] font-bold tracking-[-0.025em] text-ink">
        {{ 'sell.conciergeSuccess.title' | translate: { name: customerName() } }}
      </h1>
      <p class="mt-2 text-[14px] text-muted">{{ 'sell.conciergeSuccess.sub' | translate }}</p>

      <div class="mt-6 rounded-2xl border border-brand-100 bg-brand-50/60 p-5">
        <div class="text-[11px] font-semibold uppercase tracking-wide text-brand-700">{{ 'sell.conciergeSuccess.refLabel' | translate }}</div>
        <div class="mt-1 font-display text-[26px] font-bold tabular-nums text-ink">{{ bookingRef() }}</div>
        <div class="mt-1 text-[12px] text-muted">{{ 'sell.conciergeSuccess.saveRef' | translate }}</div>
      </div>

      <div class="mt-6">
        <h2 class="text-[14px] font-bold uppercase tracking-wide text-ink-3">{{ 'sell.conciergeSuccess.next' | translate }}</h2>
        <ol class="mt-3 flex flex-col gap-3">
          @for (n of [1, 2, 3, 4]; track n) {
            <li class="flex items-start gap-3 rounded-xl border border-line bg-white p-3">
              <span class="inline-grid h-7 w-7 flex-shrink-0 place-items-center rounded-full bg-brand-700 text-[12px] font-bold text-white">{{ n }}</span>
              <span class="text-[13px] leading-relaxed text-ink-2">{{ 'sell.conciergeSuccess.step' + n | translate }}</span>
            </li>
          }
        </ol>
      </div>

      <a [routerLink]="['/', locale()]" class="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-pill bg-brand-700 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-800">
        {{ 'sell.conciergeSuccess.home' | translate }}
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true">
          <path [attr.d]="arrowPath()" />
        </svg>
      </a>
    </div>
  `,
})
export class ConciergeSuccessCardComponent {
  readonly customerName = input<string>('');
  readonly bookingRef = input<string>('');
  readonly locale = input<'en' | 'ar'>('en');
  readonly arrowPath = input<string>('M10 6l6 6-6 6');
}
