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

    // Output type chips are hidden until a category is selected (cascade)
    await expect(page.locator('#outputTypePlaceholder')).toBeVisible();

    // Select classification → output chips appear for that category
    await page.click('#taskCategoryChips [data-key="classification"]');
    await expect(page.locator('#taskOutputTypeChips [data-key="single_label"]')).toBeVisible();
    await expect(page.locator('#taskOutputTypeChips [data-key="multi_label"]')).toBeVisible();
    // free_text belongs to generation, not classification — should not be visible
    await expect(page.locator('#taskOutputTypeChips [data-key="free_text"]')).not.toBeVisible();

    // Deselect classification, select generation → free_text appears
    await page.click('#taskCategoryChips [data-key="classification"]');
    await page.click('#taskCategoryChips [data-key="generation"]');
    await expect(page.locator('#taskOutputTypeChips [data-key="free_text"]')).toBeVisible();
    await expect(page.locator('#taskOutputTypeChips [data-key="single_label"]')).not.toBeVisible();
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

    await expect(page.locator('#schemaFields')).toContainText('最大字數');
    await expect(page.locator('#schemaFields')).toContainText('顯示參考答案給標記者');
  });

  test('removes retired outputs and migrates sequence output config keys', async ({ page }) => {
    await page.goto(TASK_NEW_URL);

    const retiredRegistryItems = await page.evaluate(() => {
      const win = window as typeof window & {
        OUTPUT_TYPE_REGISTRY: Record<string, unknown>;
      };
      return {
        entityRelation: Object.hasOwn(win.OUTPUT_TYPE_REGISTRY, 'entity_relation'),
        boundary: Object.hasOwn(win.OUTPUT_TYPE_REGISTRY, 'boundary'),
        span: Object.hasOwn(win.OUTPUT_TYPE_REGISTRY, 'span'),
        relationTriple: Object.hasOwn(win.OUTPUT_TYPE_REGISTRY, 'relation_triple'),
        tokenClass: Object.hasOwn(win.OUTPUT_TYPE_REGISTRY, 'token_class'),
        entityRecognition: Object.hasOwn(win.OUTPUT_TYPE_REGISTRY, 'entity_recognition'),
        relationIdentification: Object.hasOwn(win.OUTPUT_TYPE_REGISTRY, 'relation_identification'),
        sequenceTagging: Object.hasOwn(win.OUTPUT_TYPE_REGISTRY, 'sequence_tagging'),
      };
    });
    expect(retiredRegistryItems).toEqual({
      entityRelation: false,
      boundary: false,
      span: false,
      relationTriple: false,
      tokenClass: false,
      entityRecognition: true,
      relationIdentification: true,
      sequenceTagging: true,
    });

    await page.click('#taskCategoryChips [data-key="classification"]');
    await page.click('#taskInputTypeChips [data-key="item_pair"]');
    await expect(page.locator('#taskOutputTypeChips [data-key="entity_relation"]')).toHaveCount(0);

    await page.click('#taskCategoryChips [data-key="classification"]');
    await page.click('#taskCategoryChips [data-key="sequence"]');
    await page.click('#taskInputTypeChips [data-key="single_item"]');

    await expect(page.locator('#taskOutputTypeChips [data-key="boundary"]')).toHaveCount(0);
    await expect(page.locator('#taskOutputTypeChips [data-key="span"]')).toHaveCount(0);
    await expect(page.locator('#taskOutputTypeChips [data-key="relation_triple"]')).toHaveCount(0);
    await expect(page.locator('#taskOutputTypeChips [data-key="token_class"]')).toHaveCount(0);
    await expect(page.locator('#taskOutputTypeChips [data-key="entity_recognition"]')).toHaveText('實體辨識');
    await expect(page.locator('#taskOutputTypeChips [data-key="relation_identification"]')).toHaveText('關係識別');
    await expect(page.locator('#taskOutputTypeChips [data-key="sequence_tagging"]')).toHaveText('序列標註');
  });

  test('uses the current English sequence task names', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('labelsuite.lang', 'en');
    });
    await page.goto(TASK_NEW_URL);

    await page.click('#taskCategoryChips [data-key="sequence"]');
    await page.click('#taskInputTypeChips [data-key="single_item"]');

    await expect(page.locator('#taskOutputTypeChips [data-key="entity_recognition"]')).toHaveText('Entity Recognition');
    await expect(page.locator('#taskOutputTypeChips [data-key="relation_identification"]')).toHaveText('Relation Identification');
    await expect(page.locator('#taskOutputTypeChips [data-key="sequence_tagging"]')).toHaveText('Sequence Tagging');
  });
});
