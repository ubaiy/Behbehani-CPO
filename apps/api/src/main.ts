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
  await ensureBucket();
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
