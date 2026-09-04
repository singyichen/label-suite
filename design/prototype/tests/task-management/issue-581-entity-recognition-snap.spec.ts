import { test, expect, type Page } from '@playwright/test';
import path from 'path';

/* issue #581 / OpenSpec change seq-tagging-span-config, FR-003d-3.
   `entity_recognition` gains the same `snap_unit` selection-snapping field as
   `sequence_tagging`, from the same shared component. The two types differ in
   exactly one setting — whether `allow_overlapping` is configurable — so the
   snap unit must offer identical options and stay independent per panel when
   both types are selected on one task. */

declare global {
  interface Window {
    state?: Record<string, unknown>;
    revalidateCurrentStep?: () => void;
  }
}

const TASK_NEW_URL = '/pages/task-management/task-new.html';
const EXAMPLE_DATA = path.resolve(__dirname, '../../../../docs/product/example-data');

test.describe.configure({ retries: 2 });

async function goToStep2(page: Page, outputTypes: string[]) {
  await page.goto(TASK_NEW_URL, { waitUntil: 'load' });
  await page.waitForFunction(
    () => document.querySelectorAll('#taskCategoryChips [data-key]').length > 0,
    null,
    { timeout: 30000 },
  );

  await page.fill('#taskNameInput', 'issue-581-entity-recognition-snap');
  await page.locator('#taskCategoryChips [data-key="sequence"]').click();
  await page.locator('#taskInputTypeChips [data-key="single_item"]').click();
  for (const outputType of outputTypes) {
    await page.locator(`#taskOutputTypeChips [data-key="${outputType}"]`).click();
  }

  await page
    .locator('#datasetFileInput')
    .setInputFiles(path.join(EXAMPLE_DATA, 'sequence-tagging.json'));
  await expect(page.locator('.inline-dataset-preview-wrap')).toBeVisible();
  await page
    .locator('.inline-preview-role-select[aria-label$="text"]')
    .selectOption('input');

  await page.evaluate(() => {
    window.revalidateCurrentStep?.();
  });
  await page.waitForTimeout(200);
  await page.locator('#nextBtn').click();
  await expect(page.locator('#step2Panel')).not.toHaveClass(/hidden/);
}

test('entity_recognition settings panel shows the four columns in order', async ({
  page,
}) => {
  await goToStep2(page, ['entity_recognition']);

  const panel = page.locator(
    '.output-accordion[data-output-key="entity_recognition"]',
  );
  await expect(panel.locator('.field-label, .schema-toggle-label')).toHaveText([
    '實體類型*',
    '選取吸附*',
    '允許重疊標記',
    '允許無法判定 (Bypass)',
  ]);
});

test('entity_recognition snap unit offers the same options as sequence_tagging', async ({
  page,
}) => {
  await goToStep2(page, ['sequence_tagging', 'entity_recognition']);

  const sequenceSnap = page
    .locator('.output-accordion[data-output-key="sequence_tagging"]')
    .getByTestId('sequence-snap-unit-select');
  const entitySnap = page
    .locator('.output-accordion[data-output-key="entity_recognition"]')
    .getByTestId('entity-snap-unit-select');

  const expected = ['字元（Character）', '詞（Word）'];
  await expect(sequenceSnap.locator('option')).toHaveText(expected);
  await expect(entitySnap.locator('option')).toHaveText(expected);
});

test('snap unit is held per output type and the two panels do not interfere', async ({
  page,
}) => {
  await goToStep2(page, ['sequence_tagging', 'entity_recognition']);

  const entityPanel = page.locator(
    '.output-accordion[data-output-key="entity_recognition"]',
  );
  await entityPanel.getByTestId('entity-snap-unit-select').selectOption('word');

  const configs = await page.evaluate(() => {
    const state = window.state?.outputConfigs as
      | Record<string, Record<string, unknown>>
      | undefined;
    return {
      sequence: state?.sequence_tagging?.snap_unit ?? null,
      entity: state?.entity_recognition?.snap_unit ?? null,
    };
  });

  expect(configs).toEqual({ sequence: 'character', entity: 'word' });
});
