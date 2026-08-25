/*
 * Traceability: specs/task-management/013-task-new/spec.md
 *   FR-006, FR-006a, SC-002
 */
import { test, expect } from '@playwright/test';
import path from 'path';

/* Issue #285: task-new.html's submitTask() (task-new.html:1398) generates a
 * task_id and redirects to task-detail.html but never persists the wizard's
 * result anywhere -- window.LabelSuiteTaskListData.tasks /
 * window.LabelSuiteTaskDetailData.profiles are both untouched. The created
 * task never shows up in the task list, and task-detail.html's
 * resetTaskData() (task-detail.html:4303-4352) falls into TASK_NOT_FOUND for
 * the id the wizard just generated because neither a list entry nor a
 * profile exists for it.
 *
 * Expected (per the issue): after submit, the task enters the task list in
 * `draft` status and task-detail can open it. */

const TASK_NEW_URL = '/pages/task-management/task-new.html';
const TASK_LIST_URL = '/pages/task-management/task-list.html';
const EXAMPLE_DATA = path.resolve(__dirname, '../../../../docs/product/example-data');

test('wizard-created task appears in the task list (draft) and opens in task-detail without not-found', async ({ page }) => {
  await page.goto(TASK_NEW_URL, { waitUntil: 'load' });
  await page.waitForFunction(
    () => document.querySelectorAll('#taskCategoryChips [data-key]').length > 0,
    null,
    { timeout: 30000 },
  );

  const taskName = `Issue 285 Persistence Check ${Date.now()}`;
  await page.fill('#taskNameInput', taskName);
  await page.locator('#taskCategoryChips [data-key="classification"]').click();
  // Input type must be selected before output type so the taxonomy can apply
  // any granularity constraints before rendering the output choices
  // (task-new-output-type-preview.spec.ts).
  await page.locator('#taskInputTypeChips [data-key="single_item"]').click();
  await page.locator('#taskOutputTypeChips [data-key="single_label"]').click();
  await page.locator('#datasetFileInput').setInputFiles(path.join(EXAMPLE_DATA, 'single-label.json'));
  await expect(page.locator('.inline-dataset-preview-wrap')).toBeVisible();
  await page.locator('.inline-preview-role-select[aria-label$="text"]').selectOption('input');
  await page.locator('.inline-preview-role-select[aria-label$="gold_label"]').selectOption('output');
  await expect(page.locator('#nextBtn')).toBeEnabled();
  await page.locator('#nextBtn').click();

  await expect(page.locator('#step2Panel')).not.toHaveClass(/hidden/);
  await page.locator('#nextBtn').click();
  await expect(page.locator('#step3Panel')).not.toHaveClass(/hidden/);
  await page.locator('#nextBtn').click();
  await expect(page.locator('#step4Panel')).not.toHaveClass(/hidden/);
  await page.locator('#nextBtn').click();

  await expect(page).toHaveURL(/\/pages\/task-management\/task-detail\.html\?task_id=[^&]+$/, {
    timeout: 15000,
  });
  const taskId = new URL(page.url()).searchParams.get('task_id');
  expect(taskId).toBeTruthy();

  // task-detail.html must resolve the freshly created id instead of
  // rendering the not-found state (issue #200's TASK_NOT_FOUND gate).
  await expect(page.locator('#taskNotFound')).toHaveClass(/hidden/);
  await page.locator('#workLogPanel').waitFor({ state: 'attached', timeout: 15000 });

  // The created task must also be visible in the task list, in draft status.
  await page.goto(`${TASK_LIST_URL}?keyword=${encodeURIComponent(taskName)}`, { waitUntil: 'load' });
  const row = page.locator('#taskTableBody tr', { hasText: taskName });
  await expect(row).toBeVisible();
  await expect(row.locator('.badge-draft')).toBeVisible();
});
