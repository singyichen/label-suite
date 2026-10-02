/* Red tests for the shared Workspace Tabs Overview Menu (issue #1099 G2,
 * openspec/changes/1099-workspace-tabs-overview-menu/design.md "G2 — 總覽
 * 選單", spec delta `specs/shared/019-workspace-tabs/spec.md` FR-023 /
 * FR-023A / MODIFIED FR-002). Covers tasks.md 4.1–4.2.
 *
 * No implementation exists anywhere in `design/prototype/pages/shared/
 * sidebar.js` / `sidebar.css` yet: there is no `renderWorkspaceTabOverviewMenu()`,
 * no desktop trigger, and the mobile branch still renders the OLD
 * `renderWorkspaceTabMobileDropdown()` (`#workspaceTabMobileDropdown`,
 * `.workspace-tab-mobile-item`) this change retires. Every test below is
 * expected to FAIL until a later G2 Green task adds the shared component.
 *
 * NEW selector contract this file DECIDES for the Green implementer
 * (mirrors `_workspace-tabs-helpers.ts`'s and `workspace-tabs-mobile
 * .spec.ts`'s own precedent of a Red suite fixing the shape Green must
 * satisfy):
 *
 *   - Exactly ONE element may ever carry `[data-testid="workspace-tab-
 *     overview-trigger"]` at a time (a single viewport-conditional mount,
 *     per design.md's "依 viewport > MOBILE_BP 決定掛載為桌面頁籤列右端固定
 *     項，或行動版取代整條頁籤列" — one mount decision, not two always-
 *     present/CSS-toggled instances sharing a testid, which would make
 *     `page.getByTestId()` a strict-mode violation). It shows the current
 *     tab count N as part of its text (exact zh/en wording is NOT locked —
 *     see the mobile describe block below for why).
 *   - Menu panel: `[data-testid="workspace-tab-overview-menu"]`.
 *   - Filter input: `[data-testid="workspace-tab-overview-filter"]`, a text
 *     input whose placeholder contains the live count N (FR-023 point 2:
 *     "placeholder 顯示目前頁籤數 N"; exact wording not locked, same
 *     reasoning as the trigger text).
 *   - Each row: `[data-testid="workspace-tab-overview-item"]`, with a
 *     nested `[data-testid="workspace-tab-overview-item-close"]` close
 *     button (mirrors `workspace-tab-mobile-item`/`-item-close`'s own
 *     established pairing in `workspace-tabs-mobile.spec.ts`).
 *   - Active-tab marker: `aria-current="true"` on the row matching the
 *     currently open tab. Judgment call: distinct from `role="tab"`'s own
 *     `aria-selected` (desktop bar, FR-020) because these rows are not a
 *     `role="tab"` tablist pattern; modeled on this codebase's EXISTING
 *     `aria-current="page"` convention for "the current item in a set"
 *     (sidebar.js `renderSidebar()` nav items/admin submenu/user chip,
 *     ~lines 496/511/513/1557).
 *   - Keyboard-highlight marker: `aria-selected="true"`/`"false"` on the
 *     row currently highlighted by ArrowDown/ArrowUp (AC-023.5/.6).
 *     Judgment call: the ARIA Authoring Practices Guide's combobox-with-
 *     listbox pattern (filter input = combobox, rows = options, the
 *     highlighted option carries `aria-selected`) — chosen because it is
 *     the only APG pattern that keeps the filter input itself focused
 *     (required by AC-023.4/FR-023 point 4) while a separate row is
 *     "highlighted" for Enter to act on. This suite therefore also asserts
 *     the filter input STAYS focused throughout ArrowDown/ArrowUp, as part
 *     of the same judgment call — the maintainer can override this (e.g. an
 *     implementation that moves literal DOM focus instead) during Green
 *     review if it conflicts with a later clarification.
 *   - Bottom action slots (FR-023 point 2's 4th content block, "底部「重開
 *     剛關閉的」與「全部關閉」兩個操作項"): `[data-testid="workspace-tab-
 *     overview-reopen"]` and `[data-testid="workspace-tab-overview-close-
 *     all"]`. JUDGMENT CALL (flagged per this task's own instruction to
 *     state it explicitly): FR-023 is G2's own requirement and its point 2
 *     text lists these two slots as mandatory STRUCTURAL content of the
 *     menu itself, so this suite asserts their EXISTENCE only. Their
 *     BEHAVIOR (`FR-024` reopen-stack / `FR-025` close-all) is G3's scope
 *     and is not implemented or asserted here — except that FR-024 point 5
 *     ("堆疊為空時...MUST停用") is ALREADY true in G2's own scope, because no
 *     code anywhere pushes to the reopen stack until G3's Green task adds
 *     `pushWorkspaceTabToReopenStack()`; this suite asserts the reopen slot
 *     renders `disabled` on that basis, as a genuine G2 Green deliverable,
 *     not a G3 one.
 *   - Trigger ARIA carryover (FR-020 "無障礙延伸", design.md G2):
 *     `aria-haspopup="true"` and a toggling `aria-expanded`, modeled
 *     verbatim on the superseded `#workspaceTabMobileToggle` contract this
 *     component replaces (sidebar.js ~line 1589/1303/1308) and on
 *     `#mobileNotificationBellBtn`'s identical pattern (~line 1583) — the
 *     established codebase-wide convention for any toggle-a-panel button,
 *     not new spec text.
 *
 * Filter algorithm (design.md G2, 2026-10-02 maintainer ruling / FR-023
 * point 3): compares the tab's computed label AND
 * `workspacePageKindI18n[lang][pageKind]` (sidebar.js ~line 859), case-
 * insensitive, NEVER the URL. Non-matching rows are HIDDEN, not removed
 * from the DOM (FR-023 point 3 commentary in design.md: "不命中則隱藏（不
 * 移除 DOM，避免重建清單造成焦點流失）").
 *
 * Mobile replacement (tasks.md 4.2 / MODIFIED FR-002): the tests in the
 * "Mobile replacement" describe block below are this suite's NEW coverage
 * for what `workspace-tabs-mobile.spec.ts`'s AC-6.1/AC-6.2/AC-6.3 blocks
 * currently assert against the OLD `.workspace-tab-mobile-dropdown`/
 * `#workspaceTabMobileToggle` widget. That file is NOT edited here (Red
 * only touches this new file, per this task's instructions) — its
 * AC-6.1–AC-6.3 assertions will need updating or retiring once Green lands
 * the shared component, since `#workspaceTabMobileToggle` and
 * `.workspace-tab-mobile-dropdown` are retired by this change (FR-002
 * MODIFIED). Flagged explicitly in this file's Red commit message and in
 * this suite's final report, per tasks.md 4.2's "不得默默刪除既有斷言".
 *
 * EN wording / exact zh wording judgment calls: same convention as
 * `workspace-tabs-mobile.spec.ts`'s own "EN wording judgment call" comment
 * — spec/design text gives informal/zh-only examples ("N ˅", "在 N 個頁籤中
 * 篩選…", "已開啟 N 頁") that are never declared MUST-verbatim strings, so
 * this suite only asserts the LIVE COUNT N appears, never exact wording.
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

function filterInput(page: Page): Locator {
  return page.getByTestId('workspace-tab-overview-filter');
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

/** Opens 8 distinct dedupe-key tabs (same combo as workspace-tabs-mobile
 * .spec.ts's AC-6.3 block, reused verbatim for this suite's own AC-023.2
 * desktop-scroll and 375px/8-tabs mobile overflow cases). */
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

