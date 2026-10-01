/* Red tests for Workspace Tabs (specs/shared/019-workspace-tabs/spec.md),
 * issue #1075 sub-group G2b -- state restoration: scroll position (AC-2.1),
 * reload / new-browser-tab isolation (AC-2.3), logout clearing (AC-2.4), and
 * the no-history-growth invariant for tab-bar switches (AC-2.5). Desktop
 * viewport (1280x900) only -- `#logoutBtn` (AC-2.4) is desktop-only; see
 * G2b's close/badge-flavored sibling `workspace-tabs-close-badge.spec.ts`
 * for the mobile dropdown's own coverage.
 *
 * `design/prototype/pages/shared/sidebar.js` (as of G2a-2, commit 19b9fe9b)
 * switches tabs via `window.location.href = state.tabs[index].url` in both
 * `activateWorkspaceTab()` and `closeWorkspaceTab()` -- a real forward
 * navigation, not `history.replaceState()` (FR-017) -- and has no
 * `TAB_SCROLL_STORAGE_KEY` read/write (FR-019) and no tab-state clearing in
 * its logout handler (FR-018) at all. So AC-2.1, AC-2.4, and AC-2.5 below
 * are expected to FAIL until a later G2b Green task adds all three. AC-2.3
 * is a partial exception -- see that describe block's own header comment.
 */
import { test, expect } from '@playwright/test';
import {
  workspaceTabs,
  readWorkspaceTabState,
  setDesktopViewport,
  TAB_STORAGE_KEY,
  TAB_SCROLL_STORAGE_KEY,
} from './_workspace-tabs-helpers';

const DASHBOARD_URL = '/pages/dashboard/dashboard.html';
const TASK_LIST_URL = '/pages/task-management/task-list.html';

