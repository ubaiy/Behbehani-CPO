#!/usr/bin/env node
/**
 * scripts/generate-rich-media-demo.mjs
 *
 * v1.5.19 — Generate demo rich-media assets for premium-tier listings.
 *
 * Inputs (downloaded once, then cached):
 *   - 6 CC0 Unsplash hero photos (already-referenced URLs from prisma/seed.ts).
 *     Saved under apps/api/src/seed/demo-media/source-photos/ — gitignored
 *     dir, so the downloads don't bloat the repo. Source-of-truth pattern: if
 *     a contributor blows them away, re-running this script re-fetches.
 *   - 1 CC0 Pixabay video #2708 "Car Red Rotate" (downloaded manually once;
 *     committed under spin360/demo-spin360.mp4 since it's our shared 360 asset).
 *
 * Outputs (committed to repo):
 *   - apps/api/src/seed/demo-media/walkaround/{stockNumber}.mp4 (per-listing
 *     personalized Ken-Burns walkaround MP4, ~150 KB each, 6 files total ~1 MB)
 *   - apps/api/src/seed/demo-media/walkaround/{stockNumber}-poster.jpg
 *   - apps/api/src/seed/demo-media/spin360/demo-spin360.mp4 (shared, pre-downloaded)
 *
 * Why per-car walkarounds:
 *   - The v1.5.16 synthetic blue-slide MP4s read as "feature not built yet"
 *   - Customer-facing demos benefit from real car content (per-listing photo
 *     animated with Ken Burns zoom+pan)
 *   - Unsplash photos already in seed.ts are CC0-equivalent (commercial use
 *     OK, no attribution required); zero new copyright exposure
 *
 * Licensing recap:
 *   - Unsplash photos: Unsplash License (free for commercial use, no attribution)
 *   - Pixabay 360 video: Pixabay Content License (same terms)
 *
 * Deps (root devDependencies):
 *   - ffmpeg-static    bundles ffmpeg binary
 *   - sharp            JPEG decode + downscale for source photos
 *
 * Idempotent. Pass --force to regenerate everything. Pass --refetch to redownload
 * source photos even if cached.
 */

import { spawn } from 'node:child_process';
import { mkdir, writeFile, access, stat } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ffmpegPath from 'ffmpeg-static';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');
const OUT_DIR = join(REPO_ROOT, 'apps', 'api', 'src', 'seed', 'demo-media');
const WALKAROUND_DIR = join(OUT_DIR, 'walkaround');
const SPIN_DIR = join(OUT_DIR, 'spin360');
const SOURCE_PHOTOS_DIR = join(OUT_DIR, 'source-photos');

const FORCE = process.argv.includes('--force');
const REFETCH = process.argv.includes('--refetch') || FORCE;

// ─── Premium listings to attach demo media to ──────────────────────────────
// Hero photo IDs are taken from apps/api/prisma/seed.ts — same Unsplash URLs
// already used for the listings' hero gallery images. Re-using means demo
// walkarounds show the EXACT photo customers see on the listing card.
const PREMIUM_LISTINGS = [
  { stockNumber: 'BMC-SEED-0002', label: 'Lexus RX 350',      photoId: 'photo-1606664515524-ed2f786a0bd6' },
  { stockNumber: 'BMC-SEED-0003', label: 'Mercedes C 300',    photoId: 'photo-1617469767053-d3b523a0b982' },
  { stockNumber: 'BMC-SEED-0004', label: 'BMW X5',            photoId: 'photo-1555215695-3004980ad54e' },
  // Patrol's original seed URL (photo-1606664922998-f180baa4ef91) was removed
  // from Unsplash sometime after the v1.3 seed; falls through to 404. Replaced
  // with a stable luxury-SUV photo. seed.ts updated to match in v1.5.19.
  { stockNumber: 'BMC-SEED-0005', label: 'Nissan Patrol',     photoId: 'photo-1485463611174-f302f6a5c1c9' },
  { stockNumber: 'BMC-SEED-0007', label: 'Porsche Cayenne',   photoId: 'photo-1606016159991-dfe4f2746ad5' },
  { stockNumber: 'BMC-SEED-0008', label: 'Audi Q5',           photoId: 'photo-1542362567-b07e54358753' },
];

