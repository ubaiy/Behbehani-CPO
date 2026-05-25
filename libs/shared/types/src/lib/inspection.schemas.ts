import { z } from 'zod';

/**
 * Inspection module — shared types.
 *
 * Two kinds of inspection (both performed by Behbehani's internal team):
 *   - CPO        — Behbehani inventory (Listing required). Inspector signs only.
 *   - Concierge  — Customer wants to sell their car to Behbehani. Inspector
 *                  AND customer sign. Inspection performed on-site at the
 *                  customer's address.
 *
 * Storefront promise: 71-point inspection. The rubric below MUST stay at
 * exactly 71 items.
 *
 * See CONCIERGE_INSPECTION_API_CONTRACT.md at project root for the joint
 * contract between the admin session (this) and the storefront session.
 */

// ─── Kind / status / signature method ───────────────────────────────────────

export const INSPECTION_KINDS = ['cpo', 'concierge'] as const;
export type InspectionKind = (typeof INSPECTION_KINDS)[number];

export const INSPECTION_STATUSES = [
  'draft',
  'in_progress',
  'awaiting_inspector_signoff',
  'awaiting_customer_signature', // concierge only
  'signed_off',
] as const;
export type InspectionStatus = (typeof INSPECTION_STATUSES)[number];

export const ITEM_STATUSES = ['pass', 'advisory', 'fail'] as const;
export type InspectionItemStatus = (typeof ITEM_STATUSES)[number];

export const SIGNATURE_METHODS = ['in_person', 'remote_link'] as const;
export type CustomerSignatureMethod = (typeof SIGNATURE_METHODS)[number];

export const PREFERRED_WINDOWS = ['morning', 'afternoon', 'evening'] as const;
export type PreferredWindow = (typeof PREFERRED_WINDOWS)[number];

// ─── 71-item rubric ─────────────────────────────────────────────────────────
// Each item has a stable `id` (kebab-case, namespaced by section). IDs must
// NEVER be reused or renamed — they're referenced from signed reports.
// Labels CAN change (cosmetic). To remove an item: set `deprecated: true`
// rather than deleting — old reports still reference it.

export type RubricSectionKey =
  | 'exterior'
  | 'interior'
  | 'engine_drivetrain'
  | 'electrical'
  | 'safety'
  | 'documentation';

export interface RubricItem {
  /** Stable kebab-case ID, namespaced by section, e.g. 'exterior.body-hood'. */
  id: string;
  labelEn: string;
  labelAr: string;
  /** Brief inspector hint shown below the label. */
  hintEn?: string;
  /** When true: not shown on new inspections; kept so old reports still resolve. */
  deprecated?: boolean;
}

export interface RubricSection {
  key: RubricSectionKey;
  labelEn: string;
  labelAr: string;
  items: RubricItem[];
}

