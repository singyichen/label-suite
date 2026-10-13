/*
 * Traceability: specs/task-management/013-task-new/spec.md
 *   FR-002c-9, AC-1.8, AC-1.9, SC-002i
 * OpenSpec change: task-new-list-title-field (issue #1338), Group 1.
 *
 * Contract (design.md D1-D5):
 *   - Step 1 inline dataset preview gets a "list title" <select> and a
 *     "annotation list preview" built by the shared engine.
 *   - Options = auto + Input/Evidence fields + id; Output is NEVER listed
 *     (Data Fairness). Object-array fields carry a suffix label.
 *   - A selected field that leaves the option set reverts to auto + notice.
 *   - Persisted in the wizard draft (sessionStorage) and in the created-task
 *     payload as list_title_field (field name, or null for auto).
 *
 * Assumption pinned for Green: non-auto option values equal the raw field
 * name; the auto option is identified by its visible label, not its value.
 */
import { test, expect } from '../fixtures';
import type { Page } from '@playwright/test';

const TASK_NEW_URL = '/pages/task-management/task-new.html';
const AUTO_LABEL_ZH = '自動（依資料形狀）';
const OBJECT_ARRAY_SUFFIX_ZH = '（取第 1 則的文字）';

type TaskConfigI18n = Record<'zh' | 'en', Record<string, unknown>>;

/* ── 1.1 i18n strings ───────────────────────────────────────────── */

test.describe('Issue #1338 — TASK_CONFIG_I18N list title strings (FR-002c-9)', () => {
  const KEYS = [
    'listTitleLabel',
    'listTitleAutoOption',
    'listTitleObjectArraySuffix',
    'listTitlePreviewHeading',
    'listTitleRevertNotice',
  ] as const;

  async function readI18n(page: Page): Promise<TaskConfigI18n> {
    await page.goto(TASK_NEW_URL, { waitUntil: 'load' });
    return page.evaluate(
      () => (window as typeof window & { TASK_CONFIG_I18N: TaskConfigI18n }).TASK_CONFIG_I18N,
    );
  }

  test('zh and en tables both define every list title string as a non-empty string', async ({
    page,
  }) => {
    const i18n = await readI18n(page);
    for (const lang of ['zh', 'en'] as const) {
      for (const key of KEYS) {
        const value = i18n[lang][key];
        expect(typeof value, `${lang}.${key} must be a string`).toBe('string');
        expect((value as string).length, `${lang}.${key} must be non-empty`).toBeGreaterThan(0);
      }
    }
  });

  test('zh strings carry the contract wording', async ({ page }) => {
    const { zh } = await readI18n(page);
    expect(zh.listTitleAutoOption).toBe(AUTO_LABEL_ZH);
    expect(zh.listTitleObjectArraySuffix).toBe(OBJECT_ARRAY_SUFFIX_ZH);
    expect(zh.listTitlePreviewHeading).toBe('標記清單預覽');
    expect(zh.listTitleLabel).toContain('清單標題');
  });

  test('en strings are translated, not copies of zh', async ({ page }) => {
    const { zh, en } = await readI18n(page);
    for (const key of KEYS) {
      expect(en[key], `en.${key} must differ from zh`).not.toBe(zh[key]);
    }
  });
});

/* ── 2.1 dropdown + preview + revert ────────────────────────────── */

async function setupTask(page: Page, dataset: unknown, fileName: string) {
  await page.goto(TASK_NEW_URL, { waitUntil: 'load' });
  await page.waitForFunction(
    () => document.querySelectorAll('#taskCategoryChips [data-key]').length > 0,
    null,
    { timeout: 30000 },
  );
  await page.fill('#taskNameInput', 'issue-1338-list-title');
  await page.locator('#taskCategoryChips [data-key="classification"]').click();
  await page.locator('#taskOutputTypeChips [data-key="single_label"]').click();
  await page.locator('#datasetFileInput').setInputFiles({
    name: fileName,
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(dataset)),
  });
  await expect(page.locator('.inline-dataset-preview-wrap')).toBeVisible();
}

async function setFieldRole(page: Page, column: string, role: string) {
  await page.locator(`.inline-preview-role-select[aria-label$="${column}"]`).selectOption(role);
}

