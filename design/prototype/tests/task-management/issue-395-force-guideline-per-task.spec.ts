/*
 * Traceability: specs/task-management/014-task-detail/spec.md
 *   FR-014e
 * Issue #395: task-detail's "開始標記前強制顯示指引" overview control read
 * DEFAULT_TASK_DATA.forceGuideline (hardcoded true, task-detail.html:3329)
 * and resetTaskData() never overwrote it from the profile, so every task
 * showed "是" regardless of its seed. Meanwhile the annotation workspace
 * (annotation-workspace.data.js resolveTaskProfile()) already reads a
 * per-task `forceShowGuideline` field from the very same task-detail.data.js
 * profile object -- the PL overview must read that same field instead of a
 * global default, so a task without the seed truthfully shows "否", and one
 * whose profile sets it shows "是".
 *
 * No shipped profile currently sets forceShowGuideline: true (see
 * task-detail.data.js), so the "shows 是" case is exercised via a
 * request-time patch to task-detail.data.js (same patchDataFile idiom
 * already used by task-management specs, e.g. task-list-run-
 * materialization.spec.ts) rather than adding a real seed value -- a real
 * seed would also flip annotation-workspace.data.js's resolveTaskProfile()
 * for that task (it reads the same field from the same file), which is out
 * of scope for this task-management-only fix.
 */
import { test, expect } from '@playwright/test';
import { patchDataFile } from '../annotation/_workspace-helpers';

const TASK_DETAIL_URL = '/pages/task-management/task-detail.html';

test.describe('Task detail force-guideline reflects the per-task profile (issue #395)', () => {
  test('a task whose profile does not set forceShowGuideline shows "否", not the old hardcoded "是"', async ({ page }) => {
    await page.goto(`${TASK_DETAIL_URL}?task_id=T001`);

    await expect(page.locator('#valueForceGuideline')).toHaveText('否');
  });

  test('a task whose profile sets forceShowGuideline: true shows "是"', async ({ page }) => {
    await patchDataFile(page, 'task-detail.data.js', `
      window.LabelSuiteTaskDetailData.profiles.T001.forceShowGuideline = true;
    `);
    await page.goto(`${TASK_DETAIL_URL}?task_id=T001`);

    await expect(page.locator('#valueForceGuideline')).toHaveText('是');
  });
});
