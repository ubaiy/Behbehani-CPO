/**
 * Unit tests for dashboard.service — role-conditional projection.
 *
 * Locks in the contract guarantees the admin frontend depends on:
 *   - agingEngine block presence vs null by role
 *   - systemHealth.users presence vs null by role
 *   - quickActions filtering and variant assignment by role
 *   - monthlyDiscountAppliedFils value is a BigInt-as-string
 *   - greetingName derivation from fullName
 *
 * All Prisma + repo dependencies are mocked at the module boundary (same
 * pattern as admin-users.service.spec.ts / aging.engine.spec.ts).
 */

// ─── Mocks (must come BEFORE service import) ────────────────────────────────

const fakePrisma = {
  user: {
    findUnique: jest.fn(),
  },
};

jest.mock('../db/prisma', () => ({ prisma: fakePrisma }));

const fakeRedis = { get: jest.fn() };
jest.mock('../lib/redis', () => ({
  redisClient: () => fakeRedis,
}));

const mockListAuditLogs = jest.fn();
jest.mock('../audit-log/audit-log.repo', () => ({
  listAuditLogs: (...args: unknown[]) => mockListAuditLogs(...args),
}));

const mockGetStatusTotals = jest.fn();
const mockGetLastRun = jest.fn();
jest.mock('../aging/aging.repo', () => ({
  getStatusTotals: (...args: unknown[]) => mockGetStatusTotals(...args),
  getLastRun: (...args: unknown[]) => mockGetLastRun(...args),
}));

const mockGetPipelineGroupBy = jest.fn();
const mockGetMostStuckStage = jest.fn();
const mockGetMediaCounts = jest.fn();
const mockGetUserStatusCounts = jest.fn();
const mockGetActivePricingTierCount = jest.fn();
const mockGetActiveDiscountSummary = jest.fn();
const mockGetPrevMonthDiscountFils = jest.fn();
const mockGetFeaturedListingsCount = jest.fn();
const mockGetListingsByStage = jest.fn();
const mockGetWeeklySalesCount = jest.fn();
const mockGetListingsListedLast7Days = jest.fn();
const mockGetAvgDaysToSellByStage = jest.fn();
const mockGetTopBrandsByListingCount = jest.fn();
jest.mock('./dashboard.repo', () => ({
  getPipelineGroupBy: (...args: unknown[]) => mockGetPipelineGroupBy(...args),
  getMostStuckStage: (...args: unknown[]) => mockGetMostStuckStage(...args),
  getMediaCounts: (...args: unknown[]) => mockGetMediaCounts(...args),
  getUserStatusCounts: (...args: unknown[]) => mockGetUserStatusCounts(...args),
  getActivePricingTierCount: (...args: unknown[]) => mockGetActivePricingTierCount(...args),
  getActiveDiscountSummary: (...args: unknown[]) => mockGetActiveDiscountSummary(...args),
  getPrevMonthDiscountFils: (...args: unknown[]) => mockGetPrevMonthDiscountFils(...args),
  getFeaturedListingsCount: (...args: unknown[]) => mockGetFeaturedListingsCount(...args),
  getListingsByStage: (...args: unknown[]) => mockGetListingsByStage(...args),
  getWeeklySalesCount: (...args: unknown[]) => mockGetWeeklySalesCount(...args),
  getListingsListedLast7Days: (...args: unknown[]) => mockGetListingsListedLast7Days(...args),
  getAvgDaysToSellByStage: (...args: unknown[]) => mockGetAvgDaysToSellByStage(...args),
  getTopBrandsByListingCount: (...args: unknown[]) => mockGetTopBrandsByListingCount(...args),
}));

import type { AccessTokenPayload } from '../auth/jwt';
import type { AdminRole } from '@behbehani-cpo/shared-types';
import { getDashboardKpis } from './dashboard.service';

// ─── Fixtures / helpers ─────────────────────────────────────────────────────

function makeUser(adminRoles: AdminRole[], fullName = 'Alice Manager'): AccessTokenPayload {
  // resolveFirstName looks up by sub; we set the fullName mock per-test.
  fakePrisma.user.findUnique.mockResolvedValue({ fullName });
  return {
    sub: 'actor-' + adminRoles.join('-'),
    role: 'admin',
    adminRoles,
    type: 'access',
  };
}

const TEN_STAGES = [
  'acquired',
  'inbound',
  'inspection',
  'photoshoot',
  'reconditioning',
  'listed',
  'reserved',
  'sold',
  'delivered',
  'closed',
].map((s) => ({ stage: s, count: 0 }));

