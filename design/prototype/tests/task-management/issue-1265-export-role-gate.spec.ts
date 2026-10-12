/*
 * Traceability: specs/task-management/014-task-detail/spec.md FR-024, FR-009a;
 *   admin-007 permission matrix (reviewer x dataset.export = no; only
 *   project_leader may export). Issue #1265.
 * Out of scope: missing/invalid task_role (parseRole fails open, tracked in #1266).
 */
import { test, expect } from '../fixtures';

const TASK_DETAIL_URL = '/pages/task-management/task-detail.html';
const PANEL_LOAD_TIMEOUT = 15000;

async function openResults(page: import('@playwright/test').Page, role?: string) {
  const roleQuery = role ? `&task_role=${role}` : '';
  await page.goto(`${TASK_DETAIL_URL}?task_id=T001${roleQuery}&tab=annotation-results`);
  await expect(page.locator('#arResultTableBody')).toBeVisible({ timeout: PANEL_LOAD_TIMEOUT });
}

test.describe('issue #1265 -- annotation-results export is project_leader only', () => {
  for (const role of [undefined, 'project_leader']) {
    test(`project_leader (${role ?? 'default'}) sees export controls and can download`, async ({ page }) => {
      await openResults(page, role);
      await expect(page.locator('#arExportSection')).toBeVisible();
      await expect(page.locator('#arExportJsonBtn')).toBeVisible();
      await expect(page.locator('#arExportJsonMinBtn')).toBeVisible();

      const rowsBefore = await page.locator('#arExportHistoryBody tr').count();
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.locator('#arExportJsonBtn').click(),
      ]);
      expect(download.suggestedFilename()).toBeTruthy();
      await expect(page.locator('#arExportHistoryBody tr')).toHaveCount(rowsBefore + 1);
    });
  }

  test('reviewer: export section and buttons are hidden, results still render', async ({ page }) => {
    await openResults(page, 'reviewer');
    await expect(page.locator('#arResultTableBody')).toBeVisible();
    await expect(page.locator('#arExportSection')).toBeHidden();
    await expect(page.locator('#arExportJsonBtn')).toBeHidden();
    await expect(page.locator('#arExportJsonMinBtn')).toBeHidden();
  });

  test('reviewer: programmatic click on hidden export buttons is rejected (no download, no history row)', async ({ page }) => {
    await openResults(page, 'reviewer');
    const rowsBefore = await page.locator('#arExportHistoryBody tr').count();
    let downloadFired = false;
    page.on('download', () => { downloadFired = true; });

    await page.evaluate(() => {
      (document.getElementById('arExportJsonBtn') as HTMLElement).click();
      (document.getElementById('arExportJsonMinBtn') as HTMLElement).click();
    });

    await page.waitForTimeout(500);
    expect(downloadFired).toBe(false);
    expect(await page.locator('#arExportHistoryBody tr').count()).toBe(rowsBefore);
  });
});
