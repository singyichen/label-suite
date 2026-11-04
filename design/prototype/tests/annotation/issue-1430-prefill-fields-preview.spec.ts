import { test, expect } from '../fixtures';
import type { Page } from '@playwright/test';
import path from 'path';
import {
  buildWorkspaceUrl,
  dismissGuidelineModal,
  patchDataFile,
  skipGuidelineModal,
} from './_workspace-helpers';

/* issue #1430 (OpenSpec change annotation-preview-prefill-fields, RED, tasks.md 1.1 / 2.1 / 3.1):
 * the integrated preview (task-config.engine.js initPreviewState + the relation_types
 * auto-fill) reads prefilled entities / triples ONLY from the columns declared in
 * `state.prefillFields` ({entities, triples}, mirrors state.dialogueFields). The declared
 * column must still pass the #1413 role gate (state.fieldRoleMap role: non-empty string
 * other than 'output'); Output / unknown role -> no prefill, for triples too. The hardcoded
 * keys entities / triples / gold_triplets / gold_triples are no longer read.
 *
 * Contract under test:
 *   - FR-107 item 16 / AC-2.50: declared column read, same-name undeclared `entities` ignored.
 *   - FR-107 item 16 / AC-2.51: declared triples column loads when role is Evidence;
 *     Output or unknown role -> empty and the sentinel never reaches the page.
 *   - FR-107 item 16 / AC-2.52: prefill_fields null / missing key / missing sub-key -> the
 *     entities, triples, gold_triplets, gold_triples columns do not prefill.
 *   - FR-107 item 16 / AC-2.53: relation_types auto-fill only from the declared, gated
 *     triples column (task-new step 2 engine boundary; the existing output-column candidate
 *     is a different path and stays untouched).
 *   - AC-2.45 regression: the Output-column parse path for non-object-array Input is unchanged.
 *   - Workspace pivot: T008 state.prefillFields === {entities:'entities', triples:null};
 *     undeclared tasks read null.
 *
 * Sentinels are unique strings so a leak is detectable in body innerText AND textContent.
 * Unknown-role cases run at the engine boundary (sanitizeRecordForAnnotator already strips
 * unmapped columns before the engine, so a page-level load cannot reach that branch): the
 * column is put back on datasetRawFirstRow, the role is set, initPreviewState() is re-run. */

const T008_URL = buildWorkspaceUrl({ task_id: 'T008', sample_id: 'rel-001' });
const T013_URL = buildWorkspaceUrl({ task_id: 'T013', sample_id: 'absa-001' });
const DECL_ENT = 'DECLENTSECRET-X';
const UNDECL_ENT = 'UNDECLENTSECRET-X';
const DECL_SUBJ = 'DECLSUBJSECRET-X';

type Ent = Record<string, unknown>;
type Trip = Record<string, unknown>;
type W = {
  state: Record<string, unknown> & {
    previewEntities: Ent[];
    previewTriples: Trip[];
    datasetRawFirstRow: Record<string, unknown>;
    fieldRoleMap: Record<string, string>;
    prefillFields?: unknown;
  };
  initPreviewState: () => void;
};

const entList = (texts: string[]) =>
  JSON.stringify(texts.map((t, i) => ({ text: t, type: 'Aspect', start: i * 4, end: i * 4 + 4 })));
const nerTriples = (subj: string, relType = 'rtX') =>
  JSON.stringify([
    {
      entity1: { text: subj, start: 0, end: 4 },
      relation: { text: 'rel', start: 5, end: 6 },
      relation_type: relType,
      entity2: { text: 'OBJ', start: 7, end: 9 },
    },
  ]);

