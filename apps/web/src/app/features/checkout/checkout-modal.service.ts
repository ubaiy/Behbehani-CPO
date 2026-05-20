import { Injectable, computed, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CheckoutModalService {
  private readonly _isOpen = signal(false);
  private readonly _listingId = signal<string | null>(null);

  readonly isOpen = computed(() => this._isOpen());
  readonly listingId = computed(() => this._listingId());

  open(listingId: string): void {
    this._listingId.set(listingId);
    this._isOpen.set(true);
  }

  close(): void {
    this._isOpen.set(false);
    this._listingId.set(null);
  }
}
