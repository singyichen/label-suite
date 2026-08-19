import { test, expect } from '@playwright/test';

const DETAIL_URL = '/pages/dataset/dataset-analysis-detail.html';

const TASK_IDS = ['T101', 'T102', 'T103', 'T104', 'T105'];

test.describe('Dataset analysis detail quality block order', () => {
  for (const taskId of TASK_IDS) {
    test(`renders risk assessment above consistency deviation for ${taskId}`, async ({ page }) => {
      await page.goto(`${DETAIL_URL}?task_id=${taskId}&tab=quality`);

      await expect(page.locator('#qualityPanelMount #annotatorTitle')).toBeVisible();

      const titles = await page.locator('#qualityReady .panel .panel-title').allTextContents();
      expect(titles).toContain('IAA 報告');
      expect(titles).toContain('異常偵測');
      expect(titles).toContain('標記員風險評估');
      expect(titles).toContain('標記一致性偏離分析');
      expect(titles.indexOf('標記員風險評估')).toBeGreaterThan(titles.indexOf('異常偵測'));
      expect(titles.indexOf('標記一致性偏離分析')).toBeGreaterThan(titles.indexOf('標記員風險評估'));
    });
  }

  test('SC-006B: entity_recognition partial-overlap F1 toggle does not change the IAA gate badge', async ({ page }) => {
    await page.goto(`${DETAIL_URL}?task_id=T106&tab=quality`);

    const badge = page.locator('#iaaSummaryBadge');
    await expect(badge).toHaveText('0/1 達標');

    await page.locator('#matchPartial').click();
    await expect(page.locator('#seqPartialCard')).toBeVisible();
    // Toggling the display-only partial-overlap F1 view must never flip the gate badge —
    // strict Span F1 is the only metric that gates pass/fail (SC-006B).
    await expect(badge).toHaveText('0/1 達標');

    await page.locator('#matchStrict').click();
    await expect(badge).toHaveText('0/1 達標');
  });
});
