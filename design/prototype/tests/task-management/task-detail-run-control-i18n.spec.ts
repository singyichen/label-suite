import { test, expect } from '@playwright/test';

const TASK_DETAIL_URL = '/pages/task-management/task-detail.html?task_id=TASK-014&status=dry_run_in_progress';

test('run control stepper and metric labels translate to english', async ({ page }) => {
  await page.goto(TASK_DETAIL_URL);

  await expect(page.locator('#executionTitle')).toHaveText('任務狀態與執行控制');
  await expect(page.locator('#statusStepper .step-label-wrap')).toHaveText([
    '草稿',
    '試標進行中',
    '待 IAA 確認',
    '正式標記中',
    '已完成',
  ]);

  await page.locator('#langToggle').click();

  await expect(page.locator('#executionTitle')).toHaveText('Task status and run control');
  await expect(page.locator('#statusStepper .step-label-wrap')).toHaveText([
    'Draft',
    'Dry run in progress',
    'Waiting IAA confirmation',
    'Official run in progress',
    'Completed',
  ]);
  await expect(page.locator('#trialRoundLabel')).toHaveText('Trial round');
  await expect(page.locator('#targetAgreementLabel')).toHaveText('Target IAA');
  await expect(page.locator('#currentAgreementLabel')).toHaveText('Current IAA');
  await expect(page.locator('#currentStdLabel')).toHaveText('Current standard deviation');
  await expect(page.locator('#stopConditionTitle')).toHaveText('Stop conditions');
});
