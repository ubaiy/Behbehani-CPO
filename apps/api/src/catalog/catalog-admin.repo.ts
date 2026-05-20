import { prisma } from '../db/prisma';
import type { Prisma } from '@prisma/client';

/**
 * Catalog admin repo — raw Prisma access for Brand / Model / Trim / BodyType
 * CRUD. Soft-delete only via `isActive`. The service layer wraps these with
 * validation + DTO mapping + audit emission.
 */

// ─── Common WHERE shaping ────────────────────────────────────────────────────

export type StatusFilter = 'all' | 'active' | 'inactive';

export function statusWhere(filter: StatusFilter | undefined): { isActive?: boolean } {
  if (!filter || filter === 'all') return {};
  return { isActive: filter === 'active' };
}

// ─── Brand ───────────────────────────────────────────────────────────────────

export interface BrandRow {
  id: string;
  slug: string;
  nameEn: string;
  nameAr: string;
  logoUrl: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count: { models: number; listings: number };
}

export async function listBrands(
  filter: { status?: StatusFilter; q?: string; page: number; pageSize: number },
): Promise<{ items: BrandRow[]; total: number }> {
  const where: Prisma.BrandWhereInput = { ...statusWhere(filter.status) };
  if (filter.q && filter.q.length >= 2) {
    where.OR = [
      { nameEn: { contains: filter.q, mode: 'insensitive' } },
      { nameAr: { contains: filter.q, mode: 'insensitive' } },
      { slug: { contains: filter.q, mode: 'insensitive' } },
    ];
  }
  const [items, total] = await prisma.$transaction([
    prisma.brand.findMany({
      where,
      orderBy: { nameEn: 'asc' },
      skip: (filter.page - 1) * filter.pageSize,
      take: filter.pageSize,
      include: { _count: { select: { models: true, listings: true } } },
    }),
    prisma.brand.count({ where }),
  ]);
  return { items, total };
}

export function findBrandById(id: string): Promise<BrandRow | null> {
  return prisma.brand.findUnique({
    where: { id },
    include: { _count: { select: { models: true, listings: true } } },
  });
}

export function findBrandBySlug(slug: string): Promise<{ id: string } | null> {
  return prisma.brand.findUnique({ where: { slug }, select: { id: true } });
}

export function createBrand(data: {
  slug: string;
  nameEn: string;
  nameAr: string;
  logoUrl?: string | null;
  isActive: boolean;
}): Promise<BrandRow> {
  return prisma.brand.create({
    data,
    include: { _count: { select: { models: true, listings: true } } },
  });
}

export function updateBrand(
  id: string,
  data: Partial<{ slug: string; nameEn: string; nameAr: string; logoUrl: string | null; isActive: boolean }>,
): Promise<BrandRow> {
  return prisma.brand.update({
    where: { id },
    data,
    include: { _count: { select: { models: true, listings: true } } },
  });
}

// ─── Model ───────────────────────────────────────────────────────────────────

export interface ModelRow {
  id: string;
  brandId: string;
  slug: string;
  nameEn: string;
  nameAr: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  trims: Array<{ id: string; name: string; isActive: boolean; _count: { listings: number } }>;
  _count: { listings: number };
}

export async function listModelsByBrand(
  brandId: string,
  filter: { status?: StatusFilter; q?: string; page: number; pageSize: number },
): Promise<{ items: ModelRow[]; total: number }> {
  const where: Prisma.ModelWhereInput = { brandId, ...statusWhere(filter.status) };
  if (filter.q && filter.q.length >= 2) {
    where.OR = [
      { nameEn: { contains: filter.q, mode: 'insensitive' } },
      { nameAr: { contains: filter.q, mode: 'insensitive' } },
      { slug: { contains: filter.q, mode: 'insensitive' } },
    ];
  }
  const [items, total] = await prisma.$transaction([
    prisma.model.findMany({
      where,
      orderBy: { nameEn: 'asc' },
      skip: (filter.page - 1) * filter.pageSize,
      take: filter.pageSize,
      include: {
        trims: {
          orderBy: { name: 'asc' },
          include: { _count: { select: { listings: true } } },
        },
        _count: { select: { listings: true } },
      },
    }),
    prisma.model.count({ where }),
  ]);
  return { items, total };
}

