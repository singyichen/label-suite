import { test, expect } from '@playwright/test';

const TASK_DETAIL_URL = '/pages/task-management/task-detail.html';

test.describe('Task detail sampling edit state', () => {
  test('shows separated sampling section with view/edit mode', async ({ page }) => {
    await page.goto(TASK_DETAIL_URL);

    await expect(page.locator('#executionTitle')).toHaveText('任務狀態與執行控制');
    await expect(page.locator('#samplingTitle')).toHaveText('抽樣設定');

    const editBtn = page.locator('#samplingEditBtn');
    const saveBtn = page.locator('#samplingSaveBtn');
    const cancelBtn = page.locator('#samplingCancelBtn');

    await expect(editBtn).toBeVisible();
    await expect(editBtn).toBeEnabled();
    await expect(saveBtn).toBeHidden();
    await expect(cancelBtn).toBeHidden();
    await expect(page.locator('#samplingSummaryView')).toBeVisible();
    await expect(page.locator('#labelTrialRoundControl')).toHaveText('試標回合');
    await expect(page.locator('#valueTrialRoundControl')).not.toBeEmpty();
    await expect(page.locator('#samplingEditForm')).toHaveClass(/hidden/);

    await editBtn.click();

    await expect(editBtn).toBeHidden();
    await expect(saveBtn).toBeVisible();
    await expect(cancelBtn).toBeVisible();
    await expect(page.locator('#samplingSummaryView')).toHaveClass(/hidden/);
    await expect(page.locator('#samplingEditForm')).not.toHaveClass(/hidden/);
    await expect(page.locator('#samplingValue')).toBeEnabled();
    await expect(page.locator('#iaaMethodSelect')).toBeEnabled();
    await expect(page.locator('#samplingRoundInput')).toHaveCount(0);
    await expect(page.locator('#targetAgreementInput')).toBeEnabled();
    await expect(page.locator('#minAnnotatorsInput')).toBeEnabled();
    await expect(page.locator('#isolationToggle')).toBeEnabled();

    const firstRowFields = page.locator('#samplingEditForm .sampling-fields').first().locator('.field-group');
    await expect(firstRowFields).toHaveCount(2);
    await expect(firstRowFields.nth(0).locator('label')).toContainText('抽樣筆數');
    await expect(firstRowFields.nth(1).locator('label')).toContainText('最少標記者數');

    const secondRowFields = page.locator('#samplingEditForm .sampling-fields-advanced').first().locator('.field-group');
    await expect(secondRowFields).toHaveCount(2);
    await expect(secondRowFields.nth(0).locator('label')).toContainText('IAA 計算方式');
    await expect(secondRowFields.nth(1).locator('label')).toContainText('目標 IAA');

    const samplingBox = await firstRowFields.nth(0).boundingBox();
    const minAnnotatorsBox = await firstRowFields.nth(1).boundingBox();

    expect(samplingBox).not.toBeNull();
    expect(minAnnotatorsBox).not.toBeNull();
    expect(Math.abs((samplingBox?.y ?? 0) - (minAnnotatorsBox?.y ?? 0))).toBeLessThanOrEqual(2);
    expect(Math.abs(((samplingBox?.y ?? 0) + (samplingBox?.height ?? 0)) - ((minAnnotatorsBox?.y ?? 0) + (minAnnotatorsBox?.height ?? 0)))).toBeLessThanOrEqual(2);
  });
});
