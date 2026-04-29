import { test, expect } from '@playwright/test';

const DATASET_ANALYSIS_URL = '/pages/dataset/dataset-analysis-list.html';

test.describe('Dataset analysis list task type labels', () => {
  test('uses standardized task type copy and per-task badge colors', async ({ page }) => {
    await page.goto(DATASET_ANALYSIS_URL);

    const cases = [
      {
        taskName: '新聞標題多標籤分類',
        badgeText: '單句分類（含多標籤）',
        className: /badge-task-type-single/,
        backgroundColor: 'rgb(236, 254, 255)',
      },
      {
        taskName: '情感 VA 雙維度評分',
        badgeText: '單句 VA 雙維度評分（Valence / Arousal）',
        className: /badge-task-type-scoring/,
        backgroundColor: 'rgb(250, 245, 255)',
      },
      {
        taskName: '產品評論序列標註（NER / Aspect）',
        badgeText: '序列標記（含 Aspect / NER）',
        className: /badge-task-type-sequence/,
        backgroundColor: 'rgb(255, 247, 237)',
      },
      {
        taskName: '醫療關係抽取（Entity / Triple）',
        badgeText: '關係抽取（Entity + Relation + Triple）',
        className: /badge-task-type-relation/,
        backgroundColor: 'rgb(236, 254, 255)',
      },
      {
        taskName: '句對相似度 / 蘊含判定',
        badgeText: '句對任務（相似度 / 蘊含）',
        className: /badge-task-type-pairs/,
        backgroundColor: 'rgb(236, 253, 245)',
      },
    ];

    for (const item of cases) {
      const row = page.locator('tbody tr').filter({ hasText: item.taskName }).first();
      const badge = row.locator('td').nth(1).locator('.badge');
      await expect(badge).toHaveText(item.badgeText);
      await expect(badge).toHaveClass(item.className);
      await expect(badge).toHaveCSS('background-color', item.backgroundColor);
    }
  });
});
