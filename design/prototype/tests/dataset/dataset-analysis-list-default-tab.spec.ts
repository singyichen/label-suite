import { test, expect } from '@playwright/test';

const DATASET_ANALYSIS_URL = '/pages/dataset/dataset-analysis-list.html';

test.describe('Dataset analysis list detail default tab', () => {
  test('uses dataset-analysis copy for the sidebar entry and page title', async ({ page }) => {
    await page.goto(DATASET_ANALYSIS_URL);

    await expect(page.locator('#navDataset')).toHaveText('資料集分析');
    await expect(page.locator('#pageTitle')).toHaveText('資料集分析');
  });

  test('opens stats overview tab by default when entering a dataset analysis item', async ({ page }) => {
    await page.goto(DATASET_ANALYSIS_URL);

    const firstRow = page.locator('#taskTableBody tr.task-row').first();
    await firstRow.click();

    await page.waitForURL(/dataset-analysis-detail\.html\?task_id=.*(?:&|$)/);
    await expect(page.locator('#tabStats')).toHaveClass(/active/);
    await expect(page.locator('#tabQuality')).not.toHaveClass(/active/);
  });
});