export const INSPECTION_RUBRIC: readonly RubricSection[] = [
  {
    key: 'exterior',
    labelEn: 'Exterior',
    labelAr: 'الهيكل الخارجي',
    items: [
      { id: 'exterior.body-hood',       labelEn: 'Hood',                       labelAr: 'غطاء المحرك',           hintEn: 'No dents, alignment with fenders, latch operates.' },
      { id: 'exterior.body-trunk',      labelEn: 'Trunk / tailgate',           labelAr: 'الصندوق الخلفي',        hintEn: 'Seal intact, opens and closes flush.' },
      { id: 'exterior.body-door-fl',    labelEn: 'Front-left door',            labelAr: 'الباب الأمامي الأيسر',  hintEn: 'No dents, hinge play, weatherstrip intact.' },
      { id: 'exterior.body-door-fr',    labelEn: 'Front-right door',           labelAr: 'الباب الأمامي الأيمن',  hintEn: 'No dents, hinge play, weatherstrip intact.' },
      { id: 'exterior.body-door-rl',    labelEn: 'Rear-left door',             labelAr: 'الباب الخلفي الأيسر',   hintEn: 'No dents, hinge play, weatherstrip intact.' },
      { id: 'exterior.body-door-rr',    labelEn: 'Rear-right door',            labelAr: 'الباب الخلفي الأيمن',   hintEn: 'No dents, hinge play, weatherstrip intact.' },
      { id: 'exterior.bumper-front',    labelEn: 'Front bumper',               labelAr: 'الصدّام الأمامي',       hintEn: 'No cracks, alignment, no aftermarket bolts.' },
      { id: 'exterior.bumper-rear',     labelEn: 'Rear bumper',                labelAr: 'الصدّام الخلفي',        hintEn: 'No cracks, alignment, sensors intact.' },
      { id: 'exterior.paint',           labelEn: 'Paint condition',            labelAr: 'حالة الطلاء',           hintEn: 'Color match, no oxidation, no clear-coat peel.' },
      { id: 'exterior.glass',           labelEn: 'Glass (windshield, windows)', labelAr: 'الزجاج',                hintEn: 'No cracks > 5 cm, no star chips in driver line of sight.' },
      { id: 'exterior.lights',          labelEn: 'Lights (head/tail/indicator)', labelAr: 'المصابيح',              hintEn: 'All functional, lenses clear, no condensation.' },
      { id: 'exterior.tires',           labelEn: 'Tires — tread + sidewall',   labelAr: 'الإطارات',              hintEn: 'Tread ≥ 4/32" all corners, no bulges or cracks.' },
      { id: 'exterior.wheels',          labelEn: 'Wheels / rims',              labelAr: 'الجنوط',                 hintEn: 'No curb rash > minor, no bends, lugs torqued.' },
      { id: 'exterior.mirrors',         labelEn: 'Side mirrors',               labelAr: 'المرايا الجانبية',       hintEn: 'Electric adjustment + heating function.' },
    ],
  },
  {
    key: 'interior',
    labelEn: 'Interior',
    labelAr: 'الداخلية',
    items: [
      { id: 'interior.seat-driver',     labelEn: 'Driver seat',                labelAr: 'مقعد السائق',            hintEn: 'Upholstery condition, electric adjustment, memory function if equipped.' },
      { id: 'interior.seat-passenger',  labelEn: 'Front passenger seat',       labelAr: 'مقعد الراكب الأمامي',    hintEn: 'Upholstery, adjustment function.' },
      { id: 'interior.seat-rear',       labelEn: 'Rear seats',                 labelAr: 'المقاعد الخلفية',         hintEn: 'Upholstery, folding mechanism if applicable.' },
      { id: 'interior.dashboard',       labelEn: 'Dashboard',                  labelAr: 'لوحة القيادة',           hintEn: 'No cracks, no UV fade, all gauges functional.' },
      { id: 'interior.steering-wheel',  labelEn: 'Steering wheel + controls',  labelAr: 'عجلة القيادة',           hintEn: 'No glaze, all buttons functional, horn works.' },
      { id: 'interior.infotainment',    labelEn: 'Infotainment system',        labelAr: 'نظام المعلومات والترفيه', hintEn: 'Touchscreen responsive, audio works all speakers, nav loads.' },
      { id: 'interior.climate',         labelEn: 'Climate control (A/C + heat)', labelAr: 'التكييف والتدفئة',       hintEn: 'A/C cold within 3 min, heater warm within 2 min, all vents.' },
      { id: 'interior.headliner',       labelEn: 'Headliner',                  labelAr: 'سقف الكابينة الداخلي',   hintEn: 'No sagging, no stains, sunroof function if equipped.' },
      { id: 'interior.carpet-mats',     labelEn: 'Carpet + floor mats',        labelAr: 'السجاد والدواسات',       hintEn: 'No staining, no wet/musty smell.' },
      { id: 'interior.door-panels',     labelEn: 'Door panels',                labelAr: 'تكسية الأبواب',          hintEn: 'No delamination, armrest condition.' },
      { id: 'interior.sun-visors',      labelEn: 'Sun visors + mirrors',       labelAr: 'الواقيات الشمسية',       hintEn: 'Operate freely, mirror clips and lights work.' },
      { id: 'interior.gear-console',    labelEn: 'Gear shifter + center console', labelAr: 'ناقل الحركة والوسطية', hintEn: 'Smooth operation, no excessive wear, console latches.' },
    ],
  },
  {
    key: 'engine_drivetrain',
    labelEn: 'Engine & Drivetrain',
    labelAr: 'المحرك والنقل',
    items: [
      { id: 'engine.bay',               labelEn: 'Engine bay condition',       labelAr: 'حجرة المحرك',            hintEn: 'No oil leaks, no debris, no missing engine cover bolts.' },
      { id: 'engine.performance',       labelEn: 'Engine performance',         labelAr: 'أداء المحرك',            hintEn: 'Smooth idle, no knocking, no excessive vibration.' },
      { id: 'engine.transmission',      labelEn: 'Transmission',               labelAr: 'ناقل الحركة',            hintEn: 'Smooth shifts, no slippage, no flare-up.' },
      { id: 'engine.brakes',            labelEn: 'Brakes (pads, rotors, fluid)', labelAr: 'المكابح',                hintEn: 'Front pads ≥ 4 mm, rotors free of grooves, fluid clean.' },
      { id: 'engine.suspension',        labelEn: 'Suspension (shocks, struts)', labelAr: 'نظام التعليق',           hintEn: 'No bouncing, no knocking on bumps, no visible leaks.' },
      { id: 'engine.steering',          labelEn: 'Steering feel',              labelAr: 'إحساس التوجيه',          hintEn: 'No play, no pulling, fluid level if hydraulic.' },
      { id: 'engine.exhaust',           labelEn: 'Exhaust system',             labelAr: 'نظام العادم',            hintEn: 'No rust holes, no leaks, mounts tight.' },
      { id: 'engine.fluids-oil',        labelEn: 'Engine oil level + condition', labelAr: 'زيت المحرك',             hintEn: 'Level mid-stick, golden-brown not black, no metallic shimmer.' },
      { id: 'engine.fluids-coolant',    labelEn: 'Coolant level + condition',  labelAr: 'سائل التبريد',           hintEn: 'Level at MAX cold, green/orange not rusty, no oily film.' },
      { id: 'engine.fluids-trans',      labelEn: 'Transmission fluid',         labelAr: 'زيت ناقل الحركة',        hintEn: 'Level, red color (not brown/burnt smell).' },
      { id: 'engine.fluids-brake',      labelEn: 'Brake fluid',                labelAr: 'سائل المكابح',           hintEn: 'Level between MIN/MAX, clear amber not dark.' },
      { id: 'engine.fluids-ps',         labelEn: 'Power steering fluid',       labelAr: 'زيت دركسيون',            hintEn: 'Level, red/amber not foamy.' },
      { id: 'engine.cv-joints',         labelEn: 'CV joints / drive shafts',   labelAr: 'مفاصل ودرافيل',           hintEn: 'Boots intact, no grease leaks, no clicking on full lock.' },
      { id: 'engine.motor-mounts',      labelEn: 'Motor mounts',               labelAr: 'حشوات المحرك',           hintEn: 'No cracks, no excessive engine movement under throttle.' },
    ],
  },
  {
    key: 'electrical',
    labelEn: 'Electrical',
    labelAr: 'الكهرباء',
    items: [
      { id: 'electrical.battery',       labelEn: 'Battery health',             labelAr: 'البطارية',                hintEn: '≥ 12.4 V resting, terminals clean, no swelling.' },
      { id: 'electrical.alternator',    labelEn: 'Alternator output',          labelAr: 'الدينمو',                 hintEn: '13.8 – 14.6 V at 1500 rpm, belt tension correct.' },
      { id: 'electrical.starter',       labelEn: 'Starter motor',              labelAr: 'بادئ الحركة',             hintEn: 'Cranks immediately, no grinding, no hot-start issues.' },
      { id: 'electrical.lighting-harness', labelEn: 'Interior lighting + harness', labelAr: 'الإضاءة الداخلية',      hintEn: 'Dome, map, vanity, glove-box, trunk lights all work.' },
      { id: 'electrical.windows',       labelEn: 'Power windows',              labelAr: 'النوافذ الكهربائية',     hintEn: 'All windows up/down smoothly, auto-up and pinch-protect.' },
      { id: 'electrical.locks',         labelEn: 'Central locking + remote',   labelAr: 'الأقفال المركزية',       hintEn: 'Key fob range OK, all doors lock/unlock together.' },
      { id: 'electrical.cruise',        labelEn: 'Cruise control',             labelAr: 'مثبت السرعة',             hintEn: 'Engages, holds set speed, cancels on brake.' },
      { id: 'electrical.sensors',       labelEn: 'Parking + lane sensors',     labelAr: 'حساسات الركن واللين',    hintEn: 'Beeps + visual indicator function, no permanent warnings.' },
      { id: 'electrical.wiring-visible', labelEn: 'Visible wiring',            labelAr: 'الأسلاك الظاهرة',         hintEn: 'No exposed copper, no rodent damage, no tape-bound aftermarket runs.' },
      { id: 'electrical.connectivity',  labelEn: 'Bluetooth / USB / Aux',      labelAr: 'البلوتوث والوصلات',        hintEn: 'Phone pairs, USB charges and reads, no port damage.' },
    ],
  },
  {
    key: 'safety',
    labelEn: 'Safety',
    labelAr: 'السلامة',
    items: [
      { id: 'safety.airbag-warning',    labelEn: 'Airbag warning light',       labelAr: 'تحذير الوسائد الهوائية',  hintEn: 'Off after ignition self-test, no DTC.' },
      { id: 'safety.seatbelt-driver',   labelEn: 'Driver seatbelt',            labelAr: 'حزام السائق',             hintEn: 'Webbing intact, retracts, latches firmly.' },
      { id: 'safety.seatbelt-passenger', labelEn: 'Front passenger seatbelt',   labelAr: 'حزام الراكب الأمامي',     hintEn: 'Webbing intact, retracts, latches firmly.' },
      { id: 'safety.seatbelts-rear',    labelEn: 'Rear seatbelts (all)',       labelAr: 'أحزمة المقاعد الخلفية',   hintEn: 'Each rear belt webbing intact, retracts, latches.' },
      { id: 'safety.abs',               labelEn: 'ABS system',                 labelAr: 'نظام منع انغلاق المكابح', hintEn: 'No ABS warning, pedal feedback on hard stop.' },
      { id: 'safety.traction-control',  labelEn: 'Traction / stability',       labelAr: 'التحكم بالثبات',          hintEn: 'No fault light, intervention felt on slip simulation.' },
      { id: 'safety.tpms',              labelEn: 'Tire pressure monitor',      labelAr: 'حساس ضغط الإطارات',       hintEn: 'No warning light, all 4 sensors reporting.' },
      { id: 'safety.backup-camera',     labelEn: 'Backup camera',              labelAr: 'كاميرا الرجوع',           hintEn: 'Clear image, guidelines render, no lag.' },
      { id: 'safety.blind-spot',        labelEn: 'Blind-spot monitor',         labelAr: 'مراقب النقاط العمياء',    hintEn: 'If equipped: indicator lights on adjacent vehicles, no DTC.' },
      { id: 'safety.child-locks',       labelEn: 'Rear child locks',           labelAr: 'أقفال أمان الأطفال',     hintEn: 'Engage and hold rear doors closed from inside.' },
      { id: 'safety.spare-tools',       labelEn: 'Spare tire + jack + tools',  labelAr: 'الإطار الاحتياطي والعدة', hintEn: 'Spare inflated, jack present, lug wrench fits.' },
    ],
  },
  {
    key: 'documentation',
    labelEn: 'Documentation',
    labelAr: 'الوثائق',
    items: [
      { id: 'docs.registration',        labelEn: 'Registration card',          labelAr: 'دفتر الاستمارة',          hintEn: 'Original, name matches owner, expiry future.' },
      { id: 'docs.service-history',     labelEn: 'Service history',            labelAr: 'سجل الصيانة',             hintEn: 'Stamps or invoices, gaps explained.' },
      { id: 'docs.owners-manual',       labelEn: "Owner's manual",             labelAr: 'دليل المالك',              hintEn: 'Present in glovebox, model-correct.' },
      { id: 'docs.vehicle-history',     labelEn: 'Vehicle history',            labelAr: 'تاريخ المركبة',           hintEn: 'No major accident flags in MOI or external check.' },
      { id: 'docs.accident-records',    labelEn: 'Accident records',           labelAr: 'سجل الحوادث',             hintEn: 'Customer-declared accidents match physical inspection.' },
      { id: 'docs.ownership-chain',     labelEn: 'Ownership chain',            labelAr: 'تسلسل الملكية',            hintEn: 'Previous-owners count matches registration history.' },
      { id: 'docs.insurance',           labelEn: 'Insurance current',          labelAr: 'تأمين ساري',              hintEn: 'Policy active, comprehensive or third-party noted.' },
      { id: 'docs.moi-status',          labelEn: 'MOI status (no holds)',      labelAr: 'وضع وزارة الداخلية',      hintEn: 'No traffic hold, no impound flag.' },
      { id: 'docs.customs',             labelEn: 'Customs / import papers',    labelAr: 'وثائق الجمارك',            hintEn: 'GCC spec confirmed, customs cleared.' },
      { id: 'docs.finance-lien',        labelEn: 'Finance lien check',         labelAr: 'فحص رهن التمويل',          hintEn: 'No outstanding loan against the vehicle.' },
    ],
  },
] as const;

