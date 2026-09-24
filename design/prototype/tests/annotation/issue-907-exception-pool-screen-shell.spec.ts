import { test, expect, type Page } from '@playwright/test';
import { skipGuidelineModal } from './_workspace-helpers';

/* issue #907 (OpenSpec change pl-exception-disposal-screen-shell, task 1.1,
 * RED): FR-095's new "本版新增——最終例外處置畫面的外殼" clause -- a project
 * leader's final-exception disposition screen MUST use an exception-pool-
 * scoped shell, not the annotator's sample-navigation shell it silently
 * falls back to today.
 *
 * Confirmed by reading annotation-workspace.config.js directly:
 * renderWorkspace() (:1477) already special-cases `currentRole ===
 * 'project_leader'` to call renderExceptionPoolScreen() for the CENTER
 * panel (issue #596), but unconditionally still calls renderSampleList()
 * (:1488), renderSampleNav() (:1489) and renderAutosaveStatus() (:1491)
 * right after -- all three treat project_leader exactly like `annotator`
 * (every branch tests `currentRole !== 'reviewer'`, never `project_leader`
 * specifically):
 *   - renderSampleList() (:2131) renders one `ws-sample-item` /
 *     `ws-sample-status` row per DATASET RECORD (`buildUnits()` pushes one
 *     unit per record for any non-reviewer role) -- the project leader has
 *     no standalone annotation work, so this is the wrong queue entirely.
 *   - renderSampleNav() (:1598) sets `#wsProgressText` (testid
 *     `ws-progress-text`) to `t('wsProgressText')` = "{done} / {total}
 *     已提交" (config.js :32) for any non-reviewer role -- a submission
 *     count that is meaningless for a role that never submits here.
 *   - renderAutosaveStatus() (:1634) only hides `.autosave-status`
 *     (testid `ws-autosave-status`, static markup at
 *     annotation-workspace.html:1203) for `reviewer`; for project_leader it
 *     stays visible and reads "尚未儲存" forever, since getSampleSavedAt()
 *     never finds a project_leader submission.
 * This reproduces the proposal.md repro verbatim: T016 / ofm-05-final-
 * exception / official_run shows all 5 dataset samples tagged 待標記, "0 / 5
 * 已提交", and a permanent 尚未儲存 status.
 *
 * The center panel (renderExceptionPoolScreen(), buildExceptionPoolItemRow())
 * is untouched by this change and already renders `ws-exception-pool` /
 * `ws-exception-pool-item` / `ws-exception-pool-action-<action>` correctly
 * per issue #596 -- this file only adds NEW assertions against that
 * existing, unmodified structure for the two shell gaps FR-095 additionally
 * names: the arbitration reason/arbiter are not shown in-place (only `{a}`/
 * `{b}` values are, via `exceptionPoolContextTpl`), and
 * `exclude_from_dataset` shares the plain `.mini-btn` class with the three
 * adopting actions (config.js :4210), giving it no distinguishing danger
 * style.
 *
 * --- Decided Red contract (task 1.2's Green implementation is wrong if it
 *     disagrees, not this test) ---
 *   - New testid `ws-exception-queue-item`: one per LEFT-column row when
 *     role=project_leader, one row per `listReviewPoolItems(taskId,
 *     runType).pendingExceptions` entry (task-level, NOT scoped to the
 *     currently open sample_id) -- the left column's replacement for
 *     `ws-sample-item` in this role, chosen because `ws-sample-item` itself
 *     is asserted absent (this screen must not reuse sample-navigation
 *     item semantics) and no such testid exists anywhere in the codebase
 *     today (confirmed by grep).
 *   - `#sampleListCount` (existing element, annotation-workspace.html:1166)
 *     keeps being the left column's header count for this role too, but its
 *     number MUST be the pending-exception count, not the dataset's total
 *     record count.
 *   - `ws-progress-text` (existing element) MUST NOT read "{done} / {total}
 *     已提交" for this role.
 *   - `ws-autosave-status` (existing static element) MUST NOT be visible
 *     for this role -- not asserted via toHaveCount(0) since the node is
 *     static markup on every workspace page load, only ever toggled via a
 *     `hidden` class (display:none), never removed from the DOM even after
 *     a correct fix.
 *   - Contract name `mini-btn-danger` for the exclude action's distinguishing
 *     class, per proposal.md's suggestion (mirrors the existing
 *     `mini-btn-active-*` naming convention at annotation-workspace.html
 *     :523-525).
 *
 * Seeding: T016/ofm-05-final-exception is already a final-exception-pool
 * item at boot, entirely via the pre-existing seedReviewFlowDemo()
 * (annotation-workspace.data.js :3441, `arbReject: true`) -- no manual
 * seeding needed. Live-checked listReviewPoolItems() against every
 * task/run_type this worktree's seed defines: T016/official_run is the
 * ONLY combination with any pendingExceptions at all, and it has exactly
 * one (ofm-05-final-exception). Coordinator correction (2026-09-24):
 * assertion 1 originally required pending.length > 1 to prove the queue
 * is task-scoped rather than scoped to the open sample_id, but no seed
 * combination reaches 2 without driving the arbitration UI mid-test, which
 * this file no longer does. Assertion 1 instead compares pending.length
 * against listReviewUnits(TASK, RUN_TYPE).length (5, the annotator-shell
 * sample count for the same task/run_type) -- discriminating power comes
 * from proving the left queue is the pending-exception list, not a reuse
 * of the annotator sample-navigation list, rather than from proving
 * task-vs-sample scoping.
 *
 * Traceability: openspec/changes/pl-exception-disposal-screen-shell/
 *   specs/annotation/015-annotation-workspace/spec.md FR-095 "本版新增——
 *   最終例外處置畫面的外殼" points 1-5 and its "最終例外處置畫面不沿用標記員
 *   外殼" scenario; tasks.md task 1.1.
 */

