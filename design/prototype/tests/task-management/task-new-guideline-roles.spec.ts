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
    await expect(page.locator('#samplingValueInput')).toHaveAttribute('type', 'number');
    await expect(page.locator('#samplingValueInput')).toHaveAttribute('inputmode', 'numeric');
    await expect(page.locator('#samplingHint')).toHaveClass(/tooltip-bubble/);
    await expect(page.locator('#samplingHint')).toHaveText('筆數需 >= 1 且 < 資料集總筆數');
    await expect(page.locator('#samplingHint')).toBeHidden();
    await expect(page.locator('#samplingValueHelp')).toHaveAttribute('aria-describedby', 'samplingHint');
    await page.locator('#samplingValueHelp').hover();
    await expect(page.locator('#samplingHint')).toBeVisible();
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
