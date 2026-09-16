/*
 * Traceability: specs/task-management/013-task-new/spec.md
 *   FR-002 / FR-002a–FR-002e (three-group task type selector, unchanged)
 *
 * Contract history: this file originally asserted that Step 1's one-click
 * "common combos" preset (FR-002f, added in v7.1.0 per issue #724 direction ①)
 * was present and usable. Direction ① was reverted in v8.0.0 (OpenSpec change
 * remove-task-new-step1-type-preset) because the single-entry preset list did
 * not pay for the extra interface concept it introduced above the three-group
 * chip selector. This file's contract has been flipped from a positive
 * acceptance test for the preset feature into a removal contract: it fails
 * while the preset implementation still exists (TDD Red) and passes once
 * TASK_TYPE_PRESETS / applyTaskTypePreset and their DOM are fully removed
 * (TDD Green). The three-group selector regression case is unchanged
 * capability and must stay green throughout.
 */
import { test, expect } from '@playwright/test';
import path from 'path';

const TASK_NEW_URL = '/pages/task-management/task-new.html';
const FIXTURE = path.resolve(__dirname, 'three-column-dataset.json');

test.describe('Issue #724 — Step 1 task type one-click preset removed', () => {
  test('Step 1 does not render the preset container or its label', async ({ page }) => {
    await page.goto(TASK_NEW_URL);

    await expect(page.locator('#taskTypePresets')).toHaveCount(0);
    await expect(page.locator('#taskTypePresetsLabel')).toHaveCount(0);
  });

  test('Step 1 does not render any preset button', async ({ page }) => {
    await page.goto(TASK_NEW_URL);

    await expect(page.locator('[data-testid^="task-type-preset-"]')).toHaveCount(0);
  });

  test('TASK_TYPE_PRESETS data table and applyTaskTypePreset function are removed from window', async ({ page }) => {
    await page.goto(TASK_NEW_URL);

    const globals = await page.evaluate(() => {
      const win = window as typeof window & {
        TASK_TYPE_PRESETS?: unknown;
        applyTaskTypePreset?: unknown;
      };
      return {
        presets: win.TASK_TYPE_PRESETS,
        applyPreset: win.applyTaskTypePreset,
      };
    });

    expect(globals.presets).toBeUndefined();
    expect(globals.applyPreset).toBeUndefined();
  });

  test('regression: the three-group selector alone still composes classification + single_item + single_label and enables Next', async ({ page }) => {
    await page.goto(TASK_NEW_URL, { waitUntil: 'load' });
    await page.waitForFunction(() => document.querySelectorAll('#taskCategoryChips [data-key]').length > 0, null, { timeout: 30000 });

    await page.fill('#taskNameInput', 'test-task');
    await page.locator('#taskCategoryChips [data-key="classification"]').click();
    await page.locator('#taskOutputTypeChips [data-key="single_label"]').click();
    await page.locator('#datasetFileInput').setInputFiles(FIXTURE);
    await expect(page.locator('.inline-dataset-preview-wrap')).toBeVisible();
    await page.locator('#taskInputTypeChips [data-key="single_item"]').click();
    await page.locator('.inline-preview-role-select[aria-label*="sentence_a"]').selectOption('input');

    const taskType = await page.evaluate(() => (window as typeof window & { state: { taskType: string } }).state.taskType);
    expect(taskType).toBe('single_sentence_classification');

    await expect(page.locator('#nextBtn')).not.toBeDisabled();
  });
});
