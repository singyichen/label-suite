/*
 * Traceability: specs/task-management/014-task-detail/spec.md
 *   FR-005j
 * Issue #396: REVIEW_WORKLOAD is a single module-level object
 * (task-detail.html:3400-3408), never keyed by TASK_DATA.taskId, so every
 * task's "審核指派" section shows the exact same figures -- Mandy Chen
 * 40/12/28, Kevin Liu 40/31/9, Rachel Wu 18/5/13, 18 unassigned, 7 in the
 * dispute pool -- regardless of that task's actual data volume. T014-T017
 * each ship only 5 dataset records, so the shared 18-116-item figures are
 * an obvious scale mismatch.
 */
import { test, expect, type Page } from '@playwright/test';

const TASK_DETAIL_URL = '/pages/task-management/task-detail.html';
const PANEL_LOAD_TIMEOUT = 15000;

async function openMemberTab(page: Page) {
  await page.locator('#workLogPanel').waitFor({ state: 'attached', timeout: PANEL_LOAD_TIMEOUT });
  await page.locator('#tabMemberManagement').click();
  await expect(page.locator('#memberManagementPanel')).not.toHaveClass(/hidden/);
}

test.describe('Task detail review assignment workload is scoped per task (issue #396)', () => {
  test('T014 and T016 show different unassigned counts, not the same global figure', async ({ page }) => {
    await page.goto(`${TASK_DETAIL_URL}?task_id=T014`);
    await openMemberTab(page);
    const t014Unassigned = await page.locator('#reviewUnassignedCount').textContent();

    await page.goto(`${TASK_DETAIL_URL}?task_id=T016`);
    await openMemberTab(page);
    const t016Unassigned = await page.locator('#reviewUnassignedCount').textContent();

    expect(t014Unassigned).not.toBe(t016Unassigned);
  });

  test('T014 (5 dataset records) shows a workload scale consistent with its own data, not the shared 40-item figure', async ({ page }) => {
    await page.goto(`${TASK_DETAIL_URL}?task_id=T014`);
    await openMemberTab(page);

    const mandyRow = page.locator('#reviewAssignmentBody tr').filter({ hasText: 'Mandy Chen' });
    const assignedText = await mandyRow.locator('td').nth(1).textContent();
    expect(Number(assignedText)).toBeLessThan(10);
  });
});
