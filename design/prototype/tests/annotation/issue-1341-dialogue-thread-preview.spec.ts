import { test, expect } from '../fixtures';
import type { Page } from '@playwright/test';
import {
  buildWorkspaceUrl,
  dismissGuidelineModal,
  patchDataFile,
  selectWorkspaceText,
  skipGuidelineModal,
} from './_workspace-helpers';

/* issue #1341 (OpenSpec change annotation-dialogue-thread-preview, RED):
 * the workspace central "整合預覽" (renderAbsaUnifiedPreview, T013 =
 * entity_recognition + relation_identification) renders an object-array Input
 * as a dialogue thread driven by the task profile key `dialogue_fields`, and
 * records highlights as { text, type, utt_id, start, end } with a half-open
 * in-utterance range [start, end).
 *
 * Selector contract (design.md D2/D4 + the existing renderDialogueThread
 * hooks reused by the workspace thread):
 *   - dialogue-thread-row   one row per utterance
 *   - dialogue-speaker      speaker label inside a row
 *   - dialogue-utt-id       "#<utt_id>" inside a row
 *   - dialogue-text         utterance text inside a row (selection target,
 *                           a single text node per utterance)
 *   - dialogue-cross-utt-hint  role="alert" hint on cross-utterance select
 *   - raw-JSON fallback (2-C): a <details> (open by default) whose content
 *     is monospace and holds JSON.stringify(value, null, 2)
 * Entity state is read from `window.state.previewEntities`
 * (annotation-workspace.config.js:459 exposes `window.state`).
 *
 * Traceability: specs/annotation/015-annotation-workspace/spec.md (openspec
 * delta) FR-107, AC-2.31, AC-2.32, AC-2.33, AC-2.34, AC-2.35, SC-029.
 * tasks.md: 1.1, 2.1, 3.1, 4.1. */

const T013_URL = buildWorkspaceUrl({ task_id: 'T013', sample_id: 'absa-001' });
const DIALOGUE_FIELDS = { text: 'text', speaker: 'speaker', utt_id: 'utt_id' };
const SPEAKERS = ['rottenrockteahouse', '張峯獎-f6w', 'isbonny', 'rottenrockteahouse', 'rottenrockteahouse'];

/* Unique sentinels that appear nowhere in the Input fields, so a leak of any
 * Output value is detectable (gold_triplets' real strings also occur inside
 * the utterances and would not discriminate). */
const GOLD_SENTINELS = ['GOLDSECRET-ASPECT', 'GOLDSECRET-NOTE', 'GOLDSECRET-INCOMPLETE'];
const GOLD_PATCH = `
  var rec = window.LabelSuiteTaskDetailData.profiles.T013.datasetRecords[0];
  rec.gold_triplets[0].aspect_text = 'GOLDSECRET-ASPECT';
  rec.gold_triplets[0].notes = 'GOLDSECRET-NOTE';
  rec.incomplete_annotations[0].notes = 'GOLDSECRET-INCOMPLETE';
`;
/* No dialogue config: T013 keeps utterances as the only Input (text unused),
 * dialogue_fields explicitly null. */
const NO_DIALOGUE_PATCH = `
  var p = window.LabelSuiteTaskDetailData.profiles.T013;
  p.fieldRoleMap.text = 'unused';
  p.dialogue_fields = null;
`;

type PreviewEntity = { text: string; type: string; utt_id?: unknown; start: number; end: number };

async function openT013(page: Page) {
  await page.goto(T013_URL);
  await dismissGuidelineModal(page);
}

async function readEntities(page: Page): Promise<PreviewEntity[]> {
  return page.evaluate(
    () => JSON.parse(JSON.stringify((window as unknown as { state: { previewEntities: unknown[] } }).state.previewEntities)),
  );
}

async function expectNoGoldLeak(page: Page) {
  const innerText = await page.locator('body').innerText();
  const textContent = (await page.locator('body').textContent()) || '';
  GOLD_SENTINELS.forEach((s) => {
    expect(innerText, `visible text leaks ${s}`).not.toContain(s);
    expect(textContent, `DOM text leaks ${s}`).not.toContain(s);
  });
}

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
});

