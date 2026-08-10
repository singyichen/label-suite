import { test, expect } from '@playwright/test';
import {
  buildListUrl,
  dismissGuidelineModal,
  patchDataFile,
  skipGuidelineModal,
} from './_workspace-helpers';

/* item_pair input layout (spec 015 v2.0.0, FR-024K / US2B). T011: NLI task,
 * taskInputTypes=['item_pair'], single_label output (entailment / neutral /
 * contradiction). T011's records key their identity as `ID` (uppercase),
 * not the lowercase `id` every other seed profile uses, so this file enters
 * the workspace by clicking through the list (mirroring the real US1 quick
 * continue / row click flow) instead of guessing a sample_id for the URL. */

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
});

test.describe('item_pair input layout — no itemPairLabels configured (T011)', () => {
  test('falls back to raw field names as the dual-column labels', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: 'T011' }));
    await page.getByTestId('ws-sample-item').first().click();
    await dismissGuidelineModal(page);

    await expect(page.getByTestId('ws-item-pair-left-label')).toHaveText('Premise');
    await expect(page.getByTestId('ws-item-pair-right-label')).toHaveText('Hypothesis');
    await expect(page.getByTestId('ws-item-pair-left')).toContainText('運動員可能出現每分鐘小於60跳的心搏過緩');
    await expect(page.getByTestId('ws-item-pair-right')).toContainText('每分鐘30跳以下的心搏過緩在術前可按運動員生理性心搏過緩處理');
  });

  test('single_label answer applies to the pair as a whole and survives switching away and back', async ({ page }) => {
    // The first record's gold Label ('contradiction') is an output-role
    // prefill (013 FR-003g-5); strip it so the click below is unambiguously
    // a toggle-on, not a toggle-off of the pre-seeded value.
    await patchDataFile(page, 'task-detail.data.js', `
      window.LabelSuiteTaskDetailData.profiles.T011.datasetRecords[0].Label = null;
    `);
    await page.goto(buildListUrl({ task_id: 'T011' }));
    await page.getByTestId('ws-sample-item').first().click();
    await dismissGuidelineModal(page);

    await page.getByTestId('ws-single-label-chip-contradiction').click();
    await page.getByTestId('ws-sample-item').nth(1).click();
    await page.getByTestId('ws-sample-item').nth(0).click();
    await expect(page.getByTestId('ws-single-label-chip-contradiction')).toHaveAttribute('aria-pressed', 'true');
  });
});

test.describe('item_pair input layout — itemPairLabels configured', () => {
  test.beforeEach(async ({ page }) => {
    await patchDataFile(page, 'task-detail.data.js', `
      window.LabelSuiteTaskDetailData.profiles.T011.itemPairLabels = ['前提', '假設'];
    `);
  });

  test('uses the task-creator-defined display names instead of raw field names', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: 'T011' }));
    await page.getByTestId('ws-sample-item').first().click();
    await dismissGuidelineModal(page);

    await expect(page.getByTestId('ws-item-pair-left-label')).toHaveText('前提');
    await expect(page.getByTestId('ws-item-pair-right-label')).toHaveText('假設');
  });
});
