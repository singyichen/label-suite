/*
 * Issue #761 -- review workload numbers must be derived from real review
 * units, not a hardcoded per-reviewer seed.
 *
 * Traceability: specs/task-management/014-task-detail/spec.md
 *   AC-1.6  (:157) -- "每位啟用中審核員的已指派／待審／已完成三欄...且與成員清單
 *                      「審核負荷」欄一致；Overview 調整 reviewer_ids 勾選並儲存後，
 *                      負荷分布即時反映（FR-005j、FR-005k）。"
 *   FR-005j (:545) -- a row for 每位啟用中審核員；"移除或停用仍有待審負荷的審核員時，
 *                      其 pending 筆數必須退回未指派池..."
 *   SC-034  (:756) -- "...且與成員清單「審核負荷」欄即時一致。"
 *
 * What is broken today: DEFAULT_REVIEW_WORKLOAD / REVIEW_WORKLOAD_BY_TASK
 * (task-detail.html:3465-3513) seed `byReviewer` for only user_mandy /
 * user_kevin / user_rachel -- three legacy ids that no task's `reviewer_ids`
 * actually checks anymore. renderReviewAssignment() (task-detail.html:7252)
 * iterates getActiveReviewerMembers() (7 active reviewer members) and
 * getReviewWorkload() (task-detail.html:7228) lazily zero-fills unknown
 * ids. Consequently the four reviewers the default task (T001) actually
 * checks via `reviewer_ids` -- reviewer_wang 王小明 / reviewer_li 李大華 /
 * reviewer_chen 陳美玲 / reviewer_lin 林佳蓉 -- always render 0/0/0, while the
 * three NON-checked legacy seed ids (Mandy Chen / Kevin Liu / Rachel Wu)
 * render stale historical numbers that have nothing to do with this task's
 * real review units. None of the 15 review units backing T001
 * (REVIEWER_MOCK_ROWS.T001: 5 samples x 3 annotator rows) is reflected
 * anywhere in the assignment table, and toggling `reviewer_ids` from
 * Overview does not redistribute anything.
 */
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

// Total review units backing T001 (the default task): 5 samples x 3
// annotator rows each, per REVIEWER_MOCK_ROWS.T001 in
// annotation-workspace.data.js.
const TOTAL_REVIEW_UNITS = 15;

// T001's effective assignment roster. 陳美玲 remains checked as a reviewer
// but is reserved by arbiter_ids, so her new-assignment workload is zero.
const ASSIGNMENT_REVIEWER_NAMES = ['王小明', '李大華', '林佳蓉'];
const RESERVED_ARBITER_NAMES = ['陳美玲'];

// The legacy seed ids that DEFAULT_REVIEW_WORKLOAD carries numbers for, none
// of which T001 actually checks.
const UNCHECKED_LEGACY_NAMES = ['Mandy Chen', 'Kevin Liu', 'Rachel Wu'];

function parseCount(text: string | null): number {
  const match = (text || '').match(/(\d+)/);
  if (!match) throw new Error(`Expected a numeric count in "${text}"`);
  return Number(match[1]);
}

test.describe('Issue #761 review workload derivation', () => {
  test('被勾選的審核員分掉全部審核單位，未勾選的顯示 0', async ({ page }) => {
    await page.goto(TASK_DETAIL_URL);
    await openMemberTab(page);

    const rows = page.locator('#reviewAssignmentBody tr');
    await expect(rows).toHaveCount(7);

    let checkedSum = 0;
    for (const name of ASSIGNMENT_REVIEWER_NAMES) {
      const row = rows.filter({ hasText: name });
      const assigned = parseCount(await row.locator('td').nth(1).textContent());
      expect(assigned).toBeGreaterThan(0);
      checkedSum += assigned;
    }
    expect(checkedSum).toBe(TOTAL_REVIEW_UNITS);

    for (const name of RESERVED_ARBITER_NAMES) {
      const row = rows.filter({ hasText: name });
      await expect(row.locator('td').nth(1)).toHaveText('0');
      await expect(row.locator('td').nth(2)).toHaveText('0');
      await expect(row.locator('td').nth(3)).toHaveText('0');
    }

    for (const name of UNCHECKED_LEGACY_NAMES) {
      const row = rows.filter({ hasText: name });
      await expect(row.locator('td').nth(1)).toHaveText('0');
      await expect(row.locator('td').nth(2)).toHaveText('0');
      await expect(row.locator('td').nth(3)).toHaveText('0');
    }

    await expect(page.locator('#reviewUnassignedCount')).toHaveText('未指派 0 筆');

    let totalAssigned = 0;
    const rowCount = await rows.count();
    for (let i = 0; i < rowCount; i++) {
      totalAssigned += parseCount(await rows.nth(i).locator('td').nth(1).textContent());
    }
    const unassigned = parseCount(await page.locator('#reviewUnassignedCount').textContent());
    expect(totalAssigned + unassigned).toBe(TOTAL_REVIEW_UNITS);
  });

  test('AC-1.6：Overview 取消勾選某審核員後，負荷分布即時反映', async ({ page }) => {
    await page.goto(TASK_DETAIL_URL);
    await openMemberTab(page);

    const linRowBefore = page.locator('#reviewAssignmentBody tr').filter({ hasText: '林佳蓉' });
    const linAssignedBefore = parseCount(await linRowBefore.locator('td').nth(1).textContent());
    expect(linAssignedBefore).toBeGreaterThan(0);

    await page.locator('#tabOverview').click();
    await page.locator('#reviewEditBtn').click();
    await page
      .locator('#reviewerOptionList .reviewer-option', { hasText: '林佳蓉' })
      .locator('input')
      .uncheck();
    await page.locator('#reviewSaveBtn').click();
    await expect(page.locator('#reviewEditForm')).toHaveClass(/hidden/);

    await page.locator('#tabMemberManagement').click();
    await expect(page.locator('#memberManagementPanel')).not.toHaveClass(/hidden/);

    const linRowAfter = page.locator('#reviewAssignmentBody tr').filter({ hasText: '林佳蓉' });
    await expect(linRowAfter.locator('td').nth(1)).toHaveText('0');
    await expect(linRowAfter.locator('td').nth(2)).toHaveText('0');
    await expect(linRowAfter.locator('td').nth(3)).toHaveText('0');

    let remainingSum = 0;
    for (const name of ['王小明', '李大華']) {
      const row = page.locator('#reviewAssignmentBody tr').filter({ hasText: name });
      remainingSum += parseCount(await row.locator('td').nth(1).textContent());
    }
    expect(remainingSum).toBe(TOTAL_REVIEW_UNITS);

    const reservedArbiter = page.locator('#reviewAssignmentBody tr').filter({ hasText: '陳美玲' });
    await expect(reservedArbiter.locator('td').nth(1)).toHaveText('0');
  });

  test('SC-034：成員清單「審核負荷」欄與審核指派表一致', async ({ page }) => {
    await page.goto(TASK_DETAIL_URL);
    await openMemberTab(page);

    const reviewRow = page.locator('#reviewAssignmentBody tr').filter({ hasText: '王小明' });
    const assigned = (await reviewRow.locator('td').nth(1).textContent())?.trim();
    const pending = (await reviewRow.locator('td').nth(2).textContent())?.trim();

    const memberRow = page.locator('#memberTableBody tr').filter({ hasText: '王小明' });
    await expect(memberRow.locator('td').nth(3)).toHaveText(`${assigned} 筆 · ${pending} 待審`);
  });
});
