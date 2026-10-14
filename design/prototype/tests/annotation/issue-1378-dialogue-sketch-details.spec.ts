import { test, expect } from '../fixtures';
import type { Page } from '@playwright/test';
import {
  buildWorkspaceUrl,
  dismissGuidelineModal,
  patchDataFile,
  selectWorkspaceText,
  skipGuidelineModal,
} from './_workspace-helpers';

/* issue #1378 PR-B1 (OpenSpec change annotation-dialogue-sketch-details, RED):
 * workspace "整合預覽" dialogue thread details from the sketch artifact.
 *
 * Selector / attribute contract (design.md D3):
 *   existing  dialogue-thread-row, dialogue-utt-id, dialogue-speaker, dialogue-text
 *   new       dialogue-avatar (first character of the speaker; absent when the
 *             speaker is null/empty), dialogue-reply-tag, dialogue-view-entities,
 *             dialogue-view-plain (aria-pressed). A row whose reply_to is VALID
 *             carries data-reply-to="<replied utt id>".
 *   reply_to is valid only when dialogue_fields.reply_to is non-null AND the
 *   turn's value (as string) equals the utt id of ANOTHER turn (design.md D1).
 *
 * Generalization-First: sub-field names are read from dialogue_fields, never
 * hardcoded. Data Fairness: only Input is read; no Output/Evidence value is
 * touched by any test here.
 *
 * Traceability: specs/annotation/015-annotation-workspace/spec.md (openspec
 * delta) FR-107 items 11-13, AC-2.39 ~ AC-2.43. tasks.md: 1.1, 2.1, 3.1, 4.1, 5.1. */

const T013_URL = buildWorkspaceUrl({ task_id: 'T013', sample_id: 'absa-001' });
const rowsOf = (page: Page) => page.getByTestId('dialogue-thread-row');
const REPLY_KEY = 'reply_to';

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
});

async function openT013(page: Page) {
  await page.goto(T013_URL);
  await dismissGuidelineModal(page);
  await expect(rowsOf(page)).toHaveCount(5);
}

/* Per-turn reply_to value used by patched fixtures; MISSING deletes the key. */
const MISSING = Symbol('missing');
type ReplyValue = string | number | null | typeof MISSING;
type CfgReply = string | null | 'omit';

/* Rewrites T013's dialogue_fields.reply_to and every turn's reply_to value
 * before the pages read the profile. Turn objects keep their own other
 * sub-fields (text / speaker / utt_id). */
async function patchReplies(page: Page, cfgReply: CfgReply, replies: ReplyValue[]) {
  const encoded = replies.map((r) => (r === MISSING ? { m: true } : { m: false, v: r }));
  await patchDataFile(
    page,
    'task-detail.data.js',
    `
    var p = window.LabelSuiteTaskDetailData.profiles.T013;
    var cfg = Object.assign({}, p.dialogue_fields);
    ${cfgReply === 'omit' ? `delete cfg.${REPLY_KEY};` : `cfg.${REPLY_KEY} = ${JSON.stringify(cfgReply)};`}
    p.dialogue_fields = cfg;
    var turns = p.datasetRecords[0].utterances;
    ${JSON.stringify(encoded)}.forEach(function (r, i) {
      if (r.m) delete turns[i].${REPLY_KEY}; else turns[i].${REPLY_KEY} = r.v;
    });
    `,
  );
}

/* Seed utt ids are 0..4 (task-detail.data.js T013 absa-001). */
const NO_REPLIES: ReplyValue[] = [null, null, null, null, null];

async function expectNoReplyMarkup(page: Page, rowIndexes: number[]) {
  for (const i of rowIndexes) {
    const row = rowsOf(page).nth(i);
    await expect(row, `row ${i} must not carry data-reply-to`).not.toHaveAttribute('data-reply-to', /.*/);
    await expect(row.getByTestId('dialogue-reply-tag'), `row ${i} must not show a tag`).toHaveCount(0);
  }
}

