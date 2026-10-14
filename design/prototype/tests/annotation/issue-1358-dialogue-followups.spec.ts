import { test, expect } from '../fixtures';
import type { Page } from '@playwright/test';
import {
  buildListUrl,
  buildWorkspaceUrl,
  dismissGuidelineModal,
  gotoReviewerWorkspace,
  patchDataFile,
  selectWorkspaceText,
  skipGuidelineModal,
} from './_workspace-helpers';

/* issue #1358 (OpenSpec change annotation-dialogue-followups, RED): follow-ups
 * deferred from #1341 for the workspace "整合預覽" dialogue thread and for the
 * shared list summary helper.
 *
 * Rulings under test (maintainer, #1358):
 *   1. Object-array (dialogue) Input never prefills relation triples from an
 *      Output column ('ner' = entity1/relation/entity2, 'gold' = subj/rel/obj).
 *   2. An entity WITHOUT coordinates is placed only when its text occurs exactly
 *      once across the utterances; otherwise it is NOT placed (no first-
 *      occurrence guess) and a hint with the unlocatable count is shown.
 *   3. Overlapping entities in one utterance: storage unchanged, a visible hint
 *      shows how many entities were not drawn.
 *   5. LabelSuiteAnnotationWorkspaceData.getRecordSummaryText takes a 5th param
 *      `dialogueFields` and getRecordSearchText a 4th; the sub-field named by
 *      dialogueFields.text is used (any name); null/undefined -> "{n} 筆資料".
 *      Workspace left rail and annotation-list pass the profile's dialogue_fields.
 *
 * New selector contract: dialogue-unplaced-hint, dialogue-overlap-hint
 * (role="alert" or "status"; text contains the count). New i18n keys in
 * TASK_CONFIG_I18N (zh + en): dialogueLocateFailHint, dialogueOverlapHint,
 * both containing the {n} placeholder.
 *
 * Not covered here: the renderDialogueInput mouseup `indexOf` fallback
 * (ruling 2, selection path) is not drivable from a real selection without
 * forcing a failed verification; it is covered only through the placement
 * path and hint above.
 *
 * Traceability: specs/annotation/015-annotation-workspace/spec.md (openspec
 * delta) FR-107 items 8-10, AC-2.36, AC-2.37, AC-2.38, FR-106 clause 3,
 * SC-028, SC-029. tasks.md: 1.1, 2.1, 3.1, 4.1, 5.1. */

const T013_URL = buildWorkspaceUrl({ task_id: 'T013', sample_id: 'absa-001' });
const UTT_0 = '我入手Note 10 plus第三天就退廠保修\n過熱問題嚴重！差評';
const UTT_1 = '我已經拿了九天了就沒有這個問題你在唬爛';

/* ---- 1. i18n keys (tasks 1.1) --------------------------------------- */
test.describe('issue #1358: hint copy keys (tasks 1.1)', () => {
  test('dialogueLocateFailHint and dialogueOverlapHint exist in zh and en with {n}', async ({ page }) => {
    await skipGuidelineModal(page);
    await page.goto(T013_URL);
    const dict = await page.evaluate(() => {
      const i18n = (window as unknown as { TASK_CONFIG_I18N?: Record<string, Record<string, string>> }).TASK_CONFIG_I18N;
      return {
        hasDict: !!i18n,
        zh: { locate: i18n?.zh?.dialogueLocateFailHint, overlap: i18n?.zh?.dialogueOverlapHint },
        en: { locate: i18n?.en?.dialogueLocateFailHint, overlap: i18n?.en?.dialogueOverlapHint },
      };
    });
    expect(dict.hasDict, 'TASK_CONFIG_I18N must be reachable').toBe(true);
    for (const lang of ['zh', 'en'] as const) {
      for (const k of ['locate', 'overlap'] as const) {
        expect(typeof dict[lang][k], `${lang}.${k} missing`).toBe('string');
        expect(dict[lang][k], `${lang}.${k} lacks {n}`).toContain('{n}');
      }
    }
  });
});

