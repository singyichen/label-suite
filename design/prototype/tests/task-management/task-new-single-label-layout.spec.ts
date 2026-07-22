import { test, expect, type Locator, type Page } from '@playwright/test';
import path from 'path';

const TASK_NEW_URL = '/pages/task-management/task-new.html';
const FIXTURE = path.resolve(__dirname, 'three-column-dataset.json');

async function openStep2(page: Page, outputType: 'single_label' | 'multi_label') {
  await page.goto(TASK_NEW_URL, { waitUntil: 'load' });
  await page.waitForFunction(
    () => document.querySelectorAll('#taskCategoryChips [data-key]').length > 0,
  );

  await page.fill('#taskNameInput', 'single-label-layout-test');
  await page.locator('#taskCategoryChips [data-key="classification"]').click();
  await page.locator('#taskInputTypeChips [data-key="single_item"]').click();
  await page.locator(`#taskOutputTypeChips [data-key="${outputType}"]`).click();
  await page.locator('#datasetFileInput').setInputFiles(FIXTURE);
  await expect(page.locator('.inline-dataset-preview-wrap')).toBeVisible();
  await page
    .locator('.inline-preview-role-select[aria-label="角色：sentence_a"]')
    .selectOption('input');
  await page
    .locator('.inline-preview-role-select[aria-label="角色：label"]')
    .selectOption('output');
  await page.locator('#nextBtn').click();
  await expect(page.locator('#step2Panel')).not.toHaveClass(/hidden/);
}

async function box(locator: Locator) {
  const result = await locator.boundingBox();
  expect(result).not.toBeNull();
  return result!;
}

test.describe('Step 2 single-label settings-first layout', () => {
  test('places settings beside preview and keeps template/code below on desktop', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await openStep2(page, 'single_label');

    const workspace = page.getByTestId('step2-primary-workspace');
    const settings = page.getByTestId('step2-settings-panel');
    const preview = page.getByTestId('step2-preview-panel');
    const supportingTools = page.getByTestId('step2-supporting-tools');

    await expect(workspace).toHaveAttribute('data-layout', 'single-label-settings-first');
    const settingsBox = await box(settings);
    const previewBox = await box(preview);
    const supportingToolsBox = await box(supportingTools);

    expect(Math.abs(settingsBox.y - previewBox.y)).toBeLessThanOrEqual(2);
    expect(settingsBox.x).toBeLessThan(previewBox.x);
    expect(supportingToolsBox.y).toBeGreaterThanOrEqual(
      Math.max(settingsBox.y + settingsBox.height, previewBox.y + previewBox.height),
    );
  });

  test('stacks settings before preview when the available width is narrow', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 900 });
    await openStep2(page, 'single_label');

    const settingsBox = await box(page.getByTestId('step2-settings-panel'));
    const previewBox = await box(page.getByTestId('step2-preview-panel'));
    const supportingToolsBox = await box(page.getByTestId('step2-supporting-tools'));

    expect(settingsBox.y + settingsBox.height).toBeLessThanOrEqual(previewBox.y);
    expect(supportingToolsBox.y).toBeGreaterThanOrEqual(previewBox.y + previewBox.height);
  });

  test('keeps the existing preview-first layout for other output types', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await openStep2(page, 'multi_label');

    const workspace = page.getByTestId('step2-primary-workspace');
    const previewBox = await box(page.getByTestId('step2-preview-panel'));
    const templateBox = await box(page.locator('.template-section'));
    const settingsBox = await box(page.getByTestId('step2-settings-panel'));

    await expect(workspace).toHaveAttribute('data-layout', 'default');
    expect(previewBox.y + previewBox.height).toBeLessThanOrEqual(templateBox.y);
    expect(templateBox.y + templateBox.height).toBeLessThanOrEqual(settingsBox.y);
  });
});
