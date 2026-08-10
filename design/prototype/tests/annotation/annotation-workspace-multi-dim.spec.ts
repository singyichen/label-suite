import { test, expect } from '@playwright/test';
import {
  buildWorkspaceUrl,
  dismissGuidelineModal,
  patchDataFile,
  setRangeValue,
  skipGuidelineModal,
} from './_workspace-helpers';

/* multi_dim annotator interaction (spec 015 v2.0.0). T005: fluency /
 * adequacy / coherence, 5 real records — used for the general interaction
 * and cross-sample-switch coverage. T013: entity_recognition +
 * relation_identification + multi_dim (valence/arousal) — used for the
 * KNOWN, still-unfixed per-sample multi_dim persistence gap tracked in
 * claude-progress.md. T013 only ships one seed record, so this test patches
 * a second in-memory record at runtime via patchDataFile() (no file under
 * pages/ is touched) purely to exercise the switch-away/switch-back path. */

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
});

test.describe('multi_dim output type (T005)', () => {
  test('each dimension has its own independent slider and value', async ({ page }) => {
    await page.goto(buildWorkspaceUrl({ task_id: 'T005', sample_id: 'mt-001' }));
    await dismissGuidelineModal(page);

    const fluencySlider = page.getByTestId('ws-multi-dim-slider-fluency');
    const adequacySlider = page.getByTestId('ws-multi-dim-slider-adequacy');

    await setRangeValue(fluencySlider, '5');
    await setRangeValue(adequacySlider, '3');

    await expect(page.getByTestId('ws-multi-dim-value-fluency')).toHaveText('5');
    await expect(page.getByTestId('ws-multi-dim-value-adequacy')).toHaveText('3');
    await expect(page.getByTestId('ws-multi-dim-value-coherence')).toHaveText('—');
  });

  test('all dimension values survive switching away and back', async ({ page }) => {
    await page.goto(buildWorkspaceUrl({ task_id: 'T005', sample_id: 'mt-001' }));
    await dismissGuidelineModal(page);

    await setRangeValue(page.getByTestId('ws-multi-dim-slider-fluency'), '4');
    await setRangeValue(page.getByTestId('ws-multi-dim-slider-coherence'), '2');

    await page.getByTestId('ws-sample-item').nth(1).click();
    await expect(page.getByTestId('ws-multi-dim-value-fluency')).toHaveText('—');

    await page.getByTestId('ws-sample-item').nth(0).click();
    await expect(page.getByTestId('ws-multi-dim-value-fluency')).toHaveText('4');
    await expect(page.getByTestId('ws-multi-dim-value-coherence')).toHaveText('2');
  });
});

test.describe('T013 composition smoke check (entity_recognition + relation_identification + multi_dim)', () => {
  test('all three output panels render together for the same sample', async ({ page }) => {
    await page.goto(buildWorkspaceUrl({ task_id: 'T013', sample_id: 'absa-001' }));
    await dismissGuidelineModal(page);

    await expect(page.getByTestId('ws-output-panel-entity_recognition')).toBeVisible();
    await expect(page.getByTestId('ws-output-panel-relation_identification')).toBeVisible();
    await expect(page.getByTestId('ws-output-panel-multi_dim')).toBeVisible();
  });
});

test.describe('KNOWN GAP — T013 multi_dim per-sample persistence', () => {
  test.beforeEach(async ({ page }) => {
    // T013 ships a single seed record; append a second one at runtime so this
    // test can exercise "switch away, switch back" without touching the
    // committed fixture file.
    await patchDataFile(page, 'task-detail.data.js', `
      var t013 = window.LabelSuiteTaskDetailData.profiles.T013;
      t013.datasetRecords.push({
        id: 'absa-002',
        utterances: [{ utt_id: 0, speaker: 'demo', text: '這是第二筆測試留言。' }],
        text: '這是第二筆測試留言。',
        gold_triplets: [],
        incomplete_annotations: [],
      });
    `);
  });

  // This test is EXPECTED TO FAIL until the multi_dim per-sample
  // persistence gap noted in claude-progress.md is fixed. It is committed
  // red on purpose (TDD Red for a known, tracked gap).
  test('adjusting a dimension slider, switching sample, and switching back keeps the value', async ({ page }) => {
    await page.goto(buildWorkspaceUrl({ task_id: 'T013', sample_id: 'absa-001' }));
    await dismissGuidelineModal(page);

    await setRangeValue(page.getByTestId('ws-multi-dim-slider-valence'), '7');
    await expect(page.getByTestId('ws-multi-dim-value-valence')).toHaveText('7');

    await page.getByTestId('ws-sample-item').nth(1).click();
    await expect(page.getByTestId('ws-multi-dim-value-valence')).toHaveText('—');

    await page.getByTestId('ws-sample-item').nth(0).click();
    await expect(page.getByTestId('ws-multi-dim-value-valence')).toHaveText('7');
  });
});
