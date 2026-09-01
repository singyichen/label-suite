import { test, expect, type Page } from '@playwright/test';
import {
  assertNoPageErrors,
  buildWorkspaceUrl,
  dismissGuidelineModal,
  skipGuidelineModal,
  trackPageErrors,
} from './_workspace-helpers';

/* issue #596 (OpenSpec change 2026-09-01-single-owner-review-relay, task 2.3,
 * RED): FR-054 v5.0.0 replaces the reviewer's two-way `A`/`R` decision
 * shortcut with a three-way-aware contract -- `A` = 通過 (approve), `B` =
 * 無法判定 (bypass), and `R` = 退回 is retired outright (the rollback channel
 * it drove no longer exists, design.md D1/D2). `修正` (modify) stays
 * deliberately unbound (design.md 已確認決策 #1): the shortcut acts on the
 * CURRENT REVIEW UNIT's entire outKey set in one keystroke (same
 * "no focused output type" reasoning FR-054 already used for `A`), and
 * modify's replacement value differs per outKey, so a single key cannot
 * express it, while bypass is a uniform per-unit decision and can.
 *
 * The CURRENT implementation still ships the v4.x pair:
 *   - setupReviewShortcuts() (annotation-workspace.config.js:2952) only
 *     recognizes the literal keys 'a' and 'r' (line 2957: `if (key !== 'a'
 *     && key !== 'r') return;`) -- 'b' is not read at all, so it is a pure
 *     no-op today.
 *   - setReviewUnitDecision() (annotation-workspace.config.js:2920) is still
 *     invoked as `setReviewUnitDecision(key === 'a' ? 'approve' : 'reject')`
 *     (line 2959): pressing `R` writes the literal string 'reject' into
 *     reviewRowDecisions. 'reject' is outside the closed REVIEW_DECISIONS
 *     vocabulary (['approve', 'modify', 'bypass'], annotation-workspace.
 *     data.js:1732), so none of the three rendered decision buttons match it
 *     and all stay `aria-pressed="false"` -- but reviewDecisionRequiresReason
 *     ('reject') is ALSO false (REVIEW_REASON_REQUIRED_DECISIONS is derived
 *     by filtering REVIEW_DECISIONS, which never contained 'reject' to begin
 *     with), so reviewRowBlocker() treats the row as decided-with-no-
 *     reason-needed. The row is silently no longer pending, and a submit
 *     right after pressing `R` succeeds today -- exactly the "R 仍生效" bug
 *     this file pins as the observable failure.
 *
 * Traceability: openspec/changes/2026-09-01-single-owner-review-relay/
 *   specs/annotation/015-annotation-workspace/spec.md FR-054 (AC-3.54);
 *   design.md D1, 已確認決策 #1.
 */

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
});

async function gotoReviewer(page: Page, taskId: string, sampleId: string) {
  await page.goto(buildWorkspaceUrl({ task_id: taskId, sample_id: sampleId, role: 'reviewer', run_type: 'official_run' }));
  await dismissGuidelineModal(page);
  await expect(page.getByTestId('ws-review-row-approve').first()).toBeVisible();
}

test.describe('issue #596: AC-3.54 A / B 作用於當前單位全部 outKey', () => {
  /* T013/absa-001 carries three outKeys (entity_recognition +
   * relation_identification merge into one ws-review-row per FR-014N,
   * multi_dim gets its own) -- exactly the "several output types, no
   * focused one" shape FR-054's per-unit semantic exists for. */
  test('A 將當前單位全部 outKey 標為 通過', async ({ page }) => {
    await gotoReviewer(page, 'T013', 'absa-001');
    const approve = page.getByTestId('ws-review-row-approve');
    await expect(approve).toHaveCount(3);

    await page.keyboard.press('a');
    // A already decides the whole unit today (setReviewUnitDecision('approve')
    // is unchanged FR-054 v4.x behavior) -- this assertion is expected to
    // already pass; it is pinned here as part of the locked AC-3.54 contract.
    const count = await approve.count();
    for (let i = 0; i < count; i += 1) {
      await expect(approve.nth(i)).toHaveAttribute('aria-pressed', 'true');
    }
  });

  test('B 將當前單位全部 outKey 標為 無法判定', async ({ page }) => {
    await gotoReviewer(page, 'T013', 'absa-001');
    const bypass = page.getByTestId('ws-review-row-bypass');
    await expect(bypass).toHaveCount(3);

    await page.keyboard.press('b');
    // Fails today: setupReviewShortcuts() only reads 'a'/'r'
    // (annotation-workspace.config.js:2957), so 'b' never reaches
    // setReviewUnitDecision() and every bypass button stays unpressed.
    const count = await bypass.count();
    for (let i = 0; i < count; i += 1) {
      await expect(bypass.nth(i)).toHaveAttribute('aria-pressed', 'true');
    }
    // FR-016A: bypass requires a reason once decided -- the reason field
    // appearing is the other observable half of "B actually decided".
    await expect(page.getByTestId('ws-review-reason')).toHaveCount(3);
  });
});

