import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Application } from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { authRouter } from './auth/auth.controller';
import { authPublicRouter } from './auth/auth-public.controller';
import { catalogRouter } from './catalog/catalog.controller';
import { catalogAdminRouter } from './catalog/catalog-admin.controller';
import { catalogPublicRouter } from './catalog/catalog-public.controller';
import { adminListingsRouter } from './listings/listings.controller';
import { listingsPublicRouter } from './listings/listings-public.controller';
import { mediaRouter } from './media/media.controller';
import { pricingRouter } from './pricing/pricing.controller';
import { agingRouter } from './aging/aging.controller';
import { adminUsersRouter } from './admin-users/admin-users.controller';
import { auditLogRouter } from './audit-log/audit-log.controller';
import { dashboardRouter } from './dashboard/dashboard.controller';
import { adminInspectionsRouter } from './inspections/inspections.controller';
import { inspectionsPublicRouter } from './inspections/inspections-public.controller';
import { meInspectionsRouter } from './inspections/me-inspections.controller';
import { adminOffersRouter } from './offers/offers.controller';
import { offersPublicRouter } from './offers/offers-public.controller';
import { savedListingsPublicRouter } from './saved-listings/saved-listings-public.controller';
import { meAccountRouter } from './me-account/me-account.controller';
import { featureWaitlistRouter } from './feature-waitlists/feature-waitlist.controller';
import { pushTokenRouter } from './push-tokens/push-token.controller';
import { documentRouter } from './documents/document.controller';
import { adminDocumentRouter } from './documents/admin-document.controller';
import { orderRouter, ottoWebhookRouter } from './orders/order.controller';
import { adminOrderRouter } from './orders/admin-order.controller';
import { corsOrigins, env } from './config/env';
import { errorHandler } from './middleware/error';
import { generalLimiter } from './middleware/rate-limit';

export function createApp(): Application {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy: env.NODE_ENV === 'production' ? undefined : false,
    }),
  );
  app.use(
    cors({
      origin: corsOrigins.length > 0 ? corsOrigins : true,
      credentials: true,
    }),
  );
  app.use(compression());
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use(pinoHttp({ autoLogging: env.NODE_ENV !== 'test' }));
  app.use(generalLimiter);

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
  });

  app.use('/v1', authRouter);
  app.use('/v1/auth', authPublicRouter);
  app.use('/v1/public/listings', listingsPublicRouter);
  app.use('/v1/public/catalog', catalogPublicRouter);
  // Public Concierge inspection + signing endpoints (owned by session A — see
  // CONCIERGE_INSPECTION_API_CONTRACT.md v0.7). Thin pass-throughs over the
  // public-shared exports of inspections.service.ts.
  app.use('/v1/public', inspectionsPublicRouter);
  app.use('/v1/public', meInspectionsRouter);
  // Public Concierge offer endpoints (Phase 4, v1.0 §4). Thin pass-through
  // over offers.service.ts public-shared exports.
  app.use('/v1/public', offersPublicRouter);
  app.use('/v1/public', savedListingsPublicRouter);
  app.use('/v1/public', meAccountRouter);
  app.use('/v1/public', featureWaitlistRouter);
  app.use('/v1/public', pushTokenRouter);
  app.use('/v1/public', documentRouter);
  app.use('/v1/public', orderRouter);
  app.use('/v1/public', ottoWebhookRouter);
  app.use('/v1/catalog', catalogRouter);
  app.use('/v1/admin/catalog', catalogAdminRouter);
  app.use('/v1/admin/listings', adminListingsRouter);
  app.use('/v1/admin/listings', mediaRouter);
  app.use('/v1/admin/pricing-tiers', pricingRouter);
  app.use('/v1/admin/aging', agingRouter);
  app.use('/v1/admin/users', adminUsersRouter);
  app.use('/v1/admin/audit-log', auditLogRouter);
  app.use('/v1/admin/dashboard', dashboardRouter);
  app.use('/v1/admin/inspections', adminInspectionsRouter);
  // Offers: the main resource + the nested creation route
  // POST /v1/admin/inspections/:id/offer is handled by adminOffersRouter
  // (mounted under /v1/admin/inspections so the sub-path resolves correctly).
  app.use('/v1/admin/offers', adminOffersRouter);
  app.use('/v1/admin/inspections', adminOffersRouter);
  app.use('/v1/admin', adminDocumentRouter);
  app.use('/v1/admin', adminOrderRouter);

  app.use(errorHandler);
  return app;
}
