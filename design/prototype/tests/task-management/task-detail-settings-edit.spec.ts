import { test, expect } from '@playwright/test';

const TASK_DETAIL_URL = '/pages/task-management/task-detail.html';
const PANEL_LOAD_TIMEOUT = 15000;

async function openSettingsEdit(page: import('@playwright/test').Page, taskId: string) {
  await page.goto(`${TASK_DETAIL_URL}?task_id=${taskId}`);
  const editBtn = page.locator('#settingsEditBtn');
  await expect(editBtn).toBeEnabled({ timeout: PANEL_LOAD_TIMEOUT });
  await editBtn.click();
  await expect(page.locator('#settingsEditForm')).not.toHaveClass(/hidden/);
}

test.describe('Task detail settings edit state', () => {
  test('renders the Step 2 style settings summary without sampling fields (T001)', async ({ page }) => {
    await page.goto(`${TASK_DETAIL_URL}?task_id=T001`);

    await expect(page.locator('#settingsSummaryTitle')).toHaveText('標記設定', { timeout: PANEL_LOAD_TIMEOUT });
    await expect(page.locator('#settingsConfigView')).not.toContainText('抽樣方式');
    await expect(page.locator('#settingsConfigView')).not.toContainText('抽樣數值');
    await expect(page.locator('#settingsConfigView')).not.toContainText('試標 / 正式資料配比');
    await expect(page.locator('#valueConfigVersion')).toHaveText('cfg-t001-v1.0.0');
    await expect(page.locator('#valueTaskType')).toHaveText('單一標籤');

    const row = page.locator('#settingsConfigDynamicRows .kv-dl-row').first();
    await expect(row.locator('.kv-dl-key')).toContainText('單一標籤');
    await expect(row.locator('.kv-dl-key .required')).toHaveText('*');
    await expect(row.locator('.kv-dl-value')).toHaveText('positive, neutral, negative');
  });

  test('renders English settings edit mode from the shared engine (T001)', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('labelsuite.lang', 'en');
    });
    await page.goto(`${TASK_DETAIL_URL}?task_id=T001`);
    const langLabel = page.locator('#langLabel');
    await langLabel.waitFor({ state: 'attached', timeout: PANEL_LOAD_TIMEOUT });
    if ((await langLabel.textContent()) !== 'EN') {
      await page.locator('#langToggle').click();
    }
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');

    const editBtn = page.locator('#settingsEditBtn');
    await expect(editBtn).toBeEnabled();
    await editBtn.click();

    const form = page.locator('#settingsEditForm');
    await expect(form).not.toHaveClass(/hidden/);
    await expect(form.locator('#schemaFields')).toContainText('Single label');
    await expect(form.locator('#schemaFields')).not.toContainText('單一標籤');
    await expect(page.locator('#annotationPreview')).toContainText('positive');
    await expect(page.locator('#codeEditor')).toHaveValue(/outputs:/);
    await expect(page.locator('#codeEditor')).toHaveValue(/single_label/);
  });

  test('renders the scoring preview from the seeded output config (T004)', async ({ page }) => {
    await openSettingsEdit(page, 'T004');

    await expect(page.locator('#schemaFields .output-accordion')).toHaveCount(1);
    await expect(page.locator('#annotationPreview')).toContainText('readability');
    await expect(page.locator('#codeEditor')).toHaveValue(/single_dim/);
  });

  test('locks the code format toggle while the code draft is dirty (T001)', async ({ page }) => {
    await openSettingsEdit(page, 'T001');

    const codeEditor = page.locator('#codeEditor');
    await expect(codeEditor).toHaveValue(/outputs:/);
    await expect(page.locator('#saveCodeBtn')).toBeDisabled();

    await codeEditor.fill('outputs: []\n');
    await expect(page.locator('#saveCodeBtn')).toBeEnabled();

    // Dirty draft blocks format switching so unsaved edits are not clobbered.
    await page.locator('#formatJsonBtn').click();
    await expect(codeEditor).toHaveValue(/outputs: \[\]/);
  });

  test('surfaces invalid code through the error bar without leaving edit mode (T001)', async ({ page }) => {
    await openSettingsEdit(page, 'T001');

    // A leading '{' routes the draft through JSON.parse, whose failure is the
    // engine's deterministic error-bar path (the YAML subset parser is lenient).
    await page.locator('#codeEditor').fill('{ this is not valid json');
    await page.locator('#saveCodeBtn').click();

    await expect(page.locator('#codeErrorBar')).not.toHaveClass(/hidden/);
    await expect(page.locator('#settingsEditForm')).not.toHaveClass(/hidden/);
  });

  test('offers the ABSA template only for the entity + relation combo (T010)', async ({ page }) => {
    await openSettingsEdit(page, 'T010');

    await expect(page.locator('#templateBtns .template-btn')).toHaveCount(1);
    await expect(page.locator('#uploadConfigBtn')).toBeVisible();
  });

  test('offers only the config upload path for single-output tasks (T001)', async ({ page }) => {
    await openSettingsEdit(page, 'T001');

    await expect(page.locator('#templateBtns .template-btn')).toHaveCount(0);
    await expect(page.locator('#uploadConfigBtn')).toBeVisible();
  });

  test('persists code-edited settings into the summary view on save (T001)', async ({ page }) => {
    await openSettingsEdit(page, 'T001');

    await page.locator('#formatJsonBtn').click();
    const raw = await page.locator('#codeEditor').inputValue();
    const parsed = JSON.parse(raw);
    parsed.outputs[0].config.label_options[0].name = 'excellent';
    await page.locator('#codeEditor').fill(JSON.stringify(parsed, null, 2));
    await page.locator('#saveCodeBtn').click();
    await page.locator('#settingsSaveBtn').click();

    await expect(page.locator('#settingsEditForm')).toHaveClass(/hidden/);
    await expect(page.locator('#settingsConfigView')).not.toHaveClass(/hidden/);
    await expect(page.locator('#settingsConfigView')).toContainText('excellent');
  });

  test('cancel restores the saved settings summary (T001)', async ({ page }) => {
    await openSettingsEdit(page, 'T001');

    page.on('dialog', (dialog) => dialog.accept());
    await page.locator('#codeEditor').fill('outputs: []\n');
    await page.locator('#settingsCancelBtn').click();

    await expect(page.locator('#settingsEditForm')).toHaveClass(/hidden/);
    await expect(page.locator('#settingsConfigView')).toContainText('positive, neutral, negative');
  });
});
