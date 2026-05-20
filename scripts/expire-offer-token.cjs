// One-shot helper for joint verification: expire a specific offer's
// publicTokenExpiresAt to the past so A can confirm TOKEN_EXPIRED (410).
// Usage: node scripts/expire-offer-token.cjs <publicToken>
// Removes itself after use is a manual concern; safe to leave in repo.

const { PrismaClient } = require('@prisma/client');

(async () => {
  const token = process.argv[2];
  if (!token) {
    console.error('Usage: node scripts/expire-offer-token.cjs <publicToken>');
    process.exit(1);
  }
  const prisma = new PrismaClient();
  try {
    const result = await prisma.offer.updateMany({
      where: { publicToken: token },
      data: { publicTokenExpiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    });
    console.log(JSON.stringify({ updated: result.count, tokenPrefix: token.slice(0, 16) + '...' }));
  } finally {
    await prisma.$disconnect();
  }
})();
