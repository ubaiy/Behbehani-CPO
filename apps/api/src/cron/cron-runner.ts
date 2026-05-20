import cron from 'node-cron';

type CronJobHandler = () => Promise<void> | void;
interface CronJob {
  name: string;       // unique identifier, used in logs
  schedule: string;   // standard cron expression e.g. "*/5 * * * *"
  handler: CronJobHandler;
  timezone?: string;  // defaults to Asia/Kuwait
}

const registry: CronJob[] = [];

/**
 * Register a cron job. Call this at module load time — typically inside
 * a subsystem's `register-crons.ts` file imported from `apps/api/src/cron/index.ts`.
 *
 * Jobs are NOT started until `startAllCrons()` is invoked at app boot.
 */
export function registerCron(job: CronJob): void {
  if (registry.some(j => j.name === job.name)) {
    throw new Error(`Duplicate cron name: ${job.name}`);
  }
  registry.push(job);
}

/**
 * Start all registered cron jobs. Should be called ONCE in main.ts after
 * the HTTP server starts. Errors inside a job handler are caught and logged
 * but do NOT crash the runner — the next tick still fires.
 */
export function startAllCrons(): void {
  for (const job of registry) {
    cron.schedule(job.schedule, async () => {
      const startedAt = Date.now();
      try {
        await job.handler();
        const elapsedMs = Date.now() - startedAt;
        // eslint-disable-next-line no-console
        console.log(`[cron] ${job.name} OK ${elapsedMs}ms`);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(`[cron] ${job.name} FAILED`, err);
      }
    }, {
      scheduled: true,
      timezone: job.timezone ?? 'Asia/Kuwait',
    });
    // eslint-disable-next-line no-console
    console.log(`[cron] registered ${job.name} → ${job.schedule}`);
  }
}

/** For tests + graceful shutdown — clears all scheduled tasks. */
export function stopAllCrons(): void {
  // node-cron exposes a getTasks() Map; iterate + stop all.
  const tasks = cron.getTasks();
  tasks.forEach((task) => task.stop());
}

/** Read-only view of registered jobs (for the admin /healthz endpoint to surface). */
export function listCrons(): ReadonlyArray<Omit<CronJob, 'handler'>> {
  return registry.map(({ name, schedule, timezone }) => ({ name, schedule, timezone }));
}
