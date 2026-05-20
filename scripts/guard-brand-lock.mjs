#!/usr/bin/env node
/**
 * guard-brand-lock.mjs
 * Fails if banned off-brand Tailwind colour tokens appear in apps/web features.
 * Scope: apps/web/src/app/features/**\/*.ts
 */
import { readFileSync } from 'fs';
import { globSync } from 'fs';
import { join } from 'path';
import { readdirSync, statSync } from 'fs';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
const FEATURES_DIR = join(ROOT, 'apps', 'web', 'src', 'app', 'features');

const BANNED_PREFIXES = ['bg', 'text', 'border'];
const BANNED_COLOURS = ['amber', 'yellow', 'gold', 'orange', 'emerald', 'green', 'teal', 'cyan', 'sky'];

const BANNED_RE = new RegExp(
  `\\b(${BANNED_PREFIXES.join('|')})-(${BANNED_COLOURS.join('|')})-`,
  'g'
);

function walkTs(dir, results = []) {
  let entries;
  try { entries = readdirSync(dir); } catch { return results; }
  for (const e of entries) {
    const full = join(dir, e);
    const st = statSync(full);
    if (st.isDirectory()) walkTs(full, results);
    else if (e.endsWith('.ts')) results.push(full);
  }
  return results;
}

const files = walkTs(FEATURES_DIR);
let violations = 0;

for (const file of files) {
  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, idx) => {
    const matches = [...line.matchAll(BANNED_RE)];
    for (const m of matches) {
      console.error(`BRAND-LOCK  ${file}:${idx + 1}  →  "${m[0].trimEnd()}"`);
      violations++;
    }
  });
}

if (violations > 0) {
  console.error(`\n✖  brand-lock: ${violations} violation(s). Use Royal Blue (#1E3A8A) palette only.`);
  process.exit(1);
} else {
  console.log('✔  brand-lock: no violations');
}
