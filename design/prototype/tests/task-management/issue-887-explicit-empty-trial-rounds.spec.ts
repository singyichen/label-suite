/*
 * Issue #887 regression contract for task-detail FR-010f-3.
 *
 * Production break caught here: treating an explicitly materialized empty
 * trial-round collection as if the field were absent synthesizes R1, which
 * consumes one sample and makes the task-detail official pool disagree with
 * the five materialized official-run items used by annotation list/workspace.
 * A genuinely legacy task with no explicit empty-round profile keeps the
 * existing fallback so the fix cannot collapse missing and empty together.
 *
 * Issue #1120 (FR-010u (3), acceptance 11): T015/T016 no longer have an empty
 * round collection -- they carry a trial history (datasetTotal 6/7, one
 * sample per round), so the expectations below are the true history-derived
 * values. The five official items are unchanged.
 */
import { expect, test, type Page } from '@playwright/test';
import { buildListUrl, buildWorkspaceUrl, skipGuidelineModal } from '../annotation/_workspace-helpers';

const TASK_DETAIL_URL = '/pages/task-management/task-detail.html';
const PANEL_LOAD_TIMEOUT = 15_000;

const T016_OFFICIAL_IDS = [
  'ofm-01-reviewer-corrects-b',
  'ofm-02-reviewer-accepts-a',
  'ofm-03-awaiting-arbitration',
  'ofm-04-reviewer-bypass',
  'ofm-05-final-exception',
] as const;

async function openTaskDetail(page: Page, taskId: string): Promise<void> {
  await page.goto(`${TASK_DETAIL_URL}?task_id=${taskId}`);
  await expect(page.locator('#statusBadge')).toContainText('正式標記進行中', {
    timeout: PANEL_LOAD_TIMEOUT,
  });
}

/* issue #1120: T015/T016 now carry a trial-round history (T015: R1; T016:
   R1 + R2, one sample each) on top of datasetTotal 6/7, while the official
   run stays the five materialized items. The pool is datasetTotal minus the
   samples the history rounds consumed, so it is still 5. */
const TRIAL_HISTORY_BY_TASK = {
  T015: { rounds: 1, total: 6, currentRound: 'R1' },
  T016: { rounds: 2, total: 7, currentRound: 'R2' },
} as const;

async function expectTrialHistoryWithFiveOfficialItems(
  page: Page,
  taskId: keyof typeof TRIAL_HISTORY_BY_TASK,
): Promise<void> {
  const { rounds, total, currentRound } = TRIAL_HISTORY_BY_TASK[taskId];
  await expect(page.locator('#trialRoundTimeline .round-timeline-item')).toHaveCount(rounds);
  await expect(page.locator('#trialRoundTimeline')).not.toContainText('尚未建立任何試標回合');
  await expect(page.locator('#trialRoundTimeline')).toContainText('R1');

  await expect(page.locator('#trialRoundValue')).toHaveText(currentRound);
  // FR-027(2) drops the 已完成試標回合 metric: every history round is a completed
  // (non-進行中) row of the round table, and 已用試標 reads "used / total" samples.
  await expect(
    page.locator('#trialRoundTimeline .round-timeline-item').filter({ hasNotText: '進行中' }),
  ).toHaveCount(rounds);
  await expect(page.locator('#trialUsedValue')).toHaveText(`${rounds} / ${total}`);
  await expect(page.locator('#officialPoolValue')).toHaveText('5');
  await expect(page.locator('#splitLegendDynamic')).not.toContainText('R1');
  await expect(page.locator('#splitLegendDynamic')).toContainText('正式 5筆');
}

test.describe('Issue #887 / #1120 — official-run fixtures keep the pool and official items consistent', () => {
  for (const taskId of ['T015', 'T016'] as const) {
    test(`${taskId} shows its trial history usage and all five official items`, async ({ page }) => {
      await openTaskDetail(page, taskId);
      await expectTrialHistoryWithFiveOfficialItems(page, taskId);
    });
  }

  test('T016 official pool matches the materialized annotation list and workspace IDs', async ({
    page,
  }) => {
    await page.goto(buildListUrl({ task_id: 'T016', run_type: 'official_run' }));

    const listRows = page.getByTestId('ws-sample-item');
    await expect(listRows).toHaveCount(5);
    await expect(listRows.locator('td:first-child')).toHaveText([...T016_OFFICIAL_IDS]);

    await skipGuidelineModal(page);
    await page.goto(
      buildWorkspaceUrl({
        task_id: 'T016',
        sample_id: T016_OFFICIAL_IDS[0],
        run_type: 'official_run',
      }),
    );

    await expect(page.locator('#sampleListCount')).toHaveText('5 筆');
    const workspaceItems = page.getByTestId('ws-sample-item');
    await expect(workspaceItems).toHaveCount(5);
    const workspaceIds = await workspaceItems.evaluateAll((items) =>
      items.map((item) => item.getAttribute('data-sample-id')),
    );
    expect(workspaceIds).toEqual([...T016_OFFICIAL_IDS]);

    await openTaskDetail(page, 'T016');
    await expect(page.locator('#officialPoolValue')).toHaveText('5');
  });

  test('language toggle preserves the trial-history and five-item official-pool values', async ({
    page,
  }) => {
    await openTaskDetail(page, 'T016');
    await page.locator('#langToggle').click();

    await expect(page.locator('#trialRoundLabel')).toHaveText('Current round');
    await expect(page.locator('#trialUsedLabel')).toHaveText('Trial used');
    await expect(page.locator('#officialPoolLabel')).toHaveText('Official pool');
    await expect(page.locator('#trialRoundValue')).toHaveText('R2');
    // FR-027(2): no 已完成試標回合 metric; both history rounds stay completed rows.
    await expect(
      page.locator('#trialRoundTimeline .round-timeline-item').filter({ hasNotText: 'In progress' }),
    ).toHaveCount(2);
    await expect(page.locator('#trialUsedValue')).toHaveText('2 / 7');
    await expect(page.locator('#officialPoolValue')).toHaveText('5');
    await expect(page.locator('#trialRoundTimeline .round-timeline-item')).toHaveCount(2);
  });

  test('legacy T001 without an explicit empty-round profile retains the R1 fallback', async ({
    page,
  }) => {
    await page.goto(`${TASK_DETAIL_URL}?task_id=T001&status=official_run_in_progress`);
    await expect(page.locator('#statusBadge')).toContainText('正式標記進行中', {
      timeout: PANEL_LOAD_TIMEOUT,
    });

    await expect(page.locator('#trialRoundTimeline .round-timeline-item')).toHaveCount(1);
    await expect(page.locator('#trialRoundTimeline .round-timeline-item')).toContainText('R1');
    await expect(page.locator('#trialRoundValue')).toHaveText('R1');
    // FR-027(2): no 已完成試標回合 metric. The fallback R1 is the single round-table row and
    // 已用試標 reads its one sample out of the five-item dataset.
    await expect(page.locator('#trialUsedValue')).toHaveText('1 / 5');
    await expect(page.locator('#officialPoolValue')).toHaveText('4');
  });
});
