import { test, expect } from '@playwright/test';
import {
  buildWorkspaceUrl,
  dismissGuidelineModal,
  patchDataFile,
  skipGuidelineModal,
} from './_workspace-helpers';

/* Common workspace-shell coverage that applies regardless of outputs[]
 * composition (spec 015 v2.0.0 AC-1.x / AC-2.x / FR-001..FR-010). Uses T001
 * (single_label, 5 records) as its primary fixture since it is the
 * simplest legal TaskProfile. */

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
});

test.describe('Annotation workspace common contract', () => {
  test('loads from the 4-param URL contract and resolves the task via task_id', async ({ page }) => {
    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001', role: 'annotator', run_type: 'official_run' }));
    await dismissGuidelineModal(page);

    await expect(page.getByTestId('ws-root')).toBeVisible();
    // Old task_type / sub_type params must play no role in resolution.
    await expect(page).not.toHaveURL(/task_type=/);
    await expect(page).not.toHaveURL(/sub_type=/);
  });

  test('the middle column renders no task-title card; the task name comes from the TaskProfile via the guideline panel', async ({ page }) => {
    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001' }));
    await dismissGuidelineModal(page);

    // Spec 015 v2.2.0: the task-title header card (task name + in-card
    // language toggle) was removed for both annotator and reviewer views.
    await expect(page.getByTestId('ws-card-title')).toHaveCount(0);
    await expect(page.getByTestId('ws-lang-toggle')).toHaveCount(0);
    await expect(page.getByTestId('ws-guideline-panel')).toContainText('醫療文本情感分類');
  });

  test('sample list count and content are sourced from datasetRecords', async ({ page }) => {
    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001' }));
    await dismissGuidelineModal(page);

    const items = page.getByTestId('ws-sample-item');
    await expect(items).toHaveCount(5);
    await expect(items.first()).toContainText('這次手術非常成功');
    await expect(page.getByTestId('ws-input-content')).toContainText('這次手術非常成功，主治醫師技術精湛');
  });

  test('switching samples preserves already-answered state', async ({ page }) => {
    // sent-001's own gold_label ('positive') is an output-role prefill
    // (013 FR-003g-5) -- strip it so clicking the same chip below is
    // unambiguously the annotator's own toggle-on, not a toggle-off of the
    // pre-seeded value.
    await patchDataFile(page, 'task-detail.data.js', `
      window.LabelSuiteTaskDetailData.profiles.T001.datasetRecords[0].gold_label = null;
    `);
    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001' }));
    await dismissGuidelineModal(page);

    await page.getByTestId('ws-single-label-chip-positive').click();
    await expect(page.getByTestId('ws-single-label-chip-positive')).toHaveAttribute('aria-pressed', 'true');

    await page.getByTestId('ws-sample-item').nth(1).click();
    await expect(page.getByTestId('ws-input-content')).toContainText('候診時間太長了');

    await page.getByTestId('ws-sample-item').nth(0).click();
    await expect(page.getByTestId('ws-input-content')).toContainText('這次手術非常成功');
    await expect(page.getByTestId('ws-single-label-chip-positive')).toHaveAttribute('aria-pressed', 'true');
  });

  test('an invalid task_id redirects to the annotation list instead of loading a blank workspace', async ({ page }) => {
    await page.goto(buildWorkspaceUrl({ task_id: 'T999-DOES-NOT-EXIST', sample_id: 'sent-001' }));
    await expect(page).toHaveURL(/\/pages\/annotation\/annotation-list\.html/);
  });

  test('submitting a fully answered sample records it as submitted', async ({ page }) => {
    // See the toggle-off note above -- strip the gold_label prefill so the
    // click below is unambiguously the act of answering the sample.
    await patchDataFile(page, 'task-detail.data.js', `
      window.LabelSuiteTaskDetailData.profiles.T001.datasetRecords[0].gold_label = null;
    `);
    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001' }));
    await dismissGuidelineModal(page);

    await page.getByTestId('ws-single-label-chip-positive').click();
    await page.getByTestId('ws-submit-btn').click();

    await expect(page.getByTestId('ws-sample-item').first()).toHaveAttribute('data-submitted', 'true');
  });

  test('submitting without answering every output type is blocked', async ({ page }) => {
    // gold_label's output-role prefill (013 FR-003g-5) would otherwise make
    // this sample already-answered on load; strip it so submit is genuinely
    // exercised against a blank/unanswered output type.
    await patchDataFile(page, 'task-detail.data.js', `
      window.LabelSuiteTaskDetailData.profiles.T001.datasetRecords[0].gold_label = null;
    `);
    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001' }));
    await dismissGuidelineModal(page);

    await page.getByTestId('ws-submit-btn').click();
    await expect(page.getByTestId('ws-output-panel-single_label')).toHaveAttribute('data-error', 'true');
  });
});
