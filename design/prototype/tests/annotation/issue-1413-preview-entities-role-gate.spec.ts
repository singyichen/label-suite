import { test, expect } from '../fixtures';
import type { Page } from '@playwright/test';
import {
  buildWorkspaceUrl,
  dismissGuidelineModal,
  patchDataFile,
  skipGuidelineModal,
} from './_workspace-helpers';

/* issue #1413 (OpenSpec change annotation-preview-entities-role-gate, RED):
 * the workspace "整合預覽" may load the data-carried `entities` column as prefilled
 * previewEntities only when that column's fieldRoleMap role is a known non-Output
 * role. Role 'output' or an unknown role (key absent / empty string) never prefills
 * (fail-closed, Data Fairness).
 *
 * Contract under test:
 *   - FR-107 item 16 / AC-2.48: entities column with role 'output' -> not prefilled,
 *     content absent from the page (innerText and textContent).
 *   - FR-107 item 16 / AC-2.49: unknown role (key absent, or '') -> not prefilled,
 *     for dialogue Input and string Input.
 *   - Known non-Output roles ('input', 'evidence') keep loading (regression).
 *   - AC-2.45: string Input with empty entities still prefills from the Output
 *     column's parsed entity array (regression, path unchanged).
 *   - tasks.md: 1.1.
 *
 * T013 default data: gold_triplets / incomplete_annotations hold triple-shaped
 * objects (no `.text`), so the Output-column prefill path cannot load the sentinel;
 * only rawRow.entities can. */

const T013_URL = buildWorkspaceUrl({ task_id: 'T013', sample_id: 'absa-001' });
const SENTINEL = 'ROLEGATESECRET-X';

type Ent = Record<string, unknown>;

async function previewEntities(page: Page): Promise<Ent[]> {
  return page.evaluate(
    () => JSON.parse(JSON.stringify((window as unknown as { state: { previewEntities: unknown[] } }).state.previewEntities)),
  );
}

/* dialogue Input (T013 default); `role` undefined deletes the entities key */
function dialoguePatch(role: string | undefined, entitiesValue = `[{ text: '${SENTINEL}', type: 'Aspect', start: 0, end: 4 }]`) {
  return `
    var p = window.LabelSuiteTaskDetailData.profiles.T013;
    p.datasetRecords[0].entities = ${entitiesValue};
    ${role === undefined ? 'delete p.fieldRoleMap.entities;' : `p.fieldRoleMap.entities = '${role}';`}
  `;
}

/* string Input: text input, utterances unused, no dialogue_fields */
function stringInputPatch(role: string | undefined, entitiesValue = `[{ text: '${SENTINEL}', type: 'Aspect', start: 0, end: 4 }]`) {
  return `
    var p = window.LabelSuiteTaskDetailData.profiles.T013;
    p.fieldRoleMap = { text: 'input', utterances: 'unused', gold_triplets: 'output' };
    ${role === undefined ? '' : `p.fieldRoleMap.entities = '${role}';`}
    p.dialogue_fields = null;
    p.datasetRecords[0].entities = ${entitiesValue};
  `;
}

async function open(page: Page, patch: string, dialogue: boolean) {
  await patchDataFile(page, 'task-detail.data.js', patch);
  await page.goto(T013_URL);
  await dismissGuidelineModal(page);
  if (dialogue) await expect(page.getByTestId('dialogue-thread-row')).toHaveCount(5);
  else await expect(page.getByTestId('dialogue-thread-row')).toHaveCount(0);
  // let the preview state initialise before reading it
  await page.waitForFunction(() => Array.isArray((window as unknown as { state?: { previewEntities?: unknown[] } }).state?.previewEntities));
}

/* The workspace sanitiser (annotation-workspace.data.js sanitizeRecordForAnnotator)
 * already strips columns whose role is absent/'' before the engine sees the row, so a
 * page-level load cannot reach the unknown-role branch. AC-2.49 is therefore exercised
 * at the engine boundary: put the column back on datasetRawFirstRow, set the role the
 * test needs, re-run initPreviewState() and read previewEntities. */