/** Total number of items in the rubric — MUST stay at 71 (storefront promise). */
export const INSPECTION_RUBRIC_TOTAL = INSPECTION_RUBRIC.reduce(
  (sum, sec) => sum + sec.items.filter((i) => !i.deprecated).length,
  0,
);
// Build-time assertion — Zod can't sanity-check this; rely on a test instead.

// ─── reportJson typing ──────────────────────────────────────────────────────
// Shape stored in InspectionReport.reportJson. Use a discriminated union of
// optional fields rather than enforcing every item at the type level (we
// don't want a partial save to fail Zod parsing).

export const InspectionItemResultSchema = z.object({
  itemId: z.string(),
  status: z.enum(ITEM_STATUSES),
  notes: z.string().max(280).optional(),
  /** S3 keys for photo evidence, up to 3 per item. */
  photoKeys: z.array(z.string()).max(3).default([]),
});
export type InspectionItemResult = z.infer<typeof InspectionItemResultSchema>;

export const InspectionReportJsonSchema = z.object({
  items: z.array(InspectionItemResultSchema),
});
export type InspectionReportJson = z.infer<typeof InspectionReportJsonSchema>;

// ─── Customer-facing slim DTOs ──────────────────────────────────────────────
// Used by the public signing page (mockup 05) and the customer status tracker.
// No inspector PII, no internal notes — just the report summary.

