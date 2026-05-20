#!/usr/bin/env node
/**
 * One-off i18n parity check for apps/mobile locales — Task G1 verification.
 * Equivalent to the inline `node -e` parity script in G1's verification block.
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const I18N = join(ROOT, 'apps', 'mobile', 'src', 'i18n', 'locales');

function keys(o, p = '') {
  return Object.entries(o).flatMap(([k, v]) =>
    typeof v === 'object' && v !== null ? keys(v, p + k + '.') : [p + k],
  );
}

const en = JSON.parse(readFileSync(join(I18N, 'en.json'), 'utf8'));
const ar = JSON.parse(readFileSync(join(I18N, 'ar.json'), 'utf8'));

const eks = keys(en).sort();
const aks = keys(ar).sort();
const missing = eks.filter((k) => !aks.includes(k));
const extra = aks.filter((k) => !eks.includes(k));

console.log(
  'EN:', eks.length,
  'AR:', aks.length,
  'Missing:', missing.length,
  'Extra:', extra.length,
);

if (missing.length || extra.length) {
  console.log('MISSING:', missing);
  console.log('EXTRA:', extra);
  process.exit(1);
}
