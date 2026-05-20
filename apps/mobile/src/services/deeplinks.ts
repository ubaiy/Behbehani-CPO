/**
 * Deep-link service — wrapper over expo-linking.
 *
 * Translates incoming URLs (custom scheme or universal links) into typed
 * { route, params } objects that Expo Router can navigate to.
 *
 * Supported schemes (ARCHITECTURE.md §4):
 *   behbehani-cpo://listing/:id       → /listing/:id
 *   behbehani-cpo://inspection-sign/:token → /inspection-sign/:token (no-auth)
 *   behbehani-cpo://auth/sign-in      → /auth/sign-in
 *   https://www.behbehani-motors.com/en/cars/:slug → /listing/:slug (universal link)
 *
 * Used by: app/_layout.tsx (W2) — registers the handler once on mount.
 *
 * NOTE: Universal link AASA / assetlinks.json configuration is a W4 DevOps task.
 * The handler below parses universal links structurally so the code is ready.
 */

import * as Linking from 'expo-linking';

export interface ParsedDeepLink {
  route: string;
  params: Record<string, string>;
}

// ─── URL → route mapping ──────────────────────────────────────────────────────

const CUSTOM_SCHEME = 'behbehani-cpo';

/**
 * Parses an incoming URL into a { route, params } pair.
 *
 * Returns null for URLs that cannot be mapped to an app route (e.g. external
 * web URLs unrelated to this app, or malformed URLs).
 */
export function parseDeepLink(url: string): ParsedDeepLink | null {
  try {
    const parsed = Linking.parse(url);

    // ── Custom scheme: behbehani-cpo://path ─────────────────────────────────
    if (parsed.scheme === CUSTOM_SCHEME) {
      const path = parsed.path ?? '';
      const queryParams = (parsed.queryParams ?? {}) as Record<string, string>;

      // listing/:id
      const listingMatch = path.match(/^listing\/([^/]+)$/);
      if (listingMatch) {
        return { route: `/listing/${listingMatch[1]}`, params: queryParams };
      }

      // inspection-sign/:token (no-auth route)
      const signMatch = path.match(/^inspection-sign\/([^/]+)$/);
      if (signMatch) {
        return {
          route: `/inspection-sign/${signMatch[1]}`,
          params: queryParams,
        };
      }

      // auth routes
      if (path === 'auth/sign-in') {
        return { route: '/auth/sign-in', params: queryParams };
      }
      if (path === 'auth/sign-up') {
        return { route: '/auth/sign-up', params: queryParams };
      }

      // Generic fallback: use the path directly
      if (path) {
        return { route: `/${path}`, params: queryParams };
      }
    }

    // ── Universal link: https://www.behbehani-motors.com/… ──────────────────
    if (
      parsed.scheme === 'https' &&
      parsed.hostname === 'www.behbehani-motors.com'
    ) {
      const path = parsed.path ?? '';

      // /en/cars/:slug or /ar/cars/:slug → /listing/:slug
      const carsMatch = path.match(/^\/(en|ar)\/cars\/([^/]+)$/);
      if (carsMatch) {
        return { route: `/listing/${carsMatch[2]}`, params: {} };
      }

      // /inspection-sign/:token → /inspection-sign/:token
      const signMatch = path.match(/^\/inspection-sign\/([^/]+)$/);
      if (signMatch) {
        return { route: `/inspection-sign/${signMatch[1]}`, params: {} };
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Registers a listener for incoming deep links (app already open).
 * Call once in app/_layout.tsx on mount.
 *
 * @param callback Invoked with the parsed link whenever the app receives one.
 *   Receives null if the URL could not be mapped.
 * @returns A cleanup function — call on unmount to remove the listener.
 */
export function registerDeepLinkHandler(
  callback: (link: ParsedDeepLink | null) => void,
): () => void {
  const subscription = Linking.addEventListener('url', ({ url }) => {
    callback(parseDeepLink(url));
  });

  return () => subscription.remove();
}

/**
 * Returns the URL that launched the app (cold-start deep link), parsed.
 * Returns null if the app was opened normally (not via a deep link).
 */
export async function getInitialDeepLink(): Promise<ParsedDeepLink | null> {
  const url = await Linking.getInitialURL();
  if (!url) return null;
  return parseDeepLink(url);
}
