import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/** Maximum number of listings comparable at once (matches API cap). */
export const COMPARE_MAX = 3;

const STORAGE_KEY = 'bm.compare.selectedSlugs';

/**
 * v1.5-D17b — Singleton holding the user's current compare-cart of listing
 * slugs. Persists across navigation via sessionStorage so the floating bar
 * survives route changes (and a hard refresh within the same tab session).
 *
 * Signal-based API. Cap at 3 — `toggle()` no-ops when at cap and the slug is
 * not already selected. Order is preserved (Set insertion order) so the
 * compare page receives slugs in the order the user picked them.
 *
 * SSR-safe: storage access is gated on `isPlatformBrowser`. On the server,
 * the set is always empty.
 */
@Injectable({ providedIn: 'root' })
export class CompareSelectionService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  /** Internal mutable set. Insertion order = user pick order. */
  private readonly _selected = signal<ReadonlySet<string>>(this.hydrate());

  /** Read-only signal — components observe via OnPush. */
  readonly selected = computed(() => this._selected());
  readonly count = computed(() => this._selected().size);

  /** O(1) membership check used by listing-card checkbox state. */
  isSelected(slug: string): boolean {
    return this._selected().has(slug);
  }

  /**
   * Add or remove a slug. Cap enforcement: if already at MAX and `slug`
   * isn't already in the set, this is a no-op (returns false).
   * Returns true when the set changed, false when capped-out.
   */
  toggle(slug: string): boolean {
    if (!slug) return false;
    const current = this._selected();
    if (current.has(slug)) {
      const next = new Set(current);
      next.delete(slug);
      this.commit(next);
      return true;
    }
    if (current.size >= COMPARE_MAX) return false;
    const next = new Set(current);
    next.add(slug);
    this.commit(next);
    return true;
  }

  clear(): void {
    if (this._selected().size === 0) return;
    this.commit(new Set());
  }

  /** Snapshot of the current selection as a positional array. */
  asArray(): string[] {
    return Array.from(this._selected());
  }

  private commit(next: ReadonlySet<string>): void {
    this._selected.set(next);
    this.persist(next);
  }

  private hydrate(): ReadonlySet<string> {
    if (!this.isBrowser) return new Set();
    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return new Set();
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return new Set();
      /* Defensive cap — in case storage was tampered with. */
      const slugs = (parsed as unknown[])
        .filter((x): x is string => typeof x === 'string' && x.length > 0)
        .slice(0, COMPARE_MAX);
      return new Set(slugs);
    } catch {
      return new Set();
    }
  }

  private persist(set: ReadonlySet<string>): void {
    if (!this.isBrowser) return;
    try {
      if (set.size === 0) {
        window.sessionStorage.removeItem(STORAGE_KEY);
      } else {
        window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(set)));
      }
    } catch {
      /* Storage quota / private mode — silent fail, in-memory state still works. */
    }
  }
}
