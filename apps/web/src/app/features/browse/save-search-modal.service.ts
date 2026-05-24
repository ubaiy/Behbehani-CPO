import { Injectable, computed, signal } from '@angular/core';
import type { SavedSearchQueryPayload } from '@behbehani-cpo/shared-types';

@Injectable({ providedIn: 'root' })
export class SaveSearchModalService {
  private readonly _isOpen = signal(false);
  private readonly _payload = signal<SavedSearchQueryPayload | null>(null);

  readonly isOpen = computed(() => this._isOpen());
  readonly payload = computed(() => this._payload());

  open(payload: SavedSearchQueryPayload): void {
    this._payload.set(payload);
    this._isOpen.set(true);
  }

  close(): void {
    this._isOpen.set(false);
    this._payload.set(null);
  }
}
