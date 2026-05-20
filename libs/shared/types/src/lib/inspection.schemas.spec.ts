/**
 * Zod contract tests for inspection schemas.
 *
 * The most load-bearing invariant: the rubric MUST contain exactly 71 items
 * (storefront promise). If a future edit accidentally adds or removes an
 * item, this test catches it before it ships.
 */

import {
  INSPECTION_RUBRIC,
  INSPECTION_RUBRIC_TOTAL,
  InspectionFilterSchema,
  CreateInspectionSchema,
  SignoffSchema,
  CustomerSignSchema,
  InspectionPhotoPresignSchema,
} from './inspection.schemas';

describe('INSPECTION_RUBRIC', () => {
  it('contains exactly 71 non-deprecated items (storefront promise)', () => {
    expect(INSPECTION_RUBRIC_TOTAL).toBe(71);
  });

  it('has 6 sections in stable order', () => {
    expect(INSPECTION_RUBRIC.map((s) => s.key)).toEqual([
      'exterior',
      'interior',
      'engine_drivetrain',
      'electrical',
      'safety',
      'documentation',
    ]);
  });

  it('has unique item IDs across all sections', () => {
    const ids = INSPECTION_RUBRIC.flatMap((s) => s.items.map((i) => i.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all item IDs are kebab-case namespaced by section', () => {
    for (const section of INSPECTION_RUBRIC) {
      for (const item of section.items) {
        // Item IDs are namespaced by a stable prefix per section
        // (e.g. 'exterior.body-hood', 'engine.fluids-oil'). We don't enforce
        // section-key === prefix because some sections use a shortened
        // namespace (engine_drivetrain → engine.*, documentation → docs.*).
        expect(item.id).toMatch(/^[a-z][a-z0-9]*\.[a-z0-9][a-z0-9-]*$/);
      }
    }
  });
});

describe('InspectionFilterSchema', () => {
  it('defaults page=1 and pageSize=25', () => {
    const parsed = InspectionFilterSchema.parse({});
    expect(parsed.page).toBe(1);
    expect(parsed.pageSize).toBe(25);
  });

  it('coerces stringified booleans/numbers from query strings', () => {
    const parsed = InspectionFilterSchema.parse({
      page: '2',
      pageSize: '50',
      kind: 'concierge',
    });
    expect(parsed.page).toBe(2);
    expect(parsed.pageSize).toBe(50);
    expect(parsed.kind).toBe('concierge');
  });

  it('caps pageSize at 100', () => {
    expect(() => InspectionFilterSchema.parse({ pageSize: 999 })).toThrow();
  });
});

describe('CreateInspectionSchema (discriminated union)', () => {
  it('accepts a valid CPO request', () => {
    const result = CreateInspectionSchema.safeParse({
      kind: 'cpo',
      listingId: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(result.success).toBe(true);
  });

  it('accepts a valid Concierge request', () => {
    const result = CreateInspectionSchema.safeParse({
      kind: 'concierge',
      customer: {
        fullName: 'Mohammed Al-Sabah',
        mobile: '+96598765432',
        email: 'm@example.com',
      },
      vehicle: {
        year: 2020,
        brandName: 'Lexus',
        modelName: 'RX 350',
        vin: '1HGBH41JXMN109186',
        mileageKm: 62400,
        transmission: 'Automatic',
      },
      location: {
        address: 'Salmiya, Block 4, Street 1',
        governorate: 'Hawalli',
      },
    });
    expect(result.success).toBe(true);
  });

  it('rejects Concierge with a malformed VIN', () => {
    const result = CreateInspectionSchema.safeParse({
      kind: 'concierge',
      customer: { fullName: 'X', mobile: '+96598765432' },
      vehicle: {
        year: 2020,
        brandName: 'Lexus',
        modelName: 'RX 350',
        vin: '1HGBH41JIMN109186', // contains 'I' which is forbidden
        mileageKm: 62400,
      },
      location: { address: 'Anywhere' },
    });
    expect(result.success).toBe(false);
  });

  it('rejects Concierge with missing fields', () => {
    const result = CreateInspectionSchema.safeParse({
      kind: 'concierge',
      // missing customer + vehicle + location
    });
    expect(result.success).toBe(false);
  });

  it('rejects unknown kind', () => {
    const result = CreateInspectionSchema.safeParse({ kind: 'other' });
    expect(result.success).toBe(false);
  });
});

describe('SignoffSchema (mode-discriminated)', () => {
  it('accepts CPO mode with no extra payload', () => {
    expect(SignoffSchema.safeParse({ mode: 'cpo' }).success).toBe(true);
  });

  it('accepts concierge_in_person with full customer signature payload', () => {
    const result = SignoffSchema.safeParse({
      mode: 'concierge_in_person',
      customerSignature: {
        drawnSignatureSvg: '<svg>...some drawn path data...</svg>',
        typedName: 'Mohammed Al-Sabah',
        accepted: { owner: true, accurate: true, useForOffer: true },
      },
    });
    expect(result.success).toBe(true);
  });

  it('rejects concierge_in_person if any acceptance checkbox is false', () => {
    const result = SignoffSchema.safeParse({
      mode: 'concierge_in_person',
      customerSignature: {
        drawnSignatureSvg: '<svg>...</svg>more data here',
        typedName: 'X',
        accepted: { owner: true, accurate: false, useForOffer: true },
      },
    });
    expect(result.success).toBe(false);
  });

  it('accepts concierge_remote_link with no payload', () => {
    expect(SignoffSchema.safeParse({ mode: 'concierge_remote_link' }).success).toBe(true);
  });
});

describe('CustomerSignSchema (public signing endpoint body)', () => {
  it('requires all three acceptance checkboxes to be true', () => {
    const partial = CustomerSignSchema.safeParse({
      drawnSignatureSvg: '<svg>...drawn signature path...</svg>',
      typedName: 'Mohammed',
      accepted: { owner: true, accurate: true, useForOffer: false },
    });
    expect(partial.success).toBe(false);

    const full = CustomerSignSchema.safeParse({
      drawnSignatureSvg: '<svg>...drawn signature path...</svg>',
      typedName: 'Mohammed',
      accepted: { owner: true, accurate: true, useForOffer: true },
    });
    expect(full.success).toBe(true);
  });

  it('rejects civilIdLast4 that is not exactly 4 digits', () => {
    const tooShort = CustomerSignSchema.safeParse({
      drawnSignatureSvg: '<svg>...drawn signature path...</svg>',
      typedName: 'Mohammed',
      civilIdLast4: '12',
      accepted: { owner: true, accurate: true, useForOffer: true },
    });
    expect(tooShort.success).toBe(false);
  });
});

describe('InspectionPhotoPresignSchema', () => {
  it('caps byteSize at 5 MB', () => {
    const over = InspectionPhotoPresignSchema.safeParse({
      itemId: 'exterior.paint',
      contentType: 'image/jpeg',
      byteSize: 6 * 1024 * 1024,
    });
    expect(over.success).toBe(false);
  });

  it('accepts HEIC + WebP alongside JPEG/PNG', () => {
    for (const contentType of ['image/jpeg', 'image/png', 'image/webp', 'image/heic'] as const) {
      const result = InspectionPhotoPresignSchema.safeParse({
        itemId: 'exterior.paint',
        contentType,
        byteSize: 100_000,
      });
      expect(result.success).toBe(true);
    }
  });
});
