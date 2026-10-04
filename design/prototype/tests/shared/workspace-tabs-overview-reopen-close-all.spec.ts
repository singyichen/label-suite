/* Red tests for Workspace Tabs (specs/shared/019-workspace-tabs/spec.md),
 * issue #1099 sub-group G3 -- the reopen-closed-tab stack (FR-024,
 * AC-024.1-AC-024.5), the reopen keyboard shortcut (FR-024A,
 * AC-024A.1/AC-024A.2), close-all (FR-025, AC-025.1-AC-025.3), and the two
 * MODIFIED requirements this group completes: FR-011 (evicted tabs pushed
 * to the stack, AC-4.1-updated) and FR-018 (logout clears the stack too,
 * AC-2.4-updated). See openspec/changes/1099-workspace-tabs-overview-menu/
 * specs/shared/019-workspace-tabs/spec.md and .../design.md "## G3" for the
 * full requirement text this suite targets.
 *
 * G1/G2a/G2b are already merged: the shared overview-menu component
 * (`renderWorkspaceTabOverviewMenu()`, design/prototype/pages/shared/
 * sidebar.js) already renders a `[data-testid="workspace-tab-overview-
 * reopen"]` button (currently unconditionally `disabled`) and a
 * `[data-testid="workspace-tab-overview-close-all"]` button (currently a
 * structural no-op with no click handler) for both desktop and mobile
 * mounts. No `sessionStorage` reopen-stack key, no close-all logic, and no
 * `Alt+Shift+T` handler exist anywhere yet. Every test below is expected to
 * FAIL until a later G3 Green task adds them.
 *
 * `TAB_REOPEN_STORAGE_KEY` per design.md's G3 section:
 * `labelsuite.workspaceTabReopenStack`, LIFO array, cap 10
 * (`TAB_REOPEN_CAP`), oldest entry (index 0) dropped via `shift()` once an
 * 11th is pushed.
 *
 * Close-all's unsaved-tab dirtying reuses workspace-tabs-cap.spec.ts's own
 * established technique: clicking `[data-testid="ws-progress-text"]` inside
 * an annotation-workspace tab is a type-agnostic dirty signal
 * (annotation-workspace.config.js's own ".col-content any click" rule),
 * then backgrounding that tab (navigate elsewhere) persists
 * `hasUnsavedChanges: true` into TAB_STORAGE_KEY at the same `pagehide`
 * point workspace-tabs-unsaved.spec.ts already relies on.
 *
 * Close-all's hint toast reuses the existing `#toast`/`#toastMsg` mechanism
 * `showWorkspaceTabCapNotice()` already uses (sidebar.js "AC-4.2" comment
 * block) -- only `task-new.html`/`task-list.html`/`task-detail.html` render
 * `#toast` today, so the close-all cases below run from `task-list.html`
 * (not `dashboard.html`, which has no `#toast` at all) to reliably observe
 * the hint.
 *
 * Judgment calls (flagged, same convention as prior Red suites in this
 * project):
 *   - Reopen stack read-back: no helper exists yet for
 *     `TAB_REOPEN_STORAGE_KEY` (only `TAB_STORAGE_KEY`'s
 *     `readWorkspaceTabState()` does), so this suite reads it directly via
 *     `page.evaluate()` rather than adding a new exported helper function
 *     to `_workspace-tabs-helpers.ts` sight-unseen of what Green's actual
 *     array-entry shape turns out to be -- a judgment call deferred to
 *     Green/the main session to promote into a shared helper later if a
 *     sibling suite needs the same read.
 *   - The close-all hint message's exact wording is not pinned to an exact
 *     string (same convention as `workspaceTabCapNoticeI18n`'s own existing
 *     non-pinned wording elsewhere in this file) -- only that `#toastMsg`
 *     becomes visible/non-empty and contains the skipped count as a digit.
 *   - AC-016H.3 (shared-008 shortcut-overview "頁籤" section growing a
 *     third row) and AC-024B.1 are NOT in this file: they modify the
 *     ALREADY-PASSING `workspace-tabs-shortcut-overview.spec.ts` (which
 *     currently asserts "exactly two rows", a locked contract this group's
 *     own requirement, MODIFIED FR-016H, literally changes to three) --
 *     updated in that file directly, with its own commit, per this
 *     project's "not a silent deletion" convention for modifying a locked
 *     Red/Green contract, not duplicated here.
 */
