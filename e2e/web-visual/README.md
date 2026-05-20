# Web Visual Regression — Behbehani Motors Storefront

## Purpose

Lock the visual identity of the five key customer-facing surfaces and prevent
unintentional regressions from landing in production.

Covered surfaces:
1. **Home** (`/en`) — full page
2. **Browse** (`/en/browse`) — full page
3. **Sign-in modal** (`/en?signin=1`) — dialog element only
4. **Account hub (unsigned)** (`/en/account`) — sign-in-required hero card
5. **Documents (unsigned)** (`/en/account/documents`) — sign-in-required card

Snapshots are stored in `tests/__snapshots__/` and **must be committed to git**
so that CI can diff against them on every run.

---

## Local usage

### 1. Install Playwright once

```bash
npm run visual:install
```

This installs the Chromium browser binary used for screenshots.

### 2. Capture baselines (first time, or after approved visual changes)

Make sure the web dev server is running first:

```bash
npm run serve:web          # in a separate terminal, or use nx serve web
```

Then capture:

```bash
npm run visual:baseline
```

This runs `playwright test --update-snapshots`. New `.png` files appear under
`e2e/web-visual/tests/__snapshots__/`. Commit them.

### 3. Diff against committed baselines

```bash
npm run visual:test
```

Any pixel deviation above Playwright's default threshold fails the test.
The HTML report is written to `e2e/web-visual/playwright-report/`.

---

## CI usage

The GitHub Actions workflow **Web visual regression**
(`.github/workflows/web-visual.yml`) is **manually triggerable only**
(`workflow_dispatch`) during Phase 1.

Trigger it from the GitHub UI:
1. Actions → **Web visual regression** → **Run workflow**
2. Choose mode: `baseline` (captures + uploads artifacts) or `test` (diffs).

The `playwright-report` folder is uploaded as a workflow artifact after every
run so you can download and inspect failure diffs.

---

## When to update baselines

Run `npm run visual:baseline` (locally) and commit the updated `.png` files
whenever a visual change is **intentional and approved**:

- Brand / colour token updates
- Layout refactors that were design-reviewed
- New UI components added to a covered page

Do **not** update baselines to silence a failing test without understanding
why the snapshot changed.

---

## Snapshot storage

```
e2e/web-visual/tests/__snapshots__/
  home-chromium-win32.png          (or -linux.png in CI)
  browse-chromium-win32.png
  sign-in-modal-chromium-win32.png
  account-hub-unsigned-chromium-win32.png
  documents-unsigned-chromium-win32.png
```

> **Note:** Playwright appends the OS name to snapshot filenames. Baselines
> captured on macOS/Windows will not match CI (Linux). Capture the canonical
> baseline in CI using `mode: baseline` and commit those `-linux.png` files.

---

## Phase 2 roadmap

- Wire `push` / `pull_request` triggers to the GH Actions workflow
- Tune per-snapshot pixel-difference thresholds (`maxDiffPixelRatio`)
- Integrate Percy or Chromatic for visual review inside pull requests
- Expand coverage to VDP, Sell flow, and mobile viewports
