import { test, expect } from '@playwright/test';
import {
  buildWorkspaceUrl,
  dismissGuidelineModal,
  patchDataFile,
  selectWorkspaceText,
  skipGuidelineModal,
} from './_workspace-helpers';

/* entity_recognition + relation_identification INTEGRATED mode (spec 015
 * v2.0.0, OUTPUT_TYPE_DEPENDENCIES: relation_identification.source_output =
 * 'entity_recognition'). T010: both types are declared in outputs[], so
 * entities are editable and become the shared E1/E2 source for the engine's
 * sequential relation builder — unlike T008's pure/standalone mode. */

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
});

test.describe('entity_recognition + relation_identification integrated mode (T010)', () => {
  test('entities marked in the entity_recognition region feed the sequential relation builder', async ({ page }) => {
    await page.goto(buildWorkspaceUrl({ task_id: 'T010', sample_id: 'med-001' }));
    await dismissGuidelineModal(page);

    // med-001 ships 11 pre-annotated (output-role) entities.
    await expect(page.getByTestId('ws-er-entity-item')).toHaveCount(11);

    // Engine-builder parity (task-new Step 2 / task-detail 標記設定): the
    // relation builder is the sequential button flow, not <select> dropdowns.
    const relPanel = page.getByTestId('ws-output-panel-relation_identification');
    expect(await relPanel.locator('select').count()).toBe(0);

    // A marked entity is accepted as E1/Arg1 via passage selection.
    await selectWorkspaceText(page, 'ws-input-content', '左心耳');
    await page.getByTestId('ws-ri-e1-btn').click();
    await expect(page.getByTestId('ws-ri-slot-e1')).toContainText('左心耳');
  });

  test('deleting an entity in entity_recognition removes any triple that referenced it', async ({ page }) => {
    await page.goto(buildWorkspaceUrl({ task_id: 'T010', sample_id: 'med-001' }));
    await dismissGuidelineModal(page);

    // med-001 ships 8 pre-annotated (output-role) triples.
    await expect(page.getByTestId('ws-ri-triple-item')).toHaveCount(8);

    // The first entity, 左心耳 (1,3), is the subject of 3 of the 8 fixture
    // triples (位於→左心房, 產生→淤滯, 形成→血栓); the same-text entity at
    // (36,38) is referenced by none, so span-aware cascading removes
    // exactly those 3.
    await page.getByTestId('ws-er-entity-delete').first().click();
    await expect(page.getByTestId('ws-er-entity-item')).toHaveCount(10);
    await expect(page.getByTestId('ws-ri-triple-item')).toHaveCount(5);
  });
});

test.describe('bypass cascade rules for the integrated pair', () => {
  test.beforeEach(async ({ page }) => {
    // T010's outputs[] don't set allow_bypass; patch both to true at
    // runtime to exercise FR-024J's cascade rules without touching the
    // committed fixture file.
    await patchDataFile(page, 'task-detail.data.js', `
      var outputs = window.LabelSuiteTaskDetailData.profiles.T010.outputs;
      outputs.forEach(function (o) { o.config.allow_bypass = true; });
    `);
  });

  test('bypassing entity_recognition also clears and disables the relation builder', async ({ page }) => {
    await page.goto(buildWorkspaceUrl({ task_id: 'T010', sample_id: 'med-001' }));
    await dismissGuidelineModal(page);

    await page.getByTestId('ws-bypass-entity_recognition').check();

    await expect(page.getByTestId('ws-er-entity-item')).toHaveCount(0);
    await expect(page.getByTestId('ws-ri-triple-item')).toHaveCount(0);
    await expect(page.getByTestId('ws-ri-add-btn')).toBeDisabled();
  });

  test('bypassing relation_identification alone only clears the relation builder, not entities', async ({ page }) => {
    await page.goto(buildWorkspaceUrl({ task_id: 'T010', sample_id: 'med-001' }));
    await dismissGuidelineModal(page);

    await page.getByTestId('ws-bypass-relation_identification').check();

    await expect(page.getByTestId('ws-er-entity-item')).toHaveCount(11);
    await expect(page.getByTestId('ws-ri-triple-item')).toHaveCount(0);
    await expect(page.getByTestId('ws-ri-add-btn')).toBeDisabled();
  });
});
