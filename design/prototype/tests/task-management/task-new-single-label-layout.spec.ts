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
    const settingsLabel = page.getByTestId('step2-settings-label');
    const preview = page.getByTestId('step2-preview-panel');
    const supportingTools = page.getByTestId('step2-supporting-tools');

    await expect(workspace).toHaveAttribute('data-layout', 'settings-first-preview');
    await expect(settings).toBeVisible();
    await expect(settingsLabel).toHaveText('標記設定');
    const labelGeometry = await workspace.evaluate((element) => {
      const settingsHeading = element.querySelector('[data-testid="step2-settings-label"]');
      const previewHeading = element.querySelector('#annotationPreviewLabel');
      if (!settingsHeading || !previewHeading) return null;
      const settingsRect = settingsHeading.getBoundingClientRect();
      const previewRect = previewHeading.getBoundingClientRect();
      return {
        settingsTop: settingsRect.top,
        previewTop: previewRect.top,
        settingsHeight: settingsRect.height,
        previewHeight: previewRect.height,
      };
    });
    expect(labelGeometry).not.toBeNull();
    expect(Math.abs(labelGeometry!.settingsTop - labelGeometry!.previewTop)).toBeLessThanOrEqual(2);
    expect(Math.abs(labelGeometry!.settingsHeight - labelGeometry!.previewHeight)).toBeLessThanOrEqual(2);
    const bypassGap = await page
      .locator('.output-accordion[data-output-key="single_label"] .output-accordion-body')
      .evaluate((element) => {
        const bypassField = element.querySelector('.schema-toggle-card')?.parentElement;
        const previousField = bypassField?.previousElementSibling;
        if (!bypassField || !previousField) return null;
        return bypassField.getBoundingClientRect().top - previousField.getBoundingClientRect().bottom;
      });
    expect(bypassGap).not.toBeNull();
    expect(bypassGap!).toBeGreaterThanOrEqual(12);
    expect(bypassGap!).toBeLessThanOrEqual(16);
    const settingsBox = await box(page.locator('#s2PrimarySettingsSlot'));
    const previewBox = await box(preview);
    const supportingToolsBox = await box(supportingTools);
    const workspaceLayout = await workspace.evaluate((element) => {
      const style = window.getComputedStyle(element);
      return {
        columns: style.gridTemplateColumns.split(' ').filter(Boolean).length,
        alignment: style.alignItems,
      };
    });

    expect(workspaceLayout).toEqual({ columns: 2, alignment: 'start' });
    expect(settingsBox.x).toBeLessThan(previewBox.x);
    expect(supportingToolsBox.y).toBeGreaterThanOrEqual(
      Math.max(settingsBox.y + settingsBox.height, previewBox.y + previewBox.height),
    );

    await expect(supportingTools).toHaveAttribute('data-presentation', 'integrated');
    const panelBorders = await page.evaluate(() => {
      const readBorder = (selector: string) => {
        const element = document.querySelector(selector);
        return element ? window.getComputedStyle(element).borderTopStyle : null;
      };
      return {
        outer: readBorder('[data-testid="step2-supporting-tools"]'),
        template: readBorder('.template-section'),
        code: readBorder('.s2-code-panel'),
      };
    });
    expect(panelBorders).toEqual({ outer: 'solid', template: 'none', code: 'none' });
    const codeEditorBox = await box(page.locator('#codeEditor'));
    expect(codeEditorBox.height).toBeLessThanOrEqual(260);

    await page.locator('#langToggle').click();
    await expect(settingsLabel).toHaveText('Label settings');
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
    const supportingTools = page.getByTestId('step2-supporting-tools');
    const previewBox = await box(page.getByTestId('step2-preview-panel'));
    const templateBox = await box(page.locator('.template-section'));
    const settingsBox = await box(page.getByTestId('step2-settings-panel'));

    await expect(workspace).toHaveAttribute('data-layout', 'default');
    await expect(supportingTools).toHaveAttribute('data-presentation', 'default');
    expect(previewBox.y + previewBox.height).toBeLessThanOrEqual(templateBox.y);
    expect(templateBox.y + templateBox.height).toBeLessThanOrEqual(settingsBox.y);
  });
});
