#!/usr/bin/env node
/**
 * mockup-diff.mjs — structural fidelity diff between an approved HTML mockup
 * and an Angular component with an inline template.
 *
 * Usage: node scripts/mockup-diff.mjs <mockup-path> <component-path>
 * Exit:  0 = PASS | WARN   1 = FAIL
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── helpers ──────────────────────────────────────────────────────────────────

function die(msg) { console.error(`ERROR: ${msg}`); process.exit(2); }

/** Extract text between <body ...> and </body>, falling back to full content. */
function extractMockupHtml(src) {
  const m = src.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return m ? m[1] : src;
}

/** Extract inline template from Angular component.
 *  Supports:  template: `...`  (backtick literal, handles escaped backticks).
 *  Returns null if templateUrl is used instead. */
function extractAngularTemplate(src) {
  if (/templateUrl\s*:/i.test(src)) return null;

  // Find   template: `   (with possible whitespace/newline between : and `)
  const startIdx = src.search(/template\s*:\s*`/);
  if (startIdx === -1) return null;

  const openTick = src.indexOf('`', startIdx);
  let i = openTick + 1;
  let result = '';
  while (i < src.length) {
    const ch = src[i];
    if (ch === '\\' && src[i + 1] === '`') {
      result += '`';
      i += 2;
    } else if (ch === '`') {
      break;
    } else {
      result += ch;
      i++;
    }
  }
  return result;
}

// ── tag / class parsing ───────────────────────────────────────────────────────

/**
 * Count occurrences of each HTML tag (case-insensitive, ignores self-close /
 * closing tags so we count element instances, not open+close pairs).
 */
function countTags(html) {
  const counts = {};
  const re = /<([a-zA-Z][a-zA-Z0-9-]*)(?:\s|\/?>)/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const tag = m[1].toLowerCase();
    counts[tag] = (counts[tag] ?? 0) + 1;
  }
  return counts;
}

/**
 * Collect every unique CSS class token that appears in class="..." or
 * [class]="..." or class="... {{...}} ..." attributes.
 * Angular binding expressions are stripped; plain tokens collected.
 */
function collectClasses(html) {
  const classes = new Set();
  // Match  class="..."  or  [class]="..."  or  className="..."
  const attrRe = /(?:\[?class(?:Name)?\]?)\s*=\s*["']([^"']*)["']/gi;
  let m;
  while ((m = attrRe.exec(html)) !== null) {
    const raw = m[1]
      .replace(/\{\{[^}]*\}\}/g, '')   // strip {{ expr }}
      .replace(/[{}]/g, ' ');           // strip any remaining braces
    for (const tok of raw.split(/\s+/)) {
      if (tok && !/[=|?:[\]()]/.test(tok)) classes.add(tok);
    }
  }
  return classes;
}

/** Count <svg ...> opening tags. */
function countSvg(html) {
  return (html.match(/<svg[\s>]/gi) ?? []).length;
}

// ── diff logic ────────────────────────────────────────────────────────────────

const P1_TAG_THRESHOLD   = 0.20;  // >20 % delta on any tag → P1
const P2_CLASS_THRESHOLD = 5;     // >5 missing mockup classes → P2

function diffTags(mockupCounts, tplCounts) {
  const allTags = new Set([...Object.keys(mockupCounts), ...Object.keys(tplCounts)]);
  const issues = [];
  for (const tag of allTags) {
    const mc = mockupCounts[tag] ?? 0;
    const tc = tplCounts[tag]   ?? 0;
    if (mc === 0 && tc === 0) continue;
    const ref = Math.max(mc, tc, 1);
    const delta = Math.abs(mc - tc) / ref;
    if (delta > P1_TAG_THRESHOLD) {
      issues.push({ tag, mockup: mc, template: tc, delta: (delta * 100).toFixed(0) });
    }
  }
  issues.sort((a, b) => parseFloat(b.delta) - parseFloat(a.delta));
  return issues;
}

