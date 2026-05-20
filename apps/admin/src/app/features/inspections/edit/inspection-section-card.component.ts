import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';

/**
 * Collapsible section wrapper using signal-driven open state.
 * Replaces <details> from the mockup — same visual chrome.
 * Matches the rounded-xl, border-slate-200, p-4/p-5 cards from mockup 02.
 */
@Component({
  selector: 'admin-inspection-section-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      [id]="sectionId"
      class="bg-white rounded-xl border border-slate-200 mb-4 scroll-mt-20 overflow-hidden"
    >
      <!-- Header — click to toggle -->
      <header
        class="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-slate-50 transition-colors"
        [class.border-b]="open"
        [class.border-slate-100]="open"
        (click)="openChange.emit(!open)"
      >
        <div class="flex items-center gap-3">
          <svg class="w-5 h-5 flex-shrink-0" [class.text-brand-600]="allScored" [class.text-slate-400]="!allScored" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" [attr.d]="iconPath"/>
          </svg>
          <div>
            <h3 class="text-sm font-semibold text-slate-800">{{ title }}</h3>
            <p class="text-xs text-slate-500">{{ summary }}</p>
          </div>
        </div>
        <div class="flex items-center gap-2 text-xs text-slate-400">
          <svg
            class="w-4 h-4 transition-transform"
            [class.rotate-180]="open"
            fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/>
          </svg>
        </div>
      </header>

      <!-- Content — shown when open -->
      @if (open) {
        <div class="divide-y divide-slate-100">
          <ng-content />
        </div>
      }
    </section>
  `,
})
export class InspectionSectionCardComponent {
  @Input({ required: true }) sectionId!: string;
  @Input({ required: true }) title!: string;
  @Input({ required: true }) summary!: string;
  @Input() iconPath = 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z';
  @Input() open = false;
  @Input() allScored = false;

  @Output() openChange = new EventEmitter<boolean>();
}
