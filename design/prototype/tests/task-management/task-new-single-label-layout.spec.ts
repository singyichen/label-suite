import { test, expect, type Locator, type Page } from '@playwright/test';
import path from 'path';

const TASK_NEW_URL = '/pages/task-management/task-new.html';
const EXAMPLE_DATA = path.resolve(__dirname, '../../../../docs/product/example-data');

interface LayoutCase {
  name: string;
  category: string | string[];
  outputTypes: string[];
  dataFile: string;
  roles: Record<string, 'input' | 'output' | 'evidence'>;
}

const SINGLE_OUTPUT_CASES: LayoutCase[] = [
  {
    name: 'single_label',
    category: 'classification',
    outputTypes: ['single_label'],
    dataFile: 'single-label.json',
    roles: { text: 'input', gold_label: 'output' },
  },
  {
    name: 'multi_label',
    category: 'classification',
    outputTypes: ['multi_label'],
    dataFile: 'multi-label.json',
    roles: { text: 'input', gold_labels: 'output' },
  },
  {
    name: 'free_text',
    category: 'generation',
    outputTypes: ['free_text'],
    dataFile: 'free-text.json',
    roles: { text: 'input', gold_answer: 'output', reference: 'evidence' },
  },
  {
    name: 'single_dim',
    category: 'regression',
    outputTypes: ['single_dim'],
    dataFile: 'single-dim.json',
    roles: { text: 'input', gold_score: 'output' },
  },
  {
    name: 'multi_dim',
    category: 'regression',
    outputTypes: ['multi_dim'],
    dataFile: 'multi-dim.json',
    roles: { source: 'input', gold_scores: 'output' },
  },
  {
    name: 'sequence_tagging',
    category: 'sequence',
    outputTypes: ['sequence_tagging'],
    dataFile: 'sequence-tagging.json',
    roles: { text: 'input', gold_tags: 'output' },
  },
  {
    name: 'entity_recognition',
    category: 'sequence',
    outputTypes: ['entity_recognition'],
    dataFile: 'entity-recognition.json',
    roles: { text: 'input', gold_entities: 'output' },
  },
  {
    name: 'relation_identification',
    category: 'sequence',
    outputTypes: ['relation_identification'],
    dataFile: 'relation-identification.json',
    roles: { text: 'input', triples: 'output' },
  },
];

const MULTI_OUTPUT_CASE: LayoutCase = {
  name: 'entity_recognition + relation_identification',
  category: 'sequence',
  outputTypes: ['entity_recognition', 'relation_identification'],
  dataFile: 'medical-ner-re.json',
  roles: { text: 'input', entities: 'output', triples: 'output' },
};

async function openStep2(page: Page, layoutCase: LayoutCase) {
  await page.goto(TASK_NEW_URL, { waitUntil: 'load' });
  await page.waitForFunction(
    () => document.querySelectorAll('#taskCategoryChips [data-key]').length > 0,
    null,
    { timeout: 30000 },
  );

  await page.fill('#taskNameInput', `${layoutCase.name}-layout-test`);
  const categories = Array.isArray(layoutCase.category)
    ? layoutCase.category
    : [layoutCase.category];
  for (const category of categories) {
    await page.locator(`#taskCategoryChips [data-key="${category}"]`).click();
  }
  await page.locator('#taskInputTypeChips [data-key="single_item"]').click();
  for (const outputType of layoutCase.outputTypes) {
    await page.locator(`#taskOutputTypeChips [data-key="${outputType}"]`).click();
  }

  await page
    .locator('#datasetFileInput')
    .setInputFiles(path.join(EXAMPLE_DATA, layoutCase.dataFile));
  await expect(page.locator('.inline-dataset-preview-wrap')).toBeVisible();
  for (const [column, role] of Object.entries(layoutCase.roles)) {
    await page
      .locator(`.inline-preview-role-select[aria-label$="${column}"]`)
      .selectOption(role);
  }

  await page.evaluate(() => {
    const prototypeWindow = window as Window & { revalidateCurrentStep?: () => void };
    prototypeWindow.revalidateCurrentStep?.();
  });
  await page.locator('#nextBtn').click();
  await expect(page.locator('#step2Panel')).not.toHaveClass(/hidden/);
}

