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
 *     (T014=6, T015=1, T016=0, T017=1 pending review units) using the
 *     review-coverage wording (issue #310): the share of units past 待審 is
 *     labeled 審核覆蓋率, and T016 — whose pending count is 0 while
 *     1 disputed + 2 more units are still unfinalized — must disclose
 *     未定稿 3 · 爭議 1 instead of reading as a completed task.
 *
 * Issue #450: these summaries are no longer the seed's prebuilt display
 * string — computeReviewSummary() derives them from the stored review-unit
 * state, so every non-zero counter (待審 / 未定稿 / 爭議) now appears under
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
    reviewerSummaryZh: '待審 6 筆 · 審核覆蓋率 60% · 未定稿 8 筆 · 爭議 2 筆 · IAA 0.72',
    reviewerSummaryEn: '6 Pending · 60% Review Coverage · 8 Unfinalized · 2 Disputed · IAA 0.72',
  },
  {
    id: 'T015',
    runType: 'official_run',
    runTypeBadge: '正式標記',
    reviewerSummaryZh: '待審 1 筆 · 審核覆蓋率 75% · 未定稿 2 筆 · 爭議 1 筆 · IAA 0.81',
    reviewerSummaryEn: '1 Pending · 75% Review Coverage · 2 Unfinalized · 1 Disputed · IAA 0.81',
  },
  {
    id: 'T016',
    runType: 'official_run',
    runTypeBadge: '正式標記',
    reviewerSummaryZh: '審核覆蓋率 100% · 未定稿 3 筆 · 爭議 1 筆 · IAA 0.68',
    reviewerSummaryEn: '100% Review Coverage · 3 Unfinalized · 1 Disputed · IAA 0.68',
  },
  {
    id: 'T017',
    runType: 'official_run',
    runTypeBadge: '正式標記',
    reviewerSummaryZh: '待審 1 筆 · 審核覆蓋率 80% · 未定稿 4 筆 · 爭議 1 筆 · IAA 0.70',
    reviewerSummaryEn: '1 Pending · 80% Review Coverage · 4 Unfinalized · 1 Disputed · IAA 0.70',
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

  /* The quick-review action must land on each demo task's FIRST dataset
     record as the can_arbitrate reviewer, so the workspace opens on the
     initial reviewer screen (and disputed units render the arbitration
     entry screen instead of hiding it behind the default identity). */
  test('reviewer quick-review opens the workspace on the first record as reviewer_chen', async ({ page }) => {
    await openScenario(page, 'reviewer');

    const row = page.locator('#reviewerTaskList [data-example-task-id="T014"]');
    await row.locator('.role-task-action-btn').click();

    await expect(page).toHaveURL(/\/pages\/annotation\/annotation-workspace\.html\?/);
    await expect(page).toHaveURL(/task_id=T014/);
    await expect(page).toHaveURL(/sample_id=dry-01-all-agree/);
    await expect(page).toHaveURL(/role=reviewer/);
    await expect(page).toHaveURL(/run_type=dry_run/);
    await expect(page).toHaveURL(/reviewer_id=reviewer_chen/);
  });
});
