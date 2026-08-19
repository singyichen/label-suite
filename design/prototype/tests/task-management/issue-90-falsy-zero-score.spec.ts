import { test, expect } from '@playwright/test';

/**
 * Issue #90: `score_min || 1` / `score_step || 1` / `score_max || 1` treat an
 * explicit 0 as "missing" and silently substitute the fallback, because `0`
 * is falsy in JavaScript. This regression test drives the legacy
 * `sentence_pairs` scoring preview (task-config.engine.js ->
 * renderSentencePairsPreview) directly through state, mirroring the existing
 * `single_sentence_va_scoring` precedent in task-new-va-template.spec.ts,
 * since the taxonomy chip UI in task-new.html no longer offers a "scoring"
 * subtype for item pairs but the legacy code path (still shared with
 * task-detail.html) remains live.
 */

const TASK_NEW_URL = '/pages/task-management/task-new.html';

test.describe('Task new score preview — falsy-zero score_min/score_max/score_step', () => {
  test('score_min: 0 renders 0 as the first option instead of defaulting to 1', async ({ page }) => {
    await page.goto(TASK_NEW_URL);

    await page.evaluate(() => {
      const win = window as typeof window & {
        state: { taskType: string; configData: Record<string, unknown> };
        renderSchemaFields: () => void;
        showStep: (step: number) => void;
      };
      win.state.taskType = 'sentence_pairs';
      win.state.configData = {
        pair_mode: 'entailment',
        response_format: 'scoring',
        sentence_1_field: '',
        sentence_2_field: '',
        score_min: 0,
        score_max: 1,
        score_step: 0.25,
      };
      win.renderSchemaFields();
      win.showStep(2);
    });

    const preview = page.locator('#annotationPreview');
    const scoreOptions = preview.locator('.annotation-preview-options .annotation-preview-option span');

    // Expected sequence for min=0, max=1, step=0.25: 0, 0.25, 0.5, 0.75, 1.
    // The buggy `score_min || 1` / `score_step || 1` code would start the
    // options at 1 instead of 0 (min=0 gets clobbered to the fallback 1).
    await expect(scoreOptions).toHaveText(['0', '0.25', '0.5', '0.75', '1']);
  });

  test('score_max: 0 is respected instead of defaulting to 5', async ({ page }) => {
    await page.goto(TASK_NEW_URL);

    await page.evaluate(() => {
      const win = window as typeof window & {
        state: { taskType: string; configData: Record<string, unknown> };
        renderSchemaFields: () => void;
        showStep: (step: number) => void;
      };
      win.state.taskType = 'sentence_pairs';
      win.state.configData = {
        pair_mode: 'entailment',
        response_format: 'scoring',
        sentence_1_field: '',
        sentence_2_field: '',
        score_min: -1,
        score_max: 0,
        score_step: 0.5,
      };
      win.renderSchemaFields();
      win.showStep(2);
    });

    const preview = page.locator('#annotationPreview');
    const scoreOptions = preview.locator('.annotation-preview-options .annotation-preview-option span');

    // Expected sequence for min=-1, max=0, step=0.5: -1, -0.5, 0.
    // The buggy `score_max || 5` code would clobber max=0 to the fallback 5,
    // producing a much longer (wrong) list of options.
    await expect(scoreOptions).toHaveText(['-1', '-0.5', '0']);
  });
});
