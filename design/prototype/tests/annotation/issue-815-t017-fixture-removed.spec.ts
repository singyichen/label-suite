import { test, expect, type Page } from '@playwright/test';

/* Issue #815 (OpenSpec change retire-stale-review-demo-fixtures) task 2.1,
 * PR-815-B. tasks.md 2.1 pins three things about the review-flow demo task
 * set (T014-T017) after group 2 removes the T017 fixture entirely:
 *
 *   1. the demo task set is exactly three (T014, T015, T016) and does not
 *      contain T017 -- checked against task-list.data.js's own registry,
 *      the single canonical enumeration of every task the prototype knows
 *      about (LabelSuiteTaskListData.tasks), filtered to the review-flow
 *      demo tasks by their shared `sourceFile` prefix.
 *   2. no consumer that enumerates demo tasks still surfaces the id T017 --
 *      covered through every one of the 7 registries tasks.md group 2 names
 *      (annotation-workspace.data.js, task-list.data.js,
 *      task-detail.data.js, task-detail.html, dashboard.data.js,
 *      dashboard.assignments.js, dataset-analysis-detail.html), read via
 *      each page's own loaded globals (task-detail.html, dashboard.html,
 *      and dataset-analysis-detail.html each load several of these
 *      registries at once, so three page loads cover all 7) plus two DOM
 *      reachability checks (task-list row, dataset-analysis-detail direct
 *      URL) that pin the same fact at the rendered-output layer, not just
 *      in the underlying data.
 *   3. after removal, T014-T016's existing list rows / task-detail profile
 *      / dashboard reviewer summaries stay individually correct -- each
 *      assertion below anchors to one demo task's own id and known values,
 *      never to a total across the demo set, so it does not shift when
 *      T017 is removed and stays green both before and after this group's
 *      Green work.
 *
 * Issues #892/#891 retired task-detail's static REVIEW_FLOW_UNITS and
 * REVIEW_WORKLOAD_BY_TASK registries. Their live replacements
 * listReviewPoolItems()/computeReviewWorkload() must return no T017 work
 * while continuing to derive the surviving T014-T016 fixtures.
 *
 * Type declarations use local casts per `page.evaluate()` call -- no second
 * `declare global` in this directory (annotation-workspace-arbitration.spec.ts
 * already owns the one for LabelSuiteAnnotationWorkspaceData; a second
 * declaration collides, TS2717).
 *
 * Traceability: specs/task-management/014-task-detail/spec.md FR-010o-4
 *   (T018, the IAA-computation demo task requirement 1 below expects
 *   alongside T014-T016); task 2.1 and "## 2. PR-815-B" 規模例外聲明
 *   (7 registries) of the archived OpenSpec change
 *   `retire-stale-review-demo-fixtures`; issue #815.
 *
 * issue #1059 G6b (inventory.csv decision=merge): point 2's five per-
 * registry/DOM cases (requirement 2a-2e) were folded into requirement 1
 * below -- see the comment above requirement 3a for the matrix's
 * "replaced by one canonical registry assertion" rationale and the
 * coverage trade-off it accepts. This file's point 2 above is left as
 * historical record of what task 2.1 originally required.
 */

const TASK_LIST_URL = '/pages/task-management/task-list.html?task_role=super_admin';
const TASK_DETAIL_URL = '/pages/task-management/task-detail.html';
const DASHBOARD_URL = '/pages/dashboard/dashboard.html';
const PANEL_LOAD_TIMEOUT = 15000;

const SURVIVING_TASK_IDS = ['T014', 'T015', 'T016'];

type RunType = 'dry_run' | 'official_run';
type TaskListTask = { id: string; sourceFile?: string; runType?: RunType };

async function openDashboardScenario(page: Page, scenario: 'annotator' | 'reviewer') {
  await page.goto(DASHBOARD_URL);
  const trigger = page.locator(`.scenario-pill[data-scenario="${scenario}"]`);
  await expect(trigger).toBeVisible();
  await trigger.click();
}