test.describe('Workspace tabs overview menu — AC-023.1 trigger count and row listing', () => {
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

test.describe('Workspace tabs overview menu — AC-023.2 desktop trigger stays fixed while the tab strip scrolls', () => {
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

test.describe('Workspace tabs overview menu — AC-023A.1 clicking a non-active row switches and closes the menu', () => {
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

test.describe('Workspace tabs overview menu — AC-023.3 filter matches tab title or page-kind name, case-insensitive, never URL params', () => {
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

test.describe('Workspace tabs overview menu — AC-023.4 opening the menu moves focus to the filter input', () => {
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

test.describe('Workspace tabs overview menu — AC-023.5 ArrowDown/ArrowUp move a highlight among rows without switching', () => {
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

test.describe('Workspace tabs overview menu — AC-023.6 Enter switches to the highlighted row and closes the menu', () => {
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

test.describe('Workspace tabs overview menu — AC-023.7 Esc closes the menu and returns focus to the trigger button', () => {
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

test.describe('Workspace tabs overview menu — mobile replacement (FR-002 MODIFIED, supersedes workspace-tabs-mobile.spec.ts AC-6.1-AC-6.3)', () => {
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

test.describe('Workspace tabs overview menu — FR-023 point 2 row structure (icon + close button) and bottom action slots', () => {
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

test.describe('Workspace tabs overview menu — FR-020 a11y preserved: trigger aria-haspopup/aria-expanded carry over from the superseded mobile toggle', () => {
  test.beforeEach(async ({ page }) => {
    await setDesktopViewport(page);
  });

  test('trigger has aria-haspopup=true and aria-expanded toggles with open/close', async ({ page }) => {
    await page.goto(DASHBOARD_URL);

    await expect(trigger(page)).toHaveAttribute('aria-haspopup', 'true');
    await expect(trigger(page)).toHaveAttribute('aria-expanded', 'false');

    await trigger(page).click();
    await expect(trigger(page)).toHaveAttribute('aria-expanded', 'true');

    await page.keyboard.press('Escape');
    await expect(trigger(page)).toHaveAttribute('aria-expanded', 'false');
  });
});