const UNSPLASH_BASE = 'https://images.unsplash.com';
const SOURCE_PHOTO_RES = 'w=1600&q=85'; // higher res than seed's w=1200 — Ken-Burns crops in
const OUTPUT_VIDEO_SIZE = '1280x720';
const WALKAROUND_DURATION_SEC = 7;
const WALKAROUND_FPS = 25;
const TOTAL_FRAMES = WALKAROUND_DURATION_SEC * WALKAROUND_FPS;

// ─── Helpers ────────────────────────────────────────────────────────────────

async function fileExists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', (d) => { stderr += d.toString(); });
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} failed (exit ${code}):\n${stderr.slice(-800)}`));
    });
    child.on('error', reject);
  });
}

async function downloadFile(url, destPath) {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok || !res.body) {
    throw new Error(`Download failed (${res.status} ${res.statusText}): ${url}`);
  }
  await pipeline(Readable.fromWeb(res.body), createWriteStream(destPath));
  const s = await stat(destPath);
  return s.size;
}

// ─── Generators ──────────────────────────────────────────────────────────────

async function downloadPhoto(listing) {
  const url = `${UNSPLASH_BASE}/${listing.photoId}?${SOURCE_PHOTO_RES}`;
  const destPath = join(SOURCE_PHOTOS_DIR, `${listing.stockNumber}.jpg`);
  if (!REFETCH && (await fileExists(destPath))) {
    console.log(`  [cache] ${listing.stockNumber} (${listing.label})`);
    return destPath;
  }
  console.log(`  [fetch] ${listing.stockNumber} (${listing.label}) ← ${url}`);
  const bytes = await downloadFile(url, destPath);
  console.log(`          → ${Math.round(bytes / 1024)} KB`);
  return destPath;
}

async function generateWalkaround(listing, photoPath) {
  const outPath = join(WALKAROUND_DIR, `${listing.stockNumber}.mp4`);
  const posterPath = join(WALKAROUND_DIR, `${listing.stockNumber}-poster.jpg`);

  if (!FORCE && (await fileExists(outPath)) && (await fileExists(posterPath))) {
    console.log(`  [skip ] ${listing.stockNumber} walkaround (use --force)`);
    return;
  }

  // Poster: a still frame from the photo, scaled to 1280×720, slight crop.
  // sharp would be tidier but ffmpeg can do it natively (one fewer dep call).
  console.log(`  [poster] ${listing.stockNumber}`);
  await run(ffmpegPath, [
    '-y',
    '-i', photoPath,
    '-vf', `scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720`,
    '-q:v', '4',
    posterPath,
  ]);

  // Walkaround: Ken Burns — slow zoom-in (1.0 → 1.5) + gentle leftward pan.
  // zoompan computes a new crop window per output frame.
  console.log(`  [video ] ${listing.stockNumber} Ken Burns ${WALKAROUND_DURATION_SEC}s`);
  const filter = [
    // Pre-scale to a fixed canvas so zoompan math is predictable across photos.
    `scale=3840:2160:force_original_aspect_ratio=increase,crop=3840:2160`,
    // zoompan: zoom from 1.0 to 1.5 over TOTAL_FRAMES; smooth x-pan rightward.
    `zoompan=z='min(zoom+${(0.5 / TOTAL_FRAMES).toFixed(6)},1.5)':` +
      `x='iw/2-(iw/zoom/2)+((iw/zoom)*0.15)*(on/${TOTAL_FRAMES})':` +
      `y='ih/2-(ih/zoom/2)':` +
      `d=${TOTAL_FRAMES}:s=${OUTPUT_VIDEO_SIZE}:fps=${WALKAROUND_FPS}`,
    `format=yuv420p`,
  ].join(',');

  await run(ffmpegPath, [
    '-y',
    '-loop', '1',
    '-i', photoPath,
    '-vf', filter,
    '-t', String(WALKAROUND_DURATION_SEC),
    '-c:v', 'libx264',
    '-preset', 'medium',
    '-crf', '26',
    '-movflags', '+faststart',
    '-pix_fmt', 'yuv420p',
    outPath,
  ]);

  const s = await stat(outPath);
  console.log(`          → ${Math.round(s.size / 1024)} KB`);
}

async function writeReadme() {
  const readmePath = join(OUT_DIR, 'README.md');
  const content = `# Demo Rich Media — v1.5.19

