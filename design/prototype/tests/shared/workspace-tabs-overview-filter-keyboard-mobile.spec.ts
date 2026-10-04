/* Red tests for the shared Workspace Tabs Overview Menu -- G2b subset
 * (issue #1099, maintainer-directed split of the original G2 group; see
 * openspec/changes/1099-workspace-tabs-overview-menu/design.md "## G2 --
 * 總覽選單" and spec delta `openspec/changes/1099-workspace-tabs-overview-
 * menu/specs/shared/019-workspace-tabs/spec.md` FR-023 / MODIFIED FR-002).
 *
 * G2's full implementation diff (446 lines) exceeded the project's 300-line
 * PR cap, so the maintainer split it into G2a (`workspace-tabs-overview-
 * menu.spec.ts`, desktop-only trigger/list/switch/close/FR-020, already
 * merged to `main`) and G2b (THIS file: the filter box + matching, the
 * keyboard model, and the mobile replacement). This file covers the
 * remaining 8 cases of the original 15-case Red suite (preserved in this
 * repo's history at commit `04906485`) that are NOT in G2a's pinned file.
 * Do NOT duplicate G2a's 7 cases here (trigger count/listing, desktop
 * trigger-stays-fixed-while-scrolling, click-to-switch, row
 * icon/close-button + bottom action slots, FR-020 aria-haspopup/
 * aria-expanded) -- those stay exclusively in
 * `workspace-tabs-overview-menu.spec.ts` on `main`.
 *
 * No implementation exists yet in `design/prototype/pages/shared/
 * sidebar.js` / `sidebar.css` for G2b's scope: there is no filter input,
 * no ArrowDown/ArrowUp highlight model, no Enter-to-activate, no
 * Esc-to-close-and-refocus, and the mobile branch still renders nothing
 * for the shared trigger/menu (G2a only mounts the desktop trigger).
 * Every test below is expected to FAIL until a later G2b Green task wires
 * these behaviors into the shared component G2a already renders.
 *
 * Selector contract this file ADDS on top of G2a's (mirrors G2a's own
 * "Selector contract this file DECIDES" precedent):
 *
 *   - Filter input: `[data-testid="workspace-tab-overview-filter"]`, a
 *     text input whose placeholder contains the live count N (FR-023
 *     point 2: "placeholder 顯示目前頁籤數 N"; exact wording not locked).
 *   - Keyboard-highlight marker: `aria-selected="true"`/`"false"` on the
 *     row currently highlighted by ArrowDown/ArrowUp (AC-023.5/.6).
 *     Judgment call: the ARIA Authoring Practices Guide's combobox-with-
 *     listbox pattern (filter input = combobox, rows = options, the
 *     highlighted option carries `aria-selected`) -- chosen because it is
 *     the only APG pattern that keeps the filter input itself focused
 *     (required by AC-023.4) while a separate row is "highlighted" for
 *     Enter to act on. This suite therefore also asserts the filter input
 *     STAYS focused throughout ArrowDown/ArrowUp, as part of the same
 *     judgment call -- the maintainer can override this during Green
 *     review if it conflicts with a later clarification.
 *
 * Filter algorithm (design.md G2, 2026-10-02 maintainer ruling / FR-023
 * point 3): compares the tab's computed label AND
 * `workspacePageKindI18n[lang][pageKind]` (sidebar.js ~line 859), case-
 * insensitive, NEVER the URL. Non-matching rows are HIDDEN, not removed
 * from the DOM (design.md: "不命中則隱藏（不移除 DOM，避免重建清單造成焦點
 * 流失）").
 *
 * Mobile replacement (MODIFIED FR-002): the tests in the "mobile
 * replacement" describe block below SUPERSEDE `workspace-tabs-mobile
 * .spec.ts`'s AC-6.1/AC-6.2/AC-6.3 blocks. That file is NOT edited here --
 * it was already retired (commit `24393111`, reachable from this branch)
 * down to a pure supersession-map comment with no runnable test() calls,
 * so there is nothing left in it for this Red commit to touch. Any
 * further change to that file remains Green's job per this task's
 * instructions, mirroring how `24393111` originally handled it.
 *
 * EN wording / exact zh wording judgment calls: same convention as
 * `workspace-tabs-mobile.spec.ts`'s own "EN wording judgment call" and
 * G2a's -- spec/design text gives informal/zh-only examples that are never
 * declared MUST-verbatim strings, so this suite only asserts the LIVE
 * COUNT N appears, never exact wording.
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

// Locator helpers mirror G2a's pinned `workspace-tabs-overview-menu.spec.ts`
// exactly (same data-testid contract G2a already established); redefined
// here rather than imported because that file does not export them.
function trigger(page: Page): Locator {
  return page.getByTestId('workspace-tab-overview-trigger');
}

function menu(page: Page): Locator {
  return page.getByTestId('workspace-tab-overview-menu');
}

function filterInput(page: Page): Locator {
  return page.getByTestId('workspace-tab-overview-filter');
}

function items(page: Page): Locator {
  return menu(page).getByTestId('workspace-tab-overview-item');
}

async function openMenu(page: Page): Promise<void> {
  await trigger(page).click();
  await expect(menu(page)).toBeVisible();
}

/** Opens 8 distinct dedupe-key tabs (same combo as G2a's own AC-023.2
 * desktop-scroll case, reused verbatim for this suite's 375px/8-tabs
 * mobile overflow case). */
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

