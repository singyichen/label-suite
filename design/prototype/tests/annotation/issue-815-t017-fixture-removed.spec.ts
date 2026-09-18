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
 * Expected failure today (before Green): every assertion that names T017 as
 * absent must fail, because T017 still exists in all 7 registries. The
 * T014-T016 preservation assertions (requirement 3) are unaffected by
 * T017's presence and must already pass today.
 *
 * Type declarations use local casts per `page.evaluate()` call -- no second
 * `declare global` in this directory (annotation-workspace-arbitration.spec.ts
 * already owns the one for LabelSuiteAnnotationWorkspaceData; a second
 * declaration collides, TS2717).
 *
 * Traceability: openspec/changes/retire-stale-review-demo-fixtures/tasks.md
 *   2.1, "## 2. PR-815-B" 規模例外聲明 (7 registries); proposal.md; issue #815.
 */

const TASK_LIST_URL = '/pages/task-management/task-list.html?task_role=super_admin';
const TASK_DETAIL_URL = '/pages/task-management/task-detail.html';
const DASHBOARD_URL = '/pages/dashboard/dashboard.html';
const DATASET_DETAIL_URL = '/pages/dataset/dataset-analysis-detail.html';
const PANEL_LOAD_TIMEOUT = 15000;

const REMOVED_TASK_ID = 'T017';
const SURVIVING_TASK_IDS = ['T014', 'T015', 'T016'];

