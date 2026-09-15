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
 *
 * issue #761 retired the per-reviewer half of that seed entirely: the
 * workload is now derived from the task's own review units. The guard below
 * therefore compares the figure the table actually carries per task (the
 * total 已指派 across its rows) instead of the unassigned pool -- with the
 * workload derived, a task whose reviewers cover all of its units leaves
 * nothing unassigned, so that counter is 0 for every healthy task and can no
 * longer tell two tasks apart.
 */
import { test, expect, type Page } from '@playwright/test';

const TASK_DETAIL_URL = '/pages/task-management/task-detail.html';
const PANEL_LOAD_TIMEOUT = 15000;

async function openMemberTab(page: Page) {
  await page.locator('#workLogPanel').waitFor({ state: 'attached', timeout: PANEL_LOAD_TIMEOUT });
  await page.locator('#tabMemberManagement').click();
  await expect(page.locator('#memberManagementPanel')).not.toHaveClass(/hidden/);
}

/* Sum of the 已指派 column across every reviewer row -- the whole workload
   this task hands out, which is what issue #396 needs to differ per task. */
async function totalAssigned(page: Page, taskId: string): Promise<number> {
  await page.goto(`${TASK_DETAIL_URL}?task_id=${taskId}`);
  await openMemberTab(page);
  const cells = await page.locator('#reviewAssignmentBody tr td:nth-child(2)').allTextContents();
  return cells.reduce((sum, cell) => sum + Number(cell), 0);
}

test.describe('Task detail review assignment workload is scoped per task (issue #396)', () => {
  test('T014 and T016 hand out different workloads, not the same global figure', async ({ page }) => {
    const t014 = await totalAssigned(page, 'T014');
    const t016 = await totalAssigned(page, 'T016');

    expect(t014).toBeGreaterThan(0);
    expect(t016).toBeGreaterThan(0);
    expect(t014).not.toBe(t016);
  });

  test('T014 (5 dataset records) shows a workload scale consistent with its own data, not the shared 40-item figure', async ({ page }) => {
    await page.goto(`${TASK_DETAIL_URL}?task_id=T014`);
    await openMemberTab(page);

    /* issue #617 put the four spec 015 roster reviewers in `reviewer_ids`,
       so they -- not the legacy seeded three -- are who this task's units
       are dealt to. */
    const reviewerRow = page.locator('#reviewAssignmentBody tr').filter({ hasText: '王小明' });
    const assignedText = await reviewerRow.locator('td').nth(1).textContent();
    expect(Number(assignedText)).toBeGreaterThan(0);
    expect(Number(assignedText)).toBeLessThan(10);
  });
});
