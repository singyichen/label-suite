import { test, expect, type Page } from '@playwright/test';

const TASK_DETAIL_URL = '/pages/task-management/task-detail.html';

// Tab panels arrive via fetched partials and event bindings only attach after
// the last partial (#workLogPanel) lands; wait for it before interacting.
const PANEL_LOAD_TIMEOUT = 15000;

async function openMemberTab(page: Page) {
  await page.locator('#workLogPanel').waitFor({ state: 'attached', timeout: PANEL_LOAD_TIMEOUT });
  await page.locator('#tabMemberManagement').click();
  await expect(page.locator('#memberManagementPanel')).not.toHaveClass(/hidden/);
}

/*
 * Issue #596 retired review_assignment_mode entirely: assignment is always
 * system-automatic now (FR-005j), so the manual-mode / auto-fill / per-row
 * assign / dispute-dispatch cases this file used to cover are gone -- that
 * "must render no button at all" contract lives in
 * issue-596-assignment-readonly.spec.ts. This file keeps only the still-live
 * read-only rendering behaviors: the review-load column, the seeded
 * workload/dispute-pool numbers, the arbiter tag, disable-driven pool
 * release, and the i18n toggle.
 */
async function checkArbiter(page: Page, name: string) {
  await page.locator('#reviewEditBtn').click();
  await page
    .locator('#arbiterOptionList .arbiter-option', { hasText: name })
    .locator('input')
    .check();
  await page.locator('#reviewSaveBtn').click();
  await expect(page.locator('#reviewEditForm')).toHaveClass(/hidden/);
}

test.describe('Task detail review assignment', () => {
  test('member list gains a review-load column between role and status', async ({ page }) => {
    await page.goto(TASK_DETAIL_URL);
    await openMemberTab(page);

    const memberTable = page.locator('table[aria-label="Task members table"]');
    await expect(memberTable.locator('th').nth(3)).toHaveText('審核負荷');
    await expect(memberTable.locator('th').nth(4)).toHaveText('狀態');

    const annotatorRow = page.locator('#memberTableBody tr').filter({ hasText: 'Alex Wang' });
    await expect(annotatorRow.locator('td').nth(3)).toHaveText('—');

    const reviewerRow = page.locator('#memberTableBody tr').filter({ hasText: 'Mandy Chen' });
    await expect(reviewerRow.locator('td').nth(3)).toHaveText('40 筆 · 12 待審');
  });

  test('renders the review assignment section with seeded workload and dispute pool', async ({ page }) => {
    await page.goto(TASK_DETAIL_URL);
    await openMemberTab(page);

    await expect(page.locator('#memberManagementPanel > section').nth(2).locator('h2')).toHaveText('審核指派');
    await expect(page.locator('#reviewUnassignedCount')).toHaveText('未指派 18 筆');

    const rows = page.locator('#reviewAssignmentBody tr');
    await expect(rows).toHaveCount(3);

    const mandyRow = rows.filter({ hasText: 'Mandy Chen' });
    await expect(mandyRow.locator('td').nth(1)).toHaveText('40');
    await expect(mandyRow.locator('td').nth(2)).toHaveText('12');
    await expect(mandyRow.locator('td').nth(3)).toHaveText('28');

    const kevinRow = rows.filter({ hasText: 'Kevin Liu' });
    await expect(kevinRow.locator('td').nth(1)).toHaveText('40');
    await expect(kevinRow.locator('td').nth(2)).toHaveText('31');
    await expect(kevinRow.locator('td').nth(3)).toHaveText('9');

    const rachelRow = rows.filter({ hasText: 'Rachel Wu' });
    await expect(rachelRow.locator('td').nth(1)).toHaveText('18');
    await expect(rachelRow.locator('td').nth(2)).toHaveText('5');
    await expect(rachelRow.locator('td').nth(3)).toHaveText('13');

    await expect(page.locator('#disputePoolText')).toHaveText('爭議池 7 項待仲裁');
  });

  test('designated arbiters get a tag in the review assignment table', async ({ page }) => {
    await page.goto(TASK_DETAIL_URL);
    await page.locator('#workLogPanel').waitFor({ state: 'attached', timeout: PANEL_LOAD_TIMEOUT });
    await checkArbiter(page, 'Mandy Chen');
    await page.locator('#tabMemberManagement').click();

    const mandyRow = page.locator('#reviewAssignmentBody tr').filter({ hasText: 'Mandy Chen' });
    await expect(mandyRow.locator('.arbiter-tag')).toHaveText('仲裁');
  });

  test('disabling a reviewer returns their pending load to the unassigned pool', async ({ page }) => {
    await page.goto(TASK_DETAIL_URL);
    await page.locator('#workLogPanel').waitFor({ state: 'attached', timeout: PANEL_LOAD_TIMEOUT });
    await openMemberTab(page);

    await page
      .locator('#memberTableBody tr')
      .filter({ hasText: 'Rachel Wu' })
      .locator('button:has-text("停用")')
      .click();
    await page.locator('#memberActionConfirmBtn').click();

    // Rachel's 5 pending units flow back to the pool; her 13 done units stay
    // as historical stats (mirrors FR-005f for annotators).
    await expect(page.locator('#reviewUnassignedCount')).toHaveText('未指派 23 筆');
    await expect(page.locator('#reviewAssignmentBody tr')).toHaveCount(2);
    const rachelRow = page.locator('#memberTableBody tr').filter({ hasText: 'Rachel Wu' });
    await expect(rachelRow.locator('td').nth(3)).toHaveText('13 筆 · 0 待審');
  });

  test('translates review-load column and assignment section to English', async ({ page }) => {
    await page.goto(TASK_DETAIL_URL);
    await openMemberTab(page);
    await page.locator('#langToggle').click();

    await expect(page.locator('#thMemberReviewLoad')).toHaveText('Review load');
    await expect(page.locator('#reviewAssignmentTitle')).toHaveText('Review Assignment');
    await expect(page.locator('#reviewUnassignedCount')).toHaveText('18 unassigned');
    await expect(page.locator('#disputePoolText')).toHaveText('Dispute pool · 7 awaiting arbitration');

    const reviewerRow = page.locator('#memberTableBody tr').filter({ hasText: 'Mandy Chen' });
    await expect(reviewerRow.locator('td').nth(3)).toHaveText('40 items · 12 pending');
  });
});
