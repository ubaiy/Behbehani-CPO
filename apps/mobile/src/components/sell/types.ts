/**
 * Shared types for the Sell / Concierge booking wizard.
 * Imported by sell.tsx and all sub-components.
 */

export type Step = 1 | 2 | 3;
export type PreferredWindow = 'morning' | 'afternoon' | 'evening';
export type Governorate =
  | 'capital'
  | 'hawalli'
  | 'farwaniya'
  | 'mubarak_al_kabeer'
  | 'ahmadi'
  | 'jahra';

export interface SellFormState {
  // Vehicle — filled from upstream; hard-coded defaults for now
  vehicleYear: number;
  vehicleBrand: string;
  vehicleModel: string;
  vehicleVin?: string;
  vehicleMileageKm: number;
  vehicleTransmission: 'automatic' | 'manual' | 'cvt';
  // Where
  addressLine: string;
  governorate?: Governorate;
  parkingNotes?: string;
  // When
  selectedDate: string; // ISO date string
  preferredWindow: PreferredWindow;
  // Contact
  fullName: string;
  mobile: string;
  email: string;
  // T&Cs
  agreedToTerms: boolean;
}

export interface DateCard {
  label: string;   // "Today" | "Tomorrow" | weekday abbrev
  dayNum: number;
  month: string;
  iso: string;
}
