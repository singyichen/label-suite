import { test, expect } from '@playwright/test';

const TASK_DETAIL_URL = '/pages/task-management/task-detail.html';

test.describe('Task detail guideline edit state', () => {
  test('uses task-new step4-like edit UI in overview guideline section', async ({ page }) => {
    await page.goto(TASK_DETAIL_URL);

    await expect(page.locator('#guidelineSectionTitle')).toHaveText('標記說明');

    const editBtn = page.locator('#guidelineEditBtn');
    const saveBtn = page.locator('#guidelineSaveBtn');
    const cancelBtn = page.locator('#guidelineCancelBtn');

    await expect(editBtn).toBeVisible();
    await expect(editBtn).toBeEnabled();
    await expect(saveBtn).toHaveClass(/hidden/);
    await expect(cancelBtn).toHaveClass(/hidden/);

    await editBtn.click();

    await expect(page.locator('#guidelineSummaryView')).toHaveClass(/hidden/);
    await expect(page.locator('#guidelineEditForm')).not.toHaveClass(/hidden/);
    await expect(page.locator('#guidelineEditForm')).toContainText('說明內容');
    await expect(page.locator('#guidelineEditForm')).toContainText('上傳檔案');
    await expect(page.locator('#guidelineEditForm')).toContainText('開始標記前強制顯示');
  });
});
