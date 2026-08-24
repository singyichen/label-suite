/**
 * Detail TASK_META mirrors the list's 13-task registry (issue #183 audit).
 *
 * Before the fix the detail page carried an unrelated 9-task fixture set:
 * shared ids resolved to contradictory titles/output types (list T001
 * "醫療文本情感分類" opened as "新聞標題多標籤分類") and list-only ids
 * (T010–T013) silently fell back to the default task.
 */
import { test, expect } from '@playwright/test';

const LIST_URL = '/pages/dataset/dataset-analysis-list.html';
const DETAIL_URL = '/pages/dataset/dataset-analysis-detail.html';

test.describe('Dataset detail — registry mirror coherence', () => {
  test('opening the first list row shows the same task name on the detail page', async ({ page }) => {
    await page.goto(LIST_URL);
    const firstRow = page.locator('#taskTableBody tr.task-row').first();
    const listName = (await firstRow.locator('.task-name-cell').innerText()).trim();

    await firstRow.click();
    await page.waitForURL(/dataset-analysis-detail\.html\?task_id=/);
    await expect(page.locator('#bcCurrent')).toHaveText(listName);
  });

  test('a list-only composite id (T013) resolves to its own entry instead of the default task', async ({ page }) => {
    await page.goto(`${DETAIL_URL}?task_id=T013&tab=quality`);
    await expect(page.locator('#bcCurrent')).toHaveText('ABSA + 情緒回歸（YouTube 留言）');
    await expect(page).toHaveURL(/task_id=T013/);
  });

  test('a two-output registry id (T010) keeps its id and title', async ({ page }) => {
    await page.goto(`${DETAIL_URL}?task_id=T010&tab=stats`);
    await expect(page.locator('#bcCurrent')).toHaveText('醫療實體與關係辨識');
    await expect(page).toHaveURL(/task_id=T010/);
  });

  test('an unknown id redirects to the list with an error toast (issue #261 drift, FR-002)', async ({ page }) => {
    await page.goto(`${DETAIL_URL}?task_id=T999`);
    await page.waitForURL(/dataset-analysis-list\.html/);
    await expect(page.locator('#toast')).toHaveClass(/toast-error/);
    await expect(page.locator('#toast')).toHaveClass(/visible/);
    await expect(page.locator('#toastMsg')).toHaveText('找不到指定的任務，或您沒有該任務的存取權限。');
  });

  test('a missing task_id redirects to the list with an error toast (issue #261 drift, FR-002)', async ({ page }) => {
    await page.goto(DETAIL_URL);
    await page.waitForURL(/dataset-analysis-list\.html/);
    await expect(page.locator('#toast')).toHaveClass(/toast-error/);
  });
});
