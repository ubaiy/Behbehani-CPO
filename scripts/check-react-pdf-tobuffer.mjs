/**
 * Runtime verification of @react-pdf/renderer toBuffer() return shape.
 *
 * Task #38 — runtime probe + proposed-fix validation.
 *
 * Findings (first run):
 *   - toBuffer() returns a Readable stream (PDFDocument from pdfkit), NOT a Buffer.
 *   - Buffer.isBuffer(result) === false
 *   - result instanceof Readable === true
 *   - result.length === undefined
 *
 * Implication:
 *   apps/api/src/orders/sale-contract-pdf.service.ts:147 has `as unknown as Buffer` cast.
 *   apps/api/src/orders/admin-order.service.ts:198 reads `contractBytes.length` → undefined.
 *   Document row gets NULL fileSizeBytes.
 *
 * Fix (validated in this script): collect the stream into a Buffer via for-await.
 */

import { Document, Page, Text, pdf } from '@react-pdf/renderer';
import { createElement as e } from 'react';
import { promises as fs } from 'node:fs';
import { Readable } from 'node:stream';
import path from 'node:path';

const OUT = path.join(process.cwd(), 'scripts', 'check-react-pdf-tobuffer.output.pdf');

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

async function main() {
  console.log('[check-react-pdf-tobuffer] starting…');

  const docEl = e(Document, null,
    e(Page, { size: 'A4' },
      e(Text, null, 'Hello from @react-pdf/renderer — task #38 runtime probe'),
    ),
  );

  const instance = pdf(docEl);
  const raw = await instance.toBuffer();

  console.log('--- raw toBuffer() return ---');
  console.log('typeof                   :', typeof raw);
  console.log('constructor.name         :', raw?.constructor?.name);
  console.log('Buffer.isBuffer(raw)     :', Buffer.isBuffer(raw));
  console.log('raw instanceof Readable  :', raw instanceof Readable);
  console.log('raw.length               :', raw?.length);
  console.log('raw.byteLength           :', raw?.byteLength);

  // Proposed fix: collect into a Buffer
  const buffer = await streamToBuffer(raw);

  console.log('--- after streamToBuffer() ---');
  console.log('typeof                   :', typeof buffer);
  console.log('constructor.name         :', buffer?.constructor?.name);
  console.log('Buffer.isBuffer(buffer)  :', Buffer.isBuffer(buffer));
  console.log('buffer.length            :', buffer?.length, '← used as fileSizeBytes');

  await fs.writeFile(OUT, buffer);
  const stat = await fs.stat(OUT);
  console.log(`✓ fs.writeFile() wrote ${stat.size} bytes to ${OUT}`);
  console.log('  (buffer.length === stat.size:', buffer.length === stat.size, ')');

  console.log('---');
  console.log('VERDICT:');
  console.log('  - toBuffer() return is a Readable stream — cast at line 147 is INCORRECT at runtime.');
  console.log('  - sale-contract-pdf.service.ts must collect the stream before returning Buffer.');
  console.log('  - Once fixed, admin-order.service.ts:198 contractBytes.length will be a real number.');
  console.log('[check-react-pdf-tobuffer] done.');
}

main().catch((err) => {
  console.error('[check-react-pdf-tobuffer] FATAL:', err);
  process.exit(1);
});