const select = (page: Page) => page.getByTestId('list-title-field-select');

async function optionLabels(page: Page): Promise<string[]> {
  return select(page)
    .locator('option')
    .evaluateAll((opts) => opts.map((o) => (o.textContent || '').trim()));
}

async function selectedLabel(page: Page): Promise<string> {
  return select(page).evaluate((s) => {
    const sel = s as HTMLSelectElement;
    return (sel.selectedOptions[0]?.textContent || '').trim();
  });
}

const ROWS = [
  { id: 'r1', text: 'alpha first', gold_label: 'POS', note: 'n1', turns: [{ text: 'turn one a' }] },
  { id: 'r2', text: 'beta second', gold_label: 'NEG', note: 'n2', turns: [{ text: 'turn two a' }] },
  { id: 'r3', text: 'gamma third', gold_label: 'NEU', note: 'n3', turns: [{ text: 'turn three a' }] },
  { id: 'r4', text: 'delta fourth', gold_label: 'POS', note: 'n4', turns: [{ text: 'turn four a' }] },
];

async function setupRoles(page: Page) {
  await setupTask(page, ROWS, 'issue-1338-flat.json');
  await setFieldRole(page, 'text', 'input');
  await setFieldRole(page, 'gold_label', 'output');
  await setFieldRole(page, 'note', 'evidence');
  await setFieldRole(page, 'turns', 'input');
}

test.describe('Issue #1338 — Step 1 list title dropdown (AC-1.8)', () => {
  test('defaults to auto and offers auto + Input/Evidence + id, never an Output field', async ({
    page,
  }) => {
    await setupRoles(page);
    await expect(select(page)).toBeVisible();
    expect(await selectedLabel(page)).toBe(AUTO_LABEL_ZH);

    const labels = await optionLabels(page);
    expect(labels[0]).toBe(AUTO_LABEL_ZH);
    expect([...labels.slice(1)].sort()).toEqual(
      ['id', 'note', 'text', `turns${OBJECT_ARRAY_SUFFIX_ZH}`].sort(),
    );
    // Data Fairness: the Output column must not leak into the dropdown
    expect(labels.join('|')).not.toContain('gold_label');
    const values = await select(page).locator('option').evaluateAll((o) =>
      o.map((x) => (x as HTMLOptionElement).value),
    );
    expect(values).not.toContain('gold_label');
  });

  test('selecting a field shows that field of the first 3 rows in the preview, live', async ({
    page,
  }) => {
    await setupRoles(page);
    await select(page).selectOption('text');

    const items = page.getByTestId('list-title-preview-item');
    await expect(items).toHaveCount(3);
    await expect(items.nth(0)).toContainText('alpha first');
    await expect(items.nth(1)).toContainText('beta second');
    await expect(items.nth(2)).toContainText('gamma third');
    await expect(page.getByTestId('list-title-preview')).not.toContainText('delta fourth');
    await expect(page.getByTestId('list-title-preview')).toContainText('標記清單預覽');

    // Live: switching to another field re-renders without any extra click
    await select(page).selectOption('note');
    await expect(items.nth(0)).toContainText('n1');
    await expect(items.nth(2)).toContainText('n3');
  });

  test('an object-array field previews the first element text of each row', async ({ page }) => {
    await setupRoles(page);
    await select(page).selectOption('turns');
    const items = page.getByTestId('list-title-preview-item');
    await expect(items.nth(0)).toContainText('turn one a');
    await expect(items.nth(1)).toContainText('turn two a');
  });
});

