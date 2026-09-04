import { test, expect, type Page } from '@playwright/test';
import path from 'path';

/* issue #581 / OpenSpec change seq-tagging-span-config, FR-003d-1.
   `sequence_tagging` drops the token coordinate system: the Step 2 settings
   panel keeps only 標籤類型 / 選取吸附 / 允許無法判定, and the serialized
   config carries neither the retired `tagging_scheme` and `tokenization`
   keys nor `allow_overlapping`, which is a type-level invariant rather than
   a configurable field. */

declare global {
  interface Window {
    state?: Record<string, unknown>;
    revalidateCurrentStep?: () => void;
  }
}

const TASK_NEW_URL = '/pages/task-management/task-new.html';
const EXAMPLE_DATA = path.resolve(__dirname, '../../../../docs/product/example-data');

test.describe.configure({ retries: 2 });

async function goToStep2WithSequenceTagging(page: Page) {
  await page.goto(TASK_NEW_URL, { waitUntil: 'load' });
  await page.waitForFunction(
    () => document.querySelectorAll('#taskCategoryChips [data-key]').length > 0,
    null,
    { timeout: 30000 },
  );

  await page.fill('#taskNameInput', 'issue-581-seq-tagging-config-fields');
  await page.locator('#taskCategoryChips [data-key="sequence"]').click();
  await page.locator('#taskInputTypeChips [data-key="single_item"]').click();
  await page.locator('#taskOutputTypeChips [data-key="sequence_tagging"]').click();

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

test('sequence_tagging settings panel shows exactly the three surviving columns', async ({
  page,
}) => {
  await goToStep2WithSequenceTagging(page);

  const panel = page.locator(
    '.output-accordion[data-output-key="sequence_tagging"]',
  );
  await expect(panel.locator('.field-label, .schema-toggle-label')).toHaveText([
    '標籤類型*',
    '選取吸附*',
    '允許無法判定 (Bypass)',
  ]);
});

test('sequence_tagging settings panel retires the tagging scheme column', async ({
  page,
}) => {
  await goToStep2WithSequenceTagging(page);

  const panel = page.locator(
    '.output-accordion[data-output-key="sequence_tagging"]',
  );
  await expect(page.getByTestId('sequence-tagging-scheme-select')).toHaveCount(0);
  await expect(panel).not.toContainText('標記方案');
  for (const scheme of ['BIO', 'BIOES', 'IOB2']) {
    await expect(panel.getByText(scheme, { exact: true })).toHaveCount(0);
  }
});

test('sequence_tagging snap unit offers character and word and defaults to character', async ({
  page,
}) => {
  await goToStep2WithSequenceTagging(page);

  const snapSelect = page.getByTestId('sequence-snap-unit-select');
  await expect(snapSelect.locator('option')).toHaveText([
    '字元（Character）',
    '詞（Word）',
  ]);
  await expect(snapSelect).toHaveValue('character');
});

test('serialized sequence_tagging config drops tokenization, tagging_scheme and allow_overlapping', async ({
  page,
}) => {
  await goToStep2WithSequenceTagging(page);

  const config = await page.evaluate(() => {
    const configs = window.state?.outputConfigs as
      | Record<string, Record<string, unknown>>
      | undefined;
    return configs?.sequence_tagging ?? null;
  });

  expect(config).not.toBeNull();
  const keys = Object.keys(config as Record<string, unknown>);
  expect(keys).not.toContain('tokenization');
  expect(keys).not.toContain('tagging_scheme');
  expect(keys).not.toContain('allow_overlapping');
  expect(config).toMatchObject({ snap_unit: 'character' });
});
