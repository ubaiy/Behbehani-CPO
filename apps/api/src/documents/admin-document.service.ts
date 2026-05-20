import type {
  AdminDocumentFinalizeDto,
  AdminDocumentListQueryDto,
  AdminDocumentListResponseDto,
  AdminDocumentUploadUrlRequestDto,
  AdminDocumentUploadUrlResponseDto,
} from '@behbehani-cpo/shared-types';
import { randomUUID } from 'node:crypto';
import { prisma } from '../db/prisma';
import { presignPutUrl } from '../lib/s3';
import { toSummary } from './document.service';

export class AdminDocumentError extends Error {
  constructor(
    public readonly code: 'CUSTOMER_NOT_FOUND',
    message: string,
  ) {
    super(message);
    this.name = 'AdminDocumentError';
  }
}

/**
 * Issue a pre-signed S3 PUT URL for the admin to upload a document to.
 * Allocates a fresh fileKey under `documents/{documentId}/file.{ext}`.
 *
 * Spec: CONCIERGE_INSPECTION_API_CONTRACT.md v1.4.4 §4.
 */
export async function issueAdminUploadUrl(
  input: AdminDocumentUploadUrlRequestDto,
): Promise<AdminDocumentUploadUrlResponseDto> {
  const customer = await prisma.user.findUnique({
    where: { id: input.customerId },
    select: { id: true },
  });
  if (!customer) {
    throw new AdminDocumentError('CUSTOMER_NOT_FOUND', 'Customer not found');
  }

  const documentId = randomUUID();
  const ext = mimeToExt(input.mimeType);
  const fileKey = `documents/${documentId}/file${ext}`;

  const presign = await presignPutUrl(fileKey, input.mimeType, input.fileSizeBytes);

  return {
    fileKey,
    uploadUrl: presign.url,
    expiresAt: presign.expiresAt.toISOString(),
  };
}

/**
 * Finalize an admin upload: create the Document row pointing to the S3 object
 * the admin just PUT. The `uploadedById` is the admin's JWT sub.
 *
 * Spec: CONCIERGE_INSPECTION_API_CONTRACT.md v1.4.4 §4.
 */
export async function finalizeAdminUpload(
  uploadedById: string,
  input: AdminDocumentFinalizeDto,
): Promise<{ id: string }> {
  const customer = await prisma.user.findUnique({
    where: { id: input.customerId },
    select: { id: true },
  });
  if (!customer) {
    throw new AdminDocumentError('CUSTOMER_NOT_FOUND', 'Customer not found');
  }

  const row = await prisma.document.create({
    data: {
      customerId:    input.customerId,
      kind:          input.kind,
      title:         input.title,
      fileKey:       input.fileKey,
      thumbnailKey:  null, // TODO v1.4.x: thumbnail generation
      mimeType:      input.mimeType,
      fileSizeBytes: input.fileSizeBytes,
      listingId:     input.listingId ?? null,
      orderId:       input.orderId ?? null,
      inspectionId:  input.inspectionId ?? null,
      uploadedById,
    },
    select: { id: true },
  });

  return { id: row.id };
}

/**
 * Admin paginated list of one customer's documents.
 *
 * Spec: CONCIERGE_INSPECTION_API_CONTRACT.md v1.4.4 §4.
 */
export async function listCustomerDocuments(
  customerId: string,
  query: AdminDocumentListQueryDto,
): Promise<AdminDocumentListResponseDto> {
  const customer = await prisma.user.findUnique({
    where: { id: customerId },
    select: { id: true },
  });
  if (!customer) {
    throw new AdminDocumentError('CUSTOMER_NOT_FOUND', 'Customer not found');
  }

  const where = {
    customerId,
    ...(query.kind ? { kind: query.kind } : {}),
  };

  const [total, rows] = await prisma.$transaction([
    prisma.document.count({ where }),
    prisma.document.findMany({
      where,
      orderBy: { uploadedAt: 'desc' },
      take: query.pageSize,
      skip: (query.page - 1) * query.pageSize,
    }),
  ]);

  return {
    items:    rows.map(toSummary),
    total,
    page:     query.page,
    pageSize: query.pageSize,
  };
}

function mimeToExt(mime: string): string {
  switch (mime) {
    case 'application/pdf':    return '.pdf';
    case 'image/jpeg':         return '.jpg';
    case 'image/png':          return '.png';
    case 'image/heic':         return '.heic';
    case 'application/msword': return '.doc';
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return '.docx';
    default:
      return '';
  }
}
