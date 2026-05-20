import { Injectable, Signal, inject, signal } from '@angular/core';
import { Observable, of } from 'rxjs';
import { AuthService } from '@behbehani-cpo/data-access';
import { SavedListingsService } from './saved-listings.service';
import { SignInModalService } from '../features/auth/sign-in-modal.service';

export type ToggleOutcome = 'saved' | 'unsaved' | 'sign_in_required' | 'failed';

/**
 * Cross-component reactive state for heart/save toggles.
 * Owns the in-memory set of saved listing IDs so every listing card
 * stays in sync without prop-drilling. Uses optimistic updates with rollback.
 */
@Injectable({ providedIn: 'root' })
export class HeartToggleService {
  private readonly auth = inject(AuthService);
  private readonly api = inject(SavedListingsService);
  private readonly signInModal = inject(SignInModalService);

  /** Internal mutable set — updated optimistically. */
  private readonly _savedIds = signal<Set<string>>(new Set());

  /** Read-only signal consumed by OnPush components. */
  readonly savedIds: Signal<ReadonlySet<string>> = this._savedIds.asReadonly();

  /**
   * Hydrate the local set from the server for a batch of currently-visible IDs.
   * Additive — never removes IDs already in the set.
   * No-ops silently if the user is not signed in or the list is empty.
   */
  hydrate(listingIds: string[]): void {
    if (!this.auth.isSignedIn() || listingIds.length === 0) return;
    this.api.checkSavedListings(listingIds).subscribe((result) => {
      if (result.kind !== 'ok') return;
      this._savedIds.update((prev) => {
        const next = new Set(prev);
        for (const id of result.savedListingIds) next.add(id);
        return next;
      });
    });
  }

  /** Synchronous local read — O(1). */
  isSaved(listingId: string): boolean {
    return this._savedIds().has(listingId);
  }

  /**
   * Toggle the saved state for a listing.
   * - If guest: opens the sign-in modal and emits 'sign_in_required'.
   * - If signed in: optimistic update → API call → rollback on error.
   */
  toggle(listingId: string): Observable<ToggleOutcome> {
    if (!this.auth.isSignedIn()) {
      this.signInModal.open();
      return of('sign_in_required');
    }

    const wasSaved = this.isSaved(listingId);

    // Optimistic update
    this._savedIds.update((prev) => {
      const next = new Set(prev);
      if (wasSaved) {
        next.delete(listingId);
      } else {
        next.add(listingId);
      }
      return next;
    });

    return new Observable<ToggleOutcome>((observer) => {
      const handleResult = (result: { kind: string }): void => {
        if (result.kind === 'ok') {
          observer.next(wasSaved ? 'unsaved' : 'saved');
          observer.complete();
        } else {
          this._rollback(listingId, wasSaved);
          observer.next('failed');
          observer.complete();
        }
      };

      const handleError = (): void => {
        this._rollback(listingId, wasSaved);
        observer.next('failed');
        observer.complete();
      };

      if (wasSaved) {
        this.api.unsaveListing(listingId).subscribe({ next: handleResult, error: handleError });
      } else {
        this.api.saveListing(listingId).subscribe({ next: handleResult, error: handleError });
      }
    });
  }

  private _rollback(listingId: string, restoreTo: boolean): void {
    this._savedIds.update((prev) => {
      const next = new Set(prev);
      if (restoreTo) {
        next.add(listingId);
      } else {
        next.delete(listingId);
      }
      return next;
    });
  }
}
