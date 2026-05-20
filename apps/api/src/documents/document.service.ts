import type {
  DocumentDetailResponseDto,
  DocumentListQueryDto,
  DocumentListResponseDto,
  DocumentSummaryDto,
} from '@behbehani-cpo/shared-types';
import { prisma } from '../db/prisma';
import { env } from '../config/env';
import { generateSignedDocumentUrl } from '../storage/signed-document-url';

export type DocumentErrorCode = 'DOCUMENT_NOT_FOUND';

export class DocumentError extends Error {
  constructor(public readonly code: DocumentErrorCode, message: string) {
    super(message);
    this.name = 'DocumentError';
  }
}

/** Project a Prisma Document row into the DTO shape. thumbnailUrl is CDN-prefixed. */
export function toSummary(row: {
  id: string;
  kind: 'inspection_report' | 'sale_contract' | 'insurance_policy' | 'warranty' | 'invoice' | 'other';
  title: string;
  thumbnailKey: string | null;
  fileSizeBytes: number;
  mimeType: string;
  listingId: string | null;
  orderId: string | null;
  inspectionId: string | null;
  uploadedAt: Date;
}): DocumentSummaryDto {
  return {
    id:            row.id,
    kind:          row.kind,
    title:         row.title,
    thumbnailUrl:  row.thumbnailKey
      ? `${env.CDN_BASE_URL}${row.thumbnailKey}`
      : null,
    fileSizeBytes: row.fileSizeBytes,
    mimeType:      row.mimeType,
    listingId:     row.listingId,
    orderId:       row.orderId,
    inspectionId:  row.inspectionId,
    uploadedAt:    row.uploadedAt.toISOString(),
  };
}

export async function listDocuments(
  customerId: string,
  query: DocumentListQueryDto,
): Promise<DocumentListResponseDto> {
  const where = {
    customerId,
    ...(query.kind ? { kind: query.kind } : {}),
  };
  const [total, rows] = await prisma.$transaction([
    prisma.document.count({ where }),
    prisma.document.findMany({
      where,
      orderBy: { uploadedAt: 'desc' },
      take:    query.pageSize,
      skip:    (query.page - 1) * query.pageSize,
    }),
  ]);
  return {
    items:    rows.map(toSummary),
    total,
    page:     query.page,
    pageSize: query.pageSize,
  };
}

export async function getDocumentById(
  customerId: string,
  documentId: string,
): Promise<DocumentDetailResponseDto> {
  const row = await prisma.document.findFirst({
    where: { id: documentId, customerId },
  });
  if (!row) {
    throw new DocumentError('DOCUMENT_NOT_FOUND', 'Document not found');
  }
  const TTL_SEC = 15 * 60; // 15 minutes per S3_CONVENTIONS.md Tier 2 policy
  const { url: downloadUrl, expiresAt } = await generateSignedDocumentUrl(
    row.fileKey,
    TTL_SEC,
  );
  return {
    document:    toSummary(row),
    downloadUrl,
    expiresAt,
  };
}
