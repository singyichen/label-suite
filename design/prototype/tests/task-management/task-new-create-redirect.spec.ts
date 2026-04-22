import { test, expect } from '@playwright/test';

const TASK_NEW_URL = '/pages/task-management/task-new.html';

test.describe('Task new redirect', () => {
  test('redirects to task detail with task_id after create success', async ({ page }) => {
    await page.goto(TASK_NEW_URL);

    await page.evaluate(() => {
      // Use the same submit flow as UI click to validate redirect behavior.
      // @ts-expect-error Prototype page script exposes submitTask globally.
      submitTask();
    });

    await expect(page).toHaveURL(/\/pages\/task-management\/task-detail\.html\?task_id=[^&]+$/);
  });
});
