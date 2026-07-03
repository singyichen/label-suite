import { test, expect } from '@playwright/test';
import path from 'path';

const TASK_NEW_URL = '/pages/task-management/task-new.html';
const FIXTURE = path.resolve(__dirname, 'three-column-dataset.json');

test.describe('Step 2 preview: evidence exclusion, input layout, and isolation', () => {
  test.describe.configure({ mode: 'serial', retries: 2 });

  async function setupAndGoToStep2(
    page: import('@playwright/test').Page,
    inputType: 'single_item' | 'item_pair',
    roles: Record<string, string>,
  ) {
    await page.goto(TASK_NEW_URL, { waitUntil: 'load' });
    await page.waitForFunction(
      () => document.querySelectorAll('#taskCategoryChips [data-key]').length > 0,
      null,
      { timeout: 30000 },
    );
    await page.fill('#taskNameInput', 'preview-test');
    await page.locator('#taskCategoryChips [data-key="classification"]').click();
    await page.locator('#taskOutputTypeChips [data-key="single_label"]').click();
    await page.locator('#taskInputTypeChips [data-key="' + inputType + '"]').click();
    await page.locator('#datasetFileInput').setInputFiles(FIXTURE);
    await expect(page.locator('.inline-dataset-preview-wrap')).toBeVisible();

    for (const [col, role] of Object.entries(roles)) {
      await page
        .locator(`.inline-preview-role-select[aria-label*="${col}"]`)
        .selectOption(role);
    }

    await page.locator('#nextBtn').click();
    await expect(page.locator('#step2Panel')).not.toHaveClass(/hidden/);
  }

  test('single_item with Evidence shows no evidence block, only input text in Step 2', async ({
    page,
  }) => {
    await setupAndGoToStep2(page, 'single_item', {
      sentence_a: 'input',
      label: 'evidence',
    });

    const preview = page.locator('#annotationPreview');
    await expect(preview.locator('.annotation-preview-pair-label')).toContainText(
      'sentence_a',
    );
    await expect(preview.locator('.annotation-preview-sample')).toBeVisible();
    await expect(preview.locator('.sp-evidence-card')).toHaveCount(0);
  });

  test('item_pair with Evidence shows no evidence block, only pair layout in Step 2', async ({
    page,
  }) => {
    await setupAndGoToStep2(page, 'item_pair', {
      sentence_a: 'input',
      sentence_b: 'input',
      label: 'evidence',
    });

    const preview = page.locator('#annotationPreview');
    await expect(preview.locator('.sp-evidence-card')).toHaveCount(0);
    const pairLabels = preview.locator('.annotation-preview-pair-label');
    await expect(pairLabels).toHaveCount(2);
    await expect(pairLabels.nth(0)).toContainText('sentence_a');
    await expect(pairLabels.nth(1)).toContainText('sentence_b');
  });

  test('clicking a label chip preserves input text with evidence still hidden', async ({
    page,
  }) => {
    await setupAndGoToStep2(page, 'single_item', {
      sentence_a: 'input',
      label: 'evidence',
    });

    await page.evaluate(() => {
      const win = window as typeof window & {
        state: {
          outputConfigs: Record<string, { label_options?: { name: string; color: string }[] }>;
        };
        updateAnnotationPreview: () => void;
      };
      win.state.outputConfigs['single_label'] = {
        label_options: [
          { name: 'positive', color: '#10B981' },
          { name: 'negative', color: '#EF4444' },
        ],
      };
      win.updateAnnotationPreview();
    });

    const preview = page.locator('#annotationPreview');
    await expect(preview.locator('.sp-evidence-card')).toHaveCount(0);
    await expect(preview.locator('.annotation-preview-sample')).toBeVisible();

    const labelChip = preview.locator('button').filter({ hasText: 'positive' });
    await labelChip.click();

    await expect(preview.locator('.sp-evidence-card')).toHaveCount(0);
    await expect(preview.locator('.annotation-preview-sample')).toBeVisible();
  });
});
