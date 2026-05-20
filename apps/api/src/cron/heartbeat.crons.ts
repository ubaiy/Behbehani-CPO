import { registerCron } from './cron-runner';

registerCron({
  name: 'heartbeat',
  schedule: '*/15 * * * *',  // every 15 min
  handler: async () => {
    // Intentional no-op log to prove the runner is alive. Remove this
    // demo job once a real subsystem cron lands (v1.4 Orders reservation
    // cleanup is the first real consumer).
    // eslint-disable-next-line no-console
    console.log('[cron] heartbeat tick at', new Date().toISOString());
  },
});
