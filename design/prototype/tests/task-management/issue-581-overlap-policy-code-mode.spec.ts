import { test, expect, type Page } from '@playwright/test';
import path from 'path';

/* issue #581 / OpenSpec change seq-tagging-span-config, FR-003d-1.
   `allow_overlapping` is a type-level invariant for `sequence_tagging`
   (SPAN_OVERLAP_POLICY_BY_OUTPUT_TYPE = forbidden), not a setting. Code mode
   is the only surface that can still smuggle the key in, so a pasted config
   carrying it must be rejected with a locatable error and must not be
   silently rewritten to `false`. */

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

  await page.fill('#taskNameInput', 'issue-581-overlap-policy-code-mode');
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

type UnifiedConfig = {
  outputs: Array<{ type: string; config: Record<string, unknown> }>;
};

async function pasteSequenceConfigWithOverlap(page: Page) {
  await page.locator('#formatJsonBtn').click();
  const editor = page.locator('#codeEditor');
  const parsed = JSON.parse(await editor.inputValue()) as UnifiedConfig;
  const sequence = parsed.outputs.find((output) => output.type === 'sequence_tagging');
  expect(sequence).toBeDefined();
  sequence!.config.allow_overlapping = true;
  await editor.fill(JSON.stringify(parsed, null, 2));
  await page.locator('#saveCodeBtn').click();
}

test('code mode rejects a sequence_tagging config carrying allow_overlapping', async ({
  page,
}) => {
  await goToStep2WithSequenceTagging(page);
  await pasteSequenceConfigWithOverlap(page);

  await expect(page.locator('#codeErrorBar')).not.toHaveClass(/hidden/);
  await expect(page.locator('#codeErrorMsg')).toContainText('allow_overlapping');
  await expect(page.locator('#nextBtn')).toBeDisabled();
});

test('the rejected value is not silently rewritten to false', async ({ page }) => {
  await goToStep2WithSequenceTagging(page);
  await pasteSequenceConfigWithOverlap(page);

  const config = await page.evaluate(() => {
    const configs = window.state?.outputConfigs as
      | Record<string, Record<string, unknown>>
      | undefined;
    return configs?.sequence_tagging ?? null;
  });

  expect(config).not.toBeNull();
  expect(Object.keys(config as Record<string, unknown>)).not.toContain(
    'allow_overlapping',
  );
});
