import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { LanguageService } from '@behbehani-cpo/shared-i18n';
import { fmtKwd } from '../../data/kwd';

interface Bank {
  id: string;
  short: string;
  apr: number;
}

const BANKS: ReadonlyArray<Bank> = [
  { id: 'nbk', short: 'NBK', apr: 4.25 },
  { id: 'kfh', short: 'KFH', apr: 4.5 },
  { id: 'boubyan', short: 'Boubyan', apr: 4.75 },
];

/**
 * Finance calculator card. Takes the vehicle price (in KWD) and the user
 * picks down-payment %, tenure (months) and lender. Computes monthly using
 * the standard amortisation formula: `P * r / (1 - (1+r)^-n)`. When APR is 0
 * (edge case) falls back to a flat `P / n` so we never divide by zero.
 */
@Component({
  selector: 'app-vdp-finance-calc',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule],
  template: `
    <section class="rounded-2xl border border-line bg-white p-5 lg:p-6">
      <header class="mb-5 flex items-start gap-3">
        <div class="grid h-10 w-10 flex-shrink-0 place-items-center rounded-full bg-brand-700/10 text-brand-700">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 7h6M9 11h6M9 15h3"/></svg>
        </div>
        <div>
          <h2 class="font-display text-xl font-bold text-ink">{{ 'vdp.finance.title' | translate }}</h2>
          <p class="text-sm text-muted">{{ 'vdp.finance.sub' | translate }}</p>
        </div>
      </header>

      <div class="grid gap-5 lg:grid-cols-[1.05fr_1fr] lg:gap-8">
        <!-- Controls -->
        <div class="space-y-6 rounded-xl bg-surface-soft p-5 lg:p-6">
          <div>
            <div class="mb-2 flex items-baseline justify-between">
              <label for="vdp-down" class="text-sm font-semibold text-ink">{{ 'vdp.finance.downPayment' | translate }}</label>
              <span class="font-display text-lg font-bold text-brand-700">{{ down() }}%</span>
            </div>
            <input
              id="vdp-down"
              type="range"
              min="0"
              max="60"
              step="5"
              [value]="down()"
              (input)="down.set(+$any($event.target).value)"
              class="vdp-slider w-full"
              [style.--fill-pct]="downFillPct() + '%'"
            />
            <div class="mt-1.5 text-xs text-muted">{{ downKwd() }}</div>
          </div>

          <div>
            <div class="mb-2 flex items-baseline justify-between">
              <label for="vdp-tenure" class="text-sm font-semibold text-ink">{{ 'vdp.finance.tenure' | translate }}</label>
              <span class="font-display text-lg font-bold text-brand-700">
                {{ tenure() }} {{ 'vdp.finance.months' | translate }}
              </span>
            </div>
            <input
              id="vdp-tenure"
              type="range"
              min="12"
              max="84"
              step="6"
              [value]="tenure()"
              (input)="tenure.set(+$any($event.target).value)"
              class="vdp-slider w-full"
              [style.--fill-pct]="tenureFillPct() + '%'"
            />
            <div class="mt-1.5 text-xs text-muted">{{ tenureYears() }} {{ 'vdp.finance.years' | translate }}</div>
          </div>

          <div>
            <label class="mb-2 block text-sm font-semibold text-ink">{{ 'vdp.finance.lender' | translate }}</label>
            <div class="flex flex-wrap gap-2">
              @for (b of banks; track b.id; let i = $index) {
                <button
                  type="button"
                  class="flex items-center gap-2 rounded-pill border px-3 py-1.5 text-sm font-semibold transition-colors"
                  [class.border-brand-700]="i === bankIdx()"
                  [class.bg-brand-700]="i === bankIdx()"
                  [class.text-white]="i === bankIdx()"
                  [class.border-line-2]="i !== bankIdx()"
                  [class.bg-white]="i !== bankIdx()"
                  [class.text-ink]="i !== bankIdx()"
                  (click)="bankIdx.set(i)"
                  [attr.aria-pressed]="i === bankIdx()"
                >
                  {{ b.short }}
                  <span class="opacity-80">{{ b.apr }}%</span>
                </button>
              }
            </div>
          </div>
        </div>

        <!-- Result -->
        <div class="rounded-xl border border-brand-100 bg-gradient-to-br from-brand-50 to-white p-5 lg:p-6">
          <div class="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">
            {{ 'vdp.finance.estMonthly' | translate }}
          </div>
          <div class="mb-5 font-display text-[34px] font-extrabold leading-none tracking-tight text-ink">
            {{ monthlyLabel() }}
            <span class="text-base font-medium text-muted">/{{ 'vdp.finance.month' | translate }}</span>
          </div>

          <dl class="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-line pt-4 text-sm">
            <div>
              <dt class="text-xs text-muted">{{ 'vdp.finance.principal' | translate }}</dt>
              <dd class="font-semibold text-ink">{{ principalLabel() }}</dd>
            </div>
            <div>
              <dt class="text-xs text-muted">{{ 'vdp.finance.apr' | translate }}</dt>
              <dd class="font-semibold text-ink">{{ currentBank().apr }}%</dd>
            </div>
            <div>
              <dt class="text-xs text-muted">{{ 'vdp.finance.interest' | translate }}</dt>
              <dd class="font-semibold text-ink">{{ interestLabel() }}</dd>
            </div>
            <div>
              <dt class="text-xs text-muted">{{ 'vdp.finance.totalPayable' | translate }}</dt>
              <dd class="font-semibold text-ink">{{ totalLabel() }}</dd>
            </div>
          </dl>

          <p class="mt-4 flex items-start gap-1.5 text-[11px] leading-relaxed text-muted">
            <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" class="mt-0.5 flex-shrink-0" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16v.5"/></svg>
            {{ 'vdp.finance.disclaimer' | translate }}
          </p>
        </div>
      </div>
    </section>
  `,
  styles: [`
    /* v1.5-D21 polish: filled-track + bigger thumb so the slider feels
       like a real control. Track uses a CSS variable --fill-pct set
       inline from the component (0%-100%) so the brand-blue portion
       grows/shrinks live as user drags. RTL flips automatically because
       we use the logical 'right' direction via the gradient stops. */
    .vdp-slider {
      -webkit-appearance: none;
      appearance: none;
      width: 100%;
      height: 8px;
      background: linear-gradient(
        to right,
        rgb(29 78 216) 0%,
        rgb(29 78 216) var(--fill-pct, 0%),
        rgb(226 232 240) var(--fill-pct, 0%),
        rgb(226 232 240) 100%
      );
      border-radius: 9999px;
      outline: none;
      transition: background 0.1s ease-out;
    }
    [dir='rtl'] .vdp-slider {
      background: linear-gradient(
        to left,
        rgb(29 78 216) 0%,
        rgb(29 78 216) var(--fill-pct, 0%),
        rgb(226 232 240) var(--fill-pct, 0%),
        rgb(226 232 240) 100%
      );
    }
    .vdp-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 22px;
      height: 22px;
      background: #ffffff;
      border: 3px solid rgb(29 78 216);
      border-radius: 9999px;
      cursor: grab;
      box-shadow: 0 2px 6px rgba(15, 23, 42, 0.22);
      transition: transform 0.1s ease-out, box-shadow 0.1s ease-out;
    }
    .vdp-slider::-webkit-slider-thumb:hover {
      transform: scale(1.08);
      box-shadow: 0 3px 10px rgba(29, 78, 216, 0.32);
    }
    .vdp-slider::-webkit-slider-thumb:active {
      cursor: grabbing;
      transform: scale(1.12);
    }
    .vdp-slider:focus-visible::-webkit-slider-thumb {
      outline: 3px solid rgb(147 197 253);
      outline-offset: 2px;
    }
    .vdp-slider::-moz-range-thumb {
      width: 22px;
      height: 22px;
      background: #ffffff;
      border: 3px solid rgb(29 78 216);
      border-radius: 9999px;
      cursor: grab;
      box-shadow: 0 2px 6px rgba(15, 23, 42, 0.22);
      transition: transform 0.1s ease-out, box-shadow 0.1s ease-out;
    }
    .vdp-slider::-moz-range-thumb:hover {
      transform: scale(1.08);
      box-shadow: 0 3px 10px rgba(29, 78, 216, 0.32);
    }
    .vdp-slider::-moz-range-thumb:active {
      cursor: grabbing;
      transform: scale(1.12);
    }
  `],
})
export class VdpFinanceCalcComponent {
  /** Vehicle price in KWD (whole units, not fils). */
  readonly priceKwd = input.required<number>();