async function previewEntities(page: Page): Promise<Ent[]> {
  return page.evaluate(() => JSON.parse(JSON.stringify((window as unknown as W).state.previewEntities)));
}
async function previewTriples(page: Page): Promise<Trip[]> {
  return page.evaluate(() => JSON.parse(JSON.stringify((window as unknown as W).state.previewTriples)));
}
async function pageText(page: Page) {
  const innerText = await page.locator('body').innerText();
  const textContent = (await page.locator('body').textContent()) || '';
  return { innerText, textContent };
}
async function expectNoLeak(page: Page, sentinel: string) {
  const { innerText, textContent } = await pageText(page);
  expect(innerText, `visible text leaks ${sentinel}`).not.toContain(sentinel);
  expect(textContent, `DOM text leaks ${sentinel}`).not.toContain(sentinel);
}

/* Evidence-role columns are legitimately displayed by the workspace's reference card
 * (ws-evidence-card), so for an undeclared column that keeps the Evidence role the leak check
 * must exclude that card: it proves the value never reaches any other surface (entity list,
 * triple list, relation panel). The previewEntities/previewTriples state assertions stay. */
async function expectNoLeakOutsideEvidenceCard(page: Page, sentinel: string) {
  const { innerText, textContent } = await page.evaluate(() => {
    const clone = document.body.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('[data-testid="ws-evidence-card"]').forEach((n) => n.remove());
    return { innerText: clone.innerText ?? '', textContent: clone.textContent ?? '' };
  });
  expect(textContent, `DOM text leaks ${sentinel} outside the evidence card`).not.toContain(sentinel);
  expect(innerText, `text leaks ${sentinel} outside the evidence card`).not.toContain(sentinel);
}

async function openT008(page: Page, patch: string) {
  await patchDataFile(page, 'task-detail.data.js', patch);
  await page.goto(T008_URL);
  await dismissGuidelineModal(page);
  await page.waitForFunction(() => Array.isArray((window as unknown as W).state?.previewEntities));
}

/* Engine-boundary re-run: sets the raw row column, its role and state.prefillFields, drops the
 * seed `triples` column (so only the column under test can feed the preview), re-runs init. */
async function reinit(
  page: Page,
  args: { col: string; value: unknown; role: string | undefined; prefill: unknown },
) {
  return page.evaluate((a) => {
    const w = window as unknown as W;
    delete w.state.datasetRawFirstRow.triples;
    delete w.state.datasetRawFirstRow.entities;
    w.state.datasetRawFirstRow[a.col] = a.value;
    if (a.role === undefined) delete w.state.fieldRoleMap[a.col];
    else w.state.fieldRoleMap[a.col] = a.role;
    w.state.prefillFields = a.prefill;
    w.initPreviewState();
    return {
      ents: JSON.parse(JSON.stringify(w.state.previewEntities)) as Ent[],
      trips: JSON.parse(JSON.stringify(w.state.previewTriples)) as Trip[],
    };
  }, args);
}

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
});

/* ---- 1. workspace pivot: state.prefillFields (tasks 1.1) ------------- */
test.describe('issue #1430: workspace state.prefillFields (task 1.1)', () => {
  test('T008 opens with state.prefillFields equal to {entities:"entities", triples:null}', async ({ page }) => {
    await page.goto(T008_URL);
    await dismissGuidelineModal(page);
    await page.waitForFunction(() => Array.isArray((window as unknown as W).state?.previewEntities));
    expect(await page.evaluate(() => (window as unknown as W).state.prefillFields)).toEqual({
      entities: 'entities',
      triples: null,
    });
  });

  for (const [id, sample] of [['T013', 'absa-001'], ['T010', 'med-001']] as const) {
    test(`undeclared ${id} opens with state.prefillFields null`, async ({ page }) => {
      await page.goto(buildWorkspaceUrl({ task_id: id, sample_id: sample }));
      await dismissGuidelineModal(page);
      await page.waitForFunction(() => Array.isArray((window as unknown as W).state?.previewEntities));
      expect(await page.evaluate(() => (window as unknown as W).state.prefillFields)).toBeNull();
    });
  }

  test('a profile prefill_fields declaration reaches state.prefillFields unchanged', async ({ page }) => {
    await patchDataFile(
      page,
      'task-detail.data.js',
      `window.LabelSuiteTaskDetailData.profiles.T013.prefill_fields = { entities: 'ents_x', triples: 'rels_x' };`,
    );
    await page.goto(T013_URL);
    await dismissGuidelineModal(page);
    await page.waitForFunction(() => Array.isArray((window as unknown as W).state?.previewEntities));
    expect(await page.evaluate(() => (window as unknown as W).state.prefillFields)).toEqual({
      entities: 'ents_x',
      triples: 'rels_x',
    });
  });

  test('a profile without the prefill_fields key reads null', async ({ page }) => {
    await patchDataFile(
      page,
      'task-detail.data.js',
      `delete window.LabelSuiteTaskDetailData.profiles.T008.prefill_fields;`,
    );
    await page.goto(T008_URL);
    await dismissGuidelineModal(page);
    await page.waitForFunction(() => Array.isArray((window as unknown as W).state?.previewEntities));
    expect(await page.evaluate(() => (window as unknown as W).state.prefillFields)).toBeNull();
  });
});

