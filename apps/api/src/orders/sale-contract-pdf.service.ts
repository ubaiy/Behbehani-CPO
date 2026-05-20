/**
 * Sale contract PDF generator (Behbehani Certified Pre-Owned).
 *
 * Built with @react-pdf/renderer using React.createElement (no JSX — avoids
 * tsconfig changes in the API workspace).
 *
 * Invoked when an admin advances Order.status to 'completed' — see
 * apps/api/src/orders/admin-order.service.ts updateOrderStatus().
 *
 * Output: Buffer (PDF bytes). Caller uploads to S3 + creates Document row
 * of kind 'sale_contract'.
 *
 * Per CONCIERGE_INSPECTION_API_CONTRACT.md v1.4.2 §5 Day 7.
 *
 * NOTE: pdfkit is used for receipts (programmatic, fast). @react-pdf/renderer
 * is used here for templated/branded contracts — gives us flex/layout
 * primitives + RTL-friendly text rendering for future Arabic translation.
 */
import { createElement as e } from 'react';
import { Document, Page, StyleSheet, Text, View, pdf } from '@react-pdf/renderer';
import { prisma } from '../db/prisma';

// Inline styles. Single StyleSheet so all sections compose consistently.
const styles = StyleSheet.create({
  page:           { padding: 40, fontSize: 10, fontFamily: 'Helvetica', lineHeight: 1.4, color: '#111' },
  header:         { borderBottomWidth: 2, borderBottomColor: '#1E3A8A', paddingBottom: 8, marginBottom: 16 },
  companyName:    { fontSize: 18, fontWeight: 'bold', color: '#1E3A8A' },
  docTitle:       { fontSize: 14, marginTop: 4, color: '#374151' },
  meta:           { fontSize: 8, color: '#6B7280', marginTop: 4 },
  sectionTitle:   { fontSize: 12, fontWeight: 'bold', marginTop: 12, marginBottom: 6, color: '#1E3A8A' },
  row:            { flexDirection: 'row', marginBottom: 2 },
  label:          { width: 140, fontWeight: 'bold', color: '#374151' },
  value:          { flex: 1 },
  clauseHeading:  { fontWeight: 'bold', marginTop: 8 },
  clauseBody:     { marginBottom: 4 },
  signatureBlock: { flexDirection: 'row', marginTop: 32, gap: 40 },
  signaturePane:  { flex: 1, borderTopWidth: 1, borderTopColor: '#374151', paddingTop: 6 },
  signatureLabel: { fontSize: 9, color: '#6B7280' },
  footer:         { position: 'absolute', bottom: 24, left: 40, right: 40, textAlign: 'center', fontSize: 8, color: '#9CA3AF' },
});

interface ContractInput {
  orderId: string;
}

/**
 * Generate the sale contract PDF for a completed order.
 */
