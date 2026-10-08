/*
 * Traceability: specs/task-management/014-task-detail/spec.md
 *   FR-010u (3) -- "已完成輪次" excludes the in-progress round; history rounds
 *   and the current round are listed separately and never cross-accumulate.
 *   FR-010f-3 / FR-010o-4 -- pool = datasetTotal - sum(trial usedSamples);
 *   IAA-computation-pending is a T018 + retry state, never a history round.
 *   Issue #1120 acceptance 11 (official cases carry a verifiable trial
 *   history) and 12 (historical R1/R2 viewable apart from the in-progress
 *   official run, counts and decisions not crossing). OpenSpec change
 *   `1120-task-lifecycle-alignment`, tasks 5.1 (Red) / 5.6 / 5.7 (Green).
 *
 * Fixture contract for Green (design.md D5, maintainer rulings 2026-10-05):
 *   T015 -- one history round R1 (1 sample, IAA 0.62 < 0.80, failed), profile
 *           datasetTotal 6; official run 4/5 submitted.
 *   T016 -- history R1 failed + R2 passed (1 sample each), profile
 *           datasetTotal 7; official run 5/5 submitted.
 *   docs/product/example-data stays at 5 rows and datasetRecords stay 5, so
 *   the official list / workspace still show 5 items.
 *   T014 -- dry_run_in_progress with only the active R1, no R2.
 * Scope expansion (i): the active round is never a completed round (FR-027(2) removed
 *   #trialRoundsUsedValue; completed = round-table rows that are not 進行中).
 * Scope expansion (ii): getDefaultProgressStage() lands on `official` while
 *   the official run is in progress.
 *
 * Deliberately NOT asserted: trial-pill IAA on the progress tab (it comes
 * from workspace dry_run seeds, out of budget) and T014's review-unit
 * pending count (two contradictory sources, owned by group 4).
 */
import { expect, test, type Locator, type Page } from '@playwright/test';
import { buildListUrl } from '../annotation/_workspace-helpers';

const TASK_DETAIL_URL = '/pages/task-management/task-detail.html';
const PANEL_LOAD_TIMEOUT = 15_000;

async function openOverview(page: Page, taskId: string): Promise<void> {
  await page.goto(`${TASK_DETAIL_URL}?task_id=${taskId}`);
  await expect(page.locator('#statusBadge')).toContainText('進行中', {
    timeout: PANEL_LOAD_TIMEOUT,
  });
}

async function openProgress(page: Page, taskId: string, apStage?: string): Promise<void> {
  const stageQuery = apStage ? `&ap_stage=${apStage}` : '';
  await page.goto(`${TASK_DETAIL_URL}?task_id=${taskId}&tab=annotation-progress${stageQuery}`);
  await expect(page.locator('#progressRoundPills')).toBeVisible({ timeout: PANEL_LOAD_TIMEOUT });
}

const timelineItems = (page: Page) => page.locator('#trialRoundTimeline .round-timeline-item');
const completedRows = (page: Page, inProgressText = '進行中') =>
  timelineItems(page).filter({ hasNotText: inProgressText });
// FR-027(4): round-table columns 回合／筆數／標記者／IAA／Std／結果／完成時間.
const cell = (row: Locator, index: number) => row.locator('td').nth(index);
const pills = (page: Page) => page.locator('#progressRoundPills .stage-btn');

