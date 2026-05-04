import fs from 'node:fs/promises';
import { test, expect } from '@playwright/test';

const TASK_DETAIL_URL = '/pages/task-management/task-detail.html';

const TASK_RESULT_EXPECTATIONS = [
  { taskId: 'T001', statTexts: ['政治×2', '科技×3'] },
  { taskId: 'T002', statTexts: ['mean [4.83, 5.50]', 'std [1.03, 1.22]'] },
  { taskId: 'T003', statTexts: ['螢幕×3', '電池×2'] },
  { taskId: 'T004', statTexts: ['(DRUG:阿司匹靈)→treats→(SYMP:發燒) ×2', '(DOCTOR:醫師)→indicates→(TREATMENT:補水) ×2'] },
  { taskId: 'T005', statTexts: ['蘊含×2', '中立×1'] },
  { taskId: 'T006', statTexts: ['ORG×3', 'PER×3', 'LOC×3'] },
];

test.describe('Task detail annotation results', () => {
  test('downloads full JSON export with manifest and VA task-specific fields', async ({ page }) => {
    await page.goto(`${TASK_DETAIL_URL}?task_id=T002&tab=annotation-results`);
    await expect(page.locator('#arTableSection')).toBeVisible();

    await page.locator('#arStageSelect').selectOption('official');

    const downloadPromise = page.waitForEvent('download');
    await page.locator('#arExportJsonBtn').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.json$/);

    const downloadPath = await download.path();
    expect(downloadPath).not.toBeNull();
    const payload = JSON.parse(await fs.readFile(downloadPath!, 'utf8'));

    expect(payload.manifest.export_format).toBe('json');
    expect(payload.manifest.task_type).toBe('single_sentence_va_scoring');
    expect(payload.manifest.applied_filters.run_stage).toBe('official');
    expect(Array.isArray(payload.items)).toBe(true);
    expect(payload.items.length).toBeGreaterThan(0);
    expect(payload.items.every((item: { run_stage: string }) => item.run_stage === 'official')).toBe(true);

    const firstItem = payload.items[0];
    expect(firstItem.source_data.text).toBeTruthy();
    expect(Array.isArray(firstItem.annotations)).toBe(true);
    expect(firstItem.annotations[0].result.valence).toBeDefined();
    expect(firstItem.annotations[0].result.arousal).toBeDefined();
    expect(firstItem.annotations[0].result.labels).toBeUndefined();
  });

  test('downloads JSON-MIN export with task-specific NER summary fields', async ({ page }) => {
    await page.goto(`${TASK_DETAIL_URL}?task_id=T006&tab=annotation-results`);
    await expect(page.locator('#arTableSection')).toBeVisible();

    await page.locator('#arStageSelect').selectOption('official');

    const downloadPromise = page.waitForEvent('download');
    await page.locator('#arExportJsonMinBtn').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/json-min-.*\.json$/);

    const downloadPath = await download.path();
    expect(downloadPath).not.toBeNull();
    const payload = JSON.parse(await fs.readFile(downloadPath!, 'utf8'));

    expect(Array.isArray(payload)).toBe(true);
    expect(payload.length).toBeGreaterThan(0);
    expect(payload.every((row: { run_stage: string }) => row.run_stage === 'official')).toBe(true);

    const firstRow = payload[0];
    expect(firstRow.task_type).toBe('sequence_labeling');
    expect(firstRow.sequence_labeling_subtype).toBe('ner');
    expect(firstRow.entities_summary).toContain('ORG:');
    expect(firstRow.review_status).toBeTruthy();
    expect(firstRow.valence).toBeUndefined();
  });

  test('includes export stage metadata and success toasts for annotation result exports', async ({ page }) => {
    await page.goto(`${TASK_DETAIL_URL}?task_id=T002&tab=annotation-results`);
    await expect(page.locator('#arTableSection')).toBeVisible();

    await page.locator('#arStageSelect').selectOption('official');
    await page.locator('#arExportJsonBtn').click();
    await expect(page.locator('#toastMsg')).toContainText('已建立 JSON 匯出');
    await expect(page.locator('#arExportMeta')).toContainText('最近匯出：');
    await expect(page.locator('#arExportMeta')).toContainText('匯出階段：Official Run');

    await page.locator('#arExportJsonMinBtn').click();
    await expect(page.locator('#toastMsg')).toContainText('已建立精簡 JSON 匯出');
  });

  test('renders reviewer-style readonly rows for NER tasks with six samples', async ({ page }) => {
    await page.goto(`${TASK_DETAIL_URL}?task_id=T006&tab=annotation-results`);
    await expect(page.locator('#arTableSection')).toBeVisible();

    const table = page.locator('#arResultTable');
    await expect(page.locator('#arTableTitle')).toHaveText('標記結果表');
    await expect(table).toContainText('樣本 ID');
    await expect(table).toContainText('完成狀態');
    await expect(table).toContainText('標記階段');
    await expect(table).toContainText('標記分布統計');

    const summaryRows = page.locator('#arResultTableBody tr.ar-summary-row');
    await expect(summaryRows).toHaveCount(6);

    const firstRow = summaryRows.first();
    await expect(firstRow).toContainText('NER-001');
    await expect(firstRow).toContainText('正式標記');
    await expect(firstRow.locator('.badge-run-official')).toHaveCount(1);
    await expect(firstRow).toContainText('ORG×3');
    await expect(firstRow).toContainText('PER×3');
    await expect(firstRow).toContainText('LOC×3');

    await firstRow.click();
    const detailRows = page.locator('#arResultTableBody .annotator-row');
    await expect(detailRows).toHaveCount(3);
    await expect(detailRows.first()).toContainText('kioleemg12');
    await expect(detailRows.first()).toContainText('ORG:台積電');
    await expect(detailRows.first()).toContainText('待審核');
    const layoutOk = await page.locator('#arResultTable').evaluate((table) => {
      const tableRect = table.getBoundingClientRect();
      const badges = Array.from(table.querySelectorAll('.ar-review-badge'));
      return badges.every((badge) => badge.getBoundingClientRect().right <= tableRect.right + 1);
    });
    expect(layoutOk).toBe(true);
    const tagNotStretched = await page.locator('#arResultTableBody .annotator-result-tag').first().evaluate((tag) => {
      const tagRect = tag.getBoundingClientRect();
      const row = tag.closest('.annotator-row');
      if (!row) return false;
      const rowRect = row.getBoundingClientRect();
      return tagRect.width < rowRect.width * 0.7;
    });
    expect(tagNotStretched).toBe(true);
    const reviewBadgeVisible = await page.locator('#arResultTableBody .ar-review-badge').first().evaluate((badge) => {
      const badgeRect = badge.getBoundingClientRect();
      const table = badge.closest('table');
      if (!table) return false;
      const tableRect = table.getBoundingClientRect();
      return badgeRect.right <= tableRect.right - 4 && badgeRect.left >= tableRect.left;
    });
    expect(reviewBadgeVisible).toBe(true);
    await expect(page.locator('#arResultTableBody .reviewer-actions, #arResultTableBody .mini-btn')).toHaveCount(0);
  });

  test('keeps review badge visible for VA tasks and avoids stale summary meta block spacing', async ({ page }) => {
    await page.goto(`${TASK_DETAIL_URL}?task_id=T002&tab=annotation-results`);
    await expect(page.locator('#arTableSection')).toBeVisible();

    const firstRow = page.locator('#arResultTableBody tr.ar-summary-row').first();
    await firstRow.click();

    await expect(page.locator('#arResultTableBody .ar-review-badge').first()).toContainText('待審核');
    const vaBadgeVisible = await page.locator('#arResultTableBody .ar-review-badge').first().evaluate((badge) => {
      const badgeRect = badge.getBoundingClientRect();
      const table = badge.closest('table');
      if (!table) return false;
      const tableRect = table.getBoundingClientRect();
      return badgeRect.right <= tableRect.right - 4 && badgeRect.width > 40;
    });
    expect(vaBadgeVisible).toBe(true);

    const summaryTextCompact = await firstRow.locator('.ar-summary-text').evaluate((el) => {
      const style = window.getComputedStyle(el);
      return style.display === 'block';
    });
    expect(summaryTextCompact).toBe(true);
  });

  test('checks summary and review-badge layout across every task type', async ({ page }) => {
    for (const expectation of TASK_RESULT_EXPECTATIONS) {
      await page.goto(`${TASK_DETAIL_URL}?task_id=${expectation.taskId}&tab=annotation-results`);
      await expect(page.locator('#arTableSection')).toBeVisible();

      const firstRow = page.locator('#arResultTableBody tr.ar-summary-row').first();
      await firstRow.click();

      const summaryTextCompact = await firstRow.locator('.ar-summary-text').evaluate((el) => {
        const style = window.getComputedStyle(el);
        return {
          display: style.display,
          childCount: el.children.length,
          height: el.getBoundingClientRect().height,
        };
      });
      expect(summaryTextCompact.display).toBe('block');
      expect(summaryTextCompact.childCount).toBe(1);

      const reviewBadgesVisible = await page.locator('#arResultTable').evaluate((table) => {
        const tableRect = table.getBoundingClientRect();
        const badges = Array.from(table.querySelectorAll('#arResultTableBody .ar-review-badge'));
        return badges.every((badge) => {
          const rect = badge.getBoundingClientRect();
          return rect.left >= tableRect.left && rect.right <= tableRect.right - 2 && rect.width > 40;
        });
      });
      expect(reviewBadgesVisible).toBe(true);
    }
  });

  for (const expectation of TASK_RESULT_EXPECTATIONS) {
    test(`renders task-specific distribution summary for ${expectation.taskId}`, async ({ page }) => {
      await page.goto(`${TASK_DETAIL_URL}?task_id=${expectation.taskId}&tab=annotation-results`);
      await expect(page.locator('#arTableSection')).toBeVisible();
      const firstRow = page.locator('#arResultTableBody tr.ar-summary-row').first();
      for (const statText of expectation.statTexts) {
        await expect(firstRow).toContainText(statText);
      }
    });
  }
});
