import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

declare global {
  interface Window {
    state?: Record<string, unknown>;
    revalidateCurrentStep?: () => void;
    updateAnnotationPreview?: () => void;
  }
}

const TASK_NEW_URL = '/pages/task-management/task-new.html';
const EXAMPLE_DATA = path.resolve(__dirname, '../../../../docs/product/example-data');

test('Entity Recognition fixture uses current fields and valid inclusive offsets', () => {
  const records = JSON.parse(
    fs.readFileSync(path.join(EXAMPLE_DATA, 'entity-recognition.json'), 'utf8'),
  ) as Array<{
    id: string;
    text: string;
    gold_entities: Array<{ text: string; start: number; end: number }>;
  }>;

  for (const record of records) {
    expect(record.id).toMatch(/^entity-recognition-\d{3}$/);
    expect(record.gold_entities).toBeInstanceOf(Array);
    for (const entity of record.gold_entities) {
      expect(record.text.substring(entity.start, entity.end + 1)).toBe(entity.text);
    }
  }
});

test('Sequence Tagging default fixture uses character tokens for Chinese and English', () => {
  const records = JSON.parse(
    fs.readFileSync(path.join(EXAMPLE_DATA, 'sequence-tagging.json'), 'utf8'),
  ) as Array<{
    id: string;
    text: string;
    tokens: string[];
    pre_tags: string[];
  }>;

  expect(records.length).toBeGreaterThanOrEqual(4);
  for (const record of records) {
    expect(record.id).toMatch(/^sequence-tagging-\d{3}$/);
    expect(record.tokens).toHaveLength(record.pre_tags.length);
    for (const token of record.tokens) {
      expect(Array.from(token)).toHaveLength(1);
    }
  }

  const englishRecord = records.find((record) => (
    !/\p{Script=Han}/u.test(record.text)
  ));
  expect(englishRecord).toBeDefined();
  expect(englishRecord?.tokens.slice(0, 3)).toEqual(['T', 'h', 'e']);
});

interface SetupConfig {
  taskName: string;
  category: string | string[];
  outputType: string | string[];
  inputType: string;
  dataFile: string;
  roles: Record<string, string>;
}

async function setupAndGoToStep2(page: Page, config: SetupConfig) {
  await page.goto(TASK_NEW_URL, { waitUntil: 'load' });
  await page.waitForFunction(
    () => document.querySelectorAll('#taskCategoryChips [data-key]').length > 0,
    null,
    { timeout: 30000 },
  );

  await page.fill('#taskNameInput', config.taskName);

  const categories = Array.isArray(config.category)
    ? config.category
    : [config.category];
  for (const cat of categories) {
    await page.locator(`#taskCategoryChips [data-key="${cat}"]`).click();
  }

  // Input type must be selected before output types so the taxonomy can apply
  // any granularity constraints before rendering the output choices.
  await page.locator(`#taskInputTypeChips [data-key="${config.inputType}"]`).click();

  const outputTypes = Array.isArray(config.outputType)
    ? config.outputType
    : [config.outputType];
  for (const ot of outputTypes) {
    await page.locator(`#taskOutputTypeChips [data-key="${ot}"]`).click();
  }

  await page.locator('#datasetFileInput').setInputFiles(
    path.join(EXAMPLE_DATA, config.dataFile),
  );
  await expect(page.locator('.inline-dataset-preview-wrap')).toBeVisible();

  for (const [col, role] of Object.entries(config.roles)) {
    await page
      .locator(`.inline-preview-role-select[aria-label$="${col}"]`)
      .selectOption(role);
  }

  await page.evaluate(() => {
    window.revalidateCurrentStep?.();
  });
  await page.waitForTimeout(200);

  await page.locator('#nextBtn').click();
  await expect(page.locator('#step2Panel')).not.toHaveClass(/hidden/);
}

async function clearSemanticRelationTypes(page: Page) {
  const relationAccordion = page.locator(
    '[data-output-key="relation_identification"]',
  );
  const removeButtons = relationAccordion.locator('.tag-pill-remove');
  while ((await removeButtons.count()) > 0) {
    await removeButtons.first().click();
  }
}

interface LabelOption {
  name: string;
  color: string;
}

interface DimensionConfig {
  name: string;
  min: number;
  max: number;
  step: number;
}

interface OutputConfig {
  label_options?: LabelOption[];
  dimensions?: DimensionConfig[];
  dimension_name?: string;
  min?: number;
  max?: number;
  step?: number;
  _autoPopulated?: boolean;
  [key: string]: unknown;
}

interface PreviewStateEntry {
  selected?: string | string[];
  value?: number;
  text?: string;
  activeType?: string;
  markers?: { position: number; type: string }[];
  tokens?: string[];
  _seeded?: boolean;
  [key: string]: unknown;
}

interface Triple {
  subj: string;
  rel: string;
  obj: string;
}

interface Entity {
  text: string;
  type: string;
  start: number;
  end: number;
  color: string;
}

type WindowState = {
  outputConfigs: Record<string, OutputConfig>;
  previewState: Record<string, PreviewStateEntry>;
  previewTriples: Triple[];
  previewEntities: Entity[];
};

function getState(page: Page, key: string) {
  return page.evaluate(
    (k) => window.state?.[k],
    key,
  );
}

// FR-003g-2: output types without rendersEvidencePreview keep Evidence hidden.
// The legacy card class guards against a verbatim revert; `evidenceText`
// must be a substring unique to the evidence field so the check also catches
// re-introduction under different markup for non-generation previews.
async function expectNoEvidenceInPreview(page: Page, evidenceText?: string) {
  const preview = page.locator('#annotationPreview');
  await expect(preview.locator('.sp-evidence-card')).toHaveCount(0);
  if (evidenceText) {
    await expect(preview).not.toContainText(evidenceText);
  }
}

async function expectGenericInputPreview(
  page: Page,
  expected: 'visible' | 'hidden',
) {
  const genericInput = page
    .locator('#annotationPreview')
    .locator(':scope > .annotation-preview-pair, :scope > .annotation-preview-sample');
  await expect(genericInput).toHaveCount(expected === 'visible' ? 1 : 0);
}