async function reinitWithRole(page: Page, role: string | undefined): Promise<Ent[]> {
  return page.evaluate(
    ({ role, sentinel }) => {
      const w = window as unknown as {
        state: { datasetRawFirstRow: Record<string, unknown>; fieldRoleMap: Record<string, string>; previewEntities: unknown[] };
        initPreviewState: () => void;
      };
      w.state.datasetRawFirstRow.entities = [{ text: sentinel, type: 'Aspect', start: 0, end: 4 }];
      if (role === undefined) delete w.state.fieldRoleMap.entities;
      else w.state.fieldRoleMap.entities = role;
      w.initPreviewState();
      return JSON.parse(JSON.stringify(w.state.previewEntities));
    },
    { role, sentinel: SENTINEL },
  );
}

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
});

/* ---- 1. AC-2.48: role 'output' never prefills (RED) ------------------- */
test.describe('issue #1413: entities column with role output is not prefilled (AC-2.48, task 1.1)', () => {
  test('dialogue Input, entities role output: previewEntities empty and sentinel absent from the page', async ({ page }) => {
    await open(page, dialoguePatch('output'), true);
    expect(await previewEntities(page)).toEqual([]);
    const innerText = await page.locator('body').innerText();
    const textContent = (await page.locator('body').textContent()) || '';
    expect(innerText, 'visible text leaks the Output-role entity').not.toContain(SENTINEL);
    expect(textContent, 'DOM text leaks the Output-role entity').not.toContain(SENTINEL);
  });
});

/* ---- 2. AC-2.49: unknown role, dialogue Input (RED) ------------------- */
test.describe('issue #1413: unknown entities role is not prefilled, dialogue Input (AC-2.49, task 1.1)', () => {
  for (const [label, role] of [['key absent', undefined], ["empty string ''", '']] as const) {
    test(`role ${label}: previewEntities empty`, async ({ page }) => {
      await open(page, '', true);
      expect(await reinitWithRole(page, role)).toEqual([]);
    });
  }
});

/* ---- 3. AC-2.49: unknown role, string Input (RED) --------------------- */
test.describe('issue #1413: unknown entities role is not prefilled, string Input (AC-2.49, task 1.1)', () => {
  for (const [label, role] of [['key absent', undefined], ["empty string ''", '']] as const) {
    test(`role ${label}: previewEntities empty`, async ({ page }) => {
      await open(page, stringInputPatch(undefined, '[]'), false);
      expect(await reinitWithRole(page, role)).toEqual([]);
    });
  }
});

/* ---- 4. known non-Output roles keep loading (regression, passes before Green) */
test.describe('issue #1413: known non-Output roles still load entities (task 1.1)', () => {
  for (const role of ['input', 'evidence']) {
    test(`dialogue Input, role ${role}: previewEntities equals the data-carried entity`, async ({ page }) => {
      await open(page, dialoguePatch(role), true);
      expect((await previewEntities(page)).map((e) => e.text)).toEqual([SENTINEL]);
    });
  }
});

/* ---- 5. AC-2.45 regression: Output-column parse path unchanged -------- */
test.describe('issue #1413: string Input prefill from Output column unchanged (AC-2.45, task 1.1)', () => {
  test('entities empty + Output column holding an entity array: previewEntities loaded from Output', async ({ page }) => {
    await patchDataFile(
      page,
      'task-detail.data.js',
      `
      var p = window.LabelSuiteTaskDetailData.profiles.T013;
      p.fieldRoleMap = { text: 'input', utterances: 'unused', entities: 'input', gold_triplets: 'output' };
      p.dialogue_fields = null;
      var rec = p.datasetRecords[0];
      rec.entities = [];
      rec.gold_triplets = [{ text: '${SENTINEL}', type: 'Aspect', start: 0, end: 4 }];
      `,
    );
    await page.goto(T013_URL);
    await dismissGuidelineModal(page);
    await expect.poll(async () => (await previewEntities(page)).map((e) => e.text)).toEqual([SENTINEL]);
  });
});
