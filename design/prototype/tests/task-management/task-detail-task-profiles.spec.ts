import { test, expect } from '@playwright/test';

const TASK_LIST_URL = '/pages/task-management/task-list.html?task_role=project_leader';
const TASK_DETAIL_URL = '/pages/task-management/task-detail.html';
const EXAMPLE_SOURCE_FILES = [
  'single-label.json',
  'multi-label.json',
  'multi-label-hierarchical.json',
  'single-dim.json',
  'multi-dim.json',
  'sequence-tagging.json',
  'entity-recognition.json',
  'relation-identification.json',
  'free-text.json',
  'medical-ner-re.json',
  'nli.json',
  'mrc.json',
  'absa-va.json',
];

type TaskProfile = {
  id: string;
  name: string;
  categories: string[];
  categoryLabels: string[];
  inputType: string;
  inputTypeLabel: string;
  outputTypes: string[];
  outputLabels: string[];
  fieldRoleMap: Record<string, string>;
  datasetSummary: string;
  listStatus: string;
  detailStatus: string;
  editable: boolean;
  runControl: {
    activeStepLabel: string;
    roundCount: number;
    actionButton: string;
    actionText: string;
    absentButton?: string;
  };
  settings: string[];
  editPreview: string[];
};

const TASK_PROFILES: TaskProfile[] = [
  {
    id: 'T001',
    name: '醫療文本情感分類',
    categories: ['classification'],
    categoryLabels: ['分類（Classification）'],
    inputType: 'single_item',
    inputTypeLabel: '單一項目',
    outputTypes: ['single_label'],
    outputLabels: ['單一標籤'],
    fieldRoleMap: { text: 'input', gold_label: 'output' },
    datasetSummary: '5 筆',
    listStatus: '草稿',
    detailStatus: '草稿',
    editable: true,
    runControl: {
      activeStepLabel: '草稿',
      roundCount: 0,
      actionButton: '#publishDryRunBtn',
      actionText: '新增試標回合 R1',
    },
    settings: ['標籤選項', 'positive, neutral, negative', '允許無法判定 (Bypass)', '是'],
    editPreview: ['單一標籤', '標籤選項', '允許無法判定 (Bypass)'],
  },
  {
    id: 'T002',
    name: '癌症歷程情緒多標籤分類',
    categories: ['classification'],
    categoryLabels: ['分類（Classification）'],
    inputType: 'single_item',
    inputTypeLabel: '單一項目',
    outputTypes: ['multi_label'],
    outputLabels: ['多標籤'],
    fieldRoleMap: { text: 'input', gold_labels: 'output' },
    datasetSummary: '5 筆',
    listStatus: '草稿',
    detailStatus: '草稿',
    editable: true,
    runControl: {
      activeStepLabel: '草稿',
      roundCount: 0,
      actionButton: '#publishDryRunBtn',
      actionText: '新增試標回合 R1',
      absentButton: '#publishOfficialRunBtn',
    },
    settings: ['標籤選項', 'happy, sad, angry, surprise, fear, disgust', '最多可選數量（0 = 不限）', '3'],
    editPreview: ['多標籤', '標籤選項'],
  },
  {
    id: 'T003',
    name: '病患情緒與照護情境階層分類',
    categories: ['classification'],
    categoryLabels: ['分類（Classification）'],
    inputType: 'single_item',
    inputTypeLabel: '單一項目',
    outputTypes: ['multi_label'],
    outputLabels: ['多標籤'],
    fieldRoleMap: { text: 'input', gold_labels: 'output' },
    datasetSummary: '5 筆',
    listStatus: '草稿',
    detailStatus: '草稿',
    editable: true,
    runControl: {
      activeStepLabel: '草稿',
      roundCount: 0,
      actionButton: '#publishDryRunBtn',
      actionText: '新增試標回合 R1',
    },
    settings: ['標籤選項', '情緒, 負向, 悲傷, 焦慮, 正向, 有盼望', '照護情境, 臨床處置, 緊急, 溝通, 需要說明'],
    editPreview: ['多標籤', '標籤選項'],
  },
  {
    id: 'T004',
    name: '醫療文本可讀性評分',
    categories: ['regression'],
    categoryLabels: ['回歸（Regression）'],
    inputType: 'single_item',
    inputTypeLabel: '單一項目',
    outputTypes: ['single_dim'],
    outputLabels: ['單維度'],
    fieldRoleMap: { text: 'input', gold_score: 'output' },
    datasetSummary: '5 筆',
    listStatus: '草稿',
    detailStatus: '草稿',
    editable: true,
    runControl: {
      activeStepLabel: '草稿',
      roundCount: 0,
      actionButton: '#publishDryRunBtn',
      actionText: '新增試標回合 R1',
    },
    settings: ['維度名稱', 'readability', '最小值', '最大值', '間距'],
    editPreview: ['單維度', '維度名稱'],
  },
  {
    id: 'T005',
    name: '醫療翻譯品質多維度評分',
    categories: ['regression'],
    categoryLabels: ['回歸（Regression）'],
    inputType: 'single_item',
    inputTypeLabel: '單一項目',
    outputTypes: ['multi_dim'],
    outputLabels: ['多維度'],
    fieldRoleMap: { source: 'input', gold_scores: 'output' },
    datasetSummary: '5 筆',
    listStatus: '草稿',
    detailStatus: '草稿',
    editable: true,
    runControl: {
      activeStepLabel: '草稿',
      roundCount: 0,
      actionButton: '#publishDryRunBtn',
      actionText: '新增試標回合 R1',
      absentButton: '#publishCompleteBtn',
    },
    settings: ['維度設定', 'fluency 1–5 / 1', 'adequacy 1–5 / 1', 'coherence 1–5 / 1'],
    editPreview: ['多維度', '維度設定'],
  },
  {
    id: 'T006',
    name: '新聞命名實體序列標註',
    categories: ['sequence'],
    categoryLabels: ['序列（Sequence）'],
    inputType: 'single_item',
    inputTypeLabel: '單一項目',
    outputTypes: ['sequence_tagging'],
    outputLabels: ['序列標註'],
    fieldRoleMap: { text: 'input', pre_tags: 'output' },
    datasetSummary: '4 筆',
    listStatus: '草稿',
    detailStatus: '草稿',
    editable: true,
    runControl: {
      activeStepLabel: '草稿',
      roundCount: 0,
      actionButton: '#publishDryRunBtn',
      actionText: '新增試標回合 R1',
    },
    settings: ['標記單位', 'character', '標籤類型', 'PER, ORG, LOC, TIME', '標記方案', 'BIO'],
    editPreview: ['序列標註', '標記單位', '標籤類型', '標記方案'],
  },
];

