/* Red tests for Workspace Tabs (specs/shared/019-workspace-tabs/spec.md),
 * issue #1075 sub-group G2d -- desktop keyboard shortcuts: `Alt+1...8`
 * switches to the tab at that position (AC-5.1), `Alt+W` closes the active
 * tab (AC-5.2), and focus inside an editable element suppresses both
 * (AC-5.3). FR-013 / Q10 / TAB_SWITCH_SHORTCUT_PREFIX / TAB_CLOSE_SHORTCUT
 * (spec 規格常數).
 *
 * No keyboard-shortcut handling for Alt+1-8/Alt+W exists anywhere in
 * `design/prototype/pages/shared/sidebar.js` yet -- only the unrelated `?`
 * shortcut-help handler (tests/shared/sidebar-shortcuts.spec.ts, not
 * touched by this file) exists as a *precedent pattern* a later G2d Green
 * task is expected to mirror (same
 * `isDesktopViewport() && !isInteractiveSidebarTarget(event.target)` gate).
 *
 * Expected-pass note: the AC-5.1 corollary test (an out-of-range digit) and
 * all four AC-5.3 suppression tests assert that NOTHING happens on a given
 * keypress. With no Alt+1-8/Alt+W handler installed at all yet, "nothing
 * happens" is already (vacuously) true today, so these five cases are
 * expected to PASS before Green, not fail -- mirroring this suite's own
 * workspace-tabs-unsaved.spec.ts precedent ("Already satisfied by ...; kept
 * as dedicated regression coverage, not new Green logic"). Only the two
 * cases that assert an actual tab switch/close happens (AC-5.1's main case,
 * AC-5.2) are true Red today. All seven become meaningful regression
 * coverage once Green adds the handler.
 *
 * AC-5.4 (`event.code`, not `event.key`) has no separate dedicated test:
 * every `page.keyboard.press('Alt+Digit1')` / `'Alt+KeyW'` call below
 * already dispatches via Playwright's code-based key token, the normal way
 * to simulate this from outside the page -- a separate test could not
 * observe the implementation's internal `event.code` vs `event.key` choice
 * any more precisely than these already do.
 */
import { test, expect } from '@playwright/test';
import { workspaceTabs, readWorkspaceTabState, setDesktopViewport } from './_workspace-tabs-helpers';

const DASHBOARD_URL = '/pages/dashboard/dashboard.html';
const TASK_LIST_URL = '/pages/task-management/task-list.html';
const DATASET_LIST_URL = '/pages/dataset/dataset-analysis-list.html';
const TASK_NEW_URL = '/pages/task-management/task-new.html';

