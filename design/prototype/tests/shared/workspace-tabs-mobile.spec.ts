/* Red tests for Workspace Tabs (specs/shared/019-workspace-tabs/spec.md),
 * issue #1075 sub-group G2e -- mobile (<=MOBILE_BP, 767px) "已開啟 N 頁"
 * dropdown that replaces the desktop tab bar (FR-002, AC-6.1-AC-6.3, US6),
 * plus a mobile close affordance per explicit coordinator instruction
 * (broader than the literal AC-6.x text, analogous to desktop's own close
 * button -- see workspace-tabs-close-badge.spec.ts's AC-1.5 describe block).
 *
 * No mobile dropdown replacement exists anywhere in
 * `design/prototype/pages/shared/sidebar.js` / `sidebar.css` yet:
 * sidebar.css's own `@media (max-width: 767px) { .workspace-tab-bar {
 * display: none; } }` (see its "G2f" comment -- this task brief's own
 * numbering for this sub-group is G2e; the two names refer to the same
 * mobile-dropdown work) only HIDES the desktop bar today, with no
 * replacement -- every test below that exercises the toggle/dropdown is
 * expected to FAIL until a later G2e Green task adds them.
 *
 * NEW selector contract this file defines for the Green implementer
 * (mirrors `_workspace-tabs-helpers.ts`'s existing desktop contract and the
 * established `#mobileNotificationBellBtn` / `#notificationDropdown`
 * precedent in sidebar.js: a static toggle button rendered in
 * renderSidebar()'s brand-section template, hidden by default and shown
 * only at <=767px by sidebar.css -- see `.mobile-notification-bell-btn`'s
 * own default-hidden/`@media` pair -- plus a dropdown panel built via
 * document.createElement()/appendChild() inside mountSidebar(), toggled by
 * a `.hidden` class):
 *   - Toggle button: `[data-testid="workspace-tab-mobile-toggle"]`, visible
 *     only at <=MOBILE_BP, showing text containing the open tab count N
 *     (AC-6.1's "已開啟 N 頁" zh string verbatim from spec.md; see the EN
 *     judgment call below).
 *   - Dropdown panel: `[data-testid="workspace-tab-mobile-dropdown"]`.
 *   - Each item inside it: `[data-testid="workspace-tab-mobile-item"]`,
 *     clicking anywhere on the item (outside its own close affordance)
 *     activates that tab (AC-6.2).
 *   - Close affordance nested inside each item:
 *     `[data-testid="workspace-tab-mobile-item-close"]` -- a separate
 *     testid rather than reusing desktop's `getByRole('button')` pattern
 *     (`closeButton()` in `_workspace-tabs-helpers.ts`) because a mobile
 *     list item may reasonably contain more than one button-like child;
 *     an explicit testid keeps the close target unambiguous for both this
 *     suite and the Green implementer.
 *
 * EN wording judgment call (AC-6.1): spec.md only states the zh string
 * "已開啟 N 頁" literally (no EN wording given). This suite's own choice,
 * mirroring this file's existing short-noun-phrase i18n pairs (e.g.
 * `workspaceTabCapNoticeI18n`), is "N tabs open" (e.g. "3 tabs open").
 *
 * Close-affordance dropdown-stays-open decision: closing a NON-ACTIVE
 * item keeps the dropdown open (does not also dismiss it). This mirrors
 * desktop's own closeWorkspaceTab() contract exactly --
 * workspace-tabs-close-badge.spec.ts's AC-1.5 block (and sidebar.js's own
 * closeWorkspaceTab() comment) establish that closing a non-active tab
 * "never navigates; it only re-renders this page's own bar" with no other
 * side effect. Applying the same "closing a non-active item is a pure list
 * mutation, nothing else" rule to the mobile dropdown lets a user close
 * several tabs in a row without the dropdown re-opening itself each time.
 *
 * No-horizontal-scroll idiom (AC-6.3/FR-015): reuses the established
 * `document.documentElement.scrollWidth - document.documentElement
 * .clientWidth <= 0` idiom already used by
 * `tests/task-management/task-detail-mobile-layout.spec.ts` and
 * `tests/task-management/issue-406-mobile-layout-overflow.spec.ts`, scoped
 * a second time to the dropdown panel element itself via the same
 * `scrollWidth - clientWidth` comparison.
 *
 * Out of scope (per task brief): desktop viewport behavior (prior
 * sub-groups' own coverage) and `mobile-top-actions.spec.ts`'s fixed
 * `#mobileLangToggle`/`#mobileThemeToggleBtn`/`#mobileNotificationBellBtn`/
 * `#mobileLogoutBtn` + `.navbar-brand`/`.navbar-wordmark` metrics suite --
 * not touched by this file; this new toggle button must not change
 * `.navbar-brand`'s flex-grow or `.navbar-wordmark`'s font-size, but
 * verifying that stays that file's own regression job, not a new test here.
 */