beforeEach(() => {
  jest.clearAllMocks();

  fakeRedis.get.mockResolvedValue(null); // not paused
  mockGetStatusTotals.mockResolvedValue({
    activeListings: 42,
    aging20to44: 7,
    aging45plus: 3,
    monthlyDiscountAppliedFils: BigInt(1_500_000),
  });
  mockGetLastRun.mockResolvedValue({
    id: 'run-1',
    startedAt: '2026-05-16T01:00:00.000Z',
    finishedAt: '2026-05-16T01:00:05.000Z',
    status: 'success' as const,
    processedCount: 10,
    appliedCount: 2,
    totalReductionFils: '50000',
    errorMessage: null,
    triggeredByName: null,
  });
  mockGetPipelineGroupBy.mockResolvedValue(TEN_STAGES);
  mockGetMostStuckStage.mockResolvedValue(null);
  mockGetMediaCounts.mockResolvedValue({ photos: 0, media360: 0, videos: 0 });
  mockGetUserStatusCounts.mockResolvedValue({ active: 5, locked: 1, disabled: 0 });
  mockGetActivePricingTierCount.mockResolvedValue(3);
  mockGetActiveDiscountSummary.mockResolvedValue({
    listingCount: 2,
    totalReductionFils: BigInt(123_000),
  });
  mockGetPrevMonthDiscountFils.mockResolvedValue(BigInt(1_000_000));
  mockGetFeaturedListingsCount.mockResolvedValue(5);
  mockGetListingsByStage.mockResolvedValue({
    acquired: 2, inbound: 1, inspection: 0, photoshoot: 0, reconditioning: 0,
    listed: 10, reserved: 3, sold: 5, delivered: 2, closed: 1,
  });
  mockGetWeeklySalesCount.mockResolvedValue(4);
  mockGetListingsListedLast7Days.mockResolvedValue(7);
  mockGetAvgDaysToSellByStage.mockResolvedValue({ sold: 18.5, delivered: 22.0 });
  mockGetTopBrandsByListingCount.mockResolvedValue([]);
  mockListAuditLogs.mockResolvedValue({ rows: [], total: 0, filteredFrom: 0 });
});

// ─── agingEngine role visibility ────────────────────────────────────────────

describe('dashboard.service — agingEngine visibility', () => {
  const VISIBLE_ROLES: AdminRole[] = [
    'super_admin',
    'general_manager',
    'operations_manager',
    'finance_officer',
    'pricing_manager',
  ];
  const HIDDEN_ROLES: AdminRole[] = [
    'customer_support',
    'sales_agent',
    'inspection_officer',
    'content_editor',
  ];

  it.each(VISIBLE_ROLES)('populates agingEngine for role: %s', async (role) => {
    const dto = await getDashboardKpis(makeUser([role]));
    expect(dto.agingEngine).not.toBeNull();
    expect(dto.agingEngine!.enabled).toBeDefined();
    expect(dto.agingEngine!.activeDiscounts.totalReductionFils).toBe('123000');
  });

  it.each(HIDDEN_ROLES)('returns agingEngine: null for role: %s', async (role) => {
    const dto = await getDashboardKpis(makeUser([role]));
    expect(dto.agingEngine).toBeNull();
  });
});

// ─── systemHealth.users role visibility ────────────────────────────────────

describe('dashboard.service — systemHealth.users visibility', () => {
  it('populates users counts for super_admin', async () => {
    const dto = await getDashboardKpis(makeUser(['super_admin']));
    expect(dto.systemHealth.users).toEqual({ active: 5, locked: 1, disabled: 0 });
  });

  it('populates users counts for general_manager', async () => {
    const dto = await getDashboardKpis(makeUser(['general_manager']));
    expect(dto.systemHealth.users).toEqual({ active: 5, locked: 1, disabled: 0 });
  });

  it.each<AdminRole>([
    'operations_manager',
    'finance_officer',
    'pricing_manager',
    'customer_support',
    'sales_agent',
    'inspection_officer',
    'content_editor',
  ])('returns users: null for role: %s', async (role) => {
    const dto = await getDashboardKpis(makeUser([role]));
    expect(dto.systemHealth.users).toBeNull();
  });

  it('does NOT call getUserStatusCounts when usersVisible is false', async () => {
    await getDashboardKpis(makeUser(['operations_manager']));
    expect(mockGetUserStatusCounts).not.toHaveBeenCalled();
  });

  it('calls getUserStatusCounts when usersVisible is true', async () => {
    await getDashboardKpis(makeUser(['general_manager']));
    expect(mockGetUserStatusCounts).toHaveBeenCalledTimes(1);
  });
});

// ─── quickActions filtering ─────────────────────────────────────────────────

