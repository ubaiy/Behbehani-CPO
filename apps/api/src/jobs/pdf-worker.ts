/**
 * PDF generation worker — Phase 4 §9.
 *
 * Queue: `pdf.inspection-report`
 * Triggered by both CPO and Concierge signoff() after inspection is signed off.
 * Fire-and-forget from the service layer: `void enqueueInspectionReportPdf(id)`.
 *
 * The actual Puppeteer rendering is deferred — see the TODO block below.
 */

import { Queue } from 'bullmq';
import { redisClient } from '../lib/redis';

// ─── Queue definition ─────────────────────────────────────────────────────────

const PDF_QUEUE_NAME = 'pdf.inspection-report';

export interface PdfJobPayload {
  inspectionId: string;
}

let _pdfQueue: Queue<PdfJobPayload> | null = null;

export function pdfQueue(): Queue<PdfJobPayload> {
  if (!_pdfQueue) {
    _pdfQueue = new Queue<PdfJobPayload>(PDF_QUEUE_NAME, {
      connection: redisClient(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 10_000 },
        removeOnComplete: 50,
        removeOnFail: 100,
      },
    });
  }
  return _pdfQueue;
}

// ─── Enqueue helper (called by inspections.service signoff) ───────────────────

/**
 * Enqueue a PDF generation job for the given inspection.
 * Fire-and-forget — the caller should NOT await this; it runs in the background.
 *
 * @example
 *   void enqueueInspectionReportPdf(updated.id);
 */
export async function enqueueInspectionReportPdf(inspectionId: string): Promise<void> {
  try {
    await pdfQueue().add(
      'pdf.inspection-report',
      { inspectionId },
      { jobId: `pdf-${inspectionId}`, removeOnComplete: true },
    );
  } catch (err) {
    // Queue failures must never break a successful signoff. Log and move on.
    // eslint-disable-next-line no-console
    console.error('[pdf-worker] failed to enqueue PDF job for inspection', inspectionId, err);
  }
}

// ─── Graceful shutdown ────────────────────────────────────────────────────────

export async function closePdfQueue(): Promise<void> {
  if (_pdfQueue) {
    await _pdfQueue.close();
    _pdfQueue = null;
  }
}

// TODO(pdf-puppeteer): Implement the Puppeteer worker in a separate Docker
// container (or Node.js worker process) to avoid inflating the main API image
// by ~250MB. Strategy from spec §9:
//
//   1. Worker picks up job from `pdf.inspection-report` queue.
//   2. Spins up Puppeteer headless Chrome.
//   3. Renders GET /internal/inspection-report/:id (service-to-service secret
//      header, never exposed publicly). Locale defaults to 'en'; future:
//      ?locale=ar for RTL layout (dir="ltr" for now, no Arabic font dependency).
//   4. Saves rendered PDF to S3 under key:
//        inspections/{inspectionId}/report.pdf
//   5. Updates InspectionReport.reportPdfKey with the S3 key.
//   6. On success: emits audit 'inspection.pdf.generated'.
//   7. On failure: retries up to 3× with exponential backoff (10s, 20s, 40s).
//
// The admin signoff page polls GET /v1/admin/inspections/:id every 5 seconds
// until reportPdfKey is non-null, then surfaces the download link.
// Once populated, pdfUrl (pre-signed S3 URL, TTL = publicTokenExpiresAt) is
// added to PublicInspectionSummarySchema so the storefront VDP can offer the
// report download.
