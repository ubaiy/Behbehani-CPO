/**
 * Stage-transition matrix tests for the listings service.
 *
 * The matrix lives in `listings.service.ts` (`ALLOWED_TRANSITIONS`). These tests
 * exercise `changeStage` directly, mocking the repo layer.
 */

import type { ListingStage } from '@behbehani-cpo/shared-types';

// ─── Mock the repo BEFORE importing the service ─────────────────────────────
jest.mock('./listings.repo', () => {
  return {
    findListingById: jest.fn(),
    findListingByVin: jest.fn(),
    listListings: jest.fn(),
    nextStockNumber: jest.fn(),
    recordPriceHistory: jest.fn(),
    softDeleteListing: jest.fn(),
    createListing: jest.fn(),
    updateListing: jest.fn(),
  };
});

import {
  findListingById,
  recordPriceHistory,
  updateListing,
} from './listings.repo';
import { changeStage, ListingError, setFeatured } from './listings.service';

const findListingByIdMock = findListingById as jest.MockedFunction<typeof findListingById>;
const updateListingMock = updateListing as jest.MockedFunction<typeof updateListing>;
const recordPriceHistoryMock = recordPriceHistory as jest.MockedFunction<typeof recordPriceHistory>;

// Minimal fake row matching ListingDetailRow shape — we only assert on fields
// the toDetail() shaper reads. Unrelated fields are filled with safe defaults.
function buildRow(overrides: Partial<Record<string, unknown>> = {}): any {
  const now = new Date('2026-01-15T10:00:00.000Z');
  return {
    id: 'listing-1',
    stockNumber: 'BCPO-2026-0001',
    vin: '1HGBH41JXMN109186',
    titleEn: 'Toyota Camry',
    titleAr: null,
    slug: 'toyota-camry-bcpo-2026-0001',
    brandId: 'b1',
    brand: { id: 'b1', nameEn: 'Toyota', nameAr: 'تويوتا' },
    modelId: 'm1',
    model: { id: 'm1', nameEn: 'Camry', nameAr: 'كامري' },
    trimId: null,
    trim: null,
    bodyTypeId: 'bt1',
    bodyType: { id: 'bt1', nameEn: 'Sedan', nameAr: 'سيدان' },
    year: 2022,
    mileageKm: 30_000,
    exteriorColor: 'White',
    interiorColor: 'Black',
    transmission: 'automatic',
    fuelType: 'petrol',
    engineCc: 2500,
    cylinders: 4,
    drivetrain: 'fwd',
    seats: 5,
    doors: 4,
    gccSpec: true,
    previousOwners: 1,
    serviceHistory: true,
    accidentHistory: false,
    accidentNotes: null,
    priceFils: BigInt(5_000_000),
    costFils: null,
    agingDiscountEnabled: true,
    descriptionEn: null,
    descriptionAr: null,
    stage: 'acquired' as ListingStage,
    listedAt: null,
    reservedAt: null,
    soldAt: null,
    featuredAt: null,
    assignedSalesId: null,
    assignedSales: null,
    createdById: 'u1',
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    photos: [],
    videos: [],
    priceHistory: [],
    inspectionReport: null,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('ListingsService.changeStage — allowed transition matrix', () => {
  const validTransitions: Array<[ListingStage, ListingStage]> = [
    ['acquired', 'inbound'],
    ['inbound', 'inspection'],
    ['inspection', 'photoshoot'],
    ['inspection', 'reconditioning'],
    ['photoshoot', 'reconditioning'],
    ['photoshoot', 'listed'],
    ['reconditioning', 'listed'],
    ['listed', 'reserved'],
    ['reserved', 'sold'],
    ['reserved', 'listed'],
    ['sold', 'delivered'],
    ['delivered', 'closed'],
  ];

  test.each(validTransitions)(
    'should permit valid transition %s -> %s',
    async (from, to) => {
      findListingByIdMock.mockResolvedValueOnce(buildRow({ stage: from }));
      updateListingMock.mockResolvedValueOnce(buildRow({ stage: to }));

      const result = await changeStage('listing-1', { stage: to }, 'actor-1');

      expect(result.stage).toBe(to);
      expect(updateListingMock).toHaveBeenCalledTimes(1);
      expect(recordPriceHistoryMock).toHaveBeenCalledTimes(1);
    },
  );

  const invalidTransitions: Array<[ListingStage, ListingStage]> = [
    ['acquired', 'listed'],
    ['acquired', 'sold'],
    ['inbound', 'listed'],
    ['listed', 'sold'],
    ['sold', 'listed'],
    ['delivered', 'reserved'],
    ['closed', 'listed'],
    ['closed', 'acquired'],
  ];

  test.each(invalidTransitions)(
    'should reject invalid transition %s -> %s with status 422',
    async (from, to) => {
      findListingByIdMock.mockResolvedValueOnce(buildRow({ stage: from }));

      await expect(
        changeStage('listing-1', { stage: to }, 'actor-1'),
      ).rejects.toMatchObject({ status: 422 });
      await expect(
        changeStage('listing-1', { stage: to }, 'actor-1'),
      ).rejects.toBeInstanceOf(ListingError);

      expect(updateListingMock).not.toHaveBeenCalled();
    },
  );

  it('should treat transition to the same stage as a no-op (no throw)', async () => {
    findListingByIdMock.mockResolvedValue(buildRow({ stage: 'listed' }));
    updateListingMock.mockResolvedValue(buildRow({ stage: 'listed' }));

    await expect(
      changeStage('listing-1', { stage: 'listed' }, 'actor-1'),
    ).resolves.toBeDefined();
  });

  it('should throw 404 when listing is missing', async () => {
    findListingByIdMock.mockResolvedValueOnce(null);

    await expect(
      changeStage('nope', { stage: 'inbound' }, 'actor-1'),
    ).rejects.toMatchObject({ status: 404 });
  });
});

describe('ListingsService.changeStage — timestamp side effects', () => {
  it('should populate listedAt when transitioning into listed', async () => {
    findListingByIdMock.mockResolvedValueOnce(
      buildRow({ stage: 'photoshoot', listedAt: null }),
    );
    updateListingMock.mockImplementationOnce(async (_id, patch) => {
      // surface the patch back so we can assert
      return buildRow({ stage: 'listed', listedAt: (patch as any).listedAt ?? null });
    });

    await changeStage('listing-1', { stage: 'listed' }, 'actor-1');

    const patch = updateListingMock.mock.calls[0][1] as Record<string, unknown>;
    expect(patch.stage).toBe('listed');
    expect(patch.listedAt).toBeInstanceOf(Date);
  });

  it('should populate reservedAt when transitioning into reserved', async () => {
    findListingByIdMock.mockResolvedValueOnce(
      buildRow({ stage: 'listed', reservedAt: null }),
    );
    updateListingMock.mockImplementationOnce(async (_id, patch) =>
      buildRow({ stage: 'reserved', reservedAt: (patch as any).reservedAt ?? null }),
    );

    await changeStage('listing-1', { stage: 'reserved' }, 'actor-1');

    const patch = updateListingMock.mock.calls[0][1] as Record<string, unknown>;
    expect(patch.stage).toBe('reserved');
    expect(patch.reservedAt).toBeInstanceOf(Date);
  });

  it('should populate soldAt when transitioning into sold', async () => {
    findListingByIdMock.mockResolvedValueOnce(
      buildRow({ stage: 'reserved', soldAt: null }),
    );
    updateListingMock.mockImplementationOnce(async (_id, patch) =>
      buildRow({ stage: 'sold', soldAt: (patch as any).soldAt ?? null }),
    );

    await changeStage('listing-1', { stage: 'sold' }, 'actor-1');

    const patch = updateListingMock.mock.calls[0][1] as Record<string, unknown>;
    expect(patch.stage).toBe('sold');
    expect(patch.soldAt).toBeInstanceOf(Date);
  });

  it('should NOT overwrite an existing listedAt timestamp', async () => {
    const existingListedAt = new Date('2025-01-01T00:00:00.000Z');
    findListingByIdMock.mockResolvedValueOnce(
      buildRow({ stage: 'reserved', listedAt: existingListedAt }),
    );
    updateListingMock.mockResolvedValueOnce(buildRow({ stage: 'listed' }));

    await changeStage('listing-1', { stage: 'listed' }, 'actor-1');

    const patch = updateListingMock.mock.calls[0][1] as Record<string, unknown>;
    expect(patch.listedAt).toBeUndefined();
  });
});

describe('ListingsService.setFeatured', () => {
  it('sets featuredAt to a Date when featuring a non-featured listing', async () => {
    findListingByIdMock.mockResolvedValueOnce(buildRow({ featuredAt: null }));
    const featuredDate = new Date('2026-05-18T12:00:00.000Z');
    updateListingMock.mockResolvedValueOnce(buildRow({ featuredAt: featuredDate }));

    const result = await setFeatured('listing-1', true);

    expect(result.changed).toBe(true);
    expect(result.after.featuredAt).toBe(featuredDate.toISOString());
    const patch = updateListingMock.mock.calls[0][1] as Record<string, unknown>;
    expect(patch.featuredAt).toBeInstanceOf(Date);
  });

  it('sets featuredAt to null when unfeaturing a featured listing', async () => {
    findListingByIdMock.mockResolvedValueOnce(
      buildRow({ featuredAt: new Date('2026-05-10T00:00:00.000Z') }),
    );
    updateListingMock.mockResolvedValueOnce(buildRow({ featuredAt: null }));

    const result = await setFeatured('listing-1', false);

    expect(result.changed).toBe(true);
    expect(result.after.featuredAt).toBeNull();
    const patch = updateListingMock.mock.calls[0][1] as Record<string, unknown>;
    expect(patch.featuredAt).toBeNull();
  });

  it('is idempotent — featuring an already-featured listing skips the repo update', async () => {
    findListingByIdMock.mockResolvedValueOnce(
      buildRow({ featuredAt: new Date('2026-05-10T00:00:00.000Z') }),
    );

    const result = await setFeatured('listing-1', true);

    expect(result.changed).toBe(false);
    expect(updateListingMock).not.toHaveBeenCalled();
  });

  it('is idempotent — unfeaturing a non-featured listing skips the repo update', async () => {
    findListingByIdMock.mockResolvedValueOnce(buildRow({ featuredAt: null }));

    const result = await setFeatured('listing-1', false);

    expect(result.changed).toBe(false);
    expect(updateListingMock).not.toHaveBeenCalled();
  });

  it('throws 404 when the listing does not exist', async () => {
    findListingByIdMock.mockResolvedValueOnce(null);

    await expect(setFeatured('nope', true)).rejects.toMatchObject({ status: 404 });
  });
});
