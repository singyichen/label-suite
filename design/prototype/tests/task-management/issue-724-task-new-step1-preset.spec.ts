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
});
