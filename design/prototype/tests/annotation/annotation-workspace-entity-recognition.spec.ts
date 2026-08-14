import { test, expect } from '@playwright/test';
import { buildWorkspaceUrl, dismissGuidelineModal, patchDataFile, skipGuidelineModal } from './_workspace-helpers';

/* entity_recognition annotator interaction (spec 015 v2.0.0), standalone
 * (no relation_identification composed alongside it). T007: target /
 * aspect / opinion entity types, allow_overlapping=false. */

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
});

test.describe('entity_recognition output type — standalone (T007)', () => {
  test('selecting an entity type then dragging a text span creates an entity', async ({ page }) => {
    // Blank-slate creation path: strip the record's output-role
    // preannotation (013 FR-003g-5) so the panel starts with zero entities
    // and the drag below is unambiguously the one that creates the first.
    // With the 7 preannotated entities present, the input text is split
    // into underline segments and offsets 2-4 land on an existing entity.
    await patchDataFile(page, 'task-detail.data.js', `
      window.LabelSuiteTaskDetailData.profiles.T007.datasetRecords[0].gold_entities = [];
    `);
    await page.goto(buildWorkspaceUrl({ task_id: 'T007', sample_id: 'entity-recognition-001' }));
    await dismissGuidelineModal(page);

    await page.getByTestId('ws-er-type-btn-target').click();
    const input = page.getByTestId('ws-input-content');
    await input.evaluate((el) => {
      const textNode = el.firstChild;
      if (!textNode) return;
      const range = document.createRange();
      range.setStart(textNode, 2);
      range.setEnd(textNode, 4);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      document.dispatchEvent(new Event('selectionchange'));
    });
    await input.dispatchEvent('mouseup');

    await expect(page.getByTestId('ws-er-entity-item')).toHaveCount(1);
  });

  test('deleting an entity removes it from the answer', async ({ page }) => {
    await page.goto(buildWorkspaceUrl({ task_id: 'T007', sample_id: 'entity-recognition-001' }));
    await dismissGuidelineModal(page);

    // Pre-seeded entities are surfaced via ws-er-entity-item once the
    // record loads (the record's own gold_entities field is 'output'-role
    // annotator-visible preannotation, not hidden ground truth — see
    // 013 FR-003g-5 / field_role_map).
    const entityItems = page.getByTestId('ws-er-entity-item');
    await expect(entityItems).toHaveCount(7);

    await page.getByTestId('ws-er-entity-delete').first().click();
    await expect(entityItems).toHaveCount(6);
  });

  test('entities survive switching away to another sample and back', async ({ page }) => {
    await page.goto(buildWorkspaceUrl({ task_id: 'T007', sample_id: 'entity-recognition-001' }));
    await dismissGuidelineModal(page);

    await page.getByTestId('ws-er-entity-delete').first().click();
    await expect(page.getByTestId('ws-er-entity-item')).toHaveCount(6);

    await page.getByTestId('ws-sample-item').nth(1).click();
    await page.getByTestId('ws-sample-item').nth(0).click();
    await expect(page.getByTestId('ws-er-entity-item')).toHaveCount(6);
  });
});
