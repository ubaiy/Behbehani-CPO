#!/usr/bin/env node
/**
 * guard-i18n-parity.mjs
 * Fails when EN and AR i18n JSON files have asymmetric key sets.
 * Only compares leaf-key presence, not values.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
const I18N = join(ROOT, 'apps', 'web', 'public', 'assets', 'i18n');

function leafKeys(obj, prefix = '') {
  const keys = [];
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      keys.push(...leafKeys(v, path));
    } else {
      keys.push(path);
    }
  }
  return keys;
}

let enJson, arJson;
try {
  enJson = JSON.parse(readFileSync(join(I18N, 'en.json'), 'utf8'));
} catch (e) { console.error('Cannot read en.json:', e.message); process.exit(1); }
try {
  arJson = JSON.parse(readFileSync(join(I18N, 'ar.json'), 'utf8'));
} catch (e) { console.error('Cannot read ar.json:', e.message); process.exit(1); }

const enKeys = new Set(leafKeys(enJson));
const arKeys = new Set(leafKeys(arJson));

let violations = 0;

for (const k of enKeys) {
  if (!arKeys.has(k)) {
    console.error(`I18N-PARITY  missing in AR: ${k}`);
    violations++;
  }
}
for (const k of arKeys) {
  if (!enKeys.has(k)) {
    console.error(`I18N-PARITY  missing in EN: ${k}`);
    violations++;
  }
}

if (violations > 0) {
  console.error(`\n✖  i18n-parity: ${violations} key(s) out of sync between en.json and ar.json`);
  process.exit(1);
} else {
  console.log('✔  i18n-parity: EN and AR key sets are in sync');
}