import { test, expect, type Page } from '@playwright/test';
import { workspaceTabs, closeButton, readWorkspaceTabState, setDesktopViewport } from './_workspace-tabs-helpers';
import { buildWorkspaceUrl, skipGuidelineModal } from '../annotation/_workspace-helpers';

const DASHBOARD_URL = '/pages/dashboard/dashboard.html';
const TASK_LIST_URL = '/pages/task-management/task-list.html';
const DATASET_LIST_URL = '/pages/dataset/dataset-analysis-list.html';
const USER_MANAGEMENT_URL = '/pages/admin/user-management.html';
const TASK_NEW_URL = '/pages/task-management/task-new.html';
const TASK_DETAIL_T001_R1_URL = '/pages/task-management/task-detail.html?task_id=T001&ap_stage=r1';

const TAB_REOPEN_STORAGE_KEY = 'labelsuite.workspaceTabReopenStack';

function overviewTrigger(page: Page) {
  return page.getByTestId('workspace-tab-overview-trigger');
}

function overviewMenu(page: Page) {
  return page.getByTestId('workspace-tab-overview-menu');
}

function overviewReopenBtn(page: Page) {
  return overviewMenu(page).getByTestId('workspace-tab-overview-reopen');
}

function overviewCloseAllBtn(page: Page) {
  return overviewMenu(page).getByTestId('workspace-tab-overview-close-all');
}

async function openOverviewMenu(page: Page) {
  await overviewTrigger(page).click();
  await expect(overviewMenu(page)).toBeVisible();
}

async function readReopenStack(page: Page): Promise<unknown[]> {
  return page.evaluate((key) => {
    const raw = window.sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  }, TAB_REOPEN_STORAGE_KEY);
}

test.beforeEach(async ({ page }) => {
  await setDesktopViewport(page);
  await skipGuidelineModal(page);
});

test.describe('Workspace tabs overview menu (G3) — AC-024.1/AC-024.2 reopen stack basics', () => {
  test('manually closing a tab then clicking "重開剛關閉的" reopens it with the same dedupe key', async ({ page }) => {
    await page.goto(DASHBOARD_URL);
    await page.goto(TASK_LIST_URL); // 2nd tab -- closing it below leaves tab A (dashboard) as sole survivor
    const tabs = workspaceTabs(page);
    await expect(tabs).toHaveCount(2);

    await closeButton(tabs.nth(1)).click();
    await expect(tabs).toHaveCount(1);

    await openOverviewMenu(page);
    await overviewReopenBtn(page).click();

    await expect(tabs).toHaveCount(2);
    const state = (await readWorkspaceTabState(page)) as { tabs: Array<{ dedupeKey: string }> };
    expect(state.tabs.some((t) => t.dedupeKey === TASK_LIST_URL)).toBe(true);
  });

  test('closing A then B (B closed last) reopens B first, then A -- LIFO', async ({ page }) => {
    await page.goto(DASHBOARD_URL);
    await page.goto(TASK_LIST_URL); // A
    await page.goto(DATASET_LIST_URL); // B
    const tabs = workspaceTabs(page);
    await expect(tabs).toHaveCount(3);

    // Close A (index 1) first, then B (now index 1 after A's removal) second.
    await closeButton(tabs.nth(1)).click();
    await expect(tabs).toHaveCount(2);
    await closeButton(tabs.nth(1)).click();
    await expect(tabs).toHaveCount(1);

    await openOverviewMenu(page);
    await overviewReopenBtn(page).click();
    let state = (await readWorkspaceTabState(page)) as { tabs: Array<{ dedupeKey: string }> };
    expect(state.tabs.some((t) => t.dedupeKey === DATASET_LIST_URL)).toBe(true); // B first
    expect(state.tabs.some((t) => t.dedupeKey === TASK_LIST_URL)).toBe(false);

    await openOverviewMenu(page);
    await overviewReopenBtn(page).click();
    state = (await readWorkspaceTabState(page)) as { tabs: Array<{ dedupeKey: string }> };
    expect(state.tabs.some((t) => t.dedupeKey === TASK_LIST_URL)).toBe(true); // A second
  });
});

