import { env } from '../config/env';
import { agingQueue, makeAgingWorker } from '../lib/queues';
import { runEngine } from './aging.engine';

const JOB_NAME = 'nightly';

export async function startAgingScheduler(): Promise<void> {
  if (!env.AGING_ENGINE_ENABLED) {
    console.info('[aging-scheduler] AGING_ENGINE_ENABLED=false — scheduler not started');
    return;
  }

  // Register repeatable job (BullMQ deduplicates by repeat pattern key)
  await agingQueue().add(
    JOB_NAME,
    {},
    {
      repeat: {
        pattern: env.AGING_ENGINE_CRON,
        tz: env.AGING_ENGINE_TZ,
      },
    },
  );

  console.info(
    `[aging-scheduler] repeatable job registered — cron="${env.AGING_ENGINE_CRON}" tz="${env.AGING_ENGINE_TZ}"`,
  );

  // Start the worker. Only the scheduled 'nightly' job is processed here.
  // The 'run-now' path runs the engine synchronously inside triggerRunNow()
  // and never reaches the queue — so if a stray 'run-now' job appears (e.g.
  // a leftover from an older deployment), skip it rather than risk
  // double-execution or ignoring its `dryRun` data.
  const worker = makeAgingWorker(async (job) => {
    if (job.name !== JOB_NAME) {
      console.warn(`[aging-engine] ignoring unexpected job name="${job.name}" id=${job.id ?? '?'}`);
      return null;
    }
    console.info('[aging-engine] starting scheduled run');
    const dto = await runEngine(null);
    console.info(
      `[aging-engine] run finished status=${dto.status} applied=${dto.appliedCount} processed=${dto.processedCount}`,
    );
    return dto;
  });

  worker.on('failed', (job, err) => {
    console.error(`[aging-engine] job ${job?.id ?? '?'} failed`, err);
  });

  // Keep a reference so the existing closeQueues() shutdown can call worker.close()
  // We attach it to the queue instance's parent for graceful drain.
  // The worker closes automatically when the process exits via SIGTERM/SIGINT
  // because closeQueues() drains the queue. We also register an explicit close
  // so the process does not hang.
  process.once('beforeExit', () => {
    void worker.close();
  });
}
