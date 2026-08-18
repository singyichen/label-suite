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

async function saveReviewSettings(page: Page, { manual = false, arbiter = false } = {}) {
  await page.locator('#reviewEditBtn').click();
  if (manual) await page.locator('#assignmentModeManual').check();
  if (arbiter) await page.locator('#arbiterOptions .arbiter-option input').first().check();
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

  test('auto assignment mode keeps the section read-only', async ({ page }) => {
    await page.goto(TASK_DETAIL_URL);
    await openMemberTab(page);

    await expect(page.locator('#reviewAssignmentHint')).toContainText('自動輪派');
    await expect(page.locator('#reviewAutoFillBtn')).toBeHidden();
    await expect(page.locator('#reviewAssignmentBody button')).toHaveCount(0);
    await expect(page.locator('#disputeAssignBtn')).toBeHidden();
  });

  test('manual mode enables actions and auto-fill drains the unassigned pool', async ({ page }) => {
    await page.goto(TASK_DETAIL_URL);
    await page.locator('#workLogPanel').waitFor({ state: 'attached', timeout: PANEL_LOAD_TIMEOUT });
    await saveReviewSettings(page, { manual: true });
    await page.locator('#tabMemberManagement').click();

    await expect(page.locator('#reviewAssignmentHint')).toContainText('手動指派');
    await expect(page.locator('#reviewAutoFillBtn')).toBeVisible();
    await expect(page.locator('#reviewAssignmentBody button:has-text("指派…")')).toHaveCount(3);
    // No arbiter is designated in the seed, so dispute dispatch stays disabled.
    await expect(page.locator('#disputeAssignBtn')).toBeVisible();
    await expect(page.locator('#disputeAssignBtn')).toBeDisabled();

    await page.locator('#reviewAutoFillBtn').click();

    await expect(page.locator('#reviewUnassignedCount')).toHaveText('未指派 0 筆');
    const mandyRow = page.locator('#reviewAssignmentBody tr').filter({ hasText: 'Mandy Chen' });
    await expect(mandyRow.locator('td').nth(1)).toHaveText('46');
    await expect(mandyRow.locator('td').nth(2)).toHaveText('18');
    await expect(page.locator('#reviewAutoFillBtn')).toBeDisabled();
  });

  test('assigning a single unit moves one item from the pool to that reviewer', async ({ page }) => {
    await page.goto(TASK_DETAIL_URL);
    await page.locator('#workLogPanel').waitFor({ state: 'attached', timeout: PANEL_LOAD_TIMEOUT });
    await saveReviewSettings(page, { manual: true });
    await page.locator('#tabMemberManagement').click();

    const rachelRow = page.locator('#reviewAssignmentBody tr').filter({ hasText: 'Rachel Wu' });
    await rachelRow.locator('button:has-text("指派…")').click();

    await expect(rachelRow.locator('td').nth(1)).toHaveText('19');
    await expect(rachelRow.locator('td').nth(2)).toHaveText('6');
    await expect(page.locator('#reviewUnassignedCount')).toHaveText('未指派 17 筆');

    const reviewerRow = page.locator('#memberTableBody tr').filter({ hasText: 'Rachel Wu' });
    await expect(reviewerRow.locator('td').nth(3)).toHaveText('19 筆 · 6 待審');
  });

  test('designated arbiters get a tag and can receive the dispute pool', async ({ page }) => {
    await page.goto(TASK_DETAIL_URL);
    await page.locator('#workLogPanel').waitFor({ state: 'attached', timeout: PANEL_LOAD_TIMEOUT });
    await saveReviewSettings(page, { manual: true, arbiter: true });
    await page.locator('#tabMemberManagement').click();

    const mandyRow = page.locator('#reviewAssignmentBody tr').filter({ hasText: 'Mandy Chen' });
    await expect(mandyRow.locator('.arbiter-tag')).toHaveText('仲裁');

    await expect(page.locator('#disputeAssignBtn')).toBeEnabled();
    await page.locator('#disputeAssignBtn').click();

    await expect(page.locator('#disputePoolText')).toHaveText('爭議池 0 項待仲裁');
    await expect(mandyRow.locator('td').nth(1)).toHaveText('47');
    await expect(mandyRow.locator('td').nth(2)).toHaveText('19');
    await expect(page.locator('#disputeAssignBtn')).toBeDisabled();
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
