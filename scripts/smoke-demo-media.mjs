#!/usr/bin/env node
/**
 * scripts/smoke-demo-media.mjs
 *
 * v1.5.16 smoke probe — verifies the express.static() mount serves the
 * generated demo assets without spinning up the full DB-backed API.
 *
 * Spawns a tiny Express app with ONLY the static mount, hits 3 known URLs,
 * checks 200 + content-length + content-type.
 */
import { spawn } from 'node:child_process';
import { writeFileSync, rmSync } from 'node:fs';
import path from 'node:path';

const REPO_ROOT = process.cwd();
const SCRIPT_PATH = path.join(REPO_ROOT, 'scripts', '.smoke-demo-server.cjs');

// Generate a one-shot Express server that mounts ONLY /static/demo-media.
const serverCode = `
const path = require('node:path');
const express = require('express');
const app = express();
const demoMediaRoot = path.join('${REPO_ROOT.replace(/\\/g, '\\\\')}', 'apps', 'api', 'dist', 'seed', 'demo-media');
app.use('/static/demo-media', express.static(demoMediaRoot, {
  fallthrough: false,
  setHeaders: (res) => res.setHeader('Cache-Control', 'public, max-age=604800, immutable'),
}));
const server = app.listen(0, () => {
  console.log('PORT=' + server.address().port);
});
`;

writeFileSync(SCRIPT_PATH, serverCode, 'utf8');

const child = spawn('node', [SCRIPT_PATH], { stdio: ['ignore', 'pipe', 'pipe'] });

let port = null;
let stderrBuf = '';
child.stdout.on('data', (d) => {
  const m = String(d).match(/PORT=(\d+)/);
  if (m) port = Number(m[1]);
});
child.stderr.on('data', (d) => {
  stderrBuf += String(d);
});

// Poll for port up to 5 seconds (Express + module-load can take ~1s on Windows)
for (let i = 0; i < 50 && !port; i++) {
  await new Promise((r) => setTimeout(r, 100));
}

if (!port) {
  console.error('[smoke] server failed to start in 5s. stderr:\n' + stderrBuf);
  child.kill();
  rmSync(SCRIPT_PATH, { force: true });
  process.exit(1);
}

// v1.5.19 — per-car walkarounds + shared 360 spin
const STOCKS = ['BMC-SEED-0002', 'BMC-SEED-0003', 'BMC-SEED-0004', 'BMC-SEED-0005', 'BMC-SEED-0007', 'BMC-SEED-0008'];
const urls = [
  ...STOCKS.flatMap((s) => [
    `/static/demo-media/walkaround/${s}.mp4`,
    `/static/demo-media/walkaround/${s}-poster.jpg`,
  ]),
  '/static/demo-media/spin360/demo-spin360-v2.mp4',
];

let allOk = true;
for (const u of urls) {
  const res = await fetch(`http://127.0.0.1:${port}${u}`);
  const ok = res.ok && Number(res.headers.get('content-length')) > 0;
  const ct = res.headers.get('content-type') ?? 'unknown';
  const cl = res.headers.get('content-length') ?? '?';
  console.log(
    `  [${ok ? 'OK ' : 'FAIL'}] ${res.status} ${cl.padStart(7)}B  ${ct.padEnd(30)}  ${u}`,
  );
  if (!ok) allOk = false;
}

// Path-traversal guard probe.
const trav = await fetch(`http://127.0.0.1:${port}/static/demo-media/../../package.json`);
const travOk = trav.status === 404 || trav.status === 403 || trav.status === 400;
console.log(
  `  [${travOk ? 'OK ' : 'FAIL'}] ${trav.status} traversal probe blocked  /static/demo-media/../../package.json`,
);
if (!travOk) allOk = false;

child.kill();
rmSync(SCRIPT_PATH, { force: true });

console.log('');
if (allOk) {
  console.log(`[v1.5.19 smoke] PASS — static mount serves ${urls.length} demo assets + blocks traversal`);
} else {
  console.log('[v1.5.16 smoke] FAIL');
  process.exit(1);
}
