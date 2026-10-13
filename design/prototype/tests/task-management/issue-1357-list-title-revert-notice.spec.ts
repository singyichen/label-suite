/*
 * Traceability: specs/task-management/013-task-new/spec.md
 *   FR-002c-9, AC-1.9 (clarification) — issue #1357.
 *
 * Contract: after the selected list-title field becomes invalid and the
 * dropdown reverts to auto, the revert notice persists across later
 * re-renders of the inline preview. It clears only when the user changes the
 * list-title dropdown selection, or when the dataset is removed / re-uploaded
 * (resetInlinePreviewSelection).
 */
import { test, expect } from '../fixtures';
import type { Page } from '@playwright/test';

const TASK_NEW_URL = '/pages/task-management/task-new.html';
const AUTO_LABEL_ZH = '自動（依資料形狀）';

const ROWS = [
  { id: 'r1', text: 'alpha first', gold_label: 'POS', note: 'n1' },
  { id: 'r2', text: 'beta second', gold_label: 'NEG', note: 'n2' },
  { id: 'r3', text: 'gamma third', gold_label: 'NEU', note: 'n3' },
];

async function uploadRows(page: Page, fileName: string) {
  await page.locator('#datasetFileInput').setInputFiles({
    name: fileName,
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(ROWS)),
  });
  await expect(page.locator('.inline-dataset-preview-wrap')).toBeVisible();
}

async function setFieldRole(page: Page, column: string, role: string) {
  await page.locator(`.inline-preview-role-select[aria-label$="${column}"]`).selectOption(role);
}

const select = (page: Page) => page.getByTestId('list-title-field-select');
const notice = (page: Page) => page.getByTestId('list-title-revert-notice');

async function setupReverted(page: Page) {
  await page.goto(TASK_NEW_URL, { waitUntil: 'load' });
  await page.waitForFunction(
    () => document.querySelectorAll('#taskCategoryChips [data-key]').length > 0,
    null,
    { timeout: 30000 },
  );
  await page.fill('#taskNameInput', 'issue-1357-revert-notice');
  await page.locator('#taskCategoryChips [data-key="classification"]').click();
  await page.locator('#taskOutputTypeChips [data-key="single_label"]').click();
  await uploadRows(page, 'issue-1357.json');
  await setFieldRole(page, 'text', 'input');
  await setFieldRole(page, 'gold_label', 'output');
  await setFieldRole(page, 'note', 'evidence');
  await select(page).selectOption('text');
  await expect(notice(page)).toHaveCount(0);

  // Revert: the selected field leaves the option set
  await setFieldRole(page, 'text', '');
  await expect(notice(page)).toBeVisible();
  await expect(select(page).locator('option:checked')).toHaveText(AUTO_LABEL_ZH);
}

test.describe('Issue #1357 — list title revert notice persistence (AC-1.9)', () => {
  test('notice stays visible after a later, unrelated re-render', async ({ page }) => {
    await setupReverted(page);

    // Extra re-render: change the role of an unrelated column
    await setFieldRole(page, 'note', '');

    await expect(notice(page)).toBeVisible();
    await expect(select(page).locator('option:checked')).toHaveText(AUTO_LABEL_ZH);
  });

  test('notice clears when the user picks a new list title option', async ({ page }) => {
    await setupReverted(page);

    await select(page).selectOption('note');

    await expect(select(page)).toHaveValue('note');
    await expect(notice(page)).toHaveCount(0);
  });

  test('notice clears when the user re-selects auto', async ({ page }) => {
    await setupReverted(page);
    await select(page).selectOption('note');
    await expect(notice(page)).toHaveCount(0);

    await setFieldRole(page, 'note', '');
    await expect(notice(page)).toBeVisible();

    await select(page).selectOption({ label: AUTO_LABEL_ZH });
    await expect(notice(page)).toHaveCount(0);
  });

  test('removing and re-uploading the dataset clears the notice', async ({ page }) => {
    await setupReverted(page);

    await page.locator('#datasetFileList .upload-file-remove').first().click();
    await expect(page.locator('#datasetFileList .upload-file-name')).toHaveCount(0);
    await uploadRows(page, 'issue-1357-again.json');
    await setFieldRole(page, 'text', 'input');

    await expect(notice(page)).toHaveCount(0);
  });
});