async function selectPreviewText(page: Page, text: string) {
  await page.evaluate((selectedText) => {
    const textElement = document.querySelector(
      '#annotationPreview .absa-preview-text',
    );
    if (!textElement) throw new Error('Entity Recognition preview text not found');

    const walker = document.createTreeWalker(
      textElement,
      NodeFilter.SHOW_TEXT,
    );
    const range = document.createRange();
    let startNode: Text | null = null;
    let startOffset = 0;
    let endNode: Text | null = null;
    let endOffset = 0;
    let consumed = 0;
    let node = walker.nextNode();
    const selectionStart = textElement.textContent?.indexOf(selectedText) ?? -1;
    const selectionEnd = selectionStart + selectedText.length;

    while (node) {
      const content = node.textContent || '';
      const nodeStart = consumed;
      const nodeEnd = consumed + content.length;

      if (selectionStart >= nodeStart && selectionStart < nodeEnd) {
        startNode = node as Text;
        startOffset = selectionStart - nodeStart;
      }
      if (selectionEnd > nodeStart && selectionEnd <= nodeEnd) {
        endNode = node as Text;
        endOffset = selectionEnd - nodeStart;
      }
      if (startNode && endNode) break;

      consumed = nodeEnd;
      node = walker.nextNode();
    }

    if (!startNode || !endNode) {
      throw new Error(`Unable to select preview text: ${selectedText}`);
    }
    range.setStart(startNode, startOffset);
    range.setEnd(endNode, endOffset);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    textElement.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
  }, text);
}

// ─── 8 Basic Output Types ───────────────────────────────────

