/*
 * Traceability: specs/task-management/014-task-detail/spec.md
 *   FR-015, FR-015a, FR-015b, FR-015b-1, FR-015b-2, FR-015b-3, FR-015b-4,
 *   FR-015c, FR-015c-1, FR-015c-2, FR-015c-3, FR-015d, FR-015d-1, FR-015d-3,
 *   FR-015e, FR-015g, FR-015h, FR-015i, FR-015i-2, FR-015i-3, FR-010i,
 *   FR-010i-1, SC-027, SC-027b, SC-027c, SC-027d, SC-027e, SC-027f, SC-032
 */
import fs from 'node:fs/promises';
import { test, expect } from '@playwright/test';

const TASK_DETAIL_URL = '/pages/task-management/task-detail.html';
/* First paint of the annotation-results panel can exceed the 5s expect default
   when the full suite saturates the shared HTTP server; match the other
   task-detail specs' panel-load allowance. */
const PANEL_LOAD_TIMEOUT = 15000;

/* Mock result sets are matched to each unified seed's annotation STRUCTURE
   (see ANNOTATION_RESULTS_BY_TASK in task-detail.html): classification → T001,
   VA scoring → T005, aspect → T007, relation → T008, pairs → T011, NER → T006. */
const TASK_RESULT_EXPECTATIONS = [
  { taskId: 'T001', statTexts: ['政治×2', '科技×3'] },
  { taskId: 'T005', statTexts: ['mean [7.33, 7.17]', 'std [1.07, 1.43]'] },
  { taskId: 'T007', statTexts: ['螢幕×3', '電池×2'] },
  { taskId: 'T008', statTexts: ['(DRUG:阿司匹靈)→treats→(SYMP:發燒) ×2', '(DOCTOR:醫師)→indicates→(TREATMENT:補水) ×2'] },
  { taskId: 'T011', statTexts: ['蘊含×2', '中立×1'] },
  { taskId: 'T006', statTexts: ['ORG×3', 'PER×3', 'LOC×3'] },
];

const EN_RESULT_EXPECTATIONS = [
  {
    taskId: 'T001',
    summaryTexts: ['Politics×2', 'Technology×3'],
    detailTexts: ['Politics, Technology', 'Technology'],
    hiddenTexts: ['政治', '科技'],
  },
  {
    taskId: 'T005',
    summaryTexts: ['mean [7.33, 7.17]', 'std [1.07, 1.43]'],
    detailTexts: ['[6, 5.5]', '[9, 9]'],
    hiddenTexts: [],
  },
  {
    taskId: 'T007',
    summaryTexts: ['Display×3', 'Battery×2'],
    detailTexts: ['Display, Battery', 'Display'],
    hiddenTexts: ['螢幕', '電池'],
  },
  {
    taskId: 'T008',
    summaryTexts: ['(DRUG:Aspirin)→treats→(SYMP:fever) ×2', '(DOCTOR:doctor)→indicates→(TREATMENT:hydration) ×2'],
    detailTexts: ['(DRUG:Aspirin)→treats→(SYMP:fever)', '(DOCTOR:doctor)→indicates→(TREATMENT:hydration)'],
    hiddenTexts: ['阿司匹靈', '發燒', '醫師', '補水'],
  },
  {
    taskId: 'T011',
    summaryTexts: ['Entailment×2', 'Neutral×1'],
    detailTexts: ['Entailment', 'Neutral'],
    hiddenTexts: ['蘊含', '中立'],
  },
  {
    taskId: 'T006',
    summaryTexts: ['ORG×3', 'PER×3', 'LOC×3'],
    detailTexts: ['ORG:TSMC, PER:Morris Chang, LOC:Taipei', 'MISC:semiconductor forum'],
    hiddenTexts: ['台積電', '張忠謀', '台北', '半導體產業論壇'],
  },
];

