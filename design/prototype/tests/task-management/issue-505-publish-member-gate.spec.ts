/*
 * Traceability: specs/task-management/014-task-detail/spec.md
 *   FR-010t, SC-038
 *
 * FR-010t requires that publishing "新增試標回合 R{n}" or "開始正式標記" is
 * blocked whenever the number of members with membership_status=active for
 * the relevant task_role (annotator / reviewer) falls below the task's
 * min_annotators / min_reviewers setting. Issue #189 decision D3: the check
 * must count actual active members, not just validate the setting value
 * itself. This spec exercises that gap through the real member-management
 * disable action instead of stubbing TASK_MEMBERS directly.
 */
import { test, expect, type Page } from '@playwright/test';

const TASK_DETAIL_URL = '/pages/task-management/task-detail.html';

// Tab panels arrive via fetched partials and event bindings only attach after
// the last partial (#workLogPanel) lands; wait for it before interacting.
const PANEL_LOAD_TIMEOUT = 15000;

async function disableMember(page: Page, name: string) {
  await page.locator('#tabMemberManagement').click();
  await expect(page.locator('#memberManagementPanel')).not.toHaveClass(/hidden/);
  const row = page.locator('#memberTableBody tr').filter({ hasText: name });
  await row.locator('button:has-text("停用")').click();
  await page.locator('#memberActionConfirmBtn').click();
  await expect(row).toContainText('停用');
}

test.describe('Publish member-count gate (FR-010t, SC-038)', () => {
  test('blocks 新增試標回合 and shows the annotator gap when active annotators fall short', async ({ page }) => {
    await page.goto(TASK_DETAIL_URL + '?task_id=T001');
    await page.locator('#workLogPanel').waitFor({ state: 'attached', timeout: PANEL_LOAD_TIMEOUT });

    // Default T001 seed has exactly 3 active annotators against min_annotators=3;
    // disabling one (Alex Wang) drops the active count to 2, opening a gap of 1.
    await disableMember(page, 'Alex Wang');

    await page.locator('#tabOverview').click();
    await expect(page.locator('#overviewPanel')).not.toHaveClass(/hidden/);
    await page.locator('#publishDryRunBtn').click();

    await expect(page.locator('#toastMsg')).toContainText('標記員還差 1 位');
    await expect(page.locator('#statusBadge')).toHaveText('草稿');
    await expect(page.locator('#trialRoundTimeline .round-timeline-item')).toHaveCount(0);
  });

  test('blocks 開始正式標記 and shows the reviewer gap when active reviewers fall short', async ({ page }) => {
    // T016 seeds min_reviewers=3 with 3 active reviewers; disabling one
    // (Kevin Liu) drops the active count to 2, opening a gap of 1.
    await page.goto(TASK_DETAIL_URL + '?task_id=T016&status=waiting_iaa_confirmation');
    await page.locator('#workLogPanel').waitFor({ state: 'attached', timeout: PANEL_LOAD_TIMEOUT });

    await disableMember(page, 'Kevin Liu');

    await page.locator('#tabOverview').click();
    await expect(page.locator('#overviewPanel')).not.toHaveClass(/hidden/);
    await page.locator('#publishOfficialRunBtn').click();

    await expect(page.locator('#toastMsg')).toContainText('審核員還差 1 位');
    await expect(page.locator('#statusBadge')).toContainText('待 IAA 確認');
  });

  test('shows both role gaps at once when both annotators and reviewers fall short', async ({ page }) => {
    await page.goto(TASK_DETAIL_URL + '?task_id=T016&status=draft');
    await page.locator('#workLogPanel').waitFor({ state: 'attached', timeout: PANEL_LOAD_TIMEOUT });

    await disableMember(page, 'Alex Wang');
    await disableMember(page, 'Kevin Liu');

    await page.locator('#tabOverview').click();
    await expect(page.locator('#overviewPanel')).not.toHaveClass(/hidden/);
    await page.locator('#publishDryRunBtn').click();

    await expect(page.locator('#toastMsg')).toContainText('標記員還差 1 位');
    await expect(page.locator('#toastMsg')).toContainText('審核員還差 1 位');
    await expect(page.locator('#trialRoundTimeline .round-timeline-item')).toHaveCount(0);
  });
});
