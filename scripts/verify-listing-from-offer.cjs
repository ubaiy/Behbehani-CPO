// One-shot helper for joint verification: confirm a draft Listing was created
// from an accepted offer, with the right cost + acquisitionSource metadata.
// Usage: node scripts/verify-listing-from-offer.cjs <offerId>

const { PrismaClient } = require('@prisma/client');

(async () => {
  const offerId = process.argv[2];
  if (!offerId) {
    console.error('Usage: node scripts/verify-listing-from-offer.cjs <offerId>');
    process.exit(1);
  }
  const prisma = new PrismaClient();
  try {
    const offer = await prisma.offer.findUnique({
      where: { id: offerId },
      select: {
        id: true,
        status: true,
        respondedAt: true,
        inspectionId: true,
      },
    });
    if (!offer) {
      console.log(JSON.stringify({ found: false, offerId }));
      return;
    }
    const inspection = await prisma.inspectionReport.findUnique({
      where: { id: offer.inspectionId },
      select: { id: true, bookingRef: true, listingId: true, customerId: true },
    });
    let listing = null;
    if (inspection?.listingId) {
      listing = await prisma.listing.findUnique({
        where: { id: inspection.listingId },
        select: {
          id: true,
          stockNumber: true,
          stage: true,
          costFils: true,
          acquisitionSourceJson: true,
          createdAt: true,
        },
      });
    }
    console.log(
      JSON.stringify(
        { offer, inspection, listing },
        (_, v) => (typeof v === 'bigint' ? v.toString() : v),
        2,
      ),
    );
  } finally {
    await prisma.$disconnect();
  }
})();
