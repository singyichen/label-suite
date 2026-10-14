import { test, expect } from '../fixtures';
import type { Page } from '@playwright/test';
import {
  buildWorkspaceUrl,
  dismissGuidelineModal,
  patchDataFile,
  selectWorkspaceText,
  skipGuidelineModal,
} from './_workspace-helpers';

/* issue #1371 (OpenSpec change annotation-dialogue-preview-no-output-entities, RED):
 * the workspace "整合預覽" must not prefill ENTITIES from an Output column when the
 * Input is an object array (dialogue), and a highlight whose DOM offset disagrees
 * with the utterance text gets its own ambiguity hint.
 *
 * Contract under test:
 *   - FR-107 item 14 / AC-2.44, AC-2.45: dialogue Input never prefills entities from
 *     Output (Data Fairness); a string Input and a dialogue Input's own `entities`
 *     keep today's behavior (regression, passes before Green).
 *   - FR-107 item 15 / AC-2.46, AC-2.47: ambiguous highlight -> no entity + a
 *     dedicated hint, i18n key `dialogueSelectionAmbiguousHint` (zh + en, no `{n}`,
 *     distinct from dialogueLocateFailHint); a unique occurrence is still adopted.
 *   - tasks.md: 1.1, 2.1.
 *
 * Triggering a DOM-offset mismatch: a real drag over the rendered thread always
 * yields a DOM offset equal to the utterance offset (Range#toString over the
 * utterance's own text nodes), so the mismatch branch is not reachable through an
 * untouched UI. The tests below simulate DOM drift by prepending a 2-char text node
 * inside the turn's dialogue-text element before the real selection + mouseup; the
 * handler then computes start = idx + 2 and fails its substring check. This is a
 * simulation of drift, not a user-reachable state. */

const T013_URL = buildWorkspaceUrl({ task_id: 'T013', sample_id: 'absa-001' });
const OUT_ENTITY_SENTINEL = 'OUTENTSECRET-X';

const OUTPUT_ENTITIES_PATCH = `
  var rec = window.LabelSuiteTaskDetailData.profiles.T013.datasetRecords[0];
  var map = window.LabelSuiteTaskDetailData.profiles.T013.fieldRoleMap;
  map.entities = 'input';
  rec.entities = [];
  rec.gold_triplets = [{ text: '${OUT_ENTITY_SENTINEL}', type: 'Aspect', start: 0, end: 4 }];
`;

type Ent = Record<string, unknown>;