test.describe('Workspace tabs overview menu (G2b) — AC-023.3 filter matches tab title or page-kind name, case-insensitive, never URL params', () => {
  test.beforeEach(async ({ page }) => {
    await setDesktopViewport(page);
  });

  test('en: "task" (lowercase) matches a title containing "Task" AND a page-kind name containing "Task" that is absent from its own title, hides everything else including a URL-only match', async ({ page }) => {
    await page.goto(DASHBOARD_URL);
    await page.locator('#langToggle').click();
    await page.goto(TASK_LIST_URL); // title "Task Management" -> title match
    await page.goto(DATASET_LIST_URL); // title "Dataset Analytics" -> no match
    // Title is "Dry Run R1 Medical Text Sentiment Classification" (no
    // "task" substring) but its page-kind name (workspacePageKindI18n.en
    // ['task-detail']) is "Task Detail" -- the critical case proving the
    // filter also matches the SEPARATE page-kind-name corpus, not just title.
    await page.goto(TASK_DETAIL_T001_R1_URL);
    // sample_id contains "task" only inside the URL query string; title
    // ("Annotation") and page-kind name (none exists for annotation-
    // workspace in workspacePageKindI18n) never contain it.
    await page.goto(
      buildWorkspaceUrl({ task_id: 'T001', sample_id: 'task-marker-001', role: 'annotator', run_type: 'official_run' })
    );

    await openMenu(page);
    await expect(items(page)).toHaveCount(5);

    await filterInput(page).fill('task');

    const dashboardRow = items(page).filter({ hasText: 'Dashboard' });
    const taskListRow = items(page).filter({ hasText: 'Task Management' });
    const datasetRow = items(page).filter({ hasText: 'Dataset Analytics' });
    const taskDetailRow = items(page).filter({ hasText: /Dry Run R1/ });
    const annotationRow = items(page).filter({ hasText: /Annotation/ });

    await expect(taskListRow).toBeVisible();
    await expect(taskDetailRow).toBeVisible(); // page-kind-name match despite no "task" in its own title
    await expect(dashboardRow).toBeHidden();
    await expect(datasetRow).toBeHidden();
    await expect(annotationRow).toBeHidden(); // URL-only "task" must not match
  });
});

test.describe('Workspace tabs overview menu (G2b) — AC-023.4 opening the menu moves focus to the filter input', () => {
  test.beforeEach(async ({ page }) => {
    await setDesktopViewport(page);
  });

  test('filter input receives focus immediately on open', async ({ page }) => {
    await page.goto(DASHBOARD_URL);
    await page.goto(TASK_LIST_URL);

    await openMenu(page);
    await expect(filterInput(page)).toBeFocused();
  });
});

test.describe('Workspace tabs overview menu (G2b) — AC-023.5 ArrowDown/ArrowUp move a highlight among rows without switching', () => {
  test.beforeEach(async ({ page }) => {
    await setDesktopViewport(page);
  });

  test('highlight moves down then up across rows; filter input keeps focus; no tab switch occurs', async ({ page }) => {
    await page.goto(DASHBOARD_URL);
    await page.goto(TASK_LIST_URL);
    await page.goto(DATASET_LIST_URL); // active
    const urlBefore = page.url();
    const stateBefore = await readWorkspaceTabState(page);

    await openMenu(page);
    const rows = items(page);
    await expect(rows).toHaveCount(3);

    await page.keyboard.press('ArrowDown');
    await expect(rows.nth(0)).toHaveAttribute('aria-selected', 'true');
    await expect(filterInput(page)).toBeFocused();

    await page.keyboard.press('ArrowDown');
    await expect(rows.nth(1)).toHaveAttribute('aria-selected', 'true');
    await expect(rows.nth(0)).toHaveAttribute('aria-selected', 'false');

    await page.keyboard.press('ArrowUp');
    await expect(rows.nth(0)).toHaveAttribute('aria-selected', 'true');
    await expect(rows.nth(1)).toHaveAttribute('aria-selected', 'false');

    expect(page.url()).toBe(urlBefore);
    expect(await readWorkspaceTabState(page)).toEqual(stateBefore);
  });
});