test.describe('Workspace tabs overview menu (G3) — AC-024.3 reopen stack cap', () => {
  test('an 11th closed tab evicts the oldest (1st-closed) stack entry', async ({ page }) => {
    test.setTimeout(90_000);

    // Open-then-immediately-close 11 distinct dedupe-key tabs, one at a
    // time, so the tab bar never holds more than 2 tabs at once (dashboard
    // + the one being closed) -- deliberately staying well under TAB_CAP
    // (8) throughout, so FR-011's OWN eviction never fires and contaminates
    // this test's controlled manual-close sequence with its own stack
    // pushes. Each cycle pushes exactly one new entry onto the reopen
    // stack, oldest-pushed first.
    await page.goto(DASHBOARD_URL); // kept open throughout, never closed
    // Expected reopen-stack dedupeKey per each page's own go-to URL above --
    // NOT always the literal URL: computeWorkspaceDedupeInfo() (sidebar.js,
    // pre-existing FR-006/Q16 dedupe-key table) special-cases task-new as
    // the fixed singleton string 'task-new', and normalizes task-detail's
    // query params into alphabetical order (ap_stage before task_id), so
    // TASK_NEW_URL/TASK_DETAIL_T001_R1_URL's own literal strings are the
    // right navigation targets below but the WRONG expected dedupeKey.
    const closedKeys: string[] = [
      TASK_LIST_URL,
      DATASET_LIST_URL,
      USER_MANAGEMENT_URL,
      'task-new',
      '/pages/task-management/task-detail.html?ap_stage=r1&task_id=T001',
    ];
    for (let i = 0; i < 6; i++) {
      closedKeys.push(`annotation-workspace:T00${i + 1}:annotate`);
    }
    for (let i = 0; i < closedKeys.length; i++) {
      if (i < 5) {
        await page.goto([TASK_LIST_URL, DATASET_LIST_URL, USER_MANAGEMENT_URL, TASK_NEW_URL, TASK_DETAIL_T001_R1_URL][i]);
      } else {
        // T001-T006's own valid seeded sample ids (task-list.data.js),
        // reusing the same values sibling suites (workspace-tabs-cap.spec.ts,
        // workspace-tabs-unsaved.spec.ts) already established as valid.
        const sampleByTask: Record<string, string> = {
          T001: 'sent-001', T002: 'emo-001', T003: 'taxonomy-001',
          T004: 'read-001', T005: 'mt-001', T006: 'sequence-tagging-001',
        };
        const taskId = `T00${i - 4}`;
        await page.goto(buildWorkspaceUrl({ task_id: taskId, sample_id: sampleByTask[taskId], role: 'annotator', run_type: 'official_run' }));
      }
      await expect(workspaceTabs(page)).toHaveCount(2); // dashboard + the one just opened
      await closeButton(workspaceTabs(page).nth(1)).click(); // close it -- pushes to the reopen stack
      await expect(workspaceTabs(page)).toHaveCount(1);
    }

    const stack = await readReopenStack(page);
    expect(stack.length).toBe(10); // cap, not 11
    // The very first entry pushed (closedKeys[0] = TASK_LIST_URL) was
    // evicted; the 10 most recent (closedKeys[1..10]) remain.
    const stackKeys = stack.map((entry) => (entry as { dedupeKey: string }).dedupeKey);
    expect(stackKeys).not.toContain(closedKeys[0]);
    for (let i = 1; i < closedKeys.length; i++) {
      expect(stackKeys).toContain(closedKeys[i]);
    }
  });
});