function diffClasses(mockupClasses, tplClasses) {
  const missing = [...mockupClasses].filter(c => !tplClasses.has(c)).sort();
  const extra   = [...tplClasses].filter(c => !mockupClasses.has(c)).sort();
  return { missing, extra };
}

// ── report ────────────────────────────────────────────────────────────────────

function printReport({ mockupPath, componentPath, tagIssues, classDiff, svgMockup, svgTpl }) {
  const hasFail = tagIssues.length > 0;
  const hasWarn = !hasFail && classDiff.missing.length > P2_CLASS_THRESHOLD;
  const headline = hasFail ? 'FAIL' : hasWarn ? 'WARN' : 'PASS';

  console.log('');
  console.log('┌────────────────────────────────────────────────────────┐');
  console.log(`│  mockup-diff  ·  ${headline.padEnd(38)}│`);
  console.log('├────────────────────────────────────────────────────────┤');
  console.log(`│  Mockup   : ${mockupPath.slice(-50).padEnd(42)}│`);
  console.log(`│  Template : ${componentPath.slice(-50).padEnd(42)}│`);
  console.log('└────────────────────────────────────────────────────────┘');

  // Tag diff
  if (tagIssues.length > 0) {
    console.log('\n[P1] Tag-count drift (>20 %)');
    for (const { tag, mockup, template, delta } of tagIssues) {
      console.log(`  <${tag}>  mockup=${mockup}  template=${template}  delta=${delta}%`);
    }
  } else {
    console.log('\n[OK] Tag counts — all within 20 % threshold');
  }

  // SVG
  const svgDelta = Math.abs(svgMockup - svgTpl);
  console.log(`\n[  ] SVG icons — mockup=${svgMockup}  template=${svgTpl}  delta=${svgDelta}`);

  // Class diff
  const p2 = classDiff.missing.length > P2_CLASS_THRESHOLD;
  console.log(`\n[${p2 ? 'P2' : 'OK'}] Missing mockup classes (${classDiff.missing.length})`);
  if (classDiff.missing.length > 0) {
    const top10 = classDiff.missing.slice(0, 10);
    for (const c of top10) console.log(`  - ${c}`);
    if (classDiff.missing.length > 10) console.log(`  … and ${classDiff.missing.length - 10} more`);
  }

  console.log(`\n[  ] Extra template classes (Angular-only, informational): ${classDiff.extra.length}`);

  console.log(`\n━━━  ${headline}  ━━━\n`);
}

// ── main ──────────────────────────────────────────────────────────────────────

const [,, mockupArg, componentArg] = process.argv;
if (!mockupArg || !componentArg) {
  die('Usage: node scripts/mockup-diff.mjs <mockup-path> <component-path>');
}

const root         = resolve(process.cwd());
const mockupPath   = resolve(root, mockupArg);
const componentPath = resolve(root, componentArg);

const mockupSrc    = readFileSync(mockupPath,    'utf8');
const componentSrc = readFileSync(componentPath, 'utf8');

const tplSrc = extractAngularTemplate(componentSrc);
if (tplSrc === null) {
  console.log('NOT SUPPORTED: component uses templateUrl — inline template required.');
  process.exit(2);
}

const mockupHtml = extractMockupHtml(mockupSrc);

const mockupTags  = countTags(mockupHtml);
const tplTags     = countTags(tplSrc);
const mockupClass = collectClasses(mockupHtml);
const tplClass    = collectClasses(tplSrc);
const svgMockup   = countSvg(mockupHtml);
const svgTpl      = countSvg(tplSrc);

const tagIssues  = diffTags(mockupTags, tplTags);
const classDiff  = diffClasses(mockupClass, tplClass);

printReport({ mockupPath: mockupArg, componentPath: componentArg, tagIssues, classDiff, svgMockup, svgTpl });

const hasFail = tagIssues.length > 0;
process.exit(hasFail ? 1 : 0);
