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
 * the reload into waiting_iaa_confirmation below does not carry R1's real
 * round forward; the sample-pool and round-history assertions against that
 * state are against getTrialRounds()'s synthetic R1 fallback (confirmed
 * against the live page), not a literal continuation of the R1 created
 * earlier in this test. That reload writes a fully-submitted dry-run
 * progress and reloads into dry_run_in_progress so that
 * syncStatusFromDryRunProgress() actually fires (design.md D3's first
 * technique); D2 has it fill the fallback record with
 * getTrialRoundScenario(1)'s scripted result only at that transition, so
 * R1's badge reads 未通過 once waiting_iaa_confirmation is reached.
 * Creating R2 from there must materialize that fallback into
 * TASK_DATA.trialRounds alongside R2 (FR-013), so the post-creation
 * assertions expect both R1 and R2 in the round history.
 */
import { test, expect, type Page } from '@playwright/test';

const TASK_DETAIL_URL = '/pages/task-management/task-detail.html?task_id=T001';
const DRY_RUN_PROGRESS_KEY = 'labelsuite.prototypeDryRunProgress';
const TASK_ID = 'T001';

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
  // D2: the round record is written at publish time with only round
  // number/sample count/date -- agreement/std/result stay blank until
  // syncStatusFromDryRunProgress() fills them at the waiting_iaa_confirmation
  // transition below. An in-progress round must not show a pass/fail result
  // it hasn't earned yet.
  const r1Badge = page.locator('#trialRoundTimeline .round-status-badge').first();
  await expect(r1Badge).toHaveText('進行中');
  await expect(r1Badge).not.toHaveText('未通過');
  await expect(r1Badge).not.toHaveText('已通過');
  await expect(
    page.locator('#trialRoundTimeline .round-timeline-item').first().locator('.round-timeline-metrics')
  ).toContainText('IAA 無法計算');
  await expect(page.locator('#splitLegendDynamic')).toContainText('R1 1筆');
  await expect(page.locator('#splitLegendDynamic')).toContainText('正式 4筆');

  await expect(page.locator('#publishDryRunBtn')).toBeDisabled();
  await expect(page.locator('#publishActionRow')).toContainText('本回合全部提交並完成 IAA 後才能新增下一回合');
  await expect(page.locator('#publishActionRow button')).toHaveCount(1);

  // R1 can only be advanced past dry_run_in_progress once its dry-run
  // progress is fully submitted (FR-008a), which flips the task into
  // waiting_iaa_confirmation -- the only state R2 can be created from
  // (FR-013(2)). Write that completed progress and reload into
  // dry_run_in_progress (design.md D3's first documented technique) so that
  // syncStatusFromDryRunProgress() actually fires: D2 gates R1's scripted
  // IAA fill-in behind that same transition, so loading
  // waiting_iaa_confirmation directly (D3's second technique) would skip
  // the fill and cannot be used for the badge assertion below.
  await page.addInitScript(
    ({ key, taskId }) => {
      window.localStorage.setItem(
        key,
        JSON.stringify({ runType: 'dry_run', taskId, submittedSamples: 1, totalSamples: 1 })
      );
    },
    { key: DRY_RUN_PROGRESS_KEY, taskId: TASK_ID }
  );
  await page.goto(`${TASK_DETAIL_URL}&status=dry_run_in_progress`);
  await expect(page.locator('#statusBadge')).toContainText('待 IAA 確認');
  await expect(page.locator('#trialRoundTimeline .round-timeline-item')).toHaveCount(1);
  // D2: syncStatusFromDryRunProgress() fills the round's scripted IAA
  // outcome only once it transitions the task into waiting_iaa_confirmation
  // -- getTrialRoundScenario(1) is 'failed', so R1's badge now reads 未通過.
  await expect(page.locator('#trialRoundTimeline .round-status-badge').first()).toHaveText('未通過');
  await expect(page.locator('#splitLegendDynamic')).toContainText('R1 1筆');
  await expect(page.locator('#splitLegendDynamic')).toContainText('正式 4筆');

  await publishDryRunRound(page);

  // FR-013(2): R2 is created directly, no revision-note modal in between
  // (out of scope for #791, see design.md "範圍界線"). R1's round-history
  // entry must still be present: publishDryRun() has to materialize
  // getTrialRounds()'s synthetic R1 fallback into TASK_DATA.trialRounds
  // before pushing R2, not push R2 onto an empty array.
  await expect(page.locator('#trialRoundTimeline .round-timeline-item')).toHaveCount(2);
  await expect(page.locator('#trialRoundTimeline .round-timeline-item').nth(0)).toContainText('R1');
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
  // FR-013: the label is R{trial_round + 1}. With R1 and R2 both
  // materialized in TASK_DATA.trialRounds, the next round is R3.
  await expect(page.locator('#publishDryRunBtn')).toHaveText('新增試標回合 R3');
  await expect(page.locator('#publishActionRow')).toContainText('本回合全部提交並完成 IAA 後才能新增下一回合');
});
