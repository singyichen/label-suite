/**
 * Review-flow demo tasks on the dashboard (issue #302, Phase 3)
 * Source spec: specs/dashboard/012-dashboard/spec.md
 *
 * T014-T017 are the review-flow demo tasks staged by the
 * annotation-workspace.data.js boot seeder. The dashboard assignment rows
 * are the ONLY place a run_type is bound to a task for navigation, so these
 * tests pin:
 *   - the demo tasks appear in the annotator/reviewer task lists
 *   - card clicks route to annotation-list with the correct run_type
 *   - reviewer summaries match the seeded review-state matrix
 *     (T014=5, T015=1, T016=0, T017=1 pending review units) using the
 *     subject-bearing wording (issue #452): the share of units past 待審 is
 *     labeled 任務覆蓋 x / n 個審核單位, and T016 — whose pending count is 0
 *     while 1 disputed + 2 more units are still unfinalized — must disclose
 *     未達定稿門檻 3 · 爭議中 1 instead of reading as a completed task.
 *
 * Issue #450: these summaries are no longer the seed's prebuilt display
 * string — computeReviewSummary() derives them from the stored review-unit
 * state, so every non-zero counter (待審 / 未達定稿門檻 / 爭議中) now appears under
 * one shared rule instead of being hand-written per demo task.
 *
 * Traceability: specs/dashboard/012-dashboard/spec.md
 *   FR-010B, FR-011B1, FR-011D, FR-011E, SC-016
 */
import { test, expect, type Page } from '@playwright/test';

const DASHBOARD_URL = '/pages/dashboard/dashboard.html';

test.describe.configure({ mode: 'serial' });

async function openScenario(page: Page, scenario: 'annotator' | 'reviewer') {
  await page.goto(DASHBOARD_URL);
  const trigger = page.locator(`.scenario-pill[data-scenario="${scenario}"]`);
  await expect(trigger).toBeVisible();
  await trigger.click();
}

const DEMO_TASKS = [
  {
    id: 'T014',
    runType: 'dry_run',
    runTypeBadge: '試標',
    /* issue #489: IAA is now derived by computeIaaAlpha() from the T014
       dry_run seed matrix (5 samples x 3 annotators, single_label) instead
       of a hardcoded figure -- 0.59 is that derivation's alpha (0.588235),
       rounded to 2 decimals by formatReviewSummary's toFixed(2). See
       tests/annotation/issue-489-iaa-single-derivation.spec.ts for the
       independently-verified Do/De/alpha values. */
    // dry-05 x kioleemg12 moved from pending to finalized (issue #502: a
    // dry_run reject still counts as reviewed). IAA is derived from
    // annotator values only (computeIaaAlpha), untouched by this change.
    reviewerSummaryZh: '任務覆蓋 10 / 15 個審核單位 · 待審 5 個 · 未達定稿門檻 7 個 · 爭議中 2 個 · IAA 0.59',
    reviewerSummaryEn:
      'Task coverage 10 / 15 review units · 5 pending · 7 short of finalize threshold · 2 disputed · IAA 0.59',
  },
  {
    id: 'T015',
    runType: 'official_run',
    runTypeBadge: '正式標記',
    reviewerSummaryZh: '任務覆蓋 3 / 4 個審核單位 · 待審 1 個 · 未達定稿門檻 2 個 · 爭議中 1 個 · IAA 無法計算',
    reviewerSummaryEn:
      'Task coverage 3 / 4 review units · 1 pending · 2 short of finalize threshold · 1 disputed · IAA Not computable',
  },
  {
    id: 'T016',
    runType: 'official_run',
    runTypeBadge: '正式標記',
    reviewerSummaryZh: '任務覆蓋 5 / 5 個審核單位 · 未達定稿門檻 3 個 · 爭議中 1 個 · IAA 無法計算',
    reviewerSummaryEn:
      'Task coverage 5 / 5 review units · 3 short of finalize threshold · 1 disputed · IAA Not computable',
  },
  {
    id: 'T017',
    runType: 'official_run',
    runTypeBadge: '正式標記',
    reviewerSummaryZh: '任務覆蓋 4 / 5 個審核單位 · 待審 1 個 · 未達定稿門檻 4 個 · 爭議中 1 個 · IAA 無法計算',
    reviewerSummaryEn:
      'Task coverage 4 / 5 review units · 1 pending · 4 short of finalize threshold · 1 disputed · IAA Not computable',
  },
] as const;

