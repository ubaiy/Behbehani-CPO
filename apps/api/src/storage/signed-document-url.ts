import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../config/env';
import { s3Client } from '../lib/s3';

/**
 * Generate a signed S3 GET URL for a document key.
 *
 * TTL is caller-specified (typically 15 min = 900 s for Tier-2 documents per
 * S3_CONVENTIONS.md). Uses the same S3 client singleton and credentials that
 * the media upload pipeline uses (apps/api/src/lib/s3.ts).
 */
export async function generateSignedDocumentUrl(
  fileKey: string,
  ttlSec: number,
): Promise<{ url: string; expiresAt: string }> {
  const command = new GetObjectCommand({
    Bucket: env.S3_BUCKET,
    Key:    fileKey,
  });

  const url = await getSignedUrl(s3Client(), command, { expiresIn: ttlSec });
  const expiresAt = new Date(Date.now() + ttlSec * 1000).toISOString();
  return { url, expiresAt };
}
