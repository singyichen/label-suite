import { test, expect, type Page } from '@playwright/test';
import { buildWorkspaceUrl, dismissGuidelineModal, skipGuidelineModal } from './_workspace-helpers';

/* issue #596 (OpenSpec change 2026-09-01-single-owner-review-relay, task 2.1,
 * RED): the reviewer decision control collapses from a two-way `通過 / 退回`
 * toggle to a three-way `REVIEW_DECISIONS = approve | modify | bypass`
 * toggle (design.md D2; spec delta FR-014B / FR-092), and the paired
 * audit-reason contract (FR-016A) now requires a reason for `modify` AND
 * `bypass`, not just the old `reject`.
 *
 * The CURRENT implementation (annotation-workspace.config.js
 * buildRowDecisionButtons() / buildRejectReasonField() / reviewRowBlocker())
 * still renders the OLD two-way model: `ws-review-row-approve` /
 * `ws-review-row-reject`, with the reason field gated on
 * `decision === 'reject'` alone (`ws-review-reject-reason`). Every case in
 * this file is expected to fail today for that reason -- see each test's
 * own comment for the specific assertion that proves it.
 *
 * --- Decided Red contract (this file pins these values; task 2.2's Green
 *     implementation is wrong if it disagrees, not this test) ---
 *   - Decision button testids: `ws-review-row-<decision>` for each value of
 *     REVIEW_DECISIONS -- `ws-review-row-approve` kept unchanged (same
 *     semantic today and after), `ws-review-row-modify` and
 *     `ws-review-row-bypass` newly introduced -- mirroring the existing
 *     `ws-review-row-approve` / `ws-review-row-reject` naming convention
 *     (buildRowDecisionButtons, annotation-workspace.config.js:2897) rather
 *     than inventing a new scheme. `ws-review-row-reject` and any control
 *     accessibly named `退回` MUST NOT exist anywhere on the page (FR-014B:
 *     "退回選項 MUST NOT 渲染").
 *   - Toggle mechanics: same `aria-pressed` contract the current
 *     approve/reject pair already uses (buildRowDecisionButtons refresh()),
 *     extended to three mutually-exclusive buttons; clicking the
 *     already-active one cancels back to undecided (AC-3.51, unchanged
 *     click-to-cancel semantic from the current approve/reject pair).
 *   - Reason field testid: `ws-review-reason` (renamed from
 *     `ws-review-reject-reason` because FR-016A now gates it on
 *     `decision ∈ {modify, bypass}`, not just `reject` -- keeping the old
 *     "reject" name would misdescribe what it now covers), a
 *     `<textarea required>` carrying `data-outkey=<outKey>` -- the same
 *     attribute name the current `ws-review-reject-reason` field already
 *     sets (buildRejectReasonField, annotation-workspace.config.js:3341).
 *   - Blocked-submit toast still embeds the raw outKey slug (not a display
 *     label) via its `{list}` interpolation, matching the current
 *     `toastRejectReasonRequired` mechanism
 *     (`t(toastKey).replace('{list}', pendingOutputKeys.join('、'))`,
 *     handleReviewSubmit, annotation-workspace.config.js:4536) -- AC-3.53
 *     "指名該 outKey" is satisfied by this existing mechanism, scoped to
 *     reason-missing outKeys instead of reject-missing ones. This file
 *     therefore asserts only that the toast contains the raw outKey slug,
 *     not its exact Chinese wording.
 *   - `ws-review-history` (#wsReviewHistory) stays hidden on a blocked
 *     submit -- it is only unhidden by appendReviewHistoryEntry() after a
 *     genuinely accepted submit (annotation-workspace.html:1187), so its
 *     visibility doubles as "no review state was written" (AC-3.53
 *     "且不寫入任何審核狀態").
 *
 * Traceability: openspec/changes/2026-09-01-single-owner-review-relay/
 *   specs/annotation/015-annotation-workspace/spec.md FR-014B (AC-3.51),
 *   FR-016A (AC-3.53), FR-092 (REVIEW_DECISIONS); design.md D2.
 * FR-093 (exactly one assigned reviewer per review unit): every fixture
 * below is reviewed by the single default reviewer identity only -- no
 * second reviewer/annotator is ever introduced to manufacture a decision
 * state, so nothing here bakes in the retired multi-reviewer shape.
 */

async function submitAsAnnotator(page: Page, taskId: string, sampleId: string, answer: () => Promise<void>) {
  await page.goto(buildWorkspaceUrl({ task_id: taskId, sample_id: sampleId, role: 'annotator' }));
  await dismissGuidelineModal(page);
  await answer();
  await page.getByTestId('ws-submit-btn').click();
}

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
});

