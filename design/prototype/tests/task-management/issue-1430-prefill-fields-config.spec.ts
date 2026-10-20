/*
 * Traceability: specs/task-management/013-task-new/spec.md
 *   FR-002c-11, AC-1.15, AC-1.16, SC-002k
 * OpenSpec change: task-new-prefill-fields (issue #1430), tasks.md 1.1, 2.1, 3.1, 4.1.
 *
 * Contract (design.md D1-D4):
 *   - prefill_fields = { entities: string|null, triples: string|null } | null; engine state
 *     name is state.prefillFields, payload / task data name is prefill_fields.
 *   - task-new has no UI for it: the created-task payload always carries the key as null and
 *     leaves dialogue_fields and the other keys untouched.
 *   - Only seed T008 declares { entities: 'entities', triples: null }; every other seed
 *     (T010, T013, ...) declares nothing (treated as null).
 *   - task-detail: T008 opens with TASK_DATA.prefill_fields and state.prefillFields equal to
 *     the declaration, and saving settings keeps it; undeclared tasks read null.
 */
import { test, expect } from '../fixtures';
import { openSettingsSection } from './_task-detail-settings-helpers';
import type { Page } from '@playwright/test';

const TASK_NEW_URL = '/pages/task-management/task-new.html';
const TASK_DETAIL_URL = '/pages/task-management/task-detail.html';
const PANEL_LOAD_TIMEOUT = 15000;
const DECLARED_TASK_ID = 'T008';
const UNDECLARED_TASK_IDS = ['T010', 'T013'] as const;
const T008_DECLARATION = { entities: 'entities', triples: null };

type DetailWindow = typeof window & {
  TASK_DATA: Record<string, unknown>;
  state: Record<string, unknown>;
  LabelSuiteTaskDetailData: { profiles: Record<string, Record<string, unknown>> };
};

/* ── 1.1 created-task payload (AC-1.15, SC-002k) ─────────────────── */

async function readCreatedTask(page: Page, id: string) {
  return page.evaluate((taskId) => {
    (window as typeof window & { persistCreatedTask: (i: string) => void }).persistCreatedTask(
      taskId,
    );
    const all = JSON.parse(localStorage.getItem('labelsuite.createdTasks') || '[]') as Array<
      Record<string, unknown>
    >;
    return all.find((t) => t.id === taskId) ?? null;
  }, id);
}

test.describe('Issue #1430 — created-task payload carries prefill_fields (AC-1.15, SC-002k)', () => {
  test('payload has the prefill_fields key and its value is null', async ({ page }) => {
    await page.goto(TASK_NEW_URL, { waitUntil: 'load' });
    await page.waitForFunction(
      () => document.querySelectorAll('#taskCategoryChips [data-key]').length > 0,
      null,
      { timeout: 30000 },
    );
    const task = await readCreatedTask(page, 'issue-1430-payload');
    expect(task).not.toBeNull();
    expect(Object.prototype.hasOwnProperty.call(task!, 'prefill_fields')).toBe(true);
    expect(task!.prefill_fields).toBeNull();
  });

  test('dialogue_fields and the other payload keys are unchanged', async ({ page }) => {
    await page.goto(TASK_NEW_URL, { waitUntil: 'load' });
    await page.waitForFunction(
      () => document.querySelectorAll('#taskCategoryChips [data-key]').length > 0,
      null,
      { timeout: 30000 },
    );
    const task = await readCreatedTask(page, 'issue-1430-keys');
    expect(task).not.toBeNull();
    expect(Object.prototype.hasOwnProperty.call(task!, 'dialogue_fields')).toBe(true);
    expect(task!.dialogue_fields).toBeNull();
    expect(Object.keys(task!)).toEqual(
      expect.arrayContaining(['id', 'dialogue_fields', 'list_title_field']),
    );
    expect(Object.keys(task!)).toContain('prefill_fields');
  });
});

/* ── 2.1 seed declarations (AC-1.16) ─────────────────────────────── */