Real CC0-licensed demo content for the listing rich-media feature.

## Files (committed)

### Walk-around videos
- \`walkaround/BMC-SEED-XXXX.mp4\` — per-listing personalized Ken-Burns animation
  built from the listing's own hero photo (the same Unsplash photo customers
  see on the listing card). Six premium listings, ~150 KB each.
- \`walkaround/BMC-SEED-XXXX-poster.jpg\` — video poster (first frame).

### 360° spin
- \`spin360/demo-spin360.mp4\` — Pixabay video #2708 "Car Red Rotate"
  (https://pixabay.com/videos/car-red-rotate-rotating-360-2708/), 2.3 MB,
  medium 1280×720. Shared across all 6 premium listings until per-car
  turntable footage exists.

## Files (NOT committed)

\`source-photos/BMC-SEED-XXXX.jpg\` are downloaded by the generator script as
intermediate inputs and gitignored. Re-running \`scripts/generate-rich-media-demo.mjs\`
re-fetches them as needed.

## Licensing

| Source | License | Commercial OK | Attribution |
|---|---|---|---|
| Unsplash hero photos | Unsplash License | Yes | Not required |
| Pixabay 360 spin video | Pixabay Content License | Yes | Not required |

Both licenses explicitly permit modification, redistribution, and commercial use without attribution. Both are CC0-equivalent.

## Regenerate

\`\`\`bash
# Re-encode videos (uses cached source photos if present)
node scripts/generate-rich-media-demo.mjs --force

# Force re-download source photos too
node scripts/generate-rich-media-demo.mjs --refetch
\`\`\`

## Replacing with real content

Once Behbehani has shot per-car turntable + walkaround footage, the existing
admin Media tab on each listing accepts the uploads (presigned-PUT to S3).
The customer DTO picks \`uploadStatus='complete'\` rows regardless of source,
so swapping demo-out / real-in is a single admin action per listing — no
code change.
`;
  await writeFile(readmePath, content, 'utf8');
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('[v1.5.19] Building demo rich-media assets…');
  console.log('  Output       :', OUT_DIR);
  console.log('  Source photos:', SOURCE_PHOTOS_DIR);
  console.log('  ffmpeg       :', ffmpegPath);
  console.log('  --force      :', FORCE);
  console.log('  --refetch    :', REFETCH);
  console.log('');

  await mkdir(WALKAROUND_DIR, { recursive: true });
  await mkdir(SPIN_DIR, { recursive: true });
  await mkdir(SOURCE_PHOTOS_DIR, { recursive: true });

  // Verify the 360 is in place (downloaded out-of-band; see README).
  const spin360Path = join(SPIN_DIR, 'demo-spin360.mp4');
  if (await fileExists(spin360Path)) {
    const s = await stat(spin360Path);
    console.log(`[ok    ] spin360 present (${Math.round(s.size / 1024)} KB)`);
  } else {
    console.warn(
      `[warn  ] spin360 missing at ${spin360Path}. Run once:\n` +
      `   curl -L -o "${spin360Path}" "https://cdn.pixabay.com/video/2016/04/05/2708-161671387_medium.mp4"`,
    );
  }
  console.log('');

  console.log('[1/3] Downloading source photos…');
  const downloads = await Promise.all(PREMIUM_LISTINGS.map(downloadPhoto));
  console.log('');

  console.log(`[2/3] Generating ${PREMIUM_LISTINGS.length} per-car walkarounds…`);
  for (let i = 0; i < PREMIUM_LISTINGS.length; i++) {
    await generateWalkaround(PREMIUM_LISTINGS[i], downloads[i]);
  }
  console.log('');

  console.log('[3/3] Writing README');
  await writeReadme();

  console.log('');
  console.log('[done] Run `npm run db:seed` to populate listings with the new URLs.');
}

main().catch((err) => {
  console.error('[fail]', err.message);
  process.exit(1);
});
