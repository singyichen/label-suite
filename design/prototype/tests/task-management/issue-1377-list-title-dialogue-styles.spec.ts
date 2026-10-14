/*
 * Traceability: Lightweight prototype style fix, GitHub issue #1377 (no
 * canonical spec change). Follow-up of specs/task-management/013-task-new
 * FR-002c-9 / FR-002c-10 (#1338 list title block, #1340 dialogue block) and
 * specs/annotation/015-annotation-workspace FR-107 (#1341 dialogue thread).
 *
 * Contract (RED, issue #1377):
 *   - #inlineListTitleBlock and #inlineDialogueBlock live INSIDE the bordered
 *     #inlinePreviewSourceBar frame (task-new Step 1 and task-detail settings
 *     edit mode); the bar stays visible even with 0 record-source candidates.
 *   - .inline-list-title-block has real CSS (flex layout, padding, gap, bold
 *     label, 12px select) instead of browser defaults.
 *   - The dialogue thread (renderDialogueThread) is styled by classes, not
 *     inline style attributes: no row / utt-id / speaker / text carries a
 *     style attribute and nothing references the undefined --text-secondary.
 *   - dialogue-utt-id colour resolves from --color-text-soft in light and dark.
 */
import { test, expect } from '../fixtures';
import { openSettingsSection } from './_task-detail-settings-helpers';
import {
  buildWorkspaceUrl,
  dismissGuidelineModal,
  skipGuidelineModal,
} from '../annotation/_workspace-helpers';
import type { Page } from '@playwright/test';

const TASK_NEW_URL = '/pages/task-management/task-new.html';
const TASK_DETAIL_URL = '/pages/task-management/task-detail.html';
const PANEL_LOAD_TIMEOUT = 15000;

const bar = (page: Page) => page.locator('#inlinePreviewSourceBar');
const listBlock = (page: Page) => page.locator('#inlineListTitleBlock');
const dialogueBlock = (page: Page) => page.locator('#inlineDialogueBlock');

const FLAT_ROWS = [
  { id: 'r1', text: 'alpha first', gold_label: 'POS' },
  { id: 'r2', text: 'beta second', gold_label: 'NEG' },
  { id: 'r3', text: 'gamma third', gold_label: 'NEU' },
];

function dialogueRows(turns = 3) {
  const utterances = Array.from({ length: turns }, (_, i) => ({
    utt_id: `u${i + 1}`,
    speaker: i % 2 === 0 ? '客服' : '客戶',
    text: `第 ${i + 1} 句內容`,
  }));
  return [
    { id: 'd1', gold: 'RESOLVED', utterances },
    { id: 'd2', gold: 'PENDING', utterances },
  ];
}