const RUN_CONTROL_TASKS: TaskProfile[] = [
  ...TASK_PROFILES,
  {
    id: 'T007',
    name: '產品評論觀點實體辨識',
    categories: ['sequence'],
    categoryLabels: ['序列（Sequence）'],
    inputType: 'single_item',
    inputTypeLabel: '單一項目',
    outputTypes: ['entity_recognition'],
    outputLabels: ['實體辨識'],
    fieldRoleMap: { text: 'input', gold_entities: 'output' },
    datasetSummary: '3 筆',
    listStatus: '草稿',
    detailStatus: '草稿',
    editable: true,
    runControl: {
      activeStepLabel: '草稿',
      roundCount: 0,
      actionButton: '#publishDryRunBtn',
      actionText: '新增試標回合 R1',
      absentButton: '#publishCompleteBtn',
    },
    settings: [],
    editPreview: [],
  },
  {
    id: 'T009',
    name: '醫療文本摘要',
    categories: ['generation'],
    categoryLabels: ['生成（Generation）'],
    inputType: 'single_item',
    inputTypeLabel: '單一項目',
    outputTypes: ['free_text'],
    outputLabels: ['自由文字'],
    fieldRoleMap: { reference: 'evidence', text: 'input', gold_answer: 'output' },
    datasetSummary: '3 筆',
    listStatus: '草稿',
    detailStatus: '草稿',
    editable: true,
    runControl: {
      activeStepLabel: '草稿',
      roundCount: 0,
      actionButton: '#publishDryRunBtn',
      actionText: '新增試標回合 R1',
    },
    settings: [],
    editPreview: [],
  },
  {
    id: 'T010',
    name: '醫療實體與關係辨識',
    categories: ['sequence'],
    categoryLabels: ['序列（Sequence）'],
    inputType: 'single_item',
    inputTypeLabel: '單一項目',
    outputTypes: ['entity_recognition', 'relation_identification'],
    outputLabels: ['實體辨識', '關係識別'],
    fieldRoleMap: { text: 'input', entities: 'output', triples: 'output' },
    datasetSummary: '3 筆',
    listStatus: '草稿',
    detailStatus: '草稿',
    editable: true,
    runControl: {
      activeStepLabel: '草稿',
      roundCount: 0,
      actionButton: '#publishDryRunBtn',
      actionText: '新增試標回合 R1',
      absentButton: '#publishCompleteBtn',
    },
    settings: [],
    editPreview: [],
  },
];

