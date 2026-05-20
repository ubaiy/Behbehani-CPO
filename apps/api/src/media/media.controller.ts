import { Router } from 'express';
import {
  PhotoPresignRequestSchema,
  PhotoConfirmRequestSchema,
  PhotoUpdateRequestSchema,
  PhotoReorderRequestSchema,
  Media360PresignRequestSchema,
  Media360ConfirmRequestSchema,
  VideoPresignRequestSchema,
  VideoConfirmRequestSchema,
} from '@behbehani-cpo/shared-types';
import { requireAuth, requireAdminRole } from '../middleware/auth';
import {
  MEDIA_VIEW_ROLES as MEDIA_ROLES,
  MEDIA_MANAGE_ROLES,
} from '../auth/role-groups';
import { auditMutation, recordAudit } from '../middleware/audit';
import { validateBody } from '../middleware/validate';
import { MediaError } from './media.errors';
import {
  listPhotos,
  presignPhoto,
  confirmPhotoUpload,
  updatePhotoMeta,
  removePhoto,
  reorderPhotoList,
  setPrimaryPhoto,
  getMedia360,
  presignMedia360,
  confirmMedia360Upload,
  removeMedia360,
  getVideo,
  presignVideo,
  confirmVideoUpload,
  removeVideo,
} from './media.service';

// Router is mounted at /v1/admin/listings — routes use /:listingId/media prefix
export const mediaRouter = Router({ mergeParams: true });

mediaRouter.use(requireAuth);
mediaRouter.use(auditMutation('admin.media'));

// ─── Photos ──────────────────────────────────────────────────────────────────

mediaRouter.get(
  '/:listingId/media/photos',
  requireAdminRole(...MEDIA_ROLES),
  async (req, res, next) => {
    try {
      const photos = await listPhotos(req.params.listingId);
      res.json(photos);
    } catch (err) {
      next(err);
    }
  },
);

