/**
 * Generate a receipt PDF for a paid order.
 *
 * Output: Buffer (PDF bytes). Caller uploads to S3 + creates Document row.
 *
 * Per CONCIERGE_INSPECTION_API_CONTRACT.md v1.4.2 §5 Day 6 + V1_4_ROADMAP §3.
 * Uses pdfkit (lightweight, no Chrome dep). Templated content; production
 * branding polish can land in v1.4.x.
 */
import PDFDocument from 'pdfkit';
import { prisma } from '../db/prisma';

interface ReceiptInput {
  orderId: string;
  ottoTransactionId?: string; // from Payment.providerRef.ottoTransactionId once Otto wires
}

export async function generateReceiptPdf(input: ReceiptInput): Promise<Buffer> {
  // Load all the data needed for the receipt in one query.
  const order = await prisma.order.findUnique({
    where: { id: input.orderId },
    include: {
      customer: { select: { id: true, fullName: true, email: true, mobile: true } },
      listing:  { select: { id: true, stockNumber: true, year: true, makeId: true, modelId: true, vin: true } },
      payments: { where: { status: 'succeeded' }, orderBy: { paidAt: 'desc' } },
    },
  });
  if (!order) throw new Error(`generateReceiptPdf: order not found: ${input.orderId}`);

  // Resolve make + model display strings (denormalised in Listing may not have names).
  // For now, use the raw IDs — production polish reads from Make/Model tables.

  return await new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    doc.on('data', (c) => chunks.push(c));
    doc.on('end',  ()  => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // ── Header ──
    doc.fontSize(20).font('Helvetica-Bold').text('Behbehani Certified Pre-Owned', { align: 'left' });
    doc.fontSize(10).font('Helvetica').text('Payment Receipt', { align: 'left' });
    doc.moveDown(0.5);
    doc.fontSize(8).fillColor('#666').text(`Generated ${new Date().toISOString()}`, { align: 'left' });
    doc.fillColor('#000');
    doc.moveDown(1);

    // ── Order block ──
    doc.fontSize(12).font('Helvetica-Bold').text('Order details');
    doc.fontSize(10).font('Helvetica');
    doc.text(`Order ID:       ${order.id}`);
    doc.text(`Stock Number:   ${order.stockNumber}`);
    doc.text(`Vehicle:        ${order.listing.year} (VIN ${order.listing.vin ?? '—'})`);
    doc.text(`Reserved at:    ${order.reservedAt.toISOString()}`);
    doc.text(`Status:         ${order.status}`);
    doc.moveDown(1);

    // ── Customer block ──
    doc.fontSize(12).font('Helvetica-Bold').text('Customer');
    doc.fontSize(10).font('Helvetica');
    doc.text(`Name:    ${order.customer.fullName}`);
    if (order.customer.email)  doc.text(`Email:   ${order.customer.email}`);
    if (order.customer.mobile) doc.text(`Mobile:  ${order.customer.mobile}`);
    doc.moveDown(1);

    // ── Payments block ──
    doc.fontSize(12).font('Helvetica-Bold').text('Payments');
    doc.fontSize(10).font('Helvetica');
    if (order.payments.length === 0) {
      doc.fillColor('#a00').text('No successful payments recorded.');
      doc.fillColor('#000');
    } else {
      for (const p of order.payments) {
        const kwd = (Number(p.amountFils) / 1000).toFixed(3);
        doc.text(`KWD ${kwd}  via ${p.method}  (txn ${p.id})`);
        if (p.paidAt) doc.text(`  paid at ${p.paidAt.toISOString()}`);
        doc.moveDown(0.25);
      }
    }
    doc.moveDown(1);

    // ── Totals ──
    doc.fontSize(12).font('Helvetica-Bold');
    const totalKwd = (Number(order.totalAmountFils) / 1000).toFixed(3);
    const paidKwd  = (Number(order.paidAmountFils)  / 1000).toFixed(3);
    doc.text(`Total Due:    KWD ${totalKwd}`);
    doc.text(`Total Paid:   KWD ${paidKwd}`, { underline: true });
    doc.moveDown(2);

    // ── Footer ──
    doc.fontSize(8).fillColor('#666').text(
      'This receipt is generated electronically. For questions, contact Behbehani Customer Care.',
      { align: 'center' },
    );

    doc.end();
  });
}
