import { Router } from 'express';
import { DocumentListQuerySchema } from '@behbehani-cpo/shared-types';
import { requireCustomerSession } from '../auth/require-customer-session';
import { DocumentError, getDocumentById, listDocuments } from './document.service';

export const documentRouter = Router();

documentRouter.use(requireCustomerSession);

/**
 * GET /v1/public/me/documents?kind=&page=&pageSize=
 * Paginated, filterable list of documents owned by the caller.
 *
 * Per CONCIERGE_INSPECTION_API_CONTRACT.md v1.4.2 §2.
 */
documentRouter.get('/me/documents', async (req, res, next) => {
  try {
    const query = DocumentListQuerySchema.parse(req.query);
    const result = await listDocuments(req.customer!.id, query);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /v1/public/me/documents/:id
 * Detail response includes a fresh 15-minute signed download URL.
 *
 * Returns 404 DOCUMENT_NOT_FOUND if the document doesn't exist OR doesn't
 * belong to the caller (single shape avoids leaking existence of another
 * customer's documents).
 */
documentRouter.get('/me/documents/:id', async (req, res, next) => {
  try {
    const result = await getDocumentById(req.customer!.id, req.params.id);
    res.json(result);
  } catch (err) {
    if (err instanceof DocumentError) {
      res.status(404).json({ code: err.code, error: err.message });
      return;
    }
    next(err);
  }
});
