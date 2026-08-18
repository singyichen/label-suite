import { test, expect } from '@playwright/test';
import { buildListUrl } from './_workspace-helpers';

/* Annotation list routing (spec 015 v2.0.0). Rewritten against the
 * outputs[]-model 4-param URL contract and the 13 illustrative T001-T013
 * seed TaskProfiles, replacing the old TASK-015-A# / task_type / sub_type
 * mock fixtures that no longer exist under this model. Scope intentionally
 * narrowed to what is still relevant post-migration: task info sourced
 * from TaskProfile, and "quick continue" building the new 4-param workspace
 * URL. The old per-task_type badge-color matrix and sub_type route-context
 * carrying tests are dropped — task_type/sub_type no longer exist as route
 * params (see spec 015 v2.0.0 Changelog, breaking change). */

test.describe('Annotation list routing', () => {
  test('loads from the 3-param list URL contract and resolves the task via task_id', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: 'T001', role: 'annotator', run_type: 'official_run' }));
    await expect(page.getByTestId('annotation-list-shell')).toBeVisible();
    await expect(page).not.toHaveURL(/task_type=/);
    await expect(page).not.toHaveURL(/sub_type=/);
  });

  test('task info card shows title and description sourced from the TaskProfile', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: 'T001' }));
    await expect(page.getByTestId('annotation-list-shell')).toBeVisible();

    const taskInfoCard = page.getByTestId('list-task-info-card');
    await expect(taskInfoCard).toBeVisible();
    await expect(taskInfoCard).toContainText('醫療文本情感分類');
  });

  test('sample list count matches datasetRecords for the resolved task', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: 'T006' }));
    await expect(page.getByTestId('annotation-list-shell')).toBeVisible();

    // T006 (sequence_tagging) ships 4 seed records.
    await expect(page.getByTestId('ws-sample-item')).toHaveCount(4);
  });

  test('quick continue opens the latest unfinished sample in the workspace using the 4-param contract', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: 'T001', role: 'annotator', run_type: 'official_run' }));
    await expect(page.getByTestId('annotation-list-shell')).toBeVisible();

    await page.getByTestId('list-quick-continue-btn').click();
    await expect(page).toHaveURL(/\/pages\/annotation\/annotation-workspace\.html\?/);
    await expect(page).toHaveURL(/task_id=T001/);
    // FR-004B: with no progress every record is pending, so the LAST record wins.
    await expect(page).toHaveURL(/sample_id=sent-005/);
    await expect(page).toHaveURL(/role=annotator/);
    await expect(page).toHaveURL(/run_type=official_run/);
    await expect(page).not.toHaveURL(/task_type=/);
    await expect(page).not.toHaveURL(/sub_type=/);
  });

  test('an invalid task_id shows an error state instead of an empty list', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: 'T999-DOES-NOT-EXIST' }));
    await expect(page.getByTestId('list-task-not-found')).toBeVisible();
  });
});

/* Issue #154: the not-found state used to be a dead end — text only, no
 * clickable exit — and a missing task_id rendered a blank interpolation
 * (「任務代碼  不存在」). */
test.describe('Annotation list not-found exit (issue #154)', () => {
  test('missing task_id says no task was specified instead of a blank task code', async ({ page }) => {
    await page.goto('/pages/annotation/annotation-list.html?role=reviewer&run_type=dry_run');
    const notFound = page.getByTestId('list-task-not-found');
    await expect(notFound).toBeVisible();
    await expect(notFound).toContainText('未指定任務');
    await expect(notFound).not.toContainText('任務代碼');
  });

  test('missing task_id error state links back to the dashboard', async ({ page }) => {
    await page.goto('/pages/annotation/annotation-list.html?role=reviewer&run_type=dry_run');
    const backLink = page.getByTestId('list-not-found-dashboard-link');
    await expect(backLink).toBeVisible();
    await backLink.click();
    await expect(page).toHaveURL(/\/pages\/dashboard\/dashboard\.html/);
  });

  test('invalid task_id error state keeps the task code message and also links back to the dashboard', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: 'T999-DOES-NOT-EXIST' }));
    const notFound = page.getByTestId('list-task-not-found');
    await expect(notFound).toContainText('任務代碼 T999-DOES-NOT-EXIST 不存在');
    await expect(notFound.getByTestId('list-not-found-dashboard-link')).toBeVisible();
  });
});