test.describe('Issue #1120 -- official-run tasks carry a verifiable trial history', () => {
  test('T015 shows one failed history round R1 below the reference IAA (acceptance 11)', async ({
    page,
  }) => {
    await openOverview(page, 'T015');

    await expect(timelineItems(page)).toHaveCount(1);
    await expect(timelineItems(page).first()).toContainText('R1');
    // 筆數 / IAA / 結果 columns replace the old "1 筆樣本" / "IAA 0.62" chips.
    await expect(cell(timelineItems(page).first(), 1)).toHaveText('1');
    await expect(cell(timelineItems(page).first(), 3)).toHaveText('0.62');
    await expect(cell(timelineItems(page).first(), 5)).toHaveText('未通過');

    await expect(completedRows(page)).toHaveCount(1);
    await expect(page.locator('#trialUsedValue')).toHaveText('1 / 6');
    await expect(page.locator('#officialPoolValue')).toHaveText('5');
    await expect(page.locator('#splitLegendDynamic')).toContainText('正式 5筆');
    await expect(page.locator('#valueSamplingValueControl')).toHaveText('每回合 1 筆');
  });

  test('T016 shows a failed R1 and a passed R2 as completed history (acceptance 11)', async ({
    page,
  }) => {
    await openOverview(page, 'T016');

    await expect(timelineItems(page)).toHaveCount(2);
    await expect(timelineItems(page).nth(0)).toContainText('R1');
    await expect(cell(timelineItems(page).nth(0), 5)).toHaveText('未通過');
    await expect(cell(timelineItems(page).nth(0), 1)).toHaveText('1');
    await expect(timelineItems(page).nth(1)).toContainText('R2');
    await expect(cell(timelineItems(page).nth(1), 5)).toHaveText('已通過');
    await expect(cell(timelineItems(page).nth(1), 1)).toHaveText('1');

    await expect(completedRows(page)).toHaveCount(2);
    await expect(page.locator('#trialUsedValue')).toHaveText('2 / 7');
    await expect(page.locator('#officialPoolValue')).toHaveText('5');
    await expect(page.locator('#splitLegendDynamic')).toContainText('正式 5筆');
    await expect(page.locator('#valueSamplingValueControl')).toHaveText('每回合 1 筆');
  });

  test('English UI keeps the history-derived trial usage and pool values', async ({ page }) => {
    await openOverview(page, 'T016');
    await page.locator('#langToggle').click();

    await expect(page.locator('#trialUsedValue')).toHaveText('2 / 7');
    await expect(completedRows(page, 'In progress')).toHaveCount(2);
    await expect(page.locator('#officialPoolValue')).toHaveText('5');
    await expect(timelineItems(page)).toHaveCount(2);
  });

  test('history rounds do not change the official run items or progress (acceptance 12)', async ({
    page,
  }) => {
    for (const taskId of ['T015', 'T016']) {
      await page.goto(buildListUrl({ task_id: taskId, run_type: 'official_run' }));
      await expect(page.getByTestId('ws-sample-item')).toHaveCount(5);
    }

    await openProgress(page, 'T015', 'official');
    await expect(page.locator('#progressMetricTotalValue')).toHaveText('5');
    await expect(page.locator('#progressMetricCompletedValue')).toHaveText('4');

    await openProgress(page, 'T016', 'official');
    await expect(page.locator('#progressMetricTotalValue')).toHaveText('5');
    await expect(page.locator('#progressMetricCompletedValue')).toHaveText('5');
  });
});

