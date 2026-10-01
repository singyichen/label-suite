/* Red tests for Workspace Tabs (specs/shared/019-workspace-tabs/spec.md),
 * issue #1075 sub-group G2c-2 -- TAB_CAP (8) enforcement: LRU eviction when
 * a tab with no unsaved changes is available (AC-4.1), and blocking the
 * open when all 8 are unsaved (AC-4.2 / FR-011).
 *
 * No TAB_CAP enforcement exists yet anywhere in
 * `design/prototype/pages/shared/sidebar.js`:
 * `syncCurrentPageIntoWorkspaceTabs()` always inserts, with no length check
 * at all. Every test below is expected to FAIL until a later G2c-2 Green
 * task adds cap/eviction/block logic.
 *
 * Dirty-trigger choice (AC-4.2): rather than a task-type-specific answer
 * widget (single-label chip, dimension slider, entity span, ...), every
 * test here dirties an annotation-workspace tab by clicking
 * `[data-testid="ws-progress-text"]` -- a plain, always-rendered <span> with
 * no click handler of its own, sitting inside `.col-content`. This is
 * intentional, not incidental: `annotation-workspace.config.js`'s own
 * comment above its dirty-tracking block ("Any interaction inside
 * .col-content counts as an edit signal") documents that ANY click in that
 * container is a dirty signal, by design -- not scoped to answer widgets.
 * Using a type-agnostic target lets this suite dirty 8 DISTINCT output-type
 * tasks (T001 single_label, T002 multi_label, T004 single_dim, T005
 * multi_dim, T006 sequence_tagging, T007 entity_recognition, T008
 * relation_identification, T009 free_text -- task-list.data.js's own
 * canonical one-task-per-output-type seed set) without needing a different,
 * type-specific selector per task, consistent with Generalization-First.
 *
 * Runtime: these tests open 8-9 tabs each (verified via `--list` to confirm
 * title/count before committing); `test.setTimeout(90_000)` on the heavier
 * ones follows the existing 60s precedent in
 * `tests/annotation/issue-753-bypass-after-edit-b-choice.spec.ts` /
 * `issue-750-bypass-modify-dispute.spec.ts`, raised further here because
 * these tests do MORE navigations (8-9 vs those files' single flows).
 */
import { test, expect } from '@playwright/test';
import { workspaceTabs, readWorkspaceTabState, setDesktopViewport } from './_workspace-tabs-helpers';
import { buildWorkspaceUrl, skipGuidelineModal } from '../annotation/_workspace-helpers';

const DASHBOARD_URL = '/pages/dashboard/dashboard.html';
const TASK_LIST_URL = '/pages/task-management/task-list.html';
const DATASET_LIST_URL = '/pages/dataset/dataset-analysis-list.html';
const USER_MANAGEMENT_URL = '/pages/admin/user-management.html';
const TASK_NEW_URL = '/pages/task-management/task-new.html';
const TASK_DETAIL_T001_R1_URL = '/pages/task-management/task-detail.html?task_id=T001&ap_stage=r1';

test.beforeEach(async ({ page }) => {
  await setDesktopViewport(page);
  await skipGuidelineModal(page);
});

