import { test, expect } from '../fixtures';
import type { Page } from '@playwright/test';

/* issue #1266 (task-detail / task-list half) -- role defaults must fail closed.
 *
 * Traceability:
 *   ADR-037:15 / :26            roles come from stored state, not from the URL
 *   shared-019 FR-018           system role lifecycle
 *   014 FR-024 / FR-009a        export is project_leader only (issue #1265)
 *   maintainer ruling (#1266, 2026-10-12): missing/invalid task role ->
 *     annotator (existing annotator redirect + masking path); writes (delete,
 *     redownload) never trust the URL role alone; URL must not raise the
 *     stored system role.
 *
 * Shared / sidebar / admin / workspace half: issue-1266-role-fail-closed-shared.spec.ts
 *
 * Tests labelled "(guard)" pin behavior that must keep working and are green
 * on the pre-fix baseline; every other test is expected RED until Green lands.
 */

const SYSTEM_ROLE_KEY = 'labelsuite.systemRole';
const TASK_DETAIL = '/pages/task-management/task-detail.html';
const TASK_LIST = '/pages/task-management/task-list.html';
const HIDDEN_CLASS = /(^|\s)hidden(\s|$)/;
const PANEL_LOAD_TIMEOUT = 15000;

const readSystemRole = (page: Page) =>
  page.evaluate((key) => window.localStorage.getItem(key), SYSTEM_ROLE_KEY);

test.describe('issue #1266 -- task-detail parseRole: missing / invalid role is annotator', () => {
  /* task-list.html consumes `?unauthorized=annotator` and strips it from the
   * URL (issue #721), so the observable redirect result is the task-list path
   * plus the no-permission toast. */
  async function expectRedirectedToTaskList(page: Page) {
    await expect(page).toHaveURL(/\/pages\/task-management\/task-list\.html/);
    await expect(page.locator('#toastMsg')).toHaveText('無權限檢視任務詳情');
  }

  test('no task_role / role in the URL redirects to task-list with the no-permission toast', async ({ page }) => {
    await page.goto(`${TASK_DETAIL}?task_id=T001`);
    await expectRedirectedToTaskList(page);
  });

  test('task_role=bogus redirects to task-list with the no-permission toast', async ({ page }) => {
    await page.goto(`${TASK_DETAIL}?task_id=T001&task_role=bogus`);
    await expectRedirectedToTaskList(page);
  });

  test('explicit task_role=annotator redirects the same way (existing path, guard)', async ({ page }) => {
    await page.goto(`${TASK_DETAIL}?task_id=T001&task_role=annotator`);
    await expectRedirectedToTaskList(page);
  });

  test('task_role=project_leader stays on task-detail (guard)', async ({ page }) => {
    await page.goto(`${TASK_DETAIL}?task_id=T001&task_role=project_leader`);
    await expect(page.locator('#arExportSection, [role="tablist"]').first()).toBeAttached({ timeout: PANEL_LOAD_TIMEOUT });
    await expect(page).toHaveURL(/task-detail\.html/);
    await expect(page).not.toHaveURL(/unauthorized=annotator/);
  });

  test('task_role=reviewer stays on task-detail (guard)', async ({ page }) => {
    await page.goto(`${TASK_DETAIL}?task_id=T001&task_role=reviewer`);
    await expect(page.locator('[role="tablist"]').first()).toBeAttached({ timeout: PANEL_LOAD_TIMEOUT });
    await expect(page).toHaveURL(/task-detail\.html/);
    await expect(page).not.toHaveURL(/unauthorized=annotator/);
  });
});

test.describe('issue #1266 -- task-list: the URL must not raise the system role', () => {
  test('task_role=super_admin with nothing stored: stored role is not super_admin and admin group is hidden', async ({ page }) => {
    await page.goto(`${TASK_LIST}?task_role=super_admin`);
    await expect(page.locator('#navAdminItem')).toBeAttached();

    expect(await readSystemRole(page)).toBe('user');
    await expect(page.locator('#navAdminItem')).toHaveClass(HIDDEN_CLASS);
  });

  test('task_role=super_admin with stored user: stored role stays user and admin group stays hidden', async ({ page }) => {
    await page.addInitScript((key) => window.localStorage.setItem(key, 'user'), SYSTEM_ROLE_KEY);
    await page.goto(`${TASK_LIST}?task_role=super_admin`);
    await expect(page.locator('#navAdminItem')).toBeAttached();

    expect(await readSystemRole(page)).toBe('user');
    await expect(page.locator('#navAdminItem')).toHaveClass(HIDDEN_CLASS);
  });

  test('task_role=super_admin with stored user: no delete action on a draft row (writes do not trust the URL role)', async ({ page }) => {
    await page.addInitScript((key) => window.localStorage.setItem(key, 'user'), SYSTEM_ROLE_KEY);
    await page.goto(`${TASK_LIST}?task_role=super_admin`);

    const draftRow = page.locator('#taskTableBody tr[data-source-file="single-label.json"]');
    await expect(draftRow).toBeVisible();
    await expect(draftRow.getByRole('button', { name: '刪除' })).toHaveCount(0);
  });

  test('task_role=super_admin with stored super_admin: admin group visible and delete offered (guard)', async ({ page }) => {
    await page.addInitScript((key) => window.localStorage.setItem(key, 'super_admin'), SYSTEM_ROLE_KEY);
    await page.goto(`${TASK_LIST}?task_role=super_admin`);

    await expect(page.locator('#navAdminItem')).toBeVisible();
    const draftRow = page.locator('#taskTableBody tr[data-source-file="single-label.json"]');
    await expect(draftRow.getByRole('button', { name: '刪除' })).toBeVisible();
    expect(await readSystemRole(page)).toBe('super_admin');
  });

  test('task_role=project_leader can still delete a draft task (guard)', async ({ page }) => {
    await page.goto(`${TASK_LIST}?task_role=project_leader`);

    const draftRow = page.locator('#taskTableBody tr[data-source-file="single-label.json"]');
    await expect(draftRow.getByRole('button', { name: '刪除' })).toBeVisible();
    await draftRow.getByRole('button', { name: '刪除' }).click();
    await expect(page.locator('#deleteTaskModal')).toBeVisible();
    await page.locator('#deleteTaskConfirmBtn').click();
    await expect(page.locator('#taskTableBody tr[data-source-file="single-label.json"]')).toHaveCount(0);
  });
});

