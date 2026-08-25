/*
 * Traceability: specs/task-management/014-task-detail/spec.md
 *   FR-003, FR-004
 */
import { test, expect } from '@playwright/test';

const TASK_DETAIL_URL = '/pages/task-management/task-detail.html';

test.describe('Task detail tab partials', () => {
  test('loads all five tab panels from partial files and switches tabs', async ({ page }) => {
    await page.goto(TASK_DETAIL_URL);

    await expect(page.locator('#tabPanelMount #overviewPanel')).toHaveCount(1);
    await expect(page.locator('#tabPanelMount #annotationProgressPanel')).toHaveCount(1);
    await expect(page.locator('#tabPanelMount #annotationResultsPanel')).toHaveCount(1);
    await expect(page.locator('#tabPanelMount #workLogPanel')).toHaveCount(1);
    await expect(page.locator('#tabPanelMount #memberManagementPanel')).toHaveCount(1);

    await page.locator('#tabWorkLog').click();
    await expect(page.locator('#workLogPanel')).not.toHaveClass(/hidden/);
    await expect(page.locator('#overviewPanel')).toHaveClass(/hidden/);

    await page.locator('#tabMemberManagement').click();
    await expect(page.locator('#memberManagementPanel')).not.toHaveClass(/hidden/);
    await expect(page.locator('#workLogPanel')).toHaveClass(/hidden/);

    await page.locator('#tabAnnotationResults').click();
    await expect(page.locator('#annotationResultsPanel')).not.toHaveClass(/hidden/);
    await expect(page.locator('#memberManagementPanel')).toHaveClass(/hidden/);
  });
});
