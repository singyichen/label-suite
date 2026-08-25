/*
 * Traceability: specs/task-management/014-task-detail/spec.md
 *   FR-001
 */
import { test, expect } from '@playwright/test';

const TASK_DETAIL_URL = '/pages/task-management/task-detail.html';

/* Issue #200: task-detail.html?task_id=T999 (an unknown id) used to fall
 * through resetTaskData()'s "listEntry not found" branch and silently
 * re-resolve to T001 -- the user believed they were viewing the target task
 * but actually saw T001's content with no error. Mirrors the annotation-list
 * not-found fix (issue #154): a dedicated not-found state with a working
 * exit, instead of a silent fallback. */

test.describe('Task detail not-found state (issue #200)', () => {
  test('an unknown task_id shows the not-found state instead of T001 content', async ({ page }) => {
    await page.goto(`${TASK_DETAIL_URL}?task_id=T999-DOES-NOT-EXIST`);

    const notFound = page.locator('#taskNotFound');
    await expect(notFound).toBeVisible();
    await expect(notFound).toContainText('T999-DOES-NOT-EXIST');

    // T001's name must not leak through anywhere on the page.
    await expect(page.locator('body')).not.toContainText('醫療文本情感分類');
    await expect(page.locator('#overviewPanel')).not.toBeVisible();
  });

  test('the not-found state has a working exit back to task-list', async ({ page }) => {
    await page.goto(`${TASK_DETAIL_URL}?task_id=T999-DOES-NOT-EXIST`);

    const backLink = page.locator('#taskNotFoundBackLink');
    await expect(backLink).toBeVisible();
    await backLink.click();
    await expect(page).toHaveURL(/\/pages\/task-management\/task-list\.html/);
  });

  test('a valid task_id still renders the task overview normally', async ({ page }) => {
    await page.goto(`${TASK_DETAIL_URL}?task_id=T001`);

    await expect(page.locator('#bcCurrent')).toHaveText('醫療文本情感分類', { timeout: 15000 });
    await expect(page.locator('#overviewPanel')).toBeVisible();
    await expect(page.locator('#taskNotFound')).toBeHidden();
  });
});
