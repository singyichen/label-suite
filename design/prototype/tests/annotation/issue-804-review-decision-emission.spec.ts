import { test, expect, type Page } from '@playwright/test';
import {
  assertNoPageErrors,
  dismissGuidelineModal,
  gotoReviewerWorkspace,
  skipGuidelineModal,
  trackPageErrors,
} from './_workspace-helpers';

/* issue #719 (merged before this file was written): a non-finalizing review
 * submit calls advanceToNextActionableReviewUnit() -> selectSample(), which
 * can move `currentIdentity.annotatorId` to a DIFFERENT review unit for the
 * same sample_id (annotation-workspace.config.js:4809-4818,4938) -- observed
 * directly here: after an unedited approve+modify+bypass submit on
 * T013/absa-001 (default identity, annotatorId=kioleemg12), the workspace
 * silently advanced to a second absa-001 review unit under a different demo
 * annotatorId. That unit has no history yet, so reading
 * #wsHistoryContainer right after the submit click would read the WRONG
 * unit's (empty) history and fail for a page-navigation reason, not the
 * emission-point defect this file exists to catch. Every test below
 * re-navigates back to the just-reviewed unit's own URL (identical params,
 * default identity resolution) before opening the history tab. */
async function returnToReviewedUnit(page: Page, taskId: string, sampleId: string) {
  await gotoReviewerWorkspace(page, { task_id: taskId, sample_id: sampleId, run_type: 'official_run' });
  await dismissGuidelineModal(page);
}

/* issue #804 (RED, group 1): appendReviewDecisionEvents() only ever emits a
 * history event for the `approve` decision -- its first line is a hard
 * `if (decisions[outKey] !== 'approve') return;`
 * (design/prototype/pages/annotation/annotation-workspace.data.js:405).
 * `modify` and `bypass` therefore write NO history event at all, and
 * `bypassed` has zero emission points anywhere under design/prototype/pages/.
 * `modified`'s only current trigger is "approve AND the value changed" --
 * the v5.0.0-superseded semantics.
 *
 * Canonical contract asserted here (verify with `sed -n '<line>p'` against
 * specs/annotation/015-annotation-workspace/spec.md before trusting this
 * paraphrase):
 *
 *  - AC-2.21 (spec.md:257) -- v5.0.0 revision, quoted:
 *    "Given 審核員對某樣本一個 outKey 送出「通過」、對另一個 outKey 送出「修正」，
 *     When 檢視該樣本歷程頁籤，Then 清單分別出現一筆 accepted 事件與一筆 modified
 *     事件，兩者之 actor_id 皆為該審核員"
 *    -- and the same v5.0.0 revision note: "modified 事件之語意收緊——審核員之
 *     修正不立即生效...本條之事件產生與 actor_id 契約不變" i.e. the ONE
 *     decision -> ONE event mapping is what changed; the actor_id contract
 *     is untouched.
 *
 *  - FR-086 (spec.md:960) -- v5.0.0 revision, quoted: "`HISTORY_ACTIONS` 自
 *     七值改為九值——移除 rejected...新增 bypassed（無法判定決策之產生點，
 *     FR-092 第 3 點）...`modified` 之語意隨 FR-092 收緊：其產生點為審核員選擇
 *     修正，但該修正不立即生效，僅使該項進入爭議池。"
 *    i.e. FR-086 requires bypassed to have an emission point, and modified's
 *    emission point is the `modify` DECISION itself, not a value-diff.
 *
 *  - FR-092 (spec.md:966) -- the closed three-way decision set
 *    `REVIEW_DECISIONS = approve | modify | bypass`, one event class per
 *    decision (no reject).
 *
 *  - FR-097 (spec.md:971) -- every history event must carry the true actor's
 *    `actor_id` and role, so a reviewer's own decisions are attributable to
 *    them specifically, not folded into a generic "reviewer" role marker.
 *
 * Why this MUST be UI-driven, not data-seeded:
 * issue-596-history-chain.spec.ts:19-22 documents that its nine seed events
 * are written directly into the submission bucket via `seedBucket()` --
 * "bypassed / exception_resolved / excluded get their emission points in
 * groups 3 and 6, and AC-2.16 is about how the set RENDERS, not about who
 * writes it." That is exactly why that suite never caught this defect: it
 * never exercises appendReviewDecisionEvents() itself. This file's job is
 * the opposite -- prove the DATA-LAYER production point exists by driving a
 * real reviewer decision + `ws-review-submit-btn` click through the UI and
 * reading back what markSampleSubmitted() -> appendReviewDecisionEvents()
 * actually wrote, never touching localStorage directly for the event under
 * test.
 *
 * Task seed choice:
 *  - AC-2.21 needs at least two independent outKey decisions in the SAME
 *    submit so "one outKey approved, another modified" is a single event,
 *    not two separate submits. Of the 17 demo tasks in
 *    design/prototype/pages/task-management/task-detail.data.js, only T013
 *    (absa-001) has more than one output type: entity_recognition +
 *    relation_identification (merged into one `ws-review-row` by FR-014N)
 *    plus multi_dim (its own row) -- three outKeys total, already exercised
 *    this way by the existing
 *    issue-596-review-three-way.spec.ts:218-253 ("同一單位内，通過的 outKey
 *    不受其他 outKey 缺理由拖累") test, which also opens T013/absa-001
 *    directly as reviewer with no prior annotator submission and relies on
 *    the built-in FR-044a demo-row fallback (`demoAnnotatorRow()`) to seed
 *    the reviewed answer. This file follows that same established,
 *    already-green pattern rather than inventing a new task profile.
 *    Because T013 has three outKeys (not exactly two), the accepted-vs-
 *    modified test below decides the third outKey `bypass` -- so it never
 *    contributes an `accepted` or `modified` count, keeping those two
 *    counts exactly 1 each as AC-2.21 literally states ("一筆...一筆").
 *  - The `bypassed` production-point test and the `approve` test each reuse
 *    the same T013 seed for the former, and T001/sent-001 (single
 *    `single_label` output, the same task already used by
 *    issue-398-review-correction-decision-desync.spec.ts for exactly this
 *    "edit the correction then decide" interaction) for the latter, because
 *    isolating "approve after a value edit" needs only one outKey and T001
 *    is the simplest already-proven fixture for that interaction.
 */

