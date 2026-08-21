import { test, expect } from '@playwright/test';
import path from 'path';

const TASK_LIST_URL = '/pages/task-management/task-list.html?task_role=project_leader';
const TASK_DETAIL_URL = '/pages/task-management/task-detail.html';
const PANEL_LOAD_TIMEOUT = 15000;
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
  type: string;
  datasetSummary: string;
  outputCount: number;
  settings: string[];
};

/* Expected values derive from the unified seeds (task-list.data.js +
   task-detail.data.js) rendered through getSettingsSummary(): one row per
   ADR-029 output with its registry display label and config field summary. */
const TASK_PROFILES: TaskProfile[] = [
  {
    id: 'T001',
    name: '醫療文本情感分類',
    type: '單一標籤',
    datasetSummary: '5 筆',
    outputCount: 1,
    settings: ['cfg-t001-v1.0.0', 'positive, neutral, negative'],
  },
  {
    id: 'T002',
    name: '癌症歷程情緒多標籤分類',
    type: '多標籤',
    datasetSummary: '5 筆',
    outputCount: 1,
    settings: ['cfg-t002-v1.0.0', 'happy, sad, angry, surprise, fear, disgust'],
  },
  {
    id: 'T003',
    name: '病患情緒與照護情境階層分類',
    type: '多標籤',
    datasetSummary: '5 筆',
    outputCount: 1,
    settings: ['cfg-t003-v1.0.0', '情緒, 照護情境'],
  },
  {
    id: 'T004',
    name: '醫療文本可讀性評分',
    type: '單維度',
    datasetSummary: '5 筆',
    outputCount: 1,
    settings: ['cfg-t004-v1.0.0', 'readability · 1 · 5 · 1'],
  },
  {
    id: 'T005',
    name: '醫療翻譯品質多維度評分',
    type: '多維度',
    datasetSummary: '5 筆',
    outputCount: 1,
    settings: ['cfg-t005-v1.0.0', 'fluency, adequacy, coherence'],
  },
  {
    id: 'T006',
    name: '新聞命名實體序列標註',
    type: '序列標註',
    datasetSummary: '4 筆',
    outputCount: 1,
    settings: ['cfg-t006-v1.0.0', 'PER, ORG, LOC, TIME', 'BIO'],
  },
  {
    id: 'T007',
    name: '產品評論觀點實體辨識',
    type: '實體辨識',
    datasetSummary: '3 筆',
    outputCount: 1,
    settings: ['cfg-t007-v1.0.0', 'target, aspect, opinion'],
  },
  {
    id: 'T008',
    name: '醫療文本關係辨識',
    type: '關係識別',
    datasetSummary: '3 筆',
    outputCount: 1,
    settings: ['cfg-t008-v1.0.0', 'causes, treats, prevents, diagnoses, located_in'],
  },
  {
    id: 'T009',
    name: '醫療文本摘要',
    type: '自由文字',
    datasetSummary: '3 筆',
    outputCount: 1,
    settings: ['cfg-t009-v1.0.0', '256'],
  },
  {
    id: 'T010',
    name: '醫療實體與關係辨識',
    type: '實體辨識 + 關係識別',
    datasetSummary: '3 筆',
    outputCount: 2,
    settings: [
      'cfg-t010-v1.0.0',
      'BODY, DISE, SYMP, DRUG',
      'bodyLocation, causes, adverseOutcome',
    ],
  },
  {
    id: 'T011',
    name: '醫療自然語言推斷',
    type: '單一標籤',
    datasetSummary: '3 筆',
    outputCount: 1,
    settings: ['cfg-t011-v1.0.0', 'entailment, neutral, contradiction'],
  },
  {
    id: 'T012',
    name: '醫療閱讀理解問答',
    type: '自由文字',
    datasetSummary: '3 筆',
    outputCount: 1,
    settings: ['cfg-t012-v1.0.0', '512'],
  },
  {
    id: 'T013',
    name: 'ABSA + 情緒回歸（YouTube 留言）',
    type: '實體辨識 + 關係識別 + 多維度',
    datasetSummary: '1 筆',
    outputCount: 3,
    settings: [
      'cfg-t013-v1.0.0',
      'Target, Aspect, Opinion',
      'has_aspect, has_opinion',
      'valence, arousal',
    ],
  },
];

