import { test, expect } from '@playwright/test';
import {
  buildWorkspaceUrl,
  dismissGuidelineModal,
  patchDataFile,
  setRangeValue,
  skipGuidelineModal,
} from './_workspace-helpers';

/* Per-output-type submit blocking (spec 015 line 221 / AC-2A.10): every
 * outputs[] entry must be answered or bypassed before submit; an unanswered
 * type blocks with data-error on its panel. single_label/single_dim/
 * free_text are already pinned by annotation-workspace-common /
 * annotation-workspace-i18n — these specs cover the remaining five types.
 *
 * Each blocked-path test strips the seed's output-role prefill via
 * patchDataFile so the sample is genuinely pending: FR-024M prefill counts
 * as answered by design (annotator-visible preannotation is directly
 * submittable), which the T005 no-patch test asserts explicitly. */

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
});

test.describe('multi_label submit validation (T002)', () => {
  test('unanswered multi_label blocks submit; selecting a node clears the block', async ({ page }) => {
    await patchDataFile(page, 'task-detail.data.js', `
      window.LabelSuiteTaskDetailData.profiles.T002.datasetRecords.forEach(function (r) { r.gold_labels = null; });
    `);
    await page.goto(buildWorkspaceUrl({ task_id: 'T002', sample_id: 'emo-001' }));
    await dismissGuidelineModal(page);

    await page.getByTestId('ws-submit-btn').click();
    await expect(page.getByTestId('ws-output-panel-multi_label')).toHaveAttribute('data-error', 'true');
    await expect(page.getByTestId('ws-sample-item').first()).toHaveAttribute('data-submitted', 'false');

    await page.getByTestId('ws-multi-label-selector-toggle').click();
    await page.getByTestId('ws-multi-label-node-sad').click();
    await page.getByTestId('ws-submit-btn').click();
    await expect(page.getByTestId('ws-sample-item').first()).toHaveAttribute('data-submitted', 'true');
  });
});

test.describe('multi_dim submit validation (T005)', () => {
  test('unanswered multi_dim blocks submit; scoring every dimension clears the block', async ({ page }) => {
    await patchDataFile(page, 'task-detail.data.js', `
      window.LabelSuiteTaskDetailData.profiles.T005.datasetRecords.forEach(function (r) { r.gold_scores = null; });
    `);
    await page.goto(buildWorkspaceUrl({ task_id: 'T005', sample_id: 'mt-001' }));
    await dismissGuidelineModal(page);

    await page.getByTestId('ws-submit-btn').click();
    await expect(page.getByTestId('ws-output-panel-multi_dim')).toHaveAttribute('data-error', 'true');

    await setRangeValue(page.getByTestId('ws-multi-dim-slider-fluency'), '4');
    await setRangeValue(page.getByTestId('ws-multi-dim-slider-adequacy'), '3');
    // A partially scored multi_dim must still block (every dimension needs a value).
    await page.getByTestId('ws-submit-btn').click();
    await expect(page.getByTestId('ws-output-panel-multi_dim')).toHaveAttribute('data-error', 'true');

    await setRangeValue(page.getByTestId('ws-multi-dim-slider-coherence'), '5');
    await page.getByTestId('ws-submit-btn').click();
    await expect(page.getByTestId('ws-sample-item').first()).toHaveAttribute('data-submitted', 'true');
  });

  test('FR-024M output-role prefill counts as answered without touching any slider', async ({ page }) => {
    // T005's gold_scores prefill seeds the sliders (engine-side, DOM-only);
    // the prefilled sample must be directly submittable per FR-024M.
    await page.goto(buildWorkspaceUrl({ task_id: 'T005', sample_id: 'mt-001' }));
    await dismissGuidelineModal(page);

    await page.getByTestId('ws-submit-btn').click();
    await expect(page.getByTestId('ws-sample-item').first()).toHaveAttribute('data-submitted', 'true');
  });
});

test.describe('sequence_tagging submit validation (T006)', () => {
  /* issue #581 / OpenSpec change seq-tagging-span-config group 2 retired the
     token grid, so both the all-O empty state and the ws-seq-token click that
     clears it no longer exist. The span-based equivalent is written by the
     annotation/015 change. */
  test.skip('an all-O token grid blocks submit; tagging a token clears the block', async ({ page }) => {
    await patchDataFile(page, 'task-detail.data.js', `
      window.LabelSuiteTaskDetailData.profiles.T006.datasetRecords.forEach(function (r) { r.pre_tags = null; });
    `);
    await page.goto(buildWorkspaceUrl({ task_id: 'T006', sample_id: 'sequence-tagging-001' }));
    await dismissGuidelineModal(page);

    await page.getByTestId('ws-submit-btn').click();
    await expect(page.getByTestId('ws-output-panel-sequence_tagging')).toHaveAttribute('data-error', 'true');

    await page.getByTestId('ws-seq-tag-btn-PER').click();
    await page.getByTestId('ws-seq-token').nth(6).click();
    await page.getByTestId('ws-submit-btn').click();
    await expect(page.getByTestId('ws-sample-item').first()).toHaveAttribute('data-submitted', 'true');
  });
});

test.describe('entity_recognition submit validation (T007)', () => {
  test('an empty entity list blocks submit; Bypass clears the block', async ({ page }) => {
    await patchDataFile(page, 'task-detail.data.js', `
      window.LabelSuiteTaskDetailData.profiles.T007.datasetRecords.forEach(function (r) { r.gold_entities = null; });
      window.LabelSuiteTaskDetailData.profiles.T007.outputs[0].config.allow_bypass = true;
    `);
    await page.goto(buildWorkspaceUrl({ task_id: 'T007', sample_id: 'entity-recognition-001' }));
    await dismissGuidelineModal(page);

    await page.getByTestId('ws-submit-btn').click();
    await expect(page.getByTestId('ws-output-panel-entity_recognition')).toHaveAttribute('data-error', 'true');

    await page.getByTestId('ws-bypass-entity_recognition').check();
    await page.getByTestId('ws-submit-btn').click();
    await expect(page.getByTestId('ws-sample-item').first()).toHaveAttribute('data-submitted', 'true');
  });
});

test.describe('relation_identification submit validation (T008)', () => {
  test('an empty triple list blocks submit; Bypass clears the block', async ({ page }) => {
    await patchDataFile(page, 'task-detail.data.js', `
      window.LabelSuiteTaskDetailData.profiles.T008.datasetRecords.forEach(function (r) {
        r.triples = null;
        r.relation_types = null;
      });
      window.LabelSuiteTaskDetailData.profiles.T008.outputs[0].config.allow_bypass = true;
    `);
    await page.goto(buildWorkspaceUrl({ task_id: 'T008', sample_id: 'rel-001' }));
    await dismissGuidelineModal(page);

    await page.getByTestId('ws-submit-btn').click();
    await expect(page.getByTestId('ws-output-panel-relation_identification')).toHaveAttribute('data-error', 'true');

    await page.getByTestId('ws-bypass-relation_identification').check();
    await page.getByTestId('ws-submit-btn').click();
    await expect(page.getByTestId('ws-sample-item').first()).toHaveAttribute('data-submitted', 'true');
  });
});