test.describe('Step 2 preview: all 8 output types with example data', () => {
  test.describe.configure({ mode: 'serial', retries: 2 });

  test('single_label — gold_label pre-selected, labels from unique values', async ({
    page,
  }) => {
    await setupAndGoToStep2(page, {
      taskName: 'single-label-test',
      category: 'classification',
      outputType: 'single_label',
      inputType: 'single_item',
      dataFile: 'single-label.json',
      roles: { text: 'input', gold_label: 'output' },
    });

    const cfg = await getState(page, 'outputConfigs') as WindowState['outputConfigs'];
    const labels = cfg.single_label.label_options!.map((l: LabelOption) => l.name);
    expect(labels).toContain('positive');
    expect(labels).toContain('negative');
    expect(labels).toContain('neutral');

    const ps = await getState(page, 'previewState') as WindowState['previewState'];
    expect(ps.single_label.selected).toBe('positive');
  });

  test('multi_label — gold_labels array parsed, labels pre-selected', async ({
    page,
  }) => {
    await setupAndGoToStep2(page, {
      taskName: 'multi-label-test',
      category: 'classification',
      outputType: 'multi_label',
      inputType: 'single_item',
      dataFile: 'multi-label.json',
      roles: { text: 'input', gold_labels: 'output' },
    });

    const cfg = await getState(page, 'outputConfigs') as WindowState['outputConfigs'];
    const labels = cfg.multi_label.label_options!.map((l: LabelOption) => l.name);
    expect(labels.length).toBeGreaterThanOrEqual(3);

    const ps = await getState(page, 'previewState') as WindowState['previewState'];
    expect(ps.multi_label.selected!.length).toBeGreaterThanOrEqual(1);
  });

  test('free_text — Evidence, Input, and pre-filled answer render in order', async ({
    page,
  }) => {
    await setupAndGoToStep2(page, {
      taskName: 'free-text-test',
      category: 'generation',
      outputType: 'free_text',
      inputType: 'single_item',
      dataFile: 'free-text.json',
      roles: { text: 'input', gold_answer: 'output', reference: 'evidence' },
    });

    const ps = await getState(page, 'previewState') as WindowState['previewState'];
    expect(ps.free_text.text!).toBeTruthy();
    expect(typeof ps.free_text.text).toBe('string');
    expect(ps.free_text.text!.length).toBeGreaterThan(0);

    const textarea = page.locator('#annotationPreview textarea');
    await expect(textarea).toBeVisible();
    await expect(textarea).toHaveValue(
      '台灣癌症存活率逾六成，但近半患者有情緒困擾。癌症希望基金會於台北設立專屬諮商所，提供每人最多六次免費心理諮商。',
    );

    const preview = page.locator('#annotationPreview');
    await expect(
      preview.getByText('自由文字', { exact: true }),
    ).toHaveCount(0);
    await expect(
      preview.locator('.annotation-preview-divider'),
    ).toHaveCount(0);
    await expect(
      preview.getByText('gold_answer', { exact: true }),
    ).toHaveCount(0);
    const evidenceHeading = preview.getByText('背景參考 (Evidence)', {
      exact: true,
    });
    const evidenceContent = preview.getByText(
      /癌症希望基金會在台北成立癌友專屬心理諮商所/,
    );
    const inputContent = preview.getByText(
      /台灣癌症五年存活率已突破六成/,
    );
    await expect(evidenceHeading).toBeVisible();
    await expect(evidenceContent).toBeVisible();
    await expect(inputContent).toBeVisible();

    const order = await preview.evaluate((root) => {
      const evidence = root.querySelector('[data-testid="generation-evidence-preview"]');
      const input = root.querySelector('[data-testid="generation-input-preview"]');
      const answer = root.querySelector('[data-testid="generation-answer-input"]');
      if (!evidence || !input || !answer) return [];
      return [evidence, input, answer]
        .map((node) => Array.from(root.querySelectorAll('*')).indexOf(node));
    });
    expect(order).toHaveLength(3);
    expect(order[0]).toBeLessThan(order[1]);
    expect(order[1]).toBeLessThan(order[2]);
  });

  test('free_text — answer stays blank when no Output field is selected', async ({
    page,
  }) => {
    await setupAndGoToStep2(page, {
      taskName: 'free-text-blank-answer-test',
      category: 'generation',
      outputType: 'free_text',
      inputType: 'single_item',
      dataFile: 'free-text.json',
      roles: { text: 'input', reference: 'evidence' },
    });

    const textarea = page.getByTestId('generation-answer-input');
    await expect(textarea).toBeVisible();
    await expect(textarea).toHaveValue('');
    await expect(
      page.locator('#annotationPreview').getByText('回答', { exact: true }),
    ).toHaveCount(0);
  });

  for (const outputTypes of [
    ['free_text', 'entity_recognition'],
    ['entity_recognition', 'free_text'],
  ]) {
    test(`free_text — mixed output order ${outputTypes.join(' → ')} keeps Input before answer`, async ({
      page,
    }) => {
      await setupAndGoToStep2(page, {
        taskName: `free-text-mixed-${outputTypes.join('-')}`,
        category: ['generation', 'sequence'],
        outputType: outputTypes,
        inputType: 'single_item',
        dataFile: 'free-text.json',
        roles: { text: 'input', gold_answer: 'output', reference: 'evidence' },
      });

      const preview = page.locator('#annotationPreview');
      const order = await preview.evaluate((root) => {
        const evidence = root.querySelector(
          '[data-testid="generation-evidence-preview"]',
        );
        const input = root.querySelector('.absa-preview-text');
        const answer = root.querySelector(
          '[data-testid="generation-answer-input"]',
        );
        if (!evidence || !input || !answer) return [];
        const descendants = Array.from(root.querySelectorAll('*'));
        return [evidence, input, answer].map((node) =>
          descendants.indexOf(node),
        );
      });

      expect(order).toHaveLength(3);
      expect(order[0]).toBeLessThan(order[1]);
      expect(order[1]).toBeLessThan(order[2]);
    });
  }

  test('single_dim — gold_score shown on slider', async ({ page }) => {
    await setupAndGoToStep2(page, {
      taskName: 'single-dim-test',
      category: 'regression',
      outputType: 'single_dim',
      inputType: 'single_item',
      dataFile: 'single-dim.json',
      roles: { text: 'input', gold_score: 'output' },
    });

    const ps = await getState(page, 'previewState') as WindowState['previewState'];
    expect(ps.single_dim.value).toBeDefined();
    expect(typeof ps.single_dim.value).toBe('number');

    const slider = page.getByTestId('single-dim-slider');
    const valueTooltip = page.getByTestId('single-dim-value-tooltip');
    const valueInput = page.getByTestId('single-dim-value-input');
    await expect(slider).toBeVisible();
    await expect(valueInput).toHaveAttribute('type', 'number');
    await expect(valueInput).toHaveAttribute('step', 'any');
    await expect(valueTooltip).toHaveText(await slider.inputValue());
    await expect(valueInput).toHaveValue(await slider.inputValue());

    await valueInput.fill('');
    await valueInput.pressSequentially('3.5');
    await valueInput.blur();
    await expect(valueInput).toHaveValue('3.5');
    await expect(slider).toHaveValue('3.5');
    await expect(valueTooltip).toHaveText('3.5');

    await slider.focus();
    await slider.press('Home');
    await expect(valueTooltip).toHaveText(await slider.inputValue());
    await expect(valueInput).toHaveValue(await slider.inputValue());
    const before = await valueTooltip.boundingBox();
    await slider.press('ArrowRight');
    const after = await valueTooltip.boundingBox();

    await expect(valueTooltip).toHaveText(await slider.inputValue());
    await expect(valueInput).toHaveValue(await slider.inputValue());
    expect(before).not.toBeNull();
    expect(after).not.toBeNull();
    expect(after!.x).toBeGreaterThan(before!.x);

    await valueInput.fill('999');
    await valueInput.blur();
    await expect(valueInput).toHaveValue(await slider.getAttribute('max') ?? '');
    await expect(slider).toHaveValue(await slider.getAttribute('max') ?? '');
  });

  test('multi_dim — dimensions auto-populated from gold_scores object', async ({
    page,
  }) => {
    await setupAndGoToStep2(page, {
      taskName: 'multi-dim-test',
      category: 'regression',
      outputType: 'multi_dim',
      inputType: 'single_item',
      dataFile: 'multi-dim.json',
      roles: { source: 'input', gold_scores: 'output' },
    });

    const cfg = await getState(page, 'outputConfigs') as WindowState['outputConfigs'];
    const dims = cfg.multi_dim.dimensions!.map((d: DimensionConfig) => d.name);
    expect(dims).toContain('fluency');
    expect(dims).toContain('adequacy');
    expect(dims).toContain('coherence');

    const controls = page.getByTestId('multi-dim-control');
    await expect(controls).toHaveCount(dims.length);
    const dimensionColors = await controls.evaluateAll((nodes) =>
      nodes.map((node) =>
        getComputedStyle(node).getPropertyValue('--regression-dimension-color').trim(),
      ),
    );
    expect(new Set(dimensionColors).size).toBe(dimensionColors.length);

    const sliders = page.getByTestId('multi-dim-slider');
    const valueTooltips = page.getByTestId('multi-dim-value-tooltip');
    const valueInputs = page.getByTestId('multi-dim-value-input');
    await expect(sliders).toHaveCount(dims.length);
    await expect(valueTooltips).toHaveCount(dims.length);
    await expect(valueInputs).toHaveCount(dims.length);
    for (let index = 0; index < dims.length; index += 1) {
      await expect(valueTooltips.nth(index)).toHaveText(await sliders.nth(index).inputValue());
      await expect(valueInputs.nth(index)).toHaveValue(await sliders.nth(index).inputValue());
    }

    await valueInputs.first().fill('2.5');
    await valueInputs.first().blur();
    await expect(valueInputs.first()).toHaveValue('2.5');
    await expect(sliders.first()).toHaveValue('2.5');
    await expect(valueTooltips.first()).toHaveText('2.5');
  });

  test('single_dim and multi_dim use the same dimension settings card', async ({
    page,
  }) => {
    await setupAndGoToStep2(page, {
      taskName: 'single-dim-settings-card-test',
      category: 'regression',
      outputType: 'single_dim',
      inputType: 'single_item',
      dataFile: 'single-dim.json',
      roles: { text: 'input', gold_score: 'output' },
    });

    const singleAccordion = page.locator(
      '.output-accordion[data-output-key="single_dim"]',
    );
    const singleCard = singleAccordion.getByTestId(
      'regression-dimension-settings-card',
    );
    await expect(singleCard).toHaveCount(1);
    await expect(
      singleCard.getByTestId('regression-dimension-name-input'),
    ).toHaveCount(1);
    await expect(
      singleCard.getByTestId('regression-dimension-min-input'),
    ).toHaveCount(1);
    await expect(
      singleCard.getByTestId('regression-dimension-max-input'),
    ).toHaveCount(1);
    await expect(
      singleCard.getByTestId('regression-dimension-step-input'),
    ).toHaveCount(1);
    await expect(
      singleAccordion.getByTestId('regression-dimension-add-btn'),
    ).toHaveCount(0);
    await expect(
      singleAccordion.getByTestId('regression-dimension-remove-btn'),
    ).toHaveCount(0);

    await singleCard
      .getByTestId('regression-dimension-name-input')
      .fill('quality');
    const singleConfig = await getState(
      page,
      'outputConfigs',
    ) as WindowState['outputConfigs'];
    expect(singleConfig.single_dim.dimension_name).toBe('quality');

    const singleCardStyle = await singleCard.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        className: element.className,
        backgroundColor: style.backgroundColor,
        borderRadius: style.borderRadius,
        padding: style.padding,
      };
    });

    await setupAndGoToStep2(page, {
      taskName: 'multi-dim-settings-card-test',
      category: 'regression',
      outputType: 'multi_dim',
      inputType: 'single_item',
      dataFile: 'multi-dim.json',
      roles: { source: 'input', gold_scores: 'output' },
    });

    const multiAccordion = page.locator(
      '.output-accordion[data-output-key="multi_dim"]',
    );
    const multiCards = multiAccordion.getByTestId(
      'regression-dimension-settings-card',
    );
    const multiConfig = await getState(
      page,
      'outputConfigs',
    ) as WindowState['outputConfigs'];
    const dimensionCount = multiConfig.multi_dim.dimensions!.length;

    await expect(multiCards).toHaveCount(dimensionCount);
    await expect(
      multiAccordion.getByText('維度設定', { exact: true }),
    ).toHaveCount(0);
    await expect(
      multiAccordion.getByTestId('regression-dimension-name-input'),
    ).toHaveCount(dimensionCount);
    await expect(
      multiAccordion.getByTestId('regression-dimension-remove-btn'),
    ).toHaveCount(dimensionCount);
    await expect(
      multiAccordion.getByTestId('regression-dimension-add-btn'),
    ).toHaveCount(1);

    await multiCards
      .first()
      .getByTestId('regression-dimension-name-input')
      .fill('clarity');
    const updatedMultiConfig = await getState(
      page,
      'outputConfigs',
    ) as WindowState['outputConfigs'];
    expect(updatedMultiConfig.multi_dim.dimensions![0].name).toBe('clarity');

    await multiAccordion.getByTestId('regression-dimension-add-btn').click();
    await expect(multiCards).toHaveCount(dimensionCount + 1);
    await multiAccordion
      .getByTestId('regression-dimension-remove-btn')
      .last()
      .click();
    await expect(multiCards).toHaveCount(dimensionCount);

    const multiCardStyle = await multiCards.first().evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        className: element.className,
        backgroundColor: style.backgroundColor,
        borderRadius: style.borderRadius,
        padding: style.padding,
      };
    });
    expect(multiCardStyle).toEqual(singleCardStyle);
  });

  test('Sequence Tagging — visible pre_tags parsed as array', async ({ page }) => {
    await setupAndGoToStep2(page, {
      taskName: 'sequence-tagging-test',
      category: 'sequence',
      outputType: 'sequence_tagging',
      inputType: 'single_item',
      dataFile: 'sequence-tagging.json',
      roles: { text: 'input', pre_tags: 'output' },
    });

    const preview = page.locator('#annotationPreview');
    await expect(preview).toBeVisible();

    const ps = await getState(page, 'previewState') as WindowState['previewState'];
    expect(ps.sequence_tagging).toBeDefined();
    await expectGenericInputPreview(page, 'hidden');
  });

  test('Sequence Tagging — switches character and word units and updates the token preview', async ({
    page,
  }) => {
    await setupAndGoToStep2(page, {
      taskName: 'sequence-tagging-token-unit-switch-test',
      category: 'sequence',
      outputType: 'sequence_tagging',
      inputType: 'single_item',
      dataFile: 'sequence-tagging.json',
      roles: { text: 'input' },
    });

    const preview = page.locator('#annotationPreview');
    const sequenceSettings = page.locator(
      '.output-accordion[data-output-key="sequence_tagging"]',
    );
    const unitSelect = page.getByTestId('sequence-token-unit-select');
    const sourceText = preview.getByTestId('sequence-source-text');
    await expect(
      preview.getByTestId('sequence-source-text-label'),
    ).toHaveText('原始文本');
    const tokens = preview.getByTestId('sequence-token');

    await expect(unitSelect.locator('option')).toHaveText([
      '字（Character）',
      '詞（Word）',
    ]);
    await expect(
      sequenceSettings.locator('.form-field > .field-label'),
    ).toHaveText(['標記單位*', '標籤類型*', '標記方案*']);
    await expect(unitSelect).toHaveValue('character');
    await expect(sourceText).toHaveText(
      '台積電董事長魏哲家今天出席台北國際半導體論壇並發表主題演講',
    );
    await expect(tokens.nth(0).getByTestId('sequence-token-text')).toHaveText('台');
    await expect(tokens.nth(1).getByTestId('sequence-token-text')).toHaveText('積');
    await expect(tokens.nth(2).getByTestId('sequence-token-text')).toHaveText('電');
    const characterCount = await tokens.count();

    await unitSelect.selectOption('word');
    await expect(sourceText).toHaveText(
      '台積電董事長魏哲家今天出席台北國際半導體論壇並發表主題演講',
    );
    await expect(
      tokens.filter({ has: page.getByTestId('sequence-token-text').filter({ hasText: /^董事長$/ }) }),
    ).toHaveCount(1);
    await expect(tokens).not.toHaveCount(characterCount);
    expect(await tokens.count()).toBeLessThan(characterCount);

    const outputConfigsAfterWord = await getState(
      page,
      'outputConfigs',
    ) as WindowState['outputConfigs'];
    expect(outputConfigsAfterWord.sequence_tagging.tokenization).toEqual({
      unit: 'word',
      mode: 'unit_based',
      punctuation: 'separate',
      version: 2,
    });

    await page.evaluate(() => {
      const state = window.state as {
        datasetRawFirstRow?: Record<string, unknown>;
        previewState?: Record<string, unknown>;
      };
      if (state.datasetRawFirstRow) {
        state.datasetRawFirstRow.text = 'The chairman of TSMC.';
      }
      state.previewState = {};
      window.updateAnnotationPreview?.();
    });

    await expect(tokens.nth(0).getByTestId('sequence-token-text')).toHaveText('The');
    await expect(tokens.nth(1).getByTestId('sequence-token-text')).toHaveText('chairman');
    await expect(tokens.last().getByTestId('sequence-token-text')).toHaveText('.');

    await unitSelect.selectOption('character');
    await expect(sourceText).toHaveText('The chairman of TSMC.');
    await expect(tokens.nth(0).getByTestId('sequence-token-text')).toHaveText('T');
    await expect(tokens.nth(1).getByTestId('sequence-token-text')).toHaveText('h');
    await expect(tokens.nth(2).getByTestId('sequence-token-text')).toHaveText('e');
  });

  test('Sequence Tagging — restores visible pre-annotations after switching the unit away and back', async ({
    page,
  }) => {
    await setupAndGoToStep2(page, {
      taskName: 'sequence-tagging-unit-roundtrip-test',
      category: 'sequence',
      outputType: 'sequence_tagging',
      inputType: 'single_item',
      dataFile: 'sequence-tagging.json',
      roles: { text: 'input', pre_tags: 'output' },
    });

    const preview = page.locator('#annotationPreview');
    const unitSelect = page.getByTestId('sequence-token-unit-select');
    const tokens = preview.getByTestId('sequence-token');
    const alignmentError = preview.getByTestId('sequence-token-alignment-error');

    await expect(tokens.nth(0).getByTestId('sequence-token-tag')).toHaveText('B-ORG');
    await expect(tokens.nth(1).getByTestId('sequence-token-tag')).toHaveText('I-ORG');

    await unitSelect.selectOption('word');
    await expect(alignmentError).toBeVisible();
    await expect(page.locator('#nextBtn')).toBeDisabled();

    await unitSelect.selectOption('character');
    await expect(alignmentError).toHaveCount(0);
    await expect(tokens.nth(0).getByTestId('sequence-token-tag')).toHaveText('B-ORG');
    await expect(tokens.nth(1).getByTestId('sequence-token-tag')).toHaveText('I-ORG');
    await expect(tokens.nth(2).getByTestId('sequence-token-tag')).toHaveText('I-ORG');
    await expect(page.locator('#nextBtn')).toBeEnabled();
  });

  test('Sequence Tagging — Bypass-cleared tags stay cleared across a unit round-trip', async ({
    page,
  }) => {
    await setupAndGoToStep2(page, {
      taskName: 'sequence-tagging-bypass-unit-roundtrip-test',
      category: 'sequence',
      outputType: 'sequence_tagging',
      inputType: 'single_item',
      dataFile: 'sequence-tagging.json',
      roles: { text: 'input', pre_tags: 'output' },
    });

    const preview = page.locator('#annotationPreview');
    const unitSelect = page.getByTestId('sequence-token-unit-select');
    const tokens = preview.getByTestId('sequence-token');
    const bypassToggle = preview.getByRole('button', { name: '無法判定 (Bypass)' });

    await expect(tokens.nth(0).getByTestId('sequence-token-tag')).toHaveText('B-ORG');

    await bypassToggle.click();
    await expect(bypassToggle).toHaveAttribute('aria-pressed', 'true');
    await expect(tokens.nth(0).getByTestId('sequence-token-tag')).toHaveText('O');

    await unitSelect.selectOption('word');
    await unitSelect.selectOption('character');

    await expect(bypassToggle).toHaveAttribute('aria-pressed', 'true');
    await expect(tokens.nth(0).getByTestId('sequence-token-tag')).toHaveText('O');
    await expect(tokens.nth(1).getByTestId('sequence-token-tag')).toHaveText('O');
    await expect(tokens.nth(2).getByTestId('sequence-token-tag')).toHaveText('O');
  });

  test('Sequence Tagging — mismatch error names the aligned unit and offers both remedies', async ({
    page,
  }) => {
    await setupAndGoToStep2(page, {
      taskName: 'sequence-tagging-unit-mismatch-hint-test',
      category: 'sequence',
      outputType: 'sequence_tagging',
      inputType: 'single_item',
      dataFile: 'sequence-tagging.json',
      roles: { text: 'input', pre_tags: 'output' },
    });

    const alignmentError = page.getByTestId('sequence-token-alignment-error');
    await page.getByTestId('sequence-token-unit-select').selectOption('word');

    await expect(alignmentError).toContainText('預標記數量（29）與 Token 數量');
    await expect(alignmentError).toContainText('與「字（Character）」單位對齊');
    await expect(alignmentError).toContainText('切回「字」');
    await expect(alignmentError).toContainText('符合「詞」單位的預標記');
  });

  test('Sequence Tagging — supports BIO, BIOES, IOB2, and single-label schemes', async ({
    page,
  }) => {
    await setupAndGoToStep2(page, {
      taskName: 'sequence-tagging-token-unit-test',
      category: 'sequence',
      outputType: 'sequence_tagging',
      inputType: 'single_item',
      dataFile: 'sequence-tagging.json',
      roles: { text: 'input' },
    });

    const preview = page.locator('#annotationPreview');
    await expect(
      preview.getByTestId('sequence-source-text'),
    ).toHaveText('台積電董事長魏哲家今天出席台北國際半導體論壇並發表主題演講');

    const schemeSelect = page.getByTestId('sequence-tagging-scheme-select');
    await expect(schemeSelect.locator('option')).toHaveText([
      'BIO',
      'BIOES',
      'IOB2',
      '單一標籤',
    ]);
    const outputConfigs = await getState(
      page,
      'outputConfigs',
    ) as WindowState['outputConfigs'];
    expect(outputConfigs.sequence_tagging.tokenization).toEqual({
      unit: 'character',
      mode: 'unit_based',
      punctuation: 'separate',
      version: 2,
    });

    const tokens = preview.getByTestId('sequence-token');
    await expect(tokens.nth(0).getByTestId('sequence-token-text')).toHaveText('台');
    await expect(tokens.nth(1).getByTestId('sequence-token-text')).toHaveText('積');
    await expect(tokens.nth(2).getByTestId('sequence-token-text')).toHaveText('電');

    await schemeSelect.selectOption('BIOES');
    await preview.getByRole('button', { name: 'B-ORG', exact: true }).click();
    await tokens.nth(0).click();
    await preview.getByRole('button', { name: 'I-ORG', exact: true }).click();
    await tokens.nth(1).click();
    await preview.getByRole('button', { name: 'E-ORG', exact: true }).click();
    await tokens.nth(2).click();
    await expect(tokens.nth(0).getByTestId('sequence-token-tag')).toHaveText('B-ORG');
    await expect(tokens.nth(1).getByTestId('sequence-token-tag')).toHaveText('I-ORG');
    await expect(tokens.nth(2).getByTestId('sequence-token-tag')).toHaveText('E-ORG');

    await preview.getByRole('button', { name: 'S-ORG', exact: true }).click();
    await tokens.nth(3).click();
    await expect(tokens.nth(3).getByTestId('sequence-token-tag')).toHaveText('S-ORG');

    await schemeSelect.selectOption('IOB2');
    await expect(preview.getByTestId('sequence-scheme-help')).toContainText(
      '相鄰同類實體',
    );
    await preview.getByRole('button', { name: 'B-ORG', exact: true }).click();
    await tokens.nth(0).click();
    await tokens.nth(1).click();
    await expect(tokens.nth(0).getByTestId('sequence-token-tag')).toHaveText('B-ORG');
    await expect(tokens.nth(1).getByTestId('sequence-token-tag')).toHaveText('B-ORG');

    await schemeSelect.selectOption('SINGLE');
    await expect(preview.getByTestId('sequence-scheme-help')).toContainText(
      '不含位置前綴',
    );
    await expect(tokens.nth(0).getByTestId('sequence-token-tag')).toHaveText('ORG');
    await expect(tokens.nth(1).getByTestId('sequence-token-tag')).toHaveText('ORG');
    await expect(tokens.nth(2).getByTestId('sequence-token-tag')).toHaveText('ORG');
  });

  test('Sequence Tagging — blocks mismatched token and pre-annotation counts with a locatable error', async ({
    page,
  }) => {
    await setupAndGoToStep2(page, {
      taskName: 'sequence-tagging-alignment-test',
      category: 'sequence',
      outputType: 'sequence_tagging',
      inputType: 'single_item',
      dataFile: 'sequence-tagging.json',
      roles: { text: 'input', pre_tags: 'output' },
    });

    await page.evaluate(() => {
      const state = window.state as {
        datasetRawFirstRow?: Record<string, unknown>;
        previewState?: Record<string, unknown>;
      };
      if (state.datasetRawFirstRow) {
        state.datasetRawFirstRow.pre_tags = ['B-ORG'];
      }
      state.previewState = {};
      window.updateAnnotationPreview?.();
      window.revalidateCurrentStep?.();
    });

    await expect(
      page.getByRole('alert').filter({ hasText: 'Token 數量' }),
    ).toContainText('預標記數量');
    await expect(page.locator('#nextBtn')).toBeDisabled();
  });

  test('Entity Recognition — gold_entities shown in preview', async ({ page }) => {
    await setupAndGoToStep2(page, {
      taskName: 'entity-recognition-test',
      category: 'sequence',
      outputType: 'entity_recognition',
      inputType: 'single_item',
      dataFile: 'entity-recognition.json',
      roles: { text: 'input', gold_entities: 'output' },
    });

    const preview = page.locator('#annotationPreview');
    await expect(preview).toBeVisible();

    const inited = await getState(page, 'previewInited');
    expect(inited).toBe(true);

    const entities = (await getState(page, 'previewEntities')) as Entity[];
    expect(entities.length).toBeGreaterThanOrEqual(1);
    await expectGenericInputPreview(page, 'hidden');
  });

  test('Entity Recognition — creates entities in either selection order without prompting', async ({
    page,
  }) => {
    await setupAndGoToStep2(page, {
      taskName: 'entity-recognition-selection-order-test',
      category: 'sequence',
      outputType: 'entity_recognition',
      inputType: 'single_item',
      dataFile: 'entity-recognition.json',
      roles: { text: 'input', gold_entities: 'output' },
    });

    const preview = page.locator('#annotationPreview');
    const initialEntities = (await getState(page, 'previewEntities')) as Entity[];

    await selectPreviewText(page, '這款');
    await expect(preview).not.toContainText('請選擇實體類型');
    await expect(preview.locator('.rel-sel-highlight')).toHaveText('這款');
    expect((await getState(page, 'previewEntities') as Entity[])).toHaveLength(
      initialEntities.length,
    );

    await selectPreviewText(page, '手指');
    await expect(preview.locator('.rel-sel-highlight')).toHaveText('手指');
    await preview.getByRole('button', { name: 'target', exact: true }).click();
    expect(await getState(page, 'previewEntities')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ text: '手指', type: 'target', start: 35, end: 36 }),
      ]),
    );
    expect(await getState(page, 'activeEntityType')).toBe('target');

    await preview.getByRole('button', { name: 'aspect', exact: true }).click();
    await selectPreviewText(page, '打字');
    expect(await getState(page, 'previewEntities')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ text: '打字', type: 'aspect', start: 31, end: 32 }),
      ]),
    );
  });

  test('Entity Recognition — pending selection is dropped when the output composition changes', async ({
    page,
  }) => {
    await setupAndGoToStep2(page, {
      taskName: 'entity-recognition-pending-mode-switch-test',
      category: 'sequence',
      outputType: 'entity_recognition',
      inputType: 'single_item',
      dataFile: 'entity-recognition.json',
      roles: { text: 'input', gold_entities: 'output' },
    });

    const preview = page.locator('#annotationPreview');
    await selectPreviewText(page, '這款');
    await expect(preview.locator('.rel-sel-highlight')).toHaveText('這款');

    // Adding relation_identification swaps the preview to the composite
    // renderer — the uncommitted highlight must not leak into it.
    await page.locator('#prevBtn').click();
    await page
      .locator('#taskOutputTypeChips [data-key="relation_identification"]')
      .click();
    await page.locator('#nextBtn').click();
    await expect(page.locator('#step2Panel')).not.toHaveClass(/hidden/);
    await expect(preview.locator('.rel-sel-highlight')).toHaveCount(0);

    // Removing it again must not resurrect the stale standalone highlight.
    await page.locator('#prevBtn').click();
    await page
      .locator('#taskOutputTypeChips [data-key="relation_identification"]')
      .click();
    await page.locator('#nextBtn').click();
    await expect(page.locator('#step2Panel')).not.toHaveClass(/hidden/);
    await expect(preview.locator('.rel-sel-highlight')).toHaveCount(0);
  });

  test('Relation Identification — triples loaded with subj/rel/obj format', async ({
    page,
  }) => {
    await setupAndGoToStep2(page, {
      taskName: 'relation-identification-test',
      category: 'sequence',
      outputType: 'relation_identification',
      inputType: 'single_item',
      dataFile: 'relation-identification.json',
      roles: { text: 'input', triples: 'output' },
    });

    const triples = (await getState(page, 'previewTriples')) as Triple[];
    expect(triples.length).toBeGreaterThanOrEqual(1);
    expect(triples[0]).toHaveProperty('subj');
    expect(triples[0]).toHaveProperty('rel');
    expect(triples[0]).toHaveProperty('obj');

    const cfg = await getState(page, 'outputConfigs') as WindowState['outputConfigs'];
    expect(cfg.relation_identification).not.toHaveProperty('source_output');

    const code = await page.evaluate(() => {
      const editor = document.getElementById('codeEditor') as HTMLTextAreaElement;
      return editor?.value || '';
    });
    expect(code).not.toContain('source_output');

    // Standalone Relation Identification keeps pre-annotated entity highlights as
    // read-only context and exposes only relation controls. Entity editing is
    // reserved for the explicit Entity Recognition + Relation Identification composition.
    const preview = page.locator('#annotationPreview');
    await expect(preview).not.toContainText('整合預覽');
    await expect(preview).not.toContainText('實體類型');
    await expect(preview).not.toContainText('實體列表');
    await expect(preview).toContainText('關係識別');
    expect(await preview.locator('select').count()).toBe(0);
    await expect(preview.getByRole('button', { name: 'E1/Arg1' })).toBeEnabled();
    await expect(preview.getByRole('button', { name: 'Relation', exact: true })).toBeDisabled();
    await expect(preview.getByRole('button', { name: 'E2/Arg2' })).toBeDisabled();
    await expectGenericInputPreview(page, 'hidden');
  });

  test('Relation Identification — semantic types are optional and control type actions', async ({
    page,
  }) => {
    await setupAndGoToStep2(page, {
      taskName: 'optional-relation-types-test',
      category: 'sequence',
      outputType: 'relation_identification',
      inputType: 'single_item',
      dataFile: 'relation-identification.json',
      roles: { text: 'input', triples: 'output' },
    });

    const relationAccordion = page.locator(
      '[data-output-key="relation_identification"]',
    );
    const semanticTypeLabel = relationAccordion
      .locator('.field-label')
      .filter({ hasText: '語意類型標籤' });
    const preview = page.locator('#annotationPreview');

    await expect(semanticTypeLabel).toHaveText('語意類型標籤');
    await expect(preview).not.toContainText('關係識別預覽');
    await expect(
      preview.getByRole('button', { name: '類型', exact: true }).first(),
    ).toBeVisible();

    await clearSemanticRelationTypes(page);

    await expect(page.locator('#nextBtn')).toBeEnabled();
    await expect(
      preview.getByRole('button', { name: '類型', exact: true }),
    ).toHaveCount(0);

    await relationAccordion.locator('.tag-new-input').fill('causal');
    await relationAccordion.locator('.tag-new-input').press('Enter');
    await expect(
      preview.getByRole('button', { name: '類型', exact: true }).first(),
    ).toBeVisible();
  });

});

