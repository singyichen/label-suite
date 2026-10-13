/*
 * Traceability: specs/task-management/013-task-new/spec.md
 *   FR-002c-9, AC-1.8, AC-1.9, SC-002i
 *   specs/task-management/014-task-detail/spec.md FR-014k (isomorphic with 013)
 * OpenSpec change: task-new-list-title-field (issue #1338), Group 2
 *   (tasks 5.1, 6.1, 7.1; design.md D5).
 *
 * Contract:
 *   - The persisted key is exactly `list_title_field` (snake_case): a field
 *     name, or null for auto. No camelCase alias (`listTitleField`) may exist
 *     in persisted data or on TASK_DATA.
 *   - task-detail loads a created task's list_title_field into 設定›基本資料
 *     edit mode; the dropdown shows the same value (5.1).
 *   - Replacing the dataset keeps the selection when the field is still an
 *     Input/Evidence candidate and reverts to auto + notice otherwise (6.1).
 *   - Saving the basic-info form writes TASK_DATA.list_title_field (7.1).
 *
 * Known helper limitation (reported with the Red evidence): TASK_DATA is
 * in-memory and rebuilt from the createdTasks profile on reload, and the
 * existing overview save flow never writes back to localStorage. Save is
 * therefore asserted within one page session (TASK_DATA + re-entering edit
 * mode); a reload round trip is not assertable until Green adds a write-back.
 */
import { test, expect } from '../fixtures';
import { openSettingsSection } from './_task-detail-settings-helpers';
import type { Page } from '@playwright/test';

const TASK_NEW_URL = '/pages/task-management/task-new.html';
const TASK_DETAIL_URL = '/pages/task-management/task-detail.html';
const PANEL_LOAD_TIMEOUT = 15000;
const AUTO_LABEL_ZH = '自動（依資料形狀）';

type DetailWindow = typeof window & { TASK_DATA: Record<string, unknown> };

const ROWS = [
  { id: 'r1', text: 'alpha first', note: 'n1', gold_label: 'POS' },
  { id: 'r2', text: 'beta second', note: 'n2', gold_label: 'NEG' },
  { id: 'r3', text: 'gamma third', note: 'n3', gold_label: 'NEU' },
];

/** A createdTasks entry exactly as task-new's persistCreatedTask writes it. */
function createdTask(id: string, listTitleField: string | null | undefined) {
  const base: Record<string, unknown> = {
    id,
    nameZh: `issue-1338-${id}`,
    nameEn: `issue-1338-${id}`,
    sourceFile: 'issue-1338-seed.json',
    outputTypes: ['single_label'],
    runType: 'official_run',
    status: 'draft',
    updatedAt: '2026-10-13',
    canViewDetail: true,
    isMine: true,
    deletedAt: '',
    taskCategories: ['classification'],
    taskInputTypes: ['single_item'],
    outputs: [
      {
        type: 'single_label',
        config: { label_options: [{ name: 'POS' }, { name: 'NEG' }, { name: 'NEU' }] },
      },
    ],
    fieldRoleMap: { id: '', text: 'input', note: 'input', gold_label: 'output' },
    datasetFileName: 'issue-1338-seed.json',
    datasetRecords: ROWS,
  };
  if (listTitleField !== undefined) base.list_title_field = listTitleField;
  return base;
}

async function seedCreatedTask(page: Page, task: Record<string, unknown>) {
  await page.addInitScript((entry) => {
    window.localStorage.setItem('labelsuite.createdTasks', JSON.stringify([entry]));
  }, task);
}

const select = (page: Page) => page.getByTestId('list-title-field-select');
const items = (page: Page) => page.getByTestId('list-title-preview-item');

async function selectedLabel(page: Page): Promise<string> {
  return select(page).evaluate((s) => {
    const sel = s as HTMLSelectElement;
    return (sel.selectedOptions[0]?.textContent || '').trim();
  });
}

async function openBasicEdit(page: Page, taskId: string) {
  await page.goto(`${TASK_DETAIL_URL}?task_role=project_leader&task_id=${taskId}`);
  await expect(page.locator('#bcCurrent')).toHaveText(taskId, { timeout: PANEL_LOAD_TIMEOUT });
  await openSettingsSection(page, 'basic');
  const editBtn = page.locator('#overviewEditBtn');
  await expect(editBtn).toBeEnabled({ timeout: PANEL_LOAD_TIMEOUT });
  await editBtn.click();
  await expect(page.locator('#overviewEditForm')).not.toHaveClass(/hidden/);
  await expect(page.locator('.inline-dataset-preview-wrap')).toBeVisible({
    timeout: PANEL_LOAD_TIMEOUT,
  });
}

async function readTaskData(page: Page, key: string) {
  return page.evaluate((k) => (window as DetailWindow).TASK_DATA[k], key);
}