async function openHistoryTab(page: Page) {
  await page.getByTestId('ws-guideline-tab-history').click();
}

function historyBadges(page: Page, action: string) {
  return page.locator(`#wsHistoryContainer .history-action-badge[data-action="${action}"]`);
}

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
});

test.describe('issue #804 / AC-2.21 / FR-086 / FR-092 / FR-097: 審核決策 → 歷程事件產生點', () => {
  test('T013/absa-001：一個 outKey 通過、另一個 outKey 修正 → 恰一筆 accepted 與恰一筆 modified，actor_id 皆為審核員', async ({ page }) => {
    const pageErrors = trackPageErrors(page);

    const reviewerId = await gotoReviewerWorkspace(page, { task_id: 'T013', sample_id: 'absa-001', run_type: 'official_run' });
    await dismissGuidelineModal(page);

    const rows = page.getByTestId('ws-review-row');
    await expect(rows).toHaveCount(2);
    const spanRow = rows.first(); // FR-014N merged entity_recognition + relation_identification
    const dimRow = rows.last(); // multi_dim

    // entity_recognition -> 通過 (approve)
    const entityGroup = spanRow.locator('.rv-merged-decision', { hasText: 'entity_recognition' });
    await entityGroup.getByTestId('ws-review-row-approve').click();

    // relation_identification -> 修正 (modify), reason required
    const relationGroup = spanRow.locator('.rv-merged-decision', { hasText: 'relation_identification' });
    await relationGroup.getByTestId('ws-review-row-modify').click();
    await spanRow.locator('[data-testid="ws-review-reason"][data-outkey="relation_identification"]').fill(
      '修正理由（issue #804 Red 測試）'
    );

    // multi_dim -> 無法判定 (bypass), so it contributes to neither accepted
    // nor modified and the two counts below stay exactly 1 each.
    await dimRow.getByTestId('ws-review-row-bypass').click();
    await dimRow.locator('[data-testid="ws-review-reason"][data-outkey="multi_dim"]').fill(
      '無法判定理由（issue #804 Red 測試）'
    );

    await page.getByTestId('ws-review-submit-btn').click();
    await expect(page.locator('#toastMsg')).toHaveText('審核已送出');
    await returnToReviewedUnit(page, 'T013', 'absa-001');

    await openHistoryTab(page);

    const accepted = historyBadges(page, 'accepted');
    await expect(accepted, 'AC-2.21: 通過的 outKey 必須恰產生一筆 accepted 事件').toHaveCount(1);
    const modified = historyBadges(page, 'modified');
    await expect(modified, 'AC-2.21 / FR-086: 修正的 outKey 必須恰產生一筆 modified 事件').toHaveCount(1);

    const acceptedCard = accepted.locator('xpath=ancestor::div[contains(@class,"history-item")]');
    await expect(acceptedCard.locator('.history-actor')).toHaveText(`審核員 · ${reviewerId}`);
    const modifiedCard = modified.locator('xpath=ancestor::div[contains(@class,"history-item")]');
    await expect(modifiedCard.locator('.history-actor')).toHaveText(`審核員 · ${reviewerId}`);

    assertNoPageErrors(pageErrors);
  });

  test('T013/absa-001：審核員選擇「無法判定」→ 必須產生 bypassed 歷程事件（FR-086，目前整個 pages/ 下無任何產生點）', async ({ page }) => {
    const pageErrors = trackPageErrors(page);

    const reviewerId = await gotoReviewerWorkspace(page, { task_id: 'T013', sample_id: 'absa-001', run_type: 'official_run' });
    await dismissGuidelineModal(page);

    const rows = page.getByTestId('ws-review-row');
    const spanRow = rows.first();
    const dimRow = rows.last();

    const entityGroup = spanRow.locator('.rv-merged-decision', { hasText: 'entity_recognition' });
    await entityGroup.getByTestId('ws-review-row-bypass').click();
    await spanRow.locator('[data-testid="ws-review-reason"][data-outkey="entity_recognition"]').fill(
      '無法判定理由（issue #804 Red 測試）'
    );

    const relationGroup = spanRow.locator('.rv-merged-decision', { hasText: 'relation_identification' });
    await relationGroup.getByTestId('ws-review-row-approve').click();

    await dimRow.getByTestId('ws-review-row-approve').click();

    await page.getByTestId('ws-review-submit-btn').click();
    await expect(page.locator('#toastMsg')).toHaveText('審核已送出');
    await returnToReviewedUnit(page, 'T013', 'absa-001');

    await openHistoryTab(page);

    const bypassed = historyBadges(page, 'bypassed');
    await expect(bypassed, 'FR-086: 無法判定決策必須恰產生一筆 bypassed 事件').toHaveCount(1);
    const bypassedCard = bypassed.locator('xpath=ancestor::div[contains(@class,"history-item")]');
    await expect(bypassedCard.locator('.history-actor')).toHaveText(`審核員 · ${reviewerId}`);

    assertNoPageErrors(pageErrors);
  });

  test('T001/sent-001：審核員直接修正答案值後仍點擊「通過」→ 必須寫入 accepted，不得因值變動寫入 modified', async ({ page }) => {
    const pageErrors = trackPageErrors(page);

    await gotoReviewerWorkspace(page, { task_id: 'T001', sample_id: 'sent-001', run_type: 'official_run' });
    await dismissGuidelineModal(page);

    // Same "edit the correction control before deciding" interaction as
    // issue-398-review-correction-decision-desync.spec.ts:47-55: pick
    // whichever chip is NOT already the seeded answer, so this genuinely
    // changes the value away from what the annotator (or demo fallback)
    // originally submitted -- that value-diff is exactly what the OLD,
    // pre-#804-fix comparison in appendReviewDecisionEvents() used to key
    // `modified` off of.
    const correction = page.getByTestId('ws-review-correct-single_label');
    const negativeChip = correction.getByTestId('ws-single-label-chip-negative');
    const positiveChip = correction.getByTestId('ws-single-label-chip-positive');
    const negativeAlreadyPressed = (await negativeChip.getAttribute('aria-pressed')) === 'true';
    const targetChip = negativeAlreadyPressed ? positiveChip : negativeChip;
    await targetChip.click();
    await expect(targetChip).toHaveAttribute('aria-pressed', 'true');

    const approveBtn = page.getByTestId('ws-review-row-approve');
    await approveBtn.click();
    await expect(approveBtn).toHaveAttribute('aria-pressed', 'true');

    await page.getByTestId('ws-review-submit-btn').click();
    await expect(page.locator('#toastMsg')).toHaveText('審核已送出');
    await returnToReviewedUnit(page, 'T001', 'sent-001');

    await openHistoryTab(page);

    const modified = historyBadges(page, 'modified');
    await expect(modified, 'AC-2.21 v5.0.0：通過決策不得因值變動而落為 modified').toHaveCount(0);
    const accepted = historyBadges(page, 'accepted');
    await expect(accepted, 'FR-092：一對一查表下，通過決策必須恰產生一筆 accepted').toHaveCount(1);

    assertNoPageErrors(pageErrors);
  });
});