// ─── 4 Composite Tasks ─────────────────────────────────────

test.describe('Step 2 preview: composite task data files', () => {
  test.describe.configure({ mode: 'serial', retries: 2 });

  test('nli.json — item_pair single_label with Premise/Hypothesis', async ({
    page,
  }) => {
    await setupAndGoToStep2(page, {
      taskName: 'nli-composite-test',
      category: 'classification',
      outputType: 'single_label',
      inputType: 'item_pair',
      dataFile: 'nli.json',
      roles: {
        Premise: 'input',
        Hypothesis: 'input',
        Label: 'output',
        Evidence: 'evidence',
      },
    });

    const cfg = await getState(page, 'outputConfigs') as WindowState['outputConfigs'];
    const labels = cfg.single_label.label_options!.map((l: LabelOption) => l.name);
    expect(labels).toContain('contradiction');
    expect(labels).toContain('entailment');

    const ps = await getState(page, 'previewState') as WindowState['previewState'];
    expect(ps.single_label.selected).toBe('contradiction');

    await expectNoEvidenceInPreview(page, '術前仍有必要');

    const preview = page.locator('#annotationPreview');
    await expect(
      preview.locator('.annotation-preview-task-title').filter({ hasText: '原始文本' }),
    ).toHaveCount(1);
    const pairLabels = preview.locator('.annotation-preview-pair-label');
    await expect(pairLabels).toHaveCount(2);
    await expect(pairLabels.nth(0)).toContainText('Premise');
    await expect(pairLabels.nth(1)).toContainText('Hypothesis');
  });

  test('mrc.json — free_text with background as evidence', async ({ page }) => {
    await setupAndGoToStep2(page, {
      taskName: 'mrc-composite-test',
      category: 'generation',
      outputType: 'free_text',
      inputType: 'single_item',
      dataFile: 'mrc.json',
      roles: {
        question: 'input',
        answer: 'output',
        background: 'evidence',
      },
    });

    const ps = await getState(page, 'previewState') as WindowState['previewState'];
    expect(ps.free_text.text!.length).toBeGreaterThan(50);

    const preview = page.locator('#annotationPreview');
    await expect(
      preview.getByTestId('generation-evidence-preview'),
    ).toContainText('免費心理諮商');

    const textarea = preview.getByTestId('generation-answer-input');
    await expect(textarea).toBeVisible();
    await expect(textarea).not.toBeEmpty();
  });

  test('medical-ner-re.json — dual output (Entity Recognition + Relation Identification) with entities and triples', async ({
    page,
  }) => {
    await setupAndGoToStep2(page, {
      taskName: 'medical-ner-re-test',
      category: 'sequence',
      outputType: ['entity_recognition', 'relation_identification'],
      inputType: 'single_item',
      dataFile: 'medical-ner-re.json',
      roles: { text: 'input', entities: 'output', triples: 'output' },
    });

    const triples = (await getState(page, 'previewTriples')) as Triple[];
    expect(triples.length).toBe(8);
    expect(triples[0].subj).toContain('左心耳');
    expect(triples[0].obj).toContain('左心房');

    const entities = (await getState(page, 'previewEntities')) as Entity[];
    expect(entities.length).toBe(11);

    const html = await page.locator('#annotationPreview').innerHTML();
    expect(html).toContain('整合預覽');

    const preview = page.locator('#annotationPreview');
    await expect(
      preview.locator('.annotation-preview-task-title').filter({ hasText: '整合預覽' }),
    ).toHaveText('整合預覽');
    await expect(preview).toContainText('實體類型');
    await expect(preview).toContainText('實體列表');

    // relation_types is auto-populated from the distinct semantic type labels
    // in the pre-labeled triples — NOT trigger words or hardcoded defaults.
    const cfg = (await getState(page, 'outputConfigs')) as WindowState['outputConfigs'];
    const relTypes = (cfg.relation_identification as { relation_types: string[] }).relation_types;
    expect(relTypes).toEqual(['bodyLocation', 'causes', 'adverseOutcome']);
    expect(relTypes).not.toContain('has_aspect');
    expect(relTypes).not.toContain('has_opinion');

    // The generated config must not leak the hardcoded defaults either.
    const code = await page.evaluate(() => {
      const editor = document.getElementById('codeEditor') as HTMLTextAreaElement;
      return editor?.value || '';
    });
    expect(code).not.toContain('has_aspect');
    expect(code).toContain('bodyLocation');
    expect(code).toContain('source_output: entity_recognition');
    await expectGenericInputPreview(page, 'hidden');

    const initialEntityCount = entities.length;
    await selectPreviewText(page, '囊袋狀');
    await expect(preview.locator('.rel-sel-highlight')).toHaveText('囊袋狀');
    expect((await getState(page, 'previewEntities') as Entity[])).toHaveLength(
      initialEntityCount,
    );

    await preview.getByRole('button', { name: 'BODY', exact: true }).click();
    expect(await getState(page, 'previewEntities')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ text: '囊袋狀', type: 'BODY', start: 16, end: 18 }),
      ]),
    );
    expect(await getState(page, 'activeEntityType')).toBe('BODY');

    await selectPreviewText(page, '小空腔');
    expect(await getState(page, 'previewEntities')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ text: '小空腔', type: 'BODY', start: 23, end: 25 }),
      ]),
    );
  });

  test('medical-ner-re.json — optional semantic types control composite type actions', async ({
    page,
  }) => {
    await setupAndGoToStep2(page, {
      taskName: 'optional-composite-relation-types-test',
      category: 'sequence',
      outputType: ['entity_recognition', 'relation_identification'],
      inputType: 'single_item',
      dataFile: 'medical-ner-re.json',
      roles: { text: 'input', entities: 'output', triples: 'output' },
    });

    const relationAccordion = page.locator(
      '[data-output-key="relation_identification"]',
    );
    const preview = page.locator('#annotationPreview');

    await expect(
      preview.getByRole('button', { name: '類型', exact: true }).first(),
    ).toBeVisible();

    await clearSemanticRelationTypes(page);

    await expect(page.locator('#nextBtn')).toBeEnabled();
    await expect(
      preview.getByRole('button', { name: '類型', exact: true }),
    ).toHaveCount(0);

    await relationAccordion.locator('.tag-new-input').fill('causal');
    await relationAccordion.locator('.tag-new-input').press('Enter');
    await expect(
      preview.getByRole('button', { name: '類型', exact: true }).first(),
    ).toBeVisible();
  });

  test('absa-va.json — triple output (Entity Recognition + Relation Identification + multi_dim) across two categories', async ({
    page,
  }) => {
    await setupAndGoToStep2(page, {
      taskName: 'absa-va-test',
      category: ['regression', 'sequence'],
      outputType: ['entity_recognition', 'relation_identification', 'multi_dim'],
      inputType: 'single_item',
      dataFile: 'absa-va.json',
      roles: {
        utterances: 'evidence',
        text: 'input',
        gold_triplets: 'output',
        incomplete_annotations: 'output',
      },
    });

    const triples = (await getState(page, 'previewTriples')) as Triple[];
    expect(triples.length).toBeGreaterThanOrEqual(2);
    expect(triples[0].subj).toContain('Note 10 plus');

    const cfg = await getState(page, 'outputConfigs') as WindowState['outputConfigs'];
    expect(Object.keys(cfg)).toContain('multi_dim');
    expect(Object.keys(cfg)).toContain('entity_recognition');
    expect(Object.keys(cfg)).toContain('relation_identification');

    const html = await page.locator('#annotationPreview').innerHTML();
    expect(html).toContain('整合預覽');
    await expect(
      page
        .locator('#annotationPreview .annotation-preview-task-title')
        .filter({ hasText: '整合預覽' }),
    ).toHaveText('整合預覽');
    expect(html).toContain('多維度回歸');
    expect(html).toContain('rottenrockteahouse');

    // No unique content probe: the input `text` column concatenates the
    // utterances, so every utterances substring also appears in input text.
    await expectNoEvidenceInPreview(page);
    await expectGenericInputPreview(page, 'hidden');
  });
});

