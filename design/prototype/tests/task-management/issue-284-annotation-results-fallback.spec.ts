/*
 * Traceability: specs/task-management/014-task-detail/spec.md
 *   FR-015f, FR-015g, FR-015h
 */
import fs from 'node:fs/promises';
import { test, expect, type Page } from '@playwright/test';
import { patchDataFile } from '../annotation/_workspace-helpers';

const TASK_DETAIL_URL = '/pages/task-management/task-detail.html';
const PANEL_LOAD_TIMEOUT = 15000;
const UNSEEDED_TASK_ID = 'T998';

/* Issue #284: getAnnotationResultsData() used to fall back to
 * ANNOTATION_RESULTS_BY_TASK.T001 whenever TASK_DATA.taskId had no entry in
 * the mock table -- silently showing T001's seed results (and export
 * content) for any other task, including real seeded tasks like T014-T017
 * (review-flow-demo, see task-list-review-flow-demo.spec.ts) that used to
 * have no entry there either.
 *
 * Issue #393 gave T014-T017 real ANNOTATION_RESULTS_BY_TASK entries, so
 * none of them can stand in for "a registered task with no AR seed entry"
 * any more. This spec instead injects a synthetic task (T998) at request
 * time via patchDataFile -- registered in both task-list.data.js and
 * task-detail.data.js's profiles so TASK_NOT_FOUND stays false (issue
 * #200 doesn't kick in first), but deliberately never added to
 * ANNOTATION_RESULTS_BY_TASK -- so the "registered but no AR seed" case
 * this regression guards keeps a real subject without editing any file
 * under pages/.
 */

async function seedUnseededTask(page: Page): Promise<void> {
  await patchDataFile(page, 'task-list.data.js', `
    window.LabelSuiteTaskListData.tasks.push({
      id: '${UNSEEDED_TASK_ID}',
      nameZh: '迴歸測試：無標記結果種子任務',
      nameEn: 'Regression: task with no annotation-results seed',
      sourceFile: 'regression-no-ar-seed.json',
      outputTypes: ['single_label'],
      runType: 'official_run',
      status: 'official_run_in_progress',
      updatedAt: '2026-08-25',
      canViewDetail: true,
      isMine: true,
      deletedAt: ''
    });
  `);
  await patchDataFile(page, 'task-detail.data.js', `
    window.LabelSuiteTaskDetailData.profiles.${UNSEEDED_TASK_ID} = {
      taskCategories: ['classification'],
      taskInputTypes: ['single_item'],
      outputs: [{
        type: 'single_label',
        config: { label_options: [{ name: 'positive', color: '#10B981' }, { name: 'negative', color: '#EC4899' }] }
      }],
      fieldRoleMap: { text: 'input', gold_label: 'output' },
      datasetFileName: 'regression-no-ar-seed.json',
      datasetRecords: [{ id: 'reg-01', text: '迴歸測試樣本文字。', gold_label: 'positive' }]
    };
  `);
}

test.describe('Task detail annotation-results fallback (issue #284)', () => {
  test('a task with no AR seed entry shows the empty state, not T001 results', async ({ page }) => {
    await seedUnseededTask(page);
    await page.goto(`${TASK_DETAIL_URL}?task_id=${UNSEEDED_TASK_ID}&tab=annotation-results`);

    await expect(page.locator('#arEmptyState')).toBeVisible({ timeout: PANEL_LOAD_TIMEOUT });
    await expect(page.locator('#arTableSection')).toBeHidden();

    // T001's seed content must not leak through.
    await expect(page.locator('#arEmptyState')).toContainText('尚無標記結果');
    await expect(page.locator('body')).not.toContainText('政治×2');
    await expect(page.locator('body')).not.toContainText('醫療文本情感分類');
  });

  test('JSON export for a task with no AR seed entry contains no items, not T001 seed content', async ({ page }) => {
    await seedUnseededTask(page);
    await page.goto(`${TASK_DETAIL_URL}?task_id=${UNSEEDED_TASK_ID}&tab=annotation-results`);
    await expect(page.locator('#arEmptyState')).toBeVisible({ timeout: PANEL_LOAD_TIMEOUT });

    const downloadPromise = page.waitForEvent('download');
    await page.locator('#arExportJsonBtn').click();
    const download = await downloadPromise;
    const downloadPath = await download.path();
    expect(downloadPath).not.toBeNull();
    const payload = JSON.parse(await fs.readFile(downloadPath!, 'utf8'));

    expect(payload.manifest.task_id).toBe(UNSEEDED_TASK_ID);
    expect(Array.isArray(payload.items)).toBe(true);
    expect(payload.items).toHaveLength(0);
    expect(JSON.stringify(payload)).not.toContain('政治');
    expect(JSON.stringify(payload)).not.toContain('醫療文本情感分類');
  });

  test('JSON-MIN export for a task with no AR seed entry contains no rows, not T001 seed content', async ({ page }) => {
    await seedUnseededTask(page);
    await page.goto(`${TASK_DETAIL_URL}?task_id=${UNSEEDED_TASK_ID}&tab=annotation-results`);
    await expect(page.locator('#arEmptyState')).toBeVisible({ timeout: PANEL_LOAD_TIMEOUT });

    const downloadPromise = page.waitForEvent('download');
    await page.locator('#arExportJsonMinBtn').click();
    const download = await downloadPromise;
    const downloadPath = await download.path();
    expect(downloadPath).not.toBeNull();
    const payload = JSON.parse(await fs.readFile(downloadPath!, 'utf8'));

    expect(Array.isArray(payload)).toBe(true);
    expect(payload).toHaveLength(0);
  });
});
