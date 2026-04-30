import { test, expect } from '@playwright/test';

const DATASET_ANALYSIS_URL = '/pages/dataset/dataset-analysis-list.html';

test.describe('Dataset analysis list filters and pagination', () => {
  test('provides task type, IAA status, search, and footer pagination controls', async ({ page }) => {
    await page.goto(DATASET_ANALYSIS_URL);

    await expect(page.locator('#taskTypeFilter')).toBeVisible();
    await expect(page.locator('#iaaStatusFilter')).toBeVisible();
    await expect(page.locator('#searchInput')).toBeVisible();

    await expect(page.locator('#paginationBar')).toBeVisible();
    await expect(page.locator('#paginationInfo')).toHaveText('共 6 筆 · 第 1 / 1 頁');

    const pageSizeOptions = page.locator('#pageSizeSelect option');
    await expect(pageSizeOptions).toHaveText(['20 筆/頁', '50 筆/頁', '100 筆/頁']);
  });

  test('filters the table by task type, IAA status, and search keyword', async ({ page }) => {
    await page.goto(DATASET_ANALYSIS_URL);

    await page.locator('#taskTypeFilter').selectOption('sequence_labeling');
    await expect(page.locator('#taskTableBody tr')).toHaveCount(2);
    await expect(page.locator('#taskTableBody')).toContainText('產品評論序列標註（NER / Aspect）');
    await expect(page.locator('#taskTableBody')).toContainText('NER 命名實體辨識');

    await page.locator('#taskTypeFilter').selectOption('');
    await page.locator('#iaaStatusFilter').selectOption('pending');
    await expect(page.locator('#taskTableBody tr')).toHaveCount(2);
    await expect(page.locator('#taskTableBody')).toContainText('情感 VA 雙維度評分');
    await expect(page.locator('#taskTableBody')).toContainText('句對相似度 / 蘊含判定');

    await page.locator('#iaaStatusFilter').selectOption('');
    await page.locator('#searchInput').fill('NER');
    await expect(page.locator('#taskTableBody tr')).toHaveCount(2);
    await expect(page.locator('#taskTableBody')).toContainText('產品評論序列標註（NER / Aspect）');
    await expect(page.locator('#taskTableBody')).toContainText('NER 命名實體辨識');
  });
});
