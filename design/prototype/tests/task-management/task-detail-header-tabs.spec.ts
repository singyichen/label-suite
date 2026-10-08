/*
 * Traceability: specs/task-management/014-task-detail/spec.md
 *   FR-003, FR-025, SC-019, FR-006
 *   (openspec/changes/task-detail-overview-settings-split, tasks.md 1.1 + 1.2, issue #1199)
 *
 * TDD Red for G1. Stable ids the implementer must provide (everything else is
 * located by role / accessible name):
 *   #taskHeader        container shared by all six tabs (breadcrumb + H1 + status)
 *   #taskHeaderStatus  plain-text stage status shown to the right of the H1
 *   #tabSettings       the new 設定 tab (existing ids tabOverview, tabMemberManagement,
 *                      tabAnnotationProgress, tabAnnotationResults, tabWorkLog are kept)
 * The breadcrumb is the <nav aria-label="breadcrumb"> inside #taskHeader.
 */
import { test, expect, type Page } from '@playwright/test';

const TASK_DETAIL_URL = '/pages/task-management/task-detail.html';
const PANEL_LOAD_TIMEOUT = 15000;
const TASK_ID = 'T001';

const LEADER_TABS = ['概覽', '設定', '成員管理', '標記進度', '標記結果', '工時紀錄'];
const REVIEWER_TABS = ['概覽', '設定', '標記進度', '標記結果', '工時紀錄'];

async function openDetail(page: Page, query: string) {
  await page.goto(`${TASK_DETAIL_URL}?${query}`);
  await page.locator('#workLogPanel').waitFor({ state: 'attached', timeout: PANEL_LOAD_TIMEOUT });
}

async function visibleTabNames(page: Page): Promise<string[]> {
  const tabs = page.getByRole('tablist', { name: 'Task detail tabs' }).getByRole('tab');
  return (await tabs.allInnerTexts()).map((s) => s.trim());
}

