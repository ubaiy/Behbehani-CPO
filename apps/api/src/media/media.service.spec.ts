/**
 * Media service tests — focus on the photo-list invariants:
 *   • setPrimaryPhoto clears isHero on every other photo (one-primary).
 *   • reorderPhotoList rejects ids that don't belong to the listing.
 *   • reorderPhotoList writes sortOrder matching the array order.
 */

jest.mock('./media.repo', () => ({
  findPhotosByListing: jest.fn(),
  findPhotoById: jest.fn(),
  createPhoto: jest.fn(),
  confirmPhoto: jest.fn(),
  updatePhoto: jest.fn(),
  setHeroPhoto: jest.fn(),
  deletePhoto: jest.fn(),
  maxSortOrder: jest.fn(),
  reorderPhotos: jest.fn(),
  findMedia360ByListing: jest.fn(),
  findMedia360ById: jest.fn(),
  deletePendingMedia360: jest.fn(),
  createMedia360: jest.fn(),
  confirmMedia360: jest.fn(),
  deleteMedia360: jest.fn(),
  findVideoByListing: jest.fn(),
  findVideoById: jest.fn(),
  createVideo: jest.fn(),
  confirmVideo: jest.fn(),
  deleteVideo: jest.fn(),
}));

jest.mock('../db/prisma', () => ({
  prisma: {
    listing: { findFirst: jest.fn() },
  },
}));

jest.mock('../lib/s3', () => ({
  presignPutUrl: jest.fn(),
  publicUrl: jest.fn((key: string) => `https://cdn.example/${key}`),
  s3Client: jest.fn(() => ({ send: jest.fn() })),
}));

jest.mock('../config/env', () => ({
  env: { S3_BUCKET: 'test-bucket', NODE_ENV: 'test' },
}));

import { prisma } from '../db/prisma';
import {
  findPhotoById,
  findPhotosByListing,
  setHeroPhoto,
  reorderPhotos,
  type PhotoRow,
} from './media.repo';
import { setPrimaryPhoto, reorderPhotoList } from './media.service';
import { MediaError } from './media.errors';

const findPhotoByIdMock = findPhotoById as jest.MockedFunction<typeof findPhotoById>;
const findPhotosByListingMock = findPhotosByListing as jest.MockedFunction<typeof findPhotosByListing>;
const setHeroPhotoMock = setHeroPhoto as jest.MockedFunction<typeof setHeroPhoto>;
const reorderPhotosMock = reorderPhotos as jest.MockedFunction<typeof reorderPhotos>;
const listingFindFirst = (prisma.listing.findFirst as jest.Mock);

function makePhoto(id: string, listingId: string, overrides: Partial<PhotoRow> = {}): PhotoRow {
  return {
    id,
    listingId,
    s3Key: `listings/${listingId}/photos/${id}.jpg`,
    cdnUrl: `https://cdn.example/${id}`,
    isHero: false,
    sortOrder: 0,
    bytes: 100_000,
    mimeType: 'image/jpeg',
    width: 1920,
    height: 1080,
    uploadStatus: 'complete',
    createdAt: new Date('2026-01-01'),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  listingFindFirst.mockResolvedValue({ id: 'l1' });
});

describe('MediaService.setPrimaryPhoto — one-primary invariant', () => {
  it('should call setHeroPhoto with the listing + photo id and return the updated photo', async () => {
    const target = makePhoto('p2', 'l1', { isHero: true });
    findPhotoByIdMock.mockResolvedValueOnce(makePhoto('p2', 'l1'));
    setHeroPhotoMock.mockResolvedValueOnce(target);

    const result = await setPrimaryPhoto('l1', 'p2');

    expect(setHeroPhotoMock).toHaveBeenCalledWith('l1', 'p2');
    expect(setHeroPhotoMock).toHaveBeenCalledTimes(1);
    expect(result.isHero).toBe(true);
    expect(result.id).toBe('p2');
  });

  it('should throw 404 if the photo does not belong to the listing', async () => {
    findPhotoByIdMock.mockResolvedValueOnce(makePhoto('p2', 'OTHER-LISTING'));

    await expect(setPrimaryPhoto('l1', 'p2')).rejects.toBeInstanceOf(MediaError);
    await expect(setPrimaryPhoto('l1', 'p2')).rejects.toMatchObject({ status: 404 });
    expect(setHeroPhotoMock).not.toHaveBeenCalled();
  });

  it('should throw 404 if the photo does not exist', async () => {
    findPhotoByIdMock.mockResolvedValue(null);

    await expect(setPrimaryPhoto('l1', 'nope')).rejects.toMatchObject({ status: 404 });
    expect(setHeroPhotoMock).not.toHaveBeenCalled();
  });
});

describe('MediaService.reorderPhotoList', () => {
  it('should reject when any id is not in the listing (status 400)', async () => {
    findPhotosByListingMock.mockResolvedValueOnce([
      makePhoto('p1', 'l1'),
      makePhoto('p2', 'l1'),
    ]);

    await expect(
      reorderPhotoList('l1', { ids: ['p1', 'p2', 'foreign'] }),
    ).rejects.toMatchObject({ status: 400 });
    expect(reorderPhotosMock).not.toHaveBeenCalled();
  });

  it('should update sortOrder to match the array order', async () => {
    findPhotosByListingMock.mockResolvedValueOnce([
      makePhoto('p1', 'l1', { sortOrder: 0 }),
      makePhoto('p2', 'l1', { sortOrder: 1 }),
      makePhoto('p3', 'l1', { sortOrder: 2 }),
    ]);
    reorderPhotosMock.mockResolvedValueOnce(undefined);

    await reorderPhotoList('l1', { ids: ['p3', 'p1', 'p2'] });

    expect(reorderPhotosMock).toHaveBeenCalledTimes(1);
    expect(reorderPhotosMock).toHaveBeenCalledWith([
      { id: 'p3', sortOrder: 0 },
      { id: 'p1', sortOrder: 1 },
      { id: 'p2', sortOrder: 2 },
    ]);
  });

  it('should accept reorder with all known ids and produce zero-indexed sortOrders', async () => {
    findPhotosByListingMock.mockResolvedValueOnce([
      makePhoto('a', 'l1'),
      makePhoto('b', 'l1'),
    ]);
    reorderPhotosMock.mockResolvedValueOnce(undefined);

    await reorderPhotoList('l1', { ids: ['b', 'a'] });

    const arg = reorderPhotosMock.mock.calls[0][0];
    expect(arg[0]).toEqual({ id: 'b', sortOrder: 0 });
    expect(arg[1]).toEqual({ id: 'a', sortOrder: 1 });
  });

  it('should 404 when the parent listing does not exist', async () => {
    listingFindFirst.mockResolvedValueOnce(null);
    await expect(
      reorderPhotoList('missing', { ids: [] }),
    ).rejects.toMatchObject({ status: 404 });
  });
});
