import { test, expect } from '@playwright/test';

const TASK_NEW_URL = '/pages/task-management/task-new.html';

test.describe('Task new taxonomy cascade', () => {
  test('uses task category, input type, and output type from the taxonomy', async ({ page }) => {
    await page.goto(TASK_NEW_URL);

    // Category chips render all 4 categories from TASK_TAXONOMY
    await expect(page.locator('#taskCategoryChips [data-key="classification"]')).toContainText('分類（Classification）');
    await expect(page.locator('#taskCategoryChips [data-key="regression"]')).toContainText('回歸（Regression）');
    await expect(page.locator('#taskCategoryChips [data-key="sequence"]')).toContainText('序列（Sequence）');
    await expect(page.locator('#taskCategoryChips [data-key="generation"]')).toContainText('生成（Generation）');

    // Input type chips render the taxonomy granularities
    await expect(page.locator('#taskInputTypeChips [data-key="single_item"]')).toBeVisible();
    await expect(page.locator('#taskInputTypeChips [data-key="item_pair"]')).toBeVisible();

    // Output type chips render the taxonomy subtypes
    await expect(page.locator('#taskOutputTypeChips [data-key="single_label"]')).toBeVisible();
    await expect(page.locator('#taskOutputTypeChips [data-key="multi_label"]')).toBeVisible();
    await expect(page.locator('#taskOutputTypeChips [data-key="free_text"]')).toBeVisible();
  });

  test('resolves selected taxonomy combination to the matching config schema', async ({ page }) => {
    await page.goto(TASK_NEW_URL);

    await page.click('#taskCategoryChips [data-key="generation"]');
    await page.click('#taskInputTypeChips [data-key="single_item"]');
    await page.click('#taskOutputTypeChips [data-key="free_text"]');

    const taskState = await page.evaluate(() => {
      const win = window as typeof window & { state: { taskType: string } };
      return win.state.taskType;
    });
    expect(taskState).toBe('generation_single_item_free_text');

    await page.evaluate(() => {
      const win = window as typeof window & {
        state: { configData: Record<string, unknown> };
        showStep: (step: number) => void;
        renderSchemaFields: () => void;
        getDefaultTemplateForLang: (taskType: string, lang: 'zh' | 'en') => Record<string, unknown>;
      };
      win.state.configData = win.getDefaultTemplateForLang('generation_single_item_free_text', 'zh');
      win.renderSchemaFields();
      win.showStep(2);
    });

    await expect(page.locator('#schemaFields')).toContainText('最大長度');
    await expect(page.locator('#schemaFields')).toContainText('標注者可見參考輸出');
    await expect(page.locator('#schemaFields')).toContainText('系統評估需要參考輸出');
  });
});
