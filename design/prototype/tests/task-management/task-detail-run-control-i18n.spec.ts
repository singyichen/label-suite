import { test, expect } from '@playwright/test';

const TASK_DETAIL_URL = '/pages/task-management/task-detail.html?task_id=TASK-014&status=dry_run_in_progress';

test('run control stepper and metric labels translate to english', async ({ page }) => {
  await page.goto(TASK_DETAIL_URL);

  await expect(page.locator('#executionTitle')).toHaveText('任務狀態與執行控制');
  await expect(page.locator('#statusStepper .step-label-wrap')).toHaveText([
    '草稿',
    '試標階段',
    '正式標記中',
    '已完成',
  ]);

  // #langToggle listener binds only after every tab panel fetch resolves;
  // #statusBadge leaves its static 草稿 text in the render pass after binding,
  // so this wait closes the click-before-bind race seen under CI load.
  await expect(page.locator('#statusBadge')).toHaveText('試標進行中');

  await page.locator('#langToggle').click();

  await expect(page.locator('#executionTitle')).toHaveText('Task status and run control');
  await expect(page.locator('#statusStepper .step-label-wrap')).toHaveText([
    'Draft',
    'Trial stage',
    'Official run in progress',
    'Completed',
  ]);
  await expect(page.locator('#trialRoundLabel')).toHaveText('Trial round');
  await expect(page.locator('#trialRoundsUsedLabel')).toHaveText('Trial rounds used');
  await expect(page.locator('#currentAgreementLabel')).toHaveText('Latest round IAA');
  await expect(page.locator('#officialPoolLabel')).toHaveText('Official pool');
  await expect(page.locator('#stopConditionTitle')).toHaveText('Stop conditions');
});