test.describe('Workspace tabs — AC-5.1 Alt+<digit> activates the tab at that position', () => {
  test.beforeEach(async ({ page }) => {
    await setDesktopViewport(page);
  });

  test('Alt+2 switches to the 2nd tab (by position), regardless of which tab was last active', async ({ page }) => {
    await page.goto(DASHBOARD_URL);
    await page.goto(TASK_LIST_URL);
    await page.goto(DATASET_LIST_URL);
    await page.goto(TASK_NEW_URL); // 4th/last-opened tab, currently active

    const tabs = workspaceTabs(page);
    await expect(tabs).toHaveCount(4);
    await expect(tabs.nth(3)).toHaveAttribute('aria-selected', 'true');

    await page.keyboard.press('Alt+Digit2');

    await expect(page).toHaveURL(new RegExp(TASK_LIST_URL.replace(/\//g, '\\/') + '$'));
    const state = (await readWorkspaceTabState(page)) as { activeIndex: number } | null;
    expect(state?.activeIndex).toBe(1);
    await expect(workspaceTabs(page).nth(1)).toHaveAttribute('aria-selected', 'true');
  });

  test('Alt+7 with only 3 tabs open is a no-op: no navigation, no activeIndex change, no tab mutation', async ({ page }) => {
    await page.goto(DASHBOARD_URL);
    await page.goto(TASK_LIST_URL);
    await page.goto(DATASET_LIST_URL); // 3 tabs, index 2 active

    const before = await readWorkspaceTabState(page);
    const urlBefore = page.url();

    await page.keyboard.press('Alt+Digit7');

    await expect(page).toHaveURL(urlBefore);
    const after = await readWorkspaceTabState(page);
    expect(after).toEqual(before);
    await expect(workspaceTabs(page)).toHaveCount(3);
  });
});

test.describe('Workspace tabs — AC-5.2 Alt+W closes the active tab', () => {
  test.beforeEach(async ({ page }) => {
    await setDesktopViewport(page);
  });

  test('Alt+W closes the active (non-rightmost) tab; focus moves to the tab that was to its right, matching closeWorkspaceTab()', async ({ page }) => {
    await page.goto(DASHBOARD_URL);
    await page.goto(TASK_LIST_URL);
    await page.goto(DATASET_LIST_URL);

    const tabs = workspaceTabs(page);
    await expect(tabs).toHaveCount(3);

    // Re-activate the middle tab (index 1) so this isn't just closing
    // whatever happens to already be active.
    await tabs.nth(1).click();
    await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');

    await page.keyboard.press('Alt+KeyW');

    await expect(tabs).toHaveCount(2);
    await expect(page).toHaveURL(new RegExp(DATASET_LIST_URL.replace(/\//g, '\\/') + '$'));
    const state = (await readWorkspaceTabState(page)) as { tabs: Array<{ dedupeKey: string }>; activeIndex: number } | null;
    const keys = state?.tabs.map((t) => t.dedupeKey) ?? [];
    expect(keys).not.toContain(TASK_LIST_URL);
    expect(keys).toContain(DASHBOARD_URL);
    expect(keys).toContain(DATASET_LIST_URL);
    expect(state?.activeIndex).toBe(1);
  });
});

test.describe('Workspace tabs — AC-5.3 focus in an editable element suppresses the shortcut', () => {
  test.beforeEach(async ({ page }) => {
    await setDesktopViewport(page);
  });

  test('Alt+Digit1 with focus in an <input> does not switch tabs', async ({ page }) => {
    await page.goto(DASHBOARD_URL);
    await page.goto(TASK_NEW_URL); // 2nd tab, active; #taskNameInput is step1's visible field

    const before = await readWorkspaceTabState(page);
    const urlBefore = page.url();

    await page.locator('#taskNameInput').click();
    await page.keyboard.press('Alt+Digit1');

    await expect(page).toHaveURL(urlBefore);
    const after = await readWorkspaceTabState(page);
    expect(after).toEqual(before);
  });

  test('Alt+KeyW with focus in an <input> does not close the active tab', async ({ page }) => {
    await page.goto(DASHBOARD_URL);
    await page.goto(TASK_NEW_URL);
    const tabs = workspaceTabs(page);
    await expect(tabs).toHaveCount(2);

    await page.locator('#taskNameInput').click();
    await page.keyboard.press('Alt+KeyW');

    await expect(tabs).toHaveCount(2);
    await expect(page).toHaveURL(new RegExp(TASK_NEW_URL.replace(/\//g, '\\/') + '$'));
  });

  test('Alt+Digit1 with focus in a <textarea> does not switch tabs', async ({ page }) => {
    await page.goto(DASHBOARD_URL);
    await page.goto(TASK_LIST_URL);

    const before = await readWorkspaceTabState(page);
    const urlBefore = page.url();

    // task-new.html's own <textarea> fields (#codeEditor,
    // #annotatorGuidelineTextInput) sit behind step2Panel/step4Panel, both
    // `class="hidden"` until the wizard is progressed there -- driving that
    // wizard is out of this sub-group's scope and would couple this
    // shortcut test to unrelated wizard-validation behavior. Synthesizes a
    // throwaway <textarea> instead -- test-only ephemeral DOM, not page
    // source markup -- mirroring the contenteditable synthesis below and
    // tests/shared/sidebar-shortcuts.spec.ts's own established technique
    // for the same "editable target suppresses a global shortcut" shape.
    await page.evaluate(() => {
      const textarea = document.createElement('textarea');
      textarea.id = 'workspace-tab-shortcut-textarea-target';
      textarea.style.position = 'fixed';
      textarea.style.left = '24px';
      textarea.style.top = '24px';
      document.body.appendChild(textarea);
      textarea.focus();
    });

    await page.keyboard.press('Alt+Digit1');

    await expect(page).toHaveURL(urlBefore);
    const after = await readWorkspaceTabState(page);
    expect(after).toEqual(before);
  });

  test('Alt+Digit1 with focus in a [contenteditable="true"] element does not switch tabs', async ({ page }) => {
    await page.goto(DASHBOARD_URL);
    await page.goto(TASK_LIST_URL);

    const before = await readWorkspaceTabState(page);
    const urlBefore = page.url();

    // No already-open-tab page in this suite's set renders a visible
    // contenteditable element; synthesizes one via page.evaluate, same
    // technique as the <textarea> case above and
    // tests/shared/sidebar-shortcuts.spec.ts's own precedent for its `?`
    // shortcut's editable-target test.
    await page.evaluate(() => {
      const editable = document.createElement('div');
      editable.id = 'workspace-tab-shortcut-editable-target';
      editable.setAttribute('contenteditable', 'true');
      editable.style.position = 'fixed';
      editable.style.left = '24px';
      editable.style.top = '24px';
      editable.textContent = 'editable';
      document.body.appendChild(editable);
      editable.focus();
    });

    await page.keyboard.press('Alt+Digit1');

    await expect(page).toHaveURL(urlBefore);
    const after = await readWorkspaceTabState(page);
    expect(after).toEqual(before);
  });
});
