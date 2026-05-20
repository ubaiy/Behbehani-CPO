import { z } from 'zod';

/** v1.4.2 §3 — customer document vault DTOs. */

export const DocumentKindSchema = z.enum([
  'inspection_report',
  'sale_contract',
  'insurance_policy',
  'warranty',
  'invoice',
  'other',
]);
export type DocumentKind = z.infer<typeof DocumentKindSchema>;

/** Listing item shape — minimal fields for the /me/documents grid. */
export const DocumentSummarySchema = z.object({
  id:            z.string().uuid(),
  kind:          DocumentKindSchema,
  title:         z.string(),
  thumbnailUrl:  z.string().url().nullable(),
  fileSizeBytes: z.number().int().nonnegative(),
  mimeType:      z.string(),
  listingId:     z.string().uuid().nullable(),
  orderId:       z.string().uuid().nullable(),
  inspectionId:  z.string().uuid().nullable(),
  uploadedAt:    z.string(), // ISO-8601
});
export type DocumentSummaryDto = z.infer<typeof DocumentSummarySchema>;

export const DocumentListQuerySchema = z.object({
  kind:     DocumentKindSchema.optional(),
  page:     z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});
export type DocumentListQueryDto = z.infer<typeof DocumentListQuerySchema>;

export const DocumentListResponseSchema = z.object({
  items:    z.array(DocumentSummarySchema),
  total:    z.number().int().nonnegative(),
  page:     z.number().int().min(1),
  pageSize: z.number().int().min(1),
});
export type DocumentListResponseDto = z.infer<typeof DocumentListResponseSchema>;

/** Detail response includes a fresh signed download URL (15-min TTL per spec). */
export const DocumentDetailResponseSchema = z.object({
  document:    DocumentSummarySchema,
  downloadUrl: z.string().url(), // 15-min signed S3 URL
  expiresAt:   z.string(),        // ISO-8601 when the URL expires
});
export type DocumentDetailResponseDto = z.infer<typeof DocumentDetailResponseSchema>;

export const DOCUMENT_ERROR_CODES = [
  'DOCUMENT_NOT_FOUND',
] as const;
export type DocumentErrorCode = (typeof DOCUMENT_ERROR_CODES)[number];