test.describe('Issue #1120 -- history rounds and the official run are viewable separately (acceptance 12)', () => {
  test('T015 offers an R1 stage and an official stage with non-crossing counts', async ({
    page,
  }) => {
    await openProgress(page, 'T015', 'official');

    await expect(pills(page)).toHaveCount(2);
    await expect(pills(page).nth(0)).toHaveText(/^R1/);

    await pills(page).nth(0).click();
    await expect(pills(page).nth(0)).toHaveClass(/active/);
    await expect(page.locator('#progressMetricTotalValue')).toHaveText('1');
    await expect(page.locator('#progressMetricCompletedValue')).toHaveText('1');

    await pills(page).nth(1).click();
    await expect(pills(page).nth(1)).toHaveClass(/active/);
    await expect(page.locator('#progressMetricTotalValue')).toHaveText('5');
    await expect(page.locator('#progressMetricCompletedValue')).toHaveText('4');
  });

  test('T016 offers R1, R2 and official stages, each with its own completion', async ({
    page,
  }) => {
    await openProgress(page, 'T016', 'official');

    await expect(pills(page)).toHaveCount(3);
    await expect(pills(page).nth(0)).toHaveText(/^R1/);
    await expect(pills(page).nth(1)).toHaveText(/^R2/);

    for (const index of [0, 1]) {
      await pills(page).nth(index).click();
      await expect(pills(page).nth(index)).toHaveClass(/active/);
      await expect(page.locator('#progressMetricTotalValue')).toHaveText('1');
      await expect(page.locator('#progressMetricCompletedValue')).toHaveText('1');
    }

    await pills(page).nth(2).click();
    await expect(page.locator('#progressMetricTotalValue')).toHaveText('5');
    await expect(page.locator('#progressMetricCompletedValue')).toHaveText('5');
  });

  test('an explicit ap_stage=r1 still opens the history round, not the official stage', async ({
    page,
  }) => {
    await openProgress(page, 'T015', 'r1');

    await expect(pills(page)).toHaveCount(2);
    await expect(pills(page).nth(0)).toHaveClass(/active/);
    await expect(page.locator('#progressMetricTotalValue')).toHaveText('1');
  });

  for (const taskId of ['T015', 'T016']) {
    test(`${taskId} opens the progress tab on the official stage by default (expansion ii)`, async ({
      page,
    }) => {
      await openProgress(page, taskId);

      // History pills must exist; otherwise "official by default" is vacuous.
      expect(await pills(page).count()).toBeGreaterThanOrEqual(2);
      await expect(pills(page).last()).toHaveClass(/active/);
      await expect(pills(page).first()).not.toHaveClass(/active/);
      await expect(page.locator('#progressMetricTotalValue')).toHaveText('5');
    });
  }
});

test.describe('Issue #1120 -- trial-rounds-used excludes the in-progress round (FR-010u (3))', () => {
  test('T014 (dry_run_in_progress, active R1 only) counts zero completed rounds', async ({
    page,
  }) => {
    await page.goto(`${TASK_DETAIL_URL}?task_id=T014`);
    await expect(page.locator('#trialRoundTimeline')).toBeVisible({ timeout: PANEL_LOAD_TIMEOUT });

    await expect(timelineItems(page)).toHaveCount(1);
    await expect(timelineItems(page).first()).toContainText('R1');
    // FR-027(2): no 已完成試標回合 metric. The "R1 is still active" fact is carried by the
    // task status plus 目前回合 = R1 (the seeded R1 row keeps its scripted result, as before).
    await expect(page.locator('#statusBadge')).toContainText('試標進行中');
    await expect(page.locator('#trialRoundValue')).toHaveText('R1');
    await expect(page.locator('#officialPoolValue')).toHaveText('0');
  });

  test('T014 has no R2 history to view next to its active R1', async ({ page }) => {
    await openProgress(page, 'T014');

    await expect(pills(page)).toHaveCount(2);
    await expect(pills(page).nth(0)).toHaveText(/^R1/);
    await expect(pills(page).nth(0)).toHaveClass(/active/);
  });
});

test.describe('Issue #1120 -- IAA computation pending is a T018 retry state, not a history round (acceptance 11)', () => {
  test('retrying T018 shows IAA computing and blocks both publish actions', async ({ page }) => {
    await page.goto(`${TASK_DETAIL_URL}?task_id=T018`);
    await expect(page.locator('#retryIaaComputationBtn')).toBeVisible({
      timeout: PANEL_LOAD_TIMEOUT,
    });
    await page.locator('#retryIaaComputationBtn').click();

    await expect(page.locator('#trialDecisionTitle')).toContainText('計算中');
    await expect(page.locator('#publishOfficialRunBtn')).toBeDisabled();
    await expect(page.locator('#publishDryRunBtn')).toBeDisabled();
    await expect(page.locator('#publishActionRow')).toContainText('IAA 計算中');
  });

  for (const taskId of ['T015', 'T016']) {
    test(`${taskId} history rounds are finished results, never IAA-computing`, async ({
      page,
    }) => {
      await openOverview(page, taskId);

      await expect(timelineItems(page).first()).toBeVisible();
      await expect(page.locator('#trialRoundTimeline')).not.toContainText('計算中');
      await expect(page.locator('#trialDecisionTitle')).not.toContainText('計算中');
      await expect(page.locator('#retryIaaComputationBtn')).toHaveCount(0);
    });
  }
});