test.describe('issue #596: AC-3.51 三向決策控件（通過／修正／無法判定）', () => {
  test('the decision group is exactly three-way and no 退回 control exists anywhere', async ({ page }) => {
    await submitAsAnnotator(page, 'T001', 'sent-001', async () => {
      await page.getByTestId('ws-single-label-chip-negative').click();
    });
    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001', role: 'reviewer' }));
    await dismissGuidelineModal(page);

    const row = page.getByTestId('ws-review-row').first();
    await expect(row.getByTestId('ws-review-row-approve')).toHaveCount(1);
    // Fails today: buildRowDecisionButtons() only ever renders approve/reject.
    await expect(row.getByTestId('ws-review-row-modify')).toHaveCount(1);
    await expect(row.getByTestId('ws-review-row-bypass')).toHaveCount(1);
    // FR-014B: "退回選項 MUST NOT 渲染" -- page-wide, not just this row.
    await expect(page.getByTestId('ws-review-row-reject')).toHaveCount(0);
    await expect(page.getByRole('button', { name: '退回' })).toHaveCount(0);
  });

  test('clicking 通過 activates it, leaves 修正／無法判定 inactive, and a second click cancels back to undecided', async ({ page }) => {
    await submitAsAnnotator(page, 'T001', 'sent-001', async () => {
      await page.getByTestId('ws-single-label-chip-negative').click();
    });
    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001', role: 'reviewer' }));
    await dismissGuidelineModal(page);

    const row = page.getByTestId('ws-review-row').first();
    const approveBtn = row.getByTestId('ws-review-row-approve');
    const modifyBtn = row.getByTestId('ws-review-row-modify');
    const bypassBtn = row.getByTestId('ws-review-row-bypass');

    // Fails today: modify/bypass don't exist yet, so these never become visible.
    await expect(modifyBtn).toBeVisible();
    await expect(bypassBtn).toBeVisible();

    await approveBtn.click();
    await expect(approveBtn).toHaveAttribute('aria-pressed', 'true');
    await expect(modifyBtn).toHaveAttribute('aria-pressed', 'false');
    await expect(bypassBtn).toHaveAttribute('aria-pressed', 'false');

    await approveBtn.click();
    await expect(approveBtn).toHaveAttribute('aria-pressed', 'false');
  });

  test('修正 and 無法判定 are mutually exclusive with each other and with 通過', async ({ page }) => {
    await submitAsAnnotator(page, 'T001', 'sent-001', async () => {
      await page.getByTestId('ws-single-label-chip-negative').click();
    });
    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001', role: 'reviewer' }));
    await dismissGuidelineModal(page);

    const row = page.getByTestId('ws-review-row').first();
    const approveBtn = row.getByTestId('ws-review-row-approve');
    const modifyBtn = row.getByTestId('ws-review-row-modify');
    const bypassBtn = row.getByTestId('ws-review-row-bypass');

    // Fails today: modify doesn't exist yet.
    await expect(modifyBtn).toBeVisible();
    await modifyBtn.click();
    await expect(modifyBtn).toHaveAttribute('aria-pressed', 'true');
    await expect(approveBtn).toHaveAttribute('aria-pressed', 'false');
    await expect(bypassBtn).toHaveAttribute('aria-pressed', 'false');

    await bypassBtn.click();
    await expect(bypassBtn).toHaveAttribute('aria-pressed', 'true');
    await expect(modifyBtn).toHaveAttribute('aria-pressed', 'false');
    await expect(approveBtn).toHaveAttribute('aria-pressed', 'false');
  });
});