/* ---- 2. AC-2.50: declared column read, same-name undeclared ignored --- */
test.describe('issue #1430: prefilled entities come only from the declared column (AC-2.50, task 2.1)', () => {
  test('declared ents_x (Evidence) loads; undeclared same-name `entities` column is ignored', async ({ page }) => {
    await openT008(
      page,
      `
      var p = window.LabelSuiteTaskDetailData.profiles.T008;
      var rec = p.datasetRecords[0];
      rec.ents_x = ${entList([DECL_ENT])};
      rec.entities = ${entList([UNDECL_ENT])};
      p.fieldRoleMap.ents_x = 'evidence';
      p.fieldRoleMap.entities = 'evidence';
      p.prefill_fields = { entities: 'ents_x', triples: null };
      `,
    );
    expect((await previewEntities(page)).map((e) => e.text)).toEqual([DECL_ENT]);
    await expectNoLeakOutsideEvidenceCard(page, UNDECL_ENT);
  });

  test('declared column wins even when its name differs from the legacy key and the legacy column is Input', async ({ page }) => {
    await openT008(
      page,
      `
      var p = window.LabelSuiteTaskDetailData.profiles.T008;
      var rec = p.datasetRecords[0];
      rec.ents_x = ${entList([DECL_ENT])};
      rec.entities = ${entList([UNDECL_ENT])};
      p.fieldRoleMap.ents_x = 'input';
      p.fieldRoleMap.entities = 'input';
      p.prefill_fields = { entities: 'ents_x', triples: null };
      `,
    );
    expect((await previewEntities(page)).map((e) => e.text)).toEqual([DECL_ENT]);
    await expectNoLeak(page, UNDECL_ENT);
  });
});

/* ---- 3. AC-2.51: declared triples column + role gate ------------------ */
const triplesPatch = (role: string) => `
  var p = window.LabelSuiteTaskDetailData.profiles.T008;
  var rec = p.datasetRecords[0];
  rec.rels_x = ${nerTriples(DECL_SUBJ)};
  rec.triples = [];
  p.fieldRoleMap.rels_x = '${role}';
  p.fieldRoleMap.triples = 'evidence';
  p.prefill_fields = { entities: 'entities', triples: 'rels_x' };
`;

