import { test, expect } from '@playwright/test';

const TASK_DETAIL_URL = '/pages/task-management/task-detail.html';

test.describe('Task detail overview edit state', () => {
  test('hides draft-only hint text and uses simplified edit mode layout', async ({ page }) => {
    await page.goto(TASK_DETAIL_URL);

    const editBtn = page.locator('#overviewEditBtn');
    const saveBtn = page.locator('#overviewSaveBtn');
    const cancelBtn = page.locator('#overviewCancelBtn');

    await expect(editBtn).toBeEnabled();
    await expect(saveBtn).toHaveText('儲存');
    await expect(page.locator('#overviewPanel')).not.toContainText('僅 draft 狀態可編輯');

    await editBtn.click();

    await expect(page.locator('#basicInfoView')).toHaveClass(/hidden/);
    await expect(page.locator('#overviewEditForm')).not.toHaveClass(/hidden/);
    await expect(page.locator('#overviewReadonlyHint')).toHaveText('');
    await expect(page.locator('#editTaskNameLabel')).toContainText('*');
    await expect(page.locator('#editTaskTypeLabel')).toContainText('*');
    await expect(page.locator('#editDatasetLabel')).toContainText('*');

    const cancelBox = await cancelBtn.boundingBox();
    const saveBox = await saveBtn.boundingBox();
    expect(cancelBox).not.toBeNull();
    expect(saveBox).not.toBeNull();
    expect((cancelBox as { x: number }).x).toBeLessThan((saveBox as { x: number }).x);
  });
});
