import { z } from 'zod';
import { DocumentKindSchema, DocumentSummarySchema } from './document.public.schemas.js';

/** v1.4.4 §4 — admin Document upload + list. */

// Upload URL request (admin tells server about the file they're about to upload).
export const AdminDocumentUploadUrlRequestSchema = z.object({
  customerId:    z.string().uuid(),
  kind:          DocumentKindSchema,
  mimeType:      z.string().min(1).max(80),
  fileSizeBytes: z.number().int().positive().max(50 * 1024 * 1024), // 50 MB hard cap
  title:         z.string().min(1).max(200),
});
export type AdminDocumentUploadUrlRequestDto = z.infer<typeof AdminDocumentUploadUrlRequestSchema>;

export const AdminDocumentUploadUrlResponseSchema = z.object({
  fileKey:   z.string(),
  uploadUrl: z.string().url(), // signed PUT URL, 15-min TTL
  expiresAt: z.string(),
});
export type AdminDocumentUploadUrlResponseDto = z.infer<typeof AdminDocumentUploadUrlResponseSchema>;

// Finalize: after admin PUTs file to uploadUrl, post metadata to create the Document row.
export const AdminDocumentFinalizeSchema = z.object({
  fileKey:       z.string().min(1).max(500),
  customerId:    z.string().uuid(),
  kind:          DocumentKindSchema,
  title:         z.string().min(1).max(200),
  mimeType:      z.string().min(1).max(80),
  fileSizeBytes: z.number().int().positive(),
  listingId:     z.string().uuid().optional(),
  orderId:       z.string().uuid().optional(),
  inspectionId:  z.string().uuid().optional(),
});
export type AdminDocumentFinalizeDto = z.infer<typeof AdminDocumentFinalizeSchema>;

// Admin paginated list of one customer's documents (reuses customer-side DocumentSummary shape).
export const AdminDocumentListQuerySchema = z.object({
  kind:     DocumentKindSchema.optional(),
  page:     z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});
export type AdminDocumentListQueryDto = z.infer<typeof AdminDocumentListQuerySchema>;

export const AdminDocumentListResponseSchema = z.object({
  items:    z.array(DocumentSummarySchema),
  total:    z.number().int().nonnegative(),
  page:     z.number().int().min(1),
  pageSize: z.number().int().min(1),
});
export type AdminDocumentListResponseDto = z.infer<typeof AdminDocumentListResponseSchema>;

export const ADMIN_DOCUMENT_ERROR_CODES = [
  'CUSTOMER_NOT_FOUND',
  'FILE_TOO_LARGE',
  'INVALID_MIME_TYPE',
] as const;
export type AdminDocumentErrorCode = (typeof ADMIN_DOCUMENT_ERROR_CODES)[number];