type ReviewUnit = { sampleId: string; annotatorId: string; status: string };

type PendingExceptionItem = {
  taskId: string;
  runType: string;
  sampleId: string;
  annotatorId: string;
  outKey: string;
  key: string;
  outputType: string;
  reviewerIds: string[];
  arbiterId: string;
  reason: string;
  fellAt: string;
};

type ReviewPoolItems = { awaitingArbitration: PendingExceptionItem[]; pendingExceptions: PendingExceptionItem[] };

type WorkspaceData = {
  listReviewPoolItems: (taskId: string, runType: string) => ReviewPoolItems;
  listReviewUnits: (taskId: string, runType: string) => ReviewUnit[];
  EXCEPTION_POOL_ACTIONS: string[];
};

/* No `declare global` here: annotation-workspace-arbitration.spec.ts already
 * declares/casts this window property with its own shape (only one
 * `declare global` is allowed package-wide, TS2717) -- cast per evaluate
 * call instead, same idiom issue-596-exception-pool.spec.ts uses. */

const TASK = 'T016';
const RUN_TYPE = 'official_run';
const ANNOTATOR = 'kioleemg12';
const SAMPLE_EXCEPTION = 'ofm-05-final-exception'; // pre-seeded final exception at boot

/* `_workspace-helpers.ts`'s `Role` type is intentionally `'annotator' |
 * 'reviewer'` only (this task must not edit that shared file), so this
 * local builder mirrors its exact path/query convention for the one new
 * role value this change's screen renders under -- same pattern
 * issue-596-exception-pool.spec.ts's buildProjectLeaderUrl() already uses. */
function buildProjectLeaderUrl(sampleId: string): string {
  return `/pages/annotation/annotation-workspace.html?task_id=${TASK}&sample_id=${sampleId}&role=project_leader&run_type=${RUN_TYPE}&annotator_id=${ANNOTATOR}`;
}

function readPendingExceptions(page: Page): Promise<PendingExceptionItem[]> {
  return page.evaluate(
    (args) =>
      (window as unknown as { LabelSuiteAnnotationWorkspaceData: WorkspaceData })
        .LabelSuiteAnnotationWorkspaceData.listReviewPoolItems(args.taskId, args.runType).pendingExceptions,
    { taskId: TASK, runType: RUN_TYPE }
  );
}

function readActions(page: Page): Promise<string[]> {
  return page.evaluate(
    () =>
      (window as unknown as { LabelSuiteAnnotationWorkspaceData: WorkspaceData })
        .LabelSuiteAnnotationWorkspaceData.EXCEPTION_POOL_ACTIONS
  );
}

