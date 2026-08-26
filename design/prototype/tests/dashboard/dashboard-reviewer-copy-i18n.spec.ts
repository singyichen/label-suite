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
 * resolves textContent, so the modal does not need to be opened.
 *
 * Traceability: specs/dashboard/012-dashboard/spec.md
 *   FR-007A, FR-007F */

test('the Chinese reviewer copy reflects the correct-or-arbitrate model (I18N-03)', async ({ page }) => {
  await page.goto(DASHBOARD_URL);

  await expect(page.locator('#roleReviewerSubtitle')).toHaveText('逐標記員獨立審核，直接修正結果，歧異交付仲裁。');
  await expect(page.locator('#stepReviewer2Title')).toHaveText('修正或仲裁');
  await expect(page.locator('#stepReviewer2Desc')).toHaveText('直接修正結果；退回僅限正式標記');
  /* issue #409: the qualifier now attaches to the annotator-status rollback
   * side effect specifically, not the reject action/key as a whole (spec
   * 015 AC-3.33 keeps the reject control itself run-type-agnostic). */
  await expect(page.locator('#shortcutReviewReject')).toHaveText('退回目前結果（回退標記員狀態僅限正式標記）');
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
  await expect(page.locator('#shortcutReviewReject')).toHaveText('Return current result (annotator status rollback is formal-run only)');
});

/* Issue #458: 審核 is the canonical zh-TW term for the reviewer flow
 * (outnumbering 審查 256:5 across design/prototype/pages); the reviewer
 * panel's own subtitle and today-reviewed metric label were two of the
 * three remaining 審查 drifts. English is unaffected -- "review" already
 * matches both terms, so only the zh-TW value moves.
 *
 * Traceability: specs/dashboard/012-dashboard/spec.md FR-007A. */
test('the reviewer panel subtitle and today-reviewed label use the canonical 審核 wording (issue #458)', async ({ page }) => {
  await page.goto(`${DASHBOARD_URL}?scenario=reviewer`);

  await expect(page.locator('#reviewerPanelSubtitle')).toHaveText('我的審核進度與待處理項目');
  await expect(page.locator('#reviewerPanelSubtitle')).not.toContainText('審查');
  await expect(page.locator('#reviewerTodayReviewedLabel')).toHaveText('今日已審核');
});

test('the reviewer panel subtitle and today-reviewed label keep their English wording (issue #458)', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('labelsuite.lang', 'en');
  });
  await page.goto(`${DASHBOARD_URL}?scenario=reviewer`);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');

  await expect(page.locator('#reviewerPanelSubtitle')).toHaveText('My review progress and pending items');
  await expect(page.locator('#reviewerTodayReviewedLabel')).toHaveText('Reviewed Today');
});