export function findModelById(id: string): Promise<ModelRow | null> {
  return prisma.model.findUnique({
    where: { id },
    include: {
      trims: {
        orderBy: { name: 'asc' },
        include: { _count: { select: { listings: true } } },
      },
      _count: { select: { listings: true } },
    },
  });
}

export function findModelBySlug(brandId: string, slug: string): Promise<{ id: string } | null> {
  return prisma.model.findUnique({
    where: { brandId_slug: { brandId, slug } },
    select: { id: true },
  });
}

export function createModel(data: {
  brandId: string;
  slug: string;
  nameEn: string;
  nameAr: string;
  isActive: boolean;
}): Promise<ModelRow> {
  return prisma.model.create({
    data,
    include: {
      trims: {
        orderBy: { name: 'asc' },
        include: { _count: { select: { listings: true } } },
      },
      _count: { select: { listings: true } },
    },
  });
}

export function updateModel(
  id: string,
  data: Partial<{ slug: string; nameEn: string; nameAr: string; isActive: boolean }>,
): Promise<ModelRow> {
  return prisma.model.update({
    where: { id },
    data,
    include: {
      trims: {
        orderBy: { name: 'asc' },
        include: { _count: { select: { listings: true } } },
      },
      _count: { select: { listings: true } },
    },
  });
}

// ─── Trim ────────────────────────────────────────────────────────────────────

export interface TrimRow {
  id: string;
  modelId: string;
  name: string;
  isActive: boolean;
  _count: { listings: number };
}

export function findTrimByName(modelId: string, name: string): Promise<{ id: string } | null> {
  return prisma.trim.findUnique({
    where: { modelId_name: { modelId, name } },
    select: { id: true },
  });
}

export function findTrimById(id: string): Promise<TrimRow | null> {
  return prisma.trim.findUnique({
    where: { id },
    include: { _count: { select: { listings: true } } },
  });
}

export function createTrim(data: { modelId: string; name: string; isActive: boolean }): Promise<TrimRow> {
  return prisma.trim.create({
    data,
    include: { _count: { select: { listings: true } } },
  });
}

export function updateTrim(
  id: string,
  data: Partial<{ name: string; isActive: boolean }>,
): Promise<TrimRow> {
  return prisma.trim.update({
    where: { id },
    data,
    include: { _count: { select: { listings: true } } },
  });
}

// ─── BodyType ────────────────────────────────────────────────────────────────

export interface BodyTypeRow {
  id: string;
  slug: string;
  nameEn: string;
  nameAr: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count: { listings: number };
}

export async function listBodyTypes(
  filter: { status?: StatusFilter; q?: string; page: number; pageSize: number },
): Promise<{ items: BodyTypeRow[]; total: number }> {
  const where: Prisma.BodyTypeWhereInput = { ...statusWhere(filter.status) };
  if (filter.q && filter.q.length >= 2) {
    where.OR = [
      { nameEn: { contains: filter.q, mode: 'insensitive' } },
      { nameAr: { contains: filter.q, mode: 'insensitive' } },
      { slug: { contains: filter.q, mode: 'insensitive' } },
    ];
  }
  const [items, total] = await prisma.$transaction([
    prisma.bodyType.findMany({
      where,
      orderBy: { nameEn: 'asc' },
      skip: (filter.page - 1) * filter.pageSize,
      take: filter.pageSize,
      include: { _count: { select: { listings: true } } },
    }),
    prisma.bodyType.count({ where }),
  ]);
  return { items, total };
}

export function findBodyTypeById(id: string): Promise<BodyTypeRow | null> {
  return prisma.bodyType.findUnique({
    where: { id },
    include: { _count: { select: { listings: true } } },
  });
}

export function findBodyTypeBySlug(slug: string): Promise<{ id: string } | null> {
  return prisma.bodyType.findUnique({ where: { slug }, select: { id: true } });
}

export function createBodyType(data: {
  slug: string;
  nameEn: string;
  nameAr: string;
  isActive: boolean;
}): Promise<BodyTypeRow> {
  return prisma.bodyType.create({
    data,
    include: { _count: { select: { listings: true } } },
  });
}

export function updateBodyType(
  id: string,
  data: Partial<{ slug: string; nameEn: string; nameAr: string; isActive: boolean }>,
): Promise<BodyTypeRow> {
  return prisma.bodyType.update({
    where: { id },
    data,
    include: { _count: { select: { listings: true } } },
  });
}