mediaRouter.post(
  '/:listingId/media/photos/presign',
  requireAdminRole(...MEDIA_ROLES),
  validateBody(PhotoPresignRequestSchema),
  async (req, res, next) => {
    try {
      const result = await presignPhoto(req.params.listingId, req.body, req.user!.sub);
      await recordAudit({
        actorId: req.user!.sub,
        action: 'media.photo.reserve',
        resource: 'admin.media',
        resourceId: result.photoId,
        after: { listingId: req.params.listingId, s3Key: result.s3Key },
        ip: req.ip ?? null,
        userAgent: req.get('user-agent') ?? null,
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

mediaRouter.post(
  '/:listingId/media/photos/reorder',
  requireAdminRole(...MEDIA_ROLES),
  validateBody(PhotoReorderRequestSchema),
  async (req, res, next) => {
    try {
      await reorderPhotoList(req.params.listingId, req.body);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);

mediaRouter.post(
  '/:listingId/media/photos/:photoId/confirm',
  requireAdminRole(...MEDIA_ROLES),
  validateBody(PhotoConfirmRequestSchema),
  async (req, res, next) => {
    try {
      const photo = await confirmPhotoUpload(req.params.listingId, req.params.photoId, req.body);
      await recordAudit({
        actorId: req.user!.sub,
        action: 'media.photo.confirm',
        resource: 'admin.media',
        resourceId: photo.id,
        after: { listingId: req.params.listingId, uploadStatus: photo.uploadStatus },
        ip: req.ip ?? null,
        userAgent: req.get('user-agent') ?? null,
      });
      res.json(photo);
    } catch (err) {
      next(err);
    }
  },
);

mediaRouter.patch(
  '/:listingId/media/photos/:photoId',
  requireAdminRole(...MEDIA_ROLES),
  validateBody(PhotoUpdateRequestSchema),
  async (req, res, next) => {
    try {
      const photo = await updatePhotoMeta(req.params.listingId, req.params.photoId, req.body);
      res.json(photo);
    } catch (err) {
      next(err);
    }
  },
);

mediaRouter.post(
  '/:listingId/media/photos/:photoId/primary',
  requireAdminRole(...MEDIA_MANAGE_ROLES),
  async (req, res, next) => {
    try {
      const photo = await setPrimaryPhoto(req.params.listingId, req.params.photoId);
      await recordAudit({
        actorId: req.user!.sub,
        action: 'media.photo.set_primary',
        resource: 'admin.media',
        resourceId: photo.id,
        after: { listingId: req.params.listingId, isHero: true },
        ip: req.ip ?? null,
        userAgent: req.get('user-agent') ?? null,
      });
      res.json(photo);
    } catch (err) {
      next(err);
    }
  },
);

mediaRouter.delete(
  '/:listingId/media/photos/:photoId',
  requireAdminRole(...MEDIA_MANAGE_ROLES),
  async (req, res, next) => {
    try {
      await removePhoto(req.params.listingId, req.params.photoId);
      await recordAudit({
        actorId: req.user!.sub,
        action: 'media.photo.delete',
        resource: 'admin.media',
        resourceId: req.params.photoId,
        after: { listingId: req.params.listingId },
        ip: req.ip ?? null,
        userAgent: req.get('user-agent') ?? null,
      });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);

// ─── 360° ─────────────────────────────────────────────────────────────────────

mediaRouter.get(
  '/:listingId/media/media-360',
  requireAdminRole(...MEDIA_ROLES),
  async (req, res, next) => {
    try {
      const result = await getMedia360(req.params.listingId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

mediaRouter.post(
  '/:listingId/media/media-360/presign',
  requireAdminRole(...MEDIA_ROLES),
  validateBody(Media360PresignRequestSchema),
  async (req, res, next) => {
    try {
      const result = await presignMedia360(req.params.listingId, req.body, req.user!.sub);
      await recordAudit({
        actorId: req.user!.sub,
        action: 'media.360.reserve',
        resource: 'admin.media',
        resourceId: result.media360Id,
        after: { listingId: req.params.listingId, s3Key: result.s3Key },
        ip: req.ip ?? null,
        userAgent: req.get('user-agent') ?? null,
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

mediaRouter.post(
  '/:listingId/media/media-360/:media360Id/confirm',
  requireAdminRole(...MEDIA_ROLES),
  validateBody(Media360ConfirmRequestSchema),
  async (req, res, next) => {
    try {
      const result = await confirmMedia360Upload(
        req.params.listingId,
        req.params.media360Id,
        req.body,
      );
      await recordAudit({
        actorId: req.user!.sub,
        action: 'media.360.confirm',
        resource: 'admin.media',
        resourceId: result.id,
        after: { listingId: req.params.listingId, uploadStatus: result.uploadStatus },
        ip: req.ip ?? null,
        userAgent: req.get('user-agent') ?? null,
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

mediaRouter.delete(
  '/:listingId/media/media-360/:media360Id',
  requireAdminRole(...MEDIA_MANAGE_ROLES),
  async (req, res, next) => {
    try {
      await removeMedia360(req.params.listingId, req.params.media360Id);
      await recordAudit({
        actorId: req.user!.sub,
        action: 'media.360.delete',
        resource: 'admin.media',
        resourceId: req.params.media360Id,
        after: { listingId: req.params.listingId },
        ip: req.ip ?? null,
        userAgent: req.get('user-agent') ?? null,
      });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);

// ─── Video ───────────────────────────────────────────────────────────────────

mediaRouter.get(
  '/:listingId/media/video',
  requireAdminRole(...MEDIA_ROLES),
  async (req, res, next) => {
    try {
      const result = await getVideo(req.params.listingId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

mediaRouter.post(
  '/:listingId/media/video/presign',
  requireAdminRole(...MEDIA_ROLES),
  validateBody(VideoPresignRequestSchema),
  async (req, res, next) => {
    try {
      const result = await presignVideo(req.params.listingId, req.body, req.user!.sub);
      await recordAudit({
        actorId: req.user!.sub,
        action: 'media.video.reserve',
        resource: 'admin.media',
        resourceId: result.videoId,
        after: { listingId: req.params.listingId, s3Key: result.s3Key },
        ip: req.ip ?? null,
        userAgent: req.get('user-agent') ?? null,
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

mediaRouter.post(
  '/:listingId/media/video/:videoId/confirm',
  requireAdminRole(...MEDIA_ROLES),
  validateBody(VideoConfirmRequestSchema),
  async (req, res, next) => {
    try {
      const result = await confirmVideoUpload(req.params.listingId, req.params.videoId, req.body);
      await recordAudit({
        actorId: req.user!.sub,
        action: 'media.video.confirm',
        resource: 'admin.media',
        resourceId: result.id,
        after: { listingId: req.params.listingId, uploadStatus: result.uploadStatus },
        ip: req.ip ?? null,
        userAgent: req.get('user-agent') ?? null,
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

mediaRouter.delete(
  '/:listingId/media/video/:videoId',
  requireAdminRole(...MEDIA_MANAGE_ROLES),
  async (req, res, next) => {
    try {
      await removeVideo(req.params.listingId, req.params.videoId);
      await recordAudit({
        actorId: req.user!.sub,
        action: 'media.video.delete',
        resource: 'admin.media',
        resourceId: req.params.videoId,
        after: { listingId: req.params.listingId },
        ip: req.ip ?? null,
        userAgent: req.get('user-agent') ?? null,
      });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);

// ─── Error adapter ───────────────────────────────────────────────────────────

mediaRouter.use(
  (
    err: unknown,
    _req: import('express').Request,
    res: import('express').Response,
    next: import('express').NextFunction,
  ) => {
    if (err instanceof MediaError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    next(err);
  },
);