test.describe('issue #596: AC-3.53 修正／無法判定理由必填，通過不須，缺理由阻擋送出', () => {
  test('選擇 修正 未填理由 -> 送出被阻擋，且未寫入任何審核狀態', async ({ page }) => {
    await submitAsAnnotator(page, 'T001', 'sent-001', async () => {
      await page.getByTestId('ws-single-label-chip-negative').click();
    });
    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001', role: 'reviewer' }));
    await dismissGuidelineModal(page);

    const row = page.getByTestId('ws-review-row').first();
    // Fails today: modify doesn't exist yet.
    await expect(row.getByTestId('ws-review-row-modify')).toBeVisible();
    await row.getByTestId('ws-review-row-modify').click();

    const reason = row.getByTestId('ws-review-reason');
    await expect(reason).toHaveCount(1);
    await expect(reason).toHaveAttribute('data-outkey', 'single_label');

    await page.getByTestId('ws-review-submit-btn').click();
    const toast = page.locator('#toastMsg');
    await expect(toast).not.toHaveText('審核已送出');
    await expect(toast).toContainText('single_label');
    await expect(page.getByTestId('ws-review-history')).not.toBeVisible();
  });

  test('選擇 無法判定 未填理由 -> 送出被阻擋，且未寫入任何審核狀態', async ({ page }) => {
    await submitAsAnnotator(page, 'T001', 'sent-001', async () => {
      await page.getByTestId('ws-single-label-chip-negative').click();
    });
    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001', role: 'reviewer' }));
    await dismissGuidelineModal(page);

    const row = page.getByTestId('ws-review-row').first();
    // Fails today: bypass doesn't exist yet.
    await expect(row.getByTestId('ws-review-row-bypass')).toBeVisible();
    await row.getByTestId('ws-review-row-bypass').click();

    const reason = row.getByTestId('ws-review-reason');
    await expect(reason).toHaveCount(1);
    await expect(reason).toHaveAttribute('data-outkey', 'single_label');

    await page.getByTestId('ws-review-submit-btn').click();
    const toast = page.locator('#toastMsg');
    await expect(toast).not.toHaveText('審核已送出');
    await expect(toast).toContainText('single_label');
    await expect(page.getByTestId('ws-review-history')).not.toBeVisible();
  });

  test('選擇 通過 -> 不出現理由欄，且可直接送出成功', async ({ page }) => {
    await submitAsAnnotator(page, 'T001', 'sent-001', async () => {
      await page.getByTestId('ws-single-label-chip-negative').click();
    });
    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001', role: 'reviewer' }));
    await dismissGuidelineModal(page);

    const row = page.getByTestId('ws-review-row').first();
    /* Precondition, not the assertion under test: without this, clicking
       通過 alone would ALSO succeed under today's two-way model (its
       approve semantic is unchanged), which would make this case pass for
       the wrong reason. Anchor it to the same three-way/no-退回 tripwire
       every other case in this file uses, so it fails today for the same
       "interface is still two-way" reason. */
    await expect(row.getByTestId('ws-review-row-modify')).toHaveCount(1);
    await expect(row.getByTestId('ws-review-row-bypass')).toHaveCount(1);
    await expect(row.getByTestId('ws-review-row-reject')).toHaveCount(0);

    await row.getByTestId('ws-review-row-approve').click();
    await expect(row.getByTestId('ws-review-reason')).toHaveCount(0);

    await page.getByTestId('ws-review-submit-btn').click();
    await expect(page.locator('#toastMsg')).toHaveText('審核已送出');
  });

  test('同一單位内，通過的 outKey 不受其他 outKey 缺理由拖累；補齊理由後可完整送出', async ({ page }) => {
    // T013/absa-001: entity_recognition + relation_identification merge into
    // one ws-review-row (FR-014N), multi_dim gets its own -- 2 rows total.
    await page.goto(buildWorkspaceUrl({ task_id: 'T013', sample_id: 'absa-001', role: 'reviewer', run_type: 'official_run' }));
    await dismissGuidelineModal(page);

    const rows = page.getByTestId('ws-review-row');
    await expect(rows).toHaveCount(2);
    const spanRow = rows.first(); // merged entity_recognition + relation_identification
    const dimRow = rows.last(); // multi_dim

    const spanBypassBtns = spanRow.getByTestId('ws-review-row-bypass');
    // Fails today: bypass doesn't exist yet, so this row has 0, not 2.
    await expect(spanBypassBtns).toHaveCount(2);
    const spanBypassCount = await spanBypassBtns.count();
    for (let i = 0; i < spanBypassCount; i++) {
      await spanBypassBtns.nth(i).click();
    }
    // FR-014N: "每個 outKey 各一欄" -- two independent reason fields.
    await expect(spanRow.getByTestId('ws-review-reason')).toHaveCount(2);

    await expect(dimRow.getByTestId('ws-review-row-approve')).toBeVisible();
    await dimRow.getByTestId('ws-review-row-approve').click();
    await expect(dimRow.getByTestId('ws-review-reason')).toHaveCount(0);

    await page.getByTestId('ws-review-submit-btn').click();
    await expect(page.locator('#toastMsg')).not.toHaveText('審核已送出');

    const spanReasons = spanRow.getByTestId('ws-review-reason');
    const spanReasonCount = await spanReasons.count();
    for (let i = 0; i < spanReasonCount; i++) {
      await spanReasons.nth(i).fill('無法判定（測試理由）');
    }
    await page.getByTestId('ws-review-submit-btn').click();
    await expect(page.locator('#toastMsg')).toHaveText('審核已送出');
  });
});
