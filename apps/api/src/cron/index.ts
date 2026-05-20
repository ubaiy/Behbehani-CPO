// Aggregator for cron job registration. Each subsystem that owns a cron
// job imports this file's `registerCron` and calls it at module load.
// See cron-runner.ts for the registration API.
//
// Subsystem cron files land here as they're added:
import './heartbeat.crons';
import '../orders/reservation-expiry.crons'; // v1.4 — reservation timer cleanup
// import './saved-searches.crons';  // v1.6 — alert dispatcher
// import './financing.crons';       // v1.6 — overdue payment flagging
// import './reviews.crons';         // v1.7 — review-nudge dispatcher

export { registerCron, startAllCrons, stopAllCrons, listCrons } from './cron-runner';
