import { Injectable, signal } from '@angular/core';
import type { ConfirmModalState, ConfirmOptions } from './confirm-modal.types';

@Injectable({ providedIn: 'root' })
export class ConfirmModalService {
  /** Null when no modal is active; set to state object when open. */
  readonly state = signal<ConfirmModalState | null>(null);

  /**
   * Opens the confirmation modal.
   *
   * Resolves `true`  when the user confirms successfully.
   * Resolves `false` when the user cancels, presses ESC, or clicks the backdrop.
   *
   * Throws synchronously if another modal is already open (single-instance rule).
   */
  open(options: ConfirmOptions): Promise<boolean> {
    if (this.state() !== null) {
      throw new Error(
        'ConfirmModalService: a modal is already open. ' +
          'Await the previous open() call before opening another.',
      );
    }

    return new Promise<boolean>((resolve) => {
      this.state.set({ options, resolve });
    });
  }

  /** Called internally by the host component to close and resolve the promise. */
  _resolve(value: boolean): void {
    const current = this.state();
    if (current) {
      this.state.set(null);
      current.resolve(value);
    }
  }
}
