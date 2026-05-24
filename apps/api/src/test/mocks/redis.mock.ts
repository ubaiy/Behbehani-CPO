/**
 * In-memory Redis mock for Jest unit tests.
 *
 * Usage pattern (per aging.engine.spec.ts and dashboard.service.spec.ts):
 *
 *   const fakeRedis = createMockRedis();
 *   jest.mock('../../lib/redis', () => ({
 *     redisClient: () => fakeRedis,
 *   }));
 *
 * Implements the ioredis API subset actually called by apps/api:
 *   get, set (with EX / NX option pairs), del, incr, expire, flushdb.
 *
 * TTL is tracked as an absolute timestamp (Date.now() + ttlMs) and checked
 * lazily on every read. Tests that need precise TTL control should mock
 * Date.now() and call _advanceTime() on the instance.
 *
 * This is NOT a full Redis behaviour emulator — it is intentionally minimal.
 * Add surface area only as new callers require it.
 */

interface StoreEntry {
  value: string;
  expiresAt: number | null; // epoch ms, null = no TTL
}

export class InMemoryRedis {
  private store = new Map<string, StoreEntry>();

  // ─── Private helpers ───────────────────────────────────────────────────────

  private isExpired(entry: StoreEntry): boolean {
    return entry.expiresAt !== null && entry.expiresAt <= Date.now();
  }

  private live(key: string): StoreEntry | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (this.isExpired(entry)) {
      this.store.delete(key);
      return undefined;
    }
    return entry;
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  /**
   * GET key → value string or null if missing / expired.
   */
  async get(key: string): Promise<string | null> {
    return this.live(key)?.value ?? null;
  }

  /**
   * SET key value [EX seconds] [NX]
   *
   * Supported calling conventions (mirrors how ioredis accepts SET args):
   *   set(key, value)                          — plain set
   *   set(key, value, 'EX', ttlSec)            — set with TTL
   *   set(key, value, 'NX')                    — set if not exists
   *   set(key, value, 'EX', ttlSec, 'NX')      — set with TTL if not exists
   *
   * Returns 'OK' on success, null when NX condition is not met.
   */
  async set(
    key: string,
    value: string,
    exOrNx?: 'EX' | 'NX',
    ttlOrNx?: number | 'NX',
    nx?: 'NX',
  ): Promise<'OK' | null> {
    let ttlSec: number | undefined;
    let isNx = false;

    if (exOrNx === 'NX') {
      isNx = true;
    } else if (exOrNx === 'EX') {
      ttlSec = ttlOrNx as number;
      if (ttlOrNx === 'NX' || nx === 'NX') {
        isNx = true;
      }
    }

    if (isNx && this.live(key) !== undefined) {
      return null;
    }

    const expiresAt = ttlSec !== undefined ? Date.now() + ttlSec * 1000 : null;
    this.store.set(key, { value, expiresAt });
    return 'OK';
  }

  /**
   * DEL key [key ...] → number of keys deleted.
   */
  async del(...keys: string[]): Promise<number> {
    let deleted = 0;
    for (const key of keys) {
      if (this.store.has(key)) {
        this.store.delete(key);
        deleted++;
      }
    }
    return deleted;
  }

  /**
   * INCR key → new integer value (starts at 1 if key did not exist).
   * Throws if the stored value is not a valid integer string.
   */
  async incr(key: string): Promise<number> {
    const entry = this.live(key);
    const current = entry ? parseInt(entry.value, 10) : 0;
    if (isNaN(current)) {
      throw new Error(`ERR value is not an integer or out of range`);
    }
    const next = current + 1;
    this.store.set(key, {
      value: String(next),
      expiresAt: entry?.expiresAt ?? null,
    });
    return next;
  }

  /**
   * EXPIRE key ttlSec → 1 if key exists and TTL was set, 0 if key not found.
   */
  async expire(key: string, ttlSec: number): Promise<number> {
    const entry = this.live(key);
    if (!entry) return 0;
    this.store.set(key, {
      value: entry.value,
      expiresAt: Date.now() + ttlSec * 1000,
    });
    return 1;
  }

  /**
   * FLUSHDB → removes all keys from the mock store. Use in afterEach.
   */
  async flushdb(): Promise<'OK'> {
    this.store.clear();
    return 'OK';
  }

  // ─── Test-only helpers ─────────────────────────────────────────────────────

  /**
   * Peek the live store for assertions without triggering expiry side-effects.
   * Returns a snapshot copy — mutations do not affect the mock state.
   */
  _peek(): Map<string, StoreEntry> {
    return new Map(this.store);
  }

  /**
   * Directly set an already-expired entry — useful for testing TTL expiry
   * without sleeping or mocking Date.now().
   */
  _setExpired(key: string, value: string): void {
    this.store.set(key, { value, expiresAt: Date.now() - 1 });
  }

  /**
   * Return the raw entry (including expired ones) for low-level assertions.
   */
  _getRaw(key: string): StoreEntry | undefined {
    return this.store.get(key);
  }
}

/**
 * Factory function — creates a fresh InMemoryRedis instance per test suite.
 * Each test file should call this once at describe-scope and reset with
 * `redis.flushdb()` in beforeEach.
 */
export function createMockRedis(): InMemoryRedis {
  return new InMemoryRedis();
}