/* ---- 2. engine (tasks 2.1) ------------------------------------------ */
const NER_SENTINELS = ['NERSECRET-E1', 'NERSECRET-REL', 'NERSECRET-E2'];
const GOLD_SENTINELS = ['GOLDSECRET-SUBJ', 'GOLDSECRET-REL', 'GOLDSECRET-OBJ'];

async function leakCheck(page: Page, sentinels: string[]) {
  const innerText = await page.locator('body').innerText();
  const textContent = (await page.locator('body').textContent()) || '';
  sentinels.forEach((s) => {
    expect(innerText, `visible text leaks ${s}`).not.toContain(s);
    expect(textContent, `DOM text leaks ${s}`).not.toContain(s);
  });
}

async function previewTriples(page: Page): Promise<unknown[]> {
  return page.evaluate(
    () => JSON.parse(JSON.stringify((window as unknown as { state: { previewTriples: unknown[] } }).state.previewTriples)),
  );
}

async function previewEntities(page: Page): Promise<Array<Record<string, unknown>>> {
  return page.evaluate(
    () => JSON.parse(JSON.stringify((window as unknown as { state: { previewEntities: unknown[] } }).state.previewEntities)),
  );
}

async function openT013(page: Page) {
  await page.goto(T013_URL);
  await dismissGuidelineModal(page);
  await expect(page.getByTestId('dialogue-thread-row')).toHaveCount(5);
}

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
});

test.describe('issue #1358: no triple prefill from Output on dialogue Input (AC-2.36, tasks 2.1)', () => {
  test("'ner' shape (entity1/relation/entity2) Output is not prefilled and not rendered", async ({ page }) => {
    await patchDataFile(
      page,
      'task-detail.data.js',
      `
      var rec = window.LabelSuiteTaskDetailData.profiles.T013.datasetRecords[0];
      rec.gold_triplets = [{
        entity1: { text: 'NERSECRET-E1', start: 0, end: 3 },
        relation: { text: 'NERSECRET-REL', start: 4, end: 6 },
        entity2: { text: 'NERSECRET-E2', start: 7, end: 9 },
        relation_type: 'has_aspect'
      }];
      `,
    );
    await openT013(page);
    expect(await previewTriples(page)).toEqual([]);
    await leakCheck(page, NER_SENTINELS);
  });

  test("'gold' shape (subj/rel/obj) Output is not prefilled and not rendered", async ({ page }) => {
    await patchDataFile(
      page,
      'task-detail.data.js',
      `
      var rec = window.LabelSuiteTaskDetailData.profiles.T013.datasetRecords[0];
      rec.gold_triplets = [{ subj: 'GOLDSECRET-SUBJ', rel: 'GOLDSECRET-REL', obj: 'GOLDSECRET-OBJ' }];
      `,
    );
    await openT013(page);
    expect(await previewTriples(page)).toEqual([]);
    await leakCheck(page, GOLD_SENTINELS);
  });
});

async function markInRow(page: Page, type: string, row: number, text: string) {
  await page.getByRole('button', { name: type, exact: true }).click();
  await selectWorkspaceText(page, page.getByTestId('dialogue-thread-row').nth(row).getByTestId('dialogue-text'), text);
}

test.describe('issue #1358: overlapping entities show a hint (AC-2.38, tasks 2.1)', () => {
  test('no overlap hint before any overlap', async ({ page }) => {
    await openT013(page);
    await markInRow(page, 'Aspect', 0, '過熱問題');
    await expect(page.getByTestId('dialogue-overlap-hint')).toHaveCount(0);
  });

  test('two overlapping entities in one utterance: storage keeps both, hint shows 1 not drawn', async ({ page }) => {
    await openT013(page);
    await markInRow(page, 'Aspect', 0, '過熱問題');
    await markInRow(page, 'Opinion', 0, '熱問');

    const ents = await previewEntities(page);
    expect(ents.map((e) => e.text).sort()).toEqual(['熱問', '過熱問題']);

    const hint = page.getByTestId('dialogue-overlap-hint');
    await expect(hint).toBeVisible();
    await expect(hint).toHaveAttribute('role', /^(alert|status)$/);
    await expect(hint).toContainText('1');
    await expect(hint).not.toContainText('{n}');
    // storage unchanged by rendering the hint
    expect(await previewEntities(page)).toEqual(ents);
  });

  test('three entities all overlapping the first: hint counts 2', async ({ page }) => {
    await openT013(page);
    await markInRow(page, 'Aspect', 0, '過熱問題');
    await markInRow(page, 'Opinion', 0, '熱問');
    await markInRow(page, 'Target', 0, '問題');
    expect((await previewEntities(page)).length).toBe(3);
    await expect(page.getByTestId('dialogue-overlap-hint')).toContainText('2');
  });
});

