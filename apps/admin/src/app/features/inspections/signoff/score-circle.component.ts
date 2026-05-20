import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

/**
 * SVG ring score circle with brand-blue stroke + score centred.
 * Matches the circular progress in mockup 03.
 */
@Component({
  selector: 'admin-score-circle',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative flex-shrink-0" [style.width.px]="sizePx" [style.height.px]="sizePx">
      <svg [attr.viewBox]="'0 0 36 36'" class="w-full h-full">
        <circle
          cx="18" cy="18" r="15.9155"
          fill="none" stroke="#e2e8f0" stroke-width="2.5"
        />
        <circle
          cx="18" cy="18" r="15.9155"
          fill="none" stroke="currentColor" stroke-width="2.5"
          class="text-brand-600"
          [attr.stroke-dasharray]="dashArray"
          stroke-dashoffset="25"
          transform="rotate(-90 18 18)"
          stroke-linecap="round"
        />
      </svg>
      <div class="absolute inset-0 flex flex-col items-center justify-center">
        <span class="font-bold text-slate-800 tabular-nums" [class.text-2xl]="size === 'lg'" [class.text-base]="size === 'sm'">
          {{ score !== null ? score : '—' }}
        </span>
        <span class="text-slate-500" [class.text-xs]="size === 'lg'" [class.text-[10px]]="size === 'sm'">/ 100</span>
      </div>
    </div>
  `,
})
export class ScoreCircleComponent {
  @Input() score: number | null = null;
  @Input() size: 'sm' | 'lg' = 'lg';

  get sizePx(): number {
    return this.size === 'lg' ? 96 : 64;
  }

  get dashArray(): string {
    const s = this.score ?? 0;
    // r=15.9155 was chosen so that 2π×r ≈ 100, making the dasharray
    // map directly to score percentage. circumference = 2π×15.9155 ≈ 100.
    const circumference = 100;
    return `${((s / 100) * circumference).toFixed(1)} ${circumference}`;
  }
}
