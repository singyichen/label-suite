/*
 * Traceability: openspec/changes/task-detail-iaa-precondition-and-override-scope/
 *   tasks.md group 2 (2.1); design.md D5, D6, D7; specs/task-management/
 *   014-task-detail/spec.md delta -- FR-010o-4 points (1)-(6) and its four
 *   unnumbered scenarios ("IAA 計算中不呈現為未達標且暫不能開始正式標記",
 *   "IAA 計算失敗可由專案負責人重試", "無法計算視為計算已結束，不阻擋開始
 *   正式標記", "IAA 計算未結束時新增試標回合同樣停用"); SC-019. Issue #783.
 *
 * T018 is a new demo task (design.md D7): status waiting_iaa_confirmation,
 * latest trial round `iaa_computation_status: 'failed'`. It does not exist
 * yet -- Green (task 2.5-2.9) must add it to task-list.data.js and
 * task-detail.data.js. Until then, every T018 assertion below fails via
 * task-detail.html's existing #taskNotFound state (issue #200), not via a
 * missing-selector/syntax error.
 *
 * Contract for Green -- selectors this file pins down:
 *   - #trialDecisionTitle / #trialDecisionDesc (existing "judgement banner",
 *     design/prototype/pages/task-management/task-detail.panels/overview.html
 *     :441-442): for iaa_computation_status pending/failed, this banner MUST
 *     show the computation-status copy (containing "IAA 計算中" / "IAA 計算
 *     失敗") instead of a round-outcome verdict (MUST NOT contain 未達標/
 *     未通過/已達標).
 *   - #retryIaaComputationBtn (new): only rendered when
 *     iaa_computation_status === 'failed' AND state.taskRole ===
 *     'project_leader'. Clicking it resets the latest round to 'pending' in
 *     place -- MUST NOT change TASK_DATA.status and MUST NOT push a new
 *     round.
 *   - #publishOfficialRunBtn / #publishDryRunBtn (existing): both MUST stay
 *     disabled while the latest round is not 'done', and #publishActionRow
 *     MUST contain visible reason text next to them. Draft copy (design.md
 *     D6, maintainer-review, may be adjusted by Green as long as the
 *     計算中／計算失敗／重試計算 substrings survive):
 *       pending: "IAA 計算中，完成後才能開始正式標記" /
 *                "IAA 計算中，完成後才能新增下一回合"
 *       failed:  "IAA 計算失敗，請重試計算" (same text for both buttons)
 *   - #currentAgreementValue (existing): MUST NOT render a numeric alpha
 *     while pending/failed (asserted here as "does not start with a digit",
 *     since the exact placeholder copy is Green's choice).
 */
import { test, expect } from '@playwright/test';

const TASK_DETAIL_URL = '/pages/task-management/task-detail.html';
const T018_ID = 'T018';

const ROUND_VERDICT_WORDS = /未達標|未通過|已達標/;

test.describe('Issue #783 -- IAA computation status on waiting_iaa_confirmation (FR-010o-4)', () => {
  test('a failed computation shows retry, not a not-met verdict, and disables both publish actions (FR-010o-4(2)-(5))', async ({
    page,
  }) => {
    await page.goto(`${TASK_DETAIL_URL}?task_id=${T018_ID}`);

    await expect(page.locator('#statusBadge')).toContainText('待 IAA 確認');

    await expect(page.locator('#trialDecisionTitle')).toContainText('計算失敗');
    await expect(page.locator('#trialDecisionTitle')).not.toHaveText(ROUND_VERDICT_WORDS);
    await expect(page.locator('#trialDecisionDesc')).not.toHaveText(ROUND_VERDICT_WORDS);

    await expect(page.locator('#retryIaaComputationBtn')).toBeVisible();

    // FR-010o-4(1)/(2): the computation has not produced a number yet, so
    // the "最新回合 IAA" value must not render a formatted alpha.
    await expect(page.locator('#currentAgreementValue')).not.toHaveText(/^\d/);

    await expect(page.locator('#publishOfficialRunBtn')).toBeDisabled();
    await expect(page.locator('#publishDryRunBtn')).toBeDisabled();
    await expect(page.locator('#publishActionRow')).toContainText('IAA 計算失敗，請重試計算');
  });

  test('retrying a failed computation moves it back to pending without changing task status or round count (FR-010o-4(3))', async ({
    page,
  }) => {
    await page.goto(`${TASK_DETAIL_URL}?task_id=${T018_ID}`);
    await expect(page.locator('#retryIaaComputationBtn')).toBeVisible();

    const roundCountBefore = await page
      .locator('#trialRoundTimeline .round-timeline-item')
      .count();

    await page.locator('#retryIaaComputationBtn').click();

    await expect(page.locator('#trialDecisionTitle')).toContainText('計算中');
    await expect(page.locator('#trialDecisionTitle')).not.toContainText('計算失敗');
    await expect(page.locator('#trialDecisionTitle')).not.toHaveText(ROUND_VERDICT_WORDS);

    await expect(page.locator('#publishOfficialRunBtn')).toBeDisabled();
    await expect(page.locator('#publishDryRunBtn')).toBeDisabled();
    await expect(page.locator('#publishActionRow')).toContainText('IAA 計算中，完成後才能開始正式標記');
    await expect(page.locator('#publishActionRow')).toContainText('IAA 計算中，完成後才能新增下一回合');

    // Retry MUST NOT transition the task or create a new round.
    await expect(page.locator('#statusBadge')).toContainText('待 IAA 確認');
    await expect(page.locator('#trialRoundTimeline .round-timeline-item')).toHaveCount(
      roundCountBefore,
    );
  });

  test('a reviewer never sees the retry-computation control (FR-010o-4(3) project_leader-only)', async ({
    page,
  }) => {
    await page.goto(`${TASK_DETAIL_URL}?task_id=${T018_ID}&task_role=reviewer`);

    // Positive assertion first: confirms T018 genuinely loaded under the
    // reviewer role rather than this test vacuously passing against the
    // #taskNotFound fallback (issue #200).
    await expect(page.locator('#statusBadge')).toContainText('待 IAA 確認');

    await expect(page.locator('#retryIaaComputationBtn')).toHaveCount(0);
    await expect(page.locator('#publishActionRow')).not.toContainText('重試計算');
  });

  test('an unable-to-compute round (done, De=0) is not blocked by the pending/failed gate (FR-010o-4(1), dataset/017 FR-039.4)', async ({
    page,
  }) => {
    // T015 already exercises the "無法計算" (cannot-compute) rendering via
    // issue-489-task-detail-iaa-derived.spec.ts; this override reuses that
    // same seed (design.md D7 -- no new fixture needed) purely to assert the
    // FR-010o-4 gate stays out of the way once the round is 'done'.
    await page.goto(`${TASK_DETAIL_URL}?task_id=T015&status=waiting_iaa_confirmation`);

    await expect(page.locator('#retryIaaComputationBtn')).toHaveCount(0);
    await expect(page.locator('#trialDecisionTitle')).not.toContainText('計算中');
    await expect(page.locator('#trialDecisionTitle')).not.toContainText('計算失敗');

    await expect(page.locator('#publishOfficialRunBtn')).toBeEnabled();
    await expect(page.locator('#publishDryRunBtn')).toBeEnabled();
  });
});
