import { test, expect } from '@playwright/test';

const TASK_DETAIL_URL = '/pages/task-management/task-detail.html';

test.describe('Task detail settings edit state', () => {
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
