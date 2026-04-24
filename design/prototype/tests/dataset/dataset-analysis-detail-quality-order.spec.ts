import { test, expect } from '@playwright/test';

const DETAIL_URL = '/pages/dataset/dataset-analysis-detail.html';

const TASK_IDS = ['T001', 'T002', 'T003', 'T004', 'T005'];

test.describe('Dataset analysis detail quality block order', () => {
  for (const taskId of TASK_IDS) {
    test(`renders risk assessment above consistency deviation for ${taskId}`, async ({ page }) => {
      await page.goto(`${DETAIL_URL}?task_id=${taskId}&tab=quality`);

      await expect(page.locator('#qualityPanelMount #annotatorTitle')).toBeVisible();

      const titles = await page.locator('#qualityReady .panel .panel-title').allTextContents();
      expect(titles).toEqual([
        'IAA 報告',
        '異常偵測',
        '標記員風險評估',
        '標記一致性偏離分析',
      ]);
    });
  }
});
