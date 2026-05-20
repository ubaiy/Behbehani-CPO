import { z } from 'zod';

/**
 * Media DTOs (photos, 360°, video) shared between API and admin.
 * Plan reference: Sprint 2 — presigned upload flow.
 *
 * Money not applicable here; sizes in bytes (int).
 *
 * Note: per-type max-byte caps live in the server's env (MAX_PHOTO_BYTES,
 * MAX_360_BYTES, MAX_VIDEO_BYTES) and are enforced in `apps/api/src/media/
 * media.service.ts`. The schemas here only assert positive integers — operators
 * change the caps via env without redeploying the shared-types library.
 */

const uploadStatusSchema = z.enum(['pending', 'complete', 'failed']);

// ---------------------------------------------------------------------------
// Photo
// ---------------------------------------------------------------------------

export const PhotoPresignRequestSchema = z.object({
  filename: z.string().min(1).max(200),
  contentType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
  byteSize: z.number().int().min(1),
});
export type PhotoPresignRequest = z.infer<typeof PhotoPresignRequestSchema>;

export const PhotoPresignResponseSchema = z.object({
  photoId: z.string().uuid(),
  uploadUrl: z.string().url(),
  s3Key: z.string(),
  expiresAt: z.string().datetime(),
});
export type PhotoPresignResponse = z.infer<typeof PhotoPresignResponseSchema>;

export const PhotoConfirmRequestSchema = z.object({
  width: z.number().int().optional(),
  height: z.number().int().optional(),
});
export type PhotoConfirmRequest = z.infer<typeof PhotoConfirmRequestSchema>;

export const PhotoReorderRequestSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).superRefine((ids, ctx) => {
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'ids must be unique' });
    }
  }),
});
export type PhotoReorderRequest = z.infer<typeof PhotoReorderRequestSchema>;

export const PhotoUpdateRequestSchema = z.object({
  isHero: z.boolean().optional(),
  altEn: z.string().nullable().optional(),
  altAr: z.string().nullable().optional(),
});
export type PhotoUpdateRequest = z.infer<typeof PhotoUpdateRequestSchema>;

export const PhotoDtoSchema = z.object({
  id: z.string().uuid(),
  listingId: z.string().uuid(),
  s3Key: z.string(),
  cdnUrl: z.string().url().nullable(),
  isHero: z.boolean(),
  sortOrder: z.number().int(),
  bytes: z.number().int().nullable(),
  mimeType: z.string().nullable(),
  width: z.number().int().nullable(),
  height: z.number().int().nullable(),
  uploadStatus: uploadStatusSchema,
  createdAt: z.string().datetime(),
});
export type PhotoDto = z.infer<typeof PhotoDtoSchema>;

// ---------------------------------------------------------------------------
// 360°
// ---------------------------------------------------------------------------

export const Media360PresignRequestSchema = z.object({
  filename: z.string().min(1),
  contentType: z.enum(['application/zip', 'video/mp4']),
  byteSize: z.number().int().min(1),
});
export type Media360PresignRequest = z.infer<typeof Media360PresignRequestSchema>;

export const Media360PresignResponseSchema = z.object({
  media360Id: z.string().uuid(),
  uploadUrl: z.string().url(),
  s3Key: z.string(),
  expiresAt: z.string().datetime(),
});
export type Media360PresignResponse = z.infer<typeof Media360PresignResponseSchema>;

export const Media360ConfirmRequestSchema = z.object({
  frameCount: z.number().int().optional(),
});
export type Media360ConfirmRequest = z.infer<typeof Media360ConfirmRequestSchema>;

export const Media360DtoSchema = z.object({
  id: z.string().uuid(),
  listingId: z.string().uuid(),
  s3Key: z.string(),
  frameCount: z.number().int().nullable(),
  bytes: z.number().int().nullable(),
  mimeType: z.string().nullable(),
  uploadStatus: uploadStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Media360Dto = z.infer<typeof Media360DtoSchema>;

// ---------------------------------------------------------------------------
// Video
// ---------------------------------------------------------------------------

export const VideoPresignRequestSchema = z.object({
  filename: z.string().min(1),
  contentType: z.enum(['video/mp4', 'video/quicktime']),
  byteSize: z.number().int().min(1),
});
export type VideoPresignRequest = z.infer<typeof VideoPresignRequestSchema>;

export const VideoPresignResponseSchema = z.object({
  videoId: z.string().uuid(),
  uploadUrl: z.string().url(),
  s3Key: z.string(),
  expiresAt: z.string().datetime(),
});
export type VideoPresignResponse = z.infer<typeof VideoPresignResponseSchema>;

export const VideoConfirmRequestSchema = z.object({
  durationS: z.number().int().optional(),
  posterS3Key: z.string().optional(),
});
export type VideoConfirmRequest = z.infer<typeof VideoConfirmRequestSchema>;

export const VideoDtoSchema = z.object({
  id: z.string().uuid(),
  listingId: z.string().uuid(),
  s3Key: z.string(),
  cdnUrl: z.string().url().nullable(),
  durationS: z.number().int().nullable(),
  posterS3Key: z.string().nullable(),
  bytes: z.number().int().nullable(),
  uploadStatus: uploadStatusSchema,
  createdAt: z.string().datetime(),
});
export type VideoDto = z.infer<typeof VideoDtoSchema>;
