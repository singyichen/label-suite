/*
 * Traceability: specs/task-management/013-task-new/spec.md
 *   FR-002c-10, AC-1.10, AC-1.11, AC-1.12, SC-002j
 * OpenSpec change: task-new-dialogue-fields (issue #1340), tasks.md groups 1-4.
 *
 * Contract (design.md D1-D7):
 *   - Input column = array of objects with >= 1 all-string sub-field ->
 *     dialogue confirm block (testids per D5), prefilled text/speaker/utt_id.
 *   - Select option values equal the raw sub-field keys; the "none" (speaker)
 *     and "array index" (utt id) options use value ''.
 *   - Declining (uncheck) sets dialogueFields = null + dialogueDeclined = true
 *     and later re-renders must not re-prefill; re-checking re-prefills.
 *   - Step 2 preview renders one dialogue-thread-row per turn; Input text
 *     source never yields "[object Object]" and never falls back to an
 *     Output / Evidence column.
 *   - Persistence: created-task payload key `dialogue_fields`
 *     ({text, speaker, utt_id} or null); wizard draft keeps confirm/decline.
 *   - task-detail is unaffected (no confirm block).
 */
import { test, expect } from '../fixtures';
import { openSettingsSection } from './_task-detail-settings-helpers';
import type { Page } from '@playwright/test';

const TASK_NEW_URL = '/pages/task-management/task-new.html';
const TASK_DETAIL_URL = '/pages/task-management/task-detail.html';

type TaskConfigI18n = Record<'zh' | 'en', Record<string, unknown>>;

/* ── 1.1 i18n strings ───────────────────────────────────────────── */

