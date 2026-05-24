#!/usr/bin/env node
/**
 * guard-brand-lock-mobile.mjs
 *
 * Mirrors `scripts/guard-brand-lock.mjs` (which enforces brand palette on apps/web
 * Angular components) for the React Native mobile app. The technical surface is
 * different — RN uses hex colors via theme palettes, not Tailwind class strings —
 * so this guard scans for:
 *
 *   1. Hardcoded hex colors that match a curated list of OFF-BRAND palette values
 *      (amber, yellow, gold, orange, emerald, green, teal, cyan, sky family).
 *      Hex codes lifted from Tailwind's reference palettes — anything inside these
 *      ranges should be using `brand[*]`, `slate[*]`, or `red[*]` from
 *      `apps/mobile/src/theme/colors.ts` instead.
 *
 *   2. Bare CSS color names in style values (e.g. `color: 'orange'`, `backgroundColor: "gold"`).
 *
 * The brand palette (Royal Blue brand + slate neutrals + red destructive only) is
 * defined in `apps/mobile/src/theme/colors.ts`. Per CLAUDE.md user-memory
 * `project_admin_design_decisions`: white + Royal Blue (#1E3A8A) + slate neutrals
 * only; NO amber/yellow/gold/emerald/green; red ONLY for destructive.
 *
 * Scope (mobile-only — does NOT touch apps/web, apps/admin, apps/api):
 *   apps/mobile/app/**\/*.{ts,tsx}
 *   apps/mobile/src/**\/*.{ts,tsx}
 *
 * Allowed exceptions (whitelisted by absolute or relative path suffix):
 *   - apps/mobile/src/theme/colors.ts     — the palette source-of-truth
 *   - apps/mobile/ARCHITECTURE.md         — documentation (not scanned anyway)
 *
 * Output format mirrors the web guard for tooling consistency:
 *   BRAND-LOCK  <file>:<line>  →  "<offending-token>"
 *
 * Exit codes:
 *   0  no violations
 *   1  violations found (lists each before exiting)
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
const MOBILE_APP_DIR = join(ROOT, 'apps', 'mobile', 'app');
const MOBILE_SRC_DIR = join(ROOT, 'apps', 'mobile', 'src');

// ─── Whitelist (paths NOT scanned) ───────────────────────────────────────────
const WHITELIST_SUFFIXES = [
  // The brand palette source-of-truth itself defines the canonical hex values.
  // Don't flag its own definitions.
  ['theme', 'colors.ts'].join('/'),
];

// ─── Banned hex colors (off-brand Tailwind palettes) ─────────────────────────
// Sourced from Tailwind v3 reference. Includes the 50/100/200/.../900/950 shades.
// Anyone using one of these has bypassed the brand palette.
const BANNED_HEX = new Set([
  // amber
  '#fffbeb', '#fef3c7', '#fde68a', '#fcd34d', '#fbbf24', '#f59e0b', '#d97706', '#b45309', '#92400e', '#78350f', '#451a03',
  // yellow
  '#fefce8', '#fef9c3', '#fef08a', '#fde047', '#facc15', '#eab308', '#ca8a04', '#a16207', '#854d0e', '#713f12', '#422006',
  // orange
  '#fff7ed', '#ffedd5', '#fed7aa', '#fdba74', '#fb923c', '#f97316', '#ea580c', '#c2410c', '#9a3412', '#7c2d12', '#431407',
  // emerald
  '#ecfdf5', '#d1fae5', '#a7f3d0', '#6ee7b7', '#34d399', '#10b981', '#059669', '#047857', '#065f46', '#064e3b', '#022c22',
  // green
  '#f0fdf4', '#dcfce7', '#bbf7d0', '#86efac', '#4ade80', '#22c55e', '#16a34a', '#15803d', '#166534', '#14532d', '#052e16',
  // teal
  '#f0fdfa', '#ccfbf1', '#99f6e4', '#5eead4', '#2dd4bf', '#14b8a6', '#0d9488', '#0f766e', '#115e59', '#134e4a', '#042f2e',
  // cyan
  '#ecfeff', '#cffafe', '#a5f3fc', '#67e8f9', '#22d3ee', '#06b6d4', '#0891b2', '#0e7490', '#155e75', '#164e63', '#083344',
  // sky
  '#f0f9ff', '#e0f2fe', '#bae6fd', '#7dd3fc', '#38bdf8', '#0ea5e9', '#0284c7', '#0369a1', '#075985', '#0c4a6e', '#082f49',
]);

// ─── Banned CSS color names (bare strings in style values) ───────────────────
const BANNED_COLOR_NAMES = ['amber', 'yellow', 'gold', 'orange', 'emerald', 'green', 'teal', 'cyan', 'sky'];

// Regex: '<color>' or "<color>" appearing as a JS string literal.
// We additionally check the line context to avoid false positives in comments.
const COLOR_NAME_RE = new RegExp(`(['"\`])(${BANNED_COLOR_NAMES.join('|')})\\1`, 'gi');

// Regex: any 6-digit (#FFFFFF) or 8-digit (#FFFFFFFF) hex literal.
// We then test set membership against BANNED_HEX after lower-casing.
const HEX_RE = /#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?/g;

// ─── File walker ─────────────────────────────────────────────────────────────
function walkSource(dir, results = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return results;
  }
  for (const e of entries) {
    const full = join(dir, e);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      walkSource(full, results);
    } else if (e.endsWith('.ts') || e.endsWith('.tsx')) {
      results.push(full);
    }
  }
  return results;
}

function isWhitelisted(file) {
  const normalized = file.replace(/\\/g, '/');
  return WHITELIST_SUFFIXES.some((suffix) => normalized.endsWith(suffix));
}

function isLineCommented(line) {
  const trimmed = line.trimStart();
  return trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*');
}

// ─── Main scan ───────────────────────────────────────────────────────────────
const files = [...walkSource(MOBILE_APP_DIR), ...walkSource(MOBILE_SRC_DIR)];
let violations = 0;

for (const file of files) {
  if (isWhitelisted(file)) continue;
  let content;
  try {
    content = readFileSync(file, 'utf8');
  } catch {
    continue;
  }
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    // Skip pure comment lines — they're documentation, not runtime code.
    if (isLineCommented(line)) return;

    // 1. Hex literal scan.
    const hexMatches = [...line.matchAll(HEX_RE)];
    for (const m of hexMatches) {
      const hexLower = m[0].toLowerCase();
      // Trim to 6-digit form for set lookup (alpha-channel hex still flagged).
      const hex6 = hexLower.slice(0, 7);
      if (BANNED_HEX.has(hex6)) {
        console.error(`BRAND-LOCK  ${file}:${idx + 1}  →  hex "${m[0]}" (off-brand palette)`);
        violations++;
      }
    }

    // 2. Bare color-name string scan.
    const nameMatches = [...line.matchAll(COLOR_NAME_RE)];
    for (const m of nameMatches) {
      // Heuristic: only flag if line context suggests a style value (mentions
      // `color`, `Color`, `background`, `border`, `fill`, `stroke`, etc.).
      // Avoids false-positives on copy strings like "Track your green Tesla".
      if (/\b(color|Color|background|border|fill|stroke|tint|shadow)\b/.test(line)) {
        console.error(`BRAND-LOCK  ${file}:${idx + 1}  →  name "${m[0]}" (use brand/slate/red palette)`);
        violations++;
      }
    }
  });
}

if (violations > 0) {
  console.error(`\n✖  brand-lock-mobile: ${violations} violation(s).`);
  console.error('   Use brand[*], slate[*], or red[*] from apps/mobile/src/theme/colors.ts.');
  console.error('   See CLAUDE.md global rule: white + Royal Blue + slate only; NO amber/yellow/gold/emerald/green; red ONLY for destructive.');
  process.exit(1);
} else {
  console.log(`✔  brand-lock-mobile: no violations across ${files.length} files`);
}