test.describe('issue #1430: prefilled triples come only from the declared column and pass the role gate (AC-2.51, task 2.1)', () => {
  test('declared rels_x with role evidence loads previewTriples', async ({ page }) => {
    await openT008(page, triplesPatch('evidence'));
    const trips = await previewTriples(page);
    expect(trips).toHaveLength(1);
    expect(String(trips[0].subj)).toContain(DECL_SUBJ);
  });

  test('declared rels_x with role output: previewTriples empty and the sentinel is absent from the page', async ({ page }) => {
    await openT008(page, triplesPatch('output'));
    expect(await previewTriples(page)).toEqual([]);
    await expectNoLeak(page, DECL_SUBJ);
  });

  for (const [label, role] of [['key absent', undefined], ["empty string ''", '']] as const) {
    test(`declared rels_x with unknown role (${label}): previewTriples empty`, async ({ page }) => {
      await openT008(page, '');
      const out = await reinit(page, {
        col: 'rels_x',
        value: JSON.parse(nerTriples(DECL_SUBJ)),
        role,
        prefill: { entities: null, triples: 'rels_x' },
      });
      expect(out.trips).toEqual([]);
      await expectNoLeak(page, DECL_SUBJ);
    });
  }

  test('declared entities column with unknown role does not prefill either (gate shared by both kinds)', async ({ page }) => {
    await openT008(page, '');
    const out = await reinit(page, {
      col: 'ents_x',
      value: JSON.parse(entList([DECL_ENT])),
      role: '',
      prefill: { entities: 'ents_x', triples: null },
    });
    expect(out.ents).toEqual([]);
  });
});

/* ---- 4. AC-2.52: undeclared / null / missing sub-key -> no prefill ---- */
type PrefillCase = [label: string, expr: string, entitiesDeclared: boolean, triplesDeclared: boolean];
const PREFILL_CASES: PrefillCase[] = [
  ['prefill_fields null', 'null', false, false],
  ['prefill_fields = {} (both sub-keys missing)', '{}', false, false],
  ['entities declared, triples sub-key missing', `{ entities: 'entities' }`, true, false],
  ['triples declared, entities sub-key missing', `{ triples: 'triples' }`, false, true],
  ['both sub-keys null', '{ entities: null, triples: null }', false, false],
];

test.describe('issue #1430: undeclared prefill source never prefills by column name (AC-2.52, task 2.1)', () => {
  for (const [label, expr, entDeclared] of PREFILL_CASES) {
    test(`entities-named column, Input role, ${label}: ${entDeclared ? 'loads (declared)' : 'previewEntities empty'}`, async ({ page }) => {
      await openT008(
        page,
        `
        var p = window.LabelSuiteTaskDetailData.profiles.T008;
        p.datasetRecords[0].entities = ${entList([UNDECL_ENT])};
        p.fieldRoleMap.entities = 'input';
        p.prefill_fields = ${expr};
        `,
      );
      const texts = (await previewEntities(page)).map((e) => e.text);
      if (entDeclared) {
        expect(texts).toEqual([UNDECL_ENT]);
      } else {
        expect(texts).toEqual([]);
        await expectNoLeak(page, UNDECL_ENT);
      }
    });
  }

  for (const col of ['triples', 'gold_triplets', 'gold_triples'] as const) {
    for (const [label, expr, , trDeclared] of PREFILL_CASES) {
      test(`${col} column, Evidence role, ${label}: ${trDeclared && col === 'triples' ? 'loads (declared)' : 'previewTriples empty'}`, async ({ page }) => {
        await openT008(
          page,
          `
          var p = window.LabelSuiteTaskDetailData.profiles.T008;
          var rec = p.datasetRecords[0];
          rec.triples = [];
          rec.${col} = ${nerTriples(DECL_SUBJ)};
          p.fieldRoleMap.triples = 'evidence';
          p.fieldRoleMap.${col} = 'evidence';
          p.prefill_fields = ${expr};
          `,
        );
        const trips = await previewTriples(page);
        if (trDeclared && col === 'triples') {
          expect(trips.map((t) => String(t.subj))).toEqual([expect.stringContaining(DECL_SUBJ)]);
        } else {
          expect(trips).toEqual([]);
          await expectNoLeakOutsideEvidenceCard(page, DECL_SUBJ);
        }
      });
    }
  }
});