test.describe('Task detail annotation results', () => {
  test('translates result summaries and expanded result values in English mode', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('labelsuite.lang', 'en');
    });

    for (const expectation of EN_RESULT_EXPECTATIONS) {
      await page.goto(`${TASK_DETAIL_URL}?task_id=${expectation.taskId}&tab=annotation-results`);
      await expect(page.locator('html')).toHaveAttribute('lang', 'en', { timeout: PANEL_LOAD_TIMEOUT });
      await expect(page.locator('#arTableSection')).toBeVisible({ timeout: PANEL_LOAD_TIMEOUT });

      const firstRow = page.locator('#arResultTableBody tr.ar-summary-row').first();
      for (const summaryText of expectation.summaryTexts) {
        await expect(firstRow).toContainText(summaryText);
      }
      await firstRow.click();

      const resultTableBody = page.locator('#arResultTableBody');
      for (const detailText of expectation.detailTexts) {
        await expect(resultTableBody).toContainText(detailText);
      }
      for (const hiddenText of expectation.hiddenTexts) {
        await expect(resultTableBody).not.toContainText(hiddenText);
      }
    }
  });

  test('matches annotator select style with adjacent filter selects', async ({ page }) => {
    await page.goto(`${TASK_DETAIL_URL}?task_id=T005&tab=annotation-results`);
    await expect(page.locator('#arTableSection')).toBeVisible({ timeout: PANEL_LOAD_TIMEOUT });

    const stageMetrics = await page.locator('#arStageSelect').evaluate((element) => {
      const styles = window.getComputedStyle(element);
      return {
        borderRadius: styles.borderRadius,
        borderColor: styles.borderColor,
        backgroundColor: styles.backgroundColor,
        fontSize: styles.fontSize,
        lineHeight: styles.lineHeight,
        paddingTop: styles.paddingTop,
        paddingRight: styles.paddingRight,
        paddingBottom: styles.paddingBottom,
        paddingLeft: styles.paddingLeft,
        boxShadow: styles.boxShadow,
      };
    });

    const annotatorMetrics = await page.locator('#arAnnotatorSelect').evaluate((element) => {
      const styles = window.getComputedStyle(element);
      return {
        borderRadius: styles.borderRadius,
        borderColor: styles.borderColor,
        backgroundColor: styles.backgroundColor,
        fontSize: styles.fontSize,
        lineHeight: styles.lineHeight,
        paddingTop: styles.paddingTop,
        paddingRight: styles.paddingRight,
        paddingBottom: styles.paddingBottom,
        paddingLeft: styles.paddingLeft,
        boxShadow: styles.boxShadow,
      };
    });

    expect(annotatorMetrics).toEqual(stageMetrics);
  });

  test('uses token-driven inline chevrons for annotation result row expansion', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('label-suite-theme', 'dark');
    });

    await page.goto(`${TASK_DETAIL_URL}?task_id=T001&tab=annotation-results`);
    await expect(page.locator('#arTableSection')).toBeVisible({ timeout: PANEL_LOAD_TIMEOUT });
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    const expandButton = page.locator('#arResultTableBody tr.ar-summary-row').first().locator('.ar-expand-btn');
    await expect(expandButton.locator('img')).toHaveCount(0);
    await expect(expandButton.locator('svg')).toHaveCount(1);

    const chevronStyle = await expandButton.evaluate((button) => {
      const svg = button.querySelector('svg');
      const polyline = button.querySelector('polyline');
      if (!(svg instanceof SVGElement) || !(polyline instanceof SVGElement)) {
        return null;
      }

      return {
        buttonColor: window.getComputedStyle(button).color,
        svgStroke: svg.getAttribute('stroke'),
        polylinePoints: polyline.getAttribute('points'),
      };
    });

    expect(chevronStyle).toEqual({
      buttonColor: 'rgb(156, 163, 175)',
      svgStroke: 'currentColor',
      polylinePoints: '9 18 15 12 9 6',
    });
  });

  test('uses reviewer-style VA color coding for per-annotator result tags', async ({ page }) => {
    await page.goto(`${TASK_DETAIL_URL}?task_id=T005&tab=annotation-results`);
    await expect(page.locator('#arTableSection')).toBeVisible({ timeout: PANEL_LOAD_TIMEOUT });

    const firstRow = page.locator('#arResultTableBody tr.ar-summary-row').first();
    await firstRow.click();

    const firstSampleRows = page.locator('#arResultTableBody .annotator-row');
    await expect(firstSampleRows).toContainText([
      'kioleemg12',
      '113450022',
      'tony0950127',
      'hui',
      'chiao11',
      'mandy610425',
    ]);

    await expect(firstSampleRows.filter({ hasText: 'kioleemg12' }).locator('.annotator-result-tag')).toHaveClass(/result-tag-green/);
    await expect(firstSampleRows.filter({ hasText: 'chiao11' }).locator('.annotator-result-tag')).toHaveClass(/result-tag-blue/);
    await expect(firstSampleRows.filter({ hasText: 'mandy610425' }).locator('.annotator-result-tag')).toHaveClass(/result-tag-red/);
  });

  test('downloads full JSON export with manifest and VA task-specific fields', async ({ page }) => {
    await page.goto(`${TASK_DETAIL_URL}?task_id=T005&tab=annotation-results`);
    await expect(page.locator('#arTableSection')).toBeVisible({ timeout: PANEL_LOAD_TIMEOUT });

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
    expect(payload.manifest.iaa_method).toBeUndefined();
    expect(payload.manifest.applied_iaa_metrics).toEqual([
      { output_type: 'multi_dim', metric: 'ICC(2,1)', threshold: 0.8 },
    ]);
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
    await expect(page.locator('#arTableSection')).toBeVisible({ timeout: PANEL_LOAD_TIMEOUT });

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
    // ADR-029 outputs[] configs carry no legacy `subtype` field; the export
    // falls back to the entities branch with an empty subtype marker.
    expect(firstRow.sequence_labeling_subtype).toBe('');
    expect(firstRow.entities_summary).toContain('ORG:');
    expect(firstRow.review_status).toBeTruthy();
    expect(firstRow.valence).toBeUndefined();
  });

  test('includes export stage metadata and success toasts for annotation result exports', async ({ page }) => {
    await page.goto(`${TASK_DETAIL_URL}?task_id=T005&tab=annotation-results`);
    await expect(page.locator('#arTableSection')).toBeVisible({ timeout: PANEL_LOAD_TIMEOUT });

    await page.locator('#arStageSelect').selectOption('official');
    await page.locator('#arExportJsonBtn').click();
    await expect(page.locator('#toastMsg')).toContainText('已建立 JSON 匯出');
    const latestExportRow = page.locator('#arExportHistoryBody tr').first();
    await expect(latestExportRow).toContainText('正式標記');
    await expect(latestExportRow).toContainText('篩選匯出');
    await expect(latestExportRow.locator('.ar-export-action-btn')).toHaveAttribute('type', 'button');
    await expect(latestExportRow.locator('.ar-export-action-btn')).not.toHaveAttribute('onclick', /.+/);

    await page.locator('#arExportJsonMinBtn').click();
    await expect(page.locator('#toastMsg')).toContainText('已建立精簡 JSON 匯出');
  });

  test('parses negative VA ranges from stats summaries for color coding', async ({ page }) => {
    await page.goto(`${TASK_DETAIL_URL}?task_id=T005&tab=annotation-results`);
    await expect(page.locator('#arTableSection')).toBeVisible({ timeout: PANEL_LOAD_TIMEOUT });

    const parsed = await page.evaluate(() => {
      const pageWindow = window as Window & typeof globalThis & {
        parseVaRangeFromStatsSummary?: (statsSummary: string) => { minV: number; maxV: number; minA: number; maxA: number } | null;
      };
      return pageWindow.parseVaRangeFromStatsSummary
        ? pageWindow.parseVaRangeFromStatsSummary('mean : [0.50, 1.00] , std : [1.33, 1.50], ±1.5std V : -1.495~2.495, ±1.5std A : -1.250~3.250')
        : null;
    });

    expect(parsed).toEqual({
      minV: -1.495,
      maxV: 2.495,
      minA: -1.25,
      maxA: 3.25,
    });
  });

  test('renders reviewer-style readonly rows for NER tasks with six samples', async ({ page }) => {
    await page.goto(`${TASK_DETAIL_URL}?task_id=T006&tab=annotation-results`);
    await expect(page.locator('#arTableSection')).toBeVisible({ timeout: PANEL_LOAD_TIMEOUT });

    const table = page.locator('#arResultTable');
    await expect(page.locator('#arTableTitle')).toHaveText('標記結果表');
    await expect(table).toContainText('樣本 ID');
    await expect(table).toContainText('完成狀態');
    await expect(table).toContainText('標記階段');
    await expect(table).toContainText('標記分布統計');
    await expect(page.locator('#arPaginationBar')).toBeVisible();
    await expect(page.locator('#arPaginationInfo')).toHaveText('共 6 筆 · 第 1 / 1 頁');
    await expect(page.locator('#arPageSizeSelect')).toHaveValue('20');
    await expect(page.locator('#arPaginationControls [data-page].active')).toHaveText('1');

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
    await expect(detailRows.first().locator('.ar-review-badge .badge')).toHaveText('待審');
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
      const scroller = badge.closest('.table-scroll');
      if (!scroller) return false;
      const scrollerRect = scroller.getBoundingClientRect();
      return badgeRect.right <= scrollerRect.right - 4 && badgeRect.left >= scrollerRect.left;
    });
    expect(reviewBadgeVisible).toBe(true);
    await expect(page.locator('#arResultTableBody .reviewer-actions, #arResultTableBody .mini-btn')).toHaveCount(0);
  });

  test('keeps review badge visible for VA tasks and avoids stale summary meta block spacing', async ({ page }) => {
    await page.goto(`${TASK_DETAIL_URL}?task_id=T005&tab=annotation-results`);
    await expect(page.locator('#arTableSection')).toBeVisible({ timeout: PANEL_LOAD_TIMEOUT });

    const firstRow = page.locator('#arResultTableBody tr.ar-summary-row').first();
    await firstRow.click();

    await expect(page.locator('#arResultTableBody .ar-review-badge .badge').first()).toHaveText('待審');
    const vaBadgeVisible = await page.locator('#arResultTableBody .ar-review-badge').first().evaluate((badge) => {
      const badgeRect = badge.getBoundingClientRect();
      const table = badge.closest('table');
      if (!table) return false;
      const tableRect = table.getBoundingClientRect();
      return badgeRect.right <= tableRect.right - 4 && badgeRect.width > 40;
    });
    expect(vaBadgeVisible).toBe(true);

    const summaryTextCompact = await firstRow.locator('.ar-summary-cell').evaluate((cell) => {
      const summaryText = cell.querySelector('.ar-summary-text');
      const summaryTitle = cell.querySelector('.ar-summary-title');
      if (!(summaryText instanceof HTMLElement) || !(summaryTitle instanceof HTMLElement)) {
        return { display: '', isTopAligned: false };
      }

      const style = window.getComputedStyle(summaryText);
      const cellRect = cell.getBoundingClientRect();
      const titleRect = summaryTitle.getBoundingClientRect();
      return {
        display: style.display,
        isTopAligned: Math.abs(titleRect.top - cellRect.top) <= 16,
      };
    });
    expect(summaryTextCompact.display).toBe('block');
    expect(summaryTextCompact.isTopAligned).toBe(true);
  });

  test('checks summary and review-badge layout across every task type', async ({ page }) => {
    for (const expectation of TASK_RESULT_EXPECTATIONS) {
      await page.goto(`${TASK_DETAIL_URL}?task_id=${expectation.taskId}&tab=annotation-results`);
      await expect(page.locator('#arTableSection')).toBeVisible({ timeout: PANEL_LOAD_TIMEOUT });

      const firstRow = page.locator('#arResultTableBody tr.ar-summary-row').first();
      await firstRow.click();

      const summaryTextCompact = await firstRow.locator('.ar-summary-cell').evaluate((cell) => {
        const summaryText = cell.querySelector('.ar-summary-text');
        const summaryTitle = cell.querySelector('.ar-summary-title');
        if (!(summaryText instanceof HTMLElement) || !(summaryTitle instanceof HTMLElement)) {
          return { display: '', childCount: 0, height: 0, isTopAligned: false };
        }

        const style = window.getComputedStyle(summaryText);
        const cellRect = cell.getBoundingClientRect();
        const titleRect = summaryTitle.getBoundingClientRect();
        return {
          display: style.display,
          childCount: summaryText.children.length,
          height: cell.getBoundingClientRect().height,
          isTopAligned: Math.abs(titleRect.top - cellRect.top) <= 16,
        };
      });
      expect(summaryTextCompact.display).toBe('block');
      expect(summaryTextCompact.childCount).toBe(1);
      expect(summaryTextCompact.isTopAligned).toBe(true);

      const reviewBadgesVisible = await page.locator('#arTableSection .table-scroll').evaluate((scroller) => {
        const scrollerRect = scroller.getBoundingClientRect();
        const badges = Array.from(scroller.querySelectorAll('#arResultTableBody .ar-review-badge'));
        return badges.every((badge) => {
          const rect = badge.getBoundingClientRect();
          return rect.left >= scrollerRect.left && rect.right <= scrollerRect.right - 2 && rect.width > 40;
        });
      });
      expect(reviewBadgesVisible).toBe(true);

      const detailRowsFitTable = await page.locator('#arTableSection .table-scroll').evaluate((scroller) => {
        const scrollerRect = scroller.getBoundingClientRect();
        const rows = Array.from(scroller.querySelectorAll('#arResultTableBody .annotator-row'));
        return rows.every((row) => {
          const rect = row.getBoundingClientRect();
          return rect.left >= scrollerRect.left && rect.right <= scrollerRect.right - 2;
        });
      });
      expect(detailRowsFitTable).toBe(true);
    }
  });

  for (const expectation of TASK_RESULT_EXPECTATIONS) {
    test(`renders task-specific distribution summary for ${expectation.taskId}`, async ({ page }) => {
      await page.goto(`${TASK_DETAIL_URL}?task_id=${expectation.taskId}&tab=annotation-results`);
      await expect(page.locator('#arTableSection')).toBeVisible({ timeout: PANEL_LOAD_TIMEOUT });
      const firstRow = page.locator('#arResultTableBody tr.ar-summary-row').first();
      for (const statText of expectation.statTexts) {
        await expect(firstRow).toContainText(statText);
      }
    });
  }
});
