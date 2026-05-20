import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { prisma } from '../db/prisma';

export const catalogRouter = Router();

catalogRouter.use(requireAuth);

catalogRouter.get('/brands', async (_req, res, next) => {
  try {
    const brands = await prisma.brand.findMany({
      where: { isActive: true },
      orderBy: { nameEn: 'asc' },
      select: { id: true, slug: true, nameEn: true, nameAr: true, logoUrl: true },
    });
    res.json({ items: brands });
  } catch (err) {
    next(err);
  }
});

catalogRouter.get('/brands/:brandId/models', async (req, res, next) => {
  try {
    const models = await prisma.model.findMany({
      where: { brandId: req.params.brandId, isActive: true },
      orderBy: { nameEn: 'asc' },
      include: {
        trims: {
          where: { isActive: true },
          orderBy: { name: 'asc' },
          select: { id: true, name: true },
        },
      },
    });
    res.json({
      items: models.map((m) => ({
        id: m.id,
        slug: m.slug,
        nameEn: m.nameEn,
        nameAr: m.nameAr,
        trims: m.trims,
      })),
    });
  } catch (err) {
    next(err);
  }
});

catalogRouter.get('/body-types', async (_req, res, next) => {
  try {
    const bodyTypes = await prisma.bodyType.findMany({
      where: { isActive: true },
      orderBy: { nameEn: 'asc' },
      select: { id: true, slug: true, nameEn: true, nameAr: true },
    });
    res.json({ items: bodyTypes });
  } catch (err) {
    next(err);
  }
});
