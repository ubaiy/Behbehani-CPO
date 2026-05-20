import { test, expect } from '@playwright/test';

/**
 * Visual regression tests for the 5 key Behbehani Motors customer surfaces.
 *
 * To capture initial baselines (first run or after approved visual changes):
 *   npm run visual:baseline
 *
 * To diff against committed baselines in CI:
 *   npm run visual:test
 *
 * Snapshots are stored in tests/__snapshots__/ and must be committed to git.
 */

test.describe('Customer surfaces — visual regression', () => {
  /**
   * 1. Home page — full-page screenshot.
   * Mask any hero banners or dynamic text that may change between runs.
   */
  test('home page', async ({ page }) => {
    await page.goto('/en');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('home.png', {
      fullPage: true,
      // Mask dynamic elements (e.g. hero carousel, timestamp text) if needed.
      // mask: [page.locator('[data-dynamic]')],
    });
  });

  /**
   * 2. Browse / inventory listing page — full-page screenshot.
   * Mask any sort-order dropdowns or vehicle count text that may vary.
   */
  test('browse page', async ({ page }) => {
    await page.goto('/en/browse');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('browse.png', {
      fullPage: true,
      // Mask timestamp or result-count text if it causes flakiness.
      // mask: [page.locator('[data-sort-label], [data-result-count]')],
    });
  });

  /**
   * 3. Sign-in modal — element-scoped screenshot of the dialog only.
   * The modal opens automatically when `?signin=1` is present in the URL.
   */
  test('sign-in modal', async ({ page }) => {
    await page.goto('/en?signin=1');
    await page.waitForLoadState('networkidle');

    // Wait for the modal dialog to be visible before screenshotting.
    const dialog = page.locator('[role="dialog"]');
    await dialog.waitFor({ state: 'visible', timeout: 10_000 });

    await expect(dialog).toHaveScreenshot('sign-in-modal.png');
  });

  /**
   * 4. Account hub (unauthenticated) — element-scoped screenshot of the
   * "Please sign in" hero card that is shown to unsigned-in visitors.
   */
  test('account hub unsigned', async ({ page }) => {
    await page.goto('/en/account');
    await page.waitForLoadState('networkidle');

    // Close the sign-in modal that auto-opens for unauthenticated users.
    const closeBtn = page.locator('[role="dialog"] button[aria-label="Close"], [role="dialog"] button.close, [role="dialog"] [data-testid="modal-close"]').first();
    const dialog = page.locator('[role="dialog"]');
    if (await dialog.isVisible()) {
      await closeBtn.click();
      await dialog.waitFor({ state: 'hidden', timeout: 5_000 });
    }

    // Wait for the "Please sign in" hero card to be visible.
    const heroCard = page.locator('[data-testid="sign-in-required-card"], .sign-in-hero, [class*="hero"]').first();
    await heroCard.waitFor({ state: 'visible', timeout: 10_000 });

    await expect(heroCard).toHaveScreenshot('account-hub-unsigned.png');
  });

  /**
   * 5. Documents page (unauthenticated) — element-scoped screenshot of the
   * rounded-card / signed-in-required card shown to unsigned-in visitors.
   */
  test('documents page unsigned', async ({ page }) => {
    await page.goto('/en/account/documents');
    await page.waitForLoadState('networkidle');

    // Close the sign-in modal that auto-opens for unauthenticated users.
    const dialog = page.locator('[role="dialog"]');
    if (await dialog.isVisible()) {
      const closeBtn = page.locator('[role="dialog"] button[aria-label="Close"], [role="dialog"] button.close, [role="dialog"] [data-testid="modal-close"]').first();
      await closeBtn.click();
      await dialog.waitFor({ state: 'hidden', timeout: 5_000 });
    }

    // Wait for the documents page hero / sign-in-required card.
    const heroCard = page.locator('[data-testid="sign-in-required-card"], [data-testid="documents-hero"], .documents-hero, [class*="hero"]').first();
    await heroCard.waitFor({ state: 'visible', timeout: 10_000 });

    await expect(heroCard).toHaveScreenshot('documents-unsigned.png');
  });
});
