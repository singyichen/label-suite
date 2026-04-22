import { test, expect } from '@playwright/test';

const TASK_DETAIL_URL = '/pages/task-management/task-detail.html';

test.describe('Task detail settings edit state', () => {
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
    await expect(page.locator('#settingsEditForm')).toContainText('正向');
    await expect(page.locator('#settingsEditForm')).not.toContainText('請先新增至少一個標記選項');

    const yamlBtn = page.locator('#settingsFormatYamlBtn');
    const jsonBtn = page.locator('#settingsFormatJsonBtn');
    const codeEditor = page.locator('#settingsCodeEditor');
    const saveCodeBtn = page.locator('#settingsSaveCodeBtn');
    const saveSettingsBtn = page.locator('#settingsSaveBtn');

    await expect(yamlBtn).toHaveClass(/active/);
    await codeEditor.fill('labels: [正向, 負向]\nallow_multiple: false');
    await expect(saveCodeBtn).toBeEnabled();
    await expect(saveSettingsBtn).toBeDisabled();

    await jsonBtn.click();
    await expect(yamlBtn).toHaveClass(/active/);

    await saveCodeBtn.click();
    await expect(saveSettingsBtn).toBeEnabled();
  });
});
