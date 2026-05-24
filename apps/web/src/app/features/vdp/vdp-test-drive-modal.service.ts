import { Injectable, computed, signal } from '@angular/core';

/**
 * v1.5-D18c — open/close signal store for the VDP Test Drive booking modal.
 * Mirrors `CheckoutModalService` so the modal can be lazy-mounted with
 * `@defer (when modalSvc.isOpen())` from the VDP page.
 */
@Injectable({ providedIn: 'root' })
export class VdpTestDriveModalService {
  private readonly _isOpen = signal(false);
  private readonly _listingId = signal<string | null>(null);

  readonly isOpen = computed(() => this._isOpen());
  readonly listingId = computed(() => this._listingId());

  open(listingId?: string): void {
    this._listingId.set(listingId ?? null);
    this._isOpen.set(true);
  }

  close(): void {
    this._isOpen.set(false);
    this._listingId.set(null);
  }
}