export const PublicVehicleSnapshotSchema = z.object({
  year: z.number().int().nullable(),
  brand: z.string().nullable(),
  model: z.string().nullable(),
  vinMasked: z.string().nullable(),
  mileageKm: z.number().int().nullable(),
});
export type PublicVehicleSnapshot = z.infer<typeof PublicVehicleSnapshotSchema>;

export const PublicInspectionSummarySchema = z.object({
  id: z.string().uuid(),
  status: z.enum(INSPECTION_STATUSES),
  vehicle: PublicVehicleSnapshotSchema,
  inspectedAt: z.string().datetime().nullable(),
  inspectorName: z.string().nullable(),
  overallScore: z.number().int().nullable(),
  sectionScores: z.record(z.string(), z.number().int()),
  itemsNeedingAttention: z.array(
    z.object({
      itemId: z.string(),
      labelEn: z.string(),
      labelAr: z.string(),
      status: z.enum(['advisory', 'fail']),
      notes: z.string().nullable(),
    }),
  ),
  /** Only set for Concierge sign-link page. Reflects token expiry. */
  signLinkExpiresAt: z.string().datetime().nullable(),
});
export type PublicInspectionSummary = z.infer<typeof PublicInspectionSummarySchema>;

// ─── Admin DTOs ─────────────────────────────────────────────────────────────

