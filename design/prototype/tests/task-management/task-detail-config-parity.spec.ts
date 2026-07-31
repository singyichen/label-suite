import { test, expect } from '@playwright/test';
import path from 'path';

/**
 * TDD contract for syncing task-detail's settings surfaces with
 * task-new Step 1 (dataset upload + field-role table + task-type chips)
 * and Step 2 (per-output accordions + interactive preview + YAML/JSON code).
 *
 * task-detail adopts the same element ids as task-new's shared config engine,
 * and reads seed names/statuses from task-list.data.js (single source).
 */

const TASK_DETAIL_URL = '/pages/task-management/task-detail.html';
const FIXTURE = path.resolve(__dirname, 'three-column-dataset.json');

// Tab panels arrive via fetched partials; allow extra time under
// parallel-worker load before the first panel-dependent assertion.
const PANEL_LOAD_TIMEOUT = 15000;

async function openOverviewEdit(page: import('@playwright/test').Page, taskId: string) {
  await page.goto(`${TASK_DETAIL_URL}?task_id=${taskId}`);
  const editBtn = page.locator('#overviewEditBtn');
  await expect(editBtn).toBeEnabled({ timeout: PANEL_LOAD_TIMEOUT });
  await editBtn.click();
  await expect(page.locator('#overviewEditForm')).not.toHaveClass(/hidden/);
}

async function openSettingsEdit(page: import('@playwright/test').Page, taskId: string) {
  await page.goto(`${TASK_DETAIL_URL}?task_id=${taskId}`);
  const editBtn = page.locator('#settingsEditBtn');
  await expect(editBtn).toBeEnabled({ timeout: PANEL_LOAD_TIMEOUT });
  await editBtn.click();
  await expect(page.locator('#settingsEditForm')).not.toHaveClass(/hidden/);
}