test.describe('Issue #1340 — TASK_CONFIG_I18N dialogue strings (FR-002c-10)', () => {
  const KEYS = [
    'dialogueBlockTitle',
    'dialogueToggleLabel',
    'dialogueTextLabel',
    'dialogueSpeakerLabel',
    'dialogueUttIdLabel',
    'dialogueNoneOption',
    'dialogueArrayIndexOption',
    'dialogueMoreTurns',
  ] as const;

  async function readI18n(page: Page): Promise<TaskConfigI18n> {
    await page.goto(TASK_NEW_URL, { waitUntil: 'load' });
    return page.evaluate(
      () => (window as typeof window & { TASK_CONFIG_I18N: TaskConfigI18n }).TASK_CONFIG_I18N,
    );
  }

  test('zh and en tables both define every dialogue string as a non-empty string', async ({
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

  test('dialogueMoreTurns carries the {n} placeholder in both languages', async ({ page }) => {
    const { zh, en } = await readI18n(page);
    expect(String(zh.dialogueMoreTurns)).toContain('{n}');
    expect(String(en.dialogueMoreTurns)).toContain('{n}');
  });

  test('en strings are translated, not copies of zh', async ({ page }) => {
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
  await page.fill('#taskNameInput', 'issue-1340-dialogue');
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

const DIALOGUE_ROWS = [
  {
    id: 'd1',
    gold: 'RESOLVED',
    utterances: [
      { utt_id: 'u1', speaker: '客服', text: '您好，請問有什麼可以協助？' },
      { utt_id: 'u2', speaker: '客戶', text: '我想查詢訂單。' },
      { utt_id: 'u3', speaker: '客服', text: '好的，請提供訂單編號。' },
    ],
  },
  {
    id: 'd2',
    gold: 'PENDING',
    utterances: [
      { utt_id: 'u1', speaker: '客戶', text: '請問退貨流程？' },
      { utt_id: 'u2', speaker: '客服', text: '請至會員中心申請。' },
    ],
  },
];

async function setupDialogue(page: Page, rows: unknown = DIALOGUE_ROWS) {
  await setupTask(page, rows, 'issue-1340-dialogue.json');
  await setFieldRole(page, 'utterances', 'input');
}

/* ── 2.1 detection and confirmation (AC-1.10 / AC-1.11) ─────────── */

test.describe('Issue #1340 — dialogue detection (AC-1.10)', () => {
  test('object-array Input is proposed with text/speaker/utt_id prefilled and toggle checked', async ({
    page,
  }) => {
    await setupDialogue(page);
    await expect(block(page)).toBeVisible();
    await expect(toggle(page)).toBeChecked();
    await expect(textSel(page)).toHaveValue('text');
    await expect(speakerSel(page)).toHaveValue('speaker');
    await expect(uttSel(page)).toHaveValue('utt_id');
  });

  test('speaker/utt_id selects offer the none / array-index option with value empty', async ({
    page,
  }) => {
    await setupDialogue(page);
    await expect(block(page)).toBeVisible();
    const speakerValues = await speakerSel(page)
      .locator('option')
      .evaluateAll((o) => o.map((x) => (x as HTMLOptionElement).value));
    const uttValues = await uttSel(page)
      .locator('option')
      .evaluateAll((o) => o.map((x) => (x as HTMLOptionElement).value));
    expect(speakerValues).toContain('');
    expect(speakerValues).toContain('speaker');
    expect(uttValues).toContain('');
    expect(uttValues).toContain('utt_id');
  });

  test('changing a select updates the selection', async ({ page }) => {
    await setupDialogue(page);
    await expect(block(page)).toBeVisible();
    await speakerSel(page).selectOption('');
    await expect(speakerSel(page)).toHaveValue('');
    await uttSel(page).selectOption('');
    await expect(uttSel(page)).toHaveValue('');
    await expect(textSel(page)).toHaveValue('text');
  });

  test('changing the utterances column role to Output removes the block', async ({ page }) => {
    await setupDialogue(page);
    await expect(block(page)).toBeVisible();
    await setFieldRole(page, 'utterances', 'output');
    await expect(block(page)).toHaveCount(0);
  });

  test('changing the utterances column role to unused removes the block', async ({ page }) => {
    await setupDialogue(page);
    await expect(block(page)).toBeVisible();
    await setFieldRole(page, 'utterances', '');
    await expect(block(page)).toHaveCount(0);
  });

  test('unchecking hides/disables the selects, survives re-renders, re-checking re-prefills', async ({
    page,
  }) => {
    await setupDialogue(page);
    await expect(toggle(page)).toBeChecked();
    await toggle(page).uncheck();
    await expect(toggle(page)).not.toBeChecked();
    for (const sel of [textSel, speakerSel, uttSel]) {
      const el = sel(page);
      const visible = await el.isVisible().catch(() => false);
      const disabled = visible ? await el.isDisabled() : true;
      expect(visible && !disabled, 'select must be hidden or disabled when declined').toBe(false);
    }

    // A later re-render (another column's role change) must NOT re-prefill.
    await setFieldRole(page, 'gold', 'output');
    await expect(toggle(page)).not.toBeChecked();

    await toggle(page).check();
    await expect(toggle(page)).toBeChecked();
    await expect(textSel(page)).toHaveValue('text');
    await expect(speakerSel(page)).toHaveValue('speaker');
    await expect(uttSel(page)).toHaveValue('utt_id');
  });
});

test.describe('Issue #1340 — no proposal when undetectable (AC-1.11)', () => {
  test('plain string Input column -> no block', async ({ page }) => {
    await setupTask(
      page,
      [
        { id: 'p1', text: 'alpha first', gold: 'POS' },
        { id: 'p2', text: 'beta second', gold: 'NEG' },
      ],
      'issue-1340-plain.json',
    );
    await setFieldRole(page, 'text', 'input');
    await expect(page.locator('.inline-dataset-preview-wrap')).toBeVisible();
    await expect(block(page)).toHaveCount(0);
  });

  test('array of strings Input column -> no block', async ({ page }) => {
    await setupTask(
      page,
      [
        { id: 'p1', turns: ['hello', 'world'] },
        { id: 'p2', turns: ['foo', 'bar'] },
      ],
      'issue-1340-string-array.json',
    );
    await setFieldRole(page, 'turns', 'input');
    await expect(block(page)).toHaveCount(0);
  });

  test('array of objects without any all-string sub-field -> no block', async ({ page }) => {
    await setupTask(
      page,
      [
        { id: 'p1', points: [{ x: 1, y: 2 }, { x: 3, y: 4 }] },
        { id: 'p2', points: [{ x: 5, y: 6 }, { x: 7, y: 8 }] },
      ],
      'issue-1340-numeric-objects.json',
    );
    await setFieldRole(page, 'points', 'input');
    await expect(block(page)).toHaveCount(0);
  });
});

/* ── 3.1 Step 2 preview (AC-1.12) ───────────────────────────────── */

async function gotoStep2(page: Page) {
  await page.locator('#nextBtn').click();
  await expect(page.locator('#step2Panel')).not.toHaveClass(/hidden/);
}

const thread = (page: Page) => page.getByTestId('dialogue-thread-preview');
const rows = (page: Page) => page.getByTestId('dialogue-thread-row');

test.describe('Issue #1340 — Step 2 dialogue thread preview (AC-1.12)', () => {
  test('confirmed dialogue renders one row per turn with id, speaker and text', async ({
    page,
  }) => {
    await setupDialogue(page);
    await expect(block(page)).toBeVisible();
    await gotoStep2(page);

    await expect(thread(page)).toBeVisible();
    await expect(rows(page)).toHaveCount(3);
    await expect(rows(page).nth(0).getByTestId('dialogue-utt-id')).toHaveText('u1');
    await expect(rows(page).nth(0).getByTestId('dialogue-speaker')).toHaveText('客服');
    await expect(rows(page).nth(0).getByTestId('dialogue-text')).toHaveText('您好，請問有什麼可以協助？');
    await expect(rows(page).nth(1).getByTestId('dialogue-speaker')).toHaveText('客戶');
    await expect(rows(page).nth(2).getByTestId('dialogue-utt-id')).toHaveText('u3');
    await expect(page.locator('body')).not.toContainText('[object Object]');
  });

  test('utt_id set to array index shows 1, 2, 3', async ({ page }) => {
    await setupDialogue(page);
    await expect(block(page)).toBeVisible();
    await uttSel(page).selectOption('');
    await gotoStep2(page);

    await expect(rows(page)).toHaveCount(3);
    await expect(rows(page).nth(0).getByTestId('dialogue-utt-id')).toHaveText('1');
    await expect(rows(page).nth(1).getByTestId('dialogue-utt-id')).toHaveText('2');
    await expect(rows(page).nth(2).getByTestId('dialogue-utt-id')).toHaveText('3');
  });

  test('declined dialogue shows JSON for the Input and never [object Object]', async ({ page }) => {
    await setupDialogue(page);
    await expect(block(page)).toBeVisible();
    await toggle(page).uncheck();
    await gotoStep2(page);

    await expect(thread(page)).toHaveCount(0);
    await expect(page.locator('#step2Panel')).toContainText('"speaker"');
    await expect(page.locator('body')).not.toContainText('[object Object]');
  });

  test('Output string column content never appears in the Step 2 Input preview', async ({
    page,
  }) => {
    await setupTask(
      page,
      [
        { id: 'o1', utterances: DIALOGUE_ROWS[0].utterances, answer: 'SECRET-GOLD-ANSWER-ONE' },
        { id: 'o2', utterances: DIALOGUE_ROWS[1].utterances, answer: 'SECRET-GOLD-ANSWER-TWO' },
      ],
      'issue-1340-leak.json',
    );
    await setFieldRole(page, 'utterances', 'input');
    await setFieldRole(page, 'answer', 'output');
    await toggle(page).uncheck();
    await gotoStep2(page);

    await expect(page.locator('#step2Panel .annotation-preview-sample').first()).toBeVisible();
    const samples = await page
      .locator('#step2Panel .annotation-preview-sample')
      .allTextContents();
    expect(samples.join('\n')).not.toContain('SECRET-GOLD-ANSWER');
    await expect(page.locator('body')).not.toContainText('[object Object]');
  });
});

/* ── 3.1 getDatasetPreviewText() direct ─────────────────────────── */

type PreviewState = {
  columns: string[];
  roles: Record<string, string>;
  row: Record<string, unknown>;
  dialogue?: { text: string; speaker: string | null; utt_id: string | null } | null;
};

async function previewText(page: Page, s: PreviewState): Promise<string | null> {
  await page.goto(TASK_NEW_URL, { waitUntil: 'load' });
  await page.waitForFunction(
    () => typeof (window as unknown as { getDatasetPreviewText?: unknown }).getDatasetPreviewText === 'function',
  );
  return page.evaluate((st) => {
    const w = window as unknown as {
      state: Record<string, unknown>;
      getDatasetPreviewText: () => string | null;
    };
    w.state.datasetParsedColumns = st.columns;
    w.state.fieldRoleMap = st.roles;
    w.state.datasetRawFirstRow = st.row;
    if (st.dialogue !== undefined) w.state.dialogueFields = st.dialogue;
    return w.getDatasetPreviewText();
  }, s);
}

const TURNS = [
  { speaker: 'A', text: 'first turn' },
  { speaker: 'B', text: 'second turn' },
];

test.describe('Issue #1340 — getDatasetPreviewText() text source (AC-1.12)', () => {
  test('(a) string Input returns exactly that string (byte-identical)', async ({ page }) => {
    const raw = '  Leading space\tTab\r\nCRLF  trailing  ';
    expect(
      await previewText(page, { columns: ['text'], roles: { text: 'input' }, row: { text: raw } }),
    ).toBe(raw);
  });

  test('(a) two string Inputs are joined with a newline', async ({ page }) => {
    expect(
      await previewText(page, {
        columns: ['a', 'b'],
        roles: { a: 'input', b: 'input' },
        row: { a: 'one', b: 'two' },
      }),
    ).toBe('one\ntwo');
  });

  test('(b) object-array Input with confirmed dialogue text joins texts with a newline', async ({
    page,
  }) => {
    expect(
      await previewText(page, {
        columns: ['utterances'],
        roles: { utterances: 'input' },
        row: { utterances: TURNS },
        dialogue: { text: 'text', speaker: 'speaker', utt_id: null },
      }),
    ).toBe('first turn\nsecond turn');
  });

  test('(c) object-array Input without confirmation returns null, never [object Object]', async ({
    page,
  }) => {
    const out = await previewText(page, {
      columns: ['utterances'],
      roles: { utterances: 'input' },
      row: { utterances: TURNS },
      dialogue: null,
    });
    expect(out === null || !String(out).includes('[object Object]')).toBe(true);
    expect(out).toBeNull();
  });

  test('(d) no Input: returns null, never an unassigned / Output / Evidence column', async ({
    page,
  }) => {
    const out = await previewText(page, {
      columns: ['gold', 'note', 'free'],
      roles: { gold: 'output', note: 'evidence' },
      row: {
        gold: 'OUTPUT-VALUE-LONGEST-STRING-HERE',
        note: 'EVIDENCE-VALUE-ALSO-LONG-STRING',
        free: 'unassigned',
      },
    });
    expect(out).toBeNull();
  });

  test('(d) only Output / Evidence string columns -> null', async ({ page }) => {
    const out = await previewText(page, {
      columns: ['gold', 'note'],
      roles: { gold: 'output', note: 'evidence' },
      row: { gold: 'OUTPUT-VALUE-LONGEST-STRING-HERE', note: 'EVIDENCE-VALUE-ALSO-LONG-STRING' },
    });
    expect(out).toBeNull();
  });
});

/* ── 4.1 persistence (SC-002j) ──────────────────────────────────── */

type WizardWindow = typeof window & {
  state: { dialogueFields?: unknown; dialogueDeclined?: boolean };
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

test.describe('Issue #1340 — dialogue_fields persistence (SC-002j)', () => {
  test('payload carries the confirmed mapping', async ({ page }) => {
    await setupDialogue(page);
    await expect(block(page)).toBeVisible();
    const task = await readCreatedTask(page, 'issue-1340-confirmed');
    expect(task).not.toBeNull();
    expect(task!.dialogue_fields).toEqual({ text: 'text', speaker: 'speaker', utt_id: 'utt_id', reply_to: null });
  });

  test('payload carries a user-edited mapping (speaker none, utt_id array index -> null)', async ({
    page,
  }) => {
    await setupDialogue(page);
    await expect(block(page)).toBeVisible();
    await speakerSel(page).selectOption('');
    await uttSel(page).selectOption('');
    const task = await readCreatedTask(page, 'issue-1340-edited');
    expect(task!.dialogue_fields).toEqual({ text: 'text', speaker: null, utt_id: null, reply_to: null });
  });

  test('payload carries dialogue_fields null (key present) when declined', async ({ page }) => {
    await setupDialogue(page);
    await expect(block(page)).toBeVisible();
    await toggle(page).uncheck();
    const task = await readCreatedTask(page, 'issue-1340-declined');
    expect(task).not.toBeNull();
    expect(Object.prototype.hasOwnProperty.call(task!, 'dialogue_fields')).toBe(true);
    expect(task!.dialogue_fields).toBeNull();
  });

  test('payload carries dialogue_fields null (key present) when nothing is detectable', async ({
    page,
  }) => {
    await setupTask(page, [{ id: 'p1', text: 'alpha first' }, { id: 'p2', text: 'beta second' }], 'issue-1340-none.json');
    await setFieldRole(page, 'text', 'input');
    const task = await readCreatedTask(page, 'issue-1340-none');
    expect(task).not.toBeNull();
    expect(Object.prototype.hasOwnProperty.call(task!, 'dialogue_fields')).toBe(true);
    expect(task!.dialogue_fields).toBeNull();
  });

  test('wizard draft reload keeps the confirmed mapping', async ({ page }) => {
    await setupDialogue(page);
    await expect(block(page)).toBeVisible();
    await speakerSel(page).selectOption('');

    await page.reload({ waitUntil: 'load' });

    await expect(block(page)).toBeVisible({ timeout: 15000 });
    await expect(toggle(page)).toBeChecked();
    await expect(textSel(page)).toHaveValue('text');
    await expect(speakerSel(page)).toHaveValue('');
    await expect(uttSel(page)).toHaveValue('utt_id');
  });

  test('wizard draft reload keeps the declined state', async ({ page }) => {
    await setupDialogue(page);
    await expect(block(page)).toBeVisible();
    await toggle(page).uncheck();

    await page.reload({ waitUntil: 'load' });

    await expect(block(page)).toBeVisible({ timeout: 15000 });
    await expect(toggle(page)).not.toBeChecked();
    expect(await page.evaluate(() => (window as WizardWindow).state.dialogueFields ?? null)).toBeNull();
    expect(await page.evaluate(() => (window as WizardWindow).state.dialogueDeclined)).toBe(true);
  });
});

/* ── 5 task-detail unaffected ───────────────────────────────────── */

test.describe('Issue #1340 — task-detail unaffected', () => {
  test('settings basic-info edit mode never shows the dialogue confirm block', async ({ page }) => {
    await page.goto(`${TASK_DETAIL_URL}?task_role=project_leader&task_id=T001`);
    await expect(page.locator('#bcCurrent')).toHaveText('T001', { timeout: 15000 });
    await openSettingsSection(page, 'basic');
    const edit = page.locator('#overviewEditBtn');
    if (await edit.isVisible()) await edit.click();
    await expect(block(page)).toHaveCount(0);
  });
});

/* ── review findings ────────────────────────────────────────────── */

test.describe('Issue #1340 — review findings', () => {
  const typeChip = (page: Page, key: string) =>
    page.locator(`#taskInputTypeChips [data-key="${key}"]`);

  test('switching Input type to item_pair removes the block and clears dialogueFields; switching back re-offers it', async ({
    page,
  }) => {
    await setupDialogue(page);
    await expect(block(page)).toBeVisible();

    await typeChip(page, 'item_pair').click();
    await expect(block(page)).toHaveCount(0);
    expect(await page.evaluate(() => (window as WizardWindow).state.dialogueFields ?? null)).toBeNull();
    const task = await readCreatedTask(page, 'issue-1340-type-switch');
    expect(Object.prototype.hasOwnProperty.call(task!, 'dialogue_fields')).toBe(true);
    expect(task!.dialogue_fields).toBeNull();

    await typeChip(page, 'single_item').click();
    await expect(block(page)).toBeVisible();
    await expect(toggle(page)).toBeChecked();
    await expect(textSel(page)).toHaveValue('text');
    await expect(speakerSel(page)).toHaveValue('speaker');
    await expect(uttSel(page)).toHaveValue('utt_id');
  });

  test('getDatasetPreviewText() keeps String(array) for a plain string-array Input (regression pin)', async ({
    page,
  }) => {
    const out = await previewText(page, {
      columns: ['turns'],
      roles: { turns: 'input' },
      row: { turns: ['a', 'b'] },
    });
    expect(out).toBe(String(['a', 'b']));
    expect(out).toBe('a,b');
  });
});

/* ── no non-Input fallback (Data Fairness) ──────────────────────── */

test.describe('Issue #1340 — preview text never falls back to a non-Input column', () => {
  test('getDatasetPreviewText() returns null when the only string column is role "not used"', async ({
    page,
  }) => {
    const out = await previewText(page, {
      columns: ['note'],
      roles: { note: '' },
      row: { note: 'UNUSEDSECRET-value' },
    });
    expect(out).toBeNull();
  });

  test('Step 2 preview does not show a "not used" column when no Input exists', async ({ page }) => {
    await setupTask(
      page,
      [
        { note: 'UNUSEDSECRET-one' },
        { note: 'UNUSEDSECRET-two' },
      ],
      'issue-1340-unused.json',
    );
    await setFieldRole(page, 'note', '');
    await gotoStep2(page);

    await expect(page.locator('#step2Panel')).not.toContainText('UNUSEDSECRET');
  });
});
