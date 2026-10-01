/* Tests for Workspace Tabs (specs/shared/019-workspace-tabs/spec.md),
 * issue #1075 sub-group G2g -- accessibility: tablist/tab ARIA (AC-8.1),
 * arrow-key focus movement + Enter/Space activation (AC-8.2), and close
 * button aria-labels (AC-8.3). Desktop viewport (1280x900) only -- the
 * mobile dropdown (G2e) is a different widget, not a tablist pattern, and
 * is out of scope for this sub-group per the lead's decision.
 *
 * AC-8.1 and AC-8.3 are REGRESSION-LOCK cases: `renderWorkspaceTabBar()`
 * and `mountWorkspaceTabBar()` already set `role="tablist"`/`role="tab"`/
 * synced `aria-selected` and the close button's `aria-label` since an
 * earlier sub-group (see design/prototype/pages/shared/sidebar.js lines
 * ~873-874, ~887, ~990). These two cases are expected to PASS immediately
 * -- they lock in that pre-existing behavior against regression, they do
 * not prove new functionality (same convention as prior sub-groups' own
 * vacuous-pass cases, e.g. G2f's 404 pane test and G2d's out-of-range
 * shortcut tests).
 *
 * AC-8.2 is genuinely Red: each tab element only has a `click` listener
 * (sidebar.js's `renderWorkspaceTabBar()`), no `keydown` handler exists at
 * all, so ArrowLeft/ArrowRight do not move focus and Enter/Space do not
 * activate a tab (a plain `<div role="tab" tabindex="0">` is not a native
 * interactive element, so browsers do not auto-activate it on Enter/Space
 * the way they would a <button>). These cases must fail until a later G2g
 * Green task adds the handler.
 *
 * Wrap-around judgment call: spec.md's AC-8.2 text only says "焦點移至相鄰
 * 頁籤" (focus moves to the adjacent tab) and does not say whether movement
 * wraps at the ends. This suite follows the lead's decision to adopt the
 * ARIA Authoring Practices Guide's common tabs-pattern convention (wrap
 * around), a suite-local implementation-pattern choice, not verbatim spec
 * text -- same convention as this suite's own prior judgment calls (e.g.
 * workspace-tabs-mobile.spec.ts's EN wording choice).
 */
import { test, expect } from '@playwright/test';
import {
  tabBar,
  workspaceTabs,
  closeButton,
  readWorkspaceTabState,
  setDesktopViewport,
} from './_workspace-tabs-helpers';

const DASHBOARD_URL = '/pages/dashboard/dashboard.html';

/** Opens 3 distinct tabs: dashboard (0), task-list (1), dataset-analysis (2). */
async function openThreeDistinctTabs(page: import('@playwright/test').Page): Promise<void> {
  await page.goto(DASHBOARD_URL);
  await page.getByRole('link', { name: '任務管理' }).click();
  await page.getByRole('link', { name: '資料集分析' }).click();
  await expect(workspaceTabs(page)).toHaveCount(3);
}

test.describe('Workspace tabs — AC-8.1 tablist/tab ARIA (regression-lock)', () => {
  test.beforeEach(async ({ page }) => {
    await setDesktopViewport(page);
  });

  test('container has role=tablist, each tab has role=tab, and aria-selected tracks the active tab', async ({ page }) => {
    await openThreeDistinctTabs(page);
    const tabs = workspaceTabs(page);

    await expect(tabBar(page)).toHaveAttribute('role', 'tablist');
    await expect(tabs).toHaveCount(3);
    for (let i = 0; i < 3; i++) {
      await expect(tabs.nth(i)).toHaveAttribute('role', 'tab');
    }
    // Last-opened tab (index 2) is active; the rest are not.
    await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'false');
    await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'false');
    await expect(tabs.nth(2)).toHaveAttribute('aria-selected', 'true');

    // Switch tabs and confirm aria-selected flips accordingly.
    await tabs.nth(0).click();
    await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'true');
    await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'false');
    await expect(tabs.nth(2)).toHaveAttribute('aria-selected', 'false');
  });
});

test.describe('Workspace tabs — AC-8.3 close button aria-label (regression-lock)', () => {
  test.beforeEach(async ({ page }) => {
    await setDesktopViewport(page);
  });

  test('each close button has a non-empty aria-label containing its own tab\'s displayed label', async ({ page }) => {
    await openThreeDistinctTabs(page);
    const tabs = workspaceTabs(page);

    for (let i = 0; i < 3; i++) {
      const tab = tabs.nth(i);
      // The tab's own accessible text content is just its label (the close
      // button contributes no text node of its own -- only an aria-label
      // attribute and an aria-hidden svg icon).
      const tabLabel = (await tab.textContent())?.trim();
      expect(tabLabel).toBeTruthy();

      const ariaLabel = await closeButton(tab).getAttribute('aria-label');
      expect(ariaLabel).toBeTruthy();
      expect(ariaLabel).toContain(tabLabel as string);
    }
  });
});