test.describe('Workspace tabs overview menu (G2b) — AC-023.6 Enter switches to the highlighted row and closes the menu', () => {
  test.beforeEach(async ({ page }) => {
    await setDesktopViewport(page);
  });

  test('Enter after ArrowDown activates the highlighted (non-active) row', async ({ page }) => {
    await page.goto(DASHBOARD_URL);
    await page.goto(TASK_LIST_URL);
    await page.goto(DATASET_LIST_URL); // active, index 2

    await openMenu(page);
    await page.keyboard.press('ArrowDown'); // highlights row 0 (dashboard)
    await expect(items(page).nth(0)).toHaveAttribute('aria-selected', 'true');

    await page.keyboard.press('Enter');

    await expect(page).toHaveURL(new RegExp(DASHBOARD_URL.replace(/\//g, '\\/') + '$'));
    const state = (await readWorkspaceTabState(page)) as { activeIndex: number } | null;
    expect(state?.activeIndex).toBe(0);
    await expect(menu(page)).toBeHidden();
  });
});

test.describe('Workspace tabs overview menu (G2b) — AC-023.7 Esc closes the menu and returns focus to the trigger button', () => {
  test.beforeEach(async ({ page }) => {
    await setDesktopViewport(page);
  });

  test('Escape hides the menu and refocuses the trigger', async ({ page }) => {
    await page.goto(DASHBOARD_URL);
    await page.goto(TASK_LIST_URL);

    await openMenu(page);
    await expect(filterInput(page)).toBeFocused();

    await page.keyboard.press('Escape');

    await expect(menu(page)).toBeHidden();
    await expect(trigger(page)).toBeFocused();
  });
});

// Mobile replacement (MODIFIED FR-002, supersedes `workspace-tabs-mobile
// .spec.ts`'s AC-6.1/AC-6.2/AC-6.3 blocks -- see this file's header for the
// full supersession note). Those three cases are retired down to a
// comment-only file (commit `24393111`); the three cases below are their
// replacement, exercised through the shared overview-menu component G2a
// already renders for desktop and this file's G2b scope extends to mobile.
test.describe('Workspace tabs overview menu (G2b) — mobile replacement (FR-002 MODIFIED, supersedes workspace-tabs-mobile.spec.ts AC-6.1-AC-6.3)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
  });

  test('zh: desktop tab bar is hidden, the shared trigger shows the tab count, and no separate mobile-dropdown testid is rendered', async ({ page }) => {
    await page.goto(DASHBOARD_URL);
    await page.goto(TASK_LIST_URL);
    await page.goto(DATASET_LIST_URL);

    await expect(tabBar(page)).toBeHidden();
    await expect(trigger(page)).toBeVisible();
    await expect(trigger(page)).toContainText('3');

    // FR-002 MODIFIED: the old per-viewport `.workspace-tab-mobile-dropdown`
    // widget is retired in favor of the SAME component desktop uses --
    // asserting its testid is entirely ABSENT (not merely hidden) is this
    // suite's proof that mobile and desktop share one component (D2), not
    // two parallel widgets.
    await expect(page.getByTestId('workspace-tab-mobile-dropdown')).toHaveCount(0);
  });

  test('tapping a non-active row switches to it and closes the menu', async ({ page }) => {
    await page.goto(DASHBOARD_URL);
    await page.goto(TASK_LIST_URL);
    await page.goto(DATASET_LIST_URL); // active

    await openMenu(page);
    const rows = items(page);
    await expect(rows).toHaveCount(3);

    await rows.nth(0).click();

    await expect(page).toHaveURL(new RegExp(DASHBOARD_URL.replace(/\//g, '\\/') + '$'));
    const state = (await readWorkspaceTabState(page)) as { activeIndex: number } | null;
    expect(state?.activeIndex).toBe(0);
    await expect(menu(page)).toBeHidden();
  });

  test('375px with 8 distinct tabs open: neither the page nor the menu overflows horizontally (FR-015)', async ({ page }) => {
    test.setTimeout(60_000);
    await skipGuidelineModal(page);
    await openEightDistinctTabs(page);

    await openMenu(page);
    await expect(items(page)).toHaveCount(8);

    const pageOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(pageOverflow).toBeLessThanOrEqual(0);

    const menuOverflow = await menu(page).evaluate((node) => node.scrollWidth - node.clientWidth);
    expect(menuOverflow).toBeLessThanOrEqual(0);
  });
});
