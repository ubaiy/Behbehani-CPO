import { Queue, Worker, Processor } from 'bullmq';
import { redisClient } from './redis';

// ─── Queue names ─────────────────────────────────────────────────────────────

const AGING_QUEUE_NAME = 'aging-engine';

// ─── Aging engine queue ──────────────────────────────────────────────────────

let _agingQueue: Queue | null = null;

export function agingQueue(): Queue {
  if (!_agingQueue) {
    _agingQueue = new Queue(AGING_QUEUE_NAME, {
      connection: redisClient(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    });
  }
  return _agingQueue;
}

// ─── Worker factory ──────────────────────────────────────────────────────────

// Wave 2 aging-backend calls this with its own processor function.
export function makeAgingWorker<T = unknown, R = unknown>(
  processor: Processor<T, R>,
): Worker<T, R> {
  return new Worker<T, R>(AGING_QUEUE_NAME, processor, {
    connection: redisClient(),
    concurrency: 1,
  });
}

// ─── Graceful shutdown ───────────────────────────────────────────────────────

export async function closeQueues(): Promise<void> {
  if (_agingQueue) {
    await _agingQueue.close();
    _agingQueue = null;
    console.log('[queues] aging queue closed');
  }
}