/* ── 5.1 task-detail loads list_title_field ─────────────────────── */

test.describe('Issue #1338 — task-detail loads list_title_field (5.1, FR-014k)', () => {
  test('a created task with list_title_field "note" opens the edit form with that field selected and previewed', async ({
    page,
  }) => {
    await seedCreatedTask(page, createdTask('T9381', 'note'));
    await openBasicEdit(page, 'T9381');

    await expect(select(page)).toBeVisible();
    await expect(select(page)).toHaveValue('note');
    await expect(items(page)).toHaveCount(3);
    await expect(items(page).nth(0)).toContainText('n1');
    await expect(items(page).nth(1)).toContainText('n2');
    await expect(items(page).nth(2)).toContainText('n3');
    expect(await readTaskData(page, 'list_title_field')).toBe('note');
  });

  test('a created task whose list_title_field is null shows auto (not a stale or leaked field)', async ({
    page,
  }) => {
    await seedCreatedTask(page, createdTask('T9382', null));
    await openBasicEdit(page, 'T9382');

    await expect(select(page)).toBeVisible();
    expect(await selectedLabel(page)).toBe(AUTO_LABEL_ZH);
    await expect(select(page)).toHaveValue('');
    expect(await readTaskData(page, 'list_title_field')).toBeNull();
    await expect(page.getByTestId('list-title-revert-notice')).toHaveCount(0);
  });

  test('a created task without the list_title_field key (legacy record) normalizes to null and shows auto', async ({
    page,
  }) => {
    await seedCreatedTask(page, createdTask('T9383', undefined));
    await openBasicEdit(page, 'T9383');

    expect(await selectedLabel(page)).toBe(AUTO_LABEL_ZH);
    expect(await readTaskData(page, 'list_title_field')).toBeNull();
  });

  test('round trip: field chosen in task-new Step 1 is the selected value in task-detail edit mode', async ({
    page,
  }) => {
    await page.goto(TASK_NEW_URL, { waitUntil: 'load' });
    await page.waitForFunction(
      () => document.querySelectorAll('#taskCategoryChips [data-key]').length > 0,
      null,
      { timeout: 30000 },
    );
    await page.fill('#taskNameInput', 'issue-1338-round-trip');
    await page.locator('#taskCategoryChips [data-key="classification"]').click();
    await page.locator('#taskOutputTypeChips [data-key="single_label"]').click();
    await page.locator('#datasetFileInput').setInputFiles({
      name: 'issue-1338-round-trip.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(ROWS)),
    });
    await expect(page.locator('.inline-dataset-preview-wrap')).toBeVisible();
    await page.locator('.inline-preview-role-select[aria-label$="text"]').selectOption('input');
    await page.locator('.inline-preview-role-select[aria-label$="note"]').selectOption('input');
    await page.locator('.inline-preview-role-select[aria-label$="gold_label"]').selectOption('output');
    await select(page).selectOption('note');

    const persisted = await page.evaluate((taskId) => {
      (window as typeof window & { persistCreatedTask: (id: string) => void }).persistCreatedTask(
        taskId,
      );
      const all = JSON.parse(localStorage.getItem('labelsuite.createdTasks') || '[]') as Array<
        Record<string, unknown>
      >;
      return all.find((t) => t.id === taskId) ?? null;
    }, 'T9384');
    expect(persisted).not.toBeNull();
    expect(persisted!.list_title_field).toBe('note');

    await openBasicEdit(page, 'T9384');
    await expect(select(page)).toHaveValue('note');
    await expect(items(page).nth(0)).toContainText('n1');
  });

  test('regression: a 3-row created task keeps its dataset summary and previews exactly 3 titled rows', async ({
    page,
  }) => {
    await seedCreatedTask(page, createdTask('T9385', 'note'));
    await page.goto(`${TASK_DETAIL_URL}?task_role=project_leader&task_id=T9385`);
    await expect(page.locator('#bcCurrent')).toHaveText('T9385', { timeout: PANEL_LOAD_TIMEOUT });
    await openSettingsSection(page, 'basic');
    await expect(page.locator('#valueDatasetSummary')).toHaveText('3 筆', {
      timeout: PANEL_LOAD_TIMEOUT,
    });

    await page.locator('#overviewEditBtn').click();
    await expect(items(page)).toHaveCount(3, { timeout: PANEL_LOAD_TIMEOUT });
    await expect(items(page).first()).toContainText('n1');
  });
});

/* ── 6.1 dataset replacement ────────────────────────────────────── */