/* ---- 5. AC-2.45 regression: Output-column parse path unchanged -------- */
test.describe('issue #1430: Output-column parse path for non-object-array Input is unchanged (AC-2.45, tasks 2.1)', () => {
  test('prefill_fields null + Output column holding an entity array: previewEntities loaded from Output', async ({ page }) => {
    await openT008(
      page,
      `
      var p = window.LabelSuiteTaskDetailData.profiles.T008;
      p.fieldRoleMap = { text: 'input', gold_out: 'output' };
      p.prefill_fields = null;
      p.datasetRecords[0].gold_out = ${entList([DECL_ENT])};
      `,
    );
    expect((await previewEntities(page)).map((e) => e.text)).toEqual([DECL_ENT]);
  });

  test('prefill_fields null + Output column holding triples: previewTriples loaded from Output', async ({ page }) => {
    await openT008(
      page,
      `
      var p = window.LabelSuiteTaskDetailData.profiles.T008;
      p.fieldRoleMap = { text: 'input', gold_out: 'output' };
      p.prefill_fields = null;
      p.datasetRecords[0].gold_out = ${nerTriples(DECL_SUBJ)};
      `,
    );
    const trips = await previewTriples(page);
    expect(trips).toHaveLength(1);
    expect(String(trips[0].subj)).toContain(DECL_SUBJ);
  });
});

/* ---- 6. AC-2.53: relation_types auto-fill only from the declared, gated triples column ----
 * task-new step 2 (no UI to declare prefill_fields, so state.prefillFields / roles are set at
 * the engine boundary and renderSchemaFields() re-run). The record carries NO record-level
 * `relation_types` array, so the per-triple relation_type labels are the only source. */
const TASK_NEW_URL = '/pages/task-management/task-new.html';
const EXAMPLE_DATA = path.resolve(__dirname, '../../../../docs/product/example-data');

async function gotoTaskNewStep2(page: Page) {
  await page.goto(TASK_NEW_URL, { waitUntil: 'load' });
  await page.waitForFunction(
    () => document.querySelectorAll('#taskCategoryChips [data-key]').length > 0,
    null,
    { timeout: 30000 },
  );
  await page.fill('#taskNameInput', 'issue-1430-relation-types');
  await page.locator('#taskCategoryChips [data-key="sequence"]').click();
  await page.locator('#taskInputTypeChips [data-key="single_item"]').click();
  await page.locator('#taskOutputTypeChips [data-key="relation_identification"]').click();
  await page.locator('#datasetFileInput').setInputFiles(path.join(EXAMPLE_DATA, 'medical-ner-re.json'));
  await expect(page.locator('.inline-dataset-preview-wrap')).toBeVisible();
  await page
    .locator('.inline-preview-role-select[aria-label$="text"]')
    .selectOption('input');
  await page.evaluate(() => (window as unknown as { revalidateCurrentStep?: () => void }).revalidateCurrentStep?.());
  await page.waitForTimeout(200);
  await page.locator('#nextBtn').click();
  await expect(page.locator('#step2Panel')).not.toHaveClass(/hidden/);
}

async function relTypesAfter(
  page: Page,
  a: {
    cols: string[];
    roles: Record<string, string>;
    row: Record<string, unknown>;
    prefill: unknown;
  },
) {
  return page.evaluate((x) => {
    const w = window as unknown as {
      state: Record<string, unknown> & {
        outputConfigs: Record<string, { relation_types?: string[]; _autoPopulated?: boolean }>;
      };
      renderSchemaFields: () => void;
    };
    w.state.datasetParsedColumns = x.cols;
    w.state.fieldRoleMap = x.roles;
    w.state.datasetRawFirstRow = x.row;
    w.state.prefillFields = x.prefill;
    w.state.outputConfigs.relation_identification.relation_types = [];
    w.state.outputConfigs.relation_identification._autoPopulated = false;
    w.state._lastAutoPopKey = null;
    w.renderSchemaFields();
    return w.state.outputConfigs.relation_identification.relation_types ?? [];
  }, a);
}

