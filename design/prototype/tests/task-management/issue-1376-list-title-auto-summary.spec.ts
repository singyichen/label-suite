/*
 * Traceability: specs/task-management/013-task-new/spec.md FR-002c-9
 *   specs/annotation/015-annotation-workspace/spec.md FR-106 (canonical record summary)
 *   specs/task-management/014-task-detail/spec.md FR-014k (isomorphic with 013)
 * Issue #1376: with the list title on "auto", the annotation list preview
 * (list-title-preview-item) showed each record's `id` (e.g. absa-001) instead of
 * the first non-empty Input-role field summary.
 *
 * Contract:
 *   - Auto: item text === window.LabelSuiteAnnotationWorkspaceData
 *       .getRecordSummaryText(record, fieldRoleMap, null, lang, dialogueFields),
 *     NOT truncated to 40 chars; id only when no Input field yields text.
 *   - Selected specific field / id: unchanged (AC-1.8, AC-1.9, 40-char truncation).
 *   - Data Fairness: an id column assigned Output never appears.
 */
import { test, expect } from '../fixtures';
import { openSettingsSection } from './_task-detail-settings-helpers';
import type { Page } from '@playwright/test';

const TASK_NEW_URL = '/pages/task-management/task-new.html';
const TASK_DETAIL_URL = '/pages/task-management/task-detail.html';
const PANEL_LOAD_TIMEOUT = 15000;

const LONG_TEXT = 'This long input sentence clearly exceeds forty characters in total length';

type Rec = Record<string, unknown>;
type Roles = Record<string, string>;

const select = (page: Page) => page.getByTestId('list-title-field-select');
const items = (page: Page) => page.getByTestId('list-title-preview-item');

/** Canonical helper evaluated in the page; null when the global is not loaded. */
async function canonicalSummaries(page: Page, records: Rec[], roles: Roles) {
  return page.evaluate(
    ({ recs, rm }) => {
      const api = (window as unknown as {
        LabelSuiteAnnotationWorkspaceData?: {
          getRecordSummaryText: (
            r: Rec,
            m: Roles,
            f: string | null,
            lang: string,
            d: unknown,
          ) => string;
        };
      }).LabelSuiteAnnotationWorkspaceData;
      if (!api) return null;
      return recs.map((r) => api.getRecordSummaryText(r, rm, null, 'zh', null));
    },
    { recs: records, rm: roles },
  );
}

/* ── task-new Step 1 ─────────────────────────────────────────────── */

async function setupTaskNew(page: Page, dataset: Rec[], roles: Roles) {
  await page.goto(TASK_NEW_URL, { waitUntil: 'load' });
  await page.waitForFunction(
    () => document.querySelectorAll('#taskCategoryChips [data-key]').length > 0,
    null,
    { timeout: 30000 },
  );
  await page.fill('#taskNameInput', 'issue-1376-auto-summary');
  await page.locator('#taskCategoryChips [data-key="classification"]').click();
  await page.locator('#taskOutputTypeChips [data-key="single_label"]').click();
  await page.locator('#datasetFileInput').setInputFiles({
    name: 'issue-1376.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(dataset)),
  });
  await expect(page.locator('.inline-dataset-preview-wrap')).toBeVisible();
  for (const [col, role] of Object.entries(roles)) {
    await page.locator(`.inline-preview-role-select[aria-label$="${col}"]`).selectOption(role);
  }
}

const NEW_ROWS: Rec[] = [
  { id: 'absa-001', text: 'alpha first', gold_label: 'POS' },
  { id: 'absa-002', text: 'beta second', gold_label: 'NEG' },
  { id: 'absa-003', text: LONG_TEXT, gold_label: 'NEU' },
];
const NEW_ROLES: Roles = { text: 'input', gold_label: 'output' };

test.describe('Issue #1376 — task-new Step 1 auto title uses the Input summary (FR-002c-9, 015 FR-106)', () => {
  test('auto items show the first Input field text, not the id', async ({ page }) => {
    await setupTaskNew(page, NEW_ROWS, NEW_ROLES);
    await expect(select(page)).toHaveValue('');

    await expect(items(page)).toHaveCount(3);
    await expect(items(page).nth(0)).toHaveText('alpha first');
    await expect(items(page).nth(1)).toHaveText('beta second');
    for (const id of ['absa-001', 'absa-002', 'absa-003']) {
      await expect(page.getByTestId('list-title-preview')).not.toContainText(id);
    }
  });

  test('auto items equal getRecordSummaryText on the same records and role map', async ({
    page,
  }) => {
    await setupTaskNew(page, NEW_ROWS, NEW_ROLES);
    const expected = await canonicalSummaries(page, NEW_ROWS, { id: '', ...NEW_ROLES });
    expect(expected, 'LabelSuiteAnnotationWorkspaceData must be loaded on task-new').not.toBeNull();
    await expect(items(page)).toHaveCount(3);
    for (let i = 0; i < 3; i++) {
      await expect(items(page).nth(i)).toHaveText(expected![i]);
    }
  });

  test('auto items are not truncated at 40 characters', async ({ page }) => {
    expect(LONG_TEXT.length).toBeGreaterThan(40);
    await setupTaskNew(page, NEW_ROWS, NEW_ROLES);
    await expect(items(page).nth(2)).toHaveText(LONG_TEXT);
  });

  test('auto with an Output id still never exposes the id and shows the Input text (Data Fairness)', async ({
    page,
  }) => {
    await setupTaskNew(
      page,
      [
        { id: 'ID-AAA', text: 'first sample' },
        { id: 'ID-BBB', text: 'second sample' },
      ],
      { text: 'input', id: 'output' },
    );
    await expect(items(page).nth(0)).toHaveText('first sample');
    await expect(page.getByTestId('list-title-preview')).not.toContainText('ID-');
  });
});