/* ---- 1. i18n strings (tasks 1.1) ------------------------------------ */
test.describe('issue #1378 B1: strings (tasks 1.1)', () => {
  test('zh and en define dialogueShowEntities / dialoguePlainText / dialogueReplyTag; tag has {n}', async ({ page }) => {
    await page.goto(T013_URL);
    const dict = await page.evaluate(() => {
      const i18n = (window as unknown as { TASK_CONFIG_I18N?: Record<string, Record<string, string>> }).TASK_CONFIG_I18N;
      const pick = (lang: string) => ({
        show: i18n?.[lang]?.dialogueShowEntities,
        plain: i18n?.[lang]?.dialoguePlainText,
        tag: i18n?.[lang]?.dialogueReplyTag,
      });
      return { hasDict: !!i18n, zh: pick('zh'), en: pick('en') };
    });
    expect(dict.hasDict, 'TASK_CONFIG_I18N must be reachable').toBe(true);
    for (const lang of ['zh', 'en'] as const) {
      for (const k of ['show', 'plain', 'tag'] as const) {
        expect(typeof dict[lang][k], `${lang}.${k} missing`).toBe('string');
        expect((dict[lang][k] ?? "").length, `${lang}.${k} empty`).toBeGreaterThan(0);
      }
      expect(dict[lang].tag ?? "", `${lang}.tag lacks {n}`).toContain('{n}');
    }
  });
});

/* ---- 2. T013 seed (tasks 2.1, AC-2.43) ------------------------------- */
test.describe('issue #1378 B1: T013 seed declares reply_to (AC-2.43, tasks 2.1)', () => {
  test('reply_to is non-null, at least one turn replies to the previous one, none to itself', async ({ page }) => {
    await page.goto(T013_URL);
    const seed = await page.evaluate(() => {
      const p = (window as unknown as {
        LabelSuiteTaskDetailData: {
          profiles: Record<string, { dialogue_fields: Record<string, string | null>; datasetRecords: Array<Record<string, unknown>> }>;
        };
      }).LabelSuiteTaskDetailData.profiles.T013;
      const cfg = p.dialogue_fields;
      const turns = p.datasetRecords[0].utterances as Array<Record<string, unknown>>;
      const ids = turns.map((t, i) => {
        const v = cfg.utt_id ? t[cfg.utt_id] : undefined;
        return v === undefined || v === null ? String(i + 1) : String(v);
      });
      const replyKey = cfg.reply_to;
      const replies = turns.map((t) => (replyKey && t[replyKey] !== undefined && t[replyKey] !== null ? String(t[replyKey]) : null));
      return { replyKey: replyKey ?? null, ids, replies };
    });
    expect(seed.replyKey, 'dialogue_fields.reply_to must be declared').not.toBeNull();
    const repliesPrevious = seed.replies.some((r, i) => i > 0 && r === seed.ids[i - 1]);
    expect(repliesPrevious, 'at least one turn replies to the previous turn').toBe(true);
    seed.replies.forEach((r, i) => {
      expect(r === seed.ids[i], `turn ${i} must not reply to itself`).toBe(false);
    });
  });

  test('the unpatched seed renders at least one reply row with a tag (AC-2.43 observable)', async ({ page }) => {
    await openT013(page);
    await expect(page.locator('[data-testid="dialogue-thread-row"][data-reply-to]').first()).toBeVisible();
    await expect(page.getByTestId('dialogue-reply-tag').first()).toBeVisible();
  });
});

