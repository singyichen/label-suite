import { test, expect, type Locator, type Page } from '@playwright/test';

const TASK_NEW_URL = '/pages/task-management/task-new.html';

const TASK_TYPES = [
  'single_sentence_classification',
  'sequence_labeling',
  'relation_extraction',
  'sentence_pairs',
  'single_sentence_va_scoring',
] as const;

async function openStep2ForTask(page: Page, taskType: (typeof TASK_TYPES)[number]) {
  await page.addInitScript(() => {
    window.localStorage.setItem('label-suite-theme', 'dark');
  });
  await page.goto(TASK_NEW_URL);

  await page.evaluate((selectedTaskType) => {
    type TaskState = {
      taskType: string;
      configData: Record<string, unknown>;
      lang: 'zh' | 'en';
    };
    const win = window as typeof window & {
      state: TaskState;
      el: (id: string) => HTMLElement;
      showStep: (step: number) => void;
      renderTemplateBtns: () => void;
      renderSchemaFields: () => void;
      getDefaultTemplateForLang: (taskType: string, lang: 'zh' | 'en') => Record<string, unknown>;
    };
    win.state.taskType = selectedTaskType;
    win.state.lang = 'zh';
    win.state.configData = win.getDefaultTemplateForLang(selectedTaskType, 'zh');
    win.renderTemplateBtns();
    win.renderSchemaFields();
    win.showStep(2);
  }, taskType);

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('#step2Panel')).toBeVisible();
}

async function expectDarkFormSurface(locator: Locator) {
  await expect(locator).toHaveCSS('background-color', 'rgb(22, 22, 31)');
  await expect(locator).toHaveCSS('color', 'rgb(226, 232, 240)');
}

test.describe('Task new step 2 dark mode', () => {
  for (const taskType of TASK_TYPES) {
    test(`${taskType} keeps generated controls on dark form surfaces`, async ({ page }) => {
      await openStep2ForTask(page, taskType);

      await expect(page.locator('#annotationPreview')).toHaveCSS('background-color', 'rgb(31, 31, 40)');
      await expect(page.locator('#codeEditor')).toHaveCSS('background-color', 'rgb(13, 13, 20)');
      await expect(page.locator('#codeEditor')).toHaveCSS('color', 'rgb(226, 232, 240)');

      const generatedInputs = page.locator('#schemaFields input.input-text, #schemaFields .entity-name-input');
      const inputCount = await generatedInputs.count();
      for (let index = 0; index < inputCount; index += 1) {
        await expectDarkFormSurface(generatedInputs.nth(index));
      }

      const generatedSelects = page.locator('#schemaFields select.input-select, #annotationPreview .re-preview-select');
      const selectCount = await generatedSelects.count();
      for (let index = 0; index < selectCount; index += 1) {
        await expectDarkFormSurface(generatedSelects.nth(index));
      }

      const tagInputs = page.locator('#schemaFields .tag-input-wrap');
      const tagInputCount = await tagInputs.count();
      for (let index = 0; index < tagInputCount; index += 1) {
        await expect(tagInputs.nth(index)).toHaveCSS('background-color', 'rgb(22, 22, 31)');
      }

      const previewRows = page.locator('#annotationPreview .annotation-preview-sample, #annotationPreview .re-preview-entity-row, #annotationPreview .re-preview-triple-row');
      const previewRowCount = await previewRows.count();
      for (let index = 0; index < previewRowCount; index += 1) {
        await expect(previewRows.nth(index)).toHaveCSS('background-color', 'rgb(22, 22, 31)');
      }
    });
  }
});