test.describe('issue #596: AC-3.54 R 已廢除', () => {
  test('R 不產生任何決策，送出仍須先手動決策才能成功', async ({ page }) => {
    await gotoReviewer(page, 'T001', 'sent-001');
    const approveBtn = page.getByTestId('ws-review-row-approve');
    const modifyBtn = page.getByTestId('ws-review-row-modify');
    const bypassBtn = page.getByTestId('ws-review-row-bypass');

    await page.keyboard.press('r');
    await expect(approveBtn).toHaveAttribute('aria-pressed', 'false');
    await expect(modifyBtn).toHaveAttribute('aria-pressed', 'false');
    await expect(bypassBtn).toHaveAttribute('aria-pressed', 'false');

    await page.getByTestId('ws-review-submit-btn').click();
    // Fails today: pressing R still writes the out-of-vocabulary 'reject'
    // value into reviewRowDecisions (setReviewUnitDecision, config.js:2959),
    // which reviewRowBlocker() does not recognize as needing a decision OR a
    // reason -- so the submit above goes through and shows 審核已送出
    // instead of staying blocked on an undecided unit.
    await expect(page.locator('#toastMsg')).not.toHaveText('審核已送出');
  });
});

test.describe('issue #596: AC-3.54 快捷鍵不觸發情境', () => {
  /* free_text corrections are typed, so the letters `a`/`b` are ordinary
   * input the moment a field holds focus. */
  test('焦點在輸入控件（textarea）時 a / b 只打字，不觸發決策', async ({ page }) => {
    await gotoReviewer(page, 'T009', 'sum-001');
    const approve = page.getByTestId('ws-review-row-approve');
    const bypass = page.getByTestId('ws-review-row-bypass');

    const field = page.getByTestId('ws-review-row').locator('textarea, input[type="text"]').first();
    await field.click();
    await field.fill('');
    await page.keyboard.type('abab');

    await expect(field).toHaveValue('abab');
    await expect(approve).toHaveAttribute('aria-pressed', 'false');
    await expect(bypass).toHaveAttribute('aria-pressed', 'false');
  });

  test('帶修飾鍵（Ctrl/Cmd/Alt/Shift）時 A / B 不觸發', async ({ page }) => {
    await gotoReviewer(page, 'T013', 'absa-001');
    const approve = page.getByTestId('ws-review-row-approve');
    const bypass = page.getByTestId('ws-review-row-bypass');

    await page.keyboard.press('Shift+A');
    await page.keyboard.press('Shift+B');
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Control+b');
    await page.keyboard.press('Meta+a');
    await page.keyboard.press('Meta+b');
    await page.keyboard.press('Alt+a');
    await page.keyboard.press('Alt+b');

    const count = await approve.count();
    for (let i = 0; i < count; i += 1) {
      await expect(approve.nth(i)).toHaveAttribute('aria-pressed', 'false');
      await expect(bypass.nth(i)).toHaveAttribute('aria-pressed', 'false');
    }
  });

  test('role = annotator 時 A / B 不觸發（審核決策控件不存在）', async ({ page }) => {
    const errors = trackPageErrors(page);
    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001', role: 'annotator' }));
    await dismissGuidelineModal(page);

    await page.keyboard.press('a');
    await page.keyboard.press('b');

    await expect(page.getByTestId('ws-review-row-approve')).toHaveCount(0);
    await expect(page.getByTestId('ws-review-row-bypass')).toHaveCount(0);
    assertNoPageErrors(errors);
  });
});
