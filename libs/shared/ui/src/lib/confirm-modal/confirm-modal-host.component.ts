import {
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  signal,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConfirmModalService } from './confirm-modal.service';
import type { ConfirmOptions, ConfirmVariant } from './confirm-modal.types';

/**
 * ConfirmModalHostComponent
 *
 * Add once to the admin shell template:
 *   <sui-confirm-modal-host />
 *
 * The ConfirmModalService drives open/close via a signal.
 * No @angular/animations required — uses the native <dialog> element.
 */
@Component({
  selector: 'sui-confirm-modal-host',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styles: [`
    dialog {
      border: none;
      padding: 0;
      max-width: 28rem;
      width: calc(100% - 2rem);
      border-radius: 0.75rem;
      box-shadow: 0 20px 60px -12px rgba(0,0,0,0.38), 0 8px 24px -6px rgba(0,0,0,0.18);
      overflow: hidden;
    }
    dialog::backdrop {
      background: rgba(15, 23, 42, 0.40);
    }
    @keyframes sui-spin {
      to { transform: rotate(360deg); }
    }
    .sui-spinner {
      display: inline-block;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      border: 2px solid rgba(255,255,255,0.35);
      border-top-color: white;
      animation: sui-spin 0.65s linear infinite;
      flex-shrink: 0;
    }
  `],
  template: `
    @if (state()) {
      <dialog
        #dialogRef
        (click)="onBackdropClick($event)"
        (cancel)="onNativeCancel($event)"
      >
        <!-- Severe variant: red top accent stripe -->
        @if (variant() === 'severe') {
          <div class="h-1 w-full bg-gradient-to-r from-red-600 to-red-700"></div>
        }

        <div class="p-6">

          <!-- Title row with icon -->
          <div class="flex items-start gap-3 mb-3">
            <div
              class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
              [class]="iconBgClass()"
            >
              <!-- Standard: info circle -->
              @if (variant() === 'standard') {
                <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              }
              <!-- Destructive: archive/trash icon -->
              @if (variant() === 'destructive') {
                <svg class="w-4 h-4 text-red-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"/>
                </svg>
              }
              <!-- Severe: trash delete icon -->
              @if (variant() === 'severe') {
                <svg class="w-4 h-4 text-red-700" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
              }
            </div>

            <div>
              <h2 class="text-base font-semibold text-slate-800 leading-snug">
                {{ state()!.options.title }}
              </h2>
            </div>
          </div>

          <!-- Body text (newlines respected) -->
          <p class="text-sm text-slate-600 mt-2 leading-relaxed whitespace-pre-line"
             [class.mb-3]="hasCallout()"
             [class.mb-5]="!hasCallout() && !opts()!.requireTyped"
          >
            {{ state()!.options.body }}
          </p>

          <!-- Destructive warning callout (red-50 bg, no border) -->
          @if (variant() === 'destructive' && opts()!.body) {
            <div class="rounded-md bg-red-50 px-3 py-2.5 mb-4">
              <p class="text-xs font-medium text-red-700 flex items-center gap-1.5">
                <svg class="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
                </svg>
                This action is logged in the audit trail.
              </p>
            </div>
          }

          <!-- Severe callout: cannot be undone -->
          @if (variant() === 'severe') {
            <div class="rounded-md bg-red-50 px-3 py-3 mb-5 flex items-start gap-2">
              <svg class="w-4 h-4 text-red-700 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
              <p class="text-xs font-semibold text-red-700">This action cannot be undone.</p>
            </div>
          }

          <!-- Type-to-confirm input (destructive variant with requireTyped) -->
          @if (opts()!.requireTyped) {
            <div class="mb-5">
              <label class="block text-xs font-medium text-slate-600 mb-1">
                Type
                <code class="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-1 rounded mx-0.5">{{ opts()!.requireTyped }}</code>
                to confirm
              </label>
              <input
                #typedInputRef
                type="text"
                [(ngModel)]="typedValue"
                [disabled]="loading()"
                autocomplete="off"
                autocorrect="off"
                spellcheck="false"
                class="w-full rounded-md border px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-offset-1"
                [class]="typedInputClass()"
                (keydown.enter)="onEnter()"
              />
            </div>
          }

          <!-- Error message display -->
          @if (errorMsg()) {
            <div class="rounded-md bg-red-50 px-3 py-2.5 mb-4">
              <p class="text-xs font-medium text-red-700">{{ errorMsg() }}</p>
            </div>
          }

          <!-- Action buttons -->
          <div class="flex items-center justify-end gap-2.5">
            <button
              #cancelBtnRef
              type="button"
              [disabled]="loading()"
              (click)="onCancel()"
              class="px-4 py-2 rounded-md border border-slate-300 text-sm font-medium text-slate-700 bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
              [class.opacity-60]="loading()"
              [class.cursor-not-allowed]="loading()"
              [class.hover:bg-slate-50]="!loading()"
            >
              {{ opts()!.cancelLabel ?? 'Cancel' }}
            </button>

            <button
              #confirmBtnRef
              type="button"
              [disabled]="loading() || confirmDisabled()"
              [attr.aria-disabled]="loading() || confirmDisabled()"
              (click)="onConfirm()"
              (keydown.enter)="onConfirm()"
              class="px-4 py-2 rounded-md text-sm font-semibold text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 flex items-center gap-2"
              [class]="confirmBtnClass()"
            >
              @if (loading()) {
                <span class="sui-spinner" aria-hidden="true"></span>
                Working&hellip;
              } @else {
                {{ opts()!.confirmLabel ?? 'Confirm' }}
              }
            </button>
          </div>

        </div>
      </dialog>
    }
  `,
})
export class ConfirmModalHostComponent {
  private readonly svc = inject(ConfirmModalService);

