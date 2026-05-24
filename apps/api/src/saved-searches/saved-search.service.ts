/**
 * Saved searches — service layer.
 *
 * v1.6 — customer-owned browse-filter presets.
 *
 * All exports marked `// public-shared` are consumed by the thin controller at
 * `apps/api/src/saved-searches/saved-search.controller.ts`.
 *
 * Ownership is enforced on every read/mutate: if the record exists but belongs
 * to a different userId, the service throws SAVED_SEARCH_NOT_FOUND (not 403)
 * to avoid leaking existence of other users' saved searches.
 */

import type {
  CreateSavedSearchInput,
  SavedSearchDto,
  SavedSearchErrorCode,
  SavedSearchListResponse,
  UpdateSavedSearchInput,
} from '@behbehani-cpo/shared-types';
import { prisma } from '../db/prisma';

export class SavedSearchError extends Error {
  constructor(public readonly code: SavedSearchErrorCode, message: string) {
    super(message);
    this.name = 'SavedSearchError';
  }
}

// ─── DTO mapper ─────────────────────────────────────────────────────────────

function toDto(row: {
  id: string;
  userId: string;
  name: string;
  queryPayload: unknown;
  notifyOnMatch: boolean;
  lastNotifiedAt: Date | null;
  matchCountAtCreation: number | null;
  createdAt: Date;
  updatedAt: Date;
}): SavedSearchDto {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    // queryPayload stored as JSONB — cast to validated shape; controller layer
    // may re-validate via Zod if needed.
    queryPayload: row.queryPayload as SavedSearchDto['queryPayload'],
    notifyOnMatch: row.notifyOnMatch,
    lastNotifiedAt: row.lastNotifiedAt?.toISOString() ?? null,
    matchCountAtCreation: row.matchCountAtCreation,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// ─── public-shared ──────────────────────────────────────────────────────────

/**
 * Paginated list of a customer's saved searches, newest-created first.
 */
export async function listSavedSearches(
  userId: string,
  filter: { page: number; pageSize: number },
): Promise<SavedSearchListResponse> {
  const page = Math.max(1, Math.floor(filter.page));
  const pageSize = Math.max(1, Math.min(100, Math.floor(filter.pageSize)));

  const where = { userId };

  const [rows, total] = await Promise.all([
    prisma.savedSearch.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.savedSearch.count({ where }),
  ]);

  return { items: rows.map(toDto), total, page, pageSize };
}

/**
 * Fetch a single saved search by id. Throws SAVED_SEARCH_NOT_FOUND if the
 * record does not exist or belongs to a different user.
 */
export async function getSavedSearch(
  id: string,
  userId: string,
): Promise<SavedSearchDto> {
  const row = await prisma.savedSearch.findFirst({ where: { id, userId } });
  if (!row) {
    throw new SavedSearchError('SAVED_SEARCH_NOT_FOUND', 'Saved search not found');
  }
  return toDto(row);
}

/**
 * Create a new saved search for the customer.
 */
export async function createSavedSearch(
  userId: string,
  input: CreateSavedSearchInput,
): Promise<SavedSearchDto> {
  const row = await prisma.savedSearch.create({
    data: {
      userId,
      name: input.name,
      queryPayload: input.queryPayload,
      notifyOnMatch: input.notifyOnMatch ?? true,
      matchCountAtCreation: input.matchCountAtCreation ?? null,
    },
  });
  return toDto(row);
}

/**
 * Update a saved search. Only the owner can update. All fields are optional —
 * supply only those that should change.
 *
 * @throws SavedSearchError('SAVED_SEARCH_NOT_FOUND') if not found or not owned.
 */
export async function updateSavedSearch(
  id: string,
  userId: string,
  input: UpdateSavedSearchInput,
): Promise<SavedSearchDto> {
  // Ownership check first (avoids leaking existence).
  const existing = await prisma.savedSearch.findFirst({ where: { id, userId } });
  if (!existing) {
    throw new SavedSearchError('SAVED_SEARCH_NOT_FOUND', 'Saved search not found');
  }

  const row = await prisma.savedSearch.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.queryPayload !== undefined && { queryPayload: input.queryPayload }),
      ...(input.notifyOnMatch !== undefined && { notifyOnMatch: input.notifyOnMatch }),
      // Allow explicit null to clear the count (matchCountAtCreation: null resets the diff).
      ...('matchCountAtCreation' in input && {
        matchCountAtCreation: input.matchCountAtCreation ?? null,
      }),
    },
  });
  return toDto(row);
}

/**
 * Delete a saved search. Ownership-checked. Idempotent-ish: if the record
 * doesn't exist or belongs to another user, throws SAVED_SEARCH_NOT_FOUND.
 */
export async function deleteSavedSearch(
  id: string,
  userId: string,
): Promise<void> {
  const existing = await prisma.savedSearch.findFirst({ where: { id, userId } });
  if (!existing) {
    throw new SavedSearchError('SAVED_SEARCH_NOT_FOUND', 'Saved search not found');
  }
  await prisma.savedSearch.delete({ where: { id } });
}

// ─── HTTP-mapping helper ────────────────────────────────────────────────────

export function mapSavedSearchErrorToHttp(
  err: SavedSearchError,
): { status: number; body: { code: SavedSearchErrorCode; error: string } } {
  const statusByCode: Record<SavedSearchErrorCode, number> = {
    SAVED_SEARCH_NOT_FOUND: 404,
  };
  return {
    status: statusByCode[err.code],
    body: { code: err.code, error: err.message },
  };
}
