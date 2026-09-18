/*
 * Traceability: specs/task-management/014-task-detail/spec.md
 *   FR-008, FR-010f-2, FR-010f-3, FR-010p, FR-013, SC-019
 * Updated for issue #791 (task-detail-trial-round-from-waiting, tasks.md
 * 2.2): a second trial round can no longer be created by clicking the
 * add-round button a second time while dry_run_in_progress -- that button
 * is now disabled for the current round (FR-013(1)). Reaching R2 requires
 * first completing R1's dry-run progress (FR-008a, via
 * syncStatusFromDryRunProgress()) to land on waiting_iaa_confirmation, then
 * creating R2 from there through the AC-3.12 revision-note gate.
 */
import { test, expect } from '@playwright/test';

const TASK_DETAIL_URL = '/pages/task-management/task-detail.html?task_id=T001';

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

  await dryRunBtn.click();

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
  // (FR-013(2)). Load that state directly (design.md D3's second
  // documented technique) rather than re-clicking the now-disabled button.
  await page.goto(`${TASK_DETAIL_URL}&status=waiting_iaa_confirmation`);
  await expect(page.locator('#statusBadge')).toContainText('待 IAA 確認');
  await expect(page.locator('#trialRoundTimeline .round-timeline-item')).toHaveCount(1);

  await page.locator('#publishDryRunBtn').click();

  // AC-3.12 (FR-017): creating R2 requires the revision-note gate. See
  // issue-791-trial-round-from-waiting.spec.ts for the dedicated coverage
  // of this gate's blocking behavior; here it is only cleared so the R2
  // creation and round-history/sample-pool assertions below can proceed.
  const revisionModal = page.locator('#trialRoundRevisionModal');
  await expect(revisionModal).toBeVisible();
  await page.locator('#trialRoundFindingsInput').fill('R1 顯示情緒界線案例分歧較大。');
  await page.locator('#trialRoundGuidelineChangeInput').fill('已於指引補充情緒界線案例的判定原則。');
  await page.locator('#trialRoundRevisionConfirmBtn').click();
  await expect(revisionModal).toBeHidden();

  await expect(page.locator('#trialRoundTimeline .round-timeline-item')).toHaveCount(2);
  await expect(page.locator('#trialRoundTimeline .round-timeline-item').nth(1)).toContainText('R2');
  await expect(page.locator('#splitLegendDynamic')).toContainText('R1 1筆');
  await expect(page.locator('#splitLegendDynamic')).toContainText('R2 1筆');
  await expect(page.locator('#splitLegendDynamic')).toContainText('正式 3筆');

  // FR-013(3): must land in dry_run_in_progress, never jump straight back
  // to waiting_iaa_confirmation -- R2's scripted IAA result is 'passed'
  // (getTrialRoundScenario(2)), which is exactly the :10096 branch this
  // change removes.
  await expect(page.locator('#statusBadge')).toContainText('試標進行中');
  await expect(page.locator('#publishDryRunBtn')).toBeDisabled();
  await expect(page.locator('#publishDryRunBtn')).toHaveText('新增試標回合 R3');
  await expect(page.locator('#publishActionRow')).toContainText('本回合全部提交並完成 IAA 後才能新增下一回合');
});
