import { test, expect } from '@playwright/test';

const DASHBOARD_URL = '/pages/dashboard/dashboard.html';

/* w6-resilience-a11y.md I18N-03 (unblocked by merged PR #258, which fixed
 * F-08a): the reviewer role-card copy was rewritten for the per-annotator
 * review model -- review means correct-or-arbitrate, and 退回 (return) is
 * qualified as formal-run-only.
 *
 * Exact-match assertions pin the NEW copy in BOTH languages at once; either
 * language silently keeping the old 退回-only wording (the F-08a defect) now
 * fails the corresponding exact match. The shortcut-help R row is rendered
 * by the shared sidebar into the (initially hidden) help modal; toHaveText
 * resolves textContent, so the modal does not need to be opened. */

test('the Chinese reviewer copy reflects the correct-or-arbitrate model (I18N-03)', async ({ page }) => {
  await page.goto(DASHBOARD_URL);

  await expect(page.locator('#roleReviewerSubtitle')).toHaveText('逐標記員獨立審核，直接修正結果，歧異交付仲裁。');
  await expect(page.locator('#stepReviewer2Title')).toHaveText('修正或仲裁');
  await expect(page.locator('#stepReviewer2Desc')).toHaveText('直接修正結果；退回僅限正式標記');
  await expect(page.locator('#shortcutReviewReject')).toHaveText('退回目前結果（限正式標記）');
});

test('the English reviewer copy carries the same semantics (I18N-03)', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('labelsuite.lang', 'en');
  });
  await page.goto(DASHBOARD_URL);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');

  await expect(page.locator('#roleReviewerSubtitle')).toHaveText('Review each annotator independently, correct results directly, and arbitrate disputes.');
  await expect(page.locator('#stepReviewer2Title')).toHaveText('Correct or Arbitrate');
  await expect(page.locator('#stepReviewer2Desc')).toHaveText('Correct directly; return applies to formal runs only');
  await expect(page.locator('#shortcutReviewReject')).toHaveText('Return current result (formal runs only)');
});