export const InspectionFilterSchema = z.object({
  q: z.string().trim().max(120).optional(),
  kind: z.enum(INSPECTION_KINDS).optional(),
  status: z.enum(INSPECTION_STATUSES).optional(),
  inspectorId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});
export type InspectionFilter = z.infer<typeof InspectionFilterSchema>;

export const InspectionSummaryDtoSchema = z.object({
  id: z.string().uuid(),
  kind: z.enum(INSPECTION_KINDS),
  status: z.enum(INSPECTION_STATUSES),
  // CPO: stock + listing reference; Concierge: customer summary
  listing: z
    .object({ id: z.string().uuid(), stockNumber: z.string(), titleEn: z.string() })
    .nullable(),
  customer: z
    .object({
      id: z.string().uuid(),
      fullName: z.string(),
      mobile: z.string().nullable(),
      email: z.string().nullable(),
    })
    .nullable(),
  vehicleLabel: z.string(), // computed: "2020 Lexus RX 350" or Listing.titleEn
  vinMasked: z.string().nullable(),
  // Vehicle snapshot — populated only for concierge (CPO derives from Listing).
  vehicleYear: z.number().int().nullable(),
  vehicleBrandName: z.string().nullable(),
  vehicleModelName: z.string().nullable(),
  vehicleMileageKm: z.number().int().nullable(),
  vehicleTransmission: z.string().nullable(),
  // On-site location — populated only for concierge.
  locationAddress: z.string().nullable(),
  locationGovernorate: z.string().nullable(),
  inspector: z.object({ id: z.string().uuid(), fullName: z.string() }).nullable(),
  scoredCount: z.number().int(),
  totalCount: z.number().int(),
  overallScore: z.number().int().nullable(),
  scheduledFor: z.string().datetime().nullable(),
  /**
   * When the inspector first engages with the report. Maps preferentially to
   * `scheduledFor` (the admin-confirmed exact slot); falls back to `createdAt`
   * for CPO / unscheduled records.
   */
  startedAt: z.string().datetime().nullable(),
  updatedAt: z.string().datetime(),
  /**
   * v1.5.36 — latest non-withdrawn Offer for this Concierge inspection
   * (Concierge-only; null for CPO and for inspections without an offer).
   * The admin Inspection edit + sign-off pages use this to swap the
   * "Create buy offer →" banner for a "View existing offer →" link when a
   * non-final offer is already on the row. `amountFils` is the BigInt
   * serialised as string (mirrors PaymentSummary's amountFils).
   *
   * Final offer statuses (`declined`, `expired`) still let admin create a
   * new offer — those surface as latestOffer set + the FE renders an
   * informational "Previous offer was declined/expired — create another?"
   * variant. `withdrawn` rows are filtered server-side so they don't block
   * re-issuance.
   */
  latestOffer: z
    .object({
      id: z.string().uuid(),
      status: z.string(),    // OfferStatus enum
      amountFils: z.string(), // BigInt serialised as string
    })
    .nullable(),
});
export type InspectionSummaryDto = z.infer<typeof InspectionSummaryDtoSchema>;

export const InspectionListResponseSchema = z.object({
  items: z.array(InspectionSummaryDtoSchema),
  total: z.number().int(),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
});
export type InspectionListResponse = z.infer<typeof InspectionListResponseSchema>;

/**
 * Admin queue KPI counts — one row per status with non-zero count, plus a
 * grand total. Returned by GET /v1/admin/inspections/kpi. Optionally filtered
 * by `kind` so the strip matches the queue's current tab.
 */
export const InspectionKpiResponseSchema = z.object({
  total: z.number().int(),
  byStatus: z.record(z.enum(INSPECTION_STATUSES), z.number().int()),
});
export type InspectionKpiResponse = z.infer<typeof InspectionKpiResponseSchema>;

/** Create a CPO inspection — listing must already be in `inspection` stage. */
export const CreateCpoInspectionSchema = z.object({
  kind: z.literal('cpo'),
  listingId: z.string().uuid(),
});
export type CreateCpoInspectionDto = z.infer<typeof CreateCpoInspectionSchema>;

/**
 * Customer-chosen preference for the inspection slot. Customer picks a
 * calendar date + a 3-option window — the exact `scheduledFor` time is set
 * by the admin inspection_officer when they accept the booking.
 */
export const CustomerPreferenceSchema = z.object({
  preferredDate: z.string().date(),
  window: z.enum(PREFERRED_WINDOWS),
});
export type CustomerPreference = z.infer<typeof CustomerPreferenceSchema>;

/**
 * Storefront wizard extras — preserved on the inspection record so the
 * inspector sees what the customer initially declared (trim, regional spec,
 * colors, self-declared accidents). Inspector references but never
 * authoritative; the rubric scores trump these.
 */