import { test, expect, type Locator, type Page } from '@playwright/test';
import { tabBar, readWorkspaceTabState } from './_workspace-tabs-helpers';
import { buildWorkspaceUrl, skipGuidelineModal } from '../annotation/_workspace-helpers';

const DASHBOARD_URL = '/pages/dashboard/dashboard.html';
const TASK_LIST_URL = '/pages/task-management/task-list.html';
const DATASET_LIST_URL = '/pages/dataset/dataset-analysis-list.html';
const USER_MANAGEMENT_URL = '/pages/admin/user-management.html';
const TASK_NEW_URL = '/pages/task-management/task-new.html';
const TASK_DETAIL_T001_R1_URL = '/pages/task-management/task-detail.html?task_id=T001&ap_stage=r1';

function mobileToggle(page: Page): Locator {
  return page.getByTestId('workspace-tab-mobile-toggle');
}

function mobileDropdown(page: Page): Locator {
  return page.getByTestId('workspace-tab-mobile-dropdown');
}

function mobileItems(page: Page): Locator {
  return mobileDropdown(page).getByTestId('workspace-tab-mobile-item');
}

function mobileItemClose(item: Locator): Locator {
  return item.getByTestId('workspace-tab-mobile-item-close');
}

test.describe('Workspace tabs — AC-6.1 mobile dropdown replaces the tab bar', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
  });

  test('zh: the desktop tab bar is hidden and the mobile toggle shows "已開啟 3 頁"', async ({ page }) => {
    await page.goto(DASHBOARD_URL);
    await page.goto(TASK_LIST_URL);
    await page.goto(DATASET_LIST_URL);

    await expect(tabBar(page)).toBeHidden();
    const toggle = mobileToggle(page);
    await expect(toggle).toBeVisible();
    await expect(toggle).toContainText('已開啟 3 頁');
  });

  // Switches language via #mobileLangToggle (the only language toggle
  // visible at <=767px -- `.brand-section .lang-toggle { display: none; }`
  // hides #langToggle at this viewport, per sidebar-i18n.spec.ts's own
  // 375px precedent) BEFORE the subsequent navigations, so each later tab
  // mounts fresh in English -- mirrors workspace-tabs-close-badge.spec.ts's
  // own "toggle language, then navigate" sequencing for its EN assertion.
  test('en: the mobile toggle shows "3 tabs open" after switching language', async ({ page }) => {
    await page.goto(DASHBOARD_URL);
    await page.locator('#mobileLangToggle').click();
    await page.goto(TASK_LIST_URL);
    await page.goto(DATASET_LIST_URL);

    await expect(tabBar(page)).toBeHidden();
    const toggle = mobileToggle(page);
    await expect(toggle).toBeVisible();
    await expect(toggle).toContainText('3 tabs open');
  });
});

