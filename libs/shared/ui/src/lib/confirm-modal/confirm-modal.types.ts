export type ConfirmVariant = 'standard' | 'destructive' | 'severe';

export interface ConfirmOptions {
  title: string;
  body: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  requireTyped?: string;
  onConfirm?: () => Promise<void>;
}

export interface ConfirmModalState {
  options: ConfirmOptions;
  resolve: (value: boolean) => void;
}
