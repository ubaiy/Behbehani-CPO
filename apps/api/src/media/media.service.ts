import { randomUUID } from 'crypto';
import type {
  PhotoDto,
  PhotoPresignRequest,
  PhotoPresignResponse,
  PhotoConfirmRequest,
  PhotoUpdateRequest,
  PhotoReorderRequest,
  Media360Dto,
  Media360PresignRequest,
  Media360PresignResponse,
  Media360ConfirmRequest,
  VideoDto,
  VideoPresignRequest,
  VideoPresignResponse,
  VideoConfirmRequest,
} from '@behbehani-cpo/shared-types';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { presignPutUrl, publicUrl, s3Client } from '../lib/s3';
import { env } from '../config/env';
import { MediaError } from './media.errors';
import {
  findPhotosByListing,
  findPhotoById,
  createPhoto,
  confirmPhoto,
  updatePhoto,
  setHeroPhoto,
  deletePhoto,
  maxSortOrder,
  reorderPhotos,
  findMedia360ByListing,
  findMedia360ById,
  deletePendingMedia360,
  createMedia360,
  confirmMedia360,
  deleteMedia360,
  findVideoByListing,
  findVideoById,
  createVideo,
  confirmVideo,
  deleteVideo,
  type PhotoRow,
  type Media360Row,
  type VideoRow,
} from './media.repo';
import { prisma } from '../db/prisma';

// ─── Content-type → extension mapping ───────────────────────────────────────

function photoExt(contentType: string): string {
  if (contentType === 'image/jpeg') return '.jpg';
  if (contentType === 'image/png') return '.png';
  if (contentType === 'image/webp') return '.webp';
  return '.jpg';
}

function media360Ext(contentType: string): string {
  if (contentType === 'application/zip') return '.zip';
  return '.mp4';
}

function videoExt(contentType: string): string {
  if (contentType === 'video/quicktime') return '.mov';
  return '.mp4';
}

// ─── Row → DTO mappers ───────────────────────────────────────────────────────

function toPhotoDto(row: PhotoRow): PhotoDto {
  return {
    id: row.id,
    listingId: row.listingId,
    s3Key: row.s3Key,
    cdnUrl: row.cdnUrl,
    isHero: row.isHero,
    sortOrder: row.sortOrder,
    bytes: row.bytes,
    mimeType: row.mimeType,
    width: row.width,
    height: row.height,
    uploadStatus: row.uploadStatus as PhotoDto['uploadStatus'],
    createdAt: row.createdAt.toISOString(),
  };
}

