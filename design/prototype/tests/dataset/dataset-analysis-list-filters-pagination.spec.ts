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

  test('search matches localized task type and role labels without throwing runtime errors', async ({ page }) => {
    await page.goto(DATASET_ANALYSIS_URL);

    await page.locator('#searchInput').fill('專案負責人');
    await expect(page.locator('#taskTableBody tr')).toHaveCount(2);
    await expect(page.locator('#taskTableBody')).toContainText('新聞標題多標籤分類');
    await expect(page.locator('#taskTableBody')).toContainText('醫療關係抽取（Entity / Triple）');

    await page.locator('#searchInput').fill('關係抽取');
    await expect(page.locator('#taskTableBody tr')).toHaveCount(1);
    await expect(page.locator('#taskTableBody')).toContainText('醫療關係抽取（Entity / Triple）');
  });

  test('limits visible numbered pagination buttons for large result sets', async ({ page }) => {
    await page.goto(DATASET_ANALYSIS_URL);

    await page.evaluate(() => {
      const runtime = window as typeof window & {
        state: {
          tasks: Array<{
            id: string;
            nameZh: string;
            nameEn: string;
            taskType: string;
            completionRate: number;
            iaaStatus: string;
            membershipRole: string;
          }>;
          page: number;
          pageSize: number;
        };
        render: () => void;
      };
      const seed = runtime.state.tasks[0];
      runtime.state.tasks = Array.from({ length: 240 }, (_, index) => ({
        ...seed,
        id: `PX-${index + 1}`,
        nameZh: `大量資料集分析 ${index + 1}`,
        nameEn: `Large Dataset Analysis ${index + 1}`,
      }));
      runtime.state.pageSize = 20;
      runtime.state.page = 6;
      runtime.render();
    });

    const numberedButtons = page.locator('#paginationControls [data-page]');
    await expect(numberedButtons).toHaveCount(7);
    await expect(numberedButtons.first()).toHaveText('1');
    await expect(numberedButtons.last()).toHaveText('12');
    await expect(page.locator('#paginationControls [data-page].active')).toHaveText('6');
  });

  test('debounces keyword search before syncing the URL', async ({ page }) => {
    await page.goto(DATASET_ANALYSIS_URL);

    await page.locator('#searchInput').fill('NER');
    await expect(page).not.toHaveURL(/keyword=NER/);

    await page.waitForTimeout(350);
    await expect(page).toHaveURL(/keyword=NER/);
  });
});
