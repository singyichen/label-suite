import { test, expect, type Page } from '@playwright/test';
import { dismissGuidelineModal, gotoReviewerWorkspace, skipGuidelineModal } from './_workspace-helpers';

/* issue #925: syncDecisionsWithCorrections() (annotation-workspace.config.js
 * ~3755) resets ANY existing per-outKey decision (approve/modify/bypass) --
 * clearing reviewRowDecisions[key], the reason, and the AC-3.42 answer
 * snapshot, then toasting toastReviewDecisionResetOnEdit -- the moment the
 * answer it was made against changes. That is correct for 通過 (approve) and
 * 無法裁決 (bypass): the answer changing invalidates what they judged. It is
 * wrong for 修正 (modify): changing the answer IS the modify action, not a
 * stray edit that should invalidate it. Bug reported in issue #925: a
 * reviewer picks 修正, then changes the answer, and the decision (plus the
 * required reason) silently vanishes.
 *
 * The maintainer's fix narrows the reset condition to "decision is not
 * modify" -- approve/bypass keep resetting unchanged.
 *
 * (a) pins the NEW modify behavior. Currently RED: the fix has not landed,
 *     so today's reset-on-any-decision logic still clears modify too.
 * (b) is the regression guard for approve/bypass, which MUST keep
 *     resetting. Currently GREEN against today's code, and must stay green
 *     after the fix narrows the condition.
 *
 * Companion of issue-453-pre-submit-review-summary.spec.ts's describe "A
 * decision never survives an edit to the value it judged": its second test
 * ('the reset decision blocks submit until it is re-confirmed') exercises
 * `modify` and pins the SAME reset-on-edit behavior this issue overturns --
 * that test will need updating alongside the Green fix; it is not touched
 * by this Red commit.
 *
 * Traceability: specs/annotation/015-annotation-workspace/spec.md AC-3.42.
 */

/* T001 (single-label.json) ships exactly one output type (single_label),
 * so its one review row's decision is also the whole review unit's --
 * simplifies the quick-submit assertion in (a) without needing to decide a
 * second, unrelated outKey first. */
function gotoT001Official(page: Page) {
  return gotoReviewerWorkspace(page, { task_id: 'T001', sample_id: 'sent-001', run_type: 'official_run' });
}

/* Flips the single_label correction away from whatever it currently holds,
 * so the row's judged answer genuinely changes. Local copy of
 * issue-453-pre-submit-review-summary.spec.ts's flipSingleLabel() -- kept
 * here rather than promoted into _workspace-helpers.ts, since this task is
 * scoped to adding one new spec file, not editing the shared helper file. */
async function flipSingleLabel(page: Page): Promise<string> {
  const correction = page.getByTestId('ws-review-correct-single_label');
  const negative = correction.getByTestId('ws-single-label-chip-negative');
  const positive = correction.getByTestId('ws-single-label-chip-positive');
  const negativePressed = (await negative.getAttribute('aria-pressed')) === 'true';
  const target = negativePressed ? positive : negative;
  await target.click();
  await expect(target).toHaveAttribute('aria-pressed', 'true');
  return negativePressed ? 'positive' : 'negative';
}

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
});

test.describe('issue #925: a modify decision survives a later answer edit', () => {
  test('changing the answer under an active modify decision keeps the decision and reason, and submit succeeds', async ({
    page,
  }) => {
    await gotoT001Official(page);
    await dismissGuidelineModal(page);

    const modifyBtn = page.getByTestId('ws-review-row-modify');
    await modifyBtn.click();
    await expect(modifyBtn).toHaveAttribute('aria-pressed', 'true');

    const reasonField = page.getByTestId('ws-review-reason');
    await reasonField.fill('修正（測試理由）');

    await flipSingleLabel(page);

    // The modify decision and its reason must NOT be reset by the answer
    // edit that IS the modify action -- and no reset toast should fire.
    await expect(modifyBtn).toHaveAttribute('aria-pressed', 'true');
    await expect(reasonField).toBeVisible();
    await expect(reasonField).toHaveValue('修正（測試理由）');
    await expect(page.getByText('對應的審核決策已重置')).toHaveCount(0);

    // T001 ships a single output type, so this one modify decision
    // completes the review unit -- the footer submit button should be
    // visible and usable without re-confirming anything.
    await expect(page.getByTestId('ws-review-submit-btn')).toBeVisible();
    await page.getByTestId('ws-review-submit-btn').click();
    await expect(page.locator('#toastMsg')).toHaveText('審核已送出');
  });
});

test.describe('issue #925 regression: approve/bypass still reset on a later answer edit', () => {
  test('an approve decision is cleared when the answer changes afterward', async ({ page }) => {
    await gotoT001Official(page);
    await dismissGuidelineModal(page);

    const approveBtn = page.getByTestId('ws-review-row-approve');
    await approveBtn.click();
    await expect(approveBtn).toHaveAttribute('aria-pressed', 'true');

    await flipSingleLabel(page);

    await expect(approveBtn).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('#toastMsg')).toContainText('對應的審核決策已重置');
  });

  test('a bypass decision and its reason are cleared when the answer changes afterward', async ({ page }) => {
    await gotoT001Official(page);
    await dismissGuidelineModal(page);

    const bypassBtn = page.getByTestId('ws-review-row-bypass');
    await bypassBtn.click();
    await expect(bypassBtn).toHaveAttribute('aria-pressed', 'true');

    const reasonField = page.getByTestId('ws-review-reason');
    await reasonField.fill('無法判定（測試理由）');
    await expect(reasonField).toBeVisible();

    await flipSingleLabel(page);

    await expect(bypassBtn).toHaveAttribute('aria-pressed', 'false');
    // The reason field unmounts along with the cleared decision (FR-016A:
    // no decision means no reason requirement).
    await expect(page.getByTestId('ws-review-reason')).toHaveCount(0);
    await expect(page.locator('#toastMsg')).toContainText('對應的審核決策已重置');
  });
});
