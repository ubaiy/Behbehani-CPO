import type { RequestHandler } from 'express';
import { ZodError, type ZodTypeAny } from 'zod';

/**
 * Validate request body against a Zod schema. Mutates req.body to the parsed/transformed shape.
 */
export function validateBody<S extends ZodTypeAny>(schema: S): RequestHandler {
  return (req, res, next) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        res.status(400).json({
          error: 'validation_failed',
          issues: err.issues.map((i) => ({ path: i.path, message: i.message, code: i.code })),
        });
        return;
      }
      next(err);
    }
  };
}
