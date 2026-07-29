import { expect, test, type Locator, type Page } from '@playwright/test';

const TASK_LIST_URL =
  '/pages/task-management/task-list.html?task_role=project_leader';
const TASK_DETAIL_URL = '/pages/task-management/task-detail.html';

type FieldRole = 'evidence' | 'input' | 'output';

type TaskSeedExpectation = {
  id: string;
  sourceFile: string;
  nameZh: string;
  nameEn: string;
  selectedCategories: string[];
  inputType: 'single_item' | 'item_pair';
  outputs: string[];
  fieldRoleMap: Record<string, FieldRole>;
};

type TaskDetailExtensionSeed = {
  id: string;
  sourceFile: string;
  nameZh: string;
  nameEn: string;
  status: 'draft';
  selectedCategories: string[];
  inputType: 'single_item';
  fieldRoleMap: Record<string, FieldRole>;
  outputs: Array<{
    type: string;
    config: Record<string, unknown>;
  }>;
  dataset: {
    total: number;
    files: Array<{ name: string; size: number }>;
    columns: string[];
  };
};

declare global {
  interface Window {
    LabelSuiteTaskDetailDataExtensions?: TaskDetailExtensionSeed[];
  }
}

const TASK_SEEDS: TaskSeedExpectation[] = [
  {
    id: 'T001',
    sourceFile: 'single-label.json',
    nameZh: '醫療文本情感分類',
    nameEn: 'Medical Text Sentiment Classification',
    selectedCategories: ['classification'],
    inputType: 'single_item',
    outputs: ['single_label'],
    fieldRoleMap: { text: 'input', gold_label: 'output' },
  },
  {
    id: 'T002',
    sourceFile: 'multi-label.json',
    nameZh: '癌症歷程情緒多標籤分類',
    nameEn: 'Cancer Journey Emotion Multi-label Classification',
    selectedCategories: ['classification'],
    inputType: 'single_item',
    outputs: ['multi_label'],
    fieldRoleMap: { text: 'input', gold_labels: 'output' },
  },
  {
    id: 'T003',
    sourceFile: 'multi-label-hierarchical.json',
    nameZh: '病患情緒與照護情境階層分類',
    nameEn: 'Patient Emotion and Care Context Hierarchical Classification',
    selectedCategories: ['classification'],
    inputType: 'single_item',
    outputs: ['multi_label'],
    fieldRoleMap: { text: 'input', gold_labels: 'output' },
  },
  {
    id: 'T004',
    sourceFile: 'single-dim.json',
    nameZh: '醫療文本可讀性評分',
    nameEn: 'Medical Text Readability Scoring',
    selectedCategories: ['regression'],
    inputType: 'single_item',
    outputs: ['single_dim'],
    fieldRoleMap: { text: 'input', gold_score: 'output' },
  },
  {
    id: 'T005',
    sourceFile: 'multi-dim.json',
    nameZh: '醫療翻譯品質多維度評分',
    nameEn: 'Medical Translation Quality Scoring',
    selectedCategories: ['regression'],
    inputType: 'single_item',
    outputs: ['multi_dim'],
    fieldRoleMap: { source: 'input', gold_scores: 'output' },
  },
  {
    id: 'T006',
    sourceFile: 'sequence-tagging.json',
    nameZh: '新聞命名實體序列標註',
    nameEn: 'News NER Sequence Tagging',
    selectedCategories: ['sequence'],
    inputType: 'single_item',
    outputs: ['sequence_tagging'],
    fieldRoleMap: { text: 'input', pre_tags: 'output' },
  },
  {
    id: 'T007',
    sourceFile: 'entity-recognition.json',
    nameZh: '產品評論觀點實體辨識',
    nameEn: 'Product Review Opinion Entity Recognition',
    selectedCategories: ['sequence'],
    inputType: 'single_item',
    outputs: ['entity_recognition'],
    fieldRoleMap: { text: 'input', gold_entities: 'output' },
  },
  {
    id: 'T008',
    sourceFile: 'relation-identification.json',
    nameZh: '醫療文本關係辨識',
    nameEn: 'Medical Relation Identification',
    selectedCategories: ['sequence'],
    inputType: 'single_item',
    outputs: ['relation_identification'],
    fieldRoleMap: { text: 'input', triples: 'output' },
  },
  {
    id: 'T009',
    sourceFile: 'free-text.json',
    nameZh: '醫療文本摘要',
    nameEn: 'Medical Text Summarization',
    selectedCategories: ['generation'],
    inputType: 'single_item',
    outputs: ['free_text'],
    fieldRoleMap: {
      reference: 'evidence',
      text: 'input',
      gold_answer: 'output',
    },
  },
  {
    id: 'T010',
    sourceFile: 'medical-ner-re.json',
    nameZh: '醫療實體與關係辨識',
    nameEn: 'Medical Entity and Relation Recognition',
    selectedCategories: ['sequence'],
    inputType: 'single_item',
    outputs: ['entity_recognition', 'relation_identification'],
    fieldRoleMap: {
      text: 'input',
      entities: 'output',
      triples: 'output',
    },
  },
  {
    id: 'T011',
    sourceFile: 'nli.json',
    nameZh: '醫療自然語言推斷',
    nameEn: 'Medical NLI',
    selectedCategories: ['classification'],
    inputType: 'item_pair',
    outputs: ['single_label'],
    fieldRoleMap: {
      Evidence: 'evidence',
      Premise: 'input',
      Hypothesis: 'input',
      Label: 'output',
    },
  },
  {
    id: 'T012',
    sourceFile: 'mrc.json',
    nameZh: '醫療閱讀理解問答',
    nameEn: 'Medical QA',
    selectedCategories: ['generation'],
    inputType: 'single_item',
    outputs: ['free_text'],
    fieldRoleMap: {
      background: 'evidence',
      question: 'input',
      answer: 'output',
    },
  },
  {
    id: 'T013',
    sourceFile: 'absa-va.json',
    nameZh: 'ABSA + 情緒回歸（YouTube 留言）',
    nameEn: 'ABSA + Emotion Regression (YouTube Comments)',
    selectedCategories: ['sequence', 'regression'],
    inputType: 'single_item',
    outputs: [
      'entity_recognition',
      'relation_identification',
      'multi_dim',
    ],
    fieldRoleMap: {
      utterances: 'evidence',
      text: 'input',
      gold_triplets: 'output',
      incomplete_annotations: 'output',
    },
  },
];