export const CustomerDeclaredSchema = z.object({
  trim: z.string().max(40).optional(),
  regionalSpecs: z.enum(['gcc', 'american', 'european', 'japanese', 'other']).optional(),
  exteriorColor: z.string().max(40).optional(),
  interiorColor: z.string().max(40).optional(),
  accidents: z.enum(['none', 'minor', 'major']).optional(),
});
export type CustomerDeclared = z.infer<typeof CustomerDeclaredSchema>;

/**
 * Create a Concierge inspection — used by BOTH:
 *  - the public storefront booking endpoint (session A's controller)
 *  - admin manual entry from the queue page (walk-in/phone bookings)
 *
 * VIN is optional at booking — many customers don't know it. The inspector
 * verifies + records the VIN on-site, patches via PATCH /admin/inspections/:id.
 */
export const CreateConciergeInspectionSchema = z.object({
  kind: z.literal('concierge'),
  customer: z.object({
    fullName: z.string().min(2).max(200),
    mobile: z.string().regex(/^(\+965)?[569]\d{7}$/),
    email: z.string().email().optional(),
  }),
  vehicle: z.object({
    year: z.number().int().min(1990).max(new Date().getUTCFullYear() + 1),
    brandName: z.string().min(1).max(60),
    modelName: z.string().min(1).max(60),
    vin: z
      .string()
      .regex(/^[A-HJ-NPR-Z0-9]{17}$/, 'VIN must be 17 chars without I, O, or Q')
      .optional(),
    mileageKm: z.number().int().min(0).max(1_000_000),
    transmission: z.string().max(20).optional(),
  }),
  location: z.object({
    address: z.string().min(3).max(280),
    governorate: z.string().max(40).optional(),
    lat: z.number().optional(),
    lng: z.number().optional(),
  }),
  /** Customer-chosen preference (admin sets exact `scheduledFor` later). */
  customerPreference: CustomerPreferenceSchema.optional(),
  /** Access/parking notes — "gated community, call at gate", etc. */
  notes: z.string().max(500).optional(),
  /** Storefront wizard extras preserved on the record. */
  customerDeclared: CustomerDeclaredSchema.optional(),
});
export type CreateConciergeInspectionDto = z.infer<typeof CreateConciergeInspectionSchema>;

export const CreateInspectionSchema = z.discriminatedUnion('kind', [
  CreateCpoInspectionSchema,
  CreateConciergeInspectionSchema,
]);
export type CreateInspectionDto = z.infer<typeof CreateInspectionSchema>;

/** PATCH body — save in-progress item scores + notes. */
export const SaveInspectionProgressSchema = z.object({
  items: z.array(InspectionItemResultSchema).max(200),
});
export type SaveInspectionProgressDto = z.infer<typeof SaveInspectionProgressSchema>;

/** Photo presign request (per-item evidence — image only, max 5 MB). */
export const InspectionPhotoPresignSchema = z.object({
  itemId: z.string(),
  contentType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/heic']),
  byteSize: z.number().int().min(1).max(5 * 1024 * 1024),
});
export type InspectionPhotoPresignDto = z.infer<typeof InspectionPhotoPresignSchema>;

export const InspectionPhotoPresignResponseSchema = z.object({
  uploadUrl: z.string().url(),
  s3Key: z.string(),
  publicUrl: z.string().url(),
  expiresAt: z.string().datetime(),
});
export type InspectionPhotoPresignResponse = z.infer<typeof InspectionPhotoPresignResponseSchema>;

/**
 * Inspector sign-off body.
 * - CPO: server finalizes immediately.
 * - Concierge in-person: customerSignaturePayload required → server finalizes.
 * - Concierge remote-link: customerSignatureMethod='remote_link' → server
 *   transitions to awaiting_customer_signature and returns customerSignToken.
 */
export const SignoffSchema = z.discriminatedUnion('mode', [
  z.object({
    mode: z.literal('cpo'),
    // F2: optional flag emitted by the CPO signoff confirm modal (§16 D10).
    // When true, the backend will advance the linked listing from
    // inspection → photoshoot immediately after the signoff commits.
    // Ignored when false or absent.
    advanceToPhotoshoot: z.boolean().optional(),
  }),
  z.object({
    mode: z.literal('concierge_in_person'),
    customerSignature: z.object({
      drawnSignatureSvg: z.string().min(20).max(50_000),
      typedName: z.string().min(2).max(200),
      civilIdLast4: z.string().regex(/^\d{4}$/).optional(),
      accepted: z.object({
        owner: z.literal(true),
        accurate: z.literal(true),
        useForOffer: z.literal(true),
      }),
    }),
  }),
  z.object({
    mode: z.literal('concierge_remote_link'),
  }),
]);
export type SignoffDto = z.infer<typeof SignoffSchema>;

export const SignoffResponseSchema = z.object({
  inspectionId: z.string().uuid(),
  status: z.enum(INSPECTION_STATUSES),
  /** Set only for concierge_remote_link mode. */
  customerSignUrl: z.string().url().nullable(),
  customerSignTokenExpiresAt: z.string().datetime().nullable(),
});
export type SignoffResponse = z.infer<typeof SignoffResponseSchema>;