function toMedia360Dto(row: Media360Row): Media360Dto {
  return {
    id: row.id,
    listingId: row.listingId,
    s3Key: row.archiveS3Key,
    frameCount: row.frameCount,
    bytes: row.bytes,
    mimeType: row.mimeType,
    uploadStatus: row.uploadStatus as Media360Dto['uploadStatus'],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toVideoDto(row: VideoRow): VideoDto {
  return {
    id: row.id,
    listingId: row.listingId,
    s3Key: row.s3Key,
    cdnUrl: row.cdnUrl,
    durationS: row.durationS,
    posterS3Key: row.posterS3Key,
    bytes: row.bytes,
    uploadStatus: row.uploadStatus as VideoDto['uploadStatus'],
    createdAt: row.createdAt.toISOString(),
  };
}

// ─── Listing ownership guard ─────────────────────────────────────────────────

async function assertListingExists(listingId: string): Promise<void> {
  const exists = await prisma.listing.findFirst({
    where: { id: listingId, deletedAt: null },
    select: { id: true },
  });
  if (!exists) throw new MediaError(404, 'Listing not found');
}

// ─── Env-driven size guards ──────────────────────────────────────────────────
// Per-type byte caps live in env so operators can tune without redeploying the
// shared-types library. We throw 413 with a stable code so the client can show
// a precise error (e.g. "Photo too large — limit 10 MB").

function assertPhotoSize(byteSize: number): void {
  if (byteSize > env.MAX_PHOTO_BYTES) {
    throw new MediaError(413, `Photo exceeds maximum size of ${env.MAX_PHOTO_BYTES} bytes`);
  }
}

function assertMedia360Size(byteSize: number): void {
  if (byteSize > env.MAX_360_BYTES) {
    throw new MediaError(413, `360° media exceeds maximum size of ${env.MAX_360_BYTES} bytes`);
  }
}

function assertVideoSize(byteSize: number): void {
  if (byteSize > env.MAX_VIDEO_BYTES) {
    throw new MediaError(413, `Video exceeds maximum size of ${env.MAX_VIDEO_BYTES} bytes`);
  }
}

// ─── Photo service ───────────────────────────────────────────────────────────

export async function listPhotos(listingId: string): Promise<PhotoDto[]> {
  await assertListingExists(listingId);
  const rows = await findPhotosByListing(listingId);
  return rows.map(toPhotoDto);
}

export async function presignPhoto(
  listingId: string,
  dto: PhotoPresignRequest,
  actorId: string,
): Promise<PhotoPresignResponse> {
  assertPhotoSize(dto.byteSize);
  await assertListingExists(listingId);
  const photoId = randomUUID();
  const ext = photoExt(dto.contentType);
  const key = `listings/${listingId}/photos/${photoId}${ext}`;
  const result = await presignPutUrl(key, dto.contentType, dto.byteSize);

  const sortOrder = (await maxSortOrder(listingId)) + 1;
  await createPhoto({
    id: photoId,
    listingId,
    s3Key: key,
    mimeType: dto.contentType,
    bytes: dto.byteSize,
    sortOrder,
    uploadedById: actorId,
  });

  return {
    photoId,
    uploadUrl: result.url,
    s3Key: key,
    expiresAt: result.expiresAt.toISOString(),
  };
}

export async function confirmPhotoUpload(
  listingId: string,
  photoId: string,
  dto: PhotoConfirmRequest,
): Promise<PhotoDto> {
  const photo = await findPhotoById(photoId);
  if (!photo || photo.listingId !== listingId) throw new MediaError(404, 'Photo not found');

  const cdnUrl = publicUrl(photo.s3Key);
  const row = await confirmPhoto(photoId, { cdnUrl, width: dto.width, height: dto.height });
  return toPhotoDto(row);
}

export async function updatePhotoMeta(
  listingId: string,
  photoId: string,
  dto: PhotoUpdateRequest,
): Promise<PhotoDto> {
  const photo = await findPhotoById(photoId);
  if (!photo || photo.listingId !== listingId) throw new MediaError(404, 'Photo not found');

  if (dto.isHero === true) {
    // Clear other heroes first, then apply all patches on this photo in one tx
    await setHeroPhoto(listingId, photoId);
    const row = await updatePhoto(photoId, {
      altEn: dto.altEn,
      altAr: dto.altAr,
    });
    return toPhotoDto(row);
  }

  const row = await updatePhoto(photoId, {
    isHero: dto.isHero,
    altEn: dto.altEn,
    altAr: dto.altAr,
  });
  return toPhotoDto(row);
}

export async function removePhoto(listingId: string, photoId: string): Promise<void> {
  const photo = await findPhotoById(photoId);
  if (!photo || photo.listingId !== listingId) throw new MediaError(404, 'Photo not found');

  await deletePhoto(photoId);

  // Best-effort S3 deletion — never block on failure
  try {
    await s3Client().send(new DeleteObjectCommand({ Bucket: env.S3_BUCKET, Key: photo.s3Key }));
  } catch {
    // intentionally swallowed
  }
}

export async function reorderPhotoList(
  listingId: string,
  dto: PhotoReorderRequest,
): Promise<void> {
  await assertListingExists(listingId);
  const existing = await findPhotosByListing(listingId);
  const existingIds = new Set(existing.map((p) => p.id));

  for (const id of dto.ids) {
    if (!existingIds.has(id)) {
      throw new MediaError(400, `Photo ${id} does not belong to this listing`);
    }
  }

  const updates = dto.ids.map((id, index) => ({ id, sortOrder: index }));
  await reorderPhotos(updates);
}

export async function setPrimaryPhoto(listingId: string, photoId: string): Promise<PhotoDto> {
  const photo = await findPhotoById(photoId);
  if (!photo || photo.listingId !== listingId) throw new MediaError(404, 'Photo not found');
  const row = await setHeroPhoto(listingId, photoId);
  return toPhotoDto(row);
}

// ─── 360 service ─────────────────────────────────────────────────────────────

export async function getMedia360(listingId: string): Promise<Media360Dto | null> {
  await assertListingExists(listingId);
  const row = await findMedia360ByListing(listingId);
  return row ? toMedia360Dto(row) : null;
}

export async function presignMedia360(
  listingId: string,
  dto: Media360PresignRequest,
  actorId: string,
): Promise<Media360PresignResponse> {
  assertMedia360Size(dto.byteSize);
  await assertListingExists(listingId);
  const existing = await findMedia360ByListing(listingId);
  if (existing && existing.uploadStatus === 'complete') {
    throw new MediaError(409, 'A completed 360° media already exists for this listing');
  }
  // Remove any pending row first
  await deletePendingMedia360(listingId);

  const media360Id = randomUUID();
  const ext = media360Ext(dto.contentType);
  const key = `listings/${listingId}/360/${media360Id}${ext}`;
  const result = await presignPutUrl(key, dto.contentType, dto.byteSize);

  await createMedia360({
    id: media360Id,
    listingId,
    archiveS3Key: key,
    mimeType: dto.contentType,
    bytes: dto.byteSize,
    uploadedById: actorId,
  });

  return {
    media360Id,
    uploadUrl: result.url,
    s3Key: key,
    expiresAt: result.expiresAt.toISOString(),
  };
}

export async function confirmMedia360Upload(
  listingId: string,
  media360Id: string,
  dto: Media360ConfirmRequest,
): Promise<Media360Dto> {
  const row = await findMedia360ById(media360Id);
  if (!row || row.listingId !== listingId) throw new MediaError(404, '360° media not found');
  const updated = await confirmMedia360(media360Id, { frameCount: dto.frameCount });
  return toMedia360Dto(updated);
}

export async function removeMedia360(listingId: string, media360Id: string): Promise<void> {
  const row = await findMedia360ById(media360Id);
  if (!row || row.listingId !== listingId) throw new MediaError(404, '360° media not found');
  await deleteMedia360(media360Id);

  try {
    await s3Client().send(new DeleteObjectCommand({ Bucket: env.S3_BUCKET, Key: row.archiveS3Key }));
  } catch {
    // intentionally swallowed
  }
}

// ─── Video service ───────────────────────────────────────────────────────────

export async function getVideo(listingId: string): Promise<VideoDto | null> {
  await assertListingExists(listingId);
  const row = await findVideoByListing(listingId);
  return row ? toVideoDto(row) : null;
}

export async function presignVideo(
  listingId: string,
  dto: VideoPresignRequest,
  actorId: string,
): Promise<VideoPresignResponse> {
  assertVideoSize(dto.byteSize);
  await assertListingExists(listingId);
  const existing = await findVideoByListing(listingId);
  if (existing) {
    throw new MediaError(409, 'A video already exists for this listing');
  }

  const videoId = randomUUID();
  const ext = videoExt(dto.contentType);
  const key = `listings/${listingId}/video/${videoId}${ext}`;
  const result = await presignPutUrl(key, dto.contentType, dto.byteSize);

  await createVideo({
    id: videoId,
    listingId,
    s3Key: key,
    mimeType: dto.contentType,
    bytes: dto.byteSize,
    uploadedById: actorId,
  });

  return {
    videoId,
    uploadUrl: result.url,
    s3Key: key,
    expiresAt: result.expiresAt.toISOString(),
  };
}

export async function confirmVideoUpload(
  listingId: string,
  videoId: string,
  dto: VideoConfirmRequest,
): Promise<VideoDto> {
  const row = await findVideoById(videoId);
  if (!row || row.listingId !== listingId) throw new MediaError(404, 'Video not found');

  // Validate posterS3Key: must be a key under this listing's video folder.
  // Without this guard, a caller could point the poster at any object in the
  // bucket (e.g. another listing's photo, or a maliciously placed object).
  if (dto.posterS3Key !== undefined) {
    const allowedPrefix = `listings/${listingId}/video/`;
    if (!dto.posterS3Key.startsWith(allowedPrefix)) {
      throw new MediaError(422, 'posterS3Key must be under this listing\'s video path');
    }
  }

  const cdnUrl = publicUrl(row.s3Key);
  const updated = await confirmVideo(videoId, {
    cdnUrl,
    durationS: dto.durationS,
    posterS3Key: dto.posterS3Key,
  });
  return toVideoDto(updated);
}

export async function removeVideo(listingId: string, videoId: string): Promise<void> {
  const row = await findVideoById(videoId);
  if (!row || row.listingId !== listingId) throw new MediaError(404, 'Video not found');
  await deleteVideo(videoId);

  try {
    await s3Client().send(new DeleteObjectCommand({ Bucket: env.S3_BUCKET, Key: row.s3Key }));
    if (row.posterS3Key) {
      await s3Client().send(new DeleteObjectCommand({ Bucket: env.S3_BUCKET, Key: row.posterS3Key }));
    }
  } catch {
    // intentionally swallowed
  }
}
