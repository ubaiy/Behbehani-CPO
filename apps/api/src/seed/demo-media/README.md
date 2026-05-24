# Demo Rich Media — v1.5.19

Real CC0-licensed demo content for the listing rich-media feature.

## Files (committed)

### Walk-around videos
- `walkaround/BMC-SEED-XXXX.mp4` — per-listing personalized Ken-Burns animation
  built from the listing's own hero photo (the same Unsplash photo customers
  see on the listing card). Six premium listings, ~150 KB each.
- `walkaround/BMC-SEED-XXXX-poster.jpg` — video poster (first frame).

### 360° spin
- `spin360/demo-spin360-v2.mp4` — Pixabay video #2708 "Car Red Rotate"
  (https://pixabay.com/videos/car-red-rotate-rotating-360-2708/), 2.3 MB,
  medium 1280×720. Shared across all 6 premium listings until per-car
  turntable footage exists.

  **Versioned filename note (v1.5.21):** the `-v2` suffix is a cache-buster.
  When demo content is swapped (e.g. v1.5.16 cartoon → v1.5.19 real Pixabay),
  the URL must change too — otherwise browsers that cached the prior file
  under `Cache-Control: immutable` keep serving stale bytes for up to a week.
  Bump the suffix (`-v3`, `-v4`, …) on any future 360 content replacement,
  and update `SPIN360_URL` in `apps/api/prisma/seed.ts` to match.

## Files (NOT committed)

`source-photos/BMC-SEED-XXXX.jpg` are downloaded by the generator script as
intermediate inputs and gitignored. Re-running `scripts/generate-rich-media-demo.mjs`
re-fetches them as needed.

## Licensing

| Source | License | Commercial OK | Attribution |
|---|---|---|---|
| Unsplash hero photos | Unsplash License | Yes | Not required |
| Pixabay 360 spin video | Pixabay Content License | Yes | Not required |

Both licenses explicitly permit modification, redistribution, and commercial use without attribution. Both are CC0-equivalent.

## Regenerate

```bash
# Re-encode videos (uses cached source photos if present)
node scripts/generate-rich-media-demo.mjs --force

# Force re-download source photos too
node scripts/generate-rich-media-demo.mjs --refetch
```

## Replacing with real content

Once Behbehani has shot per-car turntable + walkaround footage, the existing
admin Media tab on each listing accepts the uploads (presigned-PUT to S3).
The customer DTO picks `uploadStatus='complete'` rows regardless of source,
so swapping demo-out / real-in is a single admin action per listing — no
code change.