/* CompactAnswer seed (reviewer demo row): the only path that produces
 * entities WITHOUT coordinates on a dialogue Input. */
async function seedCompactEntities(page: Page, entitiesJson: string) {
  await patchDataFile(
    page,
    'annotation-workspace.data.js',
    `
    var data = window.LabelSuiteAnnotationWorkspaceData;
    data.REVIEWER_MOCK_ROWS.T013['absa-001'][0].answers.entity_recognition = ${entitiesJson};
    data.REVIEWER_MOCK_ROWS.T013['absa-001'][0].answers.relation_identification = [];
    `,
  );
  await gotoReviewerWorkspace(page, { task_id: 'T013', sample_id: 'absa-001' });
  await dismissGuidelineModal(page);
  await expect(page.getByTestId('dialogue-thread-row')).toHaveCount(5);
}

test.describe('issue #1358: unlocatable entities show a hint with count (AC-2.37, tasks 2.1)', () => {
  test('two coordinate-less entities with repeated text: not placed, hint shows 2', async ({ page }) => {
    // '問題' occurs in utt 0 and utt 1; '我' occurs in utt 0, 1, 4.
    await seedCompactEntities(
      page,
      JSON.stringify([
        { text: '問題', type: 'Aspect' },
        { text: '我', type: 'Opinion' },
      ]),
    );
    const hint = page.getByTestId('dialogue-unplaced-hint');
    await expect(hint).toBeVisible();
    await expect(hint).toHaveAttribute('role', /^(alert|status)$/);
    await expect(hint).toContainText('2');
    await expect(hint).not.toContainText('{n}');
  });

  test('no unplaced hint when every entity is locatable', async ({ page }) => {
    await seedCompactEntities(page, JSON.stringify([{ text: '唬爛', type: 'Opinion' }]));
    await expect(page.getByTestId('dialogue-unplaced-hint')).toHaveCount(0);
  });
});

/* ---- 3. helper unit-ish tests (tasks 3.1) ---------------------------- */
type Helpers = {
  getRecordSummaryText: (...a: unknown[]) => string;
  getRecordSearchText: (...a: unknown[]) => string;
};

async function callHelper<T>(page: Page, fn: string, args: unknown[]): Promise<T> {
  await page.goto(T013_URL);
  return page.evaluate(
    ({ fn, args }) => {
      const data = (window as unknown as { LabelSuiteAnnotationWorkspaceData: Record<string, (...a: unknown[]) => unknown> })
        .LabelSuiteAnnotationWorkspaceData;
      return data[fn](...args);
    },
    { fn, args },
  ) as Promise<T>;
}

const ROLES = { utterances: 'input' };
/* `who` precedes `content` and `text` is a decoy, so neither the "first string
 * value" nor a hardcoded `text` lookup can produce the expected answer. */
const RENAMED = {
  id: 'r1',
  utterances: [
    { who: 'WHO1', content: 'REAL1', text: 'DECOY1' },
    { who: 'WHO2', content: 'REAL2', text: 'DECOY2' },
  ],
};
const PLAIN = { id: 'r2', utterances: [{ text: 'T1', speaker: 'a' }, { text: 'T2', speaker: 'b' }] };

