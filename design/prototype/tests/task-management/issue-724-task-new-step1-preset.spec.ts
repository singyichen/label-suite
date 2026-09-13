import { test, expect } from '@playwright/test';

const TASK_NEW_URL = '/pages/task-management/task-new.html';

test.describe('Issue #724 — Step 1 task type one-click preset', () => {
  test('exposes a data-driven TASK_TYPE_PRESETS entry for the common classification/single-label combo', async ({ page }) => {
    await page.goto(TASK_NEW_URL);

    const preset = await page.evaluate(() => {
      const win = window as typeof window & {
        TASK_TYPE_PRESETS?: Array<{
          key: string;
          category: string;
          inputType: string;
          outputTypes: string[];
          zh: string;
          en: string;
        }>;
      };
      return Array.isArray(win.TASK_TYPE_PRESETS) ? win.TASK_TYPE_PRESETS[0] : undefined;
    });

    expect(preset).toBeDefined();
    expect(preset?.key).toBe('classification_single_label');
    expect(preset?.category).toBe('classification');
    expect(preset?.inputType).toBe('single_item');
    expect(preset?.outputTypes).toEqual(['single_label']);
    expect(preset?.zh).toBeTruthy();
    expect(preset?.en).toBeTruthy();
  });

  test('applyTaskTypePreset writes the preset combo into state in a single call', async ({ page }) => {
    await page.goto(TASK_NEW_URL);

    const result = await page.evaluate(() => {
      const win = window as typeof window & {
        TASK_TYPE_PRESETS?: Array<{ category: string; inputType: string; outputTypes: string[] }>;
        applyTaskTypePreset?: (preset: { category: string; inputType: string; outputTypes: string[] }) => void;
        state: {
          taskCategories: string[];
          taskInputTypes: string[];
          taskOutputTypes: string[];
          taskType: string;
          selectedOutputTypes: string[];
        };
      };
      if (typeof win.applyTaskTypePreset !== 'function' || !win.TASK_TYPE_PRESETS) {
        return { applied: false };
      }
      win.applyTaskTypePreset(win.TASK_TYPE_PRESETS[0]);
      return {
        applied: true,
        taskCategories: win.state.taskCategories,
        taskInputTypes: win.state.taskInputTypes,
        taskOutputTypes: win.state.taskOutputTypes,
        taskType: win.state.taskType,
        selectedOutputTypes: win.state.selectedOutputTypes,
      };
    });

    expect(result.applied).toBe(true);
    expect(result.taskCategories).toEqual(['classification']);
    expect(result.taskInputTypes).toEqual(['single_item']);
    expect(result.taskOutputTypes).toEqual(['single_label']);
    expect(result.taskType).toBe('single_sentence_classification');
    expect(result.selectedOutputTypes).toEqual(['single_label']);
  });

  test('one click on the preset button reaches the same chip state as three manual chip clicks', async ({ page }) => {
    await page.goto(TASK_NEW_URL);

    const preset = page.locator('[data-testid="task-type-preset-classification-single-label-btn"]');
    await expect(preset).toBeVisible();

    let presetClicks = 0;
    await preset.click();
    presetClicks += 1;
    expect(presetClicks).toBe(1);

    await expect(page.locator('#taskCategoryChips [data-key="classification"]')).toHaveAttribute('aria-checked', 'true');
    await expect(page.locator('#taskInputTypeChips [data-key="single_item"]')).toHaveAttribute('aria-checked', 'true');
    await expect(page.locator('#taskOutputTypeChips [data-key="single_label"]')).toHaveAttribute('aria-checked', 'true');
  });

  test('before/after click-count comparison for the same combo, measured against the same page state', async ({ page }) => {
    await page.goto(TASK_NEW_URL);

    // BEFORE (baseline, unchanged capability): three-group custom selector.
    let baselineClicks = 0;
    await page.click('#taskCategoryChips [data-key="classification"]');
    baselineClicks += 1;
    await page.click('#taskInputTypeChips [data-key="single_item"]');
    baselineClicks += 1;
    await page.click('#taskOutputTypeChips [data-key="single_label"]');
    baselineClicks += 1;
    expect(baselineClicks).toBe(3);

    const baselineTaskType = await page.evaluate(() => (window as typeof window & { state: { taskType: string } }).state.taskType);
    expect(baselineTaskType).toBe('single_sentence_classification');

    // AFTER: reload for a clean state, then apply the one-click preset.
    await page.reload();
    let presetClicks = 0;
    await page.click('[data-testid="task-type-preset-classification-single-label-btn"]');
    presetClicks += 1;
    expect(presetClicks).toBe(1);

    const presetTaskType = await page.evaluate(() => (window as typeof window & { state: { taskType: string } }).state.taskType);
    expect(presetTaskType).toBe(baselineTaskType);
    expect(presetClicks).toBeLessThan(baselineClicks);
  });

  test('the three-group selector remains fully adjustable after applying the preset', async ({ page }) => {
    await page.goto(TASK_NEW_URL);

    await page.click('[data-testid="task-type-preset-classification-single-label-btn"]');
    await page.click('#taskCategoryChips [data-key="sequence"]');

    await expect(page.locator('#taskCategoryChips [data-key="classification"]')).toHaveAttribute('aria-checked', 'true');
    await expect(page.locator('#taskInputTypeChips [data-key="single_item"]')).toHaveAttribute('aria-checked', 'true');
    await expect(page.locator('#taskOutputTypeChips [data-key="single_label"]')).toHaveAttribute('aria-checked', 'true');
    await expect(page.locator('#taskCategoryChips [data-key="sequence"]')).toHaveAttribute('aria-checked', 'true');
  });
});
