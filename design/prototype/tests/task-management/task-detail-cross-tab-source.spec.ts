/*
 * Traceability: openspec/changes/1120-task-lifecycle-alignment/specs/task-management/014-task-detail/spec.md
 *   FR-010u (1)(2)(5)(6)(7), SC-050
 * Also: specs/task-management/014-task-detail/spec.md FR-005h, FR-010p
 *
 * TDD contract for issue #1120 group 1 (tasks.md task 1.1): task-detail's
 * five tabs (TASK_TABS) must derive every cross-tab figure from one shared
 * `task_id x run_type x round` query context instead of falling back to a
 * module-level shared demo fixture.
 *
 * design.md D5 pins the pollution mechanism this file exercises:
 *   - ANNOTATION_PROGRESS_BY_TASK / WORK_LOG_ENTRIES_BY_TASK /
 *     UNASSIGNED_ANNOTATION_ASSIGNMENTS_BY_TASK only carry T014/T015/T016 ->
 *     T013 and T018 fall back to the shared legacy fixture (totalSamples
 *     124, the "Jason Huang" / ASP-041~044 unassigned pool, the 270-count
 *     work log).
 *   - exportHistory (task-detail.html:3532) is never task-keyed at all.
 *   - T013's own dataset has 1 record (task-detail.data.js T013
 *     datasetRecords), T018's own dataset has 5 records (T018
 *     datasetRecords) -- both far below the shared fixture's 124/5-record
 *     scale.
 *
 * design.md D1's cited live evidence further pins T014's cross-tab
 * mismatch: Overview's "已用試標" figure reads TASK_DATA.samplingValue via
 * the getTrialRounds() synthetic-round fallback (task-detail.html:5648,
 * sampleCount: Number(TASK_DATA.samplingValue) || 0) -- a generic default
 * completely disconnected from ANNOTATION_PROGRESS_BY_TASK.T014.rounds[0]
 * (totalSamples: 5, task-detail.html:3667) and from the 5 real dataset
 * records rendered on annotation-results. This is issue #4 item 10's
 * "source must be fixed, not just the display text" bug (FR-010u (1),
 * FR-010p's "必須...與當前回合歷程即時同步").
 */
import fs from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';

const TASK_DETAIL_URL = '/pages/task-management/task-detail.html';
const PANEL_LOAD_TIMEOUT = 15000;

async function waitForBoot(page: Page) {
  await page.locator('#workLogPanel').waitFor({ state: 'attached', timeout: PANEL_LOAD_TIMEOUT });
}

async function openProgressTab(page: Page, taskId: string) {
  await page.goto(`${TASK_DETAIL_URL}?task_id=${taskId}`);
  await waitForBoot(page);
  await page.locator('#tabAnnotationProgress').click();
  await expect(page.locator('#annotationProgressPanel')).not.toHaveClass(/hidden/);
}

async function openResultsTab(page: Page, taskId: string) {
  await page.goto(`${TASK_DETAIL_URL}?task_id=${taskId}`);
  await waitForBoot(page);
  await page.locator('#tabAnnotationResults').click();
  await expect(page.locator('#annotationResultsPanel')).not.toHaveClass(/hidden/);
}

async function openWorkLogTab(page: Page, taskId: string) {
  await page.goto(`${TASK_DETAIL_URL}?task_id=${taskId}`);
  await waitForBoot(page);
  await page.locator('#tabWorkLog').click();
}

/* Extracts the "used / total" pair from Overview's 已用試標 metric
 * (#trialUsedValue, FR-027(2); it replaced the old #roundHistorySummary
 * "已用 X / Y 筆試標" line) -- the surface design.md D1 names as reading a
 * disconnected generic default. */
async function readOverviewUsedTrialCount(page: Page): Promise<number> {
  const text = (await page.locator('#trialUsedValue').textContent()) || '';
  const match = text.match(/^\s*(\d+)\s*\/\s*(\d+)\s*$/);
  if (!match) {
    throw new Error(`readOverviewUsedTrialCount: could not parse "X / Y" out of "${text}"`);
  }
  return Number(match[1]);
}