/** Body of POST /v1/public/inspection-sign/:token */
export const CustomerSignSchema = z.object({
  drawnSignatureSvg: z.string().min(20).max(50_000),
  typedName: z.string().min(2).max(200),
  civilIdLast4: z.string().regex(/^\d{4}$/).optional(),
  accepted: z.object({
    owner: z.literal(true),
    accurate: z.literal(true),
    useForOffer: z.literal(true),
  }),
});
export type CustomerSignDto = z.infer<typeof CustomerSignSchema>;

// ─── Public Concierge booking DTOs ─────────────────────────────────────────
// Session A's storefront calls POST /v1/public/concierge/inspections and
// optionally polls GET /v1/public/concierge/inspections/:bookingRef. Both
// responses go through the schemas below.

/**
 * Response of POST /v1/public/concierge/inspections — the customer's
 * confirmation page reads this to show "Mohammed, your inspection is booked".
 */
export const CreateConciergeInspectionResponseSchema = z.object({
  id: z.string().uuid(),
  bookingRef: z.string(),
  status: z.enum(INSPECTION_STATUSES),
  customerPreference: CustomerPreferenceSchema.nullable(),
  /** Echo back for the confirmation page UX. */
  customerFullName: z.string(),
  customerMobile: z.string(),
});
export type CreateConciergeInspectionResponse = z.infer<typeof CreateConciergeInspectionResponseSchema>;

/**
 * Slim DTO for the customer-facing tracker page (v1.5 — session A renders).
 * No inspector PII, no internal notes — just what the customer needs to see.
 *
 * v1.5.13 → v1.5.14 evolution history:
 *   v1.5.13: inspector shape was { name, phoneE164? } per C v0.22 §3.
 *   v1.5.14: consolidated with A's [ASK A→B-2] richer spec. Legacy `name` +
 *            `phoneE164` fields are kept and populated with the same values as
 *            `fullName` / `whatsappE164` for back-compat with v1.5.13 consumers
 *            (C's mobile `buildInspectorInfo()` — migrate to new names at
 *            convenience). `rating` + `completedCount` are optional/undefined
 *            until the DB rating infrastructure ships (planned v1.6+).
 */
export const ConciergeBookingStatusSchema = z.object({
  bookingRef: z.string(),
  status: z.enum(INSPECTION_STATUSES),
  vehicle: PublicVehicleSnapshotSchema,
  customerPreference: CustomerPreferenceSchema.nullable(),
  /** True once an inspection_officer has been assigned. */
  inspectorAssigned: z.boolean(),
  /**
   * v1.5.14: richer inspector identity (consolidated from C v0.22 §3 + A [ASK A→B-2]).
   * Null when no inspector has been assigned yet (status='draft' typically).
   *
   * PII-light: fullName + whatsappE164 only. No email / role / personal address.
   * `rating` + `completedCount` are undefined until rating infra ships (v1.6+).
   *
   * Back-compat: `name` = `fullName`; `phoneE164` = `whatsappE164`. These
   * legacy fields are populated with the same values so v1.5.13 consumers
   * continue to work without changes.
   */
  inspector: z.object({
    // v1.5.14 richer fields (A's spec, [ASK A→B-2]):
    fullName: z.string().min(1),
    /** Two-character initials, server-computed from first letters of first two name words. E.g. "YM". */
    initials: z.string().length(2),
    /** e.g. "4.9" — undefined until rating infrastructure ships (v1.6+). */
    rating: z.string().regex(/^\d\.\d$/).optional(),
    /** Undefined until rating infrastructure ships (v1.6+). */
    completedCount: z.number().int().nonnegative().optional(),
    whatsappE164: z.string().optional(),
    // v1.5.13 legacy aliases — populated with same values for back-compat:
    /** @deprecated Use fullName. Kept for v1.5.13 consumer back-compat. */
    name: z.string().min(1),
    /** @deprecated Use whatsappE164. Kept for v1.5.13 consumer back-compat. */
    phoneE164: z.string().nullable().optional(),
  }).nullable(),

  /** Set when status='signed_off' — maps from inspectorSignedAt server-side. */
  inspectedAt: z.string().datetime().nullable(),
  /** True when status='awaiting_customer_signature' AND the token is still
   *  valid — the storefront uses this to surface a "Sign now" button on the
   *  tracker page that links back to /inspection-sign/:token. */
  signLinkAvailable: z.boolean(),

  /**
   * v1.5.14 ([ASK A→B-2]): overall score 0-100 from InspectionReport.overallScore.
   * Null until status='signed_off' and the score has been computed.
   */
  overallScore: z.number().int().min(0).max(100).nullable(),

  /**
   * v1.5.14 ([ASK A→B-2]): presigned S3 GET URL for the report PDF (15-min TTL).
   * Null until the pdf-worker writes reportPdfKey post-signoff.
   */
  inspectionReportPdfUrl: z.string().url().nullable(),

  /**
   * v1.5.14 ([ASK A→B-2]): publicToken of the latest non-withdrawn offer on
   * this inspection. Used by tracker UI to deep-link to
   * /offer/:token/inspection-report. Null until BMC creates an offer
   * post-signoff.
   */
  relatedOfferToken: z.string().nullable(),

  /**
   * v1.5.14 ([ASK A→B-3]): ISO-8601 timestamp of customer cancellation.
   * Null while the booking is active.
   */
  cancelledAt: z.string().datetime().nullable(),
});
export type ConciergeBookingStatus = z.infer<typeof ConciergeBookingStatusSchema>;

