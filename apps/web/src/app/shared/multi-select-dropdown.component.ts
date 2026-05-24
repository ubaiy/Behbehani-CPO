import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  PLATFORM_ID,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

export interface MultiSelectOption {
  value: string;
  label: string;
}

let nextId = 0;

/**
 * Multi-select dropdown — generic reusable pill+panel selector.
 *
 * Used by the /browse filter panel to replace chip rows for body / transmission /
 * fuel groups. SSR-safe (PLATFORM_ID guarded document:click), keyboard accessible
 * (Esc to close), and brand-locked (brand-50/brand-300/brand-700 only).
 */
@Component({
  selector: 'app-multi-select-dropdown',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, TranslateModule],
  template: `
    <div class="relative inline-block">
      <!-- Trigger pill -->
      <button
        type="button"
        [id]="triggerId"
        (click)="toggle()"
        (keydown)="onTriggerKey($event)"
        [attr.aria-haspopup]="'listbox'"
        [attr.aria-expanded]="open()"
        [attr.aria-controls]="panelId"
        class="inline-flex items-center gap-1 rounded-pill border px-3 py-1.5 text-[12px] font-semibold transition-colors min-h-[36px]"
        [class]="triggerClass()"
      >
        <span>{{ label() }}</span>
        @if (value().length > 0) {
          <span class="ms-1.5 rounded-full bg-brand-700 text-white text-[10px] px-1.5 py-0.5 leading-none font-bold">
            {{ value().length }}
          </span>
        }
        <svg
          viewBox="0 0 24 24"
          width="12"
          height="12"
          fill="none"
          stroke="currentColor"
          stroke-width="2.4"
          class="ms-1 transition-transform"
          [class.rotate-180]="open()"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      <!-- Panel -->
      @if (open()) {
        <div
          [id]="panelId"
          role="listbox"
          [attr.aria-labelledby]="triggerId"
          [attr.aria-multiselectable]="true"
          class="absolute start-0 end-0 sm:end-auto top-full mt-2 sm:min-w-[220px] rounded-2xl border border-line bg-white p-3 shadow-brand max-h-72 overflow-y-auto z-50"
        >
          <!-- Clear link (only if any selected) -->
          @if (value().length > 0) {
            <div class="flex items-center justify-end mb-2">
              <button
                type="button"
                (click)="clearAll()"
                class="text-[12px] text-muted hover:text-ink transition-colors"
              >
                {{ 'browse.filter.clearGroup' | translate }}
              </button>
            </div>
          }

          <!-- Options -->
          <ul class="flex flex-col gap-0.5" role="presentation">
            @for (opt of options(); track opt.value) {
              <li role="presentation">
                <label
                  class="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-2 min-h-[40px] hover:bg-surface-soft transition-colors"
                >
                  <input
                    type="checkbox"
                    class="rounded border-line text-brand-700 focus:ring-brand-500 focus:ring-2 focus:ring-offset-0 w-4 h-4"
                    [checked]="isSelected(opt.value)"
                    (change)="onToggle(opt.value)"
                    role="option"
                    [attr.aria-selected]="isSelected(opt.value)"
                  />
                  <span class="text-[13px] text-ink-2 flex-1">{{ opt.label }}</span>
                </label>
              </li>
            }
          </ul>

          <!-- Done button -->
          <button
            type="button"
            (click)="close()"
            class="mt-3 bg-brand-700 hover:bg-brand-800 text-white rounded-pill px-4 py-2 text-[13px] font-semibold w-full transition-colors min-h-[40px]"
          >
            {{ 'browse.filter.doneGroup' | translate }}
          </button>
        </div>
      }
    </div>
  `,
})
export class MultiSelectDropdownComponent {
  readonly label = input.required<string>();
  readonly options = input.required<ReadonlyArray<MultiSelectOption>>();
  readonly value = input<ReadonlyArray<string>>([]);
  readonly valueChange = output<ReadonlyArray<string>>();

  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly platformId = inject(PLATFORM_ID);

  readonly open = signal(false);

  private readonly id = ++nextId;
  readonly triggerId = `app-multi-select-${this.id}-trigger`;
  readonly panelId = `app-multi-select-${this.id}-panel`;

  readonly triggerClass = computed(() => {
    if (this.open()) {
      return 'bg-brand-50 border-brand-300 text-brand-700';
    }
    if (this.value().length > 0) {
      return 'bg-brand-50 border-brand-200 text-brand-700 hover:border-brand-300';
    }
    return 'bg-white border-line-2 text-ink-2 hover:border-brand-300';
  });

  isSelected(v: string): boolean {
    return this.value().includes(v);
  }

  toggle(): void {
    this.open.update((v) => !v);
  }

  close(): void {
    this.open.set(false);
  }

  onToggle(v: string): void {
    const current = this.value();
    const next = current.includes(v) ? current.filter((x) => x !== v) : [...current, v];
    this.valueChange.emit(next);
  }

  clearAll(): void {
    this.valueChange.emit([]);
  }

  onTriggerKey(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      this.open.set(false);
    } else if ((e.key === 'Enter' || e.key === ' ') && !this.open()) {
      e.preventDefault();
      this.open.set(true);
    }
  }

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (!this.open()) return;
    const target = e.target as Node | null;
    if (target && !this.host.nativeElement.contains(target)) {
      this.open.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open()) this.open.set(false);
  }
}
