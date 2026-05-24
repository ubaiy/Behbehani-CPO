import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import {
  ACCOUNT_NAV_GROUPS,
  SIGN_OUT_ICON_PATH,
  type AccountNavGroup,
} from './account-nav';

/**
 * Desktop-only left sidebar for the /account/* shell.
 * Rendered inside AccountLayoutComponent as the left column of the 2-col grid.
 * Hidden below md breakpoint — the mobile pill row takes over there.
 */
@Component({
  selector: 'app-account-sidebar-desktop',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, RouterLinkActive, TranslateModule],
  template: `
    <aside
      class="hidden md:flex md:flex-col bg-white border border-line rounded-3xl shadow-brand-sm p-4 sticky top-6 self-start max-h-[calc(100vh-3rem)] overflow-y-auto"
      [attr.aria-label]="'account.shell.nav.ariaLabel' | translate"
    >
      @for (group of groups; track group.labelKey; let isFirst = $first) {
        <p
          class="text-[11px] font-semibold uppercase tracking-wider text-muted px-3 mb-1.5"
          [class.mt-0]="isFirst"
          [class.mt-4]="!isFirst"
        >
          {{ group.labelKey | translate }}
        </p>
        <ul class="flex flex-col gap-0.5" role="list">
          @for (item of group.items; track item.path) {
            <li>
              <a
                [routerLink]="['/', locale, 'account', item.path]"
                routerLinkActive="bg-brand-50 text-brand-700 font-semibold before:absolute before:start-0 before:top-2 before:bottom-2 before:w-[3px] before:rounded-full before:bg-brand-700"
                #rla="routerLinkActive"
                class="relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium text-ink-2 hover:bg-surface-soft hover:text-ink min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 transition-colors duration-150"
              >
                <svg
                  class="w-4 h-4 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" [attr.d]="item.iconPath" />
                </svg>
                <span class="flex-1 min-w-0 truncate">{{ item.labelKey | translate }}</span>
                @if (item.comingSoon) {
                  <span
                    class="ms-auto text-[10px] font-bold uppercase tracking-wider text-muted bg-surface-cool px-2 py-0.5 rounded"
                  >
                    {{ 'account.shell.nav.comingSoon' | translate }}
                  </span>
                }
              </a>
            </li>
          }
        </ul>
      }

      <!-- Sign-out (destructive — red is allowed for destructive actions per brand-lock) -->
      <div class="mt-auto pt-4 border-t border-line">
        <button
          type="button"
          (click)="signOut.emit()"
          class="w-full bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-xl px-3 py-2.5 text-[13px] font-semibold flex items-center gap-2 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 transition-colors"
        >
          <svg
            class="w-4 h-4 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path stroke-linecap="round" stroke-linejoin="round" [attr.d]="signOutIconPath" />
          </svg>
          <span>{{ 'account.shell.nav.signOut' | translate }}</span>
        </button>
      </div>
    </aside>
  `,
})
export class SidebarDesktopComponent {
  /** Active locale segment used to build absolute routerLink URLs. */
  @Input({ required: true }) locale!: string;

  @Output() readonly signOut = new EventEmitter<void>();

  readonly groups: readonly AccountNavGroup[] = ACCOUNT_NAV_GROUPS;
  readonly signOutIconPath = SIGN_OUT_ICON_PATH;
}
