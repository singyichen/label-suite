/*
 * Issue #889 regression contract for task-detail's annotation-progress IAA.
 *
 * Dashboard and Annotation List already derive IAA through the public
 * computeIaaAlpha() domain API. Task Detail must present the same result for
 * the selected dry/official stage instead of reading a second seeded value.
 * The seam case below changes that public result at the fixture boundary so
 * a replacement set of hardcoded task values cannot satisfy this contract.
 */
import { expect, test, type Locator, type Page } from '@playwright/test';
import {
  buildListUrl,
  patchDataFile,
  skipGuidelineModal,
  type RunType,
} from '../annotation/_workspace-helpers';

const DASHBOARD_URL = '/pages/dashboard/dashboard.html';
const TASK_DETAIL_URL = '/pages/task-management/task-detail.html';
const PANEL_LOAD_TIMEOUT = 15_000;

type Language = 'zh' | 'en';

const IAA_MATRIX = [
  {
    taskId: 'T014',
    runType: 'dry_run',
    progressStage: 'r1',
    summaryIaa: { zh: 'IAA 0.59', en: 'IAA 0.59' },
    detailIaa: { zh: '0.59', en: '0.59' },
  },
  {
    taskId: 'T015',
    runType: 'official_run',
    progressStage: 'official',
    summaryIaa: { zh: 'IAA 無法計算', en: 'IAA Not computable' },
    detailIaa: { zh: '無法計算', en: 'Not computable' },
  },
  {
    taskId: 'T016',
    runType: 'official_run',
    progressStage: 'official',
    summaryIaa: { zh: 'IAA 無法計算', en: 'IAA Not computable' },
    detailIaa: { zh: '無法計算', en: 'Not computable' },
  },
] as const satisfies ReadonlyArray<{
  taskId: string;
  runType: RunType;
  progressStage: string;
  summaryIaa: Record<Language, string>;
  detailIaa: Record<Language, string>;
}>;

async function ensureLanguage(
  page: Page,
  language: Language,
  toggle: Locator,
): Promise<void> {
  const expectedHtmlLang = language === 'zh' ? 'zh-TW' : 'en';
  const html = page.locator('html');
  if ((await html.getAttribute('lang')) !== expectedHtmlLang) {
    await toggle.click();
  }
  await expect(html).toHaveAttribute('lang', expectedHtmlLang);
}

async function openReviewerDashboard(page: Page): Promise<void> {
  await page.goto(DASHBOARD_URL);
  await page.locator('.scenario-pill[data-scenario="reviewer"]').click();
  await expect(page.getByTestId('reviewer-view')).toBeVisible();
}

async function openTaskDetailProgress(
  page: Page,
  taskId: string,
  progressStage: string,
): Promise<void> {
  await page.goto(
    `${TASK_DETAIL_URL}?task_id=${taskId}&tab=annotation-progress&ap_stage=${progressStage}`,
  );
  await page
    .locator('#workLogPanel')
    .waitFor({ state: 'attached', timeout: PANEL_LOAD_TIMEOUT });
  await expect(page.locator('#annotationProgressPanel')).not.toHaveClass(/hidden/);
  await expect(page.locator('#progressMetricIAAValue')).toBeVisible();
}

test.describe('Issue #889 — IAA stays consistent across task surfaces', () => {
  for (const language of ['zh', 'en'] as const) {
    test(`Dashboard and Annotation List expose the same ${language} IAA matrix`, async ({
      page,
    }) => {
      await skipGuidelineModal(page);
      await openReviewerDashboard(page);
      await ensureLanguage(page, language, page.getByTestId('lang-toggle'));

      for (const row of IAA_MATRIX) {
        const dashboardSummary = page.locator(
          `#reviewerTaskList [data-example-task-id="${row.taskId}"] .list-item-detail`,
        );
        await expect(dashboardSummary).toContainText(row.summaryIaa[language]);
      }

      for (const row of IAA_MATRIX) {
        await page.goto(
          buildListUrl({
            task_id: row.taskId,
            role: 'reviewer',
            run_type: row.runType,
          }),
        );
        await ensureLanguage(page, language, page.locator('#langToggle'));
        await expect(page.locator('#taskInfoDetail')).toContainText(
          row.summaryIaa[language],
        );
      }
    });

    test(`Task Detail Annotation Progress matches the ${language} IAA matrix`, async ({
      page,
    }) => {
      for (const row of IAA_MATRIX) {
        await openTaskDetailProgress(page, row.taskId, row.progressStage);
        await ensureLanguage(page, language, page.locator('#langToggle'));
        await expect.soft(
          page.locator('#progressMetricIAAValue'),
          `${row.taskId} ${language} IAA must match the shared domain result`,
        ).toHaveText(row.detailIaa[language]);
      }
    });
  }

  test('Task Detail follows computeIaaAlpha and uses the selected stage run type', async ({
    page,
  }) => {
    await patchDataFile(page, 'annotation-workspace.data.js', `
      var data = window.LabelSuiteAnnotationWorkspaceData;
      var computeIaaAlpha = data.computeIaaAlpha;
      data.computeIaaAlpha = function(taskId, runType, outKey) {
        if (taskId === 'T014' && runType === 'dry_run' && outKey === 'single_label') {
          return {
            computable: true,
            outKey: outKey,
            alpha: 0.42,
            observed: 1,
            expected: 2,
            units: 5,
            values: 15,
            raters: 3
          };
        }
        if (taskId === 'T016' && runType === 'dry_run' && outKey === 'single_label') {
          return {
            computable: true,
            outKey: outKey,
            alpha: 0.13,
            observed: 1,
            expected: 1.15,
            units: 2,
            values: 4,
            raters: 2
          };
        }
        if (taskId === 'T016' && runType === 'official_run' && outKey === 'single_label') {
          return {
            computable: false,
            reason: 'insufficient_samples',
            outKey: outKey,
            units: 0,
            values: 0
          };
        }
        return computeIaaAlpha(taskId, runType, outKey);
      };
    `);

    await openTaskDetailProgress(page, 'T014', 'r1');
    await expect.soft(
      page.locator('#progressMetricIAAValue'),
      'T014 progress IAA must follow the patched dry_run domain result',
    ).toHaveText('0.42');

    await openTaskDetailProgress(page, 'T016', 'official');
    await expect.soft(
      page.locator('#progressMetricIAAValue'),
      'T016 progress IAA must request official_run rather than dry_run',
    ).toHaveText('無法計算');
  });
});