test.describe('Workspace tabs — AC-8.2 arrow-key focus movement (no tab switch)', () => {
  test.beforeEach(async ({ page }) => {
    await setDesktopViewport(page);
  });

  test('ArrowRight moves focus to the next tab without switching; ArrowLeft moves it back', async ({ page }) => {
    await openThreeDistinctTabs(page);
    const tabs = workspaceTabs(page);
    const urlBeforeArrowKeys = page.url();
    const stateBeforeArrowKeys = await readWorkspaceTabState(page);

    await tabs.nth(0).focus();
    await expect(tabs.nth(0)).toBeFocused();

    await page.keyboard.press('ArrowRight');
    await expect(tabs.nth(1)).toBeFocused();

    await page.keyboard.press('ArrowRight');
    await expect(tabs.nth(2)).toBeFocused();

    // No navigation and no activeIndex change -- focus movement is not a switch.
    expect(page.url()).toBe(urlBeforeArrowKeys);
    expect(await readWorkspaceTabState(page)).toEqual(stateBeforeArrowKeys);

    await page.keyboard.press('ArrowLeft');
    await expect(tabs.nth(1)).toBeFocused();

    await page.keyboard.press('ArrowLeft');
    await expect(tabs.nth(0)).toBeFocused();

    expect(page.url()).toBe(urlBeforeArrowKeys);
    expect(await readWorkspaceTabState(page)).toEqual(stateBeforeArrowKeys);
  });

  // Wrap-around: lead's implementation-pattern judgment call (ARIA APG tabs
  // pattern convention), not verbatim spec text -- see file header.
  test('ArrowRight on the last tab wraps focus to the first; ArrowLeft on the first tab wraps to the last', async ({ page }) => {
    await openThreeDistinctTabs(page);
    const tabs = workspaceTabs(page);
    const urlBeforeArrowKeys = page.url();
    const stateBeforeArrowKeys = await readWorkspaceTabState(page);

    await tabs.nth(2).focus();
    await expect(tabs.nth(2)).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect(tabs.nth(0)).toBeFocused();

    await tabs.nth(0).focus();
    await expect(tabs.nth(0)).toBeFocused();
    await page.keyboard.press('ArrowLeft');
    await expect(tabs.nth(2)).toBeFocused();

    expect(page.url()).toBe(urlBeforeArrowKeys);
    expect(await readWorkspaceTabState(page)).toEqual(stateBeforeArrowKeys);
  });
});

test.describe('Workspace tabs — AC-8.2 Enter/Space activation', () => {
  test.beforeEach(async ({ page }) => {
    await setDesktopViewport(page);
  });

  test('Enter on a focused, non-active tab activates it without a click', async ({ page }) => {
    await openThreeDistinctTabs(page);
    const tabs = workspaceTabs(page);

    // Index 2 (dataset-analysis) is active after openThreeDistinctTabs();
    // index 0 (dashboard) is a non-active tab to activate via keyboard only.
    await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'false');
    await tabs.nth(0).focus();
    await expect(tabs.nth(0)).toBeFocused();

    await page.keyboard.press('Enter');

    await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'true');
    await expect(tabs.nth(2)).toHaveAttribute('aria-selected', 'false');
    const state = (await readWorkspaceTabState(page)) as { activeIndex: number };
    expect(state.activeIndex).toBe(0);
  });

  test('Space on a focused, non-active tab activates it without a click', async ({ page }) => {
    await openThreeDistinctTabs(page);
    const tabs = workspaceTabs(page);

    // Re-activate index 2 as the starting active tab (openThreeDistinctTabs()
    // already leaves it active, but asserted explicitly for clarity/isolation
    // from the Enter test above, which this test does not depend on).
    await tabs.nth(2).click();
    await expect(tabs.nth(2)).toHaveAttribute('aria-selected', 'true');

    await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'false');
    await tabs.nth(1).focus();
    await expect(tabs.nth(1)).toBeFocused();

    await page.keyboard.press(' ');

    await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
    await expect(tabs.nth(2)).toHaveAttribute('aria-selected', 'false');
    const state = (await readWorkspaceTabState(page)) as { activeIndex: number };
    expect(state.activeIndex).toBe(1);
  });
});
