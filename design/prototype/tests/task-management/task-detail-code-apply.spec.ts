/*
 * Traceability: specs/task-management/014-task-detail/spec.md FR-026 (3)
 *   (openspec/changes/task-detail-overview-settings-split, tasks.md 4.1, issue #1199 G4)
 *   Code backfill parity: specs/task-management/013-task-new/spec.md FR-003k, AC-2.25
 *
 * TDD Red for G4. Contract, 標記設定 section, edit mode, Code view:
 *   - the Code panel button is labelled 套用 and the panel has no other save button
 *   - 套用 only backfills Code -> Visual; the task's persisted settings are written only by the
 *     section header 儲存 (observable: cancelling edit restores the old summary)
 *   - parse error: #codeErrorBar visible, 套用 disabled, Visual keeps the last valid config
 *   - view-state key #labelConfigVersion reads 設定檔 (value stays the config file name)
 *
 * Expected on current code: label, live validation, toast text, unapplied-save hint, English strings
 * and the 設定檔 label fail; the backfill / not-persisted / header-save cases already pass.
 */
import { test, expect, type Page } from '@playwright/test';
import { openSettingsSection } from './_task-detail-settings-helpers';

const TASK_DETAIL_URL = '/pages/task-management/task-detail.html';
const PANEL_LOAD_TIMEOUT = 15000;

async function openLabelingEdit(page: Page) {
  await page.goto(`${TASK_DETAIL_URL}?task_id=T001`);
  await openSettingsSection(page, 'labeling');
  const editBtn = page.locator('#settingsEditBtn');
  await expect(editBtn).toBeEnabled({ timeout: PANEL_LOAD_TIMEOUT });
  await editBtn.click();
  await expect(page.locator('#settingsEditForm')).not.toHaveClass(/hidden/);
}

/** Rewrite the first label option name in the Code panel (JSON view) without applying it. */
async function editCodeLabel(page: Page, name: string) {
  await page.locator('#formatJsonBtn').click();
  const parsed = JSON.parse(await page.locator('#codeEditor').inputValue());
  parsed.outputs[0].config.label_options[0].name = name;
  await page.locator('#codeEditor').fill(JSON.stringify(parsed, null, 2));
}

const codePanel = (page: Page) => page.locator('.s2-code-panel');

test.describe('task-detail Code 套用 (FR-026 (3))', () => {
  test('Code panel button is labelled 套用 and is the only action button besides format toggles', async ({ page }) => {
    await openLabelingEdit(page);

    await expect(codePanel(page).getByRole('button', { name: '套用', exact: true })).toBeVisible();
    await expect(page.locator('#saveCodeBtnLabel')).toHaveText('套用');
    await expect(codePanel(page).getByRole('button', { name: '儲存' })).toHaveCount(0);
    // the only 儲存 in the edit state is the section header one
    await expect(page.locator('#settingsSaveBtn')).toHaveText('儲存');
  });

  test('套用 backfills Visual from valid Code (already passes on current code)', async ({ page }) => {
    await openLabelingEdit(page);
    await editCodeLabel(page, 'excellent');
    await codePanel(page).getByRole('button', { name: /^(套用|儲存)$/ }).click();

    await expect(page.locator('#annotationPreview')).toContainText('excellent');
    await expect(page.locator('#codeErrorBar')).toHaveClass(/hidden/);
  });

  test('套用 does not write persisted settings: cancelling edit restores the old summary (passes on current code)', async ({ page }) => {
    await openLabelingEdit(page);
    page.on('dialog', (dialog) => dialog.accept());
    await editCodeLabel(page, 'excellent');
    await codePanel(page).getByRole('button', { name: /^(套用|儲存)$/ }).click();
    await expect(page.locator('#annotationPreview')).toContainText('excellent');

    await page.locator('#settingsCancelBtn').click();

    await expect(page.locator('#settingsEditForm')).toHaveClass(/hidden/);
    await expect(page.locator('#settingsConfigView')).toContainText('positive, neutral, negative');
    await expect(page.locator('#settingsConfigView')).not.toContainText('excellent');
  });

  test('only the section header 儲存 submits the applied config (passes on current code)', async ({ page }) => {
    await openLabelingEdit(page);
    await editCodeLabel(page, 'excellent');
    await codePanel(page).getByRole('button', { name: /^(套用|儲存)$/ }).click();
    await expect(page.locator('#settingsEditForm')).not.toHaveClass(/hidden/);

    await page.locator('#settingsSaveBtn').click();

    await expect(page.locator('#settingsEditForm')).toHaveClass(/hidden/);
    await expect(page.locator('#settingsConfigView')).toContainText('excellent');
  });

  test('typing invalid content live shows the error bar and disables 套用; fixing it restores both (no click)', async ({ page }) => {
    await openLabelingEdit(page);
    await expect(page.locator('#annotationPreview')).toContainText('positive');
    const validContent = await page.locator('#codeEditor').inputValue();
    const applyBtn = codePanel(page).getByRole('button', { name: /^(套用|儲存)$/ });

    // a leading '{' routes through JSON.parse, the deterministic error path (YAML subset is lenient)
    await page.locator('#codeEditor').fill('{ this is not valid json');

    await expect(page.locator('#codeErrorBar')).not.toHaveClass(/hidden/);
    await expect(applyBtn).toBeDisabled();
    await expect(page.locator('#annotationPreview')).toContainText('positive');
    await expect(page.locator('#settingsEditForm')).not.toHaveClass(/hidden/);

    await page.locator('#codeEditor').fill(validContent);

    await expect(page.locator('#codeErrorBar')).toHaveClass(/hidden/);
    await expect(applyBtn).toBeEnabled();
  });

  test('successful 套用 toasts that nothing is submitted yet', async ({ page }) => {
    await openLabelingEdit(page);
    await editCodeLabel(page, 'excellent');
    await codePanel(page).getByRole('button', { name: /^(套用|儲存)$/ }).click();

    await expect(page.locator('#toastMsg')).toHaveText('已套用至 Visual，請按儲存送出');
  });

  test('header 儲存 is blocked while Code has an unapplied draft and hints 請先套用', async ({ page }) => {
    await openLabelingEdit(page);
    await editCodeLabel(page, 'excellent');

    await page.locator('#settingsSaveBtn').click();

    await expect(page.locator('#settingsEditForm')).not.toHaveClass(/hidden/);
    await expect(page.locator('#toastMsg')).toContainText('請先套用');
    await expect(page.locator('#settingsConfigView')).not.toContainText('excellent');
  });

  test('English mode: Code button reads Apply and the config-file label reads Config file', async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem('labelsuite.lang', 'en'));
    await openLabelingEdit(page);

    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('#saveCodeBtnLabel')).toHaveText('Apply');
    await expect(page.locator('#settingsCancelBtn')).toBeVisible();
    await page.locator('#settingsCancelBtn').click();
    await expect(page.locator('#labelConfigVersion')).toHaveText('Config file');
  });

  test('view-state key reads 設定檔 and the value stays the config file name', async ({ page }) => {
    await page.goto(`${TASK_DETAIL_URL}?task_id=T001`);
    await openSettingsSection(page, 'labeling');

    await expect(page.locator('#labelConfigVersion')).toHaveText('設定檔', { timeout: PANEL_LOAD_TIMEOUT });
    await expect(page.locator('#valueConfigVersion')).toHaveText('cfg-t001-v1.0.0');
  });
});
