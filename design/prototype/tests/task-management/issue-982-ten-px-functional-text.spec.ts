/**
 * Traceability: issue #982 — 8 spots of functional text at 10px, below the
 * design-system minimum --text-label (12px, design/prototype/assets/tokens.css:67,
 * design/system/MASTER.md:414). This file covers the 5 spots that live in
 * design/prototype/pages/task-management/task-config.css. Each assertion reads
 * the real rendered getComputedStyle() font-size — never the CSS source text.
 *
 * Follow-up to issue #973, which fixed the same class of problem in
 * annotation-workspace.html.
 *
 * RED (current state): all 5 assertions below FAIL because the CSS still
 * declares `font-size: 10px`. GREEN (after fix): each selector's rule becomes
 * `font-size: var(--text-label)` (12px) and these assertions pass unchanged.
 */
import { test, expect, type Page } from '@playwright/test';
import path from 'path';

const TASK_NEW_URL = '/pages/task-management/task-new.html';
const EXAMPLE_DATA = path.resolve(__dirname, '../../../../docs/product/example-data');
const EXPECTED_FONT_SIZE = '12px';

async function waitForCategoryChips(page: Page) {
  await page.goto(TASK_NEW_URL, { waitUntil: 'load' });
  await page.waitForFunction(
    () => document.querySelectorAll('#taskCategoryChips [data-key]').length > 0,
    null,
    { timeout: 30000 },
  );
}