const CANONICAL_OUTPUT_TYPES = [
  'single_label',
  'multi_label',
  'single_dim',
  'multi_dim',
  'sequence_tagging',
  'entity_recognition',
  'relation_identification',
  'free_text',
];

const SYNTHETIC_FOURTEENTH_TASK: TaskDetailExtensionSeed = {
  id: 'EX014',
  sourceFile: 'synthetic-fourteenth.json',
  nameZh: '分類附理由',
  nameEn: 'Classification with rationale',
  status: 'draft',
  selectedCategories: ['classification', 'generation'],
  inputType: 'single_item',
  fieldRoleMap: { text: 'input' },
  outputs: [
    {
      type: 'single_label',
      config: {
        label_options: [
          { name: 'accept', color: '#10B981' },
          { name: 'reject', color: '#E74C3C' },
        ],
        allow_bypass: true,
      },
    },
    {
      type: 'free_text',
      config: {
        input_instruction: 'Read the text',
        output_instruction: 'Explain the decision',
        max_length: 240,
        allow_bypass: true,
      },
    },
  ],
  dataset: {
    total: 2,
    files: [{ name: 'synthetic-fourteenth.json', size: 256 }],
    columns: ['text'],
  },
};

function dataAttributeValues(
  locator: Locator,
  attribute: string,
): Promise<Array<string | null>> {
  return locator.evaluateAll(
    (elements, attributeName) =>
      elements.map((element) => element.getAttribute(attributeName)),
    attribute,
  );
}

