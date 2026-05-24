import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

interface DayCard {
  iso: string;
  day: number;
  monthLabel: string;
  dowLabel: string;
  specialKey: 'today' | 'tomorrow' | null;
}

/**
 * Horizontal scrollable strip of 14 day-cards (tomorrow → +13 days), replacing
 * the native date picker. Selected state uses the brand-blue border + bg
 * pattern from the approved mockup.
 *
 * `value` is an ISO yyyy-MM-dd string. We emit `(dateChange)` with the same
 * shape so the parent can keep using its existing FormState.preferredDate
 * field unchanged.
 */
@Component({
  selector: 'app-date-strip',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, TranslateModule],
  template: `
    <div class="-mx-2 px-2 overflow-x-auto">
      <div class="flex gap-2 min-w-min pb-2" role="radiogroup" [attr.aria-label]="ariaLabel()">
        @for (d of days(); track d.iso) {
          <button
            type="button"
            role="radio"
            [attr.aria-checked]="value() === d.iso"
            (click)="select(d.iso)"
            [class]="cardClass(d.iso)"
          >
            <span
              class="text-[10px] font-semibold uppercase tracking-wider"
              [class.text-brand-700]="d.specialKey === 'tomorrow' || value() === d.iso"
              [class.text-muted]="d.specialKey !== 'tomorrow' && value() !== d.iso"
            >
              @if (d.specialKey === 'tomorrow') {
                {{ 'sell.concierge.location.tomorrowLabel' | translate }}
              } @else if (d.specialKey === 'today') {
                {{ 'sell.concierge.location.todayLabel' | translate }}
              } @else {
                {{ d.dowLabel }}
              }
            </span>
            <span
              class="font-display text-[20px] font-bold leading-none mt-0.5"
              [class.text-brand-900]="value() === d.iso"
              [class.text-ink]="value() !== d.iso"
            >
              {{ d.day }}
            </span>
            <span
              class="text-[10px]"
              [class.text-brand-700]="value() === d.iso"
              [class.text-muted]="value() !== d.iso"
            >
              {{ d.monthLabel }}
            </span>
          </button>
        }
      </div>
    </div>
  `,
})
export class DateStripComponent {
  private readonly translate = inject(TranslateService);

  readonly value = input<string>('');
  readonly locale = input<'en' | 'ar'>('en');
  /** First offset (in days) from today. Defaults to 1 (tomorrow). */
  readonly startOffset = input<number>(1);
  /** Number of day-cards to render. Defaults to 14. */
  readonly count = input<number>(14);

  readonly dateChange = output<string>();

  readonly ariaLabel = computed(() =>
    this.translate.instant('sell.concierge.location.dateStripLabel'),
  );

  readonly days = computed<DayCard[]>(() => {
    const out: DayCard[] = [];
    const loc = this.locale();
    const intl = loc === 'ar' ? 'ar' : 'en';
    const dowFmt = new Intl.DateTimeFormat(intl, { weekday: 'short' });
    const monthFmt = new Intl.DateTimeFormat(intl, { month: 'short' });

    const base = new Date();
    const offset = this.startOffset();
    const total = this.count();

    for (let i = 0; i < total; i++) {
      const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + offset + i);
      const iso = isoLocal(d);
      const dayNo = offset + i;
      let specialKey: DayCard['specialKey'] = null;
      if (dayNo === 0) specialKey = 'today';
      else if (dayNo === 1) specialKey = 'tomorrow';
      out.push({
        iso,
        day: d.getDate(),
        monthLabel: monthFmt.format(d),
        dowLabel: dowFmt.format(d),
        specialKey,
      });
    }
    return out;
  });

  select(iso: string): void {
    this.dateChange.emit(iso);
  }

  /** Pre-composes the class string to avoid Angular's `[class.X]` binding
      choking on Tailwind variant prefixes like `hover:` that contain `:`. */
  cardClass(iso: string): string {
    const base =
      'flex-shrink-0 flex flex-col items-center justify-center w-[68px] min-h-[80px] rounded-2xl px-2 py-3 transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2';
    const selected = 'border-2 border-brand-700 bg-brand-50 ring-2 ring-brand-200';
    const unselected = 'border border-line bg-white hover:border-brand-300';
    return `${base} ${this.value() === iso ? selected : unselected}`;
  }
}

function isoLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
