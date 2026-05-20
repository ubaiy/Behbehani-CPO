# Cron Infrastructure

Lightweight cron runner built on `node-cron`. Pure JS — no Redis, no queue, no daemon. Suitable for v1.4 through ~v1.5 (≤10 jobs, each finishing in <5 min).

---

## The 3-Step Pattern

**Step 1 — Register** (inside your subsystem's `.crons.ts` file):
```ts
import { registerCron } from '../cron/cron-runner';

registerCron({
  name: 'orders.reservation-cleanup',  // unique across the whole app
  schedule: '*/5 * * * *',             // every 5 minutes
  handler: async () => {
    await reservationService.expireStale();
  },
});
```

**Step 2 — Import** in `apps/api/src/cron/index.ts`:
```ts
import './orders.crons';  // add this line
```
That's it — `registerCron` fires at module load time.

**Step 3 — Boot** (`main.ts` already calls this):
```ts
import { startAllCrons } from './cron';
// inside the app.listen() callback:
startAllCrons();
```

---

## Cron Expression Cheat Sheet

```
* * * * *
│ │ │ │ └─ weekday  (0–7, 0=Sun, 7=Sun)
│ │ │ └─── month    (1–12)
│ │ └───── day      (1–31)
│ └─────── hour     (0–23)
└───────── minute   (0–59)
```

Common patterns:

| Expression     | Meaning                 |
|----------------|-------------------------|
| `*/15 * * * *` | Every 15 minutes        |
| `0 * * * *`    | Top of every hour       |
| `0 2 * * *`    | Daily at 02:00          |
| `0 2 * * 0`    | Weekly — Sunday 02:00   |
| `0 0 1 * *`    | Monthly — 1st at 00:00  |

---

## Timezone

All jobs default to `Asia/Kuwait` (UTC+3, no DST). Override per-job:

```ts
registerCron({
  name: 'example',
  schedule: '0 9 * * *',
  timezone: 'UTC',
  handler: async () => { /* ... */ },
});
```

---

## Adding a New Subsystem Cron

1. Create `apps/api/src/cron/<subsystem>.crons.ts`.
2. Call `registerCron(...)` at module top-level (outside any function).
3. Add `import './<subsystem>.crons';` to `apps/api/src/cron/index.ts`.
4. Done — `startAllCrons()` will pick it up automatically at next boot.

Name collisions throw at startup (intentional — fail fast, fail loud).

---

## When to Migrate to Bull + Redis

Switch to Bull/BullMQ when **any** of these become true:

- More than ~10 active cron jobs, **or**
- Any single job runs longer than ~5 minutes, **or**
- You need job history, retries with backoff, concurrency limits, or a dashboard UI.

Target milestone: **v1.6** (saved-search alert dispatcher is the likely trigger).
The `registerCron` / `startAllCrons` API surface is intentionally narrow so the swap is a drop-in replacement of `cron-runner.ts` with a Bull adapter — callers don't change.