async function previewEntities(page: Page): Promise<Ent[]> {
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

/* ---- 1. i18n key (task 1.1, AC-2.46) --------------------------------- */
test.describe('issue #1371: ambiguity hint copy key (task 1.1)', () => {
  test('dialogueSelectionAmbiguousHint exists in zh and en, has no {n}, differs from dialogueLocateFailHint', async ({ page }) => {
    await page.goto(T013_URL);
    const dict = await page.evaluate(() => {
      const i18n = (window as unknown as { TASK_CONFIG_I18N?: Record<string, Record<string, string>> }).TASK_CONFIG_I18N;
      const pick = (l: string) => ({
        ambiguous: i18n?.[l]?.dialogueSelectionAmbiguousHint,
        locate: i18n?.[l]?.dialogueLocateFailHint,
      });
      return { hasDict: !!i18n, zh: pick('zh'), en: pick('en') };
    });
    expect(dict.hasDict, 'TASK_CONFIG_I18N must be reachable').toBe(true);
    for (const lang of ['zh', 'en'] as const) {
      const { ambiguous, locate } = dict[lang];
      expect(typeof ambiguous, `${lang}.dialogueSelectionAmbiguousHint missing`).toBe('string');
      expect((ambiguous as string).length, `${lang} copy empty`).toBeGreaterThan(0);
      expect(ambiguous, `${lang} copy must not carry {n}`).not.toContain('{n}');
      expect(ambiguous, `${lang} must differ from dialogueLocateFailHint`).not.toBe(locate);
    }
  });
});

/* ---- 2. no entity prefill from Output (task 2.1, AC-2.44) ------------ */
test.describe('issue #1371: dialogue Input does not prefill entities from Output (AC-2.44, task 2.1)', () => {
  test('empty entities + Output {text,type} array: previewEntities empty and Output text not on the page', async ({ page }) => {
    await patchDataFile(page, 'task-detail.data.js', OUTPUT_ENTITIES_PATCH);
    await openT013(page);
    expect(await previewEntities(page)).toEqual([]);
    const innerText = await page.locator('body').innerText();
    const textContent = (await page.locator('body').textContent()) || '';
    expect(innerText, 'visible text leaks the Output entity').not.toContain(OUT_ENTITY_SENTINEL);
    expect(textContent, 'DOM text leaks the Output entity').not.toContain(OUT_ENTITY_SENTINEL);
  });
});

/* ---- 3. regression (task 2.1, AC-2.45): passes before Green ---------- */
test.describe('issue #1371: non-dialogue prefill behavior unchanged (AC-2.45, task 2.1)', () => {
  test('string Input with the same Output entity array still prefills previewEntities from Output', async ({ page }) => {
    await patchDataFile(
      page,
      'task-detail.data.js',
      `
      var p = window.LabelSuiteTaskDetailData.profiles.T013;
      p.fieldRoleMap = { text: 'input', utterances: 'unused', entities: 'input', gold_triplets: 'output' };
      p.dialogue_fields = null;
      var rec = p.datasetRecords[0];
      rec.entities = [];
      rec.gold_triplets = [{ text: '${OUT_ENTITY_SENTINEL}', type: 'Aspect', start: 0, end: 4 }];
      `,
    );
    await page.goto(T013_URL);
    await dismissGuidelineModal(page);
    await expect.poll(async () => (await previewEntities(page)).map((e) => e.text)).toEqual([OUT_ENTITY_SENTINEL]);
  });

  test('dialogue Input carrying its own entities still loads them', async ({ page }) => {
    await patchDataFile(
      page,
      'task-detail.data.js',
      `
      var rec = window.LabelSuiteTaskDetailData.profiles.T013.datasetRecords[0];
      window.LabelSuiteTaskDetailData.profiles.T013.fieldRoleMap.entities = 'input';
      rec.entities = [{ text: '唬爛', type: 'Opinion', utt_id: 1, start: 17, end: 19 }];
      `,
    );
    await openT013(page);
    expect((await previewEntities(page)).map((e) => e.text)).toEqual(['唬爛']);
  });
});

/* ---- 4/5. selection with DOM-offset mismatch ------------------------- */
async function selectWithDrift(page: Page, row: number, text: string) {
  const target = page.getByTestId('dialogue-thread-row').nth(row).getByTestId('dialogue-text');
  await target.evaluate((node) => node.prepend(document.createTextNode('XX')));
  await selectWorkspaceText(page, target, text);
}

for (const lang of ['zh', 'en'] as const) {
  test.describe(`issue #1371: ambiguous highlight shows the dedicated hint [${lang}] (AC-2.46, task 2.1)`, () => {
    test(`text occurring twice in the turn, DOM offset mismatch: no entity, hint = dialogueSelectionAmbiguousHint, no {n}`, async ({ page }) => {
      await page.addInitScript((l) => window.localStorage.setItem('labelsuite.lang', l), lang);
      await openT013(page);
      await page.getByRole('button', { name: 'Aspect', exact: true }).click();
      // utterance 1 contains '了' twice (拿了, 九天了)
      await selectWithDrift(page, 1, '了');

      expect(await previewEntities(page)).toEqual([]);
      const hint = page.getByTestId('dialogue-cross-utt-hint');
      await expect(hint).toBeVisible();
      const expected = await page.evaluate(
        (l) => (window as unknown as { TASK_CONFIG_I18N: Record<string, Record<string, string>> }).TASK_CONFIG_I18N[l].dialogueSelectionAmbiguousHint,
        lang,
      );
      expect(typeof expected, 'dialogueSelectionAmbiguousHint missing').toBe('string');
      await expect(hint).toHaveText(expected);
      await expect(hint).not.toContainText('{n}');
    });
  });
}

/* ---- 5. unique-occurrence fallback (AC-2.47): documents existing behavior */
test.describe('issue #1371: unique-occurrence fallback (AC-2.47, task 2.1)', () => {
  test('DOM offset mismatch but text occurs once in the turn: entity added at the unique position', async ({ page }) => {
    const utt1 = '我已經拿了九天了就沒有這個問題你在唬爛';
    await openT013(page);
    await page.getByRole('button', { name: 'Opinion', exact: true }).click();
    await selectWithDrift(page, 1, '唬爛');

    const ents = await previewEntities(page);
    expect(ents).toHaveLength(1);
    const ent = ents[0];
    expect(ent.text).toBe('唬爛');
    expect(String(ent.utt_id)).toBe('1');
    expect(ent.start).toBe(utt1.indexOf('唬爛'));
    expect(ent.end).toBe(utt1.indexOf('唬爛') + 2);
    expect(utt1.slice(ent.start as number, ent.end as number)).toBe('唬爛');
    await expect(page.getByTestId('dialogue-cross-utt-hint')).toHaveCount(0);
  });
});