test.describe('Workspace tabs overview menu (G3) — AC-024.4 reopen dedupe', () => {
  test('reopening a stack entry that now matches an already-open tab switches to it, without a duplicate', async ({ page }) => {
    await page.goto(DASHBOARD_URL);
    await page.goto(TASK_LIST_URL);
    const tabs = workspaceTabs(page);
    await closeButton(tabs.nth(1)).click(); // close task-list -- pushed to stack
    await expect(tabs).toHaveCount(1);

    // Re-open the SAME dedupe key by navigating there directly, before
    // reopening from the stack.
    await page.goto(TASK_LIST_URL);
    await expect(tabs).toHaveCount(2);

    await openOverviewMenu(page);
    await overviewReopenBtn(page).click();

    // No duplicate: still exactly 2 tabs, and the stack entry was consumed.
    await expect(tabs).toHaveCount(2);
    const stack = await readReopenStack(page);
    expect(stack.some((entry) => (entry as { dedupeKey: string }).dedupeKey === TASK_LIST_URL)).toBe(false);
  });
});

test.describe('Workspace tabs overview menu (G3) — AC-024.5 reopen disabled when stack empty', () => {
  test('the reopen button is disabled on a fresh session with nothing closed yet', async ({ page }) => {
    await page.goto(DASHBOARD_URL);
    await openOverviewMenu(page);
    await expect(overviewReopenBtn(page)).toBeDisabled();
  });
});

test.describe('Workspace tabs overview menu (G3) — AC-4.1-updated eviction pushes to the reopen stack', () => {
  test('a TAB_CAP-evicted tab is reopenable via "重開剛關閉的"', async ({ page }) => {
    test.setTimeout(90_000);

    await page.goto(DASHBOARD_URL); // oldest -- evicted below
    await page.goto(TASK_LIST_URL);
    await page.goto(DATASET_LIST_URL);
    await page.goto(USER_MANAGEMENT_URL);
    await page.goto(TASK_NEW_URL);
    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001', role: 'annotator', run_type: 'official_run' }));
    await page.goto(buildWorkspaceUrl({ task_id: 'T002', sample_id: 'emo-001', role: 'annotator', run_type: 'official_run' }));
    await page.goto(TASK_DETAIL_T001_R1_URL);
    await expect(workspaceTabs(page)).toHaveCount(8);

    await page.goto(buildWorkspaceUrl({ task_id: 'T004', sample_id: 'read-001', role: 'annotator', run_type: 'official_run' })); // 9th -- evicts dashboard
    await expect(workspaceTabs(page)).toHaveCount(8);

    const stack = await readReopenStack(page);
    expect(stack.some((entry) => (entry as { dedupeKey: string }).dedupeKey === DASHBOARD_URL)).toBe(true);

    await openOverviewMenu(page);
    await overviewReopenBtn(page).click();
    const state = (await readWorkspaceTabState(page)) as { tabs: Array<{ dedupeKey: string }> };
    expect(state.tabs.some((t) => t.dedupeKey === DASHBOARD_URL)).toBe(true);
  });
});

test.describe('Workspace tabs overview menu (G3) — AC-2.4-updated logout clears the reopen stack', () => {
  test('logging out clears TAB_REOPEN_STORAGE_KEY alongside TAB_STORAGE_KEY/TAB_SCROLL_STORAGE_KEY', async ({ page }) => {
    await page.goto(DASHBOARD_URL);
    await page.goto(TASK_LIST_URL);
    await closeButton(workspaceTabs(page).nth(1)).click();
    expect((await readReopenStack(page)).length).toBeGreaterThan(0);

    await page.locator('#logoutBtn').click();

    const stackAfter = await page.evaluate((key) => window.sessionStorage.getItem(key), TAB_REOPEN_STORAGE_KEY);
    expect(stackAfter).toBeNull();
  });
});

