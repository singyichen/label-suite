import { test, expect, Page } from '@playwright/test';

const TASK_NEW_URL = '/pages/task-management/task-new.html';

async function optionValues(page: Page, selector: string) {
  return page.locator(selector).locator('option').evaluateAll((options: Element[]) =>
    options.map((option: Element) => (option as HTMLOptionElement).value)
  );
}

test.describe('Task new taxonomy cascade', () => {
  test('uses task category, input type, and output type from the taxonomy', async ({ page }) => {
    await page.goto(TASK_NEW_URL);

    await expect(page.locator('#taskCategorySelect')).toContainText('分類（Classification）');
    await expect(page.locator('#taskCategorySelect')).toContainText('回歸（Regression）');
    await expect(page.locator('#taskCategorySelect')).toContainText('序列（Sequence）');
    await expect(page.locator('#taskCategorySelect')).toContainText('生成（Generation）');
    await expect(page.locator('#taskCategorySelect')).toContainText('混合（Mixed）');

    await page.selectOption('#taskCategorySelect', 'classification');
    await expect(page.locator('#taskGranularityWrap')).not.toHaveClass(/hidden/);
    await expect(await optionValues(page, '#taskGranularitySelect')).toEqual(['', 'single_item', 'item_pair']);

    await page.selectOption('#taskGranularitySelect', 'single_item');
    await expect(await optionValues(page, '#taskSubtypeSelect')).toEqual([
      '',
      'single_label',
      'multi_label',
      'entity_relation',
    ]);

    await page.selectOption('#taskGranularitySelect', 'item_pair');
    await expect(await optionValues(page, '#taskSubtypeSelect')).toEqual(['', 'single_label', 'multi_label']);
  });

  test('resolves selected taxonomy combination to the matching config schema', async ({ page }) => {
    await page.goto(TASK_NEW_URL);

    await page.selectOption('#taskCategorySelect', 'generation');
    await page.selectOption('#taskGranularitySelect', 'single_item');
    await page.selectOption('#taskSubtypeSelect', 'free_text');

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