  readonly banks = BANKS;
  readonly down = signal(20);
  readonly tenure = signal(60);
  readonly bankIdx = signal(0);

  private readonly language = inject(LanguageService);
  readonly locale = computed(() => this.language.current());

  readonly currentBank = computed(() => this.banks[this.bankIdx()] ?? this.banks[0]);

  /** Principal = price × (1 − down/100). */
  readonly principal = computed(() => this.priceKwd() * (1 - this.down() / 100));

  /** Monthly payment via standard amortisation; flat fallback if APR is 0. */
  readonly monthly = computed(() => {
    const p = this.principal();
    const n = this.tenure();
    const apr = this.currentBank().apr;
    if (n <= 0) return 0;
    if (apr <= 0) return p / n;
    const r = apr / 100 / 12;
    return (p * r) / (1 - Math.pow(1 + r, -n));
  });

  readonly interest = computed(() => this.monthly() * this.tenure() - this.principal());

  readonly total = computed(() => this.monthly() * this.tenure() + (this.priceKwd() - this.principal()));

  readonly monthlyLabel = computed(() => fmtKwd(Math.round(this.monthly()), this.locale()));
  readonly principalLabel = computed(() => fmtKwd(Math.round(this.principal()), this.locale()));
  readonly interestLabel = computed(() => fmtKwd(Math.round(this.interest()), this.locale()));
  readonly totalLabel = computed(() => fmtKwd(Math.round(this.total()), this.locale()));
  readonly downKwd = computed(() => fmtKwd(Math.round(this.priceKwd() * this.down() / 100), this.locale()));
  readonly tenureYears = computed(() => Math.round(this.tenure() / 12));

  // v1.5-D21: live fill-percentage for the slider track gradient. CSS reads
  // these via the --fill-pct CSS variable bound in the template. Min/max
  // mirror the <input type="range"> attributes (down: 0-60, tenure: 12-84).
  readonly downFillPct = computed(() => Math.round((this.down() / 60) * 100));
  readonly tenureFillPct = computed(() => Math.round(((this.tenure() - 12) / (84 - 12)) * 100));
}