const EN_SETTINGS_BY_TASK: Record<string, { type: string; settings: string[] }> = {
  T001: { type: 'Single label', settings: ['positive, neutral, negative'] },
  T004: { type: 'Single dimension', settings: ['readability · 1 · 5 · 1'] },
  T010: {
    type: 'Entity Recognition + Relation Identification',
    settings: ['BODY, DISE, SYMP, DRUG', 'bodyLocation, causes, adverseOutcome'],
  },
};

/* All 13 unified seeds are drafts; non-draft run-control states are reached
   through the ?status= URL override (see parseRole()), which synthesizes one
   auto-derived trial round for any non-draft status. */
type RunControlCase = {
  status: string | null;
  badge: string;
  activeStepLabel: string;
  roundCount: number;
  actionButton: string;
  actionText: string;
  absentButton?: string;
};

const RUN_CONTROL_CASES: RunControlCase[] = [
  {
    status: null,
    badge: '草稿',
    activeStepLabel: '草稿',
    roundCount: 0,
    actionButton: '#publishDryRunBtn',
    actionText: '新增試標回合 R1',
  },
  {
    status: 'dry_run_in_progress',
    badge: '試標進行中',
    activeStepLabel: '試標階段',
    roundCount: 1,
    actionButton: '#publishDryRunBtn',
    actionText: '新增試標回合 R2',
  },
  {
    status: 'waiting_iaa_confirmation',
    badge: '待 IAA 確認',
    activeStepLabel: '試標階段',
    roundCount: 1,
    actionButton: '#publishOfficialRunBtn',
    actionText: '開始正式標記',
    absentButton: '#publishDryRunBtn',
  },
  {
    status: 'official_run_in_progress',
    badge: '正式標記進行中',
    activeStepLabel: '正式標記中',
    roundCount: 1,
    actionButton: '#publishCompleteBtn',
    actionText: '標記完成',
  },
  {
    status: 'completed',
    badge: '已完成',
    activeStepLabel: '已完成',
    roundCount: 1,
    actionButton: '#publishActionRow',
    actionText: '此狀態不提供發布操作。',
  },
];

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

      await expect(page.locator('#bcCurrent')).toHaveText(task.name, { timeout: PANEL_LOAD_TIMEOUT });

      const overview = page.locator('#overviewPanel');
      await expect(overview).toContainText(task.name);
      await expect(page.locator('#valueTaskType')).toHaveText(task.type);
      await expect(page.locator('#valueDatasetSummary')).toHaveText(task.datasetSummary);

      for (const text of task.settings) {
        await expect(page.locator('#settingsConfigView')).toContainText(text);
      }
      await expect(page.locator('#settingsConfigDynamicRows .kv-dl-row')).toHaveCount(task.outputCount);
    });
  }

  for (const [taskId, expected] of Object.entries(EN_SETTINGS_BY_TASK)) {
    test(`renders English label settings summary for ${taskId}`, async ({ page }) => {
      await page.addInitScript(() => {
        window.localStorage.setItem('labelsuite.lang', 'en');
      });
      await page.goto(`${TASK_DETAIL_URL}?task_id=${taskId}`);

      await expect(page.locator('#settingsSummaryTitle')).toHaveText('Label settings', { timeout: PANEL_LOAD_TIMEOUT });
      await expect(page.locator('#valueTaskType')).toHaveText(expected.type);
      for (const text of expected.settings) {
        await expect(page.locator('#settingsConfigView')).toContainText(text);
      }
    });
  }

  for (const rc of RUN_CONTROL_CASES) {
    test(`renders coherent run-control state for status ${rc.status || 'draft'}`, async ({ page }) => {
      const statusParam = rc.status ? `&status=${rc.status}` : '';
      await page.goto(`${TASK_DETAIL_URL}?task_id=T001${statusParam}`);

      await expect(page.locator('#statusBadge')).toContainText(rc.badge, { timeout: PANEL_LOAD_TIMEOUT });
      await expect(page.locator('#executionStageTitle')).toHaveCount(0);
      await expect(page.locator('#executionStageDesc')).toHaveCount(0);
      await expect(page.locator('#statusStepper .step-current .step-label-wrap')).toHaveText(rc.activeStepLabel);
      await expect(page.locator('#trialRoundTimeline .round-timeline-item')).toHaveCount(rc.roundCount);
      await expect(page.locator(rc.actionButton)).toHaveText(rc.actionText);
      if (rc.absentButton) {
        await expect(page.locator(rc.absentButton)).toHaveCount(0);
      }
    });
  }

  /* T003 is seeded as an in-progress official run (issue #194) and T002 as
     waiting IAA confirmation (issue #186), so their settings are read-only
     (isSettingsEditable() requires status==='draft') -- excluded from the
     draft-only edit-form loop below and covered by their own cases instead. */
  for (const task of TASK_PROFILES.filter((t) => t.id !== 'T002' && t.id !== 'T003')) {
    test(`opens the settings edit form with one accordion per output for ${task.id}`, async ({ page }) => {
      await page.goto(`${TASK_DETAIL_URL}?task_id=${task.id}`);

      const editBtn = page.locator('#settingsEditBtn');
      await expect(page.locator('#statusBadge')).toContainText('草稿', { timeout: PANEL_LOAD_TIMEOUT });
      await expect(editBtn).toBeEnabled();
      await editBtn.click();

      await expect(page.locator('#settingsEditForm')).not.toHaveClass(/hidden/);
      /* The item-pair labels card shares .output-accordion styling but is not an output accordion */
      await expect(page.locator('#schemaFields .output-accordion:not(.item-pair-labels-card)')).toHaveCount(task.outputCount);
    });
  }

  test('settings edit form is read-only for the in-progress official run T003 (issue #194)', async ({ page }) => {
    await page.goto(`${TASK_DETAIL_URL}?task_id=T003`);

    await expect(page.locator('#statusBadge')).toContainText('正式標記進行中', { timeout: PANEL_LOAD_TIMEOUT });
    await expect(page.locator('#settingsEditBtn')).toBeDisabled();
  });

  test('settings edit form is read-only for the waiting-IAA dry run T002 (issue #186)', async ({ page }) => {
    await page.goto(`${TASK_DETAIL_URL}?task_id=T002`);

    await expect(page.locator('#statusBadge')).toContainText('待 IAA 確認', { timeout: PANEL_LOAD_TIMEOUT });
    await expect(page.locator('#settingsEditBtn')).toBeDisabled();
  });

  test('persists edited item pair labels across settings edit sessions for T011', async ({ page }) => {
    await page.goto(`${TASK_DETAIL_URL}?task_id=T011`);

    const editBtn = page.locator('#settingsEditBtn');
    await expect(page.locator('#statusBadge')).toContainText('草稿', { timeout: PANEL_LOAD_TIMEOUT });
    await editBtn.click();

    const label1 = page.getByTestId('item-pair-label-input-1');
    await expect(label1).toHaveValue('Premise');
    await label1.fill('前提');
    await page.locator('#settingsSaveBtn').click();
    await expect(page.locator('#settingsEditForm')).toHaveClass(/hidden/);

    await editBtn.click();
    await expect(page.getByTestId('item-pair-label-input-1')).toHaveValue('前提');
  });

  test('re-derives item pair labels after replacing the dataset in overview edit for T011', async ({ page }) => {
    await page.goto(`${TASK_DETAIL_URL}?task_id=T011`);

    /* Save custom labels first so the stale-pending path has a saved value */
    const settingsEditBtn = page.locator('#settingsEditBtn');
    await expect(page.locator('#statusBadge')).toContainText('草稿', { timeout: PANEL_LOAD_TIMEOUT });
    await settingsEditBtn.click();
    await page.getByTestId('item-pair-label-input-1').fill('前提');
    await page.locator('#settingsSaveBtn').click();
    await expect(page.locator('#settingsEditForm')).toHaveClass(/hidden/);

    await page.locator('#overviewEditBtn').click();
    await page.locator('#datasetFileInput').setInputFiles(
      path.join(__dirname, 'three-column-dataset.json'),
    );
    await expect(page.locator('#datasetFileList .upload-file-name')).toContainText('three-column-dataset.json');

    /* The fresh dataset has no input roles assigned yet, so the saved NLI
       labels must not leak through — labels fall back to the generic pair names */
    await settingsEditBtn.click();
    await expect(page.getByTestId('item-pair-label-input-1')).toHaveValue('句子 A');
  });
});