async function readProfiles(page: Page) {
  await page.goto(`${TASK_DETAIL_URL}?task_role=project_leader&task_id=T001&status=draft`);
  await expect(page.locator('#bcCurrent')).toHaveText('T001', { timeout: PANEL_LOAD_TIMEOUT });
  return page.evaluate(() => {
    const profiles = (window as DetailWindow).LabelSuiteTaskDetailData.profiles;
    return Object.fromEntries(
      Object.entries(profiles).map(([id, p]) => [id, p.prefill_fields ?? null]),
    ) as Record<string, unknown>;
  });
}

test.describe('Issue #1430 — seed declarations (AC-1.16)', () => {
  test('T008 declares prefill_fields { entities: "entities", triples: null }', async ({ page }) => {
    const declared = await readProfiles(page);
    expect(declared[DECLARED_TASK_ID]).toEqual(T008_DECLARATION);
  });

  test('T010, T013 and every other seed declare nothing (treated as null)', async ({ page }) => {
    const declared = await readProfiles(page);
    for (const id of UNDECLARED_TASK_IDS) expect(declared).toHaveProperty(id);
    const others = Object.entries(declared).filter(([id]) => id !== DECLARED_TASK_ID);
    expect(others.length).toBeGreaterThan(1);
    for (const [id, value] of others) {
      expect(value, `${id} must not declare prefill_fields`).toBeNull();
    }
  });
});

/* ── 3.1 / 4.1 task-detail config state and task data (AC-1.15, AC-1.16) ── */

async function loadTask(page: Page, taskId: string) {
  await page.goto(`${TASK_DETAIL_URL}?task_role=project_leader&task_id=${taskId}&status=draft`);
  await expect(page.locator('#bcCurrent')).toHaveText(taskId, { timeout: PANEL_LOAD_TIMEOUT });
}

async function enterBasicEdit(page: Page) {
  await openSettingsSection(page, 'basic');
  const editBtn = page.locator('#overviewEditBtn');
  await expect(editBtn).toBeEnabled({ timeout: PANEL_LOAD_TIMEOUT });
  await editBtn.click();
  await expect(page.locator('#overviewEditForm')).not.toHaveClass(/hidden/);
}

const taskDataPrefill = (page: Page) =>
  page.evaluate(() => (window as DetailWindow).TASK_DATA.prefill_fields);
const statePrefill = (page: Page) =>
  page.evaluate(() => (window as DetailWindow).state.prefillFields);

test.describe('Issue #1430 — task-detail config state (AC-1.16, tasks 3.1)', () => {
  test('opening T008 seeds state.prefillFields with the declaration', async ({ page }) => {
    await loadTask(page, DECLARED_TASK_ID);
    await enterBasicEdit(page);
    expect(await statePrefill(page)).toEqual(T008_DECLARATION);
  });

  for (const id of UNDECLARED_TASK_IDS) {
    test(`opening undeclared ${id} gives state.prefillFields null`, async ({ page }) => {
      await loadTask(page, id);
      await enterBasicEdit(page);
      expect(await statePrefill(page)).toBeNull();
    });
  }
});

test.describe('Issue #1430 — task-detail data load and save (AC-1.16, tasks 4.1)', () => {
  test('T008 TASK_DATA.prefill_fields equals the declaration on load', async ({ page }) => {
    await loadTask(page, DECLARED_TASK_ID);
    expect(await taskDataPrefill(page)).toEqual(T008_DECLARATION);
  });

  test('T008 keeps the declaration after saving settings', async ({ page }) => {
    await loadTask(page, DECLARED_TASK_ID);
    await enterBasicEdit(page);
    await page.locator('#overviewSaveBtn').click();
    await expect(page.locator('#overviewEditForm')).toHaveClass(/hidden/);
    expect(await taskDataPrefill(page)).toEqual(T008_DECLARATION);
  });

  for (const id of UNDECLARED_TASK_IDS) {
    test(`undeclared ${id} has TASK_DATA.prefill_fields null on load and after save`, async ({
      page,
    }) => {
      await loadTask(page, id);
      expect(await taskDataPrefill(page)).toBeNull();
      await enterBasicEdit(page);
      await page.locator('#overviewSaveBtn').click();
      await expect(page.locator('#overviewEditForm')).toHaveClass(/hidden/);
      expect(await taskDataPrefill(page)).toBeNull();
    });
  }
});