// ─── v1.5.13 — Sell-bookings me-scoped reschedule (closes [ASK C→B]) ─────────

/**
 * PATCH /v1/public/me/sell-bookings/:bookingRef
 *
 * Customer self-service reschedule of their own concierge inspection. Only
 * allowed while the booking is still in `draft` status (no inspector assigned
 * yet). Once status moves to `in_progress` or beyond, customer must call
 * support — server returns 409 `BOOKING_NOT_RESCHEDULABLE`.
 */
export const RescheduleSellBookingInputSchema = z.object({
  /** ISO-8601 date (YYYY-MM-DD) — date-only, no time component. Must be ≥ today. */
  preferredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'preferredDate must be YYYY-MM-DD'),
  /** Time window during which the inspector should arrive. */
  window: z.enum(['morning', 'afternoon', 'evening']),
}).refine(
  (v) => {
    const target = new Date(v.preferredDate + 'T00:00:00Z').getTime();
    const todayUtc = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00Z').getTime();
    return target >= todayUtc;
  },
  { message: 'preferredDate must be today or later', path: ['preferredDate'] },
);
export type RescheduleSellBookingInputDto = z.infer<typeof RescheduleSellBookingInputSchema>;

/** v1.5.13 — list response for `GET /v1/public/me/sell-bookings`. Returns
 *  ConciergeBookingStatus[] (slim tracker DTO) for the customer's own bookings,
 *  filtered to concierge kind, newest first, paginated. */
export const MySellBookingsListResponseSchema = z.object({
  items: z.array(ConciergeBookingStatusSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
});
export type MySellBookingsListResponse = z.infer<typeof MySellBookingsListResponseSchema>;

// ─── v1.5.14 — Sell-bookings me-scoped cancel (closes [ASK A→B-3]) ──────────

/**
 * POST /v1/public/me/sell-bookings/:bookingRef/cancel
 *
 * Customer self-service cancellation of their own concierge inspection.
 * Only allowed while the booking is still in `draft` status (covers A's
 * `pending_assignment` + `inspector_assigned` alias names per v1.5-D10 §3).
 * Once status moves past `draft`, server returns 409 `BOOKING_NOT_CANCELLABLE`.
 *
 * Idempotent: re-cancelling an already-cancelled booking returns 200 with the
 * same `ConciergeBookingStatus` (cancelledAt populated) without erroring.
 *
 * Error codes:
 *   BOOKING_NOT_FOUND        → 404  (unknown ref / not owned / non-concierge;
 *                                    consolidated with BOOKING_NOT_OWNED to
 *                                    prevent booking-ref enumeration)
 *   BOOKING_NOT_CANCELLABLE  → 409  (status past 'draft')
 *   VALIDATION_ERROR         → 422  (reason > 200 chars)
 */
export const CancelSellBookingInputSchema = z.object({
  /** Optional free-text reason for cancellation (max 200 characters). */
  reason: z.string().max(200).optional(),
});
export type CancelSellBookingInputDto = z.infer<typeof CancelSellBookingInputSchema>;

// ─── Customer inspection view (v1.2 my-bookings page) ────────────────────────
//
// Surfaced by `GET /v1/public/me/inspections` (CONTRACT v1.2.0 §4 + v1.2.1
// §4.7). Per-row latestOffer join lets A render "Offer KD 8,500 expires in
// 2 days — open" without a second round-trip per booking.
//
// CPO inspections are admin-only; this view is always `kind:'concierge'`.

export const CustomerInspectionLatestOfferSchema = z.object({
  publicToken: z.string(),
  status: z.string(), // OFFER_STATUSES — kept loose to avoid cross-file enum coupling
  amountFils: z.union([z.bigint(), z.string()]),
  validUntil: z.string().datetime(),
});
export type CustomerInspectionLatestOffer = z.infer<typeof CustomerInspectionLatestOfferSchema>;

export const CustomerInspectionViewSchema = z.object({
  id: z.string().uuid(),
  bookingRef: z.string(),
  kind: z.literal('concierge'),
  status: z.enum(INSPECTION_STATUSES),
  vehicle: PublicVehicleSnapshotSchema,
  scheduledFor: z.string().datetime().nullable(),
  inspectedAt: z.string().datetime().nullable(),
  latestOffer: CustomerInspectionLatestOfferSchema.nullable(),
  createdAt: z.string().datetime(),
});
export type CustomerInspectionView = z.infer<typeof CustomerInspectionViewSchema>;

export const CustomerInspectionListResponseSchema = z.object({
  items: z.array(CustomerInspectionViewSchema),
  total: z.number().int().min(0),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
});
export type CustomerInspectionListResponse = z.infer<typeof CustomerInspectionListResponseSchema>;
