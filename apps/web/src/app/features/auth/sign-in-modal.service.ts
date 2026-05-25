import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SignInModalService {
  private readonly _isOpen = signal(false);
  /**
   * v1.5-D21: where to navigate after a successful sign-in. Set by `authGuard`
   * (via shell's `?returnUrl=...` handler) or by callers that want post-auth
   * routing (e.g. the VDP "Book a test drive" button could re-open the modal
   * on a specific route). Cleared on close.
   */
  private readonly _returnUrl = signal<string | null>(null);

  readonly isOpen = this._isOpen.asReadonly();
  readonly returnUrl = this._returnUrl.asReadonly();

  open(returnUrl?: string | null): void {
    if (returnUrl !== undefined) this._returnUrl.set(returnUrl);
    this._isOpen.set(true);
  }

  close(): void {
    this._isOpen.set(false);
    this._returnUrl.set(null);
  }
}