test.describe('T017 review-flow demo fixture is fully removed (issue #815, tasks.md 2.1)', () => {
  test('requirement 1: the review-flow demo task set in task-list.data.js is exactly T014-T016', async ({ page }) => {
    await page.goto(TASK_DETAIL_URL + '?task_id=T014');

    const demoTaskIds = await page.evaluate(() => {
      const tasks = (window as unknown as { LabelSuiteTaskListData: { tasks: TaskListTask[] } })
        .LabelSuiteTaskListData.tasks;
      return tasks
        .filter((task) => typeof task.sourceFile === 'string' && task.sourceFile.indexOf('review-flow-') === 0)
        .map((task) => task.id)
        .sort();
    });

    /* issue #783 later adds T018 (FR-010o-4 IAA-computation-failed demo,
       sourceFile 'review-flow-iaa-failed.json') to task-list.data.js only;
       it shares the review-flow- prefix but is not one of the
       SURVIVING_TASK_IDS dashboard/task-detail fixtures below, so it is
       appended here rather than to that constant. */
    expect(demoTaskIds).toEqual([...SURVIVING_TASK_IDS, 'T018']);
  });

  // issue #1059 G6b (inventory.csv decision=merge, intra-file fold): the
  // five "requirement 2a"-"requirement 2e" cases used to sit here, each
  // independently re-proving across one more registry/DOM surface
  // (annotation-workspace.data.js, task-list.data.js, task-detail.data.js,
  // task-detail.html's REVIEW_FLOW_UNITS, dashboard.data.js,
  // dashboard.assignments.js, dataset-analysis-detail.html's TASK_META,
  // plus two DOM reachability checks) that T017 is gone and T014-T016
  // survive. The matrix's reason text for all five rows: "Permanent
  // negative proof across 7 registries replaced by one canonical registry
  // assertion" -- requirement 1 above already pins task-list.data.js's
  // `tasks` registry (the one place a demo task must be declared to exist
  // at all) to exactly T014-T016 (+T018), which is this group's designated
  // sole survivor. Carried forward as an open item: unlike requirement 1,
  // the five dropped cases checked OTHER registries independently and a
  // regression that hand-edits only one of those six files (without
  // touching task-list.data.js) would no longer be caught -- this is the
  // coverage trade-off the matrix's "replaced by one canonical registry
  // assertion" reasoning accepts, not one G6b introduces.

  test('requirement 3a: T014-T016 task-list rows stay individually correct after T017 removal', async ({ page }) => {
    await page.goto(TASK_LIST_URL);

    const survivors = [
      { sourceFile: 'review-flow-dry-run.json', nameZh: '審核流程示範：試標', runBadgeClass: '.badge-dry-run', runBadge: '試標' },
      { sourceFile: 'review-flow-official-single.json', nameZh: '審核流程示範：正式標記（基礎審核）', runBadgeClass: '.badge-official', runBadge: '正式標記' },
      { sourceFile: 'review-flow-official-multi.json', nameZh: '審核流程示範：正式標記（輪派、仲裁與最終例外）', runBadgeClass: '.badge-official', runBadge: '正式標記' },
    ];

    for (const task of survivors) {
      const row = page.locator(`#taskTableBody tr[data-source-file="${task.sourceFile}"]`);
      await expect(row).toBeVisible();
      await expect(row).toContainText(task.nameZh);
      await expect(row.locator(task.runBadgeClass)).toHaveText(task.runBadge);
    }
  });

  test('requirement 3b: T014 task-detail profile still resolves 5 records after T017 removal', async ({ page }) => {
    await page.goto(`${TASK_DETAIL_URL}?task_id=T014`);

    // FR-028: the task name lives in the H1; the breadcrumb tail is the task id.
    await expect(page.locator('#pageTitle')).toHaveText('審核流程示範：試標', {
      timeout: PANEL_LOAD_TIMEOUT,
    });
    await expect(page.locator('#bcCurrent')).toHaveText('T014');
    await expect(page.locator('#valueTaskType')).toHaveText('單一標籤');
    await expect(page.locator('#valueDatasetSummary')).toHaveText('5 筆');
  });

  test('requirement 3c: dashboard reviewer summaries for T014-T016 stay individually correct after T017 removal', async ({ page }) => {
    await openDashboardScenario(page, 'reviewer');

    const survivors = [
      { id: 'T014', summaryZh: '任務覆蓋 10 / 15 個審核單位 · 待審 5 個 · 爭議中 3 個 · IAA 0.59' },
      { id: 'T015', summaryZh: '任務覆蓋 3 / 4 個審核單位 · 待審 1 個 · 爭議中 1 個 · IAA 無法計算' },
      { id: 'T016', summaryZh: '任務覆蓋 5 / 5 個審核單位 · 爭議中 3 個 · IAA 無法計算' },
    ];

    for (const task of survivors) {
      const row = page.locator(`#reviewerTaskList [data-example-task-id="${task.id}"]`);
      await expect(row).toBeVisible();
      await expect(row.locator('.list-item-detail')).toContainText(task.summaryZh);
    }
  });
});