test.describe('Dashboard — review-flow demo tasks (T014-T017)', () => {
  test('reviewer list renders every demo task with matrix-consistent review summaries', async ({ page }) => {
    await openScenario(page, 'reviewer');

    for (const demoTask of DEMO_TASKS) {
      const row = page.locator(
        `#reviewerTaskList [data-example-task-id="${demoTask.id}"]`,
      );
      await expect(row).toBeVisible();
      await expect(row.locator('.list-item-detail')).toContainText(
        demoTask.reviewerSummaryZh,
      );
      await expect(
        row.locator('.task-item-badges .badge').filter({
          hasText: demoTask.runTypeBadge,
        }),
      ).toBeVisible();
    }
  });

  /* Issue #310 regression: T016 has 0 units pending MY review but 3 units
     still unfinalized (1 approved, 1 modified, 1 disputed awaiting
     arbitration), so its summary must never read as a finished task. */
  test('T016 reviewer summary does not present the misleading done state', async ({ page }) => {
    await openScenario(page, 'reviewer');

    const detail = page.locator(
      '#reviewerTaskList [data-example-task-id="T016"] .list-item-detail',
    );
    await expect(detail).toBeVisible();
    await expect(detail).not.toContainText('進度 100%');
    await expect(detail).not.toContainText('待審 0');
  });

  test('demo reviewer summaries switch to the English copy on language toggle', async ({ page }) => {
    await openScenario(page, 'reviewer');
    await page.getByTestId('lang-toggle').click();

    for (const demoTask of DEMO_TASKS) {
      const row = page.locator(
        `#reviewerTaskList [data-example-task-id="${demoTask.id}"]`,
      );
      await expect(row.locator('.list-item-detail')).toContainText(
        demoTask.reviewerSummaryEn,
      );
    }
  });

  test('annotator list renders every demo task with a quick-continue action', async ({ page }) => {
    await openScenario(page, 'annotator');

    for (const demoTask of DEMO_TASKS) {
      const row = page.locator(
        `#annotatorTaskList [data-example-task-id="${demoTask.id}"]`,
      );
      await expect(row).toBeVisible();
      await expect(
        row.getByRole('button', { name: /快速繼續|Continue/ }),
      ).toBeVisible();
    }
  });

  test('clicking the reviewer T014 card routes to annotation-list as dry_run', async ({ page }) => {
    await openScenario(page, 'reviewer');

    const card = page.locator(
      '#reviewerTaskList [data-example-task-id="T014"]',
    );
    await card.click({ position: { x: 80, y: 24 } });

    await expect(page).toHaveURL(/\/pages\/annotation\/annotation-list\.html\?/);
    await expect(page).toHaveURL(/task_id=T014/);
    await expect(page).toHaveURL(/role=reviewer/);
    await expect(page).toHaveURL(/run_type=dry_run/);
    await expect(page).toHaveURL(/reviewer_id=reviewer_chen/);
    await expect(page).not.toHaveURL(/sample_id=/);
  });

  test('clicking the reviewer T017 card routes to annotation-list as official_run', async ({ page }) => {
    await openScenario(page, 'reviewer');

    const card = page.locator(
      '#reviewerTaskList [data-example-task-id="T017"]',
    );
    await card.click({ position: { x: 80, y: 24 } });

    await expect(page).toHaveURL(/\/pages\/annotation\/annotation-list\.html\?/);
    await expect(page).toHaveURL(/task_id=T017/);
    await expect(page).toHaveURL(/role=reviewer/);
    await expect(page).toHaveURL(/run_type=official_run/);
    await expect(page).toHaveURL(/reviewer_id=reviewer_chen/);
    await expect(page).not.toHaveURL(/sample_id=/);
  });

  /* Issue #449: the quick-review action lands on the next unit the
     can_arbitrate reviewer can actually act on, not the task's first dataset
     record -- T014's first record is finalized for every annotator, so the
     first actionable unit is the pending dry-02 x tony0950127 one. The
     per-priority rule itself is pinned by
     dashboard-quick-review-next-actionable.spec.ts. */
  test('reviewer quick-review opens the workspace on the next actionable unit as reviewer_chen', async ({ page }) => {
    await openScenario(page, 'reviewer');

    const row = page.locator('#reviewerTaskList [data-example-task-id="T014"]');
    await row.locator('.role-task-action-btn').click();

    await expect(page).toHaveURL(/\/pages\/annotation\/annotation-workspace\.html\?/);
    await expect(page).toHaveURL(/task_id=T014/);
    await expect(page).toHaveURL(/sample_id=dry-02-one-divergent/);
    await expect(page).toHaveURL(/annotator_id=tony0950127/);
    await expect(page).toHaveURL(/role=reviewer/);
    await expect(page).toHaveURL(/run_type=dry_run/);
    await expect(page).toHaveURL(/reviewer_id=reviewer_chen/);
  });
});