export async function generateSaleContractPdf(input: ContractInput): Promise<Buffer> {
  const order = await prisma.order.findUnique({
    where: { id: input.orderId },
    include: {
      customer: { select: { id: true, fullName: true, email: true, mobile: true } },
      listing:  { select: { id: true, stockNumber: true, year: true, makeId: true, modelId: true, vin: true } },
      payments: { where: { status: 'succeeded' }, orderBy: { paidAt: 'desc' } },
    },
  });
  if (!order) throw new Error(`generateSaleContractPdf: order not found: ${input.orderId}`);

  const totalKwd      = (Number(order.totalAmountFils) / 1000).toFixed(3);
  const paidKwd       = (Number(order.paidAmountFils)  / 1000).toFixed(3);
  const completedISO  = (order.completedAt ?? new Date()).toISOString();
  const completedDate = (order.completedAt ?? new Date()).toISOString().slice(0, 10);

  // Build the element tree using React.createElement only — no JSX.
  const docEl = e(
    Document, null,
    e(
      Page, { size: 'A4', style: styles.page },

      // Header
      e(
        View, { style: styles.header },
        e(Text, { style: styles.companyName }, 'Behbehani Certified Pre-Owned'),
        e(Text, { style: styles.docTitle },    'Vehicle Sale Agreement'),
        e(Text, { style: styles.meta },        `Order ${order.id} · Generated ${completedISO}`),
      ),

      // Parties
      e(Text, { style: styles.sectionTitle }, 'Parties'),
      e(View, { style: styles.row }, e(Text, { style: styles.label }, 'Seller:'), e(Text, { style: styles.value }, 'Mohammad Behbehani Motors Co. K.S.C.C. (Behbehani Certified Pre-Owned)')),
      e(View, { style: styles.row }, e(Text, { style: styles.label }, 'Buyer:'),  e(Text, { style: styles.value }, order.customer.fullName)),
      ...(order.customer.email  ? [e(View, { style: styles.row }, e(Text, { style: styles.label }, 'Buyer email:'),  e(Text, { style: styles.value }, order.customer.email))]  : []),
      ...(order.customer.mobile ? [e(View, { style: styles.row }, e(Text, { style: styles.label }, 'Buyer mobile:'), e(Text, { style: styles.value }, order.customer.mobile))] : []),

      // Vehicle
      e(Text, { style: styles.sectionTitle }, 'Vehicle'),
      e(View, { style: styles.row }, e(Text, { style: styles.label }, 'Stock number:'), e(Text, { style: styles.value }, order.stockNumber)),
      e(View, { style: styles.row }, e(Text, { style: styles.label }, 'Year:'),         e(Text, { style: styles.value }, String(order.listing.year))),
      e(View, { style: styles.row }, e(Text, { style: styles.label }, 'VIN:'),          e(Text, { style: styles.value }, order.listing.vin ?? '—')),

      // Financials
      e(Text, { style: styles.sectionTitle }, 'Financials'),
      e(View, { style: styles.row }, e(Text, { style: styles.label }, 'Total price:'),  e(Text, { style: styles.value }, `KWD ${totalKwd}`)),
      e(View, { style: styles.row }, e(Text, { style: styles.label }, 'Total paid:'),   e(Text, { style: styles.value }, `KWD ${paidKwd}`)),
      e(View, { style: styles.row }, e(Text, { style: styles.label }, 'Completed at:'), e(Text, { style: styles.value }, completedDate)),

      // Standard clauses
      e(Text, { style: styles.sectionTitle }, 'Terms'),

      e(Text, { style: styles.clauseHeading }, '1. Sale Condition'),
      e(Text, { style: styles.clauseBody },
        'The vehicle is sold in "as-inspected" condition as documented in the Behbehani CPO inspection report dated on or before the order date. Buyer acknowledges receipt of the inspection report prior to completion of this sale.'),

      e(Text, { style: styles.clauseHeading }, '2. Title Transfer'),
      e(Text, { style: styles.clauseBody },
        'Title transfer is conditional on receipt of full payment as confirmed in the Financials section above and on completion of any applicable Government registration / Ministry of Interior traffic department processes.'),

      e(Text, { style: styles.clauseHeading }, '3. Returns Window'),
      e(Text, { style: styles.clauseBody },
        'Buyer is entitled to a 3-day / 300-kilometre return window from the delivery date, in accordance with Behbehani Motors customer protection policy.'),

      e(Text, { style: styles.clauseHeading }, '4. Warranty'),
      e(Text, { style: styles.clauseBody },
        'Vehicles sold under the Certified Pre-Owned programme carry the warranty package as detailed in the Behbehani CPO warranty schedule, where applicable. Vehicles outside the CPO programme are sold without express warranty unless otherwise stated.'),

      e(Text, { style: styles.clauseHeading }, '5. Governing Law'),
      e(Text, { style: styles.clauseBody },
        'This agreement is governed by the laws of the State of Kuwait. Any dispute arising from this agreement shall be subject to the exclusive jurisdiction of the Kuwait courts.'),

      // Signature blocks
      e(View, { style: styles.signatureBlock },
        e(View, { style: styles.signaturePane },
          e(Text, null, ''),  // spacer; signature image lands here in v2
          e(Text, { style: styles.signatureLabel }, 'Buyer signature'),
          e(Text, { style: styles.signatureLabel }, order.customer.fullName)),
        e(View, { style: styles.signaturePane },
          e(Text, null, ''),
          e(Text, { style: styles.signatureLabel }, 'Behbehani CPO authorised representative')),
      ),

      // Footer (fixed: renders on every page)
      e(Text, { style: styles.footer, fixed: true },
        'Behbehani Certified Pre-Owned · Mohammad Behbehani Motors Co. K.S.C.C. · Kuwait'),
    ),
  );

  // pdf() accepts a React element describing a Document. The cast is needed
  // because @react-pdf/renderer's generic is strict about its element shape
  // when using createElement rather than JSX. At runtime the shape is correct.
  const instance = pdf(docEl as Parameters<typeof pdf>[0]);

  // toBuffer() returns a Node Buffer at runtime; the declared return type may
  // be Blob | Stream depending on the package version installed, hence the
  // `as unknown as Buffer` cast. If tsc rejects this in a future version,
  // replace with the stream-to-buffer pattern (collect chunks via .on('data')).
  const buffer = await instance.toBuffer() as unknown as Buffer;
  return buffer;
}
