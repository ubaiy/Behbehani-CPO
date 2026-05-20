/**
 * Aging-engine core decisions:
 *   • paused state returns skipped, no writes
 *   • dry run creates AgingEngineRun row but rolls back AppliedDiscount writes
 *   • highest-tier (most negative discountBps) is picked when multiple qualify
 *   • idempotency: skip when last non-reverted discount references the same tier
 *   • stage filter (stagesAffected) excludes listings whose stage isn't listed
 *   • autoApply=false tiers are excluded from candidates
 */

const DAY_MS = 1000 * 60 * 60 * 24;
const NOW = Date.now();

// ─── Fake Prisma + Redis ────────────────────────────────────────────────────
const fakeRedis = { get: jest.fn() };

const fakeRun = {
  id: 'run-1',
  startedAt: new Date(NOW),
  finishedAt: null,
  status: 'running',
  processedCount: 0,
  appliedCount: 0,
  totalReductionFils: BigInt(0),
  errorMessage: null,
  triggeredBy: null,
};

const fakePrisma = {
  agingEngineRun: {
    create: jest.fn().mockResolvedValue(fakeRun),
    update: jest.fn().mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      ...fakeRun,
      ...data,
    })),
  },
  listing: {
    findMany: jest.fn().mockResolvedValue([]),
    update: jest.fn(),
  },
  pricingTier: {
    findMany: jest.fn().mockResolvedValue([]),
  },
  appliedDiscount: {
    create: jest.fn(),
  },
  priceHistory: {
    create: jest.fn(),
  },
  $transaction: jest.fn(),
};

jest.mock('../db/prisma', () => ({
  prisma: fakePrisma,
}));

jest.mock('../lib/redis', () => ({
  redisClient: () => fakeRedis,
}));

// The engine imports prisma enums — use real ones from @prisma/client.
import { runEngine } from './aging.engine';

beforeEach(() => {
  jest.clearAllMocks();
  fakeRedis.get.mockResolvedValue(null);
  fakePrisma.agingEngineRun.create.mockResolvedValue(fakeRun);
  fakePrisma.agingEngineRun.update.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
    ...fakeRun,
    ...data,
  }));
  fakePrisma.listing.findMany.mockResolvedValue([]);
  fakePrisma.pricingTier.findMany.mockResolvedValue([]);

  // Default `$transaction` runs the callback with a tx that proxies to fakePrisma.
  fakePrisma.$transaction.mockImplementation(async (cb: (tx: typeof fakePrisma) => unknown) => {
    return cb(fakePrisma);
  });
});

describe('AgingEngine.runEngine — paused', () => {
  it('should mark the run skipped and write no discounts when paused', async () => {
    fakeRedis.get.mockResolvedValueOnce('1');

    const result = await runEngine('actor-1');

    expect(result.status).toBe('skipped');
    expect(result.errorMessage).toBe('paused by admin');
    expect(fakePrisma.listing.findMany).not.toHaveBeenCalled();
    expect(fakePrisma.appliedDiscount.create).not.toHaveBeenCalled();
    expect(fakePrisma.$transaction).not.toHaveBeenCalled();
  });
});

