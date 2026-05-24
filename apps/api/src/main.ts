import { createApp } from './app';
import { env } from './config/env';
import { disconnectPrisma } from './db/prisma';
import { ensureBucket } from './lib/s3';
import { disconnectRedis } from './lib/redis';
import { closeQueues } from './lib/queues';
import { startAgingScheduler } from './aging/aging.scheduler';
import { startAllCrons } from './cron';
import { bootstrapNotificationAdapters } from './notifications/bootstrap';

async function bootstrap(): Promise<void> {
  // Boot-time infrastructure setup.
  //
  // v1.5.24 — `ensureBucket()` was designed for the MinIO dev environment
  // where the bucket needs auto-creation on each `nx serve api` restart.
  // In production with a pre-created AWS S3 bucket, the HeadBucket call
  // needs `s3:HeadBucket` permission AND the subsequent applyPublicReadPolicy
  // needs `s3:PutBucketPolicy` (which would also make the bucket public —
  // contradicting "Block all public access" + the presigned-URL pattern).
  // Treat any failure as a warning rather than a fatal boot error.
  try {
    await ensureBucket();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(
      '[s3] ensureBucket skipped:',
      err instanceof Error ? err.message : String(err),
    );
  }
  await startAgingScheduler();

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`[api] listening on http://localhost:${env.PORT}`);
    bootstrapNotificationAdapters();
    startAllCrons();
  });
  server.on('error', (err) => {
    // eslint-disable-next-line no-console
    console.error('[api] server error', err);
    process.exit(1);
  });

  const shutdown = async (signal: string): Promise<void> => {
    // eslint-disable-next-line no-console
    console.log(`[api] received ${signal} — shutting down`);
    server.close();
    await closeQueues();
    await disconnectRedis();
    await disconnectPrisma();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[api] bootstrap error', err);
  process.exit(1);
});