test.describe('Task detail config parity with task-new Step 1/2', () => {
  test('unifies seed name and status with task-list data (T010)', async ({ page }) => {
    await page.goto(`${TASK_DETAIL_URL}?task_id=T010`);
    await expect(page.locator('#bcCurrent')).toHaveText('醫療實體與關係辨識', { timeout: PANEL_LOAD_TIMEOUT });
    await expect(page.locator('#statusBadge')).toContainText('草稿');
    await expect(page.locator('#overviewEditBtn')).toBeEnabled();
    await expect(page.locator('#settingsEditBtn')).toBeEnabled();
  });

  test('overview edit exposes Step 1 task-type chips prefilled from task config (T001)', async ({ page }) => {
    await openOverviewEdit(page, 'T001');
    await page.waitForFunction(
      () => document.querySelectorAll('#taskCategoryChips [data-key]').length > 0,
      null,
      { timeout: 10000 }
    );
    await expect(
      page.locator('#taskCategoryChips .task-type-chip[data-key="classification"]')
    ).toHaveAttribute('aria-checked', 'true');
    await expect(
      page.locator('#taskInputTypeChips .task-type-chip[data-key="single_item"]')
    ).toHaveAttribute('aria-checked', 'true');
    await expect(
      page.locator('#taskOutputTypeChips .task-type-chip[data-key="single_label"]')
    ).toHaveAttribute('aria-checked', 'true');
  });

  test('overview edit shows the field-role table prefilled from the seed dataset (T001)', async ({ page }) => {
    await openOverviewEdit(page, 'T001');
    const preview = page.locator('#inlineDatasetPreview');
    await expect(preview).toBeVisible();
    await expect(
      preview.locator('.inline-preview-role-select[aria-label*="text"]')
    ).toHaveValue('input');
    await expect(
      preview.locator('.inline-preview-role-select[aria-label*="gold_label"]')
    ).toHaveValue('output');
    expect(
      await preview.locator('[data-testid="field-role-feedback"]').count()
    ).toBeGreaterThan(0);
  });

  test('overview edit accepts a new JSON dataset upload (T001)', async ({ page }) => {
    await openOverviewEdit(page, 'T001');
    await page.locator('#datasetFileInput').setInputFiles(FIXTURE);
    await expect(page.locator('#datasetFileList')).toContainText('three-column-dataset.json');
    await expect(
      page.locator('.inline-preview-role-select[aria-label*="sentence_a"]')
    ).toBeVisible();
  });

  test('settings edit exposes Step 2 accordion, preview and code (T001)', async ({ page }) => {
    await openSettingsEdit(page, 'T001');
    await expect(page.locator('#schemaFields .output-accordion')).toHaveCount(1);
    await expect(
      page.locator('#schemaFields [data-testid="output-accordion-toggle"]').first()
    ).toBeVisible();
    expect(await page.locator('#schemaFields .schema-bypass-field').count()).toBeGreaterThan(0);
    await expect(page.locator('#annotationPreview')).toContainText('positive');
    // task-new renders template buttons only for the ABSA output combo;
    // for single_label the template section offers the config upload path.
    await expect(page.locator('#uploadConfigBtn')).toBeVisible();
    await expect(page.locator('#codeEditor')).toHaveValue(/outputs:/);
    await page.locator('#formatJsonBtn').click();
    const jsonValue = await page.locator('#codeEditor').inputValue();
    expect(jsonValue.trim().startsWith('{')).toBe(true);
  });

  test('code editor round-trips into the visual settings (T001)', async ({ page }) => {
    await openSettingsEdit(page, 'T001');
    await page.locator('#formatJsonBtn').click();
    const raw = await page.locator('#codeEditor').inputValue();
    const parsed = JSON.parse(raw);
    parsed.outputs[0].config.label_options[0].name = 'excellent';
    await page.locator('#codeEditor').fill(JSON.stringify(parsed, null, 2));
    const saveBtn = page.locator('#saveCodeBtn');
    await expect(saveBtn).toBeEnabled();
    await saveBtn.click();
    await expect(page.locator('#annotationPreview')).toContainText('excellent');
  });

  test('multi-output seed renders one accordion per output (T013)', async ({ page }) => {
    await openSettingsEdit(page, 'T013');
    await expect(page.locator('#schemaFields .output-accordion')).toHaveCount(3);
  });

  test('overview edit localizes Step 1 labels in English mode (T001)', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('labelsuite.lang', 'en');
    });
    await page.goto(`${TASK_DETAIL_URL}?task_id=T001`);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en', { timeout: PANEL_LOAD_TIMEOUT });

    const editBtn = page.locator('#overviewEditBtn');
    await expect(editBtn).toBeEnabled();
    await editBtn.click();
    await expect(page.locator('#overviewEditForm')).not.toHaveClass(/hidden/);

    await expect(page.locator('#uploadZoneLabel')).toHaveText('Click or drag to upload dataset');
    await expect(page.locator('#inlinePreviewTitle')).toHaveText('Column preview · assign field roles');
    await expect(page.locator('#taskCategoryGroupLabel')).toHaveText('Category (multi-select)');
    await expect(page.locator('#taskInputTypeGroupLabel')).toHaveText('Input type (single-select)');
    await expect(page.locator('#taskOutputTypeGroupLabel')).toHaveText('Output type (multi-select)');
  });

  test('non-draft status keeps both surfaces read-only (T001)', async ({ page }) => {
    await page.goto(`${TASK_DETAIL_URL}?task_id=T001&status=official_run_in_progress`);
    await expect(page.locator('#overviewEditBtn')).toBeDisabled({ timeout: PANEL_LOAD_TIMEOUT });
    await expect(page.locator('#settingsEditBtn')).toBeDisabled();
    await expect(page.locator('#overviewEditForm')).toHaveClass(/hidden/);
    await expect(page.locator('#settingsEditForm')).toHaveClass(/hidden/);
  });
});
