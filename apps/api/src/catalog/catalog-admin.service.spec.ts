/**
 * Catalog admin service tests — slug uniqueness, idempotent isActive toggles,
 * and 404 handling. Repo layer is mocked; we exercise the service-level
 * orchestration + DTO shaping + error conditions.
 */

jest.mock('./catalog-admin.repo', () => ({
  statusWhere: jest.fn(),
  listBrands: jest.fn(),
  findBrandById: jest.fn(),
  findBrandBySlug: jest.fn(),
  createBrand: jest.fn(),
  updateBrand: jest.fn(),
  listModelsByBrand: jest.fn(),
  findModelById: jest.fn(),
  findModelBySlug: jest.fn(),
  createModel: jest.fn(),
  updateModel: jest.fn(),
  findTrimByName: jest.fn(),
  findTrimById: jest.fn(),
  createTrim: jest.fn(),
  updateTrim: jest.fn(),
  listBodyTypes: jest.fn(),
  findBodyTypeById: jest.fn(),
  findBodyTypeBySlug: jest.fn(),
  createBodyType: jest.fn(),
  updateBodyType: jest.fn(),
}));

jest.mock('../lib/s3', () => ({
  presignPutUrl: jest.fn(),
  publicUrl: (k: string) => `http://localhost:9000/cpo-media/${k}`,
  s3Client: jest.fn(() => ({ send: jest.fn() })),
}));

import * as repo from './catalog-admin.repo';
import {
  createBrandService,
  updateBrandService,
  setBrandActiveService,
  createModelService,
  createTrimService,
  setTrimActiveService,
  setBodyTypeActiveService,
  presignBrandLogoService,
} from './catalog-admin.service';
import { CatalogError } from './catalog-admin.errors';

const findBrandBySlug = repo.findBrandBySlug as jest.MockedFunction<typeof repo.findBrandBySlug>;
const findBrandById = repo.findBrandById as jest.MockedFunction<typeof repo.findBrandById>;
const createBrand = repo.createBrand as jest.MockedFunction<typeof repo.createBrand>;
const updateBrand = repo.updateBrand as jest.MockedFunction<typeof repo.updateBrand>;
const findModelById = repo.findModelById as jest.MockedFunction<typeof repo.findModelById>;
const findModelBySlug = repo.findModelBySlug as jest.MockedFunction<typeof repo.findModelBySlug>;
const createModel = repo.createModel as jest.MockedFunction<typeof repo.createModel>;
const findTrimByName = repo.findTrimByName as jest.MockedFunction<typeof repo.findTrimByName>;
const findTrimById = repo.findTrimById as jest.MockedFunction<typeof repo.findTrimById>;
const createTrim = repo.createTrim as jest.MockedFunction<typeof repo.createTrim>;
const updateTrim = repo.updateTrim as jest.MockedFunction<typeof repo.updateTrim>;
const findBodyTypeById = repo.findBodyTypeById as jest.MockedFunction<typeof repo.findBodyTypeById>;
const updateBodyType = repo.updateBodyType as jest.MockedFunction<typeof repo.updateBodyType>;

beforeEach(() => jest.clearAllMocks());

// ─── Brand ───────────────────────────────────────────────────────────────────

const brandRow = (overrides: Partial<repo.BrandRow> = {}): repo.BrandRow => ({
  id: 'b1',
  slug: 'toyota',
  nameEn: 'Toyota',
  nameAr: 'تويوتا',
  logoUrl: null,
  isActive: true,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-02'),
  _count: { models: 12, listings: 47 },
  ...overrides,
});

describe('createBrandService', () => {
  it('throws 409 with code slug_taken when slug already exists', async () => {
    findBrandBySlug.mockResolvedValueOnce({ id: 'other' });
    await expect(
      createBrandService({ slug: 'toyota', nameEn: 'Toyota', nameAr: 'تويوتا', isActive: true }),
    ).rejects.toMatchObject({ status: 409, code: 'slug_taken' });
    expect(createBrand).not.toHaveBeenCalled();
  });

  it('creates with isActive=true and null logoUrl when logo omitted', async () => {
    findBrandBySlug.mockResolvedValueOnce(null);
    createBrand.mockResolvedValueOnce(brandRow());
    const result = await createBrandService({
      slug: 'toyota',
      nameEn: 'Toyota',
      nameAr: 'تويوتا',
      isActive: true,
    });
    expect(createBrand).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'toyota', isActive: true, logoUrl: null }),
    );
    expect(result.after.slug).toBe('toyota');
    expect(result.after.modelCount).toBe(12);
  });
});

describe('updateBrandService', () => {
  it('throws 404 when brand is missing', async () => {
    findBrandById.mockResolvedValueOnce(null);
    await expect(updateBrandService('missing', { nameEn: 'X' })).rejects.toBeInstanceOf(CatalogError);
  });

  it('blocks slug change when target slug is taken by another brand', async () => {
    findBrandById.mockResolvedValueOnce(brandRow({ slug: 'toyota' }));
    findBrandBySlug.mockResolvedValueOnce({ id: 'other' });
    await expect(updateBrandService('b1', { slug: 'honda' })).rejects.toMatchObject({
      status: 409,
      code: 'slug_taken',
    });
    expect(updateBrand).not.toHaveBeenCalled();
  });

  it('allows slug change when same brand owns the new slug (idempotent re-save)', async () => {
    findBrandById.mockResolvedValueOnce(brandRow({ slug: 'toyota' }));
    findBrandBySlug.mockResolvedValueOnce({ id: 'b1' }); // same brand
    updateBrand.mockResolvedValueOnce(brandRow({ slug: 'toyota' }));
    await expect(updateBrandService('b1', { slug: 'toyota' })).resolves.toBeDefined();
  });
});

