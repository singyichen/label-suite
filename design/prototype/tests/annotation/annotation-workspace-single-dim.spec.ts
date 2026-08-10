import { test, expect } from '@playwright/test';
import {
  buildWorkspaceUrl,
  dismissGuidelineModal,
  patchDataFile,
  setRangeValue,
  skipGuidelineModal,
} from './_workspace-helpers';

/* single_dim annotator interaction (spec 015 v2.0.0). T004: readability,
 * min=1 max=5 step=1. read-001's gold_score (4) is an 'output'-role field
 * (013 FR-003g-5), so the slider is expected to load pre-seeded at that
 * value -- a valid, already-touched, directly submittable preannotation,
 * not a blank/untouched state. */

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
});

test.describe('single_dim output type', () => {
  test('adjusting the slider reflects the value in the tooltip and number input', async ({ page }) => {
    await page.goto(buildWorkspaceUrl({ task_id: 'T004', sample_id: 'read-001' }));
    await dismissGuidelineModal(page);

    const slider = page.getByTestId('ws-single-dim-slider');
    const value = page.getByTestId('ws-single-dim-value');
    const input = page.getByTestId('ws-single-dim-input');

    await expect(value).toHaveText('4');
    await expect(slider).toHaveAttribute('data-value-set', 'true');
    await setRangeValue(slider, '2');
    await expect(value).toHaveText('2');
    await expect(input).toHaveValue('2');
    await expect(slider).toHaveAttribute('data-value-set', 'true');
  });

  test('value survives switching away to another sample and back', async ({ page }) => {
    // read-002 (sample index 1) also has its own gold_score prefill; strip
    // it at runtime so switching to it exercises the genuine blank/untouched
    // state, isolating this test's real target -- that switching back to
    // read-001 restores the value this test itself set, not read-001's own
    // gold_score prefill.
    await patchDataFile(page, 'task-detail.data.js', `
      window.LabelSuiteTaskDetailData.profiles.T004.datasetRecords[1].gold_score = null;
    `);
    await page.goto(buildWorkspaceUrl({ task_id: 'T004', sample_id: 'read-001' }));
    await dismissGuidelineModal(page);

    const slider = page.getByTestId('ws-single-dim-slider');
    await setRangeValue(slider, '2');

    await page.getByTestId('ws-sample-item').nth(1).click();
    await expect(page.getByTestId('ws-single-dim-value')).toHaveText('—');

    await page.getByTestId('ws-sample-item').nth(0).click();
    await expect(page.getByTestId('ws-single-dim-value')).toHaveText('2');
  });
});
