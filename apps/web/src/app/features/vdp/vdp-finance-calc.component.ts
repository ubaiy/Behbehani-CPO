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

      <div class="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <!-- Controls -->
        <div class="space-y-5">
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
        <div class="rounded-xl bg-surface-soft p-5">
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
    .vdp-slider {
      -webkit-appearance: none;
      appearance: none;
      height: 6px;
      background: rgb(226 232 240);
      border-radius: 9999px;
      outline: none;
    }
    .vdp-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 20px;
      height: 20px;
      background: #ffffff;
      border: 2px solid rgb(30 58 138);
      border-radius: 9999px;
      cursor: grab;
      box-shadow: 0 1px 4px rgba(15, 23, 42, 0.18);
    }
    .vdp-slider::-moz-range-thumb {
      width: 20px;
      height: 20px;
      background: #ffffff;
      border: 2px solid rgb(30 58 138);
      border-radius: 9999px;
      cursor: grab;
      box-shadow: 0 1px 4px rgba(15, 23, 42, 0.18);
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
}