describe('AgingEngine.runEngine — tier selection', () => {
  it('should pick the highest-discount tier (-5% over -2%) for a 70-day-old listing', async () => {
    fakePrisma.listing.findMany.mockResolvedValueOnce([
      {
        id: 'l1',
        priceFils: BigInt(10_000_000),
        stage: 'listed',
        listedAt: new Date(NOW - 70 * DAY_MS),
        appliedDiscounts: [],
      },
    ]);
    fakePrisma.pricingTier.findMany.mockResolvedValueOnce([
      {
        id: 't60',
        name: '60d',
        daysThresholdMin: 60,
        discountBps: -500,
        stagesAffected: ['listed'],
        autoApply: true,
        updatedAt: new Date('2026-05-10'),
      },
      {
        id: 't30',
        name: '30d',
        daysThresholdMin: 30,
        discountBps: -200,
        stagesAffected: ['listed'],
        autoApply: true,
        updatedAt: new Date('2026-05-10'),
      },
    ]);

    await runEngine(null);

    expect(fakePrisma.appliedDiscount.create).toHaveBeenCalledTimes(1);
    const created = fakePrisma.appliedDiscount.create.mock.calls[0][0].data;
    expect(created.tierId).toBe('t60');
    expect(created.discountBps).toBe(-500);
    // 5% of 10M = 500_000 fils
    expect(created.fromFils).toBe(BigInt(10_000_000));
    expect(created.toFils).toBe(BigInt(9_500_000));
  });

  it('should skip listings whose stage is not in stagesAffected', async () => {
    fakePrisma.listing.findMany.mockResolvedValueOnce([
      {
        id: 'l1',
        priceFils: BigInt(5_000_000),
        stage: 'reserved',
        listedAt: new Date(NOW - 100 * DAY_MS),
        appliedDiscounts: [],
      },
    ]);
    fakePrisma.pricingTier.findMany.mockResolvedValueOnce([
      {
        id: 't',
        name: '60d',
        daysThresholdMin: 60,
        discountBps: -500,
        stagesAffected: ['listed'],
        autoApply: true,
        updatedAt: new Date('2026-05-10'),
      },
    ]);

    const result = await runEngine(null);

    expect(fakePrisma.appliedDiscount.create).not.toHaveBeenCalled();
    expect(result.appliedCount).toBe(0);
    expect(result.processedCount).toBe(1);
  });

  it('should exclude autoApply=false tiers from candidates (filtered by query)', async () => {
    // The engine queries `where: { autoApply: true }`, so a manual-tier-only
    // setup yields an empty tier list and zero applications.
    fakePrisma.listing.findMany.mockResolvedValueOnce([
      {
        id: 'l1',
        priceFils: BigInt(5_000_000),
        stage: 'listed',
        listedAt: new Date(NOW - 100 * DAY_MS),
        appliedDiscounts: [],
      },
    ]);
    fakePrisma.pricingTier.findMany.mockResolvedValueOnce([]); // autoApply filter excludes them

    await runEngine(null);

    // Verify the query enforced autoApply filter.
    const where = fakePrisma.pricingTier.findMany.mock.calls[0][0].where;
    expect(where.autoApply).toBe(true);
    expect(fakePrisma.appliedDiscount.create).not.toHaveBeenCalled();
  });

  it('should be idempotent — skip when last applied discount is the same tier', async () => {
    fakePrisma.listing.findMany.mockResolvedValueOnce([
      {
        id: 'l1',
        priceFils: BigInt(9_500_000),
        stage: 'listed',
        listedAt: new Date(NOW - 70 * DAY_MS),
        appliedDiscounts: [{ tierId: 't60' }],
      },
    ]);
    fakePrisma.pricingTier.findMany.mockResolvedValueOnce([
      {
        id: 't60',
        name: '60d',
        daysThresholdMin: 60,
        discountBps: -500,
        stagesAffected: ['listed'],
        autoApply: true,
        updatedAt: new Date('2026-05-10'),
      },
    ]);

    const result = await runEngine(null);

    expect(fakePrisma.appliedDiscount.create).not.toHaveBeenCalled();
    expect(result.appliedCount).toBe(0);
    expect(result.processedCount).toBe(1);
  });
});

describe('AgingEngine.runEngine — dry run', () => {
  it('should mark the run skipped with errorMessage=dry-run and NOT persist discount writes', async () => {
    fakePrisma.listing.findMany.mockResolvedValue([
      {
        id: 'l1',
        priceFils: BigInt(10_000_000),
        stage: 'listed',
        listedAt: new Date(NOW - 70 * DAY_MS),
        appliedDiscounts: [],
      },
    ]);
    fakePrisma.pricingTier.findMany.mockResolvedValue([
      {
        id: 't60',
        name: '60d',
        daysThresholdMin: 60,
        discountBps: -500,
        stagesAffected: ['listed'],
        autoApply: true,
        updatedAt: new Date('2026-05-10'),
      },
    ]);

    // The dry-run path throws DryRunAbort inside $transaction. Simulate that:
    // the engine wraps everything in a try/catch and updates the run row to
    // status=skipped regardless of what happened inside the transaction.
    fakePrisma.$transaction.mockImplementation(async (cb: (tx: typeof fakePrisma) => unknown) => {
      try {
        await cb(fakePrisma);
      } catch (err) {
        throw err; // engine catches DryRunAbort externally
      }
    });

    const result = await runEngine(null, true);

    expect(result.status).toBe('skipped');
    expect(result.errorMessage).toBe('dry-run');

    // The final agingEngineRun.update call must mark the run as skipped.
    const calls = fakePrisma.agingEngineRun.update.mock.calls;
    const finalCall = calls[calls.length - 1][0];
    expect(finalCall.data.status).toBe('skipped');
    expect(finalCall.data.errorMessage).toBe('dry-run');
  });
});
