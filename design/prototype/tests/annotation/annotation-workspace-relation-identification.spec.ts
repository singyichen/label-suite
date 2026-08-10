import { test, expect } from '@playwright/test';
import {
  buildWorkspaceUrl,
  dismissGuidelineModal,
  patchDataFile,
  skipGuidelineModal,
} from './_workspace-helpers';

/* relation_identification annotator interaction (spec 015 v2.0.0),
 * pure/standalone mode — no entity_recognition composed alongside it, so
 * entity spans are read-only reference material (T008's `entities` field is
 * mapped 'evidence', not editable). See
 * annotation-workspace-entity-relation-integration.spec.ts for the
 * integrated mode (relation_identification depends on entity_recognition,
 * OUTPUT_TYPE_DEPENDENCIES). */

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
});

test.describe('relation_identification output type — pure mode (T008)', () => {
  test('entity spans are shown read-only; the builder is used to add a triple', async ({ page }) => {
    // Blank-slate builder path: rel-001's own "triples" field is an
    // output-role prefill (013 FR-003g-5); strip it so the triple added
    // below is unambiguously the one this test itself creates.
    await patchDataFile(page, 'task-detail.data.js', `
      window.LabelSuiteTaskDetailData.profiles.T008.datasetRecords[0].triples = [];
    `);
    await page.goto(buildWorkspaceUrl({ task_id: 'T008', sample_id: 'rel-001' }));
    await dismissGuidelineModal(page);

    // Pure mode: no entity_recognition editing affordances at all.
    await expect(page.getByTestId('ws-er-type-btn-target')).toHaveCount(0);

    await page.getByTestId('ws-ri-e1-select').selectOption({ label: '高血壓' });
    await page.getByTestId('ws-ri-relation-select').selectOption('causes');
    await page.getByTestId('ws-ri-e2-select').selectOption({ label: '動脈硬化' });
    await page.getByTestId('ws-ri-add-btn').click();

    await expect(page.getByTestId('ws-ri-triple-item')).toContainText('高血壓');
    await expect(page.getByTestId('ws-ri-triple-item')).toContainText('causes');
    await expect(page.getByTestId('ws-ri-triple-item')).toContainText('動脈硬化');
  });

  test('undo removes the last added triple', async ({ page }) => {
    // See the blank-slate note above.
    await patchDataFile(page, 'task-detail.data.js', `
      window.LabelSuiteTaskDetailData.profiles.T008.datasetRecords[0].triples = [];
    `);
    await page.goto(buildWorkspaceUrl({ task_id: 'T008', sample_id: 'rel-001' }));
    await dismissGuidelineModal(page);

    await page.getByTestId('ws-ri-e1-select').selectOption({ label: '高血壓' });
    await page.getByTestId('ws-ri-relation-select').selectOption('causes');
    await page.getByTestId('ws-ri-e2-select').selectOption({ label: '動脈硬化' });
    await page.getByTestId('ws-ri-add-btn').click();
    await expect(page.getByTestId('ws-ri-triple-item')).toHaveCount(1);

    await page.getByTestId('ws-ri-undo-btn').click();
    await expect(page.getByTestId('ws-ri-triple-item')).toHaveCount(0);
  });

  test('triples survive switching away to another sample and back', async ({ page }) => {
    // See the blank-slate note above.
    await patchDataFile(page, 'task-detail.data.js', `
      window.LabelSuiteTaskDetailData.profiles.T008.datasetRecords[0].triples = [];
    `);
    await page.goto(buildWorkspaceUrl({ task_id: 'T008', sample_id: 'rel-001' }));
    await dismissGuidelineModal(page);

    await page.getByTestId('ws-ri-e1-select').selectOption({ label: '高血壓' });
    await page.getByTestId('ws-ri-relation-select').selectOption('causes');
    await page.getByTestId('ws-ri-e2-select').selectOption({ label: '動脈硬化' });
    await page.getByTestId('ws-ri-add-btn').click();

    await page.getByTestId('ws-sample-item').nth(1).click();
    await page.getByTestId('ws-sample-item').nth(0).click();
    await expect(page.getByTestId('ws-ri-triple-item')).toHaveCount(1);
  });
});