function readReviewUnits(page: Page): Promise<ReviewUnit[]> {
  return page.evaluate(
    (args) =>
      (window as unknown as { LabelSuiteAnnotationWorkspaceData: WorkspaceData })
        .LabelSuiteAnnotationWorkspaceData.listReviewUnits(args.taskId, args.runType),
    { taskId: TASK, runType: RUN_TYPE }
  );
}

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
});

test.describe('issue #907: FR-095 final exception disposition screen shell (role=project_leader)', () => {
  test('point 1: left queue is the task-level pending-exception list, not the sample-navigation list', async ({
    page,
  }) => {
    await page.goto(buildProjectLeaderUrl(SAMPLE_EXCEPTION));

    const pending = await readPendingExceptions(page);
    const units = await readReviewUnits(page);
    // Discriminating power comes from proving the left queue is the
    // pending-exception list, not a reuse of the annotator sample-
    // navigation list, by requiring it be strictly smaller than this
    // task/run_type's full review-unit count -- a sample-navigation reuse
    // would render one row per review unit (5), not per pending exception
    // (1).
    expect(pending.length).toBeLessThan(units.length);

    await expect(page.getByTestId('ws-exception-queue-item')).toHaveCount(pending.length);

    // Sample-navigation item semantics MUST NOT leak into this screen.
    await expect(page.getByTestId('ws-sample-item')).toHaveCount(0);
    await expect(page.getByTestId('ws-sample-status')).toHaveCount(0);
  });

  test('point 2: progress is exception-item count, not submission progress', async ({ page }) => {
    await page.goto(buildProjectLeaderUrl(SAMPLE_EXCEPTION));
    const pending = await readPendingExceptions(page);

    const progressText = page.getByTestId('ws-progress-text');
    await expect(progressText).not.toContainText('已提交');
    await expect(progressText).not.toHaveText(/^\s*\d+\s*\/\s*\d+\s*已提交\s*$/);

    // #sampleListCount stays the left column's header count for this role
    // too, but MUST report the pending-exception count, not the dataset's
    // total record count (T016 has 5 records; today's count is that 5, not
    // this task's pending-exception count).
    await expect(page.locator('#sampleListCount')).toContainText(String(pending.length));
  });

  test('point 3: no autosave status row', async ({ page }) => {
    await page.goto(buildProjectLeaderUrl(SAMPLE_EXCEPTION));
    // `ws-autosave-status` is static markup present on every workspace page
    // load, only ever toggled via a `hidden` class (display:none) -- never
    // removed from the DOM even after a correct fix -- so visibility, not
    // presence, is the correct assertion.
    await expect(page.getByTestId('ws-autosave-status')).not.toBeVisible();
  });

  test('point 4: each disposition item shows its arbiter and arbitration reason in place', async ({ page }) => {
    await page.goto(buildProjectLeaderUrl(SAMPLE_EXCEPTION));
    const pending = await readPendingExceptions(page);
    const expected = pending.find((p) => p.sampleId === SAMPLE_EXCEPTION);
    if (!expected) {
      throw new Error('seed fixture missing: T016/ofm-05-final-exception has no pending exception item');
    }

    const items = page.getByTestId('ws-exception-pool-item');
    await expect(items).toHaveCount(1);
    await expect(items.first()).toContainText(expected.arbiterId);
    await expect(items.first()).toContainText(expected.reason);
  });

  test('point 5: exclude_from_dataset is visually distinct (danger style) from the three adopting actions', async ({
    page,
  }) => {
    await page.goto(buildProjectLeaderUrl(SAMPLE_EXCEPTION));
    const actions = await readActions(page);
    const item = page.getByTestId('ws-exception-pool-item').first();

    const excludeClass =
      (await item.getByTestId('ws-exception-pool-action-exclude_from_dataset').getAttribute('class')) || '';
    expect(excludeClass).toContain('mini-btn-danger');

    for (const action of actions.filter((a) => a !== 'exclude_from_dataset')) {
      const cls = (await item.getByTestId(`ws-exception-pool-action-${action}`).getAttribute('class')) || '';
      expect(cls).not.toContain('mini-btn-danger');
    }
  });
});
