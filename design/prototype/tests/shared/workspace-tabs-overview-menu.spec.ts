/* Red tests for the shared Workspace Tabs Overview Menu -- G2a subset
 * (issue #1099, maintainer-directed split of the original G2 group; see
 * openspec/changes/1099-workspace-tabs-overview-menu/design.md "## G2 --
 * 總覽選單" and spec delta `openspec/changes/1099-workspace-tabs-overview-
 * menu/specs/shared/019-workspace-tabs/spec.md` FR-023 / FR-023A).
 *
 * G2's full implementation diff (446 lines) exceeded the project's 300-line
 * PR cap, so the maintainer split it into G2a (this file, desktop-only
 * subset) and G2b (filter, keyboard model, mobile replacement -- built
 * later from the already-implemented `feat/1099-tabs-overview-menu`
 * branch). This file intentionally covers ONLY the subset below; it does
 * NOT assert the filter input, ArrowUp/Down highlight model, Enter-to-
 * activate, Esc-to-close-and-refocus, or the mobile dropdown replacement --
 * those stay G2b's scope and ship from the other branch.
 *
 * No implementation exists yet in `design/prototype/pages/shared/
 * sidebar.js` / `sidebar.css` (unmodified `origin/main`): there is no
 * `renderWorkspaceTabOverviewMenu()`, no desktop trigger, and the mobile
 * branch still renders the OLD `renderWorkspaceTabMobileDropdown()`
 * (`#workspaceTabMobileToggle`, `.workspace-tab-mobile-dropdown`) --
 * untouched by this change. Every test below is expected to FAIL until a
 * later G2a Green task adds the shared component.
 *
 * Selector contract this file DECIDES for the Green implementer, trimmed
 * from the full G2 contract to the G2a subset (mirrors the full suite's
 * own "NEW selector contract" precedent):
 *
 *   - Exactly ONE element may ever carry `[data-testid="workspace-tab-
 *     overview-trigger"]` at a time. It shows the current tab count N as
 *     part of its text (exact zh/en wording is NOT locked).
 *   - Menu panel: `[data-testid="workspace-tab-overview-menu"]`.
 *   - Each row: `[data-testid="workspace-tab-overview-item"]`, with a
 *     nested `[data-testid="workspace-tab-overview-item-close"]` close
 *     button (mirrors `workspace-tab-mobile-item`/`-item-close`).
 *   - Active-tab marker: `aria-current="true"` on the row matching the
 *     currently open tab (same codebase-wide `aria-current="page"`
 *     convention as sidebar.js's own nav items; see the full G2 suite's
 *     header for the detailed precedent citation).
 *   - Bottom action slots (FR-023 point 2's 4th content block):
 *     `[data-testid="workspace-tab-overview-reopen"]` and
 *     `[data-testid="workspace-tab-overview-close-all"]`. G2a asserts
 *     their EXISTENCE only, plus the reopen slot's `disabled` state (true
 *     pre-G3 because nothing pushes to the reopen stack yet) -- their
 *     BEHAVIOR (`FR-024` reopen-stack / `FR-025` close-all) is G3 scope.
 *   - Trigger ARIA carryover (FR-020 "無障礙延伸"): `aria-haspopup="true"`
 *     and a toggling `aria-expanded`, modeled on the superseded
 *     `#workspaceTabMobileToggle` contract this component eventually
 *     replaces in G2b (sidebar.js ~line 1589) and on
 *     `#mobileNotificationBellBtn`'s identical pattern (~line 1583).
 *   - Opening/closing the menu in G2a is a plain click on the trigger
 *     (toggle). There is no filter input to auto-focus in this scope, so
 *     no focus assertion is made on open.
 *
 * NO filter testid (`workspace-tab-overview-filter`), NO `aria-selected`
 * keyboard-highlight attribute, and NO mobile-dropdown-retirement
 * assertions exist in this file -- all G2b. `workspace-tabs-mobile.spec.ts`
 * is untouched and keeps covering the mobile dropdown unmodified.
 */
import { test, expect, type Locator, type Page } from '@playwright/test';
import { tabBar, readWorkspaceTabState, setDesktopViewport } from './_workspace-tabs-helpers';
import { buildWorkspaceUrl, skipGuidelineModal } from '../annotation/_workspace-helpers';