test.describe('Issue #1376 — regression guards (must keep passing)', () => {
  test('selected specific field still shows that field, truncated at 40 chars', async ({
    page,
  }) => {
    await setupTaskNew(page, NEW_ROWS, NEW_ROLES);
    await select(page).selectOption('text');
    await expect(items(page).nth(0)).toHaveText('alpha first');
    await expect(items(page).nth(2)).toHaveText(LONG_TEXT.slice(0, 40) + '…');
  });

  test('selected id still shows the id', async ({ page }) => {
    await setupTaskNew(page, NEW_ROWS, NEW_ROLES);
    await select(page).selectOption('id');
    await expect(items(page).nth(0)).toHaveText('absa-001');
    await expect(items(page).nth(1)).toHaveText('absa-002');
  });

  test('auto with an Output id and no Input text falls back to row numbers, never the id (Data Fairness)', async ({
    page,
  }) => {
    await setupTaskNew(
      page,
      [
        { id: 'ID-AAA', text: 'first sample' },
        { id: 'ID-BBB', text: 'second sample' },
        { id: 'ID-CCC', text: 'third sample' },
      ],
      { id: 'output' },
    );
    await expect(items(page)).toHaveCount(3);
    await expect(items(page).nth(0)).toHaveText('1');
    await expect(items(page).nth(1)).toHaveText('2');
    await expect(items(page).nth(2)).toHaveText('3');
    await expect(page.getByTestId('list-title-preview')).not.toContainText('ID-');
  });
});

/* ── task-detail Settings › Basic info edit mode ─────────────────── */

const DETAIL_ROWS: Rec[] = [
  { id: 'absa-001', text: 'alpha first', gold_label: 'POS' },
  { id: 'absa-002', text: 'beta second', gold_label: 'NEG' },
  { id: 'absa-003', text: LONG_TEXT, gold_label: 'NEU' },
];
const DETAIL_ROLES: Roles = { id: '', text: 'input', gold_label: 'output' };

async function seedAndOpenBasicEdit(page: Page, taskId: string, listTitleField: string | null) {
  const task = {
    id: taskId,
    nameZh: `issue-1376-${taskId}`,
    nameEn: `issue-1376-${taskId}`,
    sourceFile: 'issue-1376-seed.json',
    outputTypes: ['single_label'],
    runType: 'official_run',
    status: 'draft',
    updatedAt: '2026-10-14',
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
    fieldRoleMap: DETAIL_ROLES,
    datasetFileName: 'issue-1376-seed.json',
    datasetRecords: DETAIL_ROWS,
    list_title_field: listTitleField,
  };
  await page.addInitScript((entry) => {
    window.localStorage.setItem('labelsuite.createdTasks', JSON.stringify([entry]));
  }, task);
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

test.describe('Issue #1376 — task-detail edit mode auto title uses the Input summary (FR-014k)', () => {
  test('auto item 1 equals getRecordSummaryText and is not the id', async ({ page }) => {
    await seedAndOpenBasicEdit(page, 'T9760', null);
    await expect(select(page)).toHaveValue('');

    const expected = await canonicalSummaries(page, DETAIL_ROWS, DETAIL_ROLES);
    expect(expected, 'LabelSuiteAnnotationWorkspaceData must be loaded on task-detail').not.toBeNull();
    expect(expected![0]).not.toBe('absa-001');
    await expect(items(page).nth(0)).toHaveText(expected![0]);
    await expect(items(page).nth(0)).not.toHaveText('absa-001');
    await expect(items(page).nth(0)).toHaveText('alpha first');
  });

  test('auto items are not truncated at 40 characters', async ({ page }) => {
    await seedAndOpenBasicEdit(page, 'T9761', null);
    await expect(items(page).nth(2)).toHaveText(LONG_TEXT);
  });

  test('guard: selecting id shows the id, selecting text truncates at 40 chars', async ({
    page,
  }) => {
    await seedAndOpenBasicEdit(page, 'T9762', null);
    await select(page).selectOption('id');
    await expect(items(page).nth(0)).toHaveText('absa-001');
    await select(page).selectOption('text');
    await expect(items(page).nth(2)).toHaveText(LONG_TEXT.slice(0, 40) + '…');
  });
});