test.describe('Issue #1338 — Step 1 list title revert (AC-1.9)', () => {
  test('changing the selected field role to unused reverts to auto and shows the notice', async ({
    page,
  }) => {
    await setupRoles(page);
    await select(page).selectOption('text');
    await expect(page.getByTestId('list-title-revert-notice')).toHaveCount(0);

    await setFieldRole(page, 'text', '');

    expect(await selectedLabel(page)).toBe(AUTO_LABEL_ZH);
    const notice = page.getByTestId('list-title-revert-notice');
    await expect(notice).toBeVisible();
    await expect(notice).toHaveAttribute('role', 'status');
    await expect(notice).not.toBeEmpty();
    expect(await optionLabels(page)).not.toContain('text');
  });

  test('assigning the selected field to Output reverts to auto, shows the notice and drops the option', async ({
    page,
  }) => {
    await setupRoles(page);
    await select(page).selectOption('note');

    await setFieldRole(page, 'note', 'output');

    expect(await selectedLabel(page)).toBe(AUTO_LABEL_ZH);
    await expect(page.getByTestId('list-title-revert-notice')).toBeVisible();
    expect(await optionLabels(page)).not.toContain('note');
  });

  test('keeps the selection and shows no notice when an unrelated field role changes', async ({
    page,
  }) => {
    await setupRoles(page);
    await select(page).selectOption('text');

    await setFieldRole(page, 'note', '');

    expect(await select(page).inputValue()).toBe('text');
    await expect(page.getByTestId('list-title-revert-notice')).toHaveCount(0);
  });

  test('switching the row source updates the preview, and reverts when the field is absent there', async ({
    page,
  }) => {
    await setupTask(
      page,
      {
        records: [
          { id: 'a1', alpha_text: 'alpha one', shared: 'shared a1', gold: 'X' },
          { id: 'a2', alpha_text: 'alpha two', shared: 'shared a2', gold: 'Y' },
        ],
        altRecords: [
          { id: 'b1', beta_text: 'beta one', shared: 'shared b1', gold: 'X' },
          { id: 'b2', beta_text: 'beta two', shared: 'shared b2', gold: 'Y' },
        ],
      },
      'issue-1338-two-sources.json',
    );
    const sourceSelect = page.locator('.inline-preview-source-select');
    await sourceSelect.selectOption('$.records');
    await setFieldRole(page, 'alpha_text', 'input');
    await setFieldRole(page, 'gold', 'output');

    await select(page).selectOption('alpha_text');
    await expect(page.getByTestId('list-title-preview-item').first()).toContainText('alpha one');

    // alpha_text does not exist in the new source: revert to auto + notice,
    // and the preview follows the new rows (auto placeholder shows the id)
    await sourceSelect.selectOption('$.altRecords');
    expect(await selectedLabel(page)).toBe(AUTO_LABEL_ZH);
    await expect(page.getByTestId('list-title-revert-notice')).toBeVisible();
    await expect(page.getByTestId('list-title-preview-item').first()).toContainText('b1');
  });
});

/* ── 3.1 persistence ────────────────────────────────────────────── */

type WizardWindow = typeof window & {
  state: { listTitleField?: string | null };
  persistCreatedTask: (id: string) => void;
};

async function readCreatedTask(page: Page, id: string) {
  return page.evaluate((taskId) => {
    (window as WizardWindow).persistCreatedTask(taskId);
    const all = JSON.parse(localStorage.getItem('labelsuite.createdTasks') || '[]') as Array<
      Record<string, unknown>
    >;
    return all.find((t) => t.id === taskId) ?? null;
  }, id);
}

test.describe('Issue #1338 — list title persistence (SC-002i)', () => {
  test('keeps the chosen field in the wizard draft across a reload', async ({ page }) => {
    await setupRoles(page);
    await select(page).selectOption('note');

    await page.reload({ waitUntil: 'load' });

    await expect(select(page)).toHaveValue('note', { timeout: 15000 });
    expect(await page.evaluate(() => (window as WizardWindow).state.listTitleField)).toBe('note');
    await expect(page.getByTestId('list-title-preview-item').first()).toContainText('n1');
  });

  test('created-task payload carries list_title_field equal to the chosen field name', async ({
    page,
  }) => {
    await setupRoles(page);
    await select(page).selectOption('text');

    const task = await readCreatedTask(page, 'issue-1338-chosen');
    expect(task).not.toBeNull();
    expect(task!.list_title_field).toBe('text');
  });

  test('created-task payload carries list_title_field null (not a missing key) when auto', async ({
    page,
  }) => {
    await setupRoles(page);

    const task = await readCreatedTask(page, 'issue-1338-auto');
    expect(task).not.toBeNull();
    expect(Object.prototype.hasOwnProperty.call(task!, 'list_title_field')).toBe(true);
    expect(task!.list_title_field).toBeNull();
  });
});
