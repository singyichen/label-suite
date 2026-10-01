/* Shared helpers and selector contract for the Workspace Tabs Red test
 * suite (specs/shared/019-workspace-tabs/spec.md, issue #1075 sub-group
 * G2a). Not itself a *.spec.ts file, so Playwright does not run it as a
 * test file (mirrors tests/annotation/_workspace-helpers.ts's naming).
 *
 * No implementation exists yet (G2a is Red-only), so this file also DECIDES
 * the selector contract the later Green task must satisfy:
 *
 *   - Tab bar container: `[data-testid="workspace-tab-bar"]` AND
 *     `role="tablist"` (FR-020 base markup). The testid is load-bearing,
 *     not decorative: `task-management/task-detail.html` and
 *     `admin/user-management.html` already render their OWN in-page
 *     "Desktop Content Tabs" (分頁, see design/system/MASTER.md's
 *     Workspace Tabs vs Desktop Content Tabs terminology note, issue
 *     #1075) with `role="tablist"`/`role="tab"` -- a bare role query would
 *     silently match the wrong landmark on those two pages, so this suite
 *     always resolves the workspace tab bar by testid first and only then
 *     scopes role="tab" queries inside it.
 *   - Each tab: `[data-testid="workspace-tab"]` AND `role="tab"`, with a
 *     synced `aria-selected` (FR-020).
 *   - Close button: a `role="button"` nested inside each tab. Its exact
 *     `aria-label` wording is AC-8.3 / G2g scope and is not asserted here.
 *   - A `task-detail` tab carries `data-stage-badge="dry_run"` or
 *     `data-stage-badge="official_run"` on the tab element -- the
 *     non-CSS signal this suite uses to assert FR-010's stage-color
 *     requirement (AC-1.6), per spec's own "用語事實" `TAB_STAGE_BADGE`
 *     naming (spec 規格常數) and this project's ban on raw computed-CSS
 *     color assertions.
 *   - `TAB_STORAGE_KEY = 'labelsuite.workspaceTabs'` (spec 規格常數):
 *     sessionStorage holds the tab list + active tab index.
 *   - `TAB_SCROLL_STORAGE_KEY = 'labelsuite.workspaceTabScroll'` (spec 規格
 *     常數, added for G2b / AC-2.1 / FR-018 / FR-019): sessionStorage holds
 *     each tab's scroll position, separately from TAB_STORAGE_KEY, and is
 *     also cleared on logout (AC-2.4 / FR-018).
 */
import { type Locator, type Page } from '@playwright/test';

export const TAB_STORAGE_KEY = 'labelsuite.workspaceTabs';
export const TAB_SCROLL_STORAGE_KEY = 'labelsuite.workspaceTabScroll';

export function tabBar(page: Page): Locator {
  return page.getByTestId('workspace-tab-bar');
}

export function workspaceTabs(page: Page): Locator {
  return tabBar(page).getByRole('tab');
}

export function closeButton(tab: Locator): Locator {
  return tab.getByRole('button');
}

export async function readWorkspaceTabState(page: Page): Promise<unknown> {
  return page.evaluate((key) => {
    const raw = window.sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  }, TAB_STORAGE_KEY);
}

export async function setDesktopViewport(page: Page): Promise<void> {
  await page.setViewportSize({ width: 1280, height: 900 });
}
