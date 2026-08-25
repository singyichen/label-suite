/*
 * Traceability: specs/task-management/014-task-detail/spec.md
 *   FR-010s, SC-033
 * Issue #394: resetTaskData() never copies profile.minReviewers onto
 * TASK_DATA, so every task falls back to DEFAULT_TASK_DATA.minReviewers (1)
 * regardless of its seeded review model. T016 (three-reviewer majority
 * demo) seeds minReviewers: 3 and T017 (two-reviewer tie demo) seeds
 * minReviewers: 2 (task-detail.data.js:1113, :1160); the overview must
 * reflect those per-task values, not the global default.
 */
import { test, expect } from '@playwright/test';

const TASK_DETAIL_URL = '/pages/task-management/task-detail.html';

test.describe('Task detail review settings min-reviewers (issue #394)', () => {
  test('T016 overview shows the seeded 3-reviewer threshold, not the global default of 1', async ({ page }) => {
    await page.goto(`${TASK_DETAIL_URL}?task_id=T016`);

    await expect(page.locator('#valueMinReviewersControl')).toHaveText('3');
  });

  test('T017 overview shows the seeded 2-reviewer threshold, not the global default of 1', async ({ page }) => {
    await page.goto(`${TASK_DETAIL_URL}?task_id=T017`);

    await expect(page.locator('#valueMinReviewersControl')).toHaveText('2');
  });
});
