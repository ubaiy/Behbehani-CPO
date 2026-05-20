import type {
  PricingTierDto,
  PricingTierListResponse,
  PricingTierCreate,
  PricingTierUpdate,
  PricingPreviewRequest,
  PricingPreviewResponse,
  ListingStage,
} from '@behbehani-cpo/shared-types';
import {
  createTier,
  findQualifyingListings,
  findTierById,
  findTierByName,
  findUserFullName,
  listTiers,
  softDeleteTier,
  updateTier,
  type PricingTierRow,
} from './pricing.repo';
import { PricingError } from './pricing.errors';

const DAY_MS = 1000 * 60 * 60 * 24;

// ─── DTO shaping ──────────────────────────────────────────────────────────

async function toDto(row: PricingTierRow): Promise<PricingTierDto> {
  const updatedByName = row.updatedById ? await findUserFullName(row.updatedById) : null;
  return {
    id: row.id,
    name: row.name,
    daysThresholdMin: row.daysThresholdMin,
    discountBps: row.discountBps,
    stagesAffected: row.stagesAffected as ListingStage[],
    autoApply: row.autoApply,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    updatedById: row.updatedById ?? null,
    updatedByName,
  };
}

// ─── Service functions ────────────────────────────────────────────────────

export async function listPricingTiers(): Promise<PricingTierListResponse> {
  const rows = await listTiers();
  const items = await Promise.all(rows.map(toDto));
  return { items, total: items.length };
}

export async function getPricingTier(id: string): Promise<PricingTierDto> {
  const row = await findTierById(id);
  if (!row) throw new PricingError(404, 'Pricing tier not found');
  return toDto(row);
}

export async function createPricingTier(dto: PricingTierCreate, actorId: string): Promise<PricingTierDto> {
  const existing = await findTierByName(dto.name);
  if (existing) throw new PricingError(409, 'A pricing tier with this name already exists');

  const row = await createTier({
    name: dto.name,
    daysThresholdMin: dto.daysThresholdMin,
    discountBps: dto.discountBps,
    stagesAffected: dto.stagesAffected,
    autoApply: dto.autoApply,
    updatedById: actorId,
  });
  return toDto(row);
}

export async function updatePricingTier(
  id: string,
  dto: PricingTierUpdate,
  actorId: string,
): Promise<{ before: PricingTierDto; after: PricingTierDto }> {
  const existing = await findTierById(id);
  if (!existing) throw new PricingError(404, 'Pricing tier not found');

  if (dto.name && dto.name !== existing.name) {
    const conflict = await findTierByName(dto.name);
    if (conflict && conflict.id !== id) {
      throw new PricingError(409, 'A pricing tier with this name already exists');
    }
  }

  const before = await toDto(existing);

  const updated = await updateTier(id, {
    name: dto.name,
    daysThresholdMin: dto.daysThresholdMin,
    discountBps: dto.discountBps,
    stagesAffected: dto.stagesAffected,
    autoApply: dto.autoApply,
    updatedById: actorId,
  });

  const after = await toDto(updated);
  return { before, after };
}

export async function deletePricingTier(
  id: string,
  actorId: string,
): Promise<PricingTierDto> {
  const row = await findTierById(id);
  if (!row) throw new PricingError(404, 'Pricing tier not found');
  const snapshot = await toDto(row);
  await softDeleteTier(id, actorId);
  return snapshot;
}

export async function previewPricingImpact(dto: PricingPreviewRequest): Promise<PricingPreviewResponse> {
  const thresholdDate = new Date(Date.now() - dto.daysThresholdMin * DAY_MS);

  const rows = await findQualifyingListings(dto.stagesAffected as ListingStage[], thresholdDate);

  const absBps = BigInt(Math.abs(dto.discountBps));
  let totalReduction = BigInt(0);
  for (const row of rows) {
    totalReduction += (row.priceFils * absBps) / BigInt(10000);
  }

  const sampleListingIds = rows.slice(0, 5).map((r) => r.id);

  return {
    qualifyingListings: rows.length,
    totalReductionFils: totalReduction.toString(),
    sampleListingIds,
  };
}
