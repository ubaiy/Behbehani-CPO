/**
 * Shared nav structure for the customer-facing /account/* shell.
 *
 * Single source of truth — rendered twice:
 *   - sidebar-desktop.component.ts (vertical list, grouped, with labels)
 *   - sidebar-mobile-pills.component.ts (flat horizontal pill row)
 *
 * Each NavItem carries its own routerLink suffix (relative to /:locale/account),
 * an i18n label key, an inline-SVG icon path, and an optional "coming soon" flag.
 */

export interface AccountNavItem {
  /** Path suffix appended to /:locale/account, e.g. 'profile' or 'orders'. */
  path: string;
  /** i18n key resolving to the visible label. */
  labelKey: string;
  /** Inline-SVG `d` attribute. Single path keeps the icon set tiny + uniform. */
  iconPath: string;
  /** When true, render the "Soon" badge alongside the label. */
  comingSoon?: boolean;
}

export interface AccountNavGroup {
  /** i18n key resolving to the group label (e.g. account.hub.groups.buying). */
  labelKey: string;
  items: AccountNavItem[];
}

/**
 * Heroicons-style outline SVG path strings — `stroke="currentColor"`, viewBox 24×24.
 * Picked to mirror the visual vocabulary of account-hub.component.ts (v2 mockup).
 */
const ICON = {
  userCircle: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  mapPin:
    'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z',
  bell:
    'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
  shieldCheck:
    'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
  fileText:
    'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z',
  shoppingBag:
    'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
  heart:
    'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z',
  bookmark:
    'M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z',
  calendar:
    'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  wrench:
    'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
  bank:
    'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  rotateCcw:
    'M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6',
  messageSquare:
    'M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z',
  gift:
    'M20 12v10H4V12 M2 7h20v5H2z M12 22V7 M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z',
  signOut:
    'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1',
} as const;

/**
 * The grouped nav definition. Edit here — both sidebar variants pick it up.
 * Paths are RELATIVE to /:locale/account/ (the parent route).
 */
export const ACCOUNT_NAV_GROUPS: readonly AccountNavGroup[] = [
  {
    labelKey: 'account.hub.groups.profileSettings',
    items: [
      { path: 'profile',       labelKey: 'account.shell.nav.profile',       iconPath: ICON.userCircle },
      { path: 'addresses',     labelKey: 'account.shell.nav.addresses',     iconPath: ICON.mapPin },
      { path: 'notifications', labelKey: 'account.shell.nav.notifications', iconPath: ICON.bell },
      { path: 'security',      labelKey: 'account.shell.nav.security',      iconPath: ICON.shieldCheck },
      { path: 'documents',     labelKey: 'account.shell.nav.documents',     iconPath: ICON.fileText },
    ],
  },
  {
    labelKey: 'account.hub.groups.buying',
    items: [
      { path: 'orders',         labelKey: 'account.shell.nav.orders',        iconPath: ICON.shoppingBag },
      { path: 'favorites',      labelKey: 'account.shell.nav.savedCars',     iconPath: ICON.heart },
      { path: 'saved-searches', labelKey: 'account.shell.nav.savedSearches', iconPath: ICON.bookmark },
    ],
  },
  {
    labelKey: 'account.hub.groups.owning',
    items: [
      { path: 'inspections', labelKey: 'account.shell.nav.inspections', iconPath: ICON.calendar },
      { path: 'maintenance', labelKey: 'account.shell.nav.maintenance', iconPath: ICON.wrench, comingSoon: true },
      { path: 'financing',   labelKey: 'account.shell.nav.financing',   iconPath: ICON.bank,   comingSoon: true },
    ],
  },
  {
    labelKey: 'account.hub.groups.engagement',
    items: [
      { path: 'returns',   labelKey: 'account.shell.nav.returns',   iconPath: ICON.rotateCcw,     comingSoon: true },
      { path: 'reviews',   labelKey: 'account.shell.nav.reviews',   iconPath: ICON.messageSquare, comingSoon: true },
      { path: 'referrals', labelKey: 'account.shell.nav.referrals', iconPath: ICON.gift,          comingSoon: true },
    ],
  },
] as const;

/** Sign-out icon — exported separately so the sidebar can render the destructive button. */
export const SIGN_OUT_ICON_PATH = ICON.signOut;

/** Flatten all items in nav order — used by the mobile pill row. */
export function flattenedNavItems(): AccountNavItem[] {
  return ACCOUNT_NAV_GROUPS.flatMap((g) => g.items);
}
