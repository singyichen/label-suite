/**
 * Issue #885: review-flow task names describe the current single-owner relay.
 * Traceability: specs/dashboard/012-dashboard/spec.md, specs/task-management/
 * 014-task-detail/spec.md, specs/annotation/015-annotation-workspace/spec.md.
 */
import { expect, test, type Locator, type Page } from '@playwright/test';

const TASKS = [
  {
    id: 'T014',
    sourceFile: 'review-flow-dry-run.json',
    zh: '審核流程示範：試標',
    en: 'Review Flow Demo: Dry Run',
    sampleId: 'dry-01-all-agree',
    runType: 'dry_run',
  },
  {
    id: 'T015',
    sourceFile: 'review-flow-official-single.json',
    zh: '審核流程示範：正式標記（基礎審核）',
    en: 'Review Flow Demo: Official Run (Basic Review)',
    sampleId: 'ofs-01-agree-gold',
    runType: 'official_run',
  },
  {
    id: 'T016',
    sourceFile: 'review-flow-official-multi.json',
    zh: '審核流程示範：正式標記（輪派、仲裁與最終例外）',
    en: 'Review Flow Demo: Official Run (Round-Robin Assignment, Arbitration, and Final Exceptions)',
    sampleId: 'ofm-01-reviewer-corrects-b',
    runType: 'official_run',
  },
] as const;

const RETIRED_NAME_WORDING = /多數決|三審核員|單一審核員|majority|quorum|three reviewers?|single reviewers?|\b[123]\s+reviewers?\b/i;

async function expectTaskName(name: Locator, zh: string, en: string, page: Page): Promise<void> {
  await expect(name).toHaveText(zh);
  await expect(name).not.toHaveText(RETIRED_NAME_WORDING);
  await page.getByTestId('lang-toggle').click();
  await expect(name).toHaveText(en);
  await expect(name).not.toHaveText(RETIRED_NAME_WORDING);
}

test('task list keeps demo source files and routes while naming each task in both languages', async ({ page }) => {
  await page.goto('/pages/task-management/task-list.html?task_role=super_admin');
  for (const task of TASKS) {
    const row = page.locator(`#taskTableBody tr[data-source-file="${task.sourceFile}"]`);
    await expect(row).toBeVisible();
    await expect(row.locator('.task-name-cell')).toHaveText(task.zh);
    await expect(row.locator('.task-name-cell')).not.toHaveText(RETIRED_NAME_WORDING);
  }
  await page.getByTestId('lang-toggle').click();
  for (const task of TASKS) {
    const row = page.locator(`#taskTableBody tr[data-source-file="${task.sourceFile}"]`);
    await expect(row.locator('.task-name-cell')).toHaveText(task.en);
    await expect(row.locator('.task-name-cell')).not.toHaveText(RETIRED_NAME_WORDING);
    await row.click();
    await expect(page).toHaveURL(new RegExp(`task_id=${task.id}(?:&|$)`));
    await page.goBack();
  }
});

test('dashboard reviewer cards retain task IDs and show current names in both languages', async ({ page }) => {
  await page.goto('/pages/dashboard/dashboard.html?scenario=reviewer');
  await expect(page.getByTestId('reviewer-view')).toBeVisible();
  for (const task of TASKS) {
    const card = page.locator(`#reviewerTaskList [data-example-task-id="${task.id}"]`);
    await expect(card.locator('.list-item-title')).toHaveText(task.zh);
    await expect(card.locator('.list-item-title')).not.toHaveText(RETIRED_NAME_WORDING);
  }
  await page.getByTestId('lang-toggle').click();
  for (const task of TASKS) {
    const name = page.locator(`#reviewerTaskList [data-example-task-id="${task.id}"] .list-item-title`);
    await expect(name).toHaveText(task.en);
    await expect(name).not.toHaveText(RETIRED_NAME_WORDING);
  }
});

for (const task of TASKS) {
  test(`${task.id} task detail uses the same visible name in zh and en`, async ({ page }) => {
    await page.goto(`/pages/task-management/task-detail.html?task_id=${task.id}`);
    await expectTaskName(page.locator('#bcCurrent'), task.zh, task.en, page);
  });

  test(`${task.id} annotation list and workspace use the same visible name in zh and en`, async ({ page }) => {
    const context = `task_id=${task.id}&role=reviewer&run_type=${task.runType}`;
    await page.goto(`/pages/annotation/annotation-list.html?${context}`);
    await expectTaskName(page.locator('#taskInfoTitle'), task.zh, task.en, page);
    await page.goto(`/pages/annotation/annotation-workspace.html?${context}&sample_id=${task.sampleId}`);
    await expect(page.locator('#entryBreadcrumb')).toContainText(task.en);
    await expect(page.locator('#guidelineSummaryText')).toHaveText(task.en);
    await page.getByTestId('lang-toggle').click();
    await expect(page.locator('#guidelineSummaryText')).toHaveText(task.zh);
    await expect(page.locator('#entryBreadcrumb')).toContainText(task.zh);
    await expect(page.locator('#guidelineSummaryText')).not.toHaveText(RETIRED_NAME_WORDING);
  });

  test(`${task.id} dataset detail uses the same visible name in zh and en`, async ({ page }) => {
    await page.goto(`/pages/dataset/dataset-analysis-detail.html?task_id=${task.id}&tab=quality`);
    await expectTaskName(page.locator('#bcCurrent'), task.zh, task.en, page);
  });
}
