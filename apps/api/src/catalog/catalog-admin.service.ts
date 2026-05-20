import { randomUUID } from 'crypto';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import type {
  BrandDto,
  BrandCreate,
  BrandUpdate,
  BrandListResponse,
  BrandLogoPresignRequest,
  BrandLogoPresignResponse,
  ModelDto,
  ModelCreate,
  ModelUpdate,
  ModelListResponse,
  TrimDto,
  TrimCreate,
  TrimUpdate,
  BodyTypeDto,
  BodyTypeCreate,
  BodyTypeUpdate,
  BodyTypeListResponse,
} from '@behbehani-cpo/shared-types';
import { presignPutUrl, publicUrl, s3Client } from '../lib/s3';
import { env } from '../config/env';
import { CatalogError } from './catalog-admin.errors';
import * as repo from './catalog-admin.repo';

// ─── DTO shapers ─────────────────────────────────────────────────────────────

function toBrandDto(row: repo.BrandRow): BrandDto {
  return {
    id: row.id,
    slug: row.slug,
    nameEn: row.nameEn,
    nameAr: row.nameAr,
    logoUrl: row.logoUrl,
    isActive: row.isActive,
    modelCount: row._count.models,
    listingCount: row._count.listings,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toTrimDto(row: repo.TrimRow): TrimDto {
  return {
    id: row.id,
    modelId: row.modelId,
    name: row.name,
    isActive: row.isActive,
    listingCount: row._count.listings,
  };
}

function toModelDto(row: repo.ModelRow): ModelDto {
  return {
    id: row.id,
    brandId: row.brandId,
    slug: row.slug,
    nameEn: row.nameEn,
    nameAr: row.nameAr,
    isActive: row.isActive,
    trims: row.trims.map((t) => ({
      id: t.id,
      modelId: row.id,
      name: t.name,
      isActive: t.isActive,
      listingCount: t._count.listings,
    })),
    listingCount: row._count.listings,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toBodyTypeDto(row: repo.BodyTypeRow): BodyTypeDto {
  return {
    id: row.id,
    slug: row.slug,
    nameEn: row.nameEn,
    nameAr: row.nameAr,
    isActive: row.isActive,
    listingCount: row._count.listings,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// ─── Brand service ───────────────────────────────────────────────────────────

export async function listBrandsService(filter: {
  status?: 'all' | 'active' | 'inactive';
  q?: string;
  page: number;
  pageSize: number;
}): Promise<BrandListResponse> {
  const { items: rows, total } = await repo.listBrands(filter);
  return {
    items: rows.map(toBrandDto),
    total,
    page: filter.page,
    pageSize: filter.pageSize,
  };
}

export async function getBrand(id: string): Promise<BrandDto> {
  const row = await repo.findBrandById(id);
  if (!row) throw new CatalogError(404, 'Brand not found');
  return toBrandDto(row);
}

export async function createBrandService(
  dto: BrandCreate,
): Promise<{ before: null; after: BrandDto }> {
  const existing = await repo.findBrandBySlug(dto.slug);
  if (existing) throw new CatalogError(409, `Slug "${dto.slug}" is already in use`, 'slug_taken');
  const row = await repo.createBrand({
    slug: dto.slug,
    nameEn: dto.nameEn,
    nameAr: dto.nameAr,
    logoUrl: dto.logoUrl ?? null,
    isActive: dto.isActive ?? true,
  });
  return { before: null, after: toBrandDto(row) };
}

export async function updateBrandService(
  id: string,
  dto: BrandUpdate,
): Promise<{ before: BrandDto; after: BrandDto }> {
  const beforeRow = await repo.findBrandById(id);
  if (!beforeRow) throw new CatalogError(404, 'Brand not found');

  if (dto.slug && dto.slug !== beforeRow.slug) {
    const taken = await repo.findBrandBySlug(dto.slug);
    if (taken && taken.id !== id) {
      throw new CatalogError(409, `Slug "${dto.slug}" is already in use`, 'slug_taken');
    }
  }

  const afterRow = await repo.updateBrand(id, dto);
  return { before: toBrandDto(beforeRow), after: toBrandDto(afterRow) };
}

export async function setBrandActiveService(
  id: string,
  isActive: boolean,
): Promise<{ before: BrandDto; after: BrandDto; referencingListings: number }> {
  const beforeRow = await repo.findBrandById(id);
  if (!beforeRow) throw new CatalogError(404, 'Brand not found');
  if (beforeRow.isActive === isActive) {
    // Idempotent — return current state, no audit entry on a no-op.
    return {
      before: toBrandDto(beforeRow),
      after: toBrandDto(beforeRow),
      referencingListings: beforeRow._count.listings,
    };
  }
  const afterRow = await repo.updateBrand(id, { isActive });
  return {
    before: toBrandDto(beforeRow),
    after: toBrandDto(afterRow),
    referencingListings: beforeRow._count.listings,
  };
}

// ─── Brand logo upload (S3 presigned PUT) ────────────────────────────────────

const MAX_LOGO_BYTES = 200 * 1024; // 200 KB

export async function presignBrandLogoService(
  brandId: string,
  dto: BrandLogoPresignRequest,
): Promise<BrandLogoPresignResponse> {
  const brand = await repo.findBrandById(brandId);
  if (!brand) throw new CatalogError(404, 'Brand not found');
  if (dto.byteSize > MAX_LOGO_BYTES) {
    throw new CatalogError(413, `Logo exceeds maximum size of ${MAX_LOGO_BYTES} bytes`);
  }
  const ext = dto.contentType === 'image/svg+xml' ? '.svg' : '.png';
  const key = `brands/${brandId}/logo-${randomUUID()}${ext}`;
  const result = await presignPutUrl(key, dto.contentType, dto.byteSize);
  return {
    uploadUrl: result.url,
    s3Key: key,
    publicUrl: publicUrl(key),
    expiresAt: result.expiresAt.toISOString(),
  };
}

export async function removeBrandLogoService(
  brandId: string,
): Promise<{ before: BrandDto; after: BrandDto }> {
  const beforeRow = await repo.findBrandById(brandId);
  if (!beforeRow) throw new CatalogError(404, 'Brand not found');
  if (!beforeRow.logoUrl) return { before: toBrandDto(beforeRow), after: toBrandDto(beforeRow) };

  const afterRow = await repo.updateBrand(brandId, { logoUrl: null });

  // Best-effort S3 cleanup — derive key from the public URL by stripping the
  // configured public base. If the URL doesn't match (CDN rewrite, custom
  // domain), skip silently — orphaned S3 objects don't break the app.
  try {
    const base = env.S3_PUBLIC_BASE_URL.replace(/\/$/, '');
    if (beforeRow.logoUrl.startsWith(base)) {
      const key = beforeRow.logoUrl.slice(base.length + 1);
      await s3Client().send(new DeleteObjectCommand({ Bucket: env.S3_BUCKET, Key: key }));
    }
  } catch {
    // intentionally swallowed
  }

  return { before: toBrandDto(beforeRow), after: toBrandDto(afterRow) };
}

// ─── Model service ───────────────────────────────────────────────────────────

export async function listModelsByBrandService(
  brandId: string,
  filter: { status?: 'all' | 'active' | 'inactive'; q?: string; page: number; pageSize: number },
): Promise<ModelListResponse & { brand: BrandDto }> {
  const brand = await repo.findBrandById(brandId);
  if (!brand) throw new CatalogError(404, 'Brand not found');
  const { items: rows, total } = await repo.listModelsByBrand(brandId, filter);
  return {
    items: rows.map(toModelDto),
    total,
    page: filter.page,
    pageSize: filter.pageSize,
    brand: toBrandDto(brand),
  };
}

export async function createModelService(
  dto: ModelCreate,
): Promise<{ before: null; after: ModelDto }> {
  const brand = await repo.findBrandById(dto.brandId);
  if (!brand) throw new CatalogError(404, 'Brand not found');
  const existing = await repo.findModelBySlug(dto.brandId, dto.slug);
  if (existing) {
    throw new CatalogError(409, `Slug "${dto.slug}" is already used by another model in this brand`, 'slug_taken');
  }
  const row = await repo.createModel({
    brandId: dto.brandId,
    slug: dto.slug,
    nameEn: dto.nameEn,
    nameAr: dto.nameAr,
    isActive: dto.isActive ?? true,
  });
  return { before: null, after: toModelDto(row) };
}

export async function updateModelService(
  id: string,
  dto: ModelUpdate,
): Promise<{ before: ModelDto; after: ModelDto }> {
  const beforeRow = await repo.findModelById(id);
  if (!beforeRow) throw new CatalogError(404, 'Model not found');

  if (dto.slug && dto.slug !== beforeRow.slug) {
    const taken = await repo.findModelBySlug(beforeRow.brandId, dto.slug);
    if (taken && taken.id !== id) {
      throw new CatalogError(409, `Slug "${dto.slug}" is already used by another model in this brand`, 'slug_taken');
    }
  }

  const afterRow = await repo.updateModel(id, dto);
  return { before: toModelDto(beforeRow), after: toModelDto(afterRow) };
}

export async function setModelActiveService(
  id: string,
  isActive: boolean,
): Promise<{ before: ModelDto; after: ModelDto; referencingListings: number }> {
  const beforeRow = await repo.findModelById(id);
  if (!beforeRow) throw new CatalogError(404, 'Model not found');
  if (beforeRow.isActive === isActive) {
    return {
      before: toModelDto(beforeRow),
      after: toModelDto(beforeRow),
      referencingListings: beforeRow._count.listings,
    };
  }
  const afterRow = await repo.updateModel(id, { isActive });
  return {
    before: toModelDto(beforeRow),
    after: toModelDto(afterRow),
    referencingListings: beforeRow._count.listings,
  };
}

// ─── Trim service ────────────────────────────────────────────────────────────

export async function createTrimService(dto: TrimCreate): Promise<TrimDto> {
  const model = await repo.findModelById(dto.modelId);
  if (!model) throw new CatalogError(404, 'Model not found');
  const existing = await repo.findTrimByName(dto.modelId, dto.name);
  if (existing) {
    throw new CatalogError(409, `Trim "${dto.name}" already exists for this model`, 'name_taken');
  }
  const row = await repo.createTrim({
    modelId: dto.modelId,
    name: dto.name,
    isActive: dto.isActive ?? true,
  });
  return toTrimDto(row);
}

export async function updateTrimService(id: string, dto: TrimUpdate): Promise<TrimDto> {
  const beforeRow = await repo.findTrimById(id);
  if (!beforeRow) throw new CatalogError(404, 'Trim not found');

  if (dto.name && dto.name !== beforeRow.name) {
    const taken = await repo.findTrimByName(beforeRow.modelId, dto.name);
    if (taken && taken.id !== id) {
      throw new CatalogError(409, `Trim "${dto.name}" already exists for this model`, 'name_taken');
    }
  }

  const afterRow = await repo.updateTrim(id, dto);
  return toTrimDto(afterRow);
}

export async function setTrimActiveService(id: string, isActive: boolean): Promise<TrimDto> {
  const beforeRow = await repo.findTrimById(id);
  if (!beforeRow) throw new CatalogError(404, 'Trim not found');
  if (beforeRow.isActive === isActive) return toTrimDto(beforeRow);
  const afterRow = await repo.updateTrim(id, { isActive });
  return toTrimDto(afterRow);
}

// ─── BodyType service ────────────────────────────────────────────────────────

export async function listBodyTypesService(filter: {
  status?: 'all' | 'active' | 'inactive';
  q?: string;
  page: number;
  pageSize: number;
}): Promise<BodyTypeListResponse> {
  const { items: rows, total } = await repo.listBodyTypes(filter);
  return {
    items: rows.map(toBodyTypeDto),
    total,
    page: filter.page,
    pageSize: filter.pageSize,
  };
}

export async function createBodyTypeService(
  dto: BodyTypeCreate,
): Promise<{ before: null; after: BodyTypeDto }> {
  const existing = await repo.findBodyTypeBySlug(dto.slug);
  if (existing) throw new CatalogError(409, `Slug "${dto.slug}" is already in use`, 'slug_taken');
  const row = await repo.createBodyType({
    slug: dto.slug,
    nameEn: dto.nameEn,
    nameAr: dto.nameAr,
    isActive: dto.isActive ?? true,
  });
  return { before: null, after: toBodyTypeDto(row) };
}

export async function updateBodyTypeService(
  id: string,
  dto: BodyTypeUpdate,
): Promise<{ before: BodyTypeDto; after: BodyTypeDto }> {
  const beforeRow = await repo.findBodyTypeById(id);
  if (!beforeRow) throw new CatalogError(404, 'Body type not found');

  if (dto.slug && dto.slug !== beforeRow.slug) {
    const taken = await repo.findBodyTypeBySlug(dto.slug);
    if (taken && taken.id !== id) {
      throw new CatalogError(409, `Slug "${dto.slug}" is already in use`, 'slug_taken');
    }
  }

  const afterRow = await repo.updateBodyType(id, dto);
  return { before: toBodyTypeDto(beforeRow), after: toBodyTypeDto(afterRow) };
}

export async function setBodyTypeActiveService(
  id: string,
  isActive: boolean,
): Promise<{ before: BodyTypeDto; after: BodyTypeDto; referencingListings: number }> {
  const beforeRow = await repo.findBodyTypeById(id);
  if (!beforeRow) throw new CatalogError(404, 'Body type not found');
  if (beforeRow.isActive === isActive) {
    return {
      before: toBodyTypeDto(beforeRow),
      after: toBodyTypeDto(beforeRow),
      referencingListings: beforeRow._count.listings,
    };
  }
  const afterRow = await repo.updateBodyType(id, { isActive });
  return {
    before: toBodyTypeDto(beforeRow),
    after: toBodyTypeDto(afterRow),
    referencingListings: beforeRow._count.listings,
  };
}
