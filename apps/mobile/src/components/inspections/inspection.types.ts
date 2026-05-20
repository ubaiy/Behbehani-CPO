/**
 * Shared types for the inspection-report viewer.
 * Imported by inspections/[id].tsx and its sub-components.
 *
 * W3: mock will be replaced by GET /v1/public/me/inspections/:id response shape.
 */

export type ItemStatus = 'pass' | 'advisory' | 'fail';

export interface CheckItem {
  label: string;
  status: ItemStatus;
  note?: string;
}

export interface Category {
  id: string;
  name: string;
  score: number;
  items: CheckItem[];
}

export interface MockInspection {
  vehicleTitle: string;
  mileage: string;
  transmission: string;
  color: string;
  vinLastSix: string;
  bookingRef: string;
  inspectedOn: string;
  inspector: string;
  overallScore: number;
  verdict: string;
  passCount: number;
  advisoryCount: number;
  failCount: number;
  totalChecks: number;
  categories: Category[];
  photoCount: number;
  inspectorNotes: string;
  inspectorNotesExtra: string;
  inspectorName: string;
  inspectorTitle: string;
  inspectorSignedAt: string;
  customerSignedAt: string | null;
  customerName: string;
  signatureMethod: string;
  hasActiveOffer: boolean;
  offerAmountKwd: string;
  offerValidDays: number;
  offerExpiry: string;
  offerToken: string;
}

// ─── Palette constants ─────────────────────────────────────────────────────────
// Red-500 ONLY for failed inspection items. No amber/yellow/gold/emerald/green.
export const RED_500 = '#EF4444';
