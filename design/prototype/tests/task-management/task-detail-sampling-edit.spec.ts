import { test, expect } from '@playwright/test';

const TASK_DETAIL_URL = '/pages/task-management/task-detail.html';

test.describe('Task detail sampling edit state', () => {
  test('shows separated sampling section with view/edit mode', async ({ page }) => {
    await page.goto(TASK_DETAIL_URL);

    await expect(page.locator('#executionTitle')).toHaveText('任務狀態與執行控制');
    await expect(page.locator('#samplingTitle')).toHaveText('試標資料抽樣設定');

    const editBtn = page.locator('#samplingEditBtn');
    const saveBtn = page.locator('#samplingSaveBtn');
    const cancelBtn = page.locator('#samplingCancelBtn');

    await expect(editBtn).toBeVisible();
    await expect(editBtn).toBeEnabled();
    await expect(saveBtn).toBeHidden();
    await expect(cancelBtn).toBeHidden();
    await expect(page.locator('#samplingSummaryView')).toBeVisible();
    await expect(page.locator('#samplingEditForm')).toHaveClass(/hidden/);

    await editBtn.click();

    await expect(editBtn).toBeHidden();
    await expect(saveBtn).toBeVisible();
    await expect(cancelBtn).toBeVisible();
    await expect(page.locator('#samplingSummaryView')).toHaveClass(/hidden/);
    await expect(page.locator('#samplingEditForm')).not.toHaveClass(/hidden/);
    await expect(page.locator('#samplingModePercent')).toBeEnabled();
    await expect(page.locator('#samplingModeCount')).toBeEnabled();
    await expect(page.locator('#samplingValue')).toBeEnabled();
    await expect(page.locator('#isolationToggle')).toBeEnabled();
  });
});
