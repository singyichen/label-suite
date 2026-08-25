/*
 * Traceability: specs/task-management/014-task-detail/spec.md
 *   FR-015f, FR-015g, FR-015h
 */
import fs from 'node:fs/promises';
import { test, expect } from '@playwright/test';

const TASK_DETAIL_URL = '/pages/task-management/task-detail.html';
const PANEL_LOAD_TIMEOUT = 15000;

/* Issue #284: getAnnotationResultsData() used to fall back to
 * ANNOTATION_RESULTS_BY_TASK.T001 whenever TASK_DATA.taskId had no entry in
 * the mock table -- silently showing T001's seed results (and export
 * content) for any other task, including real seeded tasks like T014-T017
 * (review-flow-demo, see task-list-review-flow-demo.spec.ts) that were never
 * added to ANNOTATION_RESULTS_BY_TASK. T014 exists in the task registry
 * (TASK_NOT_FOUND stays false) but has no AR seed entry, exercising exactly
 * this path without T999-style not-found handling (issue #200) kicking in
 * first. */

test.describe('Task detail annotation-results fallback (issue #284)', () => {
  test('a task with no AR seed entry shows the empty state, not T001 results', async ({ page }) => {
    await page.goto(`${TASK_DETAIL_URL}?task_id=T014&tab=annotation-results`);

    await expect(page.locator('#arEmptyState')).toBeVisible({ timeout: PANEL_LOAD_TIMEOUT });
    await expect(page.locator('#arTableSection')).toBeHidden();

    // T001's seed content must not leak through.
    await expect(page.locator('#arEmptyState')).toContainText('尚無標記結果');
    await expect(page.locator('body')).not.toContainText('政治×2');
    await expect(page.locator('body')).not.toContainText('醫療文本情感分類');
  });

  test('JSON export for a task with no AR seed entry contains no items, not T001 seed content', async ({ page }) => {
    await page.goto(`${TASK_DETAIL_URL}?task_id=T014&tab=annotation-results`);
    await expect(page.locator('#arEmptyState')).toBeVisible({ timeout: PANEL_LOAD_TIMEOUT });

    const downloadPromise = page.waitForEvent('download');
    await page.locator('#arExportJsonBtn').click();
    const download = await downloadPromise;
    const downloadPath = await download.path();
    expect(downloadPath).not.toBeNull();
    const payload = JSON.parse(await fs.readFile(downloadPath!, 'utf8'));

    expect(payload.manifest.task_id).toBe('T014');
    expect(Array.isArray(payload.items)).toBe(true);
    expect(payload.items).toHaveLength(0);
    expect(JSON.stringify(payload)).not.toContain('政治');
    expect(JSON.stringify(payload)).not.toContain('醫療文本情感分類');
  });

  test('JSON-MIN export for a task with no AR seed entry contains no rows, not T001 seed content', async ({ page }) => {
    await page.goto(`${TASK_DETAIL_URL}?task_id=T014&tab=annotation-results`);
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