test.describe('Workspace tabs overview menu (G3) — AC-025.1/AC-025.2 close-all skips unsaved tabs', () => {
  test('close-all closes clean tabs, skips dirty ones, and shows a hint naming the skipped count', async ({ page }) => {
    await page.goto(TASK_LIST_URL); // has #toast; tab 1
    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001', role: 'annotator', run_type: 'official_run' })); // tab 2 -- will be dirtied
    await page.getByTestId('ws-progress-text').click(); // dirty signal
    await page.goto(DATASET_LIST_URL); // tab 3, clean; backgrounds tab 2, persisting its dirty flag via pagehide
    const tabs = workspaceTabs(page);
    await expect(tabs).toHaveCount(3);

    await openOverviewMenu(page);
    await overviewCloseAllBtn(page).click();

    // The one dirty tab (task_id T001 annotate) survives; the two clean
    // ones (task-list, dataset-analysis-list) are gone.
    const state = (await readWorkspaceTabState(page)) as { tabs: Array<{ dedupeKey: string }> };
    expect(state.tabs.length).toBe(1);
    expect(state.tabs[0].dedupeKey).toBe('annotation-workspace:T001:annotate');

    await expect(page.locator('#toast')).toHaveClass(/show/);
    await expect(page.locator('#toastMsg')).toContainText('1');
  });

  test('when the active tab is among those closed, focus lands on a skipped (still-open) tab, not a vanished one', async ({ page }) => {
    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001', role: 'annotator', run_type: 'official_run' }));
    await page.getByTestId('ws-progress-text').click();
    await page.goto(TASK_LIST_URL); // tab 2, clean, ACTIVE -- backgrounds tab 1, persisting its dirty flag
    await expect(workspaceTabs(page)).toHaveCount(2);

    await openOverviewMenu(page);
    await overviewCloseAllBtn(page).click();

    // Tab 2 (active, clean) closes; tab 1 (dirty) survives and must become
    // the new active tab -- never an empty/stale state.
    const tabs = workspaceTabs(page);
    await expect(tabs).toHaveCount(1);
    await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'true');
    const state = (await readWorkspaceTabState(page)) as { tabs: Array<{ dedupeKey: string }>; activeIndex: number };
    expect(state.tabs[state.activeIndex].dedupeKey).toBe('annotation-workspace:T001:annotate');
  });
});

test.describe('Workspace tabs overview menu (G3) — AC-025.3 close-all tabs are all reopenable', () => {
  test('all tabs closed by close-all can be reopened, in reverse-close order', async ({ page }) => {
    await page.goto(DASHBOARD_URL);
    await page.goto(TASK_LIST_URL);
    await page.goto(DATASET_LIST_URL);
    await expect(workspaceTabs(page)).toHaveCount(3);

    await openOverviewMenu(page);
    await overviewCloseAllBtn(page).click();
    await expect(workspaceTabs(page)).toHaveCount(0);

    const stack = await readReopenStack(page);
    expect(stack.length).toBe(3);

    for (let i = 0; i < 3; i++) {
      await openOverviewMenu(page);
      await overviewReopenBtn(page).click();
    }
    await expect(workspaceTabs(page)).toHaveCount(3);
  });
});

test.describe('Workspace tabs overview menu (G3) — AC-024A.1/AC-024A.2 reopen keyboard shortcut', () => {
  test('Alt+Shift+T reopens the most recently closed tab, same as clicking "重開剛關閉的"', async ({ page }) => {
    await page.goto(DASHBOARD_URL);
    await page.goto(TASK_LIST_URL);
    await closeButton(workspaceTabs(page).nth(1)).click();
    await expect(workspaceTabs(page)).toHaveCount(1);

    await page.keyboard.press('Alt+Shift+KeyT');

    await expect(workspaceTabs(page)).toHaveCount(2);
    const state = (await readWorkspaceTabState(page)) as { tabs: Array<{ dedupeKey: string }> };
    expect(state.tabs.some((t) => t.dedupeKey === TASK_LIST_URL)).toBe(true);
  });

  test('Alt+Shift+T with focus in an <input> does not reopen and does not interfere with typing', async ({ page }) => {
    await page.goto(DASHBOARD_URL);
    await page.goto(TASK_NEW_URL); // tab 2, active; #taskNameInput is step1's visible field
    await closeButton(workspaceTabs(page).nth(0)).click(); // close dashboard (tab 1) -- pushes to stack
    await expect(workspaceTabs(page)).toHaveCount(1); // only task-new left, stack now non-empty

    await page.locator('#taskNameInput').click();
    await page.keyboard.press('Alt+Shift+KeyT');

    await expect(workspaceTabs(page)).toHaveCount(1); // unchanged -- no reopen
    const stack = await readReopenStack(page);
    expect(stack.length).toBeGreaterThan(0); // stack still has the entry, untouched
  });
});