async function openTaskDetail(
  page: Page,
  taskId: string,
  options: { forceDraft?: boolean; lang?: 'zh' | 'en' } = {},
) {
  if (options.lang) {
    await page.addInitScript((lang) => {
      window.localStorage.setItem('labelsuite.lang', lang);
    }, options.lang);
  }
  const statusQuery = options.forceDraft ? '&status=draft' : '';
  await page.goto(
    `${TASK_DETAIL_URL}?task_id=${taskId}&task_role=project_leader${statusQuery}`,
  );
  await expect(page.getByTestId('task-config-summary')).toBeVisible();
}

async function expectOrderedAttributeValues(
  locator: Locator,
  attribute: string,
  expected: string[],
) {
  await expect(locator).toHaveCount(expected.length);
  expect(await dataAttributeValues(locator, attribute)).toEqual(expected);
}

function expectOrderedOutputKeys(
  outputLocator: Locator,
  expected: string[],
) {
  return expectOrderedAttributeValues(
    outputLocator,
    'data-output-key',
    expected,
  );
}

test.describe('Task detail Step 1–2 config parity', () => {
  test('all T001–T013 task-list seeds open matching details with ordered output types', async ({
    page,
  }) => {
    for (const task of TASK_SEEDS) {
      await page.goto(TASK_LIST_URL);
      const row = page.locator(
        `#taskTableBody tr[data-source-file="${task.sourceFile}"]`,
      );
      await expect(row).toBeVisible();
      const listName = (await row.locator('.task-name-cell').innerText()).trim();
      const listOutputLabels = await row
        .locator('.output-type-tag')
        .allInnerTexts();

      await row.click();
      await expect(page).toHaveURL(
        new RegExp(`task-detail\\.html\\?task_id=${task.id}`),
      );
      await expect(page.getByTestId('task-config-summary')).toBeVisible();
      await expect(page.getByTestId('task-name-value')).toHaveText(listName);

      const detailOutputTags = page.getByTestId('task-output-type-tag');
      await expectOrderedOutputKeys(detailOutputTags, task.outputs);
      await expect(detailOutputTags).toHaveText(listOutputLabels);
    }
  });

  test('each seed exposes selected categories, input type, outputs, and field-role map in summary and edit mode', async ({
    page,
  }) => {
    for (const task of TASK_SEEDS) {
      await openTaskDetail(page, task.id, { forceDraft: true });

      await expectOrderedAttributeValues(
        page.getByTestId('task-selected-category'),
        'data-category-key',
        task.selectedCategories,
      );
      await expect(page.getByTestId('task-input-type-value')).toHaveAttribute(
        'data-input-type',
        task.inputType,
      );
      await expectOrderedOutputKeys(
        page.getByTestId('task-output-type-tag'),
        task.outputs,
      );

      const summaryRoleRows = page.getByTestId('field-role-summary-row');
      await expect(summaryRoleRows).toHaveCount(
        Object.keys(task.fieldRoleMap).length,
      );
      for (const [field, role] of Object.entries(task.fieldRoleMap)) {
        const row = summaryRoleRows.locator(`[data-field-key="${field}"]`);
        await expect(row).toHaveAttribute('data-field-role', role);
      }

      await page.getByTestId('task-basic-edit-btn').click();
      await expect(page.getByTestId('task-config-step1-editor')).toBeVisible();

      for (const category of task.selectedCategories) {
        await expect(
          page.locator(
            `[data-testid="task-category-chip"][data-key="${category}"]`,
          ),
        ).toHaveAttribute('aria-checked', 'true');
      }
      await expect(
        page.locator(
          `[data-testid="task-input-type-chip"][data-key="${task.inputType}"]`,
        ),
      ).toHaveAttribute('aria-checked', 'true');

      const selectedOutputChips = page.locator(
        '[data-testid="task-output-type-chip"][aria-checked="true"]',
      );
      await expectOrderedAttributeValues(
        selectedOutputChips,
        'data-key',
        task.outputs,
      );

      for (const [field, role] of Object.entries(task.fieldRoleMap)) {
        await expect(
          page.locator(
            `[data-testid="field-role-select"][data-field-key="${field}"]`,
          ),
        ).toHaveValue(role);
      }
    }
  });

  test('composite details render one config section per output and the seeds cover all eight canonical outputs', async ({
    page,
  }) => {
    const discoveredOutputs = new Set<string>();

    for (const task of TASK_SEEDS) {
      await openTaskDetail(page, task.id);
      const outputSections = page.getByTestId('task-config-output-section');
      await expectOrderedOutputKeys(outputSections, task.outputs);
      task.outputs.forEach((output) => discoveredOutputs.add(output));

      if (task.id === 'T010') {
        await expect(outputSections).toHaveCount(2);
      }
      if (task.id === 'T013') {
        await expect(outputSections).toHaveCount(3);
      }
    }

    expect([...discoveredOutputs].sort()).toEqual(
      [...CANONICAL_OUTPUT_TYPES].sort(),
    );
  });

  test('Step 1 edit reuses the task-new selector and dataset field-mapper surface', async ({
    page,
  }) => {
    await openTaskDetail(page, 'T013', { forceDraft: true });
    await page.getByTestId('task-basic-edit-btn').click();

    const editor = page.getByTestId('task-config-step1-editor');
    await expect(editor).toHaveAttribute('data-editor-source', 'task-new-step1');
    await expect(editor.locator('.task-type-selector')).toBeVisible();
    await expect(editor.locator('.task-type-group')).toHaveCount(3);
    await expect(editor.locator('.task-type-chip-check')).toHaveCount(
      4 + 2 + 5,
    );

    const datasetPreview = editor.getByTestId('task-dataset-field-mapper');
    await expect(datasetPreview).toBeVisible();
    await expect(datasetPreview.locator('table')).toBeVisible();
    await expect(
      datasetPreview.locator('[data-testid="field-role-select"]'),
    ).toHaveCount(4);

    const firstChipStyles = await editor
      .locator('.task-type-chip')
      .first()
      .evaluate((element) => {
        const styles = getComputedStyle(element);
        return {
          borderRadius: styles.borderRadius,
          fontSize: styles.fontSize,
          padding: styles.padding,
        };
      });
    expect(firstChipStyles).toEqual({
      borderRadius: '9999px',
      fontSize: '13px',
      padding: '6px 12px',
    });

    await page.setViewportSize({ width: 375, height: 900 });
    const step1MobileLayout = await editor.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth,
    }));
    expect(step1MobileLayout.documentWidth).toBeLessThanOrEqual(
      step1MobileLayout.viewportWidth,
    );
  });

  test('Step 2 edit reuses the task-new settings, preview, accordion, and code layout', async ({
    page,
  }) => {
    await openTaskDetail(page, 'T013', { forceDraft: true });
    await page.locator('#settingsEditBtn').click();

    const editor = page.locator('#settingsEditForm');
    await expect(editor).toHaveAttribute('data-editor-source', 'task-new-step2');
    await expect(
      editor.locator('.s2-primary-workspace.is-settings-first-preview'),
    ).toBeVisible();
    await expect(editor.locator('.s2-settings-panel')).toBeVisible();
    await expect(editor.locator('.s2-preview-top')).toBeVisible();

    const accordions = editor.locator('.output-accordion');
    await expect(accordions).toHaveCount(3);
    await expect(
      accordions.locator('.output-accordion-header[aria-expanded]'),
    ).toHaveCount(3);
    await expect(
      editor.locator('.annotation-preview [data-output-key]'),
    ).toHaveCount(3);

    const supportingTools = editor.locator(
      '.s2-layout.is-integrated-config-tools',
    );
    await expect(supportingTools).toBeVisible();
    await expect(
      supportingTools.locator('.template-section'),
    ).toBeVisible();
    await expect(supportingTools.locator('.s2-code-panel')).toBeVisible();
    await expect(supportingTools.locator('.code-editor')).toHaveCSS(
      'height',
      '240px',
    );

    await page.setViewportSize({ width: 375, height: 900 });
    const step2MobileLayout = await editor.evaluate((element) => {
      const primary = element.querySelector('.s2-primary-workspace');
      const settings = element.querySelector('.s2-settings-panel');
      const preview = element.querySelector('.s2-preview-top');
      const settingsRect = settings?.getBoundingClientRect();
      const previewRect = preview?.getBoundingClientRect();
      return {
        columns: primary ? getComputedStyle(primary).gridTemplateColumns : '',
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: document.documentElement.clientWidth,
        settingsTop: settingsRect?.top ?? 0,
        previewTop: previewRect?.top ?? 0,
      };
    });
    expect(step2MobileLayout.documentWidth).toBeLessThanOrEqual(
      step2MobileLayout.viewportWidth,
    );
    expect(step2MobileLayout.columns.trim().split(/\s+/)).toHaveLength(1);
    expect(step2MobileLayout.previewTop).toBeGreaterThan(
      step2MobileLayout.settingsTop,
    );
  });

  test('Step 2 edit reuses task-new accordion badges, bypass toggle-card, preview pills, and plain-text code toggle for single_label', async ({
    page,
  }) => {
    await openTaskDetail(page, 'T001', { forceDraft: true });
    await page.locator('#settingsEditBtn').click();

    const editor = page.locator('#settingsEditForm');

    // Diff 1: numbered indigo badge in the accordion title, no separate mono type-key span
    const accordionTitle = editor.locator('.output-accordion-title').first();
    await expect(accordionTitle.locator('.output-type-index-badge')).toHaveText('1');
    await expect(accordionTitle.locator('.task-config-output-key')).toHaveCount(0);

    // Diff 2: bypass renders as one integrated schema-toggle-card (title + status + switch together)
    const bypassCard = editor.locator('.schema-toggle-card').first();
    await expect(bypassCard).toBeVisible();
    await expect(bypassCard.locator('.schema-toggle-label')).toHaveText('允許無法判定 (Bypass)');
    await expect(bypassCard.locator('.schema-toggle-status')).toHaveText('已啟用');
    await expect(bypassCard.locator('.toggle-switch input[type="checkbox"]')).toHaveCount(1);
    await expect(
      editor.locator('.task-config-setting-row > .field-label:has-text("允許無法判定")'),
    ).toHaveCount(0);

    // Diff 3: preview reuses the shared raw-text header and large pill-style options, no leftover per-card copy text
    const preview = page.locator('#settingsAnnotationPreview');
    await expect(preview).toContainText('原始文本');
    await expect(preview.locator('.annotation-preview-option-pill')).toHaveCount(3);
    await expect(preview.locator('.annotation-preview-bypass-chip')).toHaveCount(1);
    await expect(preview).not.toContainText('此輸出依相同 registry config 產生設定與標記介面');

    // Diff 4: YAML/JSON toggle is plain text emphasis (fontWeight), not a bordered/filled active pill
    const yamlBtn = page.locator('#settingsFormatYamlBtn');
    const jsonBtn = page.locator('#settingsFormatJsonBtn');
    await expect(yamlBtn).not.toHaveClass(/active/);
    await expect(jsonBtn).not.toHaveClass(/active/);
    const weights = await Promise.all([
      yamlBtn.evaluate((el) => Number(getComputedStyle(el).fontWeight)),
      jsonBtn.evaluate((el) => Number(getComputedStyle(el).fontWeight)),
    ]);
    expect(weights[0]).toBeGreaterThan(weights[1]);
  });

  test('a synthetic fourteenth task renders through the data extension hook without a task-id branch', async ({
    page,
  }) => {
    await page.addInitScript((task) => {
      window.LabelSuiteTaskDetailDataExtensions = [task];
    }, SYNTHETIC_FOURTEENTH_TASK);

    await openTaskDetail(page, SYNTHETIC_FOURTEENTH_TASK.id);

    await expect(page.getByTestId('task-name-value')).toHaveText(
      SYNTHETIC_FOURTEENTH_TASK.nameZh,
    );
    await expectOrderedOutputKeys(
      page.getByTestId('task-output-type-tag'),
      SYNTHETIC_FOURTEENTH_TASK.outputs.map((output) => output.type),
    );
    await expectOrderedOutputKeys(
      page.getByTestId('task-config-output-section'),
      SYNTHETIC_FOURTEENTH_TASK.outputs.map((output) => output.type),
    );
    await expect(page.getByTestId('task-input-type-value')).toHaveAttribute(
      'data-input-type',
      SYNTHETIC_FOURTEENTH_TASK.inputType,
    );
  });

  test('annotator direct access leaves answer-like fields out of the DOM and browser storage', async ({
    page,
  }) => {
    const answerSentinel =
      '是的，這在癌友身上其實很常見。我會跟您說';
    const forbiddenFieldPattern =
      /(?:ground_truth|expected_label|correct_label|solution|gold_label|gold_labels|gold_score|gold_scores|gold_answer|gold_entities|gold_triplets)/i;

    await page.goto(
      `${TASK_DETAIL_URL}?task_id=T012&task_role=annotator`,
    );
    await expect(page).toHaveURL(/task-list\.html\?unauthorized=annotator/);

    const visibleText = await page.locator('body').innerText();
    expect(visibleText).not.toContain(answerSentinel);
    expect(visibleText).not.toMatch(forbiddenFieldPattern);
    await expect(page.getByTestId('field-role-summary-row')).toHaveCount(0);
    await expect(page.getByTestId('task-config-output-section')).toHaveCount(0);

    const browserStorage = await page.evaluate(() => {
      const localEntries = Object.entries(window.localStorage);
      const sessionEntries = Object.entries(window.sessionStorage);
      return JSON.stringify({ localEntries, sessionEntries });
    });
    expect(browserStorage).not.toContain(answerSentinel);
    expect(browserStorage).not.toMatch(forbiddenFieldPattern);
  });

  test('config summaries localize output labels and fit a 375px viewport without horizontal overflow', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 900 });
    await openTaskDetail(page, 'T013', { lang: 'zh' });

    await expect(page.getByTestId('task-output-type-tag')).toHaveText([
      '實體辨識',
      '關係識別',
      '多維度',
    ]);

    const zhLayout = await page.getByTestId('task-config-summary').evaluate(
      (element) => ({
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
        viewportWidth: document.documentElement.clientWidth,
        documentWidth: document.documentElement.scrollWidth,
      }),
    );
    expect(zhLayout.scrollWidth).toBeLessThanOrEqual(zhLayout.clientWidth);
    expect(zhLayout.documentWidth).toBeLessThanOrEqual(zhLayout.viewportWidth);

    await page.getByTestId('language-toggle').click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.getByTestId('task-output-type-tag')).toHaveText([
      'Entity Recognition',
      'Relation Identification',
      'Multi-dimension',
    ]);

    const enLayout = await page.getByTestId('task-config-summary').evaluate(
      (element) => ({
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
        viewportWidth: document.documentElement.clientWidth,
        documentWidth: document.documentElement.scrollWidth,
      }),
    );
    expect(enLayout.scrollWidth).toBeLessThanOrEqual(enLayout.clientWidth);
    expect(enLayout.documentWidth).toBeLessThanOrEqual(enLayout.viewportWidth);
  });
});
