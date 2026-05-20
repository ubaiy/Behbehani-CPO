/**
 * Pricing preview-impact tests.
 *
 * `previewPricingImpact` queries `findQualifyingListings` (already filters by
 * agingDiscountEnabled=true, stage IN list, listedAt <= threshold) and reduces
 * each row's priceFils by |discountBps|/10000.
 */

jest.mock('./pricing.repo', () => ({
  findQualifyingListings: jest.fn(),
  findUserFullName: jest.fn(),
  listTiers: jest.fn(),
  findTierById: jest.fn(),
  findTierByName: jest.fn(),
  createTier: jest.fn(),
  updateTier: jest.fn(),
  softDeleteTier: jest.fn(),
}));

import { findQualifyingListings } from './pricing.repo';
import { previewPricingImpact } from './pricing.service';

const findQualifying = findQualifyingListings as jest.MockedFunction<typeof findQualifyingListings>;

const DAY_MS = 1000 * 60 * 60 * 24;
const NOW = Date.now();

beforeEach(() => {
  jest.clearAllMocks();
});

describe('PricingService.previewPricingImpact', () => {
  it('should compute total reduction across all qualifying listings (2% on 25M fils = 500k)', async () => {
    findQualifying.mockResolvedValueOnce([
      { id: 'l1', priceFils: BigInt(5_000_000), listedAt: new Date(NOW - 35 * DAY_MS) },
      { id: 'l2', priceFils: BigInt(8_000_000), listedAt: new Date(NOW - 45 * DAY_MS) },
      { id: 'l3', priceFils: BigInt(12_000_000), listedAt: new Date(NOW - 100 * DAY_MS) },
    ]);

    const result = await previewPricingImpact({
      daysThresholdMin: 30,
      discountBps: -200,
      stagesAffected: ['listed'],
    });

    expect(result.qualifyingListings).toBe(3);
    expect(result.totalReductionFils).toBe('500000');
    expect(result.sampleListingIds).toEqual(['l1', 'l2', 'l3']);
  });

  it('should pass through the stage filter to the repo unchanged', async () => {
    findQualifying.mockResolvedValueOnce([]);

    await previewPricingImpact({
      daysThresholdMin: 30,
      discountBps: -200,
      stagesAffected: ['listed', 'reconditioning'],
    });

    expect(findQualifying).toHaveBeenCalledTimes(1);
    const [stages, thresholdDate] = findQualifying.mock.calls[0];
    expect(stages).toEqual(['listed', 'reconditioning']);
    // threshold should be roughly 30 days before now
    expect(thresholdDate).toBeInstanceOf(Date);
    const delta = NOW - thresholdDate.getTime();
    expect(delta).toBeGreaterThanOrEqual(30 * DAY_MS - 1000);
    expect(delta).toBeLessThanOrEqual(30 * DAY_MS + 1000);
  });

  it('should return zero reduction when no listings qualify', async () => {
    findQualifying.mockResolvedValueOnce([]);

    const result = await previewPricingImpact({
      daysThresholdMin: 30,
      discountBps: -500,
      stagesAffected: ['listed'],
    });

    expect(result.qualifyingListings).toBe(0);
    expect(result.totalReductionFils).toBe('0');
    expect(result.sampleListingIds).toEqual([]);
  });

  it('should cap sampleListingIds at 5 entries', async () => {
    const rows = Array.from({ length: 8 }, (_, i) => ({
      id: `l${i}`,
      priceFils: BigInt(1_000_000),
      listedAt: new Date(NOW - 60 * DAY_MS),
    }));
    findQualifying.mockResolvedValueOnce(rows);

    const result = await previewPricingImpact({
      daysThresholdMin: 30,
      discountBps: -200,
      stagesAffected: ['listed'],
    });

    expect(result.qualifyingListings).toBe(8);
    expect(result.sampleListingIds).toHaveLength(5);
  });

  it('should use absolute discountBps so positive and negative produce the same reduction', async () => {
    findQualifying.mockResolvedValue([
      { id: 'l1', priceFils: BigInt(10_000_000), listedAt: new Date(NOW - 60 * DAY_MS) },
    ]);

    const neg = await previewPricingImpact({
      daysThresholdMin: 30,
      discountBps: -500,
      stagesAffected: ['listed'],
    });
    const pos = await previewPricingImpact({
      daysThresholdMin: 30,
      discountBps: 500,
      stagesAffected: ['listed'],
    });

    expect(neg.totalReductionFils).toBe('500000'); // 5% of 10M
    expect(pos.totalReductionFils).toBe('500000');
  });
});