// ─── Data Transformation Validation ───────────────────────

test.describe('Step 2 preview: data transformation and config integrity', () => {
  test.describe.configure({ mode: 'serial', retries: 2 });

  test('generated config does not contain _autoPopulated or other private keys', async ({
    page,
  }) => {
    await setupAndGoToStep2(page, {
      taskName: 'config-integrity-test',
      category: 'classification',
      outputType: 'single_label',
      inputType: 'single_item',
      dataFile: 'single-label.json',
      roles: { text: 'input', gold_label: 'output' },
    });

    const codeContent = await page.evaluate(() => {
      const editor = document.getElementById('codeEditor') as HTMLTextAreaElement;
      return editor?.value || '';
    });

    expect(codeContent).not.toContain('_autoPopulated');
    expect(codeContent).not.toContain('_seeded');
    expect(codeContent.length).toBeGreaterThan(0);
  });

  test('preview renders visible UI elements for seeded data', async ({
    page,
  }) => {
    await setupAndGoToStep2(page, {
      taskName: 'render-validation-test',
      category: 'regression',
      outputType: 'single_dim',
      inputType: 'single_item',
      dataFile: 'single-dim.json',
      roles: { text: 'input', gold_score: 'output' },
    });

    const preview = page.locator('#annotationPreview');
    await expect(preview).toBeVisible();

    const slider = preview.locator('input[type="range"]');
    await expect(slider).toBeVisible();

    const sliderValue = await slider.inputValue();
    expect(Number(sliderValue)).not.toBeNaN();
  });
});