async function box(locator: Locator) {
  const result = await locator.boundingBox();
  expect(result).not.toBeNull();
  return result!;
}

async function expectUnifiedDesktopLayout(page: Page, layoutCase: LayoutCase) {
  const workspace = page.getByTestId('step2-primary-workspace');
  const settings = page.getByTestId('step2-settings-panel');
  const settingsLabel = page.getByTestId('step2-settings-label');
  const preview = page.getByTestId('step2-preview-panel');
  const supportingTools = page.getByTestId('step2-supporting-tools');

  await expect(workspace).toHaveAttribute('data-layout', 'settings-first-preview');
  await expect(supportingTools).toHaveAttribute('data-presentation', 'integrated');
  await expect(settingsLabel).toHaveText('標記設定');
  const settingsBox = await box(settings);
  const previewBox = await box(preview);
  const supportingToolsBox = await box(supportingTools);
  const layout = await workspace.evaluate((element) => {
    const style = window.getComputedStyle(element);
    const settingsHeading = element.querySelector('[data-testid="step2-settings-label"]');
    const previewHeading = element.querySelector('#annotationPreviewLabel');
    if (!settingsHeading || !previewHeading) return null;
    return {
      columns: style.gridTemplateColumns.split(' ').filter(Boolean).length,
      alignment: style.alignItems,
      headingOffset: Math.abs(
        settingsHeading.getBoundingClientRect().top - previewHeading.getBoundingClientRect().top,
      ),
    };
  });

  expect(layout).toEqual({ columns: 2, alignment: 'start', headingOffset: 0 });
  expect(settingsBox.x).toBeLessThan(previewBox.x);
  expect(supportingToolsBox.y).toBeGreaterThanOrEqual(
    Math.max(settingsBox.y + settingsBox.height, previewBox.y + previewBox.height),
  );

  const panelBorders = await page.evaluate(() => {
    const border = (selector: string) => {
      const element = document.querySelector(selector);
      return element ? window.getComputedStyle(element).borderTopStyle : null;
    };
    return {
      outer: border('[data-testid="step2-supporting-tools"]'),
      template: border('.template-section'),
      code: border('.s2-code-panel'),
    };
  });
  expect(panelBorders).toEqual({ outer: 'solid', template: 'none', code: 'none' });
  expect((await box(page.locator('#codeEditor'))).height).toBeLessThanOrEqual(260);

  for (const outputType of layoutCase.outputTypes) {
    const bypassGap = await page
      .locator(`.output-accordion[data-output-key="${outputType}"] .schema-bypass-field`)
      .evaluate((element) => {
        const previousField = element.previousElementSibling;
        if (!previousField) return null;
        return element.getBoundingClientRect().top - previousField.getBoundingClientRect().bottom;
      });
    expect(bypassGap).not.toBeNull();
    expect(bypassGap!).toBeCloseTo(12, 0);
  }
}

test.describe('Step 2 unified settings and preview layout', () => {
  test.describe.configure({ mode: 'serial' });

  for (const layoutCase of [...SINGLE_OUTPUT_CASES, MULTI_OUTPUT_CASE]) {
    test(`${layoutCase.name} uses the shared desktop layout`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 1000 });
      await openStep2(page, layoutCase);
      await expectUnifiedDesktopLayout(page, layoutCase);
    });
  }

  test('stacks every selected output setting above preview at 1100px', async ({ page }) => {
    await page.setViewportSize({ width: 1100, height: 900 });
    await openStep2(page, MULTI_OUTPUT_CASE);

    const settingsBox = await box(page.getByTestId('step2-settings-panel'));
    const previewBox = await box(page.getByTestId('step2-preview-panel'));
    const supportingToolsBox = await box(page.getByTestId('step2-supporting-tools'));

    await expect(page.locator('.output-accordion')).toHaveCount(2);
    expect(settingsBox.y + settingsBox.height).toBeLessThanOrEqual(previewBox.y);
    expect(supportingToolsBox.y).toBeGreaterThanOrEqual(previewBox.y + previewBox.height);
  });
});
