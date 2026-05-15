import { test, expect } from '@playwright/test';

const TASK_DETAIL_URL = '/pages/task-management/task-detail.html';

test.describe('Task detail settings edit state', () => {
  const EN_EDIT_EXPECTATIONS = [
    {
      name: 'single sentence classification',
      url: `${TASK_DETAIL_URL}?task_id=T001`,
      previewTexts: ['Politics', 'Society', 'Entertainment', 'Sports', 'Technology'],
      formTexts: ['Politics', 'Society', 'Entertainment', 'Sports', 'Technology'],
      codeTexts: ['- Politics', '- Society', '- Entertainment', '- Sports', '- Technology'],
      blockedTexts: ['政治', '社會', '娛樂', '體育', '科技'],
    },
    {
      name: 'VA scoring',
      url: TASK_DETAIL_URL,
      previewTexts: ['Valence', 'Arousal', '1', '9'],
      formTexts: ['Min', 'Max', 'Step'],
      codeTexts: ['valence:', 'arousal:'],
      blockedTexts: ['最小值', '最大值', '間距'],
    },
    {
      name: 'aspect list',
      url: `${TASK_DETAIL_URL}?task_id=T003`,
      previewTexts: ['Sentence', 'Aspect List'],
      previewInputValues: ['service attitude', 'cleanliness', 'food quality'],
      formTexts: ['Field mapping', 'Aspect editing rules', 'Quantity limits'],
      codeTexts: ['subtype: aspect_list', 'input_field: sentence', 'aspect_list_field: aspects'],
      blockedTexts: ['欄位對應', 'Aspect 編輯規則', '數量限制', '服務態度', '環境整潔', '餐點品質'],
    },
    {
      name: 'relation extraction',
      url: `${TASK_DETAIL_URL}?task_id=T004`,
      previewTexts: ['Mark relations', 'treats', 'causes', 'indicates'],
      formTexts: ['Entity types', 'Relation types', 'Tuple mode'],
      codeTexts: ['- treats', '- causes', '- indicates'],
      blockedTexts: ['標記關係', '實體類型', '關係類型', '結構模式'],
    },
    {
      name: 'sentence pairs',
      url: `${TASK_DETAIL_URL}?task_id=T005`,
      previewTexts: ['Sentence A', 'Sentence B', 'Entailment', 'Contradiction', 'Neutral'],
      formTexts: ['Relation labels', 'Entailment', 'Contradiction', 'Neutral'],
      codeTexts: ['- Entailment', '- Contradiction', '- Neutral'],
      blockedTexts: ['句子 A', '句子 B', '蘊含', '矛盾', '中立'],
    },
    {
      name: 'NER',
      url: `${TASK_DETAIL_URL}?task_id=T006`,
      previewTexts: ['Mark entities', 'PER', 'ORG', 'LOC'],
      formTexts: ['Subtype', 'Entity types', 'Labeling scheme'],
      codeTexts: ['subtype: ner', 'name: PER', 'name: ORG', 'name: LOC'],
      blockedTexts: ['請標記實體', '子類型', '實體類型', '標記格式'],
    },
  ];

  for (const item of EN_EDIT_EXPECTATIONS) {
    test(`renders English settings edit mode for ${item.name}`, async ({ page }) => {
      await page.addInitScript(() => {
        window.localStorage.setItem('labelsuite.lang', 'en');
      });
      await page.goto(item.url);
      const langLabel = page.locator('#langLabel');
      await langLabel.waitFor({ state: 'attached', timeout: 5000 });
      if ((await langLabel.textContent()) !== 'EN') {
        await page.locator('#langToggle').click();
      }
      await expect(page.locator('html')).toHaveAttribute('lang', 'en');

      const editBtn = page.locator('#settingsEditBtn');
      await expect(editBtn).toBeEnabled();
      await editBtn.click();

      const preview = page.locator('#settingsAnnotationPreview');
      const form = page.locator('#settingsEditForm');
      const codeEditor = page.locator('#settingsCodeEditor');

      for (const text of item.previewTexts) {
        await expect(preview).toContainText(text);
      }
      if ('previewInputValues' in item) {
        const inputValues = await preview.locator('input').evaluateAll((inputs) =>
          inputs.map((input) => input instanceof HTMLInputElement ? input.value : '')
        );
        for (const value of item.previewInputValues) {
          expect(inputValues).toContain(value);
        }
      }
      for (const text of item.formTexts) {
        await expect(form).toContainText(text);
      }
      for (const text of item.codeTexts) {
        await expect(codeEditor).toHaveValue(new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
      }
      for (const text of item.blockedTexts) {
        await expect(form).not.toContainText(text);
      }
    });
  }

  test('renders VA dimensions summary and dual-row preview for single_sentence_va_scoring', async ({ page }) => {
    await page.goto(TASK_DETAIL_URL);

    await page.evaluate(() => {
      const win = window as typeof window & {
        TASK_DATA: { taskTypeKey: string; configContent: string };
        renderOverview: () => void;
      };
      win.TASK_DATA.taskTypeKey = 'single_sentence_va_scoring';
      win.TASK_DATA.configContent = [
        'valence:',
        '  min: 1',
        '  max: 9',
        '  step: 1',
        'arousal:',
        '  min: 1',
        '  max: 9',
        '  step: 1',
      ].join('\n');
      win.renderOverview();
    });

    await expect(page.locator('#settingsConfigView')).toContainText('Valence');
    await expect(page.locator('#settingsConfigView')).toContainText('Arousal');

    await page.locator('#settingsEditBtn').click();

    const preview = page.locator('#settingsAnnotationPreview');
    await expect(preview).toContainText('Valence 評分');
    await expect(preview).toContainText('Arousal 評分');
  });

  test('renders settings summary fields by task type', async ({ page }) => {
    await page.goto(TASK_DETAIL_URL);

    await page.evaluate(() => {
      const win = window as typeof window & {
        TASK_DATA: { taskTypeKey: string; configContent: string };
        renderOverview: () => void;
      };
      win.TASK_DATA.taskTypeKey = 'sequence_labeling';
      win.TASK_DATA.configContent = [
        'entities:',
        '  - name: PER',
        '    color: #6366F1',
        '  - name: ORG',
        '    color: #10B981',
        '  - name: LOC',
        '    color: #F59E0B',
        'scheme: IOB2',
        'allow_overlapping: false',
      ].join('\n');
      win.renderOverview();
    });

    await expect(page.locator('#settingsConfigView')).toContainText('實體類型');
    await expect(page.locator('#settingsConfigView')).toContainText('標記格式');
    await expect(page.locator('#settingsConfigView')).toContainText('PER, ORG, LOC');
    await expect(page.locator('#settingsConfigView')).toContainText('IOB2');
    await expect(page.locator('#settingsConfigView')).not.toContainText('標籤清單');
    await expect(page.locator('#settingsConfigDynamicRows .kv-dl-key:has-text("實體類型") .required')).toHaveText('*');
    await expect(page.locator('#settingsConfigDynamicRows .kv-dl-key:has-text("標記格式") .required')).toHaveText('*');
    await expect(page.locator('#settingsConfigDynamicRows .kv-dl-key:has-text("允許重疊標記") .required')).toHaveCount(0);
  });

  test('renders aspect_list settings with grouped visual editor and row preview', async ({ page }) => {
    await page.goto(TASK_DETAIL_URL);

    await page.evaluate(() => {
      const win = window as typeof window & {
        TASK_DATA: { taskTypeKey: string; configContent: string };
        renderOverview: () => void;
      };
      win.TASK_DATA.taskTypeKey = 'sequence_labeling';
      win.TASK_DATA.configContent = [
        'subtype: aspect_list',
        'input_field: sentence',
        'aspect_list_field: aspects',
        'allow_sentence_edit: false',
        'allow_aspect_add: true',
        'allow_aspect_delete: true',
        'require_exact_match_in_sentence: true',
        'min_aspects: 1',
        'max_aspects: 10',
        'require_sentiment_context_check: true',
      ].join('\n');
      win.renderOverview();
    });

    const summary = page.locator('#settingsConfigView');
    await expect(summary).toContainText('子類型');
    await expect(summary).toContainText('Aspect List 抽取／校正');
    await expect(summary).toContainText('輸入欄位名稱');
    await expect(summary).toContainText('sentence');
    await expect(summary).toContainText('輸出欄位名稱');
    await expect(summary).toContainText('aspects');
    await expect(summary).toContainText('提示前後文情緒描述核查');
    await expect(summary).not.toContainText('實體類型');
    await expect(summary).not.toContainText('標記格式');

    await page.locator('#settingsEditBtn').click();

    const form = page.locator('#settingsEditForm');
    await expect(form).toContainText('欄位對應');
    await expect(form).toContainText('Aspect 編輯規則');
    await expect(form).toContainText('數量限制');
    await expect(form.locator('#settingsTemplateBtns .template-btn')).toHaveCount(2);
    await expect(form.locator('#settingsTemplateBtns')).toContainText('套用預設範本：NER 命名實體辨識');
    await expect(form.locator('#settingsTemplateBtns')).toContainText('套用預設範本：Aspect List 抽取／校正');
    await expect(form.locator('.settings-schema-toggle-list .settings-toggle-card')).toHaveCount(5);

    const preview = page.locator('#settingsAnnotationPreview');
    await expect(preview).toContainText('句子');
    await expect(preview).toContainText('Aspect List');
    await expect(preview.locator('.aspect-list-preview-row')).toHaveCount(3);
    await expect(preview.locator('.aspect-list-preview-add')).toBeVisible();
    await expect(preview).toContainText('軟性指引');
  });

  test('matches task-new step2 interaction model', async ({ page }) => {
    await page.goto(TASK_DETAIL_URL);

    await expect(page.locator('#settingsSummaryTitle')).toHaveText('標記設定');
    await expect(page.locator('#settingsConfigView')).not.toContainText('抽樣方式');
    await expect(page.locator('#settingsConfigView')).not.toContainText('抽樣數值');
    await expect(page.locator('#settingsConfigView')).not.toContainText('試標 / 正式資料配比');
    await expect(page.locator('#valueConfigVersion')).toHaveText('');

    const editBtn = page.locator('#settingsEditBtn');
    await expect(editBtn).toBeVisible();
    await expect(editBtn).toBeEnabled();

    await editBtn.click();

    await expect(page.locator('#settingsConfigView')).toHaveClass(/hidden/);
    await expect(page.locator('#settingsEditForm')).not.toHaveClass(/hidden/);
    await expect(page.locator('#settingsEditForm')).toContainText('標記預覽');
    await expect(page.locator('#settingsEditForm')).toContainText('從範本開始或者上傳設定檔');
    await expect(page.locator('#settingsEditForm')).toContainText('Valence');
    await expect(page.locator('#settingsEditForm')).toContainText('Arousal');
    await expect(page.locator('#settingsEditForm')).not.toContainText('請先新增至少一個標記選項');

    const yamlBtn = page.locator('#settingsFormatYamlBtn');
    const jsonBtn = page.locator('#settingsFormatJsonBtn');
    const codeEditor = page.locator('#settingsCodeEditor');
    const saveCodeBtn = page.locator('#settingsSaveCodeBtn');
    const saveSettingsBtn = page.locator('#settingsSaveBtn');

    await expect(yamlBtn).toHaveClass(/active/);
    await codeEditor.fill([
      'valence:',
      '  min: 1',
      '  max: 7',
      '  step: 1',
      'arousal:',
      '  min: 1',
      '  max: 5',
      '  step: 1',
    ].join('\n'));
    await expect(saveCodeBtn).toBeEnabled();
    await expect(saveSettingsBtn).toBeDisabled();

    await jsonBtn.click();
    await expect(yamlBtn).toHaveClass(/active/);

    await saveCodeBtn.click();
    await expect(saveSettingsBtn).toBeEnabled();
  });
});
