import { test, expect } from '@playwright/test';

const TASK_NEW_URL = '/pages/task-management/task-new.html';

test.describe('Task new i18n', () => {
  test('translates task name placeholder and sidebar role in English mode', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('labelsuite.lang', 'en');
    });

    await page.goto(TASK_NEW_URL);

    await expect(page.locator('#langLabel')).toHaveText('EN');
    await expect(page.locator('#taskNameInput')).toHaveAttribute('placeholder', 'Example: News headline sentiment classification');
    await expect(page.locator('#roleIndicator')).toHaveText('User');
    await expect(page.locator('#taskNameInput')).not.toHaveAttribute('placeholder', /新聞標題情感分類/);
    await expect(page.locator('#roleIndicator')).not.toHaveText('一般使用者');
  });
});