test.describe('issue #1358: summary helpers take dialogue_fields (FR-106 clause 3, tasks 3.1)', () => {
  test('getRecordSummaryText uses the sub-field named by dialogueFields.text, whatever its name', async ({ page }) => {
    const out = await callHelper<string>(page, 'getRecordSummaryText', [RENAMED, ROLES, null, 'zh', { text: 'content' }]);
    expect(out).toBe('REAL1');
  });

  test('getRecordSummaryText: dialogueFields null -> "{n} 筆資料", never a hardcoded text key', async ({ page }) => {
    expect(await callHelper<string>(page, 'getRecordSummaryText', [PLAIN, ROLES, null, 'zh', null])).toBe('2 筆資料');
  });

  test('getRecordSummaryText: dialogueFields omitted -> "{n} 筆資料"', async ({ page }) => {
    expect(await callHelper<string>(page, 'getRecordSummaryText', [PLAIN, ROLES, null, 'zh'])).toBe('2 筆資料');
  });

  test('getRecordSummaryText: en locale -> "{n} items"', async ({ page }) => {
    expect(await callHelper<string>(page, 'getRecordSummaryText', [PLAIN, ROLES, null, 'en', null])).toBe('2 items');
  });

  test('getRecordSummaryText: dialogueFields without a text key -> "{n} 筆資料"', async ({ page }) => {
    const out = await callHelper<string>(page, 'getRecordSummaryText', [PLAIN, ROLES, null, 'zh', { speaker: 'speaker' }]);
    expect(out).toBe('2 筆資料');
  });

  test('getRecordSummaryText: non-dialogue values are unaffected by dialogueFields', async ({ page }) => {
    const out = await callHelper<string>(page, 'getRecordSummaryText', [
      { id: 'r3', body: 'plain string' }, { body: 'input' }, null, 'zh', { text: 'content' },
    ]);
    expect(out).toBe('plain string');
  });

  test('getRecordSearchText joins the dialogueFields.text sub-field of every element', async ({ page }) => {
    const out = await callHelper<string>(page, 'getRecordSearchText', [RENAMED, ROLES, 'zh', { text: 'content' }]);
    expect(out).toBe('REAL1 REAL2');
  });

  test('getRecordSearchText: dialogueFields null -> "{n} 筆資料", not the element text', async ({ page }) => {
    const out = await callHelper<string>(page, 'getRecordSearchText', [PLAIN, ROLES, 'zh', null]);
    expect(out).toBe('2 筆資料');
    expect(out).not.toContain('T1');
  });
});

/* ---- 4. workspace placement + left rail (tasks 4.1) ------------------ */
test.describe('issue #1358: workspace placement of coordinate-less entities (AC-2.37, tasks 4.1)', () => {
  test('text occurring exactly once is placed in that utterance with half-open range', async ({ page }) => {
    await seedCompactEntities(page, JSON.stringify([{ text: '唬爛', type: 'Opinion' }]));
    const ent = (await previewEntities(page)).find((e) => e.text === '唬爛');
    expect(ent, 'entity must be present').toBeTruthy();
    const start = UTT_1.indexOf('唬爛');
    expect(String(ent!.utt_id)).toBe('1');
    expect(ent!.start).toBe(start);
    expect(ent!.end).toBe(start + 2);
  });

  test('text occurring more than once is NOT placed (no first-occurrence guess) and the hint shows', async ({ page }) => {
    await seedCompactEntities(page, JSON.stringify([{ text: '問題', type: 'Aspect' }]));
    const ent = (await previewEntities(page)).find((e) => e.text === '問題');
    expect(ent, 'entity stays in state').toBeTruthy();
    expect(ent!.start == null, 'must not be placed at the first occurrence').toBe(true);
    expect(ent!.utt_id == null).toBe(true);
    await expect(page.getByTestId('dialogue-unplaced-hint')).toContainText('1');
  });

  test('unique + repeated mix: only the repeated one is unplaced and counted', async ({ page }) => {
    await seedCompactEntities(
      page,
      JSON.stringify([
        { text: '唬爛', type: 'Opinion' },
        { text: '問題', type: 'Aspect' },
      ]),
    );
    const ents = await previewEntities(page);
    expect(ents).toHaveLength(2);
    expect(ents.find((e) => e.text === '唬爛')!.start).toBe(UTT_1.indexOf('唬爛'));
    expect(ents.find((e) => e.text === '問題')!.start == null).toBe(true);
    await expect(page.getByTestId('dialogue-unplaced-hint')).toContainText('1');
  });

  test('entity carrying utt_id/start/end keeps its stored coordinates even when the text repeats', async ({ page }) => {
    const s = UTT_1.indexOf('問題');
    await seedCompactEntities(page, JSON.stringify([{ text: '問題', type: 'Aspect', utt_id: 1, start: s, end: s + 2 }]));
    const ent = (await previewEntities(page)).find((e) => e.text === '問題');
    expect(String(ent!.utt_id)).toBe('1');
    expect(ent!.start).toBe(s);
    expect(ent!.end).toBe(s + 2);
    await expect(page.getByTestId('dialogue-unplaced-hint')).toHaveCount(0);
  });
});