test.describe('issue #1341: T013 seed (AC-2.35, tasks 1.1)', () => {
  test('text is unused, utterances is the only input, dialogue_fields set', async ({ page }) => {
    await page.goto(T013_URL);
    const seed = await page.evaluate(() => {
      const p = (window as unknown as {
        LabelSuiteTaskDetailData: { profiles: Record<string, { fieldRoleMap: Record<string, string>; dialogue_fields?: unknown }> };
      }).LabelSuiteTaskDetailData.profiles.T013;
      return { roles: p.fieldRoleMap, dialogue_fields: p.dialogue_fields };
    });
    expect(seed.roles.text).toBe('unused');
    expect(seed.roles.utterances).toBe('input');
    const inputs = Object.keys(seed.roles).filter((k) => seed.roles[k] === 'input');
    expect(inputs).toEqual(['utterances']);
    expect(seed.dialogue_fields).toEqual(DIALOGUE_FIELDS);
  });
});

test.describe('issue #1341: profile carries dialogueFields (tasks 2.1)', () => {
  test('resolveTaskProfile exposes dialogueFields: T013 value, null when unset', async ({ page }) => {
    await page.goto(T013_URL);
    const result = await page.evaluate(() => {
      const data = (window as unknown as {
        LabelSuiteAnnotationWorkspaceData: { resolveTaskProfile: (id: string) => Record<string, unknown> | null };
      }).LabelSuiteAnnotationWorkspaceData;
      const t013 = data.resolveTaskProfile('T013');
      const t007 = data.resolveTaskProfile('T007');
      return {
        t013Has: !!t013 && 'dialogueFields' in t013,
        t013: t013 ? t013.dialogueFields : undefined,
        t007Has: !!t007 && 'dialogueFields' in t007,
        t007: t007 ? t007.dialogueFields : undefined,
      };
    });
    expect(result.t013Has).toBe(true);
    expect(result.t013).toEqual(DIALOGUE_FIELDS);
    expect(result.t007Has).toBe(true);
    expect(result.t007).toBeNull();
  });
});

test.describe('issue #1341: dialogue thread in the integrated preview (FR-107)', () => {
  test('AC-2.31: one row per utterance with speaker, #utt_id and its own text', async ({ page }) => {
    await openT013(page);
    const rows = page.getByTestId('dialogue-thread-row');
    await expect(rows).toHaveCount(5);
    for (let i = 0; i < 5; i++) {
      const row = rows.nth(i);
      await expect(row.getByTestId('dialogue-speaker')).toHaveText(SPEAKERS[i]);
      await expect(row.getByTestId('dialogue-utt-id')).toHaveText(new RegExp(`^#\\s*${i}$`));
      await expect(row.getByTestId('dialogue-text')).not.toBeEmpty();
    }
    await expect(rows.nth(1).getByTestId('dialogue-text')).toHaveText('我已經拿了九天了就沒有這個問題你在唬爛');
    await expect(rows.nth(4).getByTestId('dialogue-text')).toHaveText('我在首發當天買');
    expect(await page.locator('body').innerText()).not.toContain('[object Object]');
  });

  test('AC-2.32 / SC-029: highlight is stored as {utt_id,start,end} half-open within the utterance', async ({ page }) => {
    await openT013(page);
    await page.getByRole('button', { name: 'Aspect', exact: true }).click();
    const row0Text = page.getByTestId('dialogue-thread-row').nth(0).getByTestId('dialogue-text');
    const utterance = (await row0Text.textContent()) || '';
    await selectWorkspaceText(page, row0Text, '過熱問題');

    const ents = await readEntities(page);
    const ent = ents.find((e) => e.text === '過熱問題');
    expect(ent, 'entity 過熱問題 must be recorded').toBeTruthy();
    expect(String(ent!.utt_id)).toBe('0');
    expect(ent!.end - ent!.start).toBe(4);
    expect(utterance.slice(ent!.start, ent!.end)).toBe('過熱問題');
    expect(ent!.start).toBeGreaterThanOrEqual(0);
    expect(ent!.end).toBeLessThanOrEqual(utterance.length);
  });

  test('AC-2.32 / SC-029: coordinates are per utterance, not offsets into the joined text', async ({ page }) => {
    await openT013(page);
    await page.getByRole('button', { name: 'Opinion', exact: true }).click();
    const row1Text = page.getByTestId('dialogue-thread-row').nth(1).getByTestId('dialogue-text');
    const utterance = (await row1Text.textContent()) || '';
    await selectWorkspaceText(page, row1Text, '唬爛');

    const ent = (await readEntities(page)).find((e) => e.text === '唬爛');
    expect(ent, 'entity 唬爛 must be recorded').toBeTruthy();
    expect(String(ent!.utt_id)).toBe('1');
    expect(ent!.start).toBe(utterance.indexOf('唬爛'));
    expect(utterance.slice(ent!.start, ent!.end)).toBe('唬爛');
  });

  test('AC-2.33: a selection spanning two utterances is rejected with a hint', async ({ page }) => {
    await openT013(page);
    await page.getByRole('button', { name: 'Aspect', exact: true }).click();
    const before = (await readEntities(page)).length;
    const rows = page.getByTestId('dialogue-thread-row');
    await expect(rows).toHaveCount(5);
    await rows.nth(0).getByTestId('dialogue-text').evaluate((_n) => {
      const texts = Array.from(document.querySelectorAll('[data-testid="dialogue-text"]'));
      const first = texts[0].firstChild as Text;
      const second = texts[1].firstChild as Text;
      const range = document.createRange();
      range.setStart(first, (first.textContent || '').indexOf('過熱'));
      range.setEnd(second, 5);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    });
    await rows.nth(1).getByTestId('dialogue-text').dispatchEvent('mouseup');

    const hint = page.getByTestId('dialogue-cross-utt-hint');
    await expect(hint).toBeVisible();
    await expect(hint).toHaveAttribute('role', 'alert');
    expect((await readEntities(page)).length).toBe(before);
  });
});

