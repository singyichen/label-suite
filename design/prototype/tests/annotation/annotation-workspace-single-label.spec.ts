import { test, expect } from '@playwright/test';
import {
  buildWorkspaceUrl,
  dismissGuidelineModal,
  patchDataFile,
  skipGuidelineModal,
} from './_workspace-helpers';

/* single_label annotator interaction (spec 015 v2.0.0, OUTPUT_TYPE_KEYS).
 * T001: single_label, label_options = positive / neutral / negative. */

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
});

test.describe('single_label output type', () => {
  test('selecting a chip reflects the answer state and enforces single selection', async ({ page }) => {
    // sent-001's gold_label ('positive') is an output-role prefill (013
    // FR-003g-5); strip it so the click below is unambiguously a toggle-on,
    // not a toggle-off of the pre-seeded value.
    await patchDataFile(page, 'task-detail.data.js', `
      window.LabelSuiteTaskDetailData.profiles.T001.datasetRecords[0].gold_label = null;
    `);
    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001' }));
    await dismissGuidelineModal(page);

    const panel = page.getByTestId('ws-output-panel-single_label');
    await expect(panel).toBeVisible();

    await page.getByTestId('ws-single-label-chip-positive').click();
    await expect(page.getByTestId('ws-single-label-chip-positive')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('ws-single-label-chip-negative')).toHaveAttribute('aria-pressed', 'false');

    await page.getByTestId('ws-single-label-chip-negative').click();
    await expect(page.getByTestId('ws-single-label-chip-positive')).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByTestId('ws-single-label-chip-negative')).toHaveAttribute('aria-pressed', 'true');
  });

  test('answer survives switching away to another sample and back', async ({ page }) => {
    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001' }));
    await dismissGuidelineModal(page);

    await page.getByTestId('ws-single-label-chip-negative').click();
    await page.getByTestId('ws-sample-item').nth(2).click();
    await expect(page.getByTestId('ws-single-label-chip-negative')).toHaveAttribute('aria-pressed', 'false');

    await page.getByTestId('ws-sample-item').nth(0).click();
    await expect(page.getByTestId('ws-single-label-chip-negative')).toHaveAttribute('aria-pressed', 'true');
  });
});