test.describe('Workspace tabs — AC-4.1 opening a 9th tab evicts the LRU tab with no unsaved changes', () => {
  test('evicts the least-recently-used of 8 clean tabs when a 9th, distinct tab is opened', async ({ page }) => {
    test.setTimeout(90_000);

    // 8 distinct, genuinely non-colliding dedupe keys (spec 019 頁面種類 →
    // 去重鍵對照表): 4 "rest of the pages" full-URL kinds, task-new's
    // singleton key, 2 annotation-workspace task-id+mode keys, and a
    // task-detail full-URL key -- opened strictly in sequence, so each tab's
    // own first (and only, for this test) activation timestamp is
    // monotonically increasing in the same order.
    await page.goto(DASHBOARD_URL); // oldest -- never revisited below
    await page.goto(TASK_LIST_URL);
    await page.goto(DATASET_LIST_URL);
    await page.goto(USER_MANAGEMENT_URL);
    await page.goto(TASK_NEW_URL);
    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001', role: 'annotator', run_type: 'official_run' }));
    await page.goto(buildWorkspaceUrl({ task_id: 'T002', sample_id: 'emo-001', role: 'annotator', run_type: 'official_run' }));
    await page.goto(TASK_DETAIL_T001_R1_URL); // newest/active

    await expect(workspaceTabs(page)).toHaveCount(8);

    // 9th: a distinct annotate-mode workspace tab not among the 8 above.
    await page.goto(buildWorkspaceUrl({ task_id: 'T004', sample_id: 'read-001', role: 'annotator', run_type: 'official_run' }));

    // Still capped at 8, not 9 (FR-011).
    await expect(workspaceTabs(page)).toHaveCount(8);

    const state = (await readWorkspaceTabState(page)) as { tabs: Array<{ dedupeKey: string }> } | null;
    const keys = state?.tabs.map((t) => t.dedupeKey) ?? [];

    // The 9th tab's own key was inserted.
    expect(keys).toContain('annotation-workspace:T004:annotate');
    // Dashboard -- opened first and never revisited, the least-recently-used
    // of the original 8 -- was specifically the one evicted.
    expect(keys).not.toContain(DASHBOARD_URL);
    // The other 6 original tabs survive untouched.
    expect(keys).toContain(TASK_LIST_URL);
    expect(keys).toContain(DATASET_LIST_URL);
    expect(keys).toContain(USER_MANAGEMENT_URL);
    expect(keys).toContain('task-new');
    expect(keys).toContain('annotation-workspace:T001:annotate');
    expect(keys).toContain('annotation-workspace:T002:annotate');
    expect(keys?.some((k) => k.startsWith('/pages/task-management/task-detail.html'))).toBe(true);
  });
});

test.describe('Workspace tabs — AC-4.1 corollary: eviction follows recency of use, not insertion order', () => {
  test('revisiting the oldest tab saves it from eviction; the next-oldest, un-revisited tab is evicted instead', async ({ page }) => {
    test.setTimeout(90_000);

    await page.goto(DASHBOARD_URL); // opened first
    await page.goto(TASK_LIST_URL); // opened second -- never revisited below
    await page.goto(DATASET_LIST_URL);
    await page.goto(USER_MANAGEMENT_URL);
    await page.goto(TASK_NEW_URL);
    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001', role: 'annotator', run_type: 'official_run' }));
    await page.goto(buildWorkspaceUrl({ task_id: 'T002', sample_id: 'emo-001', role: 'annotator', run_type: 'official_run' }));
    await page.goto(TASK_DETAIL_T001_R1_URL);

    const tabs = workspaceTabs(page);
    await expect(tabs).toHaveCount(8);

    // Revisit tab 0 (dashboard, the OLDEST by insertion order) via the tab
    // bar itself -- the same click-to-activate mechanism workspace-tabs-core
    // .spec.ts's AC-1.2 test already uses. This makes dashboard the MOST
    // recently used tab, even though it is still the first in insertion
    // order / the first array element -- the exact condition that
    // distinguishes true LRU from "oldest by insertion order" or "first in
    // the array".
    await tabs.nth(0).click();
    await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'true');
    await expect(tabs).toHaveCount(8);

    // 9th: a distinct annotate-mode workspace tab not among the 8 above.
    await page.goto(buildWorkspaceUrl({ task_id: 'T005', sample_id: 'mt-001', role: 'annotator', run_type: 'official_run' }));

    await expect(workspaceTabs(page)).toHaveCount(8);

    const state = (await readWorkspaceTabState(page)) as { tabs: Array<{ dedupeKey: string }> } | null;
    const keys = state?.tabs.map((t) => t.dedupeKey) ?? [];

    expect(keys).toContain('annotation-workspace:T005:annotate');
    // task-list -- opened second and never revisited -- is now the
    // genuinely least-recently-used tab, and must be the one evicted.
    expect(keys).not.toContain(TASK_LIST_URL);
    // Dashboard survives specifically BECAUSE it was just revisited --
    // disproving "evict whatever is oldest by insertion order / first in
    // the array", which would have predicted dashboard's eviction instead.
    expect(keys).toContain(DASHBOARD_URL);
    expect(keys).toContain(DATASET_LIST_URL);
    expect(keys).toContain(USER_MANAGEMENT_URL);
    expect(keys).toContain('task-new');
    expect(keys).toContain('annotation-workspace:T001:annotate');
    expect(keys).toContain('annotation-workspace:T002:annotate');
    expect(keys?.some((k) => k.startsWith('/pages/task-management/task-detail.html'))).toBe(true);
  });
});

