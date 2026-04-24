import { test, expect } from '@playwright/test';

const TASK_NEW_URL = '/pages/task-management/task-new.html';

test.describe('Task new VA scoring template', () => {
  test('renders valence/arousal config fields and dual-row preview', async ({ page }) => {
    await page.goto(TASK_NEW_URL);

    await page.evaluate(() => {
      const win = window as typeof window & {
        state: { taskType: string; configData: Record<string, unknown> };
        el: (id: string) => HTMLElement;
        showStep: (step: number) => void;
        renderTemplateBtns: () => void;
        renderSchemaFields: () => void;
        getDefaultTemplateForLang: (taskType: string, lang: 'zh' | 'en') => Record<string, unknown>;
      };
      win.state.taskType = 'single_sentence_va_scoring';
      win.state.configData = win.getDefaultTemplateForLang('single_sentence_va_scoring', 'zh');
      (win.el('taskTypeSelect') as HTMLSelectElement).value = 'single_sentence_va_scoring';
      win.renderTemplateBtns();
      win.renderSchemaFields();
      win.showStep(2);
    });

    await expect(page.locator('#schemaFields')).toContainText('Valence');
    await expect(page.locator('#schemaFields')).toContainText('Arousal');
    await expect(page.locator('#schemaFields')).toContainText('最小值');
    await expect(page.locator('#schemaFields')).toContainText('最大值');
    await expect(page.locator('#schemaFields')).toContainText('間距');

    const preview = page.locator('#annotationPreview');
    await expect(preview).toContainText('Valence');
    await expect(preview).toContainText('Arousal');
  });

  test('loads default guideline file for VA task type', async ({ page }) => {
    await page.goto(TASK_NEW_URL);

    await page.selectOption('#taskTypeSelect', 'single_sentence_va_scoring');

    await page.evaluate(() => {
      const win = window as typeof window & { showStep: (step: number) => void };
      win.showStep(4);
    });

    await expect(page.locator('#guidelineList')).toContainText('VA_emj.png');
    await expect(page.locator('#guidelineList')).toContainText('Image');
  });
});
