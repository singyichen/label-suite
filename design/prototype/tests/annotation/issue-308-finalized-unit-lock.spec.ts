import { test, expect, type Page } from '@playwright/test';
import { buildWorkspaceUrl, skipGuidelineModal } from './_workspace-helpers';

/* Finalized review unit lock (issue #308, spec 015 v4.14.0).
 *
 * Design decision (recorded in the spec changelog): a FINALIZED unit is
 * fully read-only -- no ✕/✓ decision rows, no direct-correction controls,
 * no submit path. The workspace renders a read-only results card plus a
 * finalized notice instead. The FR-016A "reopen with audit reason" flow is
 * deferred to the backend phase and deliberately NOT prototyped here.
 *
 * Before this fix the reviewer workspace re-rendered the normal interactive
 * review card on finalized units, so a reviewer could reject + submit on a
 * finalized official_run unit -- markSampleRejected() then rolled the
 * annotator's sample back to pending and erased the finalized unit (P0-2).
 *
 * Both finalize paths must lock:
 * - quorum-converged: T015 ofs-01 (min=1) and T017 oft-04 (2/2 agree)
 * - arbitration-resolved: T015 ofs-03 (seeded arb) and the live path where
 *   the arbiter's own submit re-renders T017 oft-01 into the locked card.
 * Interim states stay interactive: T017 oft-02 is approved at 1/2, and the
 * second reviewer must still be able to submit the finalizing review.
 */

function reviewerUrl(taskId: string, sampleId: string): string {
  return buildWorkspaceUrl({
    task_id: taskId, sample_id: sampleId, role: 'reviewer',
    run_type: 'official_run', reviewer_id: 'reviewer_chen',
  });
}

async function expectLockedCard(page: Page) {
  await expect(page.getByTestId('ws-review-finalized-card')).toBeVisible();
  await expect(page.getByTestId('ws-review-row-approve')).toHaveCount(0);
  await expect(page.getByTestId('ws-review-row-reject')).toHaveCount(0);
  await expect(page.getByTestId('ws-review-correct-single_label')).toHaveCount(0);
  await expect(page.getByTestId('ws-review-submit-btn')).toBeHidden();
}

test.describe('issue #308 -- finalized review units are fully read-only', () => {
  test('T015 ofs-01 (min=1 quorum): read-only card, no decision/correction/submit controls', async ({ page }) => {
    await skipGuidelineModal(page);
    await page.goto(reviewerUrl('T015', 'ofs-01-agree-gold'));

    await expect(page.locator('[data-testid="ws-review-unit-context"] .rv-unit-state'))
      .toHaveText('目前：已定稿 · 已鎖定');
    await expectLockedCard(page);
    // The card still shows the reviewed result, read-only.
    await expect(page.getByTestId('ws-review-finalized-card')).toContainText('negative');

    // FR-058 shortcut path is blocked by the same hidden submit button.
    await page.keyboard.press('ControlOrMeta+Enter');
    await expect(page.locator('#toastMsg')).not.toHaveText('審核已送出');
  });

  test('T017 oft-04 (2/2 quorum): read-only card on a multi-reviewer finalize', async ({ page }) => {
    await skipGuidelineModal(page);
    await page.goto(reviewerUrl('T017', 'oft-04-unanimous-gold'));

    await expect(page.locator('[data-testid="ws-review-unit-context"] .rv-unit-state'))
      .toHaveText('目前：已定稿 · 已鎖定');
    await expectLockedCard(page);
  });

  test('T015 ofs-03 (arbitration-finalized seed): locked card lists the arbitrated value', async ({ page }) => {
    await skipGuidelineModal(page);
    await page.goto(reviewerUrl('T015', 'ofs-03-arbitrated-gold'));

    await expectLockedCard(page);
    // The resolved dispute row carries the arbitrated value, not an A/B vote UI.
    await expect(page.getByTestId('ws-finalized-resolved')).toHaveCount(1);
    await expect(page.getByTestId('ws-finalized-resolved')).toContainText('neutral');
    await expect(page.getByTestId('ws-arbitration-card')).toHaveCount(0);
  });

  test('live path: the arbiter finalizing T017 oft-01 lands on the locked card in the same session', async ({ page }) => {
    await skipGuidelineModal(page);
    // reviewer_chen is the eligible non-participant arbiter on the 1:1 tie.
    await page.goto(reviewerUrl('T017', 'oft-01-even-tie'));
    await expect(page.getByTestId('ws-arbitration-card')).toBeVisible();

    await page.getByTestId('ws-arbitration-choose-b').click();
    await page.getByTestId('ws-arbitration-submit').click();

    // The arbitration submit handler re-renders the workspace: the unit is
    // now finalized, so the arbitration card gives way to the locked card.
    await expectLockedCard(page);
    await expect(page.getByTestId('ws-arbitration-card')).toHaveCount(0);
    await expect(page.getByTestId('ws-finalized-resolved')).toContainText('positive');
    await expect(page.locator('[data-testid="ws-review-unit-context"] .rv-unit-state'))
      .toHaveText('目前：已定稿 · 已鎖定');
  });

  test('regression: T017 oft-02 stays interactive at 1/2 and the second reviewer can finalize', async ({ page }) => {
    await skipGuidelineModal(page);
    await page.goto(reviewerUrl('T017', 'oft-02-approved-interim'));

    // Approved interim state (1 < min 2) must NOT be locked.
    await expect(page.getByTestId('ws-review-finalized-card')).toHaveCount(0);
    await expect(page.getByTestId('ws-review-row-approve')).toHaveCount(1);
    await expect(page.getByTestId('ws-review-submit-btn')).toBeVisible();

    // reviewer_chen files the second agreeing review -> unit finalizes.
    await page.getByTestId('ws-review-row-approve').click();
    await page.getByTestId('ws-review-submit-btn').click();
    await expect(page.locator('#toastMsg')).toHaveText('審核已送出');

    await page.reload();
    await expect(page.locator('[data-testid="ws-review-unit-context"] .rv-unit-state'))
      .toHaveText('目前：已定稿 · 已鎖定');
    await expectLockedCard(page);
  });
});
