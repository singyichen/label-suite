import { test, expect } from '@playwright/test';
import {
  buildWorkspaceUrl,
  dismissGuidelineModal,
  patchDataFile,
  skipGuidelineModal,
} from './_workspace-helpers';

/* multi_label annotator interaction (spec 015 v2.0.0). Both T002 (flat
 * label_options, max_selections=3) and T003 (hierarchical taxonomy,
 * allow_bypass=true configured natively) go through the SAME
 * engine-faithful UI: `renderMultiLabelPreview` (task-config.engine.js
 * ~2522-2660) always renders a trigger + a default-hidden selector dialog
 * (search + tree), regardless of whether label_options is flat or
 * hierarchical — workspace intentionally reuses task-new Step 2's preview
 * rendering, so no flat-only direct-click chip bar exists. testid mapping
 * (host relabels engine testids for the workspace):
 *   ws-multi-label-selector-toggle  <- engine `taxonomy-selector-trigger`
 *   ws-multi-label-node-{label}     <- engine `taxonomy-preview-option`
 *   ws-multi-label-chip-{label}     <- engine `taxonomy-selected-path`
 *                                       (SELECTED-PATH chip, not a
 *                                       standalone clickable toggle) */

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
});

test.describe('multi_label output type — flat options (T002)', () => {
  test('selecting nodes in the selector dialog accumulates selected-path chips, up to max_selections', async ({ page }) => {
    // emo-001's gold_labels (['sad','fear','surprise']) is an output-role
    // prefill already at max_selections=3; strip it so the picks below
    // exercise a genuine from-scratch accumulation instead of toggling the
    // pre-seeded selection off.
    await patchDataFile(page, 'task-detail.data.js', `
      window.LabelSuiteTaskDetailData.profiles.T002.datasetRecords[0].gold_labels = [];
    `);
    await page.goto(buildWorkspaceUrl({ task_id: 'T002', sample_id: 'emo-001' }));
    await dismissGuidelineModal(page);

    await page.getByTestId('ws-multi-label-selector-toggle').click();
    await page.getByTestId('ws-multi-label-node-sad').click();
    await page.getByTestId('ws-multi-label-node-fear').click();
    await expect(page.getByTestId('ws-multi-label-node-sad')).toBeChecked();
    await expect(page.getByTestId('ws-multi-label-node-fear')).toBeChecked();
    await expect(page.getByTestId('ws-multi-label-chip-sad')).toBeVisible();
    await expect(page.getByTestId('ws-multi-label-chip-fear')).toBeVisible();

    await page.getByTestId('ws-multi-label-node-surprise').click();
    // At the limit the engine marks unselected options aria-disabled="true",
    // which Playwright's actionability check honors -- force the click to
    // verify the engine's own handler still no-ops.
    await page.getByTestId('ws-multi-label-node-angry').click({ force: true });
    await expect(page.getByTestId('ws-multi-label-limit-hint')).toBeVisible();
    await expect(page.getByTestId('ws-multi-label-node-angry')).not.toBeChecked();
    await expect(page.getByTestId('ws-multi-label-chip-angry')).toHaveCount(0);
  });

  test('selection survives switching away and back', async ({ page }) => {
    // See the from-scratch note above -- strip the gold_labels prefill so
    // selecting 'sad' below is unambiguously a toggle-on.
    await patchDataFile(page, 'task-detail.data.js', `
      window.LabelSuiteTaskDetailData.profiles.T002.datasetRecords[0].gold_labels = [];
    `);
    await page.goto(buildWorkspaceUrl({ task_id: 'T002', sample_id: 'emo-001' }));
    await dismissGuidelineModal(page);

    await page.getByTestId('ws-multi-label-selector-toggle').click();
    await page.getByTestId('ws-multi-label-node-sad').click();
    await page.getByTestId('ws-sample-item').nth(1).click();
    await page.getByTestId('ws-sample-item').nth(0).click();
    await expect(page.getByTestId('ws-multi-label-chip-sad')).toBeVisible();
  });
});

test.describe('multi_label output type — hierarchical taxonomy (T003)', () => {
  test('selecting a leaf node checks its full ancestor path as chips', async ({ page }) => {
    // taxonomy-001's gold_labels already includes the ['emotion','negative',
    // 'sad'] path as an output-role prefill; strip it so the click below is
    // unambiguously a toggle-on, not a toggle-off of the pre-seeded path.
    await patchDataFile(page, 'task-detail.data.js', `
      window.LabelSuiteTaskDetailData.profiles.T003.datasetRecords[0].gold_labels = [];
    `);
    await page.goto(buildWorkspaceUrl({ task_id: 'T003', sample_id: 'taxonomy-001' }));
    await dismissGuidelineModal(page);

    await page.getByTestId('ws-multi-label-selector-toggle').click();
    await page.getByTestId('ws-multi-label-node-sad').click();
    await expect(page.getByTestId('ws-multi-label-node-sad')).toBeChecked();
    await expect(page.getByTestId('ws-multi-label-chip-sad')).toBeVisible();
  });

  test('bypass checkbox clears and disables the taxonomy selector', async ({ page }) => {
    // See the from-scratch note above -- strip the gold_labels prefill so
    // selecting 'sad' below is unambiguously a toggle-on.
    await patchDataFile(page, 'task-detail.data.js', `
      window.LabelSuiteTaskDetailData.profiles.T003.datasetRecords[0].gold_labels = [];
    `);
    await page.goto(buildWorkspaceUrl({ task_id: 'T003', sample_id: 'taxonomy-001' }));
    await dismissGuidelineModal(page);

    await page.getByTestId('ws-multi-label-selector-toggle').click();
    await page.getByTestId('ws-multi-label-node-sad').click();
    await expect(page.getByTestId('ws-multi-label-chip-sad')).toBeVisible();

    await page.getByTestId('ws-bypass-multi_label').check();
    await expect(page.getByTestId('ws-multi-label-chip-sad')).toHaveCount(0);
    await expect(page.getByTestId('ws-multi-label-selector-toggle')).toBeDisabled();
  });
});
