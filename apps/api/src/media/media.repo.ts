import { prisma } from '../db/prisma';

// ─── Photo ──────────────────────────────────────────────────────────────────

const PHOTO_SELECT = {
  id: true,
  listingId: true,
  s3Key: true,
  cdnUrl: true,
  isHero: true,
  sortOrder: true,
  bytes: true,
  mimeType: true,
  width: true,
  height: true,
  uploadStatus: true,
  createdAt: true,
} as const;

export type PhotoRow = {
  id: string;
  listingId: string;
  s3Key: string;
  cdnUrl: string | null;
  isHero: boolean;
  sortOrder: number;
  bytes: number | null;
  mimeType: string | null;
  width: number | null;
  height: number | null;
  uploadStatus: string;
  createdAt: Date;
};

export async function findPhotosByListing(listingId: string): Promise<PhotoRow[]> {
  return prisma.listingPhoto.findMany({
    where: { listingId },
    select: PHOTO_SELECT,
    orderBy: { sortOrder: 'asc' },
  });
}

export async function findPhotoById(id: string): Promise<PhotoRow | null> {
  return prisma.listingPhoto.findFirst({ where: { id }, select: PHOTO_SELECT });
}

export async function createPhoto(data: {
  id: string;
  listingId: string;
  s3Key: string;
  mimeType: string;
  bytes: number;
  sortOrder: number;
  uploadedById: string;
}): Promise<PhotoRow> {
  return prisma.listingPhoto.create({
    data: {
      id: data.id,
      listingId: data.listingId,
      s3Key: data.s3Key,
      mimeType: data.mimeType,
      bytes: data.bytes,
      sortOrder: data.sortOrder,
      uploadStatus: 'pending',
      uploadedById: data.uploadedById,
    },
    select: PHOTO_SELECT,
  });
}

export async function confirmPhoto(
  id: string,
  patch: { cdnUrl: string; width?: number; height?: number },
): Promise<PhotoRow> {
  return prisma.listingPhoto.update({
    where: { id },
    data: { uploadStatus: 'complete', cdnUrl: patch.cdnUrl, width: patch.width, height: patch.height },
    select: PHOTO_SELECT,
  });
}

export async function updatePhoto(
  id: string,
  patch: { isHero?: boolean; altEn?: string | null; altAr?: string | null },
): Promise<PhotoRow> {
  return prisma.listingPhoto.update({ where: { id }, data: patch, select: PHOTO_SELECT });
}

export async function setHeroPhoto(listingId: string, photoId: string): Promise<PhotoRow> {
  const [, updated] = await prisma.$transaction([
    prisma.listingPhoto.updateMany({
      where: { listingId, id: { not: photoId } },
      data: { isHero: false },
    }),
    prisma.listingPhoto.update({
      where: { id: photoId },
      data: { isHero: true },
      select: PHOTO_SELECT,
    }),
  ]);
  return updated;
}

export async function deletePhoto(id: string): Promise<void> {
  await prisma.listingPhoto.delete({ where: { id } });
}

export async function maxSortOrder(listingId: string): Promise<number> {
  const agg = await prisma.listingPhoto.aggregate({
    where: { listingId },
    _max: { sortOrder: true },
  });
  return agg._max.sortOrder ?? -1;
}

export async function reorderPhotos(updates: { id: string; sortOrder: number }[]): Promise<void> {
  await prisma.$transaction(
    updates.map(({ id, sortOrder }) =>
      prisma.listingPhoto.update({ where: { id }, data: { sortOrder } }),
    ),
  );
}

// ─── 360 ────────────────────────────────────────────────────────────────────

const MEDIA360_SELECT = {
  id: true,
  listingId: true,
  archiveS3Key: true,
  frameCount: true,
  bytes: true,
  mimeType: true,
  uploadStatus: true,
  createdAt: true,
  updatedAt: true,
} as const;

export type Media360Row = {
  id: string;
  listingId: string;
  archiveS3Key: string;
  frameCount: number | null;
  bytes: number | null;
  mimeType: string | null;
  uploadStatus: string;
  createdAt: Date;
  updatedAt: Date;
};

export async function findMedia360ByListing(listingId: string): Promise<Media360Row | null> {
  return prisma.listing360.findUnique({
    where: { listingId },
    select: MEDIA360_SELECT,
  });
}

export async function findMedia360ById(id: string): Promise<Media360Row | null> {
  return prisma.listing360.findFirst({ where: { id }, select: MEDIA360_SELECT });
}

export async function deletePendingMedia360(listingId: string): Promise<void> {
  await prisma.listing360.deleteMany({ where: { listingId, uploadStatus: 'pending' } });
}

export async function createMedia360(data: {
  id: string;
  listingId: string;
  archiveS3Key: string;
  mimeType: string;
  bytes: number;
  uploadedById: string;
}): Promise<Media360Row> {
  return prisma.listing360.create({
    data: {
      id: data.id,
      listingId: data.listingId,
      archiveS3Key: data.archiveS3Key,
      mimeType: data.mimeType,
      bytes: data.bytes,
      uploadStatus: 'pending',
      uploadedById: data.uploadedById,
    },
    select: MEDIA360_SELECT,
  });
}

export async function confirmMedia360(id: string, patch: { frameCount?: number }): Promise<Media360Row> {
  return prisma.listing360.update({
    where: { id },
    data: { uploadStatus: 'complete', frameCount: patch.frameCount },
    select: MEDIA360_SELECT,
  });
}

export async function deleteMedia360(id: string): Promise<void> {
  await prisma.listing360.delete({ where: { id } });
}

// ─── Video ──────────────────────────────────────────────────────────────────

const VIDEO_SELECT = {
  id: true,
  listingId: true,
  s3Key: true,
  cdnUrl: true,
  durationS: true,
  posterS3Key: true,
  bytes: true,
  mimeType: true,
  uploadStatus: true,
  createdAt: true,
} as const;

export type VideoRow = {
  id: string;
  listingId: string;
  s3Key: string;
  cdnUrl: string | null;
  durationS: number | null;
  posterS3Key: string | null;
  bytes: number | null;
  mimeType: string | null;
  uploadStatus: string;
  createdAt: Date;
};

export async function findVideoByListing(listingId: string): Promise<VideoRow | null> {
  return prisma.listingVideo.findFirst({ where: { listingId }, select: VIDEO_SELECT });
}

export async function findVideoById(id: string): Promise<VideoRow | null> {
  return prisma.listingVideo.findFirst({ where: { id }, select: VIDEO_SELECT });
}

export async function createVideo(data: {
  id: string;
  listingId: string;
  s3Key: string;
  mimeType: string;
  bytes: number;
  uploadedById: string;
}): Promise<VideoRow> {
  return prisma.listingVideo.create({
    data: {
      id: data.id,
      listingId: data.listingId,
      s3Key: data.s3Key,
      mimeType: data.mimeType,
      bytes: data.bytes,
      uploadStatus: 'pending',
      uploadedById: data.uploadedById,
    },
    select: VIDEO_SELECT,
  });
}

export async function confirmVideo(
  id: string,
  patch: { cdnUrl: string; durationS?: number; posterS3Key?: string },
): Promise<VideoRow> {
  return prisma.listingVideo.update({
    where: { id },
    data: {
      uploadStatus: 'complete',
      cdnUrl: patch.cdnUrl,
      durationS: patch.durationS,
      posterS3Key: patch.posterS3Key,
    },
    select: VIDEO_SELECT,
  });
}

export async function deleteVideo(id: string): Promise<void> {
  await prisma.listingVideo.delete({ where: { id } });
}
