/*
 * Traceability: specs/task-management/014-task-detail/spec.md
 *   FR-005h, FR-005i
 * Issue #397: ANNOTATION_PROGRESS and WORK_LOG_ENTRIES are single
 * module-level structures never keyed by TASK_DATA.taskId, so the "標記進度"
 * and "工時紀錄" tabs apply the same generic demo data (total samples 124,
 * total annotated 270, ...) to every task regardless of its actual record
 * count. T014-T017 each ship only 5 dataset records, so the shared figures
 * are an obvious scale mismatch with the task overview's own "總筆數 5 筆".
 */
import { test, expect, type Page } from '@playwright/test';

const TASK_DETAIL_URL = '/pages/task-management/task-detail.html';
const PANEL_LOAD_TIMEOUT = 15000;

async function waitForBoot(page: Page) {
  await page.locator('#workLogPanel').waitFor({ state: 'attached', timeout: PANEL_LOAD_TIMEOUT });
}

test.describe('Task detail progress and work log are scoped per task (issue #397)', () => {
  test('T014 annotation-progress total sample count matches its own 5-record dataset, not the shared 124', async ({ page }) => {
    await page.goto(`${TASK_DETAIL_URL}?task_id=T014`);
    await waitForBoot(page);
    await page.locator('#tabAnnotationProgress').click();

    const total = await page.locator('#progressMetricTotalValue').textContent();
    expect(Number(total)).toBeLessThanOrEqual(5);
  });

  test('T014 work-log summary total annotated count matches its own dataset, not the shared 270', async ({ page }) => {
    await page.goto(`${TASK_DETAIL_URL}?task_id=T014`);
    await waitForBoot(page);
    await page.locator('#tabWorkLog').click();

    const total = await page.locator('#workLogSummaryAnnotatedValue').textContent();
    expect(Number(total)).toBeLessThanOrEqual(10);
  });
});