const EN_SETTINGS_BY_TASK: Record<string, string[]> = {
  T001: ['Label options', 'positive, neutral, negative', 'Allow bypass (unable to determine)', 'Yes'],
  T002: ['Label options', 'happy, sad, angry, surprise, fear, disgust', 'Max selections (0 = unlimited)', '3'],
  T003: ['Label options', 'Max selections (0 = unlimited)', '0', 'Allow bypass (unable to determine)'],
  T004: ['Dimension name', 'readability', 'Min value', 'Max value', 'Step'],
  T005: ['Dimension settings', 'fluency 1–5 / 1', 'adequacy 1–5 / 1', 'coherence 1–5 / 1'],
  T006: ['Token unit', 'character', 'Label types', 'PER, ORG, LOC, TIME', 'Tagging scheme', 'BIO'],
  T007: ['Entity types', 'target, aspect, opinion', 'Allow overlapping spans', 'No'],
  T009: ['Input section instruction', 'Response section instruction', 'Max length', '256'],
  T010: ['Entity Recognition', 'Relation Identification', 'BODY, DISE, SYMP, DRUG, EXAM, TREAT', 'Semantic relation types'],
};

test.describe('Task detail profile mapping', () => {
  test('project leader can open task detail from every illustrative task row', async ({ page }) => {
    await page.goto(TASK_LIST_URL);

    for (const sourceFile of EXAMPLE_SOURCE_FILES) {
      const row = page.locator(
        `#taskTableBody tr[data-source-file="${sourceFile}"]`,
      );
      await expect(row).toBeVisible();
      await row.click();
      await expect(page).toHaveURL(
        new RegExp(`${TASK_DETAIL_URL.replace(/\//g, '\\/')}\\?task_id=`),
      );
      await page.goBack();
      await expect(page).toHaveURL(/task-list\.html\?task_role=project_leader/);
    }
  });

  test('super admin can open task detail from every illustrative task row', async ({ page }) => {
    await page.goto('/pages/task-management/task-list.html?task_role=super_admin');

    for (const sourceFile of EXAMPLE_SOURCE_FILES) {
      const row = page.locator(
        `#taskTableBody tr[data-source-file="${sourceFile}"]`,
      );
      await expect(row).toBeVisible();
      await row.click();
      await expect(page).toHaveURL(
        new RegExp(`${TASK_DETAIL_URL.replace(/\//g, '\\/')}\\?task_id=`),
      );
      await page.goBack();
      await expect(page).toHaveURL(/task-list\.html\?task_role=super_admin/);
    }
  });

  for (const task of TASK_PROFILES) {
    test(`renders task-specific overview for ${task.id}`, async ({ page }) => {
      await page.goto(`${TASK_DETAIL_URL}?task_id=${task.id}`);

      await expect(page.locator('#bcCurrent')).toHaveText(task.name);

      const overview = page.locator('#overviewPanel');
      await expect(overview).toContainText(task.name);
      await expect(page.locator('#valueDatasetSummary')).toHaveText(task.datasetSummary);
      await expect(page.getByTestId('task-selected-category')).toHaveText(task.categoryLabels);
      await expect(page.getByTestId('task-input-type-value')).toHaveText(task.inputTypeLabel);
      await expect(page.getByTestId('task-input-type-value')).toHaveAttribute(
        'data-input-type',
        task.inputType,
      );
      await expect(page.getByTestId('task-output-type-tag')).toHaveText(task.outputLabels);

      const categoryKeys = await page
        .getByTestId('task-selected-category')
        .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-category-key')));
      expect(categoryKeys).toEqual(task.categories);

      const outputKeys = await page
        .getByTestId('task-output-type-tag')
        .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-output-key')));
      expect(outputKeys).toEqual(task.outputTypes);

      for (const [field, role] of Object.entries(task.fieldRoleMap)) {
        await expect(
          page.locator(
            `[data-testid="field-role-summary-row"] [data-field-key="${field}"]`,
          ),
        ).toHaveAttribute('data-field-role', role);
      }

      for (const text of task.settings) {
        await expect(page.locator('#settingsConfigView')).toContainText(text);
      }
    });
  }

  for (const [taskId, expectedSettings] of Object.entries(EN_SETTINGS_BY_TASK)) {
    test(`renders English label settings summary for ${taskId}`, async ({ page }) => {
      await page.addInitScript(() => {
        window.localStorage.setItem('labelsuite.lang', 'en');
      });
      await page.goto(`${TASK_DETAIL_URL}?task_id=${taskId}`);

      await expect(page.locator('#settingsSummaryTitle')).toHaveText('Label settings');
      for (const text of expectedSettings) {
        await expect(page.locator('#settingsConfigView')).toContainText(text);
      }
      const translatedLabels = await page.locator(
        '#settingsConfigView .kv-dl-key, '
        + '#settingsConfigView .task-config-output-title, '
        + '#settingsConfigView .task-config-setting-label',
      ).allInnerTexts();
      expect(translatedLabels.join(' ')).not.toMatch(
        /[標籤清單允許多選子類型欄位對應關係標籤實體類型標記格式]/,
      );
    });
  }

  for (const task of RUN_CONTROL_TASKS) {
    test(`renders coherent run-control state for ${task.id}`, async ({ page }) => {
      await page.goto(`${TASK_DETAIL_URL}?task_id=${task.id}`);

      await expect(page.locator('#statusBadge')).toContainText(task.detailStatus);
      await expect(page.locator('#executionStageTitle')).toHaveCount(0);
      await expect(page.locator('#executionStageDesc')).toHaveCount(0);
      await expect(page.locator('#statusStepper .step-current .step-label-wrap')).toHaveText(task.runControl.activeStepLabel);
      await expect(page.locator('#trialRoundTimeline .round-timeline-item')).toHaveCount(task.runControl.roundCount);
      await expect(page.locator(task.runControl.actionButton)).toHaveText(task.runControl.actionText);
      if (task.runControl.absentButton) {
        await expect(page.locator(task.runControl.absentButton)).toHaveCount(0);
      }
    });
  }

  for (const task of TASK_PROFILES) {
    test(`respects settings edit availability for ${task.id}`, async ({ page }) => {
      await page.goto(`${TASK_DETAIL_URL}?task_id=${task.id}`);

      const editBtn = page.locator('#settingsEditBtn');
      await expect(page.locator('#statusBadge')).toContainText(task.detailStatus);
      if (!task.editable) {
        await expect(editBtn).toBeDisabled();
        await expect(page.locator('#settingsEditForm')).toHaveClass(/hidden/);
        return;
      }

      await expect(editBtn).toBeEnabled();
      await editBtn.click();

      await expect(page.locator('#settingsEditForm')).not.toHaveClass(/hidden/);
      for (const text of task.editPreview) {
        await expect(page.locator('#settingsEditForm')).toContainText(text);
      }
    });
  }
});