  @ViewChild('dialogRef') private readonly dialogRef?: ElementRef<HTMLDialogElement>;
  @ViewChild('cancelBtnRef') private readonly cancelBtnRef?: ElementRef<HTMLButtonElement>;
  @ViewChild('typedInputRef') private readonly typedInputRef?: ElementRef<HTMLInputElement>;

  protected readonly state = this.svc.state;
  protected readonly loading = signal(false);
  protected readonly errorMsg = signal<string | null>(null);
  protected readonly typedValue = signal('');

  protected readonly opts = computed(() => this.state()?.options ?? null);

  protected readonly variant = computed<ConfirmVariant>(
    () => this.opts()?.variant ?? 'standard',
  );

  protected readonly hasCallout = computed(
    () => this.variant() === 'destructive' || this.variant() === 'severe',
  );

  protected readonly confirmDisabled = computed(() => {
    const req = this.opts()?.requireTyped;
    if (!req) return false;
    return this.typedValue() !== req;
  });

  protected readonly iconBgClass = computed(() => {
    switch (this.variant()) {
      case 'destructive':
        return 'bg-red-50 border border-red-100';
      case 'severe':
        return 'bg-red-100 border border-red-200';
      default:
        return 'bg-blue-50 border border-blue-100';
    }
  });

  protected readonly confirmBtnClass = computed(() => {
    const disabled = this.loading() || this.confirmDisabled();
    const base = 'focus:ring-offset-1';

    switch (this.variant()) {
      case 'destructive':
        return disabled
          ? `${base} bg-red-300 cursor-not-allowed opacity-60 focus:ring-red-400`
          : `${base} bg-red-600 hover:bg-red-700 focus:ring-red-400`;
      case 'severe':
        return disabled
          ? `${base} bg-red-400 cursor-not-allowed opacity-60 focus:ring-red-500`
          : `${base} bg-red-700 hover:bg-red-800 focus:ring-red-500`;
      default:
        return disabled
          ? `${base} bg-blue-300 cursor-not-allowed opacity-60 focus:ring-blue-500`
          : `${base} bg-blue-600 hover:bg-blue-700 focus:ring-blue-500`;
    }
  });

  protected readonly typedInputClass = computed(() => {
    const matched = this.typedValue() === this.opts()?.requireTyped;
    return matched
      ? 'border-red-300 bg-red-50 text-red-700 font-semibold tracking-widest focus:ring-red-400'
      : 'border-slate-300 bg-white text-slate-700 focus:ring-red-300';
  });

  constructor() {
    // Watch service state — open/close the native dialog accordingly.
    effect(() => {
      const active = this.state();
      // Use queueMicrotask to ensure the ViewChild is in the DOM after @if renders.
      queueMicrotask(() => {
        const el = this.dialogRef?.nativeElement;
        if (!el) return;

        if (active && !el.open) {
          this.loading.set(false);
          this.errorMsg.set(null);
          this.typedValue.set('');
          el.showModal();

          // Auto-focus: input if requireTyped, else cancel button.
          queueMicrotask(() => {
            if (active.options.requireTyped) {
              this.typedInputRef?.nativeElement.focus();
            } else {
              this.cancelBtnRef?.nativeElement.focus();
            }
          });
        } else if (!active && el.open) {
          el.close();
        }
      });
    });
  }

  protected onBackdropClick(event: MouseEvent): void {
    const el = this.dialogRef?.nativeElement;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const outside =
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom;
    if (outside) {
      this.onCancel();
    }
  }

  /** The native <dialog> cancel event fires on ESC. */
  protected onNativeCancel(event: Event): void {
    event.preventDefault(); // prevent browser from closing dialog itself
    this.onCancel();
  }

  protected onCancel(): void {
    if (this.loading()) return;
    this.svc._resolve(false);
  }

  protected onEnter(): void {
    if (!this.loading() && !this.confirmDisabled()) {
      void this.onConfirm();
    }
  }

  protected async onConfirm(): Promise<void> {
    if (this.loading() || this.confirmDisabled()) return;

    const onConfirmFn = this.opts()?.onConfirm;

    if (!onConfirmFn) {
      this.svc._resolve(true);
      return;
    }

    this.loading.set(true);
    this.errorMsg.set(null);

    try {
      await onConfirmFn();
      this.loading.set(false);
      this.svc._resolve(true);
    } catch (err: unknown) {
      this.loading.set(false);
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === 'string'
            ? err
            : 'An unexpected error occurred. Please try again.';
      this.errorMsg.set(msg);
      // Modal stays open — user can retry or cancel.
    }
  }
}
