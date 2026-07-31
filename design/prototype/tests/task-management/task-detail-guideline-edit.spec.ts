import { test, expect } from '@playwright/test';

const TASK_DETAIL_URL = '/pages/task-management/task-detail.html?task_role=project_leader&task_id=T001';

// Tab panels arrive via fetched partials and event bindings only attach after
// the last partial (#workLogPanel) lands; wait for it before interacting.
const PANEL_LOAD_TIMEOUT = 15000;

test.describe('Task detail guideline edit state', () => {
  test('uses task-new step4-like edit UI in overview guideline section', async ({ page }) => {
    await page.goto(TASK_DETAIL_URL);

    await page.locator('#workLogPanel').waitFor({ state: 'attached', timeout: PANEL_LOAD_TIMEOUT });
    await expect(page.locator('#guidelineSectionTitle')).toHaveText('標記說明');

    const editBtn = page.locator('#guidelineEditBtn');
    const saveBtn = page.locator('#guidelineSaveBtn');
    const cancelBtn = page.locator('#guidelineCancelBtn');

    await expect(editBtn).toBeVisible();
    await expect(editBtn).toBeEnabled();
    await expect(saveBtn).toHaveClass(/hidden/);
    await expect(cancelBtn).toHaveClass(/hidden/);

    await page.evaluate(() => {
      const button = document.getElementById('guidelineEditBtn') as HTMLButtonElement | null;
      button?.click();
    });

    await expect(page.locator('#guidelineSummaryView')).toHaveClass(/hidden/);
    await expect(page.locator('#guidelineEditForm')).not.toHaveClass(/hidden/);
    await expect(page.locator('#guidelineEditForm')).toContainText('提供給標記員');
    await expect(page.locator('#guidelineEditForm')).toContainText('標記說明內容');
    await expect(page.locator('#guidelineEditForm')).toContainText('提供給審核員');
    await expect(page.locator('#guidelineEditForm')).toContainText('審核說明內容');
    await expect(page.locator('#guidelineEditForm')).toContainText('開始標記前強制顯示');
    await expect(page.locator('#editAnnotatorGuidelineFileInput')).toHaveJSProperty('multiple', true);
    await expect(page.locator('#editReviewerGuidelineFileInput')).toHaveJSProperty('multiple', true);
  });

  test('uploads files for annotator and reviewer guideline sections', async ({ page }) => {
    await page.goto(TASK_DETAIL_URL);

    await page.locator('#workLogPanel').waitFor({ state: 'attached', timeout: PANEL_LOAD_TIMEOUT });
    await expect(page.locator('#guidelineEditBtn')).toBeEnabled();

    await page.evaluate(() => {
      const button = document.getElementById('guidelineEditBtn') as HTMLButtonElement | null;
      button?.click();
    });

    await expect(page.locator('#guidelineEditForm')).not.toHaveClass(/hidden/);

    await page.locator('#editAnnotatorGuidelineFileInput').setInputFiles({
      name: 'annotator-guide.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('annotator file'),
    });
    await page.evaluate(() => {
      const win = window as typeof window & {
        handleGuidelineFileInputChange?: (role: string, input: HTMLInputElement) => void;
      };
      const input = document.getElementById('editAnnotatorGuidelineFileInput') as HTMLInputElement | null;
      if (input && win.handleGuidelineFileInputChange) {
        win.handleGuidelineFileInputChange('annotator', input);
      }
    });

    await page.locator('#editReviewerGuidelineFileInput').setInputFiles({
      name: 'reviewer-guide.md',
      mimeType: 'text/markdown',
      buffer: Buffer.from('# reviewer'),
    });
    await page.evaluate(() => {
      const win = window as typeof window & {
        handleGuidelineFileInputChange?: (role: string, input: HTMLInputElement) => void;
      };
      const input = document.getElementById('editReviewerGuidelineFileInput') as HTMLInputElement | null;
      if (input && win.handleGuidelineFileInputChange) {
        win.handleGuidelineFileInputChange('reviewer', input);
      }
    });

    await expect(page.locator('#editAnnotatorGuidelineFileList')).toContainText('annotator-guide.pdf');
    await expect(page.locator('#editReviewerGuidelineFileList')).toContainText('reviewer-guide.md');
  });
});
