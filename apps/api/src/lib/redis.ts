import Redis from 'ioredis';
import { env } from '../config/env';

// ─── Singleton ioredis connection ────────────────────────────────────────────

let _redis: Redis | null = null;

export function redisClient(): Redis {
  if (!_redis) {
    _redis = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: null, // required by BullMQ
      enableReadyCheck: false,
    });

    _redis.on('connect', () => {
      console.log('[redis] connected');
    });

    _redis.on('error', (err) => {
      console.error('[redis] connection error', err);
    });
  }
  return _redis;
}

export async function disconnectRedis(): Promise<void> {
  if (_redis) {
    await _redis.quit();
    _redis = null;
    console.log('[redis] disconnected');
  }
}
