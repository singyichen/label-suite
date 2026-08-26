import { test, expect } from '@playwright/test';
import { buildListUrl, patchDataFile } from './_workspace-helpers';

/* Task info card progress summary (spec 015 FR-007C/FR-007D): the card must
 * show the same demo work stats as the matching Dashboard assignment row
 * (completion % / today count / avg speed for annotators, pending / progress
 * / IAA for reviewers) followed by the run-scoped list count, and drive the
 * progress bar with the same percentage. Stats come from the shared
 * assignment seeds in dashboard.assignments.js, keyed by exampleTaskId. */

function progressBarWidth(page: import('@playwright/test').Page) {
  return page.locator('#taskInfoProgressBar').evaluate((el) => (el as HTMLElement).style.width);
}

test.describe('Annotation list task info card: progress summary', () => {
  test('annotator official run prefixes the dashboard stats before the list count', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: 'T001', role: 'annotator', run_type: 'official_run' }));

    await expect(page.locator('#taskInfoDetail')).toHaveText(
      '已完成 34% · 今日 21 筆 · 平均速度 3.1 · 共 5 筆資料'
    );
    expect(await progressBarWidth(page)).toBe('34%');
  });

  test('annotator dry run appends the trial round and per-round list count', async ({ page }) => {
    // T004 declares materializedRuns.dry_run = { round: 2, total: 10 }.
    await page.goto(buildListUrl({ task_id: 'T004', role: 'annotator', run_type: 'dry_run' }));

    await expect(page.locator('#taskInfoDetail')).toHaveText(
      '已完成 61% · 今日 29 筆 · 平均速度 2.9 · 試標回合 R2 · 本回合清單 10 筆'
    );
    expect(await progressBarWidth(page)).toBe('61%');
  });

  test('a dry run without a materialized context defaults to round 1 over the seed records', async ({ page }) => {
    // T009 (the medical summary task) ships 3 records and no materializedRuns.
    await page.goto(buildListUrl({ task_id: 'T009', role: 'annotator', run_type: 'dry_run' }));

    await expect(page.locator('#taskInfoDetail')).toHaveText(
      '已完成 37% · 今日 9 筆 · 平均速度 5.4 · 試標回合 R1 · 本回合清單 3 筆'
    );
    expect(await progressBarWidth(page)).toBe('37%');
  });

  test('reviewer stats use the reviewer assignment entry', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: 'T001', role: 'reviewer', run_type: 'official_run' }));

    await expect(page.locator('#taskInfoDetail')).toHaveText(
      '待審 7 個審核單位 · 任務覆蓋率 34% · IAA 0.80 · 共 5 筆資料'
    );
    expect(await progressBarWidth(page)).toBe('34%');
  });

  test('missing assignment seeds fall back to the count-only summary with an empty bar', async ({ page }) => {
    await patchDataFile(page, 'dashboard.assignments.js', `
      window.LabelSuiteAssignmentSeeds = [];
    `);
    await page.goto(buildListUrl({ task_id: 'T001', role: 'annotator', run_type: 'official_run' }));

    await expect(page.locator('#taskInfoDetail')).toHaveText('共 5 筆資料');
    expect(await progressBarWidth(page)).toBe('0%');
  });

  test('switching to English localizes the stats and the count', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: 'T001', role: 'annotator', run_type: 'official_run' }));

    await page.locator('#langToggle').click();
    await expect(page.locator('#taskInfoDetail')).toHaveText(
      '34% Completed · 21 Today · Avg Speed 3.1 · 5 samples total'
    );
  });
});