test.describe('Workspace tabs — AC-2.1 scroll position restore', () => {
  test.beforeEach(async ({ page }) => {
    await setDesktopViewport(page);
  });

  /* task-list.html at 1280x900 renders a 17-row demo task table (see
   * task-list.data.js) whose full layout is taller than the viewport --
   * confirmed empirically (scrollHeight 1549 vs clientHeight 900 at this
   * exact viewport, via a throwaway probe spec run against this branch
   * before writing this test; see report) -- so no in-test state-forcing
   * is needed to make it scrollable. */
  test('switching away from a tab and back restores its scroll position', async ({ page }) => {
    await page.goto(TASK_LIST_URL);
    await expect(workspaceTabs(page)).toHaveCount(1);

    const SCROLL_Y = 400;
    await page.evaluate((y) => window.scrollTo(0, y), SCROLL_Y);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(SCROLL_Y);

    // Open a second tab (also scrollable; dataset-analysis-list.html) --
    // switches away from the task-list tab under test.
    await page.getByRole('link', { name: '資料集分析' }).click();
    await expect(workspaceTabs(page)).toHaveCount(2);

    // Switch back to the task-list tab via the tab bar itself.
    await workspaceTabs(page).nth(0).click();
    await expect(workspaceTabs(page).nth(0)).toHaveAttribute('aria-selected', 'true');
    await expect(page).toHaveURL(new RegExp(TASK_LIST_URL.replace(/\//g, '\\/') + '$'));

    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(SCROLL_Y);
  });
});

test.describe('Workspace tabs — AC-2.3 reload restores the tab list; a new browser tab starts blank', () => {
  test.beforeEach(async ({ page }) => {
    await setDesktopViewport(page);
  });

  /* Unlike the rest of this file, this one case may already pass against
   * current `origin/main` code: sessionStorage itself survives a same-tab
   * reload with zero extra logic required, and `mountWorkspaceTabBar()`
   * already re-reads it via `syncCurrentPageIntoWorkspaceTabs()` on every
   * mount (sidebar.js:588-596). Kept here as regression coverage, not as a
   * claimed new-Red case -- see report for the actual run's pass/fail. */
  test('reloading the browser tab leaves the tab list and active tab unchanged', async ({ page }) => {
    await page.goto(DASHBOARD_URL);
    await page.getByRole('link', { name: '任務管理' }).click();
    await page.getByRole('link', { name: '資料集分析' }).click();
    const tabs = workspaceTabs(page);
    await expect(tabs).toHaveCount(3);
    const beforeState = await readWorkspaceTabState(page);

    await page.reload();

    await expect(tabs).toHaveCount(3);
    await expect(tabs.nth(2)).toHaveAttribute('aria-selected', 'true');
    const afterState = await readWorkspaceTabState(page);
    expect(afterState).toEqual(beforeState);
  });

  /* Also likely a pre-existing pass, for the same sessionStorage-partitioning
   * reason: a second Page in the same BrowserContext is a separate top-level
   * browsing context, and sessionStorage is partitioned per browsing
   * context, not per profile/context -- so it has nothing to inherit even
   * without any dedicated "new tab" handling in sidebar.js. This is the
   * correct simulation of "開一個新的瀏覽器分頁" (Q5): `context.newPage()`
   * stays in the same browser window/profile (shares cookies/localStorage),
   * matching a real Ctrl+T new tab, as opposed to `browser.newContext()`,
   * which would simulate a separate window/profile -- a stronger and less
   * precise analogy that happens to produce the same sessionStorage result
   * for an unrelated reason (full isolation, not tab-partitioning). */
  test('a brand new browser tab starts with a blank tab list, not another tab\'s', async ({ page, context }) => {
    await page.goto(DASHBOARD_URL);
    await page.getByRole('link', { name: '任務管理' }).click();
    await expect(workspaceTabs(page)).toHaveCount(2);

    const newTabPage = await context.newPage();
    await newTabPage.setViewportSize({ width: 1280, height: 900 });
    await newTabPage.goto(DASHBOARD_URL);

    await expect(workspaceTabs(newTabPage)).toHaveCount(1);
    await expect(workspaceTabs(newTabPage).nth(0)).toHaveAttribute('aria-selected', 'true');

    await newTabPage.close();
  });
});

test.describe('Workspace tabs — AC-2.4 logout clears tab state', () => {
  test.beforeEach(async ({ page }) => {
    await setDesktopViewport(page);
  });

  test('clicking #logoutBtn clears both TAB_STORAGE_KEY and TAB_SCROLL_STORAGE_KEY before reaching the login page', async ({ page }) => {
    await page.goto(DASHBOARD_URL);
    await page.getByRole('link', { name: '任務管理' }).click();
    await expect(workspaceTabs(page)).toHaveCount(2);
    const before = await readWorkspaceTabState(page);
    expect(before).not.toBeNull();

    await Promise.all([
      page.waitForURL(/account\/login\.html/),
      page.locator('#logoutBtn').click(),
    ]);

    const tabState = await page.evaluate((key) => window.sessionStorage.getItem(key), TAB_STORAGE_KEY);
    expect(tabState).toBeNull();
    const scrollState = await page.evaluate((key) => window.sessionStorage.getItem(key), TAB_SCROLL_STORAGE_KEY);
    expect(scrollState).toBeNull();
  });
});

test.describe('Workspace tabs — AC-2.5 tab-bar switches do not grow browser history', () => {
  test.beforeEach(async ({ page }) => {
    await setDesktopViewport(page);
  });

  /* Only switches performed via the tab bar's OWN click handler are in
   * scope here -- NOT the first, real navigation to a not-yet-open page
   * (expected to push history normally) and NOT in-page sub-tab/filter
   * changes within a single page (already history.replaceState(), covered
   * by task-management-014's own FR-019 suite). `history.length` captured
   * via page.evaluate(), before vs. after, is used instead of exercising
   * the browser "back" button: it is synchronous, has no navigation-timing
   * race to wait out, and directly encodes FR-017's actual requirement
   * ("must not push") rather than a downstream behavioral proxy for it. */
  test('switching tabs via the tab bar leaves history.length unchanged, across repeated switches', async ({ page }) => {
    await page.goto(DASHBOARD_URL);
    // First-ever visit to task-list: a real navigation via a sidebar link,
    // not a tab-bar switch -- its own history push is not asserted here.
    await page.getByRole('link', { name: '任務管理' }).click();
    const tabs = workspaceTabs(page);
    await expect(tabs).toHaveCount(2);
    await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');

    const beforeLength = await page.evaluate(() => window.history.length);

    // Switch task-list (B, active) -> dashboard (A) via the TAB BAR.
    await tabs.nth(0).click();
    await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'true');
    expect(await page.evaluate(() => window.history.length)).toBe(beforeLength);

    // Switch back A -> B, again via the tab bar, to show the invariant
    // holds across repeated switches, not just a single one.
    await tabs.nth(1).click();
    await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
    expect(await page.evaluate(() => window.history.length)).toBe(beforeLength);
  });
});
