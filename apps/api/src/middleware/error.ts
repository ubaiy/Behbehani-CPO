import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { AuthError } from '../auth/auth.service';

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AuthError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  if (err instanceof ZodError) {
    // Validation failure (Zod) — return 422 with the issue list so the client
    // can surface field-level errors. Previously fell through to 500 which
    // masked legit input problems (e.g. pageSize over .max() cap).
    res.status(422).json({
      error: 'validation_error',
      issues: err.issues.map((i) => ({
        path: i.path.join('.'),
        message: i.message,
        code: i.code,
      })),
    });
    return;
  }
  // eslint-disable-next-line no-console
  console.error('[error]', err);
  res.status(500).json({ error: 'internal_server_error' });
};