test.describe('Workspace tabs — AC-6.2 clicking a mobile dropdown item', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
  });

  test('activates the tapped (non-active) tab, updates activeIndex, and closes the dropdown', async ({ page }) => {
    await page.goto(DASHBOARD_URL);
    await page.goto(TASK_LIST_URL);
    await page.goto(DATASET_LIST_URL); // 3rd/active

    await mobileToggle(page).click();
    const items = mobileItems(page);
    await expect(items).toHaveCount(3);

    // Tap the first (non-active) item -> dashboard, exactly like desktop's
    // click-to-activate (workspace-tabs-core.spec.ts's AC-1.2/1.3 block).
    await items.nth(0).click();

    await expect(page).toHaveURL(new RegExp(DASHBOARD_URL.replace(/\//g, '\\/') + '$'));
    const state = (await readWorkspaceTabState(page)) as { activeIndex: number } | null;
    expect(state?.activeIndex).toBe(0);
    await expect(mobileDropdown(page)).toBeHidden();
  });
});

test.describe('Workspace tabs — AC-6.3 / FR-015 no horizontal scroll with 8 tabs open and the dropdown expanded at 375px', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await skipGuidelineModal(page);
  });

  test('neither the page nor the dropdown panel overflows horizontally with 8 distinct tabs open', async ({ page }) => {
    test.setTimeout(60_000);

    // Same 8-distinct-dedupe-key combo as workspace-tabs-cap.spec.ts (spec
    // 019 頁面種類 → 去重鍵對照表): no cap/eviction behavior is exercised
    // here (exactly 8, not a 9th), just 8 genuinely distinct open tabs.
    await page.goto(DASHBOARD_URL);
    await page.goto(TASK_LIST_URL);
    await page.goto(DATASET_LIST_URL);
    await page.goto(USER_MANAGEMENT_URL);
    await page.goto(TASK_NEW_URL);
    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001', role: 'annotator', run_type: 'official_run' }));
    await page.goto(buildWorkspaceUrl({ task_id: 'T002', sample_id: 'emo-001', role: 'annotator', run_type: 'official_run' }));
    await page.goto(TASK_DETAIL_T001_R1_URL);

    await mobileToggle(page).click();
    await expect(mobileItems(page)).toHaveCount(8);

    const pageOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(pageOverflow).toBeLessThanOrEqual(0);

    const dropdownOverflow = await mobileDropdown(page).evaluate(
      (node) => node.scrollWidth - node.clientWidth
    );
    expect(dropdownOverflow).toBeLessThanOrEqual(0);
  });
});

test.describe('Workspace tabs — mobile dropdown close affordance (coordinator-directed, beyond literal AC-6.x text)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
  });

  test('closing a non-active item removes it from the tab list, does not navigate, and leaves the dropdown open', async ({ page }) => {
    await page.goto(DASHBOARD_URL);
    await page.goto(TASK_LIST_URL);
    await page.goto(DATASET_LIST_URL); // 3rd/active

    await mobileToggle(page).click();
    const items = mobileItems(page);
    await expect(items).toHaveCount(3);

    // Close item 0 (dashboard) -- not the active tab.
    await mobileItemClose(items.nth(0)).click();

    await expect(items).toHaveCount(2);
    await expect(page).toHaveURL(new RegExp(DATASET_LIST_URL.replace(/\//g, '\\/') + '$'));

    const state = (await readWorkspaceTabState(page)) as { tabs: Array<{ dedupeKey: string }> } | null;
    const keys = state?.tabs.map((t) => t.dedupeKey) ?? [];
    expect(keys).not.toContain(DASHBOARD_URL);
    expect(keys).toContain(TASK_LIST_URL);
    expect(keys).toContain(DATASET_LIST_URL);

    // Mirrors desktop's closeWorkspaceTab(): closing a non-active tab is a
    // pure list mutation with no other side effect -- the dropdown itself
    // must stay open so further closes can follow without reopening it.
    await expect(mobileDropdown(page)).toBeVisible();
  });
});