/* Renames the dialogue text sub-field (text -> content) for T013 so the
 * summary can only be correct if it follows dialogue_fields.text. */
const RENAME_PATCH = `
  var p = window.LabelSuiteTaskDetailData.profiles.T013;
  p.datasetRecords.forEach(function (r) {
    r.utterances = r.utterances.map(function (u) { return { utt_id: u.utt_id, speaker: u.speaker, content: u.text }; });
  });
  p.dialogue_fields = { text: 'content', speaker: 'speaker', utt_id: 'utt_id' };
`;
const NULL_DIALOGUE_PATCH = `
  window.LabelSuiteTaskDetailData.profiles.T013.dialogue_fields = null;
`;

const norm = (s: string | null) => (s || '').replace(/\s+/g, ' ').trim();

async function railSummary(page: Page): Promise<string> {
  await page.goto(T013_URL);
  await dismissGuidelineModal(page);
  const item = page.getByTestId('ws-sample-item').first();
  await expect(item).toBeVisible();
  return norm(await item.locator('.sample-snippet').textContent());
}

async function listSummary(page: Page): Promise<string> {
  await page.goto(buildListUrl({ task_id: 'T013' }));
  const row = page.getByTestId('ws-sample-item').filter({ hasText: 'absa-001' });
  await expect(row).toBeVisible();
  return norm(await row.locator('.text-snippet-content').textContent());
}

test.describe('issue #1358: left rail summary follows dialogue_fields (FR-106 clause 3, tasks 4.1)', () => {
  test('renamed text sub-field: left rail shows the first utterance content', async ({ page }) => {
    await patchDataFile(page, 'task-detail.data.js', RENAME_PATCH);
    expect(await railSummary(page)).toBe(norm(`rottenrockteahouse：${UTT_0}`));
  });

  test('dialogue_fields null: left rail shows "{n} 筆資料", not a hardcoded text', async ({ page }) => {
    await patchDataFile(page, 'task-detail.data.js', NULL_DIALOGUE_PATCH);
    expect(await railSummary(page)).toBe('5 筆資料');
  });
});

/* ---- 5. annotation-list parity (tasks 5.1, SC-028) ------------------- */
test.describe('issue #1358: annotation-list summary equals the workspace left rail (SC-028, tasks 5.1)', () => {
  test('renamed text sub-field: list and left rail show the same dialogue_fields.text summary', async ({ page }) => {
    await patchDataFile(page, 'task-detail.data.js', RENAME_PATCH);
    const rail = await railSummary(page);
    const list = await listSummary(page);
    expect(list).toBe(norm(`rottenrockteahouse：${UTT_0}`));
    expect(list).toBe(rail);
  });

  test('dialogue_fields null: list and left rail both show "{n} 筆資料"', async ({ page }) => {
    await patchDataFile(page, 'task-detail.data.js', NULL_DIALOGUE_PATCH);
    const rail = await railSummary(page);
    const list = await listSummary(page);
    expect(list).toBe('5 筆資料');
    expect(list).toBe(rail);
  });
});
