import { test, expect } from '@playwright/test';
import path from 'path';

const TASK_NEW_URL = '/pages/task-management/task-new.html';
const FIXTURE = path.resolve(__dirname, '../fixtures/three-column-dataset.json');

async function setupTask(page: import('@playwright/test').Page) {
  await page.goto(TASK_NEW_URL, { waitUntil: 'load' });
  await page.waitForFunction(() => document.querySelectorAll('#taskCategoryChips [data-key]').length > 0, null, { timeout: 30000 });
  const classificationChip = page.locator('#taskCategoryChips [data-key="classification"]');
  await page.fill('#taskNameInput', 'test-task');
  await classificationChip.click();
  await page.locator('#taskOutputTypeChips [data-key="single_label"]').click();
  await page.locator('#datasetFileInput').setInputFiles(FIXTURE);
  await expect(page.locator('.inline-dataset-preview-wrap')).toBeVisible();
}

async function setFieldRole(page: import('@playwright/test').Page, column: string, role: string) {
  const sel = page.locator(`.inline-preview-role-select[aria-label*="${column}"]`);
  await sel.selectOption(role);
}

test.describe('Step 1 input-count validation', () => {
  test.describe.configure({ mode: 'serial', retries: 2 });

  test('single_item with 1 Input field allows Next', async ({ page }) => {
    await setupTask(page);
    await page.locator('#taskInputTypeChips [data-key="single_item"]').click();
    await setFieldRole(page, 'sentence_a', 'input');
    await expect(page.locator('#errInlineFieldCount')).not.toHaveClass(/show/);
    await expect(page.locator('#nextBtn')).not.toBeDisabled();
  });

  test('single_item with 0 Input fields blocks Next and shows error', async ({ page }) => {
    await setupTask(page);
    await page.locator('#taskInputTypeChips [data-key="single_item"]').click();
    await expect(page.locator('#errInlineFieldCount')).toHaveClass(/show/);
    await expect(page.locator('#nextBtn')).toBeDisabled();
  });

  test('single_item with 2 Input fields blocks Next and shows error', async ({ page }) => {
    await setupTask(page);
    await page.locator('#taskInputTypeChips [data-key="single_item"]').click();
    await setFieldRole(page, 'sentence_a', 'input');
    await setFieldRole(page, 'sentence_b', 'input');
    await expect(page.locator('#errInlineFieldCount')).toHaveClass(/show/);
    await expect(page.locator('#nextBtn')).toBeDisabled();
  });

  test('item_pair with 2 Input fields allows Next', async ({ page }) => {
    await setupTask(page);
    await page.locator('#taskInputTypeChips [data-key="item_pair"]').click();
    await setFieldRole(page, 'sentence_a', 'input');
    await setFieldRole(page, 'sentence_b', 'input');
    await expect(page.locator('#errInlineFieldCount')).not.toHaveClass(/show/);
    await expect(page.locator('#nextBtn')).not.toBeDisabled();
  });

  test('item_pair with 1 Input field blocks Next and shows error', async ({ page }) => {
    await setupTask(page);
    await page.locator('#taskInputTypeChips [data-key="item_pair"]').click();
    await setFieldRole(page, 'sentence_a', 'input');
    await expect(page.locator('#errInlineFieldCount')).toHaveClass(/show/);
    await expect(page.locator('#nextBtn')).toBeDisabled();
  });

  test('item_pair with 3 Input fields blocks Next and shows error', async ({ page }) => {
    await setupTask(page);
    await page.locator('#taskInputTypeChips [data-key="item_pair"]').click();
    await setFieldRole(page, 'sentence_a', 'input');
    await setFieldRole(page, 'sentence_b', 'input');
    await setFieldRole(page, 'label', 'input');
    await expect(page.locator('#errInlineFieldCount')).toHaveClass(/show/);
    await expect(page.locator('#nextBtn')).toBeDisabled();
  });
});