describe('dashboard.service — quickActions filtering', () => {
  function keysFor(roles: AdminRole[]): Promise<string[]> {
    return getDashboardKpis(makeUser(roles)).then((dto) => dto.quickActions.map((a) => a.key));
  }

  it('super_admin sees all 4 actions', async () => {
    const keys = await keysFor(['super_admin']);
    expect(keys).toEqual(
      expect.arrayContaining(['new_vehicle', 'run_aging_now', 'create_user', 'view_audit_log']),
    );
    expect(keys).toHaveLength(4);
  });

  it('finance_officer has run_aging_now only (no new_vehicle, no create_user, no view_audit_log)', async () => {
    const keys = await keysFor(['finance_officer']);
    expect(keys).toEqual(['run_aging_now']);
    expect(keys).not.toContain('new_vehicle');
    expect(keys).not.toContain('create_user');
    expect(keys).not.toContain('view_audit_log');
  });

  it('pricing_manager has run_aging_now only', async () => {
    const keys = await keysFor(['pricing_manager']);
    expect(keys).toEqual(['run_aging_now']);
  });

  it('general_manager has new_vehicle + view_audit_log (no create_user)', async () => {
    const keys = await keysFor(['general_manager']);
    expect(keys).toEqual(expect.arrayContaining(['new_vehicle', 'view_audit_log']));
    expect(keys).not.toContain('create_user');
    expect(keys).toHaveLength(2);
  });

  it('operations_manager has new_vehicle only', async () => {
    const keys = await keysFor(['operations_manager']);
    expect(keys).toEqual(['new_vehicle']);
  });

  it('customer_support sees no quick actions (empty array)', async () => {
    const keys = await keysFor(['customer_support']);
    expect(keys).toEqual([]);
  });

  it('create_user requires EXPLICIT super_admin membership (not bypass via other admin role)', async () => {
    // operations_manager passes hasAnyRole for several actions but the
    // create_user visibility uses a direct membership check, so it must
    // NOT appear even though hasAnyRole-style bypass would normally apply.
    const keys = await keysFor(['operations_manager']);
    expect(keys).not.toContain('create_user');

    // Same negative check for general_manager — they have view_audit_log
    // but explicitly not create_user.
    const gmKeys = await keysFor(['general_manager']);
    expect(gmKeys).not.toContain('create_user');
  });
});

// ─── quickActions variant assignment ───────────────────────────────────────

describe('dashboard.service — quickActions variant assignment', () => {
  it('new_vehicle and run_aging_now are primary; create_user and view_audit_log are secondary', async () => {
    const dto = await getDashboardKpis(makeUser(['super_admin']));
    const byKey = new Map(dto.quickActions.map((a) => [a.key, a.variant]));
    expect(byKey.get('new_vehicle')).toBe('primary');
    expect(byKey.get('run_aging_now')).toBe('primary');
    expect(byKey.get('create_user')).toBe('secondary');
    expect(byKey.get('view_audit_log')).toBe('secondary');
  });
});

// ─── Money tile shape ───────────────────────────────────────────────────────

describe('dashboard.service — KPI tile value typing', () => {
  it('monthlyDiscountAppliedFils.value is a STRING (BigInt-as-string)', async () => {
    const dto = await getDashboardKpis(makeUser(['super_admin']));
    expect(typeof dto.topKpis.monthlyDiscountAppliedFils.value).toBe('string');
    expect(dto.topKpis.monthlyDiscountAppliedFils.value).toBe('1500000');
  });

  it('non-money top KPI tile values are numbers', async () => {
    const dto = await getDashboardKpis(makeUser(['super_admin']));
    expect(typeof dto.topKpis.activeListings.value).toBe('number');
    expect(typeof dto.topKpis.aging20to44.value).toBe('number');
    expect(typeof dto.topKpis.aging45plus.value).toBe('number');
    expect(dto.topKpis.activeListings.value).toBe(42);
    expect(dto.topKpis.aging20to44.value).toBe(7);
    expect(dto.topKpis.aging45plus.value).toBe(3);
  });

  it('featuredListings tile carries the count from the repo', async () => {
    mockGetFeaturedListingsCount.mockResolvedValueOnce(11);
    const dto = await getDashboardKpis(makeUser(['super_admin']));
    expect(dto.topKpis.featuredListings.value).toBe(11);
    expect(dto.topKpis.featuredListings.caption).toBe('Featured Listings');
    expect(dto.topKpis.featuredListings.tone).toBe('neutral');
  });
});

// ─── greetingName derivation ────────────────────────────────────────────────

describe('dashboard.service — greetingName', () => {
  it('returns the first whitespace-separated token of fullName', async () => {
    fakePrisma.user.findUnique.mockResolvedValue({ fullName: 'Alice Maria Smith' });
    const dto = await getDashboardKpis({
      sub: 'u1',
      role: 'admin',
      adminRoles: ['super_admin'],
      type: 'access',
    });
    expect(dto.greetingName).toBe('Alice');
  });

  it('falls back to "Admin" when fullName is empty', async () => {
    fakePrisma.user.findUnique.mockResolvedValue({ fullName: '' });
    const dto = await getDashboardKpis({
      sub: 'u1',
      role: 'admin',
      adminRoles: ['super_admin'],
      type: 'access',
    });
    expect(dto.greetingName).toBe('Admin');
  });

  it('falls back to "Admin" when the user row is missing', async () => {
    fakePrisma.user.findUnique.mockResolvedValue(null);
    const dto = await getDashboardKpis({
      sub: 'u1',
      role: 'admin',
      adminRoles: ['super_admin'],
      type: 'access',
    });
    expect(dto.greetingName).toBe('Admin');
  });
});
