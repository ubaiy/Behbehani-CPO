import { Injectable, computed, signal } from '@angular/core';

/**
 * Shared, in-memory representation of the vehicle the customer is selling.
 * Collected across the multi-page sell flow (`/sell/details` → `/sell/choose`
 * → `/sell/concierge`). `askingPriceKwd` is captured for product analytics
 * only — the inspection-booking DTO does NOT carry it (the backend Zod
 * schema would reject it). Keep it out of any submitted payload.
 */
export interface VehicleDetails {
  /** Brand id (e.g. `toyota`, `lexus`) if the brand is one of our known
   *  catalogue brands. Use `brandName` for the user-facing string. */
  brandId?: string;
  /** Display name of the brand (e.g. `Toyota`, `Acura`). Always present. */
  brandName: string;
  /** Model name as typed/selected by the user (e.g. `Camry`, `LX 600`). */
  model: string;
  year: number;
  trim: string;
  mileageKm: number;
  /** Product-insight only — never submit to inspection endpoint. */
  askingPriceKwd?: number;
}

export type SellPlan = 'concierge' | 'self';

const STORAGE_KEY = 'bm.sell.wizard';

interface PersistedShape {
  vehicle: VehicleDetails | null;
  plan: SellPlan | null;
}

/**
 * Single source of truth for the multi-page sell flow. The details wizard
 * writes the vehicle, the choose-option page writes the plan, and the
 * concierge form reads both. State is mirrored to `sessionStorage` so a
 * mid-flow reload doesn't blow away the user's progress (they can still
 * abandon by clearing the tab or hitting `clear()`).
 */
@Injectable({ providedIn: 'root' })
export class SellWizardStateService {
  readonly vehicle = signal<VehicleDetails | null>(null);
  readonly plan = signal<SellPlan | null>(null);

  readonly hasVehicle = computed(() => this.vehicle() !== null);

  constructor() {
    this.restore();
  }

  setVehicle(v: VehicleDetails): void {
    this.vehicle.set(v);
    this.persist();
  }

  setPlan(p: SellPlan): void {
    this.plan.set(p);
    this.persist();
  }

  clear(): void {
    this.vehicle.set(null);
    this.plan.set(null);
    if (typeof sessionStorage === 'undefined') return;
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* Storage quota or privacy mode — non-fatal. */
    }
  }

  private persist(): void {
    if (typeof sessionStorage === 'undefined') return;
    const payload: PersistedShape = { vehicle: this.vehicle(), plan: this.plan() };
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      /* Quota exceeded or private-mode storage — non-fatal. */
    }
  }

  private restore(): void {
    if (typeof sessionStorage === 'undefined') return;
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<PersistedShape>;
      if (parsed.vehicle && this.isValidVehicle(parsed.vehicle)) {
        this.vehicle.set(parsed.vehicle);
      }
      if (parsed.plan === 'concierge' || parsed.plan === 'self') {
        this.plan.set(parsed.plan);
      }
    } catch {
      /* Corrupt or non-JSON payload — silently discard. */
    }
  }

  private isValidVehicle(v: unknown): v is VehicleDetails {
    if (!v || typeof v !== 'object') return false;
    const r = v as Record<string, unknown>;
    return (
      typeof r['brandName'] === 'string' &&
      typeof r['model'] === 'string' &&
      typeof r['year'] === 'number' &&
      typeof r['trim'] === 'string' &&
      typeof r['mileageKm'] === 'number'
    );
  }
}
