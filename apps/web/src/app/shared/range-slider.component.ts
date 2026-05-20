import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
} from '@angular/core';

/**
 * Dual-handle range slider with a colored track between handles.
 * Built from two stacked native `<input type="range">` (well-known a11y pattern).
 *
 * Emits a two-tuple `[min, max]` on change. Always clamps so the low handle
 * stays ≤ the high handle.
 */
@Component({
  selector: 'app-range-slider',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="w-full">
      <div class="mb-3 flex items-center justify-between text-[12px] font-semibold text-ink">
        <span>{{ format()(value()[0]) }}</span>
        <span class="text-muted">—</span>
        <span>{{ format()(value()[1]) }}</span>
      </div>
      <div class="relative h-5">
        <!-- Track background -->
        <div class="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-line-2"></div>
        <!-- Active range -->
        <div
          class="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-brand-700"
          [style.left.%]="pctLow()"
          [style.right.%]="100 - pctHigh()"
        ></div>
        <!-- Low handle -->
        <input
          type="range"
          [min]="min()"
          [max]="max()"
          [step]="step()"
          [value]="value()[0]"
          (input)="onLow($event)"
          class="range-thumb absolute inset-x-0 top-0 h-full w-full appearance-none bg-transparent"
          [attr.aria-label]="ariaLabelLow()"
        />
        <!-- High handle -->
        <input
          type="range"
          [min]="min()"
          [max]="max()"
          [step]="step()"
          [value]="value()[1]"
          (input)="onHigh($event)"
          class="range-thumb absolute inset-x-0 top-0 h-full w-full appearance-none bg-transparent"
          [attr.aria-label]="ariaLabelHigh()"
        />
      </div>
    </div>
  `,
  styles: [
    `
      .range-thumb {
        pointer-events: none;
      }
      .range-thumb::-webkit-slider-thumb {
        pointer-events: auto;
        appearance: none;
        height: 18px;
        width: 18px;
        border-radius: 9999px;
        background: #ffffff;
        border: 2px solid rgb(30 58 138); /* brand-700 */
        cursor: grab;
        box-shadow: 0 1px 4px rgba(15, 23, 42, 0.12);
      }
      .range-thumb::-moz-range-thumb {
        pointer-events: auto;
        height: 18px;
        width: 18px;
        border-radius: 9999px;
        background: #ffffff;
        border: 2px solid rgb(30 58 138);
        cursor: grab;
        box-shadow: 0 1px 4px rgba(15, 23, 42, 0.12);
      }
      .range-thumb::-webkit-slider-runnable-track {
        background: transparent;
      }
      .range-thumb::-moz-range-track {
        background: transparent;
      }
    `,
  ],
})
export class RangeSliderComponent {
  readonly min = input.required<number>();
  readonly max = input.required<number>();
  readonly step = input<number>(1);
  readonly value = input.required<[number, number]>();
  readonly format = input<(v: number) => string>((v) => String(v));
  readonly ariaLabelLow = input<string>('Minimum value');
  readonly ariaLabelHigh = input<string>('Maximum value');
  readonly valueChange = output<[number, number]>();

  readonly pctLow = computed(() => this.pct(this.value()[0]));
  readonly pctHigh = computed(() => this.pct(this.value()[1]));

  private pct(v: number): number {
    const span = this.max() - this.min();
    if (span <= 0) return 0;
    return ((v - this.min()) / span) * 100;
  }

  onLow(e: Event): void {
    const v = Number((e.target as HTMLInputElement).value);
    const hi = this.value()[1];
    /* Clamp: low handle can't pass the high handle. */
    this.valueChange.emit([Math.min(v, hi), hi]);
  }

  onHigh(e: Event): void {
    const v = Number((e.target as HTMLInputElement).value);
    const lo = this.value()[0];
    this.valueChange.emit([lo, Math.max(v, lo)]);
  }
}