type TaskListTask = { id: string; sourceFile?: string };
type AssignmentSeed = { exampleTaskId: string };
type DashboardTask = { id: string };

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

    expect(demoTaskIds).toEqual(SURVIVING_TASK_IDS);
  });

  test('requirement 2a: task-detail.html-loaded registries (annotation-workspace, task-list, task-detail, task-detail.html itself) no longer key T017', async ({ page }) => {
    await page.goto(TASK_DETAIL_URL + '?task_id=T014');
    await page.locator('#workLogPanel').waitFor({ state: 'attached', timeout: PANEL_LOAD_TIMEOUT });

    const registryKeys = await page.evaluate(() => {
      const w = window as unknown as {
        LabelSuiteAnnotationWorkspaceData: { REVIEWER_MOCK_ROWS: Record<string, unknown> };
        LabelSuiteTaskListData: { tasks: TaskListTask[] };
        LabelSuiteTaskDetailData: { profiles: Record<string, unknown> };
        REVIEW_WORKLOAD_BY_TASK: Record<string, unknown>;
        REVIEW_FLOW_UNITS: Record<string, unknown>;
      };
      return {
        reviewerMockRows: Object.keys(w.LabelSuiteAnnotationWorkspaceData.REVIEWER_MOCK_ROWS),
        taskListIds: w.LabelSuiteTaskListData.tasks.map((task) => task.id),
        taskDetailProfiles: Object.keys(w.LabelSuiteTaskDetailData.profiles),
        reviewWorkloadByTask: Object.keys(w.REVIEW_WORKLOAD_BY_TASK),
        reviewFlowUnits: Object.keys(w.REVIEW_FLOW_UNITS),
      };
    });

    expect(registryKeys.reviewerMockRows, 'REVIEWER_MOCK_ROWS (annotation-workspace.data.js)').not.toContain(REMOVED_TASK_ID);
    expect(registryKeys.taskListIds, 'LabelSuiteTaskListData.tasks (task-list.data.js)').not.toContain(REMOVED_TASK_ID);
    expect(registryKeys.taskDetailProfiles, 'LabelSuiteTaskDetailData.profiles (task-detail.data.js)').not.toContain(REMOVED_TASK_ID);
    expect(registryKeys.reviewWorkloadByTask, 'REVIEW_WORKLOAD_BY_TASK (task-detail.html)').not.toContain(REMOVED_TASK_ID);
    expect(registryKeys.reviewFlowUnits, 'REVIEW_FLOW_UNITS (task-detail.html)').not.toContain(REMOVED_TASK_ID);

    for (const taskId of SURVIVING_TASK_IDS) {
      expect(registryKeys.reviewerMockRows, `REVIEWER_MOCK_ROWS missing ${taskId}`).toContain(taskId);
      expect(registryKeys.taskListIds, `LabelSuiteTaskListData.tasks missing ${taskId}`).toContain(taskId);
      expect(registryKeys.taskDetailProfiles, `LabelSuiteTaskDetailData.profiles missing ${taskId}`).toContain(taskId);
      expect(registryKeys.reviewWorkloadByTask, `REVIEW_WORKLOAD_BY_TASK missing ${taskId}`).toContain(taskId);
      expect(registryKeys.reviewFlowUnits, `REVIEW_FLOW_UNITS missing ${taskId}`).toContain(taskId);
    }
  });

  test('requirement 2b: dashboard.html-loaded registries (dashboard.data.js, dashboard.assignments.js) no longer key T017', async ({ page }) => {
    await page.goto(DASHBOARD_URL);

    const registryKeys = await page.evaluate(() => {
      const w = window as unknown as {
        LabelSuiteDashboard: { data: { tasks: DashboardTask[] } };
        LabelSuiteAssignmentSeeds: AssignmentSeed[];
      };
      return {
        dashboardTaskIds: w.LabelSuiteDashboard.data.tasks.map((task) => task.id),
        assignmentTaskIds: w.LabelSuiteAssignmentSeeds.map((seed) => seed.exampleTaskId),
      };
    });

    expect(registryKeys.dashboardTaskIds, 'LabelSuiteDashboard.data.tasks (dashboard.data.js)').not.toContain(REMOVED_TASK_ID);
    expect(registryKeys.assignmentTaskIds, 'LabelSuiteAssignmentSeeds (dashboard.assignments.js)').not.toContain(REMOVED_TASK_ID);

    for (const taskId of SURVIVING_TASK_IDS) {
      expect(registryKeys.dashboardTaskIds, `LabelSuiteDashboard.data.tasks missing ${taskId}`).toContain(taskId);
      expect(registryKeys.assignmentTaskIds, `LabelSuiteAssignmentSeeds missing ${taskId}`).toContain(taskId);
    }
  });

  test('requirement 2c: dataset-analysis-detail.html TASK_META no longer keys T017', async ({ page }) => {
    await page.goto(`${DATASET_DETAIL_URL}?task_id=T014&tab=quality`);

    const taskMetaKeys = await page.evaluate(() =>
      Object.keys((window as unknown as { TASK_META: Record<string, unknown> }).TASK_META),
    );

    expect(taskMetaKeys, 'TASK_META (dataset-analysis-detail.html)').not.toContain(REMOVED_TASK_ID);
    for (const taskId of SURVIVING_TASK_IDS) {
      expect(taskMetaKeys, `TASK_META missing ${taskId}`).toContain(taskId);
    }
  });

  test('requirement 2d (DOM): task-list.html no longer renders a T017 row', async ({ page }) => {
    await page.goto(TASK_LIST_URL);

    await expect(
      page.locator('#taskTableBody tr[data-source-file="review-flow-official-tie.json"]'),
    ).toHaveCount(0);
  });

  test('requirement 2e (DOM): dataset-analysis-detail.html no longer resolves T017 by direct URL', async ({ page }) => {
    await page.goto(`${DATASET_DETAIL_URL}?task_id=T017&tab=quality`);

    await expect(page).toHaveURL(/dataset-analysis-list\.html/);
  });

  test('requirement 3a: T014-T016 task-list rows stay individually correct after T017 removal', async ({ page }) => {
    await page.goto(TASK_LIST_URL);

    const survivors = [
      { sourceFile: 'review-flow-dry-run.json', nameZh: '審核流程示範：試標', runBadgeClass: '.badge-dry-run', runBadge: '試標' },
      { sourceFile: 'review-flow-official-single.json', nameZh: '審核流程示範：正式標記（單一審核員）', runBadgeClass: '.badge-official', runBadge: '正式標記' },
      { sourceFile: 'review-flow-official-multi.json', nameZh: '審核流程示範：正式標記（三審核員多數決）', runBadgeClass: '.badge-official', runBadge: '正式標記' },
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

    await expect(page.locator('#bcCurrent')).toHaveText('審核流程示範：試標', {
      timeout: PANEL_LOAD_TIMEOUT,
    });
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
