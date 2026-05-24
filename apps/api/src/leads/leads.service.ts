/**
 * Leads service — v1.5.25.
 *
 * Public surface:
 *   createLeadFromPublic() — anonymous VDP / callback lead capture
 *
 * Admin surface:
 *   listLeadsAdmin()        — paginated list with status counts
 *   getLeadByIdAdmin()      — single lead detail
 *   updateLeadStatusAdmin() — status + notes update (state machine enforced)
 *   assignLeadAdmin()       — assign to a staff user
 *
 * State machine:
 *   new → contacted → qualified → converted | dropped
 *   new → dropped (direct)
 *   contacted → dropped
 */

import type {
  CreateLeadPublicInput,
  LeadDto,
  LeadListFilter,
  LeadListResponse,
  LeadStatus,
  LeadStatusCounts,
  UpdateLeadInput,
  AssignLeadInput,
} from '@behbehani-cpo/shared-types';
import { LeadError } from './leads.errors';
import * as repo from './leads.repo';
import type { LeadRow } from './leads.repo';

// ─── DTO mapper ──────────────────────────────────────────────────────────────

function toDto(row: LeadRow): LeadDto {
  return {
    id:             row.id,
    listing:        row.listing
      ? { id: row.listing.id, stockNumber: row.listing.stockNumber, titleEn: row.listing.titleEn }
      : null,
    customerName:   row.customerName,
    customerPhone:  row.customerPhone,
    customerEmail:  row.customerEmail,
    message:        row.message,
    source:         row.source,
    status:         row.status as LeadStatus,
    notes:          row.notes,
    assignedTo:     row.assignedTo
      ? { id: row.assignedTo.id, fullName: row.assignedTo.fullName, email: row.assignedTo.email }
      : null,
    contactedAt:    row.contactedAt?.toISOString() ?? null,
    resolvedAt:     row.resolvedAt?.toISOString() ?? null,
    idempotencyKey: row.idempotencyKey,
    createdAt:      row.createdAt.toISOString(),
    updatedAt:      row.updatedAt.toISOString(),
  };
}

// ─── State machine ───────────────────────────────────────────────────────────

const VALID_TRANSITIONS: Record<LeadStatus, LeadStatus[]> = {
  new:       ['contacted', 'dropped'],
  contacted: ['qualified', 'dropped'],
  qualified: ['converted', 'dropped'],
  converted: [],
  dropped:   [],
};

// ─── Status counts helper ────────────────────────────────────────────────────

async function buildStatusCounts(): Promise<LeadStatusCounts> {
  const rows = await repo.groupCountByStatus();
  const counts: LeadStatusCounts = {
    new: 0, contacted: 0, qualified: 0, converted: 0, dropped: 0,
  };
  for (const r of rows) {
    if (r.status in counts) {
      (counts as Record<string, number>)[r.status] = r.count;
    }
  }
  return counts;
}

// ─── Public surface ──────────────────────────────────────────────────────────

export async function createLeadFromPublic(
  input: CreateLeadPublicInput,
  meta: { idempotencyKey: string; ipAddress: string | null; userAgent: string | null },
): Promise<LeadDto> {
  // Idempotency check: if a lead already exists with this key, return it
  const existing = await repo.findLeadByIdempotencyKey(meta.idempotencyKey);
  if (existing) {
    return toDto(existing);
  }

  const row = await repo.createLead({
    listingId:     input.listingId ?? null,
    customerName:  input.customerName,
    customerPhone: input.customerPhone,
    customerEmail: input.customerEmail ?? null,
    message:       input.message ?? null,
    source:        input.source,
    status:        'new',
    idempotencyKey: meta.idempotencyKey,
    ipAddress:     meta.ipAddress,
    userAgent:     meta.userAgent,
  });
  return toDto(row);
}

// ─── Admin surface ───────────────────────────────────────────────────────────

export async function listLeadsAdmin(filter: LeadListFilter): Promise<LeadListResponse> {
  const [{ rows, total }, statusCounts] = await Promise.all([
    repo.listLeads(filter),
    buildStatusCounts(),
  ]);
  return {
    items:        rows.map(toDto),
    total,
    page:         filter.page,
    pageSize:     filter.pageSize,
    statusCounts,
  };
}

export async function getLeadByIdAdmin(id: string): Promise<LeadDto> {
  const row = await repo.findLeadById(id);
  if (!row) {
    throw new LeadError(404, 'Lead not found', 'LEAD_NOT_FOUND');
  }
  return toDto(row);
}

export async function updateLeadStatusAdmin(
  id: string,
  input: UpdateLeadInput,
  _actorId: string,
): Promise<LeadDto> {
  const row = await repo.findLeadById(id);
  if (!row) {
    throw new LeadError(404, 'Lead not found', 'LEAD_NOT_FOUND');
  }

  const updateData: Record<string, unknown> = {};

  if (input.status !== undefined) {
    const currentStatus = row.status as LeadStatus;
    const allowed = VALID_TRANSITIONS[currentStatus];
    if (!allowed.includes(input.status)) {
      throw new LeadError(
        409,
        `Cannot transition from "${currentStatus}" to "${input.status}"`,
        'LEAD_INVALID_STATUS_TRANSITION',
      );
    }
    updateData['status'] = input.status;

    // Set timestamps on relevant transitions
    if (input.status === 'contacted') {
      updateData['contactedAt'] = new Date();
    }
    if (input.status === 'converted' || input.status === 'dropped') {
      updateData['resolvedAt'] = new Date();
    }
  }

  if (input.notes !== undefined) {
    updateData['notes'] = input.notes;
  }

  const updated = await repo.updateLead(id, updateData);
  return toDto(updated);
}

export async function assignLeadAdmin(
  id: string,
  input: AssignLeadInput,
  _actorId: string,
): Promise<LeadDto> {
  const [row, assignee] = await Promise.all([
    repo.findLeadById(id),
    repo.findAdminUserById(input.userId),
  ]);

  if (!row) {
    throw new LeadError(404, 'Lead not found', 'LEAD_NOT_FOUND');
  }
  if (!assignee) {
    throw new LeadError(404, 'Assignee admin user not found', 'LEAD_ASSIGNEE_NOT_FOUND');
  }

  const updated = await repo.updateLead(id, { assignedToId: input.userId });
  return toDto(updated);
}
