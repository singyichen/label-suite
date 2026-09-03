/*
 * Traceability: specs/task-management/014-task-detail/spec.md
 *   FR-015f, FR-015g, FR-015h
 * Issue #393: ANNOTATION_RESULTS_BY_TASK only carried T001-T013, so the
 * "標記結果" panel showed the shared empty state for T014-T017 (the
 * review-flow demo tasks) even though their review journeys -- dry-run
 * quorum, single-reviewer approval, three-reviewer majority convergence,
 * and a two-reviewer tie -- are exactly what those tasks exist to
 * demonstrate.
 *
 * This spec does NOT reuse T014 as the "no AR seed" regression subject
 * that issue-284-annotation-results-fallback.spec.ts relies on -- once
 * T014 gets real seed data here, it can no longer stand in for "a
 * registered task with no ANNOTATION_RESULTS_BY_TASK entry". That
 * fallback guard is re-pointed at a runtime-injected synthetic task
 * (patchDataFile) in the same commit, so the issue #284 regression stays
 * covered without colliding with this seed addition.
 */
import { test, expect } from '@playwright/test';

const TASK_DETAIL_URL = '/pages/task-management/task-detail.html';
const PANEL_LOAD_TIMEOUT = 15000;

test.describe('Task detail annotation results for T014-T017 (issue #393)', () => {
  test('T014 (dry-run quorum demo) shows five result rows, not the empty state', async ({ page }) => {
    await page.goto(`${TASK_DETAIL_URL}?task_id=T014&tab=annotation-results`);

    await expect(page.locator('#arTableSection')).toBeVisible({ timeout: PANEL_LOAD_TIMEOUT });
    await expect(page.locator('#arEmptyState')).toBeHidden();
    await expect(page.locator('.ar-expand-btn')).toHaveCount(5);
  });

  test('T016 (three-reviewer majority demo) shows a finalized row for the converged majority sample', async ({ page }) => {
    await page.goto(`${TASK_DETAIL_URL}?task_id=T016&tab=annotation-results`);

    await expect(page.locator('#arTableSection')).toBeVisible({ timeout: PANEL_LOAD_TIMEOUT });
    await expect(page.locator('.ar-expand-btn')).toHaveCount(5);

    const majorityRow = page.locator('#arResultTableBody tr.ar-summary-row').filter({ hasText: 'ofm-04-majority-converged' });
    await majorityRow.locator('.ar-expand-btn').click();
    await expect(page.locator('.annotator-detail-row .badge-ar-finalized')).toBeVisible();
  });

  test('T017 (two-reviewer tie demo) shows a disputed row for the tied sample', async ({ page }) => {
    await page.goto(`${TASK_DETAIL_URL}?task_id=T017&tab=annotation-results`);

    await expect(page.locator('#arTableSection')).toBeVisible({ timeout: PANEL_LOAD_TIMEOUT });
    await expect(page.locator('.ar-expand-btn')).toHaveCount(5);

    const tieRow = page.locator('#arResultTableBody tr.ar-summary-row').filter({ hasText: 'oft-01-final-exception' });
    await tieRow.locator('.ar-expand-btn').click();
    await expect(page.locator('.annotator-detail-row .badge-ar-disputed')).toBeVisible();
  });
});