test.describe('Workspace tabs — AC-4.2 opening a 9th tab is blocked when all 8 have unsaved changes', () => {
  test('blocks the open, leaves all 8 unsaved tabs untouched, redirects back to the previously active tab, and shows a notice', async ({ page }) => {
    test.setTimeout(90_000);

    // 8 distinct annotation-workspace tabs (task-list.data.js's one-task-
    // per-output-type seed set, spec 019 FR-006/Q3 task-id+mode dedupe),
    // each dirtied via the generic .col-content click signal (see file
    // header) immediately before navigating to the next -- so the pagehide
    // capture (FR-012, G2c-1) persists hasUnsavedChanges: true for each
    // BACKGROUND tab in turn.
    const workspaceTasks = [
      { task_id: 'T001', sample_id: 'sent-001' },
      { task_id: 'T002', sample_id: 'emo-001' },
      { task_id: 'T004', sample_id: 'read-001' },
      { task_id: 'T005', sample_id: 'mt-001' },
      { task_id: 'T006', sample_id: 'sequence-tagging-001' },
      { task_id: 'T007', sample_id: 'entity-recognition-001' },
      { task_id: 'T008', sample_id: 'rel-001' },
      { task_id: 'T009', sample_id: 'sum-001' },
    ];

    for (const { task_id, sample_id } of workspaceTasks) {
      await page.goto(buildWorkspaceUrl({ task_id, sample_id, role: 'annotator', run_type: 'official_run' }));
      await page.getByTestId('ws-progress-text').click();
    }

    await expect(workspaceTabs(page)).toHaveCount(8);

    // The 8th (T009) is the currently active tab, dirtied above but not yet
    // backgrounded -- its own pagehide capture only fires on the navigation
    // attempted next.
    const activeUrlBeforeAttempt = page.url();

    // Attempt to open a 9th tab -- a page not among the 8, and not even an
    // annotation-workspace page, to keep the "blocked, not just redirected
    // to yet another workspace tab" assertion unambiguous.
    await page.goto(DASHBOARD_URL);

    // FR-011: all 8 unsaved -> blocked; browser ends back where it was
    // before the attempt, not on the attempted URL.
    await expect(page).toHaveURL(activeUrlBeforeAttempt);

    const tabs = workspaceTabs(page);
    await expect(tabs).toHaveCount(8); // no 9th tab, none evicted

    const state = (await readWorkspaceTabState(page)) as { tabs: Array<{ dedupeKey: string }> } | null;
    const keys = state?.tabs.map((t) => t.dedupeKey) ?? [];
    expect(keys).not.toContain(DASHBOARD_URL);
    for (const { task_id } of workspaceTasks) {
      expect(keys).toContain(`annotation-workspace:${task_id}:annotate`);
    }

    // A visible notice must appear (FR-011: "擋下開啟並提示使用者"). Same
    // #toast/.show element workspace-tabs-rekey.spec.ts's AC-3.5 case reuses
    // (this suite's own judgment call, not verbatim spec text) -- but NOT
    // its `role="alert"` assertion: that attribute is specific to
    // task-detail.html's own toast markup, while this scenario always lands
    // back on an annotation-workspace.html tab, whose pre-existing #toast
    // element (annotation-workspace.html, id="toast") carries no role
    // attribute at all.
    await expect(page.locator('#toast')).toHaveClass(/show/);
    await expect(page.locator('#toastMsg')).not.toHaveText('');
  });
});