test.describe('Issue #1338 — dataset replacement in edit mode (6.1)', () => {
  test('replacing the dataset with one lacking the selected field reverts to auto and shows the notice', async ({
    page,
  }) => {
    await seedCreatedTask(page, createdTask('T9386', 'note'));
    await openBasicEdit(page, 'T9386');
    await expect(select(page)).toHaveValue('note');

    await page.locator('#datasetFileInput').setInputFiles({
      name: 'issue-1338-no-note.json',
      mimeType: 'application/json',
      buffer: Buffer.from(
        JSON.stringify([
          { id: 'x1', text: 'one', gold_label: 'POS' },
          { id: 'x2', text: 'two', gold_label: 'NEG' },
        ]),
      ),
    });
    await expect(page.locator('#datasetFileList')).toContainText('issue-1338-no-note.json');

    expect(await selectedLabel(page)).toBe(AUTO_LABEL_ZH);
    const notice = page.getByTestId('list-title-revert-notice');
    await expect(notice).toBeVisible();
    await expect(notice).toHaveAttribute('role', 'status');
    expect(
      await select(page).locator('option').evaluateAll((o) =>
        o.map((x) => (x as HTMLOptionElement).value),
      ),
    ).not.toContain('note');
  });

  test('replacing the dataset with one where the field is still an Input keeps the selection without a notice', async ({
    page,
  }) => {
    await seedCreatedTask(page, createdTask('T9387', 'text'));
    await openBasicEdit(page, 'T9387');
    await expect(select(page)).toHaveValue('text');

    await page.locator('#datasetFileInput').setInputFiles({
      name: 'issue-1338-keeps-text.json',
      mimeType: 'application/json',
      buffer: Buffer.from(
        JSON.stringify([
          { id: 'y1', text: 'new alpha', gold_label: 'POS' },
          { id: 'y2', text: 'new beta', gold_label: 'NEG' },
        ]),
      ),
    });
    await expect(page.locator('#datasetFileList')).toContainText('issue-1338-keeps-text.json');
    // task-detail resets roles on replace; re-assign the same field as Input
    await page.locator('.inline-preview-role-select[aria-label$="text"]').selectOption('input');
    await page.locator('.inline-preview-role-select[aria-label$="gold_label"]').selectOption('output');

    await expect(select(page)).toHaveValue('text');
    await expect(page.getByTestId('list-title-revert-notice')).toHaveCount(0);
    await expect(items(page).nth(0)).toContainText('new alpha');
    await expect(items(page).nth(1)).toContainText('new beta');
  });
});

/* ── 7.1 save ───────────────────────────────────────────────────── */

test.describe('Issue #1338 — saving basic info writes list_title_field (7.1)', () => {
  test('changing the dropdown and saving stores list_title_field on TASK_DATA, never a camelCase alias', async ({
    page,
  }) => {
    await seedCreatedTask(page, createdTask('T9388', 'note'));
    await openBasicEdit(page, 'T9388');
    await expect(select(page)).toHaveValue('note');

    await select(page).selectOption('text');
    await page.locator('#overviewSaveBtn').click();
    await expect(page.locator('#overviewEditForm')).toHaveClass(/hidden/);

    expect(await readTaskData(page, 'list_title_field')).toBe('text');
    expect(
      await page.evaluate(() =>
        Object.prototype.hasOwnProperty.call((window as DetailWindow).TASK_DATA, 'listTitleField'),
      ),
    ).toBe(false);

    // Re-entering edit mode re-seeds from the saved TASK_DATA
    await page.locator('#overviewEditBtn').click();
    await expect(select(page)).toHaveValue('text');
    await expect(items(page).nth(0)).toContainText('alpha first');
  });

  test('saving after switching back to auto stores null (key present, not deleted)', async ({
    page,
  }) => {
    await seedCreatedTask(page, createdTask('T9389', 'note'));
    await openBasicEdit(page, 'T9389');

    await select(page).selectOption({ label: AUTO_LABEL_ZH });
    await page.locator('#overviewSaveBtn').click();
    await expect(page.locator('#overviewEditForm')).toHaveClass(/hidden/);

    expect(
      await page.evaluate(() =>
        Object.prototype.hasOwnProperty.call((window as DetailWindow).TASK_DATA, 'list_title_field'),
      ),
    ).toBe(true);
    expect(await readTaskData(page, 'list_title_field')).toBeNull();
  });

  test('discarding an edit keeps the previously saved list_title_field', async ({ page }) => {
    await seedCreatedTask(page, createdTask('T9390', 'note'));
    await openBasicEdit(page, 'T9390');

    await select(page).selectOption('text');
    await page.locator('#overviewCancelBtn').click();
    await page.locator('#settingsLeaveConfirmBtn').click();
    await expect(page.locator('#overviewEditForm')).toHaveClass(/hidden/);

    expect(await readTaskData(page, 'list_title_field')).toBe('note');
    await page.locator('#overviewEditBtn').click();
    await expect(select(page)).toHaveValue('note');
  });
});