/* ---- 3. layout and reply (tasks 3.1, AC-2.39 ~ AC-2.41) -------------- */
test.describe('issue #1378 B1: avatar and header (AC-2.39, tasks 3.1)', () => {
  test('every row shows an avatar holding the first character of its speaker', async ({ page }) => {
    await openT013(page);
    for (let i = 0; i < 5; i += 1) {
      const row = rowsOf(page).nth(i);
      const speaker = (await row.getByTestId('dialogue-speaker').innerText()).trim();
      const avatar = row.getByTestId('dialogue-avatar');
      await expect(avatar).toHaveCount(1);
      await expect(avatar).toHaveText(Array.from(speaker)[0]);
    }
  });

  test('turns by the same speaker share one avatar color (--avatar-hue and computed background)', async ({ page }) => {
    await openT013(page);
    const info = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('[data-testid="dialogue-thread-row"]'));
      return rows.map((r) => {
        const av = r.querySelector('[data-testid="dialogue-avatar"]') as HTMLElement | null;
        const sp = r.querySelector('[data-testid="dialogue-speaker"]');
        return {
          speaker: sp ? (sp.textContent || '').trim() : '',
          hue: av ? av.style.getPropertyValue('--avatar-hue') || getComputedStyle(av).getPropertyValue('--avatar-hue') : null,
          bg: av ? getComputedStyle(av).backgroundColor : null,
        };
      });
    });
    const bySpeaker = new Map<string, typeof info>();
    info.forEach((x) => bySpeaker.set(x.speaker, [...(bySpeaker.get(x.speaker) || []), x]));
    const repeated = Array.from(bySpeaker.values()).filter((g) => g.length > 1);
    expect(repeated.length, 'T013 has a speaker with several turns').toBeGreaterThan(0);
    info.forEach((x) => {
      expect(x.bg, 'avatar must exist and have a background').not.toBeNull();
      expect(x.bg).not.toBe('rgba(0, 0, 0, 0)');
    });
    repeated.forEach((g) => {
      expect(new Set(g.map((x) => (x.hue ?? "").trim())).size, 'same speaker, same --avatar-hue').toBe(1);
      expect(new Set(g.map((x) => x.bg)).size, 'same speaker, same background').toBe(1);
    });
  });

  test('speaker null -> no avatar on any row', async ({ page }) => {
    await patchDataFile(
      page,
      'task-detail.data.js',
      `window.LabelSuiteTaskDetailData.profiles.T013.dialogue_fields = Object.assign({}, window.LabelSuiteTaskDetailData.profiles.T013.dialogue_fields, { speaker: null });`,
    );
    await openT013(page);
    await expect(page.getByTestId('dialogue-avatar')).toHaveCount(0);
    await expect(page.getByTestId('dialogue-speaker')).toHaveCount(0);
  });

  test('task-new Step 1 preview (renderDialogueThread without rich) shows no avatar and no reply tag', async ({ page }) => {
    await page.goto('/pages/task-management/task-new.html', { waitUntil: 'load' });
    const counts = await page.evaluate(
      ({ replyKey }) => {
        const w = window as unknown as {
          renderDialogueThread: (c: HTMLElement, t: unknown[], cfg: unknown, o?: unknown) => void;
        };
        const host = document.createElement('div');
        document.body.appendChild(host);
        w.renderDialogueThread(
          host,
          [
            { text: 'a', speaker: 'Amy', uid: 1, [replyKey]: null },
            { text: 'b', speaker: 'Bob', uid: 2, [replyKey]: 1 },
          ],
          { text: 'text', speaker: 'speaker', utt_id: 'uid', reply_to: replyKey },
        );
        return {
          rows: host.querySelectorAll('[data-testid="dialogue-thread-row"]').length,
          avatars: host.querySelectorAll('[data-testid="dialogue-avatar"]').length,
          tags: host.querySelectorAll('[data-testid="dialogue-reply-tag"]').length,
          replyAttr: host.querySelectorAll('[data-reply-to]').length,
        };
      },
      { replyKey: REPLY_KEY },
    );
    expect(counts.rows).toBe(2);
    expect(counts.avatars).toBe(0);
    expect(counts.tags).toBe(0);
    expect(counts.replyAttr).toBe(0);
  });
});

test.describe('issue #1378 B1: valid reply_to (AC-2.40, tasks 3.1)', () => {
  test('valid reply rows carry data-reply-to and a tag naming the replied #n; others have none', async ({ page }) => {
    // utt ids 0..4: turn1 -> 0, turn2 -> 1 valid; turn0 null, turn3 -> 99 (unknown), turn4 -> 4 (self)
    await patchReplies(page, REPLY_KEY, [null, 0, 1, 99, 4]);
    await openT013(page);

    await expect(rowsOf(page).nth(1)).toHaveAttribute('data-reply-to', '0');
    await expect(rowsOf(page).nth(2)).toHaveAttribute('data-reply-to', '1');
    const tag1 = rowsOf(page).nth(1).getByTestId('dialogue-reply-tag');
    const tag2 = rowsOf(page).nth(2).getByTestId('dialogue-reply-tag');
    await expect(tag1).toHaveCount(1);
    await expect(tag1).toContainText('#0');
    await expect(tag1).not.toContainText('{n}');
    await expect(tag2).toContainText('#1');
    await expectNoReplyMarkup(page, [0, 3, 4]);
  });

  test('reply is matched by value as a string (numeric reply_to against string utt id)', async ({ page }) => {
    await patchReplies(page, REPLY_KEY, [null, '0', null, null, null]);
    await openT013(page);
    await expect(rowsOf(page).nth(1)).toHaveAttribute('data-reply-to', '0');
    await expectNoReplyMarkup(page, [0, 2, 3, 4]);
  });
});