/* ── redownloadArExportRecord must be gated by canExportResults() ──────────
 * The export-history table is hidden for non-PL roles, but the function is a
 * page global, so a programmatic call must still be refused. A complete
 * conditionsSnapshot is harvested from a real PL export so the record has the
 * exact shape the table would hold. */
type Snapshot = Record<string, unknown>;

async function harvestSnapshotAsProjectLeader(page: Page): Promise<Snapshot> {
  await page.goto(`${TASK_DETAIL}?task_id=T001&task_role=project_leader&tab=annotation-results`);
  await expect(page.locator('#arResultTableBody')).toBeVisible({ timeout: PANEL_LOAD_TIMEOUT });
  await Promise.all([page.waitForEvent('download'), page.locator('#arExportJsonBtn').click()]);
  const snapshot = await page.evaluate(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    () => (window as any).TASK_DATA.exportHistory[0].conditionsSnapshot as Record<string, unknown>
  );
  expect(snapshot).toBeTruthy();
  return snapshot;
}

async function callRedownload(page: Page, snapshot: Snapshot): Promise<boolean> {
  let downloaded = false;
  page.on('download', () => { downloaded = true; });
  await page.evaluate((conditionsSnapshot) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).redownloadArExportRecord({ conditionsSnapshot });
  }, snapshot);
  await page.waitForTimeout(800);
  return downloaded;
}

test.describe('issue #1266 -- redownloadArExportRecord is gated by canExportResults()', () => {
  test('reviewer: programmatic redownload triggers no download', async ({ page }) => {
    const snapshot = await harvestSnapshotAsProjectLeader(page);
    await page.goto(`${TASK_DETAIL}?task_id=T001&task_role=reviewer&tab=annotation-results`);
    await expect(page.locator('#arResultTableBody')).toBeVisible({ timeout: PANEL_LOAD_TIMEOUT });
    await expect(page.locator('#arExportSection')).toBeHidden();

    expect(await callRedownload(page, snapshot)).toBe(false);
  });

  test('project_leader: programmatic redownload still downloads (guard)', async ({ page }) => {
    const snapshot = await harvestSnapshotAsProjectLeader(page);
    await page.goto(`${TASK_DETAIL}?task_id=T001&task_role=project_leader&tab=annotation-results`);
    await expect(page.locator('#arResultTableBody')).toBeVisible({ timeout: PANEL_LOAD_TIMEOUT });

    expect(await callRedownload(page, snapshot)).toBe(true);
  });
});

/* ── exported-by name is one string everywhere ─────────────────────────────
 * Seed rows hard-code 'Mandy' while live exports use getExportedByName() =
 * 'Mandy Chen'. The 'System' seed row is a system actor and is left alone. */
test.describe('issue #1266 -- export-history exportedBy uses one display name', () => {
  test('project_leader: no export-history row shows the short name "Mandy"; seeded rows show "Mandy Chen"', async ({ page }) => {
    await page.goto(`${TASK_DETAIL}?task_id=T001&task_role=project_leader&tab=annotation-results`);
    await expect(page.locator('#arExportHistoryBody tr').first()).toBeVisible({ timeout: PANEL_LOAD_TIMEOUT });

    const exportedBy = await page.locator('#arExportHistoryBody tr').evaluateAll(
      (rows) => rows.map((row) => (row.children[5] as HTMLElement).textContent?.trim() ?? '')
    );
    expect(exportedBy.length).toBeGreaterThanOrEqual(3);
    expect(exportedBy).not.toContain('Mandy');
    expect(exportedBy.filter((name) => name !== 'System')).toEqual(
      exportedBy.filter((name) => name !== 'System').map(() => 'Mandy Chen')
    );
  });
});