async function setupTask(page: Page, dataset: unknown, fileName: string) {
  await page.goto(TASK_NEW_URL, { waitUntil: 'load' });
  await page.waitForFunction(
    () => document.querySelectorAll('#taskCategoryChips [data-key]').length > 0,
    null,
    { timeout: 30000 },
  );
  await page.fill('#taskNameInput', 'issue-1377-styles');
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

async function setupFlat(page: Page) {
  await setupTask(page, FLAT_ROWS, 'issue-1377-flat.json');
  await setFieldRole(page, 'text', 'input');
  await setFieldRole(page, 'gold_label', 'output');
  await expect(listBlock(page)).toBeVisible();
}

async function setupDialogue(page: Page, turns = 3) {
  await setupTask(page, dialogueRows(turns), 'issue-1377-dialogue.json');
  await setFieldRole(page, 'utterances', 'input');
  await expect(dialogueBlock(page)).toBeVisible();
}

async function gotoStep2(page: Page) {
  await page.locator('#nextBtn').click();
  await expect(page.locator('#step2Panel')).not.toHaveClass(/hidden/);
}

/** true when `inner` is a descendant of the source bar (DOM containment, not geometry). */
async function isInsideBar(page: Page, innerSelector: string): Promise<boolean> {
  return page.evaluate((sel) => {
    const barEl = document.getElementById('inlinePreviewSourceBar');
    const inner = document.querySelector(sel);
    return !!barEl && !!inner && barEl !== inner && barEl.contains(inner);
  }, innerSelector);
}

/* ── 1. blocks live inside the source bar frame ─────────────────── */

test.describe('Issue #1377 — list title / dialogue blocks sit inside the source bar', () => {
  test('task-new Step 1, flat array (0 candidates): list title block is inside a visible bar', async ({
    page,
  }) => {
    await setupFlat(page);
    expect(await isInsideBar(page, '#inlineListTitleBlock')).toBe(true);
    await expect(bar(page)).toBeVisible();
    await expect(listBlock(page)).toBeVisible();
  });

  test('task-new Step 1, dialogue dataset: list title and dialogue blocks are inside a visible bar', async ({
    page,
  }) => {
    await setupDialogue(page);
    await expect(listBlock(page)).toBeVisible();
    expect(await isInsideBar(page, '#inlineListTitleBlock')).toBe(true);
    expect(await isInsideBar(page, '#inlineDialogueBlock')).toBe(true);
    await expect(bar(page)).toBeVisible();
  });

  test('task-detail settings edit mode: list title block is inside a visible bar', async ({
    page,
  }) => {
    const task = {
      id: 'T9377',
      nameZh: 'issue-1377-T9377',
      nameEn: 'issue-1377-T9377',
      sourceFile: 'issue-1377-seed.json',
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
      fieldRoleMap: { id: '', text: 'input', gold_label: 'output' },
      datasetFileName: 'issue-1377-seed.json',
      datasetRecords: FLAT_ROWS,
    };
    await page.addInitScript((entry) => {
      window.localStorage.setItem('labelsuite.createdTasks', JSON.stringify([entry]));
    }, task);
    await page.goto(`${TASK_DETAIL_URL}?task_role=project_leader&task_id=T9377`);
    await expect(page.locator('#bcCurrent')).toHaveText('T9377', { timeout: PANEL_LOAD_TIMEOUT });
    await openSettingsSection(page, 'basic');
    const editBtn = page.locator('#overviewEditBtn');
    await expect(editBtn).toBeEnabled({ timeout: PANEL_LOAD_TIMEOUT });
    await editBtn.click();
    await expect(page.locator('.inline-dataset-preview-wrap')).toBeVisible({
      timeout: PANEL_LOAD_TIMEOUT,
    });
    await expect(listBlock(page)).toBeVisible();
    expect(await isInsideBar(page, '#inlineListTitleBlock')).toBe(true);
    await expect(bar(page)).toBeVisible();
  });
});

/* ── 2. .inline-list-title-block has real CSS ───────────────────── */

test.describe('Issue #1377 — .inline-list-title-block computed styles', () => {
  test('list title block is a flex row with padding/gap, bold label and 12px select', async ({
    page,
  }) => {
    await setupFlat(page);
    const s = await page.evaluate(() => {
      const block = document.getElementById('inlineListTitleBlock') as HTMLElement;
      const label = block.querySelector('label') as HTMLElement;
      const select = block.querySelector('select') as HTMLElement;
      const cs = getComputedStyle(block);
      return {
        display: cs.display,
        paddingTop: parseFloat(cs.paddingTop),
        paddingLeft: parseFloat(cs.paddingLeft),
        columnGap: parseFloat(cs.columnGap) || 0,
        labelWeight: parseInt(getComputedStyle(label).fontWeight, 10),
        selectFontSize: getComputedStyle(select).fontSize,
      };
    });
    expect(s.display).toBe('flex');
    expect(s.paddingTop).toBeGreaterThan(0);
    expect(s.paddingLeft).toBeGreaterThan(0);
    expect(s.columnGap).toBeGreaterThan(0);
    expect(s.labelWeight).toBeGreaterThanOrEqual(600);
    expect(s.selectFontSize).toBe('12px');
  });

  test('dialogue block shares the flex layout (same class)', async ({ page }) => {
    await setupDialogue(page);
    const display = await dialogueBlock(page).evaluate((n) => getComputedStyle(n).display);
    expect(display).toBe('flex');
  });
});

/* ── 3. dialogue thread has no inline style / undefined token ───── */

async function expectNoInlineStyles(page: Page) {
  for (const id of ['dialogue-thread-row', 'dialogue-utt-id', 'dialogue-speaker', 'dialogue-text']) {
    const els = page.getByTestId(id);
    const n = await els.count();
    expect(n, `${id} must exist`).toBeGreaterThan(0);
    const styles = await els.evaluateAll((nodes) => nodes.map((x) => x.getAttribute('style')));
    styles.forEach((v, i) => expect(v, `${id}[${i}] must have no style attribute`).toBeNull());
  }
}

test.describe('Issue #1377 — dialogue thread is class-styled', () => {
  test('annotation workspace: no inline style on thread elements, no --text-secondary', async ({
    page,
  }) => {
    await skipGuidelineModal(page);
    await page.goto(buildWorkspaceUrl({ task_id: 'T013', sample_id: 'absa-001' }));
    await dismissGuidelineModal(page);
    await expect(page.getByTestId('dialogue-thread-row')).toHaveCount(5);
    await expectNoInlineStyles(page);
    const html = await page
      .getByTestId('dialogue-thread-row')
      .first()
      .evaluate((n) => (n.parentElement as HTMLElement).outerHTML);
    expect(html).not.toContain('--text-secondary');
  });

  test('task-new Step 2 preview: no inline style on thread elements, no --text-secondary', async ({
    page,
  }) => {
    await setupDialogue(page);
    await gotoStep2(page);
    const thread = page.getByTestId('dialogue-thread-preview');
    await expect(thread).toBeVisible();
    await expectNoInlineStyles(page);
    expect(await thread.evaluate((n) => n.outerHTML)).not.toContain('--text-secondary');
    expect(await thread.locator('[style]').count()).toBe(0);
  });

  test('task-new Step 2 preview with > 20 turns: the "more" hint also carries no inline style', async ({
    page,
  }) => {
    await setupDialogue(page, 25);
    await gotoStep2(page);
    const thread = page.getByTestId('dialogue-thread-preview');
    await expect(thread).toBeVisible();
    expect(await page.getByTestId('dialogue-thread-row').count()).toBeLessThan(25);
    expect(await thread.locator('[style]').count()).toBe(0);
    expect(await thread.evaluate((n) => n.outerHTML)).not.toContain('--text-secondary');
  });
});

/* ── 4. dark mode token resolution ──────────────────────────────── */

/** Computed colour of dialogue-utt-id vs. the resolved --color-text-soft, in the current theme. */
async function uttIdVsToken(page: Page) {
  return page.getByTestId('dialogue-utt-id').first().evaluate((n) => {
    const probe = document.createElement('span');
    probe.style.color = 'var(--color-text-soft)';
    document.body.appendChild(probe);
    const token = getComputedStyle(probe).color;
    probe.remove();
    return { actual: getComputedStyle(n).color, token };
  });
}

async function expectThemeAware(page: Page) {
  await page.evaluate(() => document.documentElement.removeAttribute('data-theme'));
  const light = await uttIdVsToken(page);
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  const dark = await uttIdVsToken(page);
  expect(light.actual, 'light utt-id colour equals --color-text-soft').toBe(light.token);
  expect(dark.actual, 'dark utt-id colour equals --color-text-soft').toBe(dark.token);
  expect(dark.actual, 'dark differs from light').not.toBe(light.actual);
}

test.describe('Issue #1377 — dialogue-utt-id colour follows --color-text-soft', () => {
  test('annotation workspace', async ({ page }) => {
    await skipGuidelineModal(page);
    await page.goto(buildWorkspaceUrl({ task_id: 'T013', sample_id: 'absa-001' }));
    await dismissGuidelineModal(page);
    await expect(page.getByTestId('dialogue-thread-row')).toHaveCount(5);
    await expectThemeAware(page);
  });

  test('task-new Step 2 preview', async ({ page }) => {
    await setupDialogue(page);
    await gotoStep2(page);
    await expect(page.getByTestId('dialogue-thread-preview')).toBeVisible();
    await expectThemeAware(page);
  });
});