const REL_ROW = (relCol: string) => ({
  text: 'sample text',
  first_out: 'scalar',
  [relCol]: [
    { entity1: { text: 'a', start: 0, end: 1 }, relation: { text: 'r', start: 2, end: 3 }, relation_type: 'RELSENT_A', entity2: { text: 'b', start: 4, end: 5 } },
    { entity1: { text: 'a', start: 0, end: 1 }, relation: { text: 'r', start: 2, end: 3 }, relation_type: 'RELSENT_B', entity2: { text: 'c', start: 6, end: 7 } },
    { entity1: { text: 'b', start: 4, end: 5 }, relation: { text: 'r', start: 2, end: 3 }, relation_type: 'RELSENT_A', entity2: { text: 'c', start: 6, end: 7 } },
  ],
});

test.describe('issue #1430: relation_types auto-fill reads only the declared, gated triples column (AC-2.53, task 3.1)', () => {
  test('declared rels_x with role evidence: distinct labels are brought in', async ({ page }) => {
    await gotoTaskNewStep2(page);
    const rt = await relTypesAfter(page, {
      cols: ['text', 'first_out', 'rels_x'],
      roles: { text: 'input', first_out: 'output', rels_x: 'evidence' },
      row: REL_ROW('rels_x'),
      prefill: { entities: null, triples: 'rels_x' },
    });
    expect(rt).toEqual(['RELSENT_A', 'RELSENT_B']);
  });

  for (const col of ['triples', 'gold_triplets', 'gold_triples']) {
    test(`undeclared ${col} column (Evidence) with prefill_fields null: nothing is brought in`, async ({ page }) => {
      await gotoTaskNewStep2(page);
      const rt = await relTypesAfter(page, {
        cols: ['text', 'first_out', col],
        roles: { text: 'input', first_out: 'output', [col]: 'evidence' },
        row: REL_ROW(col),
        prefill: null,
      });
      expect(rt).toEqual([]);
    });
  }

  test('declared sibling column does not make an undeclared triples column a source', async ({ page }) => {
    await gotoTaskNewStep2(page);
    const rt = await relTypesAfter(page, {
      cols: ['text', 'first_out', 'triples', 'rels_x'],
      roles: { text: 'input', first_out: 'output', triples: 'evidence', rels_x: 'evidence' },
      row: { ...REL_ROW('triples'), rels_x: [] },
      prefill: { entities: null, triples: 'rels_x' },
    });
    expect(rt).toEqual([]);
  });

  test('declared rels_x with role output (not the first output column): nothing is brought in', async ({ page }) => {
    await gotoTaskNewStep2(page);
    const rt = await relTypesAfter(page, {
      cols: ['text', 'first_out', 'rels_x'],
      roles: { text: 'input', first_out: 'output', rels_x: 'output' },
      row: REL_ROW('rels_x'),
      prefill: { entities: null, triples: 'rels_x' },
    });
    expect(rt).toEqual([]);
    expect(rt).not.toContain('RELSENT_A');
  });

  for (const [label, role] of [['key absent', undefined], ["empty string ''", '']] as const) {
    test(`declared rels_x with unknown role (${label}): nothing is brought in`, async ({ page }) => {
      await gotoTaskNewStep2(page);
      const roles: Record<string, string> = { text: 'input', first_out: 'output' };
      if (role !== undefined) roles.rels_x = role;
      const rt = await relTypesAfter(page, {
        cols: ['text', 'first_out', 'rels_x'],
        roles,
        row: REL_ROW('rels_x'),
        prefill: { entities: null, triples: 'rels_x' },
      });
      expect(rt).toEqual([]);
    });
  }

  test('regression: the existing first-output-column candidate still brings labels in', async ({ page }) => {
    await gotoTaskNewStep2(page);
    const rt = await relTypesAfter(page, {
      cols: ['text', 'gold_out'],
      roles: { text: 'input', gold_out: 'output' },
      row: { text: 'sample text', gold_out: REL_ROW('x').x },
      prefill: null,
    });
    expect(rt).toEqual(['RELSENT_A', 'RELSENT_B']);
  });
});