const DASHBOARD_URL = '/pages/dashboard/dashboard.html';
const TASK_LIST_URL = '/pages/task-management/task-list.html';
const DATASET_LIST_URL = '/pages/dataset/dataset-analysis-list.html';
const USER_MANAGEMENT_URL = '/pages/admin/user-management.html';
const TASK_NEW_URL = '/pages/task-management/task-new.html';
// T001 (task-list.data.js): nameEn 'Medical Text Sentiment Classification',
// valid ap_stage=r1 per task-detail.html's own URL_VIEW_STATE validator.
const TASK_DETAIL_T001_R1_URL = '/pages/task-management/task-detail.html?task_id=T001&ap_stage=r1';

const POSITION_TOLERANCE_PX = 1;

function trigger(page: Page): Locator {
  return page.getByTestId('workspace-tab-overview-trigger');
}

function menu(page: Page): Locator {
  return page.getByTestId('workspace-tab-overview-menu');
}

function items(page: Page): Locator {
  return menu(page).getByTestId('workspace-tab-overview-item');
}

function itemClose(item: Locator): Locator {
  return item.getByTestId('workspace-tab-overview-item-close');
}

function reopenAction(page: Page): Locator {
  return menu(page).getByTestId('workspace-tab-overview-reopen');
}

function closeAllAction(page: Page): Locator {
  return menu(page).getByTestId('workspace-tab-overview-close-all');
}

async function openMenu(page: Page): Promise<void> {
  await trigger(page).click();
  await expect(menu(page)).toBeVisible();
}

/** Opens 8 distinct dedupe-key tabs (same combo as the full G2 suite's own
 * AC-023.2 desktop-scroll case, reused verbatim here). */
async function openEightDistinctTabs(page: Page): Promise<void> {
  await page.goto(DASHBOARD_URL);
  await page.goto(TASK_LIST_URL);
  await page.goto(DATASET_LIST_URL);
  await page.goto(USER_MANAGEMENT_URL);
  await page.goto(TASK_NEW_URL);
  await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001', role: 'annotator', run_type: 'official_run' }));
  await page.goto(buildWorkspaceUrl({ task_id: 'T002', sample_id: 'emo-001', role: 'annotator', run_type: 'official_run' }));
  await page.goto(TASK_DETAIL_T001_R1_URL);
}

test.describe('Workspace tabs overview menu (G2a) — AC-023.1 trigger count and row listing', () => {
  test.beforeEach(async ({ page }) => {
    await setDesktopViewport(page);
  });

  test('desktop: trigger shows the tab count and the menu lists exactly N rows, with the active tab marked distinct', async ({ page }) => {
    await page.goto(DASHBOARD_URL);
    await page.goto(TASK_LIST_URL);
    await page.goto(DATASET_LIST_URL); // 3rd / active

    await expect(trigger(page)).toContainText('3');

    await openMenu(page);
    const rows = items(page);
    await expect(rows).toHaveCount(3);

    const activeRows = menu(page).locator('[aria-current="true"]');
    await expect(activeRows).toHaveCount(1);
    await expect(activeRows).toContainText('資料集分析');
  });

  test('desktop boundary: N=1 still shows the count and marks the single row active', async ({ page }) => {
    await page.goto(DASHBOARD_URL);

    await expect(trigger(page)).toContainText('1');
    await openMenu(page);
    const rows = items(page);
    await expect(rows).toHaveCount(1);
    await expect(rows.nth(0)).toHaveAttribute('aria-current', 'true');
  });
});

test.describe('Workspace tabs overview menu (G2a) — AC-023.2 desktop trigger stays fixed while the tab strip scrolls', () => {
  test.beforeEach(async ({ page }) => {
    await setDesktopViewport(page);
  });

  test('trigger bounding box is unchanged after scrolling a tab strip wide enough to overflow', async ({ page }) => {
    test.setTimeout(60_000);
    await skipGuidelineModal(page);
    await openEightDistinctTabs(page);

    const before = await trigger(page).boundingBox();
    expect(before).not.toBeNull();

    await tabBar(page).evaluate((el) => {
      el.scrollLeft = el.scrollWidth;
    });

    const after = await trigger(page).boundingBox();
    expect(after).not.toBeNull();
    expect(after!.x).toBeGreaterThanOrEqual(before!.x - POSITION_TOLERANCE_PX);
    expect(after!.x).toBeLessThanOrEqual(before!.x + POSITION_TOLERANCE_PX);
    expect(after!.y).toBeGreaterThanOrEqual(before!.y - POSITION_TOLERANCE_PX);
    expect(after!.y).toBeLessThanOrEqual(before!.y + POSITION_TOLERANCE_PX);
  });
});

