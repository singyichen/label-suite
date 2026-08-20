import { test, expect } from '@playwright/test';
import {
  buildListUrl,
  buildWorkspaceUrl,
  dismissGuidelineModal,
  patchDataFile,
  skipGuidelineModal,
} from './_workspace-helpers';

/* Draft saving (spec 015 AC-2.3 / FR-013 / FR-026): the annotator can save
 * a partial answer as a draft; the sample's status becomes `saved` (not
 * `submitted`), and revisiting the sample restores the saved values. */

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
  // Strip the single_label prefill so the chip click below is unambiguously
  // the annotator's own answer (same rationale as annotation-workspace-common).
  await patchDataFile(page, 'task-detail.data.js', `
    window.LabelSuiteTaskDetailData.profiles.T001.datasetRecords.forEach(function (r) { r.gold_label = null; });
  `);
});

test.describe('Annotator draft save (AC-2.3)', () => {
  test('saving stores a draft without marking the sample submitted', async ({ page }) => {
    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001' }));
    await dismissGuidelineModal(page);

    await page.getByTestId('ws-single-label-chip-positive').click();
    await page.getByTestId('ws-save-btn').click();

    await expect(page.getByTestId('ws-sample-item').first()).toHaveAttribute('data-submitted', 'false');
  });

  test('a saved draft restores after a full page reload (FR-026)', async ({ page }) => {
    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001' }));
    await dismissGuidelineModal(page);

    await page.getByTestId('ws-single-label-chip-positive').click();
    await page.getByTestId('ws-save-btn').click();

    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001' }));
    await dismissGuidelineModal(page);
    await expect(page.getByTestId('ws-single-label-chip-positive')).toHaveAttribute('aria-pressed', 'true');
  });

  test('a saved sample shows the saved status on the annotation list', async ({ page }) => {
    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-002' }));
    await dismissGuidelineModal(page);

    await page.getByTestId('ws-single-label-chip-negative').click();
    await page.getByTestId('ws-save-btn').click();

    await page.goto(buildListUrl({ task_id: 'T001' }));
    const savedRow = page.getByTestId('ws-sample-item').filter({ hasText: 'sent-002' });
    await expect(savedRow.locator('.status-badge')).toHaveText('已儲存');
  });

  test('the save button is not offered in reviewer mode', async ({ page }) => {
    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001', role: 'reviewer' }));
    await dismissGuidelineModal(page);

    await expect(page.getByTestId('ws-save-btn')).toBeHidden();
  });

  /* w6-resilience-a11y.md CONT-01: the reload-restore and list-badge checks
   * above each cover one leg in isolation; the acceptance scenario chains
   * both on the SAME draft so a reload provably neither loses the answer
   * nor promotes the sample to submitted. */
  test('a reloaded draft keeps its answer and its 已儲存 (not 已提交) list state (CONT-01)', async ({ page }) => {
    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001' }));
    await dismissGuidelineModal(page);

    await page.getByTestId('ws-single-label-chip-positive').click();
    await page.getByTestId('ws-save-btn').click();

    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001' }));
    await dismissGuidelineModal(page);
    await expect(page.getByTestId('ws-single-label-chip-positive')).toHaveAttribute('aria-pressed', 'true');
    // The workspace sidebar row (the only list surface carrying
    // data-submitted) must still read false after the reload.
    await expect(page.getByTestId('ws-sample-item').first()).toHaveAttribute('data-submitted', 'false');

    await page.goto(buildListUrl({ task_id: 'T001' }));
    const savedRow = page.getByTestId('ws-sample-item').filter({ hasText: 'sent-001' });
    await expect(savedRow.locator('.status-badge')).toHaveText('已儲存');
  });

  /* w6-resilience-a11y.md CONT-02: leave-and-return (list page, then a
   * DIFFERENT sample, then back) instead of a bare reload -- the detour
   * must neither lose the draft nor write any stray 'submitted' event. */
  test('a draft survives leaving to the list and another sample, with no stray submitted events (CONT-02)', async ({ page }) => {
    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-002' }));
    await dismissGuidelineModal(page);

    await page.getByTestId('ws-single-label-chip-negative').click();
    await page.getByTestId('ws-save-btn').click();

    await page.goto(buildListUrl({ task_id: 'T001' }));
    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-003' }));
    await dismissGuidelineModal(page);
    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-002' }));
    await dismissGuidelineModal(page);

    await expect(page.getByTestId('ws-single-label-chip-negative')).toHaveAttribute('aria-pressed', 'true');

    const submittedActions = await page.evaluate(() => {
      const data = (window as unknown as {
        LabelSuiteAnnotationWorkspaceData: {
          getSampleStatus: (taskId: string, role: string, runType: string, sampleId: string, identity: Record<string, never>) => string;
          getSampleHistory: (taskId: string, runType: string, sampleId: string, identity: Record<string, never>) => Array<{ action: string }>;
        };
      }).LabelSuiteAnnotationWorkspaceData;
      return {
        status: data.getSampleStatus('T001', 'annotator', 'official_run', 'sent-002', {}),
        submitted: ['sent-002', 'sent-003']
          .flatMap((id) => data.getSampleHistory('T001', 'official_run', id, {}))
          .filter((e) => e.action === 'submitted').length,
      };
    });
    expect(submittedActions.status).toBe('saved');
    expect(submittedActions.submitted).toBe(0);
  });
});
