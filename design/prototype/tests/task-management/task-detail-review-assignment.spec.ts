import { test, expect, type Page } from '@playwright/test';

const TASK_DETAIL_URL = '/pages/task-management/task-detail.html';

// Tab panels arrive via fetched partials and event bindings only attach after
// the last partial (#workLogPanel) lands; wait for it before interacting.
const PANEL_LOAD_TIMEOUT = 15000;

// The review-load cell wording, with the figures left open on purpose --
// issue #761 moved the numbers out of a hand-seeded table and into a
// derivation over 015's real review units, and
// issue-761-review-workload-derivation.spec.ts owns asserting they are
// right. This file guards the rendering contract around them.
const REVIEW_LOAD_ZH = /^\d+ 筆 · \d+ 待審$/;
const REVIEW_LOAD_EN = /^\d+ items · \d+ pending$/;

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
 * read-only rendering behaviors: the review-load column, the assignment
 * section's shape and the live pool summary, the arbiter tag,
 * disable-driven pool release, and the i18n toggle.
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

/* Reads one reviewer's 待審 figure out of the assignment table (column 2). */
async function pendingOf(page: Page, name: string): Promise<number> {
  const row = page.locator('#reviewAssignmentBody tr').filter({ hasText: name });
  return Number(await row.locator('td').nth(2).textContent());
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

    /* issue #617 put the four spec 015 roster reviewers in `reviewer_ids`,
       so they are the members this task's review units are dealt to. */
    const reviewerRow = page.locator('#memberTableBody tr').filter({ hasText: '林佳蓉' });
    await expect(reviewerRow.locator('td').nth(3)).toHaveText(REVIEW_LOAD_ZH);
  });

  test('renders the review assignment section with a derived workload and the dispute pool', async ({ page }) => {
    await page.goto(TASK_DETAIL_URL);
    await openMemberTab(page);

    await expect(page.locator('#memberManagementPanel > section').nth(2).locator('h2')).toHaveText('審核指派');

    /* One row per ACTIVE REVIEWER MEMBER, not per checked reviewer -- issue
       #617 added the four spec 015 roster reviewers to TASK_MEMBERS, so the
       table grew to 7. Reviewers this task does not check render zeros. */
    const rows = page.locator('#reviewAssignmentBody tr');
    await expect(rows).toHaveCount(7);

    const mandyRow = rows.filter({ hasText: 'Mandy Chen' });
    await expect(mandyRow.locator('td').nth(1)).toHaveText('0');

    /* Every unit this task owns is dealt to an active checked reviewer, so
       nothing is left over (issue #761 derives this from the units rather
       than seeding it). */
    await expect(page.locator('#reviewUnassignedCount')).toHaveText('未指派 0 筆');

    /* Issue #891 owns the exact live pool counts. This rendering test keeps
       only the localized shape so it cannot reintroduce T001's retired
       hand-seeded `7` as a second source of truth. */
    await expect(page.locator('#disputePoolText')).toHaveText(/^爭議池 \d+ 項待仲裁$/);
  });

  test('designated arbiters get a tag in the review assignment table', async ({ page }) => {
    await page.goto(TASK_DETAIL_URL);
    await page.locator('#workLogPanel').waitFor({ state: 'attached', timeout: PANEL_LOAD_TIMEOUT });
    /* issue #617: the arbiter checklist offers only CHECKED reviewers
       (FR-010s-1), and the default task now checks the four spec 015 roster
       reviewers -- so the arbiter demo has to pick one of them. */
    await checkArbiter(page, '王小明');
    await page.locator('#tabMemberManagement').click();

    const arbiterRow = page.locator('#reviewAssignmentBody tr').filter({ hasText: '王小明' });
    await expect(arbiterRow.locator('.arbiter-tag')).toHaveText('仲裁');
  });

  test('disabling a reviewer returns their pending load to the unassigned pool', async ({ page }) => {
    await page.goto(TASK_DETAIL_URL);
    await page.locator('#workLogPanel').waitFor({ state: 'attached', timeout: PANEL_LOAD_TIMEOUT });
    await openMemberTab(page);

    /* FR-005j's release rule only has anything to release for a reviewer the
       task actually checks -- an unchecked member holds no units at all. */
    const pending = await pendingOf(page, '林佳蓉');
    expect(pending).toBeGreaterThan(0);

    await page
      .locator('#memberTableBody tr')
      .filter({ hasText: '林佳蓉' })
      .locator('button:has-text("停用")')
      .click();
    await page.locator('#memberActionConfirmBtn').click();

    // Her pending units flow back to the pool; her done units stay as
    // historical stats (mirrors FR-005f for annotators).
    await expect(page.locator('#reviewUnassignedCount')).toHaveText(`未指派 ${pending} 筆`);
    await expect(page.locator('#reviewAssignmentBody tr')).toHaveCount(6);
    const reviewerRow = page.locator('#memberTableBody tr').filter({ hasText: '林佳蓉' });
    await expect(reviewerRow.locator('td').nth(3)).toHaveText(/^\d+ 筆 · 0 待審$/);
  });

  test('translates review-load column and assignment section to English', async ({ page }) => {
    await page.goto(TASK_DETAIL_URL);
    await openMemberTab(page);
    await page.locator('#langToggle').click();

    await expect(page.locator('#thMemberReviewLoad')).toHaveText('Review load');
    await expect(page.locator('#reviewAssignmentTitle')).toHaveText('Review Assignment');
    await expect(page.locator('#reviewUnassignedCount')).toHaveText(/^\d+ unassigned$/);
    await expect(page.locator('#disputePoolText')).toHaveText(/^Dispute pool · \d+ awaiting arbitration$/);

    const reviewerRow = page.locator('#memberTableBody tr').filter({ hasText: '林佳蓉' });
    await expect(reviewerRow.locator('td').nth(3)).toHaveText(REVIEW_LOAD_EN);
  });
});
