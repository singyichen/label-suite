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
 * per-sample multi_dim persistence regression guard (originally a tracked
 * gap, since closed). T013 only ships one seed record, so this test patches
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
    // coherence is untouched but mt-001 carries a gold_scores output-role
    // prefill (coherence: 5) -- the value label must show that number, not
    // a dash placeholder, matching the number input beside it (FR-024M).
    await expect(page.getByTestId('ws-multi-dim-value-coherence')).toHaveText('5');
  });

  test('value labels show the prefilled numbers on load, matching the number inputs', async ({ page }) => {
    // mt-002's gold_scores prefill is fluency 3 / adequacy 4 / coherence 3.
    // Every dimension's value label must display the same number its slider
    // and number input already show -- never a dash while a value is set.
    await page.goto(buildWorkspaceUrl({ task_id: 'T005', sample_id: 'mt-002' }));
    await dismissGuidelineModal(page);

    await expect(page.getByTestId('ws-multi-dim-value-fluency')).toHaveText('3');
    await expect(page.getByTestId('ws-multi-dim-value-adequacy')).toHaveText('4');
    await expect(page.getByTestId('ws-multi-dim-value-coherence')).toHaveText('3');
    await expect(page.getByTestId('ws-multi-dim-value-input-fluency')).toHaveValue('3');
    await expect(page.getByTestId('ws-multi-dim-value-input-adequacy')).toHaveValue('4');
    await expect(page.getByTestId('ws-multi-dim-value-input-coherence')).toHaveValue('3');
  });

  test('checking bypass shows the unscored placeholder on every value label', async ({ page }) => {
    // Bypass is the one state where the value label may not show a number:
    // the answer is explicitly cleared, so every dimension dashes out.
    await page.goto(buildWorkspaceUrl({ task_id: 'T005', sample_id: 'mt-001' }));
    await dismissGuidelineModal(page);

    await page.getByTestId('ws-bypass-multi_dim').check();

    await expect(page.getByTestId('ws-multi-dim-value-fluency')).toHaveText('—');
    await expect(page.getByTestId('ws-multi-dim-value-adequacy')).toHaveText('—');
    await expect(page.getByTestId('ws-multi-dim-value-coherence')).toHaveText('—');
    await expect(page.getByTestId('ws-multi-dim-slider-fluency')).toBeDisabled();
  });

  test('all dimension values survive switching away and back', async ({ page }) => {
    await page.goto(buildWorkspaceUrl({ task_id: 'T005', sample_id: 'mt-001' }));
    await dismissGuidelineModal(page);

    await setRangeValue(page.getByTestId('ws-multi-dim-slider-fluency'), '4');
    await setRangeValue(page.getByTestId('ws-multi-dim-slider-coherence'), '2');

    // mt-002 has its own gold_scores prefill (fluency 3) -- its value label
    // shows that number while visiting it.
    await page.getByTestId('ws-sample-item').nth(1).click();
    await expect(page.getByTestId('ws-multi-dim-value-fluency')).toHaveText('3');

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

test.describe('T013 multi_dim per-sample persistence', () => {
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

  // Originally committed red for the multi_dim per-sample persistence gap
  // noted in claude-progress.md; that gap has since been closed (ps.dims is
  // persisted/restored per sample) and this now passes as its regression
  // guard.
  test('adjusting a dimension slider, switching sample, and switching back keeps the value', async ({ page }) => {
    await page.goto(buildWorkspaceUrl({ task_id: 'T013', sample_id: 'absa-001' }));
    await dismissGuidelineModal(page);

    await setRangeValue(page.getByTestId('ws-multi-dim-slider-valence'), '7');
    await expect(page.getByTestId('ws-multi-dim-value-valence')).toHaveText('7');

    // absa-002 has no multi_dim output prefill, so the engine seeds the
    // range midpoint (valence 1-9 -> 5) and the value label shows it.
    await page.getByTestId('ws-sample-item').nth(1).click();
    await expect(page.getByTestId('ws-multi-dim-value-valence')).toHaveText('5');

    await page.getByTestId('ws-sample-item').nth(0).click();
    await expect(page.getByTestId('ws-multi-dim-value-valence')).toHaveText('7');
  });
});
