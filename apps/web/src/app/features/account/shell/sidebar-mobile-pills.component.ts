import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { flattenedNavItems, type AccountNavItem } from './account-nav';

/**
 * Mobile-only horizontal pill row, shown above the content pane on <md screens.
 *
 * Flattens all groups into a single scrollable strip — group labels are dropped
 * on mobile because the vertical real-estate cost isn't worth it. Sign-out is
 * NOT included here; it lives at the bottom of the mobile content pane (rendered
 * by AccountLayoutComponent).
 */
@Component({
  selector: 'app-account-sidebar-mobile-pills',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, RouterLinkActive, TranslateModule],
  template: `
    <nav
      class="md:hidden overflow-x-auto whitespace-nowrap py-3 px-4 border-b border-line bg-white [&::-webkit-scrollbar]:hidden"
      style="scrollbar-width: none; -ms-overflow-style: none;"
      [attr.aria-label]="'account.shell.nav.ariaLabel' | translate"
    >
      @for (item of items; track item.path) {
        <a
          [routerLink]="['/', locale, 'account', item.path]"
          routerLinkActive="bg-brand-700 !text-white border-brand-700"
          #rla="routerLinkActive"
          class="inline-flex items-center gap-1.5 rounded-pill bg-white border border-line text-ink-2 px-3.5 py-2 text-[12px] font-semibold me-2 hover:bg-surface-soft min-h-[40px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 transition-colors"
        >
          <svg
            class="w-3.5 h-3.5 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path stroke-linecap="round" stroke-linejoin="round" [attr.d]="item.iconPath" />
          </svg>
          <span>{{ item.labelKey | translate }}</span>
          @if (item.comingSoon) {
            <span
              class="text-[9px] font-bold uppercase tracking-wider bg-surface-cool text-muted px-1.5 py-0.5 rounded ms-1"
            >
              {{ 'account.shell.nav.comingSoon' | translate }}
            </span>
          }
        </a>
      }
    </nav>
  `,
})
export class SidebarMobilePillsComponent {
  @Input({ required: true }) locale!: string;

  readonly items: readonly AccountNavItem[] = flattenedNavItems();
}
