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
 *   - reviewer pending counts match the seeded review-state matrix
 *     (T014=6, T015=1, T016=0, T017=1 pending review units)
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
    reviewerPendingText: '待審 6 筆',
  },
  {
    id: 'T015',
    runType: 'official_run',
    runTypeBadge: '正式標記',
    reviewerPendingText: '待審 1 筆',
  },
  {
    id: 'T016',
    runType: 'official_run',
    runTypeBadge: '正式標記',
    reviewerPendingText: '待審 0 筆',
  },
  {
    id: 'T017',
    runType: 'official_run',
    runTypeBadge: '正式標記',
    reviewerPendingText: '待審 1 筆',
  },
] as const;

test.describe('Dashboard — review-flow demo tasks (T014-T017)', () => {
  test('reviewer list renders every demo task with matrix-consistent pending counts', async ({ page }) => {
    await openScenario(page, 'reviewer');

    for (const demoTask of DEMO_TASKS) {
      const row = page.locator(
        `#reviewerTaskList [data-example-task-id="${demoTask.id}"]`,
      );
      await expect(row).toBeVisible();
      await expect(row.locator('.list-item-detail')).toContainText(
        demoTask.reviewerPendingText,
      );
      await expect(
        row.locator('.task-item-badges .badge').filter({
          hasText: demoTask.runTypeBadge,
        }),
      ).toBeVisible();
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