test.describe('issue #1378 B1: invalid reply_to shows nothing (AC-2.41, tasks 3.1)', () => {
  test('reply_to pointing at the turn itself -> no data-reply-to, no tag', async ({ page }) => {
    // every turn cites its own utt id (0..4)
    await patchReplies(page, REPLY_KEY, [0, 1, 2, 3, 4]);
    await openT013(page);
    await expectNoReplyMarkup(page, [0, 1, 2, 3, 4]);
  });

  test('reply_to pointing at a non-existent turn -> no data-reply-to, no tag', async ({ page }) => {
    await patchReplies(page, REPLY_KEY, [null, 99, 'ghost', 5, -1]);
    await openT013(page);
    await expectNoReplyMarkup(page, [0, 1, 2, 3, 4]);
  });

  test('reply_to value null or empty string on a turn -> no markup for that turn', async ({ page }) => {
    await patchReplies(page, REPLY_KEY, [null, '', null, '', null]);
    await openT013(page);
    await expectNoReplyMarkup(page, [0, 1, 2, 3, 4]);
  });

  test('reply_to key missing on the turns -> no markup', async ({ page }) => {
    await patchReplies(page, REPLY_KEY, [MISSING, MISSING, MISSING, MISSING, MISSING]);
    await openT013(page);
    await expectNoReplyMarkup(page, [0, 1, 2, 3, 4]);
  });

  test('one invalid turn does not affect a valid neighbour', async ({ page }) => {
    await patchReplies(page, REPLY_KEY, [null, 1, 0, null, null]); // turn1 self (invalid), turn2 -> 0 (valid)
    await openT013(page);
    await expectNoReplyMarkup(page, [0, 1, 3, 4]);
    await expect(rowsOf(page).nth(2)).toHaveAttribute('data-reply-to', '0');
  });

  test('dialogue_fields.reply_to null -> no markup even when turns carry a reply_to column', async ({ page }) => {
    await patchReplies(page, null, [null, 0, 1, 2, 3]);
    await openT013(page);
    await expectNoReplyMarkup(page, [0, 1, 2, 3, 4]);
  });

  test('dialogue_fields without a reply_to key -> no markup (treated as null)', async ({ page }) => {
    await patchReplies(page, 'omit', [null, 0, 1, 2, 3]);
    await openT013(page);
    await expectNoReplyMarkup(page, [0, 1, 2, 3, 4]);
  });

  test('reply is never inferred from an @name in the text', async ({ page }) => {
    // seed turn 3 text starts with "@isbonny"; with no reply_to configured it must stay unmarked
    await patchReplies(page, 'omit', NO_REPLIES);
    await openT013(page);
    await expect(rowsOf(page).nth(3).getByTestId('dialogue-text')).toContainText('@isbonny');
    await expectNoReplyMarkup(page, [0, 1, 2, 3, 4]);
  });
});

/* ---- 4. entity / plain-text toggle (tasks 4.1, AC-2.42) --------------- */
async function previewEntities(page: Page): Promise<Array<Record<string, unknown>>> {
  return page.evaluate(
    () => JSON.parse(JSON.stringify((window as unknown as { state: { previewEntities: unknown[] } }).state.previewEntities)),
  );
}
async function markInRow(page: Page, type: string, row: number, text: string) {
  await page.getByRole('button', { name: type, exact: true }).click();
  await selectWorkspaceText(page, rowsOf(page).nth(row).getByTestId('dialogue-text'), text);
}
const highlights = (page: Page) => rowsOf(page).locator('.absa-span-highlight');
const viewEntities = (page: Page) => page.getByTestId('dialogue-view-entities');
const viewPlain = (page: Page) => page.getByTestId('dialogue-view-plain');

