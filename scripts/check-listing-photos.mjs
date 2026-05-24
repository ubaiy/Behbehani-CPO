/**
 * Audit script — listing photo health check.
 *
 * Reports:
 *   1. Listings with ZERO photos (orphans) — broken on any public surface.
 *   2. Listings with photos but none flagged isHero=true — heroPhotoUrl will
 *      fall back to photos[0] in the API, but worth knowing for data quality.
 *
 * Run: node scripts/check-listing-photos.mjs
 * Requires DATABASE_URL env var (or .env loaded by the shell).
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // ── 1. Listings with zero photos ──────────────────────────────────────────
  const orphans = await prisma.listing.findMany({
    where: { photos: { none: {} } },
    select: {
      id: true,
      stockNumber: true,
      stage: true,
      titleEn: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  // Aggregate orphans by stage.
  const byStage = {};
  for (const l of orphans) {
    byStage[l.stage] = (byStage[l.stage] ?? 0) + 1;
  }

  console.log('='.repeat(60));
  console.log('LISTING PHOTO HEALTH CHECK');
  console.log('='.repeat(60));
  console.log('');
  console.log('--- Listings with ZERO photos ---');
  console.log(`Total: ${orphans.length}`);
  if (orphans.length > 0) {
    console.log('Breakdown by stage:');
    for (const [stage, count] of Object.entries(byStage)) {
      console.log(`  ${stage.padEnd(20)} ${count}`);
    }
    console.log('');
    console.log('First 20 (newest first):');
    for (const l of orphans.slice(0, 20)) {
      console.log(
        `  [${l.stage.padEnd(15)}] ${l.stockNumber}  ${l.titleEn}  (created ${l.createdAt.toISOString().slice(0, 10)})`,
      );
    }
  }
  console.log('');

  // ── 2. Listings with photos but no hero flagged ────────────────────────────
  const noHero = await prisma.listing.findMany({
    where: {
      AND: [
        { photos: { some: {} } },
        { photos: { none: { isHero: true } } },
      ],
    },
    select: {
      id: true,
      stockNumber: true,
      stage: true,
      titleEn: true,
      _count: { select: { photos: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  console.log('--- Listings with photos but no isHero=true ---');
  console.log(`Total (first 100 shown): ${noHero.length}`);
  if (noHero.length > 0) {
    console.log('');
    for (const l of noHero) {
      console.log(
        `  [${l.stage.padEnd(15)}] ${l.stockNumber}  photos=${l._count.photos}  ${l.titleEn}`,
      );
    }
  }
  console.log('');
  console.log('='.repeat(60));
  console.log('SUMMARY');
  console.log(`  Zero-photo listings  : ${orphans.length}`);
  console.log(`  No-hero listings     : ${noHero.length}`);
  console.log(
    `  Status: ${orphans.length === 0 && noHero.length === 0 ? 'CLEAN' : 'ACTION REQUIRED'}`,
  );
  console.log('='.repeat(60));
}

main()
  .catch((err) => {
    console.error('[check-listing-photos] FATAL:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
