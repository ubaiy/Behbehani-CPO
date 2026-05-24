import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

export type PrefsChannel = 'email' | 'sms' | 'push';
export type PrefsMutableCategory = 'bookingUpdates' | 'listingAlerts' | 'marketing';
export type PrefsCellGrid = Record<PrefsMutableCategory, Record<PrefsChannel, boolean>>;

export interface PrefsGridRow {
  cat: PrefsMutableCategory | 'accountSecurity';
  labelKey: string;
  locked: boolean;
}

/**
 * Presentational child for the notification preferences grid.
 * Holds NO state of its own — parent owns `cells` and reacts to (toggle).
 *
 * Desktop = column-headers + per-row toggles in a CSS grid.
 * Mobile  = stacked card per category with channel toggles inline.
 */
@Component({
  selector: 'app-notification-prefs-grid',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, TranslateModule],
  template: `
    <div class="rounded-3xl border border-line bg-white shadow-brand-sm overflow-hidden">

      <!-- DESKTOP TABLE -->
      <div class="hidden sm:block p-6 sm:p-8">
        <!-- Column headers -->
        <div class="grid gap-x-6 mb-4 items-end"
             style="grid-template-columns: 1fr 64px 64px 80px">
          <div></div>
          <div class="text-center">
            <span class="text-[11px] font-semibold text-muted uppercase tracking-wider block">
              {{ 'account.notifications.channels.email' | translate }}
            </span>
          </div>
          <div class="text-center">
            <span class="text-[11px] font-semibold text-muted uppercase tracking-wider block">
              {{ 'account.notifications.channels.sms' | translate }}
            </span>
          </div>
          <div class="text-center">
            <span class="text-[11px] font-semibold text-muted uppercase tracking-wider block">
              {{ 'account.notifications.channels.push' | translate }}
            </span>
            <span class="text-[10px] text-muted/70 block leading-tight mt-0.5">
              {{ 'account.notifications.pushCaption' | translate }}
            </span>
          </div>
        </div>

        <!-- Grid rows -->
        <div class="divide-y divide-line">
          @for (row of rows; track row.cat) {
            <div class="grid gap-x-6 py-4 items-center"
                 style="grid-template-columns: 1fr 64px 64px 80px">
              <span class="text-[14px] font-medium text-ink">
                {{ row.labelKey | translate }}
              </span>

              @if (row.locked) {
                @for (ch of channels; track ch) {
                  <div class="flex justify-center">
                    <span
                      class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full
                             bg-brand-50 text-brand-700 border border-brand-200
                             text-[11px] font-semibold select-none"
                      [title]="'account.notifications.securityTooltip' | translate"
                    >
                      <svg class="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor"
                           stroke-width="2.5" viewBox="0 0 24 24" aria-hidden="true">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                        <path stroke-linecap="round" d="M7 11V7a5 5 0 0110 0v4"/>
                      </svg>
                      {{ 'account.notifications.securityRequired' | translate }}
                    </span>
                  </div>
                }
              } @else {
                @for (ch of channels; track ch) {
                  <div class="flex justify-center">
                    <button
                      type="button"
                      [attr.aria-pressed]="cellValue(row.cat, ch)"
                      [attr.aria-label]="(row.labelKey | translate) + ' ' + ('account.notifications.channels.' + ch | translate)"
                      [disabled]="disabled"
                      (click)="emitToggle(row.cat, ch)"
                      class="relative focus-visible:outline focus-visible:outline-2
                             focus-visible:outline-offset-2 focus-visible:outline-brand-700
                             disabled:opacity-50 disabled:cursor-not-allowed rounded-full"
                      style="width:40px;height:44px;display:flex;align-items:center;justify-content:center;"
                    >
                      <span
                        class="relative block rounded-full transition-colors duration-200"
                        style="width:40px;height:22px;"
                        [class.bg-brand-700]="cellValue(row.cat, ch)"
                        [class.bg-slate-200]="!cellValue(row.cat, ch)"
                      >
                        <span
                          class="absolute top-[2px] bg-white rounded-full shadow transition-all duration-200"
                          style="width:18px;height:18px;"
                          [style.left]="cellValue(row.cat, ch) ? '20px' : '2px'"
                        ></span>
                      </span>
                    </button>
                  </div>
                }
              }
            </div>
          }
        </div>
      </div>

      <!-- MOBILE CARDS (one per category) -->
      <div class="sm:hidden divide-y divide-line">
        @for (row of rows; track row.cat) {
          <div class="p-5">
            <p class="text-[14px] font-semibold text-ink mb-3">
              {{ row.labelKey | translate }}
            </p>

            @if (row.locked) {
              <div class="flex flex-wrap gap-2">
                @for (ch of channels; track ch) {
                  <span
                    class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full
                           bg-brand-50 text-brand-700 border border-brand-200
                           text-[11px] font-semibold select-none"
                    [title]="'account.notifications.securityTooltip' | translate"
                  >
                    <svg class="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor"
                         stroke-width="2.5" viewBox="0 0 24 24" aria-hidden="true">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                      <path stroke-linecap="round" d="M7 11V7a5 5 0 0110 0v4"/>
                    </svg>
                    {{ 'account.notifications.channels.' + ch | translate }}
                  </span>
                }
              </div>
            } @else {
              <div class="flex flex-wrap gap-5">
                @for (ch of channels; track ch) {
                  <button
                    type="button"
                    [attr.aria-pressed]="cellValue(row.cat, ch)"
                    [attr.aria-label]="(row.labelKey | translate) + ' ' + ('account.notifications.channels.' + ch | translate)"
                    [disabled]="disabled"
                    (click)="emitToggle(row.cat, ch)"
                    class="flex items-center gap-2 min-h-[44px] focus-visible:outline
                           focus-visible:outline-2 focus-visible:outline-brand-700 rounded
                           disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span
                      class="relative block rounded-full transition-colors duration-200 flex-shrink-0"
                      style="width:40px;height:22px;"
                      [class.bg-brand-700]="cellValue(row.cat, ch)"
                      [class.bg-slate-200]="!cellValue(row.cat, ch)"
                    >
                      <span
                        class="absolute top-[2px] bg-white rounded-full shadow transition-all duration-200"
                        style="width:18px;height:18px;"
                        [style.left]="cellValue(row.cat, ch) ? '20px' : '2px'"
                      ></span>
                    </span>
                    <span class="text-[13px] text-ink-2">
                      {{ 'account.notifications.channels.' + ch | translate }}
                    </span>
                  </button>
                }
              </div>
            }
          </div>
        }
      </div>

      <!-- FOOTER -->
      <div
        class="px-6 sm:px-8 pb-6 sm:pb-8 pt-4 border-t border-line
               flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
      >
        <p class="text-[12px] text-muted">
          {{ 'account.notifications.applyCaption' | translate }}
        </p>
        <div class="flex items-center gap-3">
          @if (isDirty) {
            <span class="text-[12px] text-muted italic">
              {{ 'account.notifications.dirtyHint' | translate }}
            </span>
          }
          <button
            type="button"
            (click)="save.emit()"
            [disabled]="!isDirty || disabled"
            class="min-h-[44px] px-6 py-2.5 rounded-xl font-semibold text-[14px] transition-colors
                   bg-brand-700 text-white hover:bg-brand-800 active:bg-brand-900
                   disabled:opacity-40 disabled:cursor-not-allowed"
          >
            @if (saving) {
              {{ 'account.notifications.savingCta' | translate }}
            } @else {
              {{ 'account.notifications.saveCta' | translate }}
            }
          </button>
        </div>
      </div>
    </div>
  `,
})
export class NotificationPrefsGridComponent {
  @Input({ required: true }) rows!: PrefsGridRow[];
  @Input({ required: true }) channels!: PrefsChannel[];
  @Input({ required: true }) cells!: PrefsCellGrid;
  /** True while a save is in flight — disables all interactive elements. */
  @Input() disabled = false;
  /** True when the live grid differs from the persisted baseline. */
  @Input() isDirty = false;
  /** True while a save request is in flight (drives button label only). */
  @Input() saving = false;

  @Output() toggle = new EventEmitter<{ cat: PrefsMutableCategory | 'accountSecurity'; ch: PrefsChannel }>();
  @Output() save = new EventEmitter<void>();

  cellValue(cat: PrefsMutableCategory | 'accountSecurity', ch: PrefsChannel): boolean {
    if (cat === 'accountSecurity') return true;
    return this.cells[cat][ch];
  }

  emitToggle(cat: PrefsMutableCategory | 'accountSecurity', ch: PrefsChannel): void {
    if (cat === 'accountSecurity') return;
    this.toggle.emit({ cat, ch });
  }
}
