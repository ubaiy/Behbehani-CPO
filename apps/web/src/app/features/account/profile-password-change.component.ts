import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import type { PublicUser } from '@behbehani-cpo/shared-types';

/**
 * Password card (set or change). Includes a 4-bar strength meter.
 * Presentational: parent owns the three drafts (current, new, confirm), the
 * strength score, the strength label key, the can-submit flag, and the error key.
 */
@Component({
  selector: 'app-profile-password-change',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, TranslateModule],
  template: `
    <section class="rounded-3xl border border-line bg-gradient-to-br from-white to-surface-soft/40 p-6 shadow-brand">
      <h2 class="font-display text-[17px] sm:text-[18px] font-bold text-ink tracking-[-0.01em]">
        {{ 'account.profile.password.title' | translate }}
      </h2>

      @if (!panelOpen) {
        <div class="mt-4">
          <button
            type="button"
            (click)="openPanel.emit()"
            class="inline-flex min-h-[44px] items-center rounded-pill border border-line bg-white px-5 py-2.5 text-[13px] font-semibold text-ink-2 hover:bg-surface-soft transition-colors"
          >
            {{ user?.hasPassword ? ('account.profile.password.changeCta' | translate) : ('account.profile.password.setCta' | translate) }}
          </button>
        </div>
      } @else {
        <div class="mt-5 space-y-4">
          @if (user?.hasPassword) {
            <div>
              <label class="block text-[13px] font-semibold text-ink-2 mb-1.5">
                {{ 'account.profile.password.currentLabel' | translate }}
              </label>
              <input
                type="password"
                [ngModel]="currentPasswordDraft"
                (ngModelChange)="currentPasswordDraftChange.emit($event)"
                autocomplete="current-password"
                class="h-11 w-full rounded-xl border border-line px-4 text-[14px] text-ink outline-none focus:border-brand-700 focus:ring-2 focus:ring-brand-100"
              />
            </div>
          }

          <div>
            <label class="block text-[13px] font-semibold text-ink-2 mb-1.5">
              {{ 'account.profile.password.newLabel' | translate }}
            </label>
            <input
              type="password"
              [ngModel]="newPasswordDraft"
              (ngModelChange)="newPasswordDraftChange.emit($event)"
              autocomplete="new-password"
              class="h-11 w-full rounded-xl border border-line px-4 text-[14px] text-ink outline-none focus:border-brand-700 focus:ring-2 focus:ring-brand-100"
            />
            <!-- Strength meter -->
            @if (newPasswordDraft) {
              <div class="mt-2 flex gap-1.5" role="progressbar" [attr.aria-valuenow]="pwStrength" aria-valuemin="0" aria-valuemax="4">
                @for (bar of [1,2,3,4]; track bar) {
                  <div
                    class="h-1.5 flex-1 rounded-full transition-colors"
                    [ngClass]="{
                      'bg-red-500':   bar <= pwStrength && pwStrength <= 1,
                      'bg-slate-400': bar <= pwStrength && pwStrength === 2,
                      'bg-brand-500': bar <= pwStrength && pwStrength === 3,
                      'bg-brand-700': bar <= pwStrength && pwStrength === 4,
                      'bg-slate-200': bar > pwStrength
                    }"
                  ></div>
                }
              </div>
              <p class="mt-1 text-[11px]" [class]="pwStrength <= 1 ? 'text-red-500' : pwStrength === 2 ? 'text-slate-600' : 'text-brand-700'">
                {{ pwStrengthLabel | translate }}
              </p>
            }
          </div>

          <div>
            <label class="block text-[13px] font-semibold text-ink-2 mb-1.5">
              {{ 'account.profile.password.confirmLabel' | translate }}
            </label>
            <input
              type="password"
              [ngModel]="confirmPasswordDraft"
              (ngModelChange)="confirmPasswordDraftChange.emit($event)"
              autocomplete="new-password"
              class="h-11 w-full rounded-xl border border-line px-4 text-[14px] text-ink outline-none focus:border-brand-700 focus:ring-2 focus:ring-brand-100"
            />
          </div>

          @if (passwordError) {
            <p class="text-[12px] text-red-600" role="alert">{{ passwordError | translate }}</p>
          }

          <div class="flex gap-3">
            <button
              type="button"
              (click)="submit.emit()"
              [disabled]="!canSubmit || isSaving"
              class="inline-flex min-h-[44px] items-center rounded-pill bg-brand-700 px-6 text-[13px] font-semibold text-white hover:bg-brand-800 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 transition-colors"
            >
              {{ isSavingPassword ? ('account.profile.password.updatingCta' | translate) : ('account.profile.password.updateCta' | translate) }}
            </button>
            <button
              type="button"
              (click)="closePanel.emit()"
              class="inline-flex min-h-[44px] items-center rounded-pill border border-line bg-white px-5 text-[13px] font-semibold text-ink-2 hover:bg-surface-soft transition-colors"
            >
              {{ 'account.profile.email.cancelCta' | translate }}
            </button>
          </div>
        </div>
      }
    </section>
  `,
})
export class ProfilePasswordChangeComponent {
  @Input() user: PublicUser | null = null;
  @Input() panelOpen = false;
  @Input({ required: true }) currentPasswordDraft!: string;
  @Input({ required: true }) newPasswordDraft!: string;
  @Input({ required: true }) confirmPasswordDraft!: string;
  @Input({ required: true }) pwStrength!: 0 | 1 | 2 | 3 | 4;
  @Input({ required: true }) pwStrengthLabel!: string;
  @Input() passwordError: string | null = null;
  @Input() canSubmit = false;
  @Input() isSaving = false;
  @Input() isSavingPassword = false;

  @Output() currentPasswordDraftChange = new EventEmitter<string>();
  @Output() newPasswordDraftChange = new EventEmitter<string>();
  @Output() confirmPasswordDraftChange = new EventEmitter<string>();
  @Output() openPanel = new EventEmitter<void>();
  @Output() closePanel = new EventEmitter<void>();
  @Output() submit = new EventEmitter<void>();
}