test.describe('Workspace tabs overview menu (G2a) — AC-023A.1 clicking a non-active row switches and closes the menu', () => {
  test.beforeEach(async ({ page }) => {
    await setDesktopViewport(page);
  });

  test('switches via the existing activation path (no history growth) and closes the menu', async ({ page }) => {
    await page.goto(DASHBOARD_URL);
    await page.goto(TASK_LIST_URL);
    await page.goto(DATASET_LIST_URL); // active

    const historyLengthBefore = await page.evaluate(() => window.history.length);

    await openMenu(page);
    const rows = items(page);
    await expect(rows).toHaveCount(3);

    await rows.nth(0).click(); // dashboard, non-active

    await expect(page).toHaveURL(new RegExp(DASHBOARD_URL.replace(/\//g, '\\/') + '$'));
    const state = (await readWorkspaceTabState(page)) as { activeIndex: number } | null;
    expect(state?.activeIndex).toBe(0);
    await expect(menu(page)).toBeHidden();

    // FR-023A: "不產生瀏覽歷程記錄" — same .replace()-style navigation
    // activateWorkspaceTab() already uses, not a history.pushState()/<a>
    // navigation that would grow history.length.
    const historyLengthAfter = await page.evaluate(() => window.history.length);
    expect(historyLengthAfter).toBe(historyLengthBefore);
  });
});

test.describe('Workspace tabs overview menu (G2a) — FR-023 point 2 row structure (icon + close button) and bottom action slots', () => {
  test.beforeEach(async ({ page }) => {
    await setDesktopViewport(page);
  });

  test('each row renders an icon and a close button; closing a non-active row removes it without closing the menu or switching tabs', async ({ page }) => {
    await page.goto(DASHBOARD_URL);
    await page.goto(TASK_LIST_URL); // active

    await openMenu(page);
    const rows = items(page);
    await expect(rows).toHaveCount(2);

    const dashboardRow = rows.nth(0);
    await expect(dashboardRow.locator('svg')).not.toHaveCount(0);
    await expect(itemClose(dashboardRow)).toBeVisible();

    await itemClose(dashboardRow).click();

    await expect(rows).toHaveCount(1);
    await expect(menu(page)).toBeVisible();
    await expect(page).toHaveURL(new RegExp(TASK_LIST_URL.replace(/\//g, '\\/') + '$'));
  });

  test('reopen and close-all action slots exist; reopen is disabled while the reopen stack is empty (G3 has not wired it yet)', async ({ page }) => {
    await page.goto(DASHBOARD_URL);
    await openMenu(page);

    await expect(reopenAction(page)).toHaveCount(1);
    await expect(reopenAction(page)).toBeDisabled();

    await expect(closeAllAction(page)).toHaveCount(1);
    await expect(closeAllAction(page)).toHaveAttribute('type', 'button');
    await expect(closeAllAction(page)).toBeEnabled();
  });
});

test.describe('Workspace tabs overview menu (G2a) — FR-020 a11y preserved: trigger aria-haspopup/aria-expanded', () => {
  test.beforeEach(async ({ page }) => {
    await setDesktopViewport(page);
  });

  test('trigger has aria-haspopup=true and aria-expanded toggles with open/close', async ({ page }) => {
    await page.goto(DASHBOARD_URL);

    await expect(trigger(page)).toHaveAttribute('aria-haspopup', 'true');
    await expect(trigger(page)).toHaveAttribute('aria-expanded', 'false');

    await trigger(page).click();
    await expect(trigger(page)).toHaveAttribute('aria-expanded', 'true');

    await trigger(page).click();
    await expect(trigger(page)).toHaveAttribute('aria-expanded', 'false');
  });
});