test.describe('issue #1378 B1: entities / plain text toggle (AC-2.42, tasks 4.1)', () => {
  test('defaults to "show entities": entities button pressed, plain button not', async ({ page }) => {
    await openT013(page);
    await expect(viewEntities(page)).toHaveAttribute('aria-pressed', 'true');
    await expect(viewPlain(page)).toHaveAttribute('aria-pressed', 'false');
  });

  test('plain text hides highlights, swaps aria-pressed, keeps entity data; switching back restores', async ({ page }) => {
    await openT013(page);
    await markInRow(page, 'Aspect', 0, '過熱問題');
    await expect(highlights(page).first()).toBeVisible();
    const before = await previewEntities(page);
    expect(before.length).toBeGreaterThan(0);

    await viewPlain(page).click();
    await expect(viewPlain(page)).toHaveAttribute('aria-pressed', 'true');
    await expect(viewEntities(page)).toHaveAttribute('aria-pressed', 'false');
    await expect(highlights(page)).toHaveCount(0);
    expect(await previewEntities(page)).toEqual(before);
    // the text itself is still fully rendered
    await expect(rowsOf(page).nth(0).getByTestId('dialogue-text')).toContainText('過熱問題嚴重');

    await viewEntities(page).click();
    await expect(viewEntities(page)).toHaveAttribute('aria-pressed', 'true');
    await expect(viewPlain(page)).toHaveAttribute('aria-pressed', 'false');
    await expect(highlights(page).first()).toBeVisible();
    expect(await previewEntities(page)).toEqual(before);
  });

  test('in plain-text mode a new entity can still be marked by highlighting', async ({ page }) => {
    await openT013(page);
    await viewPlain(page).click();
    await expect(viewPlain(page)).toHaveAttribute('aria-pressed', 'true');
    const before = (await previewEntities(page)).length;

    await markInRow(page, 'Opinion', 1, '唬爛');
    const after = await previewEntities(page);
    expect(after.length).toBe(before + 1);
    expect(after.some((e) => e.text === '唬爛')).toBe(true);
    await expect(highlights(page)).toHaveCount(0);

    await viewEntities(page).click();
    await expect(highlights(page).first()).toBeVisible();
  });
});

/* ---- 5. styling (tasks 5.1) ------------------------------------------ */
test.describe('issue #1378 B1: styling (AC-2.39, AC-2.40, tasks 5.1)', () => {
  test('avatar is a visible circle (border-radius 50%)', async ({ page }) => {
    await openT013(page);
    const avatar = rowsOf(page).nth(0).getByTestId('dialogue-avatar');
    await expect(avatar).toBeVisible();
    const radius = await avatar.evaluate((el) => getComputedStyle(el).borderRadius);
    expect(radius).toBe('50%');
    const box = await avatar.boundingBox();
    expect(box && box.width > 0 && box.height > 0, 'avatar has a size').toBe(true);
  });

  test('valid reply row is indented (margin-left > 0); a normal row has margin-left 0', async ({ page }) => {
    await patchReplies(page, REPLY_KEY, [null, 0, null, 99, 4]);
    await openT013(page);
    const margin = (i: number) =>
      rowsOf(page).nth(i).evaluate((el) => parseFloat(getComputedStyle(el).marginLeft));
    expect(await margin(1)).toBeGreaterThan(0);
    expect(await margin(0)).toBe(0);
    expect(await margin(2)).toBe(0);
    expect(await margin(3)).toBe(0); // unknown target
    expect(await margin(4)).toBe(0); // self reply
  });

  test('the utterance text sits on its own line below the header row', async ({ page }) => {
    await openT013(page);
    const row = rowsOf(page).nth(0);
    const header = await row.getByTestId('dialogue-speaker').boundingBox();
    const idBox = await row.getByTestId('dialogue-utt-id').boundingBox();
    const text = await row.getByTestId('dialogue-text').boundingBox();
    expect(header && idBox && text, 'header parts and text are rendered').toBeTruthy();
    expect(text!.y).toBeGreaterThan(header!.y);
    expect(text!.y).toBeGreaterThanOrEqual(header!.y + header!.height - 1);
    expect(text!.y).toBeGreaterThanOrEqual(idBox!.y + idBox!.height - 1);
  });
});
