import { test, expect } from '@playwright/test';
import { buildWorkspaceUrl, dismissGuidelineModal, skipGuidelineModal } from './_workspace-helpers';

/* Review decision button accessibility (issue #399).
 *
 * Before this fix, buildRowDecisionButtons() (annotation-workspace.config.js)
 * only appended an icon-only <span> ('✓' / '✕') to each decision button --
 * no aria-label, no title -- so a screen reader announced nothing but the
 * raw glyph (WCAG 2.1 SC 4.1.2, Name/Role/Value). Separately, the `reviewNote`
 * string was defined in the I18N table but never consumed anywhere in the
 * file, so no reviewer -- sighted or not -- could ever see it.
 *
 * This spec owns "the note is rendered at all"; its wording is owned by
 * issue-451-reject-copy-run-type.spec.ts, so the assertion below keys off
 * the note's testid rather than duplicating the copy verbatim.
 *
 * This spec pins two behaviors:
 *   1. every ws-review-row-<decision> button exposes a real accessible name
 *      (not just an aria-label attribute -- the computed accessible name
 *      Playwright's getByRole() resolves against).
 *   2. reviewNote's text is actually rendered and visible on the page.
 *
 * Traceability: specs/annotation/015-annotation-workspace/spec.md FR-014B
 * (three-way decision per review row, issue #596; the retired 退回 button
 * this spec once covered is gone); WCAG 2.1 SC 4.1.2.
 */

const REVIEWER_URL = buildWorkspaceUrl({
  task_id: 'T015',
  sample_id: 'ofs-04-pending-review',
  role: 'reviewer',
  run_type: 'official_run',
});

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
});

test.describe('Review decision buttons have accessible names and the review note is rendered (issue #399)', () => {
  const DECISION_LABELS: Array<[string, string]> = [
    ['approve', '通過'],
    ['modify', '修正'],
    ['bypass', '無法判定'],
  ];

  for (const [decision, label] of DECISION_LABELS) {
    test(`the ${decision} button has a real accessible name, not just its icon glyph`, async ({ page }) => {
      await page.goto(REVIEWER_URL);
      await dismissGuidelineModal(page);

      await expect(page.getByTestId('ws-review-row-' + decision)).toBeVisible();
      // Accessible name must resolve to the localized action label, not the
      // icon glyph -- getByRole with `name` matches on the COMPUTED
      // accessible name (aria-label wins over text content).
      await expect(page.getByRole('button', { name: label, exact: true })).toHaveCount(1);
    });
  }

  test('the retired 退回 button is gone entirely (issue #596 FR-014B)', async ({ page }) => {
    await page.goto(REVIEWER_URL);
    await dismissGuidelineModal(page);

    await expect(page.getByTestId('ws-review-row-reject')).toHaveCount(0);
    await expect(page.getByRole('button', { name: '退回', exact: true })).toHaveCount(0);
  });

  test('reviewNote text is actually rendered on screen near the decision buttons', async ({ page }) => {
    await page.goto(REVIEWER_URL);
    await dismissGuidelineModal(page);

    // The defined-but-never-consumed reviewNote string must now appear as
    // real visible text somewhere on the page, not merely exist as dead
    // data in the I18N table.
    const note = page.getByTestId('ws-review-note').first();
    await expect(note).toBeVisible();
    await expect(note).not.toBeEmpty();
  });
});
