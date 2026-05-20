// One-shot helper for joint verification: fetch the publicToken for an
// offer by id, so A can complete walks without admin-API auth.
// Usage: node scripts/get-offer-token.cjs <offerId>

const { PrismaClient } = require('@prisma/client');

(async () => {
  const offerId = process.argv[2];
  if (!offerId) {
    console.error('Usage: node scripts/get-offer-token.cjs <offerId>');
    process.exit(1);
  }
  const prisma = new PrismaClient();
  try {
    const offer = await prisma.offer.findUnique({
      where: { id: offerId },
      select: {
        id: true,
        publicToken: true,
        publicTokenExpiresAt: true,
        status: true,
        offerAmountFils: true,
      },
    });
    console.log(JSON.stringify(offer, (_, v) => (typeof v === 'bigint' ? v.toString() : v), 2));
  } finally {
    await prisma.$disconnect();
  }
})();