test.describe('task-detail header and six-tab bar (FR-003, FR-025, SC-019)', () => {
  test('header shows breadcrumb, task-name H1 and plain-text status on all six tabs', async ({ page }) => {
    await openDetail(page, `task_id=${TASK_ID}&status=official_run_in_progress`);
    const header = page.locator('#taskHeader');
    const h1 = page.getByRole('heading', { level: 1 });

    const first = { h1: '', crumb: '', status: '' };
    for (const name of LEADER_TABS) {
      await page.getByRole('tab', { name, exact: true }).click();
      await expect(page.getByRole('tab', { name, exact: true })).toHaveAttribute('aria-selected', 'true');

      await expect(header).toBeVisible();
      await expect(header.getByRole('navigation', { name: 'breadcrumb' })).toContainText(`任務管理`);
      await expect(header.getByRole('navigation', { name: 'breadcrumb' })).toContainText(TASK_ID);
      await expect(h1).toHaveCount(1);
      await expect(h1).toBeVisible();
      await expect(h1).not.toHaveText('任務詳情');
      await expect(h1).not.toHaveText('');
      await expect(page.locator('#taskHeaderStatus')).toContainText('正式標記');

      const snap = {
        h1: (await h1.innerText()).trim(),
        crumb: (await header.getByRole('navigation', { name: 'breadcrumb' }).innerText()).trim(),
        status: (await page.locator('#taskHeaderStatus').innerText()).trim(),
      };
      if (!first.h1) Object.assign(first, snap);
      expect(snap).toEqual(first);
    }
  });

  test('header status is plain text and the header contains no button', async ({ page }) => {
    await openDetail(page, `task_id=${TASK_ID}`);
    const header = page.locator('#taskHeader');
    await expect(header).toBeVisible();
    await expect(header.getByRole('button')).toHaveCount(0);
    await expect(header.locator('[class*="badge"], [class*="pill"]')).toHaveCount(0);
    await expect(page.locator('#taskHeaderStatus')).not.toHaveText('');
  });

  test('tab bar lists six tabs in fixed order with 概覽 selected by default and no 任務概覽', async ({ page }) => {
    await openDetail(page, `task_id=${TASK_ID}`);
    expect(await visibleTabNames(page)).toEqual(LEADER_TABS);
    await expect(page.getByRole('tab', { name: '任務概覽' })).toHaveCount(0);
    await expect(page.getByRole('tab', { name: '概覽', exact: true })).toHaveAttribute('aria-selected', 'true');
  });

  test('reviewer sees 設定 and does not see 成員管理', async ({ page }) => {
    await openDetail(page, `task_id=${TASK_ID}&task_role=reviewer`);
    expect(await visibleTabNames(page)).toEqual(REVIEWER_TABS);
    await expect(page.getByRole('tab', { name: '設定', exact: true })).toBeVisible();
    await expect(page.getByRole('tab', { name: '成員管理', exact: true })).toHaveCount(0);
  });

  test('ArrowRight and ArrowLeft move focus and selection between tabs, wrapping at the ends', async ({ page }) => {
    await openDetail(page, `task_id=${TASK_ID}`);
    const tab = (name: string) => page.getByRole('tab', { name, exact: true });

    await tab('概覽').focus();
    await page.keyboard.press('ArrowRight');
    await expect(tab('設定')).toBeFocused();
    await expect(tab('設定')).toHaveAttribute('aria-selected', 'true');
    await expect(tab('概覽')).toHaveAttribute('aria-selected', 'false');

    await page.keyboard.press('ArrowRight');
    await expect(tab('成員管理')).toBeFocused();
    await expect(tab('成員管理')).toHaveAttribute('aria-selected', 'true');

    await page.keyboard.press('ArrowLeft');
    await expect(tab('設定')).toBeFocused();

    await page.keyboard.press('ArrowLeft');
    await expect(tab('概覽')).toBeFocused();
    await page.keyboard.press('ArrowLeft');
    await expect(tab('工時紀錄')).toBeFocused();
    await expect(tab('工時紀錄')).toHaveAttribute('aria-selected', 'true');

    await page.keyboard.press('ArrowRight');
    await expect(tab('概覽')).toBeFocused();
    await expect(tab('概覽')).toHaveAttribute('aria-selected', 'true');
  });

  test('reviewer arrow keys skip the hidden 成員管理 tab', async ({ page }) => {
    await openDetail(page, `task_id=${TASK_ID}&task_role=reviewer`);
    const tab = (name: string) => page.getByRole('tab', { name, exact: true });
    await tab('設定').focus();
    await page.keyboard.press('ArrowRight');
    await expect(tab('標記進度')).toBeFocused();
    await expect(tab('標記進度')).toHaveAttribute('aria-selected', 'true');
  });

  /* FR-025 / SC-019: the header status carries the trial round and derives it from
   * the same current-round source as the overview (getCurrentTrialRound ->
   * #trialRoundValue "R{n}", trialDecisionTitle "R{n} ..."). */
  // T001 shows R1; T016 seeds R1 failed + R2 so the overview shows R2 (SC-019 scenario).
  const TRIAL_CASES = [
    { taskId: 'T001', status: 'dry_run_in_progress', round: '1' },
    { taskId: 'T001', status: 'waiting_iaa_confirmation', round: '1' },
    { taskId: 'T016', status: 'dry_run_in_progress', round: '2' },
    { taskId: 'T016', status: 'waiting_iaa_confirmation', round: '2' },
  ];
  for (const { taskId, status, round } of TRIAL_CASES) {
    test(`trial-stage header status includes the round shown by the overview (${taskId} ${status})`, async ({ page }) => {
      await openDetail(page, `task_id=${taskId}&status=${status}`);
      const shown = (await page.locator('#trialRoundValue').innerText()).trim();
      const m = /^R(\d+)$/.exec(shown);
      expect(m, `overview round value "${shown}" should look like R{n}`).not.toBeNull();
      const n = m![1];
      expect(n).toBe(round);
      await expect(page.locator('#taskHeaderStatus')).toContainText('試標階段');
      await expect(page.locator('#taskHeaderStatus')).toContainText(`第 ${n} 回合`);
    });
  }

  test('official-run header status has no round suffix', async ({ page }) => {
    for (const taskId of [TASK_ID, 'T016']) {
      await openDetail(page, `task_id=${taskId}&status=official_run_in_progress`);
      await expect(page.locator('#taskHeaderStatus')).toContainText('正式標記');
      await expect(page.locator('#taskHeaderStatus')).not.toContainText('回合');
    }
  });

  test('not-found task keeps breadcrumb root and an H1 but shows no task name or status', async ({ page }) => {
    await page.goto(`${TASK_DETAIL_URL}?task_id=T999-DOES-NOT-EXIST`);
    await expect(page.locator('#taskNotFound')).toBeVisible();
    const header = page.locator('#taskHeader');
    await expect(header.getByRole('navigation', { name: 'breadcrumb' })).toContainText('任務管理');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.locator('body')).not.toContainText('醫療文本情感分類');
    await expect(page.locator('#taskHeaderStatus')).not.toBeVisible();
  });

  for (const modifier of ['Alt', 'Control', 'Meta']) {
    test(`${modifier}+ArrowRight on a focused tab does not change the selected tab`, async ({ page }) => {
      await openDetail(page, `task_id=${TASK_ID}`);
      const overview = page.getByRole('tab', { name: '概覽', exact: true });
      await overview.focus();
      await page.keyboard.press(`${modifier}+ArrowRight`);
      await expect(overview).toHaveAttribute('aria-selected', 'true');
      await expect(page.getByRole('tab', { name: '設定', exact: true })).toHaveAttribute('aria-selected', 'false');
    });
  }
});
