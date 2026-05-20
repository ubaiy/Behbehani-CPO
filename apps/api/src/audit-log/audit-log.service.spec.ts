/**
 * Unit tests for audit-log service helpers.
 *
 * Covered:
 *   - deriveOutcome: outcome derivation from action strings
 *   - escapeCsvField: (tested indirectly via buildCsvExport shape)
 *
 * The repo layer is mocked so no DB connection is required.
 */

// ─── Mock repo ───────────────────────────────────────────────────────────────

const mockListAuditLogs = jest.fn();
const mockCountAuditLogsForExport = jest.fn();
const mockStreamAuditLogsForExport = jest.fn();
const mockGetDistinctActions = jest.fn();
const mockGetDistinctResources = jest.fn();

jest.mock('./audit-log.repo', () => ({
  listAuditLogs: (...args: unknown[]) => mockListAuditLogs(...args),
  countAuditLogsForExport: (...args: unknown[]) => mockCountAuditLogsForExport(...args),
  streamAuditLogsForExport: (...args: unknown[]) => mockStreamAuditLogsForExport(...args),
  getDistinctActions: (...args: unknown[]) => mockGetDistinctActions(...args),
  getDistinctResources: (...args: unknown[]) => mockGetDistinctResources(...args),
}));

import { deriveOutcome, buildCsvExport, getAuditLogList } from './audit-log.service';
import { AuditLogError } from './audit-log.errors';

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── deriveOutcome ────────────────────────────────────────────────────────────

describe('deriveOutcome', () => {
  describe('denied', () => {
    it('returns denied for actions ending in .failed', () => {
      expect(deriveOutcome('listing.create.failed')).toBe('denied');
      expect(deriveOutcome('auth.login.failed')).toBe('denied');
      expect(deriveOutcome('user.update.failed')).toBe('denied');
    });

    it('returns denied for auth.login.failed specifically', () => {
      expect(deriveOutcome('auth.login.failed')).toBe('denied');
    });
  });

  describe('error', () => {
    it('returns error for actions starting with error.', () => {
      expect(deriveOutcome('error.db.connection')).toBe('error');
      expect(deriveOutcome('error.timeout')).toBe('error');
    });

    it('returns error for actions containing .error', () => {
      expect(deriveOutcome('listing.validation.error')).toBe('error');
      expect(deriveOutcome('payment.gateway.error')).toBe('error');
    });
  });

  describe('success', () => {
    it('returns success for normal mutation actions', () => {
      expect(deriveOutcome('listing.create')).toBe('success');
      expect(deriveOutcome('listing.update')).toBe('success');
      expect(deriveOutcome('user.role.assign')).toBe('success');
      expect(deriveOutcome('aging.run-now')).toBe('success');
      expect(deriveOutcome('auth.login')).toBe('success');
    });

    it('returns success for unrecognised action strings', () => {
      expect(deriveOutcome('some.unknown.action')).toBe('success');
    });
  });

  describe('priority: denied before error', () => {
    // An action that ends in .failed takes the denied branch even if it also
    // would match .error heuristics (it doesn't in practice, but the order
    // must be deterministic).
    it('denied takes priority over error if action ends with .failed', () => {
      expect(deriveOutcome('error.handler.failed')).toBe('denied');
    });
  });
});

// ─── buildCsvExport — row-limit guard ────────────────────────────────────────

describe('buildCsvExport', () => {
  const baseFilter = {
    sort: 'newest' as const,
    format: 'csv' as const,
  };

  it('throws AuditLogError 413 when count exceeds 10 000', async () => {
    mockCountAuditLogsForExport.mockResolvedValue(10_001);

    const err = await buildCsvExport(baseFilter).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AuditLogError);
    expect((err as AuditLogError).status).toBe(413);
  });

  it('returns CSV string with header when within limit', async () => {
    const fakeRow = {
      id: BigInt(42),
      createdAt: new Date('2026-01-15T10:00:00.000Z'),
      actor: { fullName: 'Alice Smith', email: 'alice@example.com' },
      action: 'listing.create',
      resource: 'admin.listing',
      resourceId: 'abc-123',
      ip: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
      before: null,
      after: null,
      actorId: 'user-uuid',
    };
    mockCountAuditLogsForExport.mockResolvedValue(1);
    mockStreamAuditLogsForExport.mockResolvedValue([fakeRow]);

    const { csv, filename } = await buildCsvExport(baseFilter);

    expect(csv).toContain('id,createdAt,actorName,actorEmail,action,resource,resourceId,outcome,ip,userAgent');
    expect(csv).toContain('42');
    expect(csv).toContain('listing.create');
    expect(csv).toContain('success');
    expect(csv).toContain('Alice Smith');
    expect(filename).toMatch(/^audit-log-\d{4}-\d{2}-\d{2}\.csv$/);
  });

  it('escapes fields containing commas', async () => {
    const fakeRow = {
      id: BigInt(1),
      createdAt: new Date('2026-01-15T10:00:00.000Z'),
      actor: { fullName: 'Smith, Alice', email: 'alice@example.com' },
      action: 'listing.create',
      resource: 'admin.listing',
      resourceId: null,
      ip: null,
      userAgent: null,
      before: null,
      after: null,
      actorId: 'user-uuid',
    };
    mockCountAuditLogsForExport.mockResolvedValue(1);
    mockStreamAuditLogsForExport.mockResolvedValue([fakeRow]);

    const { csv } = await buildCsvExport(baseFilter);

    // The name with a comma must be wrapped in quotes
    expect(csv).toContain('"Smith, Alice"');
  });
});

// ─── getAuditLogList — DTO shape ──────────────────────────────────────────────

describe('getAuditLogList', () => {
  it('maps BigInt id to string and derives outcome', async () => {
    const fakeRow = {
      id: BigInt(999),
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      actor: { fullName: 'Bob', email: 'bob@example.com' },
      action: 'auth.login.failed',
      resource: 'auth',
      resourceId: null,
      ip: '10.0.0.1',
      userAgent: 'curl/7',
      before: null,
      after: null,
      actorId: null,
    };
    mockListAuditLogs.mockResolvedValueOnce({
      rows: [fakeRow],
      total: 1,
      filteredFrom: 50,
    });

    const result = await getAuditLogList({
      sort: 'newest',
      page: 1,
      pageSize: 25,
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe('999');
    expect(result.items[0].outcome).toBe('denied');
    expect(result.total).toBe(1);
    expect(result.filteredFrom).toBe(50);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(25);
  });
});
