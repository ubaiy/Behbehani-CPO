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
 * Personal info card: avatar (upload + remove), full name, locale preference.
 * Presentational: parent owns the user, the draft buffer, and the saving flags.
 *
 * v1.5-D7 reactivity contract: `fullNameDraft` is a STRING input two-way-bound
 * via `[ngModel]` + `(fullNameDraftChange)`. Local CD inside this component
 * re-evaluates the dirty flag on every keystroke — the parent does not need to
 * own a computed for that.
 */
@Component({
  selector: 'app-profile-personal-info',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, TranslateModule],
  template: `
    <section class="rounded-3xl border border-line bg-gradient-to-br from-white to-surface-soft/40 p-6 shadow-brand">
      <h2 class="font-display text-[17px] sm:text-[18px] font-bold text-ink tracking-[-0.01em]">
        {{ 'account.profile.identity.title' | translate }}
      </h2>

      <!-- Avatar -->
      <div class="mt-5 flex items-center gap-4">
        @if (user?.avatarUrl) {
          <img
            [src]="user!.avatarUrl!"
            alt=""
            class="h-16 w-16 rounded-full object-cover ring-2 ring-brand-100"
          />
        } @else {
          <div class="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 text-[22px] font-bold text-brand-700 select-none">
            {{ initials }}
          </div>
        }
        <div class="flex flex-wrap items-center gap-2">
          <label class="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-pill border border-line bg-white px-4 py-2 text-[13px] font-semibold text-ink-2 hover:bg-surface-soft transition-colors"
            [class.opacity-50]="isUploadingAvatar"
            [class.cursor-not-allowed]="isUploadingAvatar">
            @if (isUploadingAvatar) {
              <svg viewBox="0 0 24 24" width="14" height="14" class="animate-spin text-brand-700" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 2a10 10 0 0 1 10 10"/></svg>
              {{ 'account.profile.identity.uploadingCta' | translate }}
            } @else {
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
              {{ 'account.profile.identity.uploadCta' | translate }}
            }
            <input type="file" accept="image/jpeg,image/png,image/webp" class="sr-only" (change)="avatarFileSelected.emit($event)" [disabled]="isUploadingAvatar" />
          </label>
          @if (user?.avatarUrl) {
            <button
              type="button"
              (click)="removeAvatar.emit()"
              [disabled]="isSaving"
              class="inline-flex min-h-[44px] items-center rounded-pill border border-red-200 bg-white px-4 py-2 text-[13px] font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
            >
              {{ 'account.profile.identity.removeCta' | translate }}
            </button>
          }
        </div>
      </div>

      <!-- Full name -->
      <div class="mt-5">
        <label class="block text-[13px] font-semibold text-ink-2 mb-1.5">
          {{ 'account.profile.identity.fullNameLabel' | translate }}
        </label>
        <div class="flex gap-3">
          <input
            type="text"
            [ngModel]="fullNameDraft"
            (ngModelChange)="fullNameDraftChange.emit($event)"
            [placeholder]="'account.profile.identity.fullNamePlaceholder' | translate"
            class="h-11 flex-1 rounded-xl border border-line px-4 text-[14px] text-ink outline-none transition-colors focus:border-brand-700 focus:ring-2 focus:ring-brand-100"
            maxlength="120"
          />
          <button
            type="button"
            (click)="saveName.emit()"
            [disabled]="!isNameDirty || isSaving"
            class="inline-flex min-h-[44px] items-center rounded-pill bg-brand-700 px-5 text-[13px] font-semibold text-white hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 transition-colors"
          >
            {{ isSavingProfile ? ('account.profile.identity.savingCta' | translate) : ('account.profile.identity.saveCta' | translate) }}
          </button>
        </div>
      </div>

      <!-- Language preference -->
      <div class="mt-5">
        <p class="text-[13px] font-semibold text-ink-2 mb-2">
          {{ 'account.profile.identity.localeLabel' | translate }}
        </p>
        <div class="flex gap-2" role="group">
          <button
            type="button"
            (click)="localeChange.emit('en')"
            [disabled]="isSaving"
            class="inline-flex min-h-[44px] items-center rounded-pill px-5 text-[13px] font-semibold transition-colors disabled:opacity-50"
            [class]="user?.locale === 'en' ? 'bg-brand-700 text-white' : 'border border-line bg-white text-ink-2 hover:bg-surface-soft'"
          >
            English
          </button>
          <button
            type="button"
            (click)="localeChange.emit('ar')"
            [disabled]="isSaving"
            class="inline-flex min-h-[44px] items-center rounded-pill px-5 text-[13px] font-semibold transition-colors disabled:opacity-50"
            [class]="user?.locale === 'ar' ? 'bg-brand-700 text-white' : 'border border-line bg-white text-ink-2 hover:bg-surface-soft'"
          >
            العربية
          </button>
        </div>
      </div>
    </section>
  `,
})
export class ProfilePersonalInfoComponent {
  @Input() user: PublicUser | null = null;
  @Input({ required: true }) initials!: string;
  @Input({ required: true }) fullNameDraft!: string;
  @Input({ required: true }) isNameDirty!: boolean;
  /** True while ANY save (profile, email, mobile, password) is in flight. */
  @Input() isSaving = false;
  /** True specifically while a profile save is in flight (drives Save button label). */
  @Input() isSavingProfile = false;
  @Input() isUploadingAvatar = false;

  @Output() fullNameDraftChange = new EventEmitter<string>();
  @Output() saveName = new EventEmitter<void>();
  @Output() localeChange = new EventEmitter<'en' | 'ar'>();
  @Output() avatarFileSelected = new EventEmitter<Event>();
  @Output() removeAvatar = new EventEmitter<void>();
}