test.describe('issue #1341: raw JSON fallback when dialogue_fields is unset (AC-2.34)', () => {
  test('object-array Input renders as collapsible monospace JSON, no thread, no [object Object]', async ({ page }) => {
    await patchDataFile(page, 'task-detail.data.js', NO_DIALOGUE_PATCH);
    await openT013(page);

    await expect(page.getByTestId('dialogue-thread-row')).toHaveCount(0);
    const details = page.locator('details').filter({ hasText: '"speaker": "rottenrockteahouse"' });
    await expect(details).toHaveCount(1);
    expect(await details.evaluate((d) => (d as HTMLDetailsElement).open)).toBe(true);
    await expect(details.locator('summary')).toHaveCount(1);
    await expect(details).toContainText('"utt_id": 4');

    const family = await details.evaluate((d) => {
      const walker = document.createTreeWalker(d, NodeFilter.SHOW_TEXT);
      let n: Node | null;
      while ((n = walker.nextNode())) {
        if ((n.textContent || '').includes('"utt_id"')) return getComputedStyle(n.parentElement as Element).fontFamily;
      }
      return '';
    });
    expect(family).toMatch(/mono|courier|consolas/i);
    expect(await page.locator('body').innerText()).not.toContain('[object Object]');
  });
});

test.describe('issue #1341: Input role retention (D6, tasks 4.1)', () => {
  test('object-array Input utterances stays in workspace state.fieldRoleMap', async ({ page }) => {
    await openT013(page);
    const roles = await page.evaluate(
      () => (window as unknown as { state: { fieldRoleMap: Record<string, string> } }).state.fieldRoleMap,
    );
    expect(roles.utterances).toBe('input');
  });

  test('pure-value-array Input (sequence_tagging tokens) is still removed', async ({ page }) => {
    await patchDataFile(
      page,
      'task-detail.data.js',
      `
      var p = window.LabelSuiteTaskDetailData.profiles.T013;
      p.fieldRoleMap.tokens = 'input';
      p.datasetRecords.forEach(function (r) { r.tokens = ['我', '入', '手']; });
      `,
    );
    await openT013(page);
    const roles = await page.evaluate(
      () => (window as unknown as { state: { fieldRoleMap: Record<string, string> } }).state.fieldRoleMap,
    );
    expect(roles.tokens).toBeUndefined();
  });
});

test.describe('issue #1341: Data Fairness - Output never rendered (AC-2.35)', () => {
  test('thread mode: page text never contains gold_triplets / incomplete_annotations content', async ({ page }) => {
    await patchDataFile(page, 'task-detail.data.js', GOLD_PATCH);
    await openT013(page);
    await expect(page.getByTestId('dialogue-thread-row')).toHaveCount(5);
    await expectNoGoldLeak(page);
  });

  test('raw JSON mode: page text never contains gold_triplets / incomplete_annotations content', async ({ page }) => {
    await patchDataFile(page, 'task-detail.data.js', `${GOLD_PATCH}\n${NO_DIALOGUE_PATCH}`);
    await openT013(page);
    await expect(page.locator('details').filter({ hasText: '"speaker": "rottenrockteahouse"' })).toHaveCount(1);
    await expectNoGoldLeak(page);
  });
});
