/*
 * Traceability: specs/task-management/013-task-new/spec.md
 *   FR-002c-10, AC-1.13, AC-1.14, SC-002j
 * OpenSpec change: task-new-dialogue-reply-to (issue #1378), tasks.md groups 1-3.
 *
 * Contract (design.md D1-D5):
 *   - dialogue_fields = { text, speaker, utt_id, reply_to }; reply_to is a raw
 *     sub-field key or null. Select testid `dialogue-field-reply-to`, first
 *     option "none" with value ''.
 *   - Candidates: sub-fields whose values across all elements are string /
 *     number / null / missing with >= 1 non-empty value, minus the text field.
 *     No candidates -> no select, reply_to null.
 *   - Never prefilled (no name hints). Re-prefill (toggle off/on) -> null.
 *   - Invalidation clears only reply_to; other mappings are kept.
 *   - Persistence: created-task payload + wizard draft reload.
 */
import { test, expect } from '../fixtures';
import type { Page } from '@playwright/test';

const TASK_NEW_URL = '/pages/task-management/task-new.html';

type TaskConfigI18n = Record<'zh' | 'en', Record<string, unknown>>;

/* ── 1.1 i18n strings ───────────────────────────────────────────── */

test.describe('Issue #1378 — TASK_CONFIG_I18N reply_to strings (FR-002c-10)', () => {
  const KEYS = ['dialogueReplyToLabel', 'dialogueReplyToNoneOption'] as const;

  async function readI18n(page: Page): Promise<TaskConfigI18n> {
    await page.goto(TASK_NEW_URL, { waitUntil: 'load' });
    return page.evaluate(
      () => (window as typeof window & { TASK_CONFIG_I18N: TaskConfigI18n }).TASK_CONFIG_I18N,
    );
  }

  test('zh and en tables both define every reply_to string as a non-empty string', async ({
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

  test('en reply_to strings are translated, not copies of zh', async ({ page }) => {
    const { zh, en } = await readI18n(page);
    for (const key of KEYS) {
      expect(en[key], `en.${key} must differ from zh`).not.toBe(zh[key]);
    }
  });
});

/* ── shared helpers ─────────────────────────────────────────────── */

async function setupTask(page: Page, dataset: unknown, fileName: string) {
  await page.goto(TASK_NEW_URL, { waitUntil: 'load' });
  await page.waitForFunction(
    () => document.querySelectorAll('#taskCategoryChips [data-key]').length > 0,
    null,
    { timeout: 30000 },
  );
  await page.fill('#taskNameInput', 'issue-1378-reply-to');
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

const block = (page: Page) => page.getByTestId('dialogue-fields-block');
const toggle = (page: Page) => page.getByTestId('dialogue-fields-toggle');
const textSel = (page: Page) => page.getByTestId('dialogue-field-text');
const speakerSel = (page: Page) => page.getByTestId('dialogue-field-speaker');
const uttSel = (page: Page) => page.getByTestId('dialogue-field-utt-id');
const replySel = (page: Page) => page.getByTestId('dialogue-field-reply-to');

type WizardWindow = typeof window & {
  state: { dialogueFields?: Record<string, unknown> | null };
  persistCreatedTask: (id: string) => void;
};

const dialogueFields = (page: Page) =>
  page.evaluate(() => (window as WizardWindow).state.dialogueFields);

/* utterances carry a reply_to column: root is null, others cite a utt_id. */
const REPLY_ROWS = [
  {
    id: 'd1',
    gold: 'RESOLVED',
    utterances: [
      { utt_id: 'u1', speaker: '客服', text: '您好，請問有什麼可以協助？', reply_to: null },
      { utt_id: 'u2', speaker: '客戶', text: '我想查詢訂單。', reply_to: 'u1' },
      { utt_id: 'u3', speaker: '客服', text: '好的，請提供訂單編號。', reply_to: 'u2' },
    ],
  },
  {
    id: 'd2',
    gold: 'PENDING',
    utterances: [
      { utt_id: 'u1', speaker: '客戶', text: '請問退貨流程？', reply_to: null },
      { utt_id: 'u2', speaker: '客服', text: '請至會員中心申請。', reply_to: 'u1' },
    ],
  },
];

async function setupReplyDialogue(page: Page, rows: unknown = REPLY_ROWS) {
  await setupTask(page, rows, 'issue-1378-reply.json');
  await setFieldRole(page, 'utterances', 'input');
  await expect(block(page)).toBeVisible();
}

/* ── 2.1 candidates, default, select / clear (AC-1.13) ───────────── */

test.describe('Issue #1378 — reply_to select (AC-1.13)', () => {
  test('select appears, defaults to none (empty value), options include reply_to but not the text field', async ({
    page,
  }) => {
    await setupReplyDialogue(page);
    await expect(replySel(page)).toBeVisible();
    await expect(replySel(page)).toHaveValue('');
    const values = await replySel(page)
      .locator('option')
      .evaluateAll((o) => o.map((x) => (x as HTMLOptionElement).value));
    expect(values).toContain('');
    expect(values).toContain('reply_to');
    expect(values).not.toContain('text');
    expect((await dialogueFields(page))?.reply_to).toBeNull();
  });

  test('choosing reply_to sets dialogue_fields.reply_to; choosing none sets null', async ({
    page,
  }) => {
    await setupReplyDialogue(page);
    await replySel(page).selectOption('reply_to');
    await expect(replySel(page)).toHaveValue('reply_to');
    expect((await dialogueFields(page))?.reply_to).toBe('reply_to');
    // other mappings untouched
    expect(await dialogueFields(page)).toMatchObject({
      text: 'text',
      speaker: 'speaker',
      utt_id: 'utt_id',
    });

    await replySel(page).selectOption('');
    await expect(replySel(page)).toHaveValue('');
    expect((await dialogueFields(page))?.reply_to).toBeNull();
  });

  test('a sub-field literally named reply_to is NOT prefilled (no name hints)', async ({
    page,
  }) => {
    await setupReplyDialogue(page);
    await expect(replySel(page)).toHaveValue('');
    expect((await dialogueFields(page))?.reply_to).toBeNull();
  });

  test('any sub-field name works: a column named parent_ref is selectable and stored verbatim', async ({
    page,
  }) => {
    const rows = REPLY_ROWS.map((r) => ({
      ...r,
      utterances: r.utterances.map(({ reply_to, ...rest }) => ({ ...rest, parent_ref: reply_to })),
    }));
    await setupReplyDialogue(page, rows);
    await expect(replySel(page)).toHaveValue('');
    await replySel(page).selectOption('parent_ref');
    expect((await dialogueFields(page))?.reply_to).toBe('parent_ref');
  });

  test('no candidate sub-field -> no select and reply_to is null', async ({ page }) => {
    // Only `text` is a string/number/null sub-field; `extra` is all null and
    // `flag` is boolean, so neither is a candidate once `text` is excluded.
    const rows = [
      { id: 'n1', utterances: [{ text: 'alpha', extra: null, flag: true }, { text: 'beta', extra: null, flag: false }] },
      { id: 'n2', utterances: [{ text: 'gamma', extra: null, flag: true }] },
    ];
    await setupReplyDialogue(page, rows);
    await expect(textSel(page)).toHaveValue('text');
    await expect(replySel(page)).toHaveCount(0);
    expect((await dialogueFields(page))?.reply_to).toBeNull();
  });
});

/* ── 2.1 invalidation and re-prefill (AC-1.14) ───────────────────── */

test.describe('Issue #1378 — reply_to invalidation (AC-1.14)', () => {
  test('when reply_to stops being a candidate only reply_to is cleared; other mappings are kept', async ({
    page,
  }) => {
    // Column `a` has a reply_to sub-field; column `b` has the same shape
    // without it. Switching the Input column from a to b keeps text /
    // speaker / utt_id legal but makes the chosen reply_to illegal.
    const rows = [
      {
        id: 'r1',
        a: REPLY_ROWS[0].utterances,
        b: REPLY_ROWS[0].utterances.map(({ reply_to: _drop, ...rest }) => rest),
      },
      {
        id: 'r2',
        a: REPLY_ROWS[1].utterances,
        b: REPLY_ROWS[1].utterances.map(({ reply_to: _drop, ...rest }) => rest),
      },
    ];
    await setupTask(page, rows, 'issue-1378-invalidate.json');
    await setFieldRole(page, 'a', 'input');
    await expect(block(page)).toBeVisible();
    await speakerSel(page).selectOption(''); // non-default so preservation is observable
    await replySel(page).selectOption('reply_to');
    expect(await dialogueFields(page)).toMatchObject({ speaker: null, reply_to: 'reply_to' });

    await setFieldRole(page, 'b', 'input'); // a stays first Input: no change yet
    await setFieldRole(page, 'a', ''); // detection now reads b

    await expect(block(page)).toBeVisible();
    expect(await dialogueFields(page)).toEqual({
      text: 'text',
      speaker: null,
      utt_id: 'utt_id',
      reply_to: null,
    });
    await expect(speakerSel(page)).toHaveValue('');
    await expect(textSel(page)).toHaveValue('text');
    await expect(uttSel(page)).toHaveValue('utt_id');
  });

  test('unchecking then re-checking re-prefills and reply_to is null again', async ({ page }) => {
    await setupReplyDialogue(page);
    await replySel(page).selectOption('reply_to');
    expect((await dialogueFields(page))?.reply_to).toBe('reply_to');

    await toggle(page).uncheck();
    await toggle(page).check();

    await expect(toggle(page)).toBeChecked();
    await expect(replySel(page)).toHaveValue('');
    expect(await dialogueFields(page)).toEqual({
      text: 'text',
      speaker: 'speaker',
      utt_id: 'utt_id',
      reply_to: null,
    });
  });
});

/* ── 3.1 payload and draft (SC-002j) ─────────────────────────────── */

async function readCreatedTask(page: Page, id: string) {
  return page.evaluate((taskId) => {
    (window as WizardWindow).persistCreatedTask(taskId);
    const all = JSON.parse(localStorage.getItem('labelsuite.createdTasks') || '[]') as Array<
      Record<string, unknown>
    >;
    return all.find((t) => t.id === taskId) ?? null;
  }, id);
}

test.describe('Issue #1378 — reply_to persistence (SC-002j)', () => {
  test('payload carries the chosen reply_to sub-field name', async ({ page }) => {
    await setupReplyDialogue(page);
    await replySel(page).selectOption('reply_to');
    const task = await readCreatedTask(page, 'issue-1378-chosen');
    expect(task).not.toBeNull();
    expect(task!.dialogue_fields).toEqual({
      text: 'text',
      speaker: 'speaker',
      utt_id: 'utt_id',
      reply_to: 'reply_to',
    });
  });

  test('payload carries reply_to null (key present) when none is chosen', async ({ page }) => {
    await setupReplyDialogue(page);
    const task = await readCreatedTask(page, 'issue-1378-none');
    expect(task).not.toBeNull();
    expect(task!.dialogue_fields).toEqual({
      text: 'text',
      speaker: 'speaker',
      utt_id: 'utt_id',
      reply_to: null,
    });
  });

  test('wizard draft reload keeps the chosen reply_to', async ({ page }) => {
    await setupReplyDialogue(page);
    await replySel(page).selectOption('reply_to');

    await page.reload({ waitUntil: 'load' });

    await expect(block(page)).toBeVisible({ timeout: 15000 });
    await expect(replySel(page)).toHaveValue('reply_to');
    expect((await dialogueFields(page))?.reply_to).toBe('reply_to');
  });
});