/* T013's own dataset has 1 record, T018's own dataset has 5 (design.md D5,
 * task-detail.data.js profiles.T013/T018.datasetRecords). Neither task has
 * an entry in ANNOTATION_PROGRESS_BY_TASK / WORK_LOG_ENTRIES_BY_TASK /
 * UNASSIGNED_ANNOTATION_ASSIGNMENTS_BY_TASK today, so every figure below
 * currently comes from the shared legacy fixture instead. */
const POLLUTED_TASKS = [
  { taskId: 'T013', ownRecordCount: 1 },
  { taskId: 'T018', ownRecordCount: 5 },
] as const;

test.describe('Task detail cross-tab derived counts share one query context (FR-010u, issue #1120 group 1)', () => {
  for (const { taskId, ownRecordCount } of POLLUTED_TASKS) {
    test(`${taskId} annotation-progress does not leak the shared demo's literal 124 total`, async ({ page }) => {
      await openProgressTab(page, taskId);
      // Literal cited in design.md D5: task-detail.html:3631
      // (DEFAULT_ANNOTATION_PROGRESS.rounds[1].totalSamples).
      await expect(page.locator('#annotationProgressPanel')).not.toContainText('124');
    });

    test(`${taskId} annotation-progress total/completed counts stay within its own ${ownRecordCount}-record dataset`, async ({ page }) => {
      await openProgressTab(page, taskId);
      const total = Number(await page.locator('#progressMetricTotalValue').textContent());
      const completed = Number(await page.locator('#progressMetricCompletedValue').textContent());
      expect(total, `${taskId} progress total must not exceed its own ${ownRecordCount} dataset records`).toBeLessThanOrEqual(ownRecordCount);
      expect(completed, `${taskId} progress completed must not exceed its own ${ownRecordCount} dataset records`).toBeLessThanOrEqual(ownRecordCount);
    });

    test(`${taskId} annotation-progress unassigned-work queue does not leak another task's assignment rows`, async ({ page }) => {
      await openProgressTab(page, taskId);
      // "Jason Huang" / ASP-041~044 are DEFAULT_UNASSIGNED_ANNOTATION_ASSIGNMENTS'
      // generic "member removed mid-run" backstory (task-detail.html:3705-3728),
      // explicitly NOT seeded for T013/T018's own review-flow demo story.
      const panel = page.locator('#annotationProgressPanel');
      await expect(panel).not.toContainText('Jason Huang');
      await expect(panel).not.toContainText('ASP-041');
    });

    test(`${taskId} work-log tab renders a real empty state instead of the shared demo entries`, async ({ page }) => {
      await openWorkLogTab(page, taskId);
      // DEFAULT_WORK_LOG_ENTRIES (task-detail.html:3738) seeds Alex
      // Wang/Olivia Lin/Mandy Chen entries totalling 270 annotated items --
      // none of which belong to T013/T018's own tiny review-flow dataset.
      await expect(page.locator('#workLogEmptyState')).toBeVisible();
      await expect(page.locator('#workLogTableSection')).toHaveClass(/hidden/);
    });

    test(`${taskId} annotation-results export history renders a real empty state instead of the shared demo rows`, async ({ page }) => {
      await openResultsTab(page, taskId);
      // TASK_DATA.exportHistory (task-detail.html:3532) is a single shared
      // 3-row seed never keyed by taskId (design.md D5): every task shows
      // the exact same 1,240/320/1,560-count "全任務" export rows today.
      await expect(page.locator('#arExportHistoryEmpty')).toBeVisible();
      await expect(page.locator('#arExportHistoryBody').locator('tr')).toHaveCount(0);
    });
  }

  test("T014 overview's used-trial-sample figure matches the round total shown on annotation-progress (FR-010u (1), FR-010p)", async ({ page }) => {
    await page.goto(`${TASK_DETAIL_URL}?task_id=T014`);
    await waitForBoot(page);
    const usedFromOverview = await readOverviewUsedTrialCount(page);

    await page.locator('#tabAnnotationProgress').click();
    await expect(page.locator('#annotationProgressPanel')).not.toHaveClass(/hidden/);
    const totalFromProgress = Number(await page.locator('#progressMetricTotalValue').textContent());

    expect(
      usedFromOverview,
      `Overview reports ${usedFromOverview} samples used in the current trial round, but ` +
        `annotation-progress's own round total is ${totalFromProgress} -- both must derive from ` +
        `the same task_id x run_type x round query context (FR-010u (1)).`,
    ).toBe(totalFromProgress);
  });

  test("T014 overview's used-trial-sample figure matches the trial-stage row count on annotation-results (FR-010u (1), issue §4 item 10)", async ({ page }) => {
    await page.goto(`${TASK_DETAIL_URL}?task_id=T014`);
    await waitForBoot(page);
    const usedFromOverview = await readOverviewUsedTrialCount(page);

    await page.locator('#tabAnnotationResults').click();
    await expect(page.locator('#annotationResultsPanel')).not.toHaveClass(/hidden/);
    const trialStageRowCount = await page
      .locator('#arResultTableBody .ar-stage-cell')
      .filter({ hasText: '試標' })
      .count();

    expect(
      usedFromOverview,
      `Overview reports ${usedFromOverview} samples used in the current trial round, but ` +
        `annotation-results shows ${trialStageRowCount} rows tagged "試標" -- both must derive from ` +
        `the same task_id x run_type x round query context (FR-010u (1)).`,
    ).toBe(trialStageRowCount);
  });

  /* T001 is untouched by group 1's Green work (it is not T013/T014-016/T018
   * and keeps the shared DEFAULT_UNASSIGNED_ANNOTATION_ASSIGNMENTS fixture
   * on purpose), so this exercises FR-010u (2)'s exclusion formula on a
   * stable fixture rather than depending on whatever per-task data group 1
   * seeds for T013/T018. */
  test('FR-005h-excluded assignments are not counted in the 已提交 numerator or denominator (T001)', async ({ page }) => {
    await openProgressTab(page, 'T001');
    const unassignedRow = page.locator('#unassignedAnnotationBody tr').first();
    await expect(unassignedRow).toBeVisible();
    const sampleCellText = (await unassignedRow.locator('td').nth(1).textContent()) || '';
    const match = sampleCellText.match(/(\d+)\s*筆/);
    if (!match) {
      throw new Error(`could not parse the unassigned sample count out of "${sampleCellText}"`);
    }
    const excludedCount = Number(match[1]);

    const totalBefore = Number(await page.locator('#progressMetricTotalValue').textContent());
    const completedBefore = Number(await page.locator('#progressMetricCompletedValue').textContent());

    await page.getByRole('button', { name: '排除' }).first().click();

    const totalAfter = Number(await page.locator('#progressMetricTotalValue').textContent());
    const completedAfter = Number(await page.locator('#progressMetricCompletedValue').textContent());

    expect(completedAfter, 'excluding an unassigned assignment must not change the submitted numerator').toBe(completedBefore);
    expect(
      totalAfter,
      `excluding ${excludedCount} samples must reduce the submitted denominator by exactly that amount`,
    ).toBe(totalBefore - excludedCount);
  });

  test('submitted progress and finalized review progress are two independently labeled metrics (FR-010u (5), T014)', async ({ page }) => {
    await openProgressTab(page, 'T014');
    const submissionWidget = page.locator('[data-testid="annotation-submission-progress"]');
    const reviewWidget = page.locator('[data-testid="review-progress-breakdown"]');
    await expect(submissionWidget).toHaveCount(1);
    await expect(reviewWidget).toHaveCount(1);

    const submissionLabel = await page.locator('#progressMetricRateLabel').textContent();
    const reviewLabel = await page.locator('#reviewProgressBreakdownLabel').textContent();
    expect(submissionLabel).not.toBe(reviewLabel);

    // Neither widget's own value text may quote the other's vocabulary --
    // the two counts (submission assignments vs. finalized review units)
    // must never collapse into one shared metric string.
    await expect(page.locator('#progressMetricRateValue')).not.toContainText('已定稿');
    await expect(reviewWidget).not.toContainText('標記提交');
  });

  test("the sample-pool allocation bar's accessible name carries an explicit 資料分配 (data allocation) meaning, not a completion claim (FR-010u (7))", async ({ page }) => {
    await page.goto(`${TASK_DETAIL_URL}?task_id=T014`);
    await waitForBoot(page);
    const bar = page.locator('#dataSplitBar');
    await expect(bar).toHaveAttribute('role', 'img');
    const ariaLabel = await bar.getAttribute('aria-label');
    expect(ariaLabel || '').toContain('資料分配');

    const title = await page.locator('#executionSplitTitle').textContent();
    expect(title || '', 'the allocation bar heading must not read as a completion claim').not.toContain('完成');
  });

  /* FR-010u (6): "已提交時間 MUST NOT 被呈現為審核完成或仲裁完成時間；各階段
   * 時間 MUST 取自其各自的事件來源。" T001's CLS-001 sample (AR_SAMPLES_
   * CLASSIFICATION, task-detail.html:3951) gives annotator kioleemg12 a
   * submittedAt of '2026-04-25 14:10' and its review a distinct reviewedAt
   * of '2026-04-25 15:02' -- two different event sources, so a reviewed_at
   * that collapses onto submitted_at is observable here. */
  test("annotation-results JSON export's reviewed_at comes from the review's own event, not the annotator's submitted time (FR-010u (6))", async ({ page }) => {
    await openResultsTab(page, 'T001');
    await expect(page.locator('#arTableSection')).toBeVisible({ timeout: PANEL_LOAD_TIMEOUT });

    const downloadPromise = page.waitForEvent('download');
    await page.locator('#arExportJsonBtn').click();
    const download = await downloadPromise;
    const downloadPath = await download.path();
    expect(downloadPath, 'export must produce a downloadable file').not.toBeNull();
    const payload = JSON.parse(await fs.readFile(downloadPath!, 'utf8'));

    const sample = (payload.items as Array<{ sample_id: string; annotations: Array<{ annotator_name: string; submitted_at: string }>; reviews: Array<{ reviewed_at: string | null }> }>).find(
      (item) => item.sample_id === 'CLS-001',
    );
    expect(sample, 'fixture sample CLS-001 must be present in the full export').toBeTruthy();
    const annotationRow = sample!.annotations[0];
    const reviewRow = sample!.reviews[0];
    expect(annotationRow.annotator_name, 'fixture precondition: first annotation must be kioleemg12').toBe('kioleemg12');
    expect(annotationRow.submitted_at, "fixture precondition: kioleemg12's submitted_at must be 14:10").toBe('2026-04-25 14:10');

    expect(
      reviewRow.reviewed_at,
      `review completion time must come from the review's own reviewedAt ('2026-04-25 15:02'), not the ` +
        `annotator's submitted_at ('${annotationRow.submitted_at}') -- FR-010u (6).`,
    ).toBe('2026-04-25 15:02');
  });

  test("the rendered review-completion time on annotation-results comes from the review's own event, not the annotator's submitted time (FR-010u (6))", async ({ page }) => {
    await openResultsTab(page, 'T001');
    await expect(page.locator('#arTableSection')).toBeVisible({ timeout: PANEL_LOAD_TIMEOUT });

    const summaryRow = page.locator('#arResultTableBody .ar-summary-row').filter({ hasText: 'CLS-001' });
    await summaryRow.click();

    const reviewTime = page.locator('.ar-history-review[data-annotator="kioleemg12"] .ar-history-time');
    await expect(
      reviewTime,
      "the rendered review-completion time must read the review's own reviewedAt ('2026-04-25 15:02'), " +
        "not kioleemg12's submitted_at ('2026-04-25 14:10') -- FR-010u (6).",
    ).toHaveText('2026-04-25 15:02');
  });
});
