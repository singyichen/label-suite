import { test, expect } from '@playwright/test';
import {
  buildWorkspaceUrl,
  dismissGuidelineModal,
  patchDataFile,
  selectWorkspaceText,
  skipGuidelineModal,
} from './_workspace-helpers';

/* relation_identification annotator interaction, pure/standalone mode — no
 * entity_recognition composed alongside it, so entity spans are read-only
 * reference material (T008's `entities` field is mapped 'evidence', not
 * editable). The builder is the engine's sequential state machine (passage
 * selection → E1/Arg1 → Relation → E2/Arg2 → 新增), the same control
 * task-new Step 2 and task-detail 標記設定 render — the workspace must not
 * swap in a different builder UI. See
 * annotation-workspace-entity-relation-integration.spec.ts for the
 * integrated mode (relation_identification depends on entity_recognition,
 * OUTPUT_TYPE_DEPENDENCIES). */

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
});

/* rel-001's own "triples" field is an output-role prefill (013 FR-003g-5);
 * strip it so triples added by a test are unambiguously its own. */
async function stripTriplePrefill(page: import('@playwright/test').Page) {
  await patchDataFile(page, 'task-detail.data.js', `
    window.LabelSuiteTaskDetailData.profiles.T008.datasetRecords[0].triples = [];
  `);
}

test.describe('relation_identification output type — pure mode (T008)', () => {
  test('the sequential builder (task-new Step 2 parity) adds a triple from passage selections', async ({ page }) => {
    await stripTriplePrefill(page);
    await page.goto(buildWorkspaceUrl({ task_id: 'T008', sample_id: 'rel-001' }));
    await dismissGuidelineModal(page);

    // Pure mode: no entity_recognition editing affordances at all.
    await expect(page.getByTestId('ws-er-type-btn-target')).toHaveCount(0);
    // Engine-builder parity: no <select> dropdowns anywhere in the panel —
    // the builder is the sequential button flow, same as task-new Step 2.
    const panel = page.getByTestId('ws-output-panel-relation_identification');
    expect(await panel.locator('select').count()).toBe(0);

    await selectWorkspaceText(page, 'ws-input-content', '高血壓');
    await page.getByTestId('ws-ri-e1-btn').click();
    await expect(page.getByTestId('ws-ri-slot-e1')).toContainText('高血壓');

    await selectWorkspaceText(page, 'ws-input-content', '導致');
    await page.getByTestId('ws-ri-relation-btn').click();
    await expect(page.getByTestId('ws-ri-slot-rel')).toContainText('導致');

    await selectWorkspaceText(page, 'ws-input-content', '動脈硬化');
    await page.getByTestId('ws-ri-e2-btn').click();

    await page.getByTestId('ws-ri-add-btn').click();

    await expect(page.getByTestId('ws-ri-triple-item')).toContainText('高血壓');
    await expect(page.getByTestId('ws-ri-triple-item')).toContainText('導致');
    await expect(page.getByTestId('ws-ri-triple-item')).toContainText('動脈硬化');
  });

  test('step buttons enable sequentially and 退回 unwinds the last filled slot', async ({ page }) => {
    await stripTriplePrefill(page);
    await page.goto(buildWorkspaceUrl({ task_id: 'T008', sample_id: 'rel-001' }));
    await dismissGuidelineModal(page);

    // Empty draft: only E1/Arg1 is actionable.
    await expect(page.getByTestId('ws-ri-e1-btn')).toBeEnabled();
    await expect(page.getByTestId('ws-ri-relation-btn')).toBeDisabled();
    await expect(page.getByTestId('ws-ri-e2-btn')).toBeDisabled();
    await expect(page.getByTestId('ws-ri-add-btn')).toBeDisabled();
    await expect(page.getByTestId('ws-ri-undo-btn')).toBeDisabled();

    await selectWorkspaceText(page, 'ws-input-content', '高血壓');
    await page.getByTestId('ws-ri-e1-btn').click();
    await expect(page.getByTestId('ws-ri-relation-btn')).toBeEnabled();
    await expect(page.getByTestId('ws-ri-undo-btn')).toBeEnabled();

    await page.getByTestId('ws-ri-undo-btn').click();
    await expect(page.getByTestId('ws-ri-slot-e1')).toContainText('—');
    await expect(page.getByTestId('ws-ri-relation-btn')).toBeDisabled();
    await expect(page.getByTestId('ws-ri-undo-btn')).toBeDisabled();
  });

  test('selecting text that is not an existing entity shows an error instead of filling E1', async ({ page }) => {
    await stripTriplePrefill(page);
    await page.goto(buildWorkspaceUrl({ task_id: 'T008', sample_id: 'rel-001' }));
    await dismissGuidelineModal(page);

    await selectWorkspaceText(page, 'ws-input-content', '妥善');
    await page.getByTestId('ws-ri-e1-btn').click();

    const panel = page.getByTestId('ws-output-panel-relation_identification');
    await expect(panel).toContainText('該選取不是資料中的既有實體');
    await expect(page.getByTestId('ws-ri-slot-e1')).toContainText('—');
  });

  test('prefilled triples show their semantic type badge and can be deleted per row', async ({ page }) => {
    // rel-001 ships 4 output-role triples, each with a relation_type.
    await page.goto(buildWorkspaceUrl({ task_id: 'T008', sample_id: 'rel-001' }));
    await dismissGuidelineModal(page);

    const triples = page.getByTestId('ws-ri-triple-item');
    await expect(triples).toHaveCount(4);
    await expect(triples.first()).toContainText('類型：causes');

    await page.getByTestId('ws-ri-triple-delete').first().click();
    await expect(triples).toHaveCount(3);
  });

  test('triples survive switching away to another sample and back', async ({ page }) => {
    await stripTriplePrefill(page);
    await page.goto(buildWorkspaceUrl({ task_id: 'T008', sample_id: 'rel-001' }));
    await dismissGuidelineModal(page);

    await selectWorkspaceText(page, 'ws-input-content', '高血壓');
    await page.getByTestId('ws-ri-e1-btn').click();
    await selectWorkspaceText(page, 'ws-input-content', '導致');
    await page.getByTestId('ws-ri-relation-btn').click();
    await selectWorkspaceText(page, 'ws-input-content', '動脈硬化');
    await page.getByTestId('ws-ri-e2-btn').click();
    await page.getByTestId('ws-ri-add-btn').click();
    await expect(page.getByTestId('ws-ri-triple-item')).toHaveCount(1);

    await page.getByTestId('ws-sample-item').nth(1).click();
    await page.getByTestId('ws-sample-item').nth(0).click();
    await expect(page.getByTestId('ws-ri-triple-item')).toHaveCount(1);
  });
});
