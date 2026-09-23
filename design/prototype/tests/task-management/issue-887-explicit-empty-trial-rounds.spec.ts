/*
 * Issue #887 regression contract for task-detail FR-010f-3.
 *
 * Production break caught here: treating an explicitly materialized empty
 * trial-round collection as if the field were absent synthesizes R1, which
 * consumes one sample and makes the task-detail official pool disagree with
 * the five materialized official-run items used by annotation list/workspace.
 * A genuinely legacy task with no explicit empty-round profile keeps the
 * existing fallback so the fix cannot collapse missing and empty together.
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

async function expectAuthoritativeEmptyTrialRounds(page: Page): Promise<void> {
  await expect(page.locator('#trialRoundTimeline .round-timeline-item')).toHaveCount(0);
  await expect(page.locator('#trialRoundTimeline')).toContainText('尚未建立任何試標回合');
  await expect(page.locator('#trialRoundTimeline')).not.toContainText('R1');

  await expect(page.locator('#trialRoundValue')).toHaveText('-');
  await expect(page.locator('#trialRoundsUsedValue')).toHaveText('0');
  await expect(page.locator('#roundHistorySummary')).toHaveText('已用 0 / 5 筆試標');
  await expect(page.locator('#officialPoolValue')).toHaveText('5');
  await expect(page.locator('#splitLegendDynamic')).not.toContainText('R1');
  await expect(page.locator('#splitLegendDynamic')).toContainText('正式 5筆');
}

test.describe('Issue #887 — explicit empty trial rounds are authoritative', () => {
  for (const taskId of ['T015', 'T016']) {
    test(`${taskId} shows zero trial usage and all five official items`, async ({ page }) => {
      await openTaskDetail(page, taskId);
      await expectAuthoritativeEmptyTrialRounds(page);
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

  test('language toggle preserves the zero-trial and five-item official-pool values', async ({
    page,
  }) => {
    await openTaskDetail(page, 'T016');
    await page.locator('#langToggle').click();

    await expect(page.locator('#trialRoundLabel')).toHaveText('Trial round');
    await expect(page.locator('#trialRoundsUsedLabel')).toHaveText('Trial rounds used');
    await expect(page.locator('#officialPoolLabel')).toHaveText('Official pool');
    await expect(page.locator('#trialRoundValue')).toHaveText('-');
    await expect(page.locator('#trialRoundsUsedValue')).toHaveText('0');
    await expect(page.locator('#roundHistorySummary')).toHaveText('0 / 5 items used in trial');
    await expect(page.locator('#officialPoolValue')).toHaveText('5');
    await expect(page.locator('#trialRoundTimeline .round-timeline-item')).toHaveCount(0);
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
    await expect(page.locator('#trialRoundsUsedValue')).toHaveText('1');
    await expect(page.locator('#roundHistorySummary')).toHaveText('已用 1 / 5 筆試標');
    await expect(page.locator('#officialPoolValue')).toHaveText('4');
  });
});
