import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  OnInit,
  PLATFORM_ID,
  Signal,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { LanguageService } from '@behbehani-cpo/shared-i18n';

export interface SelectOption {
  value: string;
  label: string;
  /** Optional left-aligned icon (favicon URL, data: URI, or any image src). */
  iconUrl?: string;
}

let nextId = 0;

@Component({
  selector: 'app-ui-select',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative w-full">
      <button
        type="button"
        [id]="triggerId"
        class="flex w-full flex-col gap-1 px-5 py-3.5 text-start outline-none transition-colors hover:bg-surface-cool focus-visible:ring-2 focus-visible:ring-brand-700"
        [class.bg-surface-cool]="open()"
        (click)="toggle()"
        (keydown)="onTriggerKey($event)"
        [attr.aria-haspopup]="'listbox'"
        [attr.aria-expanded]="open()"
        [attr.aria-controls]="listId"
      >
        <span class="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">{{ label() }}</span>
        <span class="flex items-center justify-between gap-2 text-sm font-semibold text-ink">
          <span class="flex min-w-0 items-center gap-2">
            @if (selectedIcon(); as iconUrl) {
              <img [src]="iconUrl" alt="" class="size-4 shrink-0 object-contain" loading="lazy" />
            }
            <span class="truncate">{{ selectedLabel() }}</span>
          </span>
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            stroke-width="2.4"
            class="flex-shrink-0 text-muted transition-transform"
            [class.rotate-180]="open()"
            aria-hidden="true"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </span>
      </button>

      @if (open()) {
        <ul
          [id]="listId"
          role="listbox"
          [attr.aria-labelledby]="triggerId"
          [attr.aria-activedescendant]="activeId()"
          tabindex="-1"
          #listEl
          (keydown)="onListKey($event)"
          class="absolute start-0 end-0 z-50 mt-2 max-h-72 overflow-auto rounded-xl border border-line bg-white p-1.5 shadow-brand-lg animate-slide-up-fade sm:end-auto sm:w-full sm:min-w-[220px]"
        >
          @for (option of options(); track option.value; let i = $index) {
            <li role="presentation">
              <button
                type="button"
                role="option"
                [id]="optionId(i)"
                [attr.aria-selected]="option.value === value()"
                tabindex="-1"
                class="flex w-full items-center justify-between gap-2 rounded-lg px-3.5 py-2.5 text-start text-sm transition-colors"
                [class.bg-brand-50]="i === activeIndex()"
                [class.text-brand-700]="i === activeIndex() || option.value === value()"
                [class.font-semibold]="option.value === value()"
                (mouseenter)="activeIndex.set(i)"
                (click)="select(option)"
              >
                <span class="flex min-w-0 items-center gap-2.5">
                  @if (option.iconUrl) {
                    <img [src]="option.iconUrl" alt="" class="size-5 shrink-0 object-contain" loading="lazy" />
                  }
                  <span class="truncate">{{ option.label }}</span>
                </span>
                @if (option.value === value()) {
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true">
                    <path d="m5 12 5 5L20 7" />
                  </svg>
                }
              </button>
            </li>
          }
        </ul>
      }
    </div>
  `,
})
export class UiSelectComponent implements OnInit {
  readonly label = input.required<string>();
  readonly options = input.required<ReadonlyArray<SelectOption>>();
  readonly value = input<string>('');
  readonly placeholder = input<string>('');
  readonly valueChange = output<string>();

  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly language = inject(LanguageService);

  readonly open = signal(false);
  readonly activeIndex = signal(0);

  private readonly id = ++nextId;
  readonly triggerId = `app-ui-select-${this.id}-trigger`;
  readonly listId = `app-ui-select-${this.id}-list`;

  readonly currentLocale: Signal<'en' | 'ar'> = computed(() => this.language.current());

  readonly selectedLabel = computed(() => {
    const v = this.value();
    if (!v) return this.placeholder() || '—';
    const hit = this.options().find((o) => o.value === v);
    return hit ? hit.label : this.placeholder() || '—';
  });

  readonly selectedIcon = computed(() => {
    const v = this.value();
    if (!v) return null;
    return this.options().find((o) => o.value === v)?.iconUrl ?? null;
  });

  readonly activeId = computed(() => this.optionId(this.activeIndex()));

  ngOnInit(): void {
    /* Sync initial active index to the currently-selected option, if any. */
    const idx = this.options().findIndex((o) => o.value === this.value());
    if (idx >= 0) this.activeIndex.set(idx);
  }

  optionId(i: number): string {
    return `app-ui-select-${this.id}-opt-${i}`;
  }

  toggle(): void {
    this.open.update((v) => !v);
    if (this.open()) {
      const idx = this.options().findIndex((o) => o.value === this.value());
      this.activeIndex.set(idx >= 0 ? idx : 0);
    }
  }

  select(option: SelectOption): void {
    this.valueChange.emit(option.value);
    this.open.set(false);
  }

  onTriggerKey(e: KeyboardEvent): void {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!this.open()) this.toggle();
    } else if (e.key === 'Escape') {
      this.open.set(false);
    }
  }

  onListKey(e: KeyboardEvent): void {
    const max = this.options().length - 1;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.activeIndex.update((i) => (i >= max ? 0 : i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.activeIndex.update((i) => (i <= 0 ? max : i - 1));
    } else if (e.key === 'Home') {
      e.preventDefault();
      this.activeIndex.set(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      this.activeIndex.set(max);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const opt = this.options()[this.activeIndex()];
      if (opt) this.select(opt);
    } else if (e.key === 'Escape' || e.key === 'Tab') {
      this.open.set(false);
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
}
