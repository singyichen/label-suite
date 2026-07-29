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
  listName?: string;
  type: string;
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
    name: '新聞標題多標籤分類',
    type: '單句分類（含多標籤）',
    datasetSummary: '3200 筆',
    listStatus: '草稿',
    detailStatus: '草稿',
    editable: true,
    runControl: {
      activeStepLabel: '草稿',
      roundCount: 0,
      actionButton: '#publishDryRunBtn',
      actionText: '新增試標回合 R1',
    },
    settings: ['標籤清單', '政治, 社會, 娛樂, 體育, 科技', '允許多選', '是'],
    editPreview: ['政治', '社會', '娛樂', '體育', '科技'],
  },
  {
    id: 'T002',
    name: '情感 VA 雙維度評分',
    type: '單句 VA 雙維度評分（Valence / Arousal）',
    datasetSummary: '1280 筆',
    listStatus: '待 IAA 確認',
    detailStatus: '待 IAA 確認',
    editable: false,
    runControl: {
      activeStepLabel: '試標階段',
      roundCount: 2,
      actionButton: '#publishOfficialRunBtn',
      actionText: '開始正式標記',
      absentButton: '#publishDryRunBtn',
    },
    settings: ['Valence', '1 ~ 9', 'Arousal', '1 ~ 9'],
    editPreview: ['Valence 評分', 'Arousal 評分'],
  },
  {
    id: 'T003',
    name: '產品評論 Aspect List 抽取／校正',
    listName: '產品評論序列標記（NER / Aspect）',
    type: '序列標記（含 Aspect / NER）',
    datasetSummary: '860 筆',
    listStatus: '草稿',
    detailStatus: '草稿',
    editable: true,
    runControl: {
      activeStepLabel: '草稿',
      roundCount: 0,
      actionButton: '#publishDryRunBtn',
      actionText: '新增試標回合 R1',
    },
    settings: ['子類型', 'Aspect List 抽取／校正', '輸入欄位名稱', 'sentence', '輸出欄位名稱', 'aspects'],
    editPreview: ['欄位對應', 'Aspect 編輯規則', '數量限制', 'Aspect List'],
  },
  {
    id: 'T004',
    name: '醫療關係抽取（Entity / Triple）',
    type: '關係抽取（Entity + Relation + Triple）',
    datasetSummary: '1420 筆',
    listStatus: '草稿',
    detailStatus: '草稿',
    editable: true,
    runControl: {
      activeStepLabel: '草稿',
      roundCount: 0,
      actionButton: '#publishDryRunBtn',
      actionText: '新增試標回合 R1',
    },
    settings: ['實體類型', 'DRUG, DISEASE, SYMPTOM', '關係類型', 'treats, causes, indicates'],
    editPreview: ['treats', 'causes', 'indicates', 'triple'],
  },
  {
    id: 'T005',
    name: '句對相似度 / 蘊含判定',
    type: '句對任務（相似度 / 蘊含）',
    datasetSummary: '2100 筆',
    listStatus: '草稿',
    detailStatus: '草稿',
    editable: true,
    runControl: {
      activeStepLabel: '草稿',
      roundCount: 0,
      actionButton: '#publishDryRunBtn',
      actionText: '新增試標回合 R1',
    },
    settings: ['關係標籤', '蘊含, 矛盾, 中立'],
    editPreview: ['句子 A', '句子 B', '蘊含', '矛盾'],
  },
  {
    id: 'T006',
    name: 'NER 命名實體辨識',
    type: '序列標記（含 Aspect / NER）',
    datasetSummary: '950 筆',
    listStatus: '草稿',
    detailStatus: '草稿',
    editable: true,
    runControl: {
      activeStepLabel: '草稿',
      roundCount: 0,
      actionButton: '#publishDryRunBtn',
      actionText: '新增試標回合 R1',
    },
    settings: ['子類型', 'NER 命名實體辨識', '實體類型', 'PER, ORG, LOC'],
    editPreview: ['PER', 'ORG', 'LOC', 'IOB2'],
  },
];

const RUN_CONTROL_TASKS: TaskProfile[] = [
  ...TASK_PROFILES,
  {
    id: 'T007',
    name: '商品評論分類 v2',
    type: '單句分類（含多標籤）',
    datasetSummary: '1750 筆',
    listStatus: '正式標記中',
    detailStatus: '正式標記進行中',
    editable: false,
    runControl: {
      activeStepLabel: '正式標記中',
      roundCount: 1,
      actionButton: '#publishCompleteBtn',
      actionText: '標記完成',
    },
    settings: [],
    editPreview: [],
  },
  {
    id: 'T009',
    name: '對話意圖標記',
    type: '單句分類（含多標籤）',
    datasetSummary: '640 筆',
    listStatus: '試標進行中',
    detailStatus: '試標進行中',
    editable: false,
    runControl: {
      activeStepLabel: '試標階段',
      roundCount: 1,
      actionButton: '#publishDryRunBtn',
      actionText: '新增試標回合 R2',
    },
    settings: [],
    editPreview: [],
  },
  {
    id: 'T010',
    name: '醫療文本 NER',
    type: '序列標記（含 Aspect / NER）',
    datasetSummary: '1800 筆',
    listStatus: '已完成',
    detailStatus: '已完成',
    editable: false,
    runControl: {
      activeStepLabel: '已完成',
      roundCount: 1,
      actionButton: '#publishActionRow',
      actionText: '此狀態不提供發布操作。',
    },
    settings: [],
    editPreview: [],
  },
];

const EN_SETTINGS_BY_TASK: Record<string, string[]> = {
  T001: ['Labels', 'Politics, Society, Entertainment, Sports, Technology', 'Allow multiple labels', 'Yes'],
  T002: ['Valence', '1 ~ 9 (step 1)', 'Arousal', '1 ~ 9 (step 1)'],
  T003: ['Subtype', 'Aspect List extraction / correction', 'Input field name', 'sentence', 'Aspect list field name', 'aspects'],
  T004: ['Entity types', 'DRUG, DISEASE, SYMPTOM', 'Relation types', 'treats, causes, indicates'],
  T005: ['Relation labels', 'Entailment, Contradiction, Neutral'],
  T006: ['Subtype', 'NER (Named Entity Recognition)', 'Entity types', 'PER, ORG, LOC'],
  T007: ['Labels', 'Positive, Neutral, Negative', 'Allow multiple labels', 'No'],
  T009: ['Labels', 'Query, Application, Cancellation, Complaint', 'Allow multiple labels', 'No'],
  T010: ['Subtype', 'NER (Named Entity Recognition)', 'Entity types', 'DRUG, DISEASE, SYMPTOM'],
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
      await expect(overview).toContainText(task.type);
      await expect(page.locator('#valueDatasetSummary')).toHaveText(task.datasetSummary);

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
      await expect(page.locator('#settingsConfigView')).not.toContainText(/[政治社會娛樂體育科技蘊含矛盾好評普通差評查詢申請取消客訴]/);
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
