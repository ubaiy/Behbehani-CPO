import type { FormBuilder, FormGroup } from '@angular/forms';
import { Validators } from '@angular/forms';

/**
 * Plain types + form factory for the listing-edit page. Extracted so the
 * component file stays under the 500-line cap. No Angular wiring beyond the
 * FormBuilder dependency.
 */

export interface Brand {
  id: string;
  nameEn: string;
  nameAr: string;
}

export interface ModelItem {
  id: string;
  nameEn: string;
  nameAr: string;
  brandId: string;
  trims: Array<{ id: string; name: string }>;
}

export interface BodyType {
  id: string;
  nameEn: string;
  nameAr: string;
}

export type ActiveTab =
  | 'overview'
  | 'specifications'
  | 'pricing'
  | 'media'
  | 'inspection'
  | 'history';

export type DescLang = 'en' | 'ar';

/**
 * Build the listing-edit FormGroup. The shape matches the unified Overview +
 * Specifications + Pricing tabs — tab components reference these control
 * names via `formControlName`.
 */
export function buildListingEditForm(fb: FormBuilder): FormGroup {
  return fb.group({
    // Overview
    titleEn: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(160)]],
    titleAr: ['', [Validators.maxLength(160)]],
    vin: ['', [Validators.required, Validators.pattern(/^[A-HJ-NPR-Z0-9]{17}$/i)]],
    brandId: ['', Validators.required],
    modelId: ['', Validators.required],
    trimId: [''],
    bodyTypeId: ['', Validators.required],
    year: [new Date().getFullYear(), [Validators.required, Validators.min(1990), Validators.max(new Date().getFullYear() + 1)]],
    mileageKm: [0, [Validators.required, Validators.min(0), Validators.max(1_000_000)]],
    descriptionEn: ['', Validators.maxLength(8000)],
    descriptionAr: ['', Validators.maxLength(8000)],
    // Specifications
    exteriorColor: ['', [Validators.required, Validators.maxLength(60)]],
    interiorColor: ['', [Validators.required, Validators.maxLength(60)]],
    transmission: ['automatic', Validators.required],
    fuelType: ['petrol', Validators.required],
    engineCc: [null as number | null, [Validators.min(500), Validators.max(9000)]],
    cylinders: [null as number | null, [Validators.min(2), Validators.max(16)]],
    drivetrain: ['fwd', Validators.required],
    seats: [5, [Validators.required, Validators.min(1), Validators.max(20)]],
    doors: [4, [Validators.required, Validators.min(2), Validators.max(6)]],
    gccSpec: [true],
    previousOwners: [1, [Validators.min(0), Validators.max(20)]],
    serviceHistory: [false],
    accidentHistory: [false],
    accidentNotes: ['', Validators.maxLength(2000)],
    // Pricing — form holds KWD string; converted to fils on submit
    priceKwd: ['', Validators.required],
    costKwd: [''],
    agingDiscountEnabled: [true],
  });
}