test.describe('Issue #982 — task-config.css functional text at 10px', () => {
  // #1 and #2: .re-preview-entity-badge (task-config.css:443) and
  // .re-preview-relation-badge (task-config.css:449).
  //
  // Both render inside #annotationPreview via renderRelationExtractionPreview(),
  // a legacy single-output preview path reached when state.taskType is set to
  // 'relation_extraction' directly. This is not reachable through the current
  // step-1 multi-output chips UI (those drive state.selectedOutputTypes
  // instead), so we set the internal state the same way the pre-existing
  // dark-mode regression test does
  // (tests/task-management/task-new-step2-dark-mode.spec.ts:16-42).
  test('renders .re-preview-entity-badge at the design-system label size', async ({ page }) => {
    await page.goto(TASK_NEW_URL);
    await page.evaluate(() => {
      type TaskWindow = Window & {
        state: { taskType: string; configData: Record<string, unknown>; lang: 'zh' | 'en' };
        getDefaultTemplateForLang: (taskType: string, lang: 'zh' | 'en') => Record<string, unknown>;
        renderTemplateBtns: () => void;
        renderSchemaFields: () => void;
        showStep: (step: number) => void;
      };
      const win = window as unknown as TaskWindow;
      win.state.taskType = 'relation_extraction';
      win.state.lang = 'zh';
      win.state.configData = win.getDefaultTemplateForLang('relation_extraction', 'zh');
      win.renderTemplateBtns();
      win.renderSchemaFields();
      win.showStep(2);
    });

    const badge = page.locator('#annotationPreview .re-preview-entity-badge').first();
    await expect(badge).toBeVisible();
    await expect(badge).toHaveCSS('font-size', EXPECTED_FONT_SIZE);
  });

  test('renders .re-preview-relation-badge at the design-system label size', async ({ page }) => {
    await page.goto(TASK_NEW_URL);
    await page.evaluate(() => {
      type TaskWindow = Window & {
        state: { taskType: string; configData: Record<string, unknown>; lang: 'zh' | 'en' };
        getDefaultTemplateForLang: (taskType: string, lang: 'zh' | 'en') => Record<string, unknown>;
        renderTemplateBtns: () => void;
        renderSchemaFields: () => void;
        showStep: (step: number) => void;
      };
      const win = window as unknown as TaskWindow;
      win.state.taskType = 'relation_extraction';
      win.state.lang = 'zh';
      win.state.configData = win.getDefaultTemplateForLang('relation_extraction', 'zh');
      win.renderTemplateBtns();
      win.renderSchemaFields();
      win.showStep(2);
    });

    const badge = page.locator('#annotationPreview .re-preview-relation-badge').first();
    await expect(badge).toBeVisible();
    await expect(badge).toHaveCSS('font-size', EXPECTED_FONT_SIZE);
  });

  // #3: .absa-relation-badge (task-config.css:491), rendered by
  // buildRelationTripleRow() inside the ABSA unified preview
  // (renderAbsaUnifiedPreview) whenever both entity_recognition and
  // relation_identification are selected and previewTriples is non-empty.
  // Reuses the exact step-1 selections already verified in the pre-existing
  // "absa-va.json — triple output" test
  // (tests/task-management/task-new-output-type-preview.spec.ts:1211).
  test('renders .absa-relation-badge at the design-system label size', async ({ page }) => {
    await waitForCategoryChips(page);
    await page.fill('#taskNameInput', 'issue-982-absa-relation-badge-test');
    await page.locator('#taskCategoryChips [data-key="regression"]').click();
    await page.locator('#taskCategoryChips [data-key="sequence"]').click();
    await page.locator('#taskInputTypeChips [data-key="single_item"]').click();
    await page.locator('#taskOutputTypeChips [data-key="entity_recognition"]').click();
    await page.locator('#taskOutputTypeChips [data-key="relation_identification"]').click();
    await page.locator('#taskOutputTypeChips [data-key="multi_dim"]').click();

    await page.locator('#datasetFileInput').setInputFiles(path.join(EXAMPLE_DATA, 'absa-va.json'));
    await expect(page.locator('.inline-dataset-preview-wrap')).toBeVisible();

    const roles: Record<string, string> = {
      utterances: 'evidence',
      text: 'input',
      gold_triplets: 'output',
      incomplete_annotations: 'output',
    };
    for (const [col, role] of Object.entries(roles)) {
      await page.locator(`.inline-preview-role-select[aria-label$="${col}"]`).selectOption(role);
    }

    await page.evaluate(() => {
      (window as Window & { revalidateCurrentStep?: () => void }).revalidateCurrentStep?.();
    });
    await page.waitForTimeout(200);
    await page.locator('#nextBtn').click();
    await expect(page.locator('#step2Panel')).not.toHaveClass(/hidden/);

    const badge = page.locator('#annotationPreview .absa-relation-badge').first();
    await expect(badge).toBeVisible();
    await expect(badge).toHaveCSS('font-size', EXPECTED_FONT_SIZE);
  });

  // #4: .inline-preview-type-badge (task-config.css:523), the field-type
  // badge rendered in the dataset field-role mapping table header as soon as
  // a dataset file is uploaded in step 1 (before any output type is chosen).
  test('renders .inline-preview-type-badge at the design-system label size', async ({ page }) => {
    await waitForCategoryChips(page);
    await page.fill('#taskNameInput', 'issue-982-inline-preview-type-badge-test');
    await page.locator('#taskCategoryChips [data-key="sequence"]').click();
    await page.locator('#taskInputTypeChips [data-key="single_item"]').click();
    await page.locator('#taskOutputTypeChips [data-key="entity_recognition"]').click();
    await page.locator('#datasetFileInput').setInputFiles(path.join(EXAMPLE_DATA, 'entity-recognition.json'));
    await expect(page.locator('.inline-dataset-preview-wrap')).toBeVisible();

    const badge = page.locator('.inline-preview-type-badge').first();
    await expect(badge).toBeVisible();
    await expect(badge).toHaveCSS('font-size', EXPECTED_FONT_SIZE);
  });

  // #5: .task-type-subgroup-label (task-config.css:536), the category
  // subgroup heading shown inside #taskOutputTypeChips only when more than
  // one task category is selected (showSubheaders = groups.length > 1).
  test('renders .task-type-subgroup-label at the design-system label size', async ({ page }) => {
    await waitForCategoryChips(page);
    await page.locator('#taskCategoryChips [data-key="sequence"]').click();
    await page.locator('#taskCategoryChips [data-key="regression"]').click();

    const subgroupLabel = page.locator('.task-type-subgroup-label').first();
    await expect(subgroupLabel).toBeVisible();
    await expect(subgroupLabel).toHaveCSS('font-size', EXPECTED_FONT_SIZE);
  });
});
