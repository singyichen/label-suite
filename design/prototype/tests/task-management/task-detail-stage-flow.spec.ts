/*
 * Traceability: specs/task-management/014-task-detail/spec.md
 *   FR-008, FR-010f-2, FR-010f-3, FR-010p, FR-013, SC-019
 */
import { test, expect } from '@playwright/test';

const TASK_DETAIL_URL = '/pages/task-management/task-detail.html?task_id=T001';

test('keeps the 4-stage stepper while showing a complete trial-to-official flow', async ({ page }) => {
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
  await expect(page.locator('.exec-stage-banner #trialDecisionTitle')).toHaveText('R1 未達標，建議新增下一個試標回合');
  await expect(page.locator('.exec-stage-banner #trialDecisionDesc')).toHaveText('目前僅使用了 1 筆試標樣本，仍可從未使用資料中抽新樣本進行下一回合。');
  await expect(page.locator('#trialRoundTimeline .round-timeline-item')).toHaveCount(1);
  await expect(page.locator('#trialRoundTimeline .round-timeline-item').first()).toContainText('R1');
  await expect(page.locator('#trialRoundTimeline .round-status-badge').first()).toHaveText('未通過');
  await expect(page.locator('#splitLegendDynamic')).toContainText('R1 1筆');
  await expect(page.locator('#splitLegendDynamic')).toContainText('正式 4筆');

  await page.locator('#publishDryRunBtn').click();

  await expect(page.locator('#trialRoundTimeline .round-timeline-item')).toHaveCount(2);
  await expect(page.locator('#trialRoundTimeline .round-timeline-item').nth(1)).toContainText('R2');
  await expect(page.locator('#trialRoundTimeline .round-status-badge').nth(1)).toHaveText('已通過');
  await expect(page.locator('#publishOfficialRunBtn')).toHaveText('開始正式標記');
  await expect(page.locator('#splitLegendDynamic')).toContainText('R1 1筆');
  await expect(page.locator('#splitLegendDynamic')).toContainText('R2 1筆');
  await expect(page.locator('#splitLegendDynamic')).toContainText('正式 3筆');

  await page.locator('#publishOfficialRunBtn').click();

  await expect(page.locator('#statusStepper .step-current .step-label-wrap')).toHaveText('正式標記中');
  await expect(page.locator('.exec-stage-banner #trialDecisionTitle')).toHaveText('正式標記進行中，共 3 筆');
  await expect(page.locator('#publishCompleteBtn')).toHaveText('標記完成');

  await page.locator('#publishCompleteBtn').click();

  await expect(page.locator('#statusStepper .step-current .step-label-wrap')).toHaveText('已完成');
  await expect(page.locator('.exec-stage-banner #trialDecisionTitle')).toHaveText('正式標記已完成，共 3 筆');
});
