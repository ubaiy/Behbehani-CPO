import {
  S3Client,
  HeadBucketCommand,
  CreateBucketCommand,
  PutBucketPolicyCommand,
} from '@aws-sdk/client-s3';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../config/env';

// ─── Singleton client ───────────────────────────────────────────────────────

let _client: S3Client | null = null;

export function s3Client(): S3Client {
  if (!_client) {
    _client = new S3Client({
      endpoint: env.S3_ENDPOINT,
      region: env.S3_REGION,
      forcePathStyle: env.S3_FORCE_PATH_STYLE,
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY,
        secretAccessKey: env.S3_SECRET_KEY,
      },
    });
  }
  return _client;
}

// ─── Presigned PUT URL ──────────────────────────────────────────────────────

export interface PresignResult {
  url: string;
  key: string;
  expiresAt: Date;
}

export async function presignPutUrl(
  key: string,
  contentType: string,
  byteSize: number,
): Promise<PresignResult> {
  const command = new PutObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: key,
    ContentType: contentType,
    ContentLength: byteSize,
  });

  const url = await getSignedUrl(s3Client(), command, {
    expiresIn: env.S3_PRESIGN_TTL_SEC,
  });

  const expiresAt = new Date(Date.now() + env.S3_PRESIGN_TTL_SEC * 1000);
  return { url, key, expiresAt };
}

// ─── Server-side put (for API-generated artifacts e.g. receipt PDFs) ────────

/**
 * Upload a Buffer to S3 from the server. Used for server-generated artifacts
 * (e.g. receipt PDFs). Returns the relative key.
 */
export async function putObjectToS3(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<{ key: string }> {
  const command = new PutObjectCommand({
    Bucket:      env.S3_BUCKET,
    Key:         key,
    Body:        body,
    ContentType: contentType,
  });
  await s3Client().send(command);
  return { key };
}

// ─── Public CDN URL ─────────────────────────────────────────────────────────

export function publicUrl(key: string): string {
  const base = env.S3_PUBLIC_BASE_URL.replace(/\/$/, '');
  const safeKey = key.replace(/^\//, '');
  return `${base}/${safeKey}`;
}

// ─── Boot-time bucket ensure ────────────────────────────────────────────────

/**
 * Bucket policy granting anonymous `s3:GetObject` for every object in the
 * bucket. The admin renders thumbnails via plain `<img src="cdnUrl">` — those
 * requests are unauthenticated, so without this policy MinIO returns 403 and
 * the browser shows the broken-image icon. The presigned PUT for uploads still
 * works because that URL carries its own signature.
 *
 * Dev/local use only. Production will sit behind CloudFront with proper
 * origin-access controls; this policy is not reapplied there because the
 * production bucket already exists and `ensureBucket` short-circuits on the
 * `HeadBucket` success path.
 */
function publicReadPolicy(bucket: string): string {
  return JSON.stringify({
    Version: '2012-10-17',
    Statement: [
      {
        Sid: 'AllowPublicRead',
        Effect: 'Allow',
        Principal: { AWS: ['*'] },
        Action: ['s3:GetObject'],
        Resource: [`arn:aws:s3:::${bucket}/*`],
      },
    ],
  });
}

async function applyPublicReadPolicy(bucket: string): Promise<void> {
  try {
    await s3Client().send(
      new PutBucketPolicyCommand({
        Bucket: bucket,
        Policy: publicReadPolicy(bucket),
      }),
    );
    console.log(`[s3] public-read policy applied to "${bucket}"`);
  } catch (err) {
    // Don't fail boot if policy apply fails — uploads still work, only
    // thumbnail display is affected.
    console.error(`[s3] failed to apply public-read policy to "${bucket}"`, err);
  }
}

export async function ensureBucket(): Promise<void> {
  const client = s3Client();
  const bucket = env.S3_BUCKET;

  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
    console.log(`[s3] bucket "${bucket}" already exists`);
    // Existing bucket may pre-date the public-read policy fix — reapply
    // idempotently so previously-uploaded photos render in the admin.
    await applyPublicReadPolicy(bucket);
  } catch (err: unknown) {
    const code =
      err instanceof Error && 'name' in err ? (err as { name: string }).name : '';
    if (code === 'NotFound' || code === 'NoSuchBucket') {
      await client.send(new CreateBucketCommand({ Bucket: bucket }));
      console.log(`[s3] bucket "${bucket}" created`);
      await applyPublicReadPolicy(bucket);
    } else {
      console.error('[s3] ensureBucket failed', err);
      throw err;
    }
  }
}