describe('setBrandActiveService', () => {
  it('is idempotent — same state = no update call', async () => {
    findBrandById.mockResolvedValueOnce(brandRow({ isActive: true }));
    const result = await setBrandActiveService('b1', true);
    expect(updateBrand).not.toHaveBeenCalled();
    expect(result.before.isActive).toBe(true);
    expect(result.after.isActive).toBe(true);
  });

  it('returns referencingListings count for the deactivation confirm flow', async () => {
    findBrandById.mockResolvedValueOnce(brandRow({ isActive: true, _count: { models: 12, listings: 47 } }));
    updateBrand.mockResolvedValueOnce(brandRow({ isActive: false }));
    const result = await setBrandActiveService('b1', false);
    expect(result.referencingListings).toBe(47);
    expect(updateBrand).toHaveBeenCalledWith('b1', { isActive: false });
  });
});

describe('presignBrandLogoService', () => {
  it('rejects logos over 200 KB with 413', async () => {
    findBrandById.mockResolvedValueOnce(brandRow());
    await expect(
      presignBrandLogoService('b1', { contentType: 'image/png', byteSize: 300_000 }),
    ).rejects.toMatchObject({ status: 413 });
  });
});

// ─── Model ───────────────────────────────────────────────────────────────────

const modelRow = (overrides: Partial<repo.ModelRow> = {}): repo.ModelRow => ({
  id: 'm1',
  brandId: 'b1',
  slug: 'camry',
  nameEn: 'Camry',
  nameAr: 'كامري',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  trims: [],
  _count: { listings: 5 },
  ...overrides,
});

describe('createModelService', () => {
  it('throws 404 when brand does not exist', async () => {
    findBrandById.mockResolvedValueOnce(null);
    await expect(
      createModelService({
        brandId: 'missing',
        slug: 'camry',
        nameEn: 'Camry',
        nameAr: 'كامري',
        isActive: true,
      }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it('throws 409 when (brandId, slug) collision', async () => {
    findBrandById.mockResolvedValueOnce(brandRow());
    findModelBySlug.mockResolvedValueOnce({ id: 'other' });
    await expect(
      createModelService({
        brandId: 'b1',
        slug: 'camry',
        nameEn: 'Camry',
        nameAr: 'كامري',
        isActive: true,
      }),
    ).rejects.toMatchObject({ status: 409, code: 'slug_taken' });
  });

  it('allows same slug across different brands', async () => {
    // Slug "sport" can exist under Toyota AND Honda — uniqueness is per-brand.
    findBrandById.mockResolvedValueOnce(brandRow({ id: 'b1' }));
    findModelBySlug.mockResolvedValueOnce(null);
    createModel.mockResolvedValueOnce(modelRow({ slug: 'sport' }));
    const result = await createModelService({
      brandId: 'b1',
      slug: 'sport',
      nameEn: 'Sport',
      nameAr: 'رياضية',
      isActive: true,
    });
    expect(result.after.slug).toBe('sport');
  });
});

// ─── Trim ────────────────────────────────────────────────────────────────────

const trimRow = (overrides: Partial<repo.TrimRow> = {}): repo.TrimRow => ({
  id: 't1',
  modelId: 'm1',
  name: 'LE',
  isActive: true,
  _count: { listings: 3 },
  ...overrides,
});

describe('createTrimService', () => {
  it('throws 409 when (modelId, name) already exists', async () => {
    findModelById.mockResolvedValueOnce(modelRow());
    findTrimByName.mockResolvedValueOnce({ id: 'other' });
    await expect(
      createTrimService({ modelId: 'm1', name: 'LE', isActive: true }),
    ).rejects.toMatchObject({
      status: 409,
      code: 'name_taken',
    });
  });

  it('creates with isActive=true forwarded to the repo', async () => {
    findModelById.mockResolvedValueOnce(modelRow());
    findTrimByName.mockResolvedValueOnce(null);
    createTrim.mockResolvedValueOnce(trimRow());
    const result = await createTrimService({ modelId: 'm1', name: 'LE', isActive: true });
    expect(createTrim).toHaveBeenCalledWith({ modelId: 'm1', name: 'LE', isActive: true });
    expect(result.name).toBe('LE');
    expect(result.listingCount).toBe(3);
  });
});

describe('setTrimActiveService', () => {
  it('returns existing DTO unchanged when already in target state', async () => {
    findTrimById.mockResolvedValueOnce(trimRow({ isActive: false }));
    const result = await setTrimActiveService('t1', false);
    expect(updateTrim).not.toHaveBeenCalled();
    expect(result.isActive).toBe(false);
  });
});

// ─── BodyType ────────────────────────────────────────────────────────────────

const btRow = (overrides: Partial<repo.BodyTypeRow> = {}): repo.BodyTypeRow => ({
  id: 'bt1',
  slug: 'sedan',
  nameEn: 'Sedan',
  nameAr: 'سيدان',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  _count: { listings: 30 },
  ...overrides,
});

describe('setBodyTypeActiveService', () => {
  it('emits the deactivation transition with the listing count', async () => {
    findBodyTypeById.mockResolvedValueOnce(btRow({ isActive: true }));
    updateBodyType.mockResolvedValueOnce(btRow({ isActive: false }));
    const result = await setBodyTypeActiveService('bt1', false);
    expect(result.before.isActive).toBe(true);
    expect(result.after.isActive).toBe(false);
    expect(result.referencingListings).toBe(30);
  });
});
