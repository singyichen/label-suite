/*
 * Traceability: specs/task-management/014-task-detail/spec.md
 *   FR-008, FR-010f-2, FR-010f-3, FR-010p, FR-013, SC-019
 * Updated for issue #791 (task-detail-trial-round-from-waiting, tasks.md
 * 2.2, as rewritten in commit 9fb4450a): a second trial round can no longer
 * be created by clicking the add-round button a second time while
 * dry_run_in_progress -- that button is now disabled for the current round
 * (FR-013(1)). Reaching R2 requires first completing R1's dry-run progress
 * (FR-008a, via syncStatusFromDryRunProgress()) to land on
 * waiting_iaa_confirmation, then clicking the add-round button directly from
 * there (FR-013(2)) -- design.md's "範圍界線" places the FR-017
 * revision-note gate out of scope for #791 (issue #838), so no modal step
 * sits between the click and R2's creation.
 *
 * task-detail.html has no cross-reload persistence of TASK_DATA itself, so
 * the fresh navigation to waiting_iaa_confirmation below does not carry R1's
 * real round forward; the sample-pool and round-history assertions after it
 * are against the round that navigation's own state produces (confirmed
 * against the live page), not a literal continuation of the R1 created
 * earlier in this test.
 */
import { test, expect, type Page } from '@playwright/test';

const TASK_DETAIL_URL = '/pages/task-management/task-detail.html?task_id=T001';

async function publishDryRunRound(page: Page) {
  await page.locator('#publishDryRunBtn').click();
  const riskModal = page.locator('#riskModal');
  if (await riskModal.isVisible()) {
    await page.locator('#riskConfirmBtn').click();
  }
}

test('keeps the 4-stage stepper while showing R1 into a waiting-confirmation-gated R2 (#791)', async ({ page }) => {
  await page.goto(TASK_DETAIL_URL);

  await expect(page.locator('#statusStepper .step-label-wrap')).toHaveText([
    '草稿',
    '試標階段',
    '正式標記中',
    '已完成',
  ]);

  await expect(page.locator('#trialRoundTimeline .round-timeline-item')).toHaveCount(0);
  await expect(page.locator('#roundHistoryTitle')).toHaveText('試標回合歷程');
  await expect(page.locator('#roundHistoryHint')).toHaveText('每個回合使用新的抽樣樣本；通過的回合會解鎖正式標記。');
  await expect(page.locator('#trialRoundTimeline')).toContainText('尚未建立任何試標回合');
  await expect(page.locator('#trialDecisionCard')).toHaveCount(0);
  await expect(page.locator('#executionStageTitle')).toHaveCount(0);
  await expect(page.locator('#executionStageDesc')).toHaveCount(0);
  await expect(page.locator('.exec-stage-banner #trialDecisionTitle')).toHaveText('尚未建立試標回合');
  await expect(page.locator('.exec-stage-banner #trialDecisionDesc')).toHaveText('先建立第一個試標回合，確認一致性門檻是否合理，再決定是否進入正式標記。');

  const stopRow = page.locator('#execStopRow');
  const dryRunBtn = page.locator('#publishDryRunBtn');
  await expect(dryRunBtn).toHaveText('新增試標回合 R1');
  await expect(stopRow.locator('#publishDryRunBtn')).toHaveText('新增試標回合 R1');

  await publishDryRunRound(page);

  await expect(page.locator('#statusStepper .step-current .step-label-wrap')).toHaveText('試標階段');
  // FR-013(1)/D2: dry_run_in_progress no longer suggests adding the next
  // round -- that action is disabled until this round finishes.
  await expect(page.locator('.exec-stage-banner #trialDecisionTitle')).not.toHaveText('R1 未達標，建議新增下一個試標回合');
  await expect(page.locator('#trialRoundTimeline .round-timeline-item')).toHaveCount(1);
  await expect(page.locator('#trialRoundTimeline .round-timeline-item').first()).toContainText('R1');
  await expect(page.locator('#trialRoundTimeline .round-status-badge').first()).toHaveText('未通過');
  await expect(page.locator('#splitLegendDynamic')).toContainText('R1 1筆');
  await expect(page.locator('#splitLegendDynamic')).toContainText('正式 4筆');

  await expect(page.locator('#publishDryRunBtn')).toBeDisabled();
  await expect(page.locator('#publishActionRow')).toContainText('本回合全部提交並完成 IAA 後才能新增下一回合');
  await expect(page.locator('#publishActionRow button')).toHaveCount(1);

  // R1 can only be advanced past dry_run_in_progress once its dry-run
  // progress is fully submitted (FR-008a), which flips the task into
  // waiting_iaa_confirmation -- the only state R2 can be created from
  // (FR-013(2)). Load that state directly (design.md D3's second documented
  // technique) rather than re-clicking the now-disabled button.
  await page.goto(`${TASK_DETAIL_URL}&status=waiting_iaa_confirmation`);
  await expect(page.locator('#statusBadge')).toContainText('待 IAA 確認');
  await expect(page.locator('#trialRoundTimeline .round-timeline-item')).toHaveCount(1);
  await expect(page.locator('#splitLegendDynamic')).toContainText('R1 1筆');
  await expect(page.locator('#splitLegendDynamic')).toContainText('正式 4筆');

  await publishDryRunRound(page);

  // FR-013(2): R2 is created directly, no revision-note modal in between
  // (out of scope for #791, see design.md "範圍界線").
  await expect(page.locator('#trialRoundTimeline .round-timeline-item')).toHaveCount(1);
  await expect(page.locator('#trialRoundTimeline .round-timeline-item').first()).toContainText('R2');
  await expect(page.locator('#splitLegendDynamic')).toContainText('R2 1筆');
  await expect(page.locator('#splitLegendDynamic')).toContainText('正式 4筆');

  // FR-013(3): must land in dry_run_in_progress, never jump straight back
  // to waiting_iaa_confirmation -- R2's scripted IAA result is 'passed'
  // (getTrialRoundScenario(2)), which is exactly the :10096 branch this
  // change removes.
  await expect(page.locator('#statusBadge')).toContainText('試標進行中');
  await expect(page.locator('#publishDryRunBtn')).toBeDisabled();
  // See issue-791-trial-round-from-waiting.spec.ts for why this reads "R2"
  // and not "R3": renderPublishActions() labels the button from
  // getTrialRounds().length + 1 (task-detail.html:5991), and the reload
  // needed to reach waiting_iaa_confirmation drops the real R1 entry, so
  // TASK_DATA.trialRounds holds only the just-created R2 at this point.
  await expect(page.locator('#publishDryRunBtn')).toHaveText('新增試標回合 R2');
  await expect(page.locator('#publishActionRow')).toContainText('本回合全部提交並完成 IAA 後才能新增下一回合');
});
