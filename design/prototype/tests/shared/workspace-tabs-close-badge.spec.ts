/* Red tests for Workspace Tabs (specs/shared/019-workspace-tabs/spec.md),
 * issue #1075 sub-group G2a-2 -- close button (AC-1.5) and task-detail
 * stage badge (AC-1.6), desktop viewport (1280x900) only.
 *
 * Split out of workspace-tabs-core.spec.ts (originally all of AC-1.1
 * through AC-1.6 in one file/commit) purely to keep each stacked PR's
 * hand-written production diff within the project's PR-size guardrail:
 * G2a-1 ships the tab bar's existence/dedupe/open-switch behavior
 * (AC-1.1-AC-1.4, AC-3.1-AC-3.4) without a close button or stage badge;
 * this file's two describe blocks -- moved here verbatim, no assertion
 * changes -- are G2a-2's Red contract, landing once the close button and
 * stage badge are implemented. No implementation exists yet for either at
 * the time this file is committed on its own branch: G2a-1's Green task
 * deliberately omits both (see sidebar.js's "Close button + AC-1.5
 * focus-move rule are added by a later sub-group" comment), so both tests
 * below must fail until G2a-2's own Green task adds them.
 *
 * AC-1.5's FINAL focus-move algorithm is formalized by a separate,
 * not-yet-written `shared-008` MODIFIED change (spec 019 FR-009 / Q7) --
 * see that describe block for how this suite stays forward-compatible.
 */
import { test, expect } from '@playwright/test';
import { workspaceTabs, closeButton, setDesktopViewport } from './_workspace-tabs-helpers';

const DASHBOARD_URL = '/pages/dashboard/dashboard.html';
// T001 (task-list.data.js): nameZh '醫療文本情感分類', with dry-run round
// 'r1' and an 'official' bucket both present in its ANNOTATION_PROGRESS
// seed (task-detail.html's DEFAULT_ANNOTATION_PROGRESS, since T001 has no
// ANNOTATION_PROGRESS_BY_TASK override) -- both ap_stage values below are
// valid per task-detail.html's own URL_VIEW_STATE validator.
const TASK_DETAIL_R1_URL = '/pages/task-management/task-detail.html?task_id=T001&ap_stage=r1';
const TASK_DETAIL_OFFICIAL_URL = '/pages/task-management/task-detail.html?task_id=T001&ap_stage=official';
const TASK_NAME_ZH = '醫療文本情感分類';

test.describe('Workspace tabs — AC-1.5 closing the active tab moves focus', () => {
  test.beforeEach(async ({ page }) => {
    await setDesktopViewport(page);
  });

  /* shared-008's MODIFIED focus-move rule (spec 019 FR-009 / Q7) is not yet
   * written, so this test asserts the provisional rule stated in the task
   * brief rather than spec text: close the active tab -> focus moves to the
   * tab now in the position immediately to the right of the closed one; if
   * the closed tab was rightmost, focus moves to the tab immediately to its
   * left. Both branches are exercised below via index-position assertions
   * only (no text/testid pinned to a specific tab identity), so this test
   * should not need rewriting once shared-008 lands -- only its own
   * described behavior might. */
  test('closing a middle/left active tab activates the tab that was to its right; closing the rightmost activates the one to its left', async ({ page }) => {
    await page.goto(DASHBOARD_URL);
    await page.getByRole('link', { name: '任務管理' }).click();
    await page.getByRole('link', { name: '資料集分析' }).click();
    const tabs = workspaceTabs(page);
    await expect(tabs).toHaveCount(3); // [dashboard, task-list, dataset-analysis*]

    // Re-activate the leftmost (non-rightmost) tab, then close it.
    await tabs.nth(0).click();
    await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'true');
    await closeButton(tabs.nth(0)).click();

    await expect(tabs).toHaveCount(2); // [task-list, dataset-analysis]
    await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'true');
    await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'false');

    // Now close the rightmost (and only remaining non-active... make it
    // active first) tab: no tab to its right, so focus must move left.
    await tabs.nth(1).click();
    await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
    await closeButton(tabs.nth(1)).click();

    await expect(tabs).toHaveCount(1);
    await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'true');
  });
});

test.describe('Workspace tabs — AC-1.6 task-detail stage badge', () => {
  test.beforeEach(async ({ page }) => {
    await setDesktopViewport(page);
  });

  test('zh: dry-run tab shows "試標 R1" and official tab shows "正式", both with the task name', async ({ page }) => {
    await page.goto(TASK_DETAIL_R1_URL);
    await page.goto(TASK_DETAIL_OFFICIAL_URL);
    const tabs = workspaceTabs(page);
    await expect(tabs).toHaveCount(2);

    const r1Tab = tabs.nth(0);
    const officialTab = tabs.nth(1);
    await expect(r1Tab).toHaveAttribute('data-stage-badge', 'dry_run');
    await expect(r1Tab).toContainText('試標 R1');
    await expect(r1Tab).toContainText(TASK_NAME_ZH);

    await expect(officialTab).toHaveAttribute('data-stage-badge', 'official_run');
    await expect(officialTab).toContainText('正式');
    await expect(officialTab).toContainText(TASK_NAME_ZH);
  });

  test('en: stage badges translate through the shared language toggle (#langToggle)', async ({ page }) => {
    await page.goto(TASK_DETAIL_R1_URL);
    await page.locator('#langToggle').click();
    await page.goto(TASK_DETAIL_OFFICIAL_URL);
    const tabs = workspaceTabs(page);
    await expect(tabs).toHaveCount(2);

    // No English wording for TAB_STAGE_BADGE exists in spec 019 yet (spec
    // only states the zh labels); this suite's own choice, matching this
    // codebase's existing progressStageDry/progressStageOfficial pair
    // (task-detail.html i18n: 'Dry Run' / 'Official Run').
    await expect(tabs.nth(0)).toContainText(/Dry Run R1/i);
    await expect(tabs.nth(1)).toContainText(/Official/i);
  });
});
