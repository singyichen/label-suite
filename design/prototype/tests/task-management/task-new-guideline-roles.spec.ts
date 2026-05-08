import { test, expect } from '@playwright/test';

const TASK_NEW_URL = '/pages/task-management/task-new.html';

test.describe('Task new startup and guideline roles', () => {
  test('step 3 and step 4 match updated startup and role guideline requirements', async ({ page }) => {
    await page.goto(TASK_NEW_URL);

    await page.evaluate(() => {
      const win = window as typeof window & { showStep: (step: number) => void };
      win.showStep(3);
    });

    await expect(page.locator('#samplingValueLabel')).toHaveText('每回合抽樣筆數');
    await expect(page.locator('#samplingDistWrap')).toBeHidden();

    await page.evaluate(() => {
      const win = window as typeof window & { showStep: (step: number) => void };
      win.showStep(4);
    });

    await expect(page.locator('#labelAnnotatorGuideline')).toHaveText('標記說明內容');
    await expect(page.locator('#labelAnnotatorGuidelineUpload')).toHaveText('上傳檔案');
    await expect(page.locator('#labelReviewerGuideline')).toHaveText('審核說明內容');
    await expect(page.locator('#labelReviewerGuidelineUpload')).toHaveText('上傳檔案');
    await expect(page.locator('#annotatorGuidelineFileInput')).toHaveJSProperty('multiple', true);
    await expect(page.locator('#reviewerGuidelineFileInput')).toHaveJSProperty('multiple', true);
  });
});
