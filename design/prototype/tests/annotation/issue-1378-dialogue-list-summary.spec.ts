import { test, expect } from '../fixtures';
import type { Page } from '@playwright/test';
import { buildListUrl, buildWorkspaceUrl, patchDataFile, skipGuidelineModal } from './_workspace-helpers';

/* issue #1378 PR-B2 (OpenSpec change annotation-dialogue-list-summary, RED,
 * tasks.md 1.1 + 2.1): FR-106 clause 6. A dialogue-shaped summary (object
 * array whose dialogue_fields.text sub-fields are strings) gains a speaker
 * prefix "{speaker}：{text}" (en "{speaker}: {text}") when
 * dialogue_fields.speaker is non-null and the first speaker is a non-empty
 * string; a sibling helper getRecordSummaryTags(record, fieldRoleMap,
 * listTitleField, lang, dialogueFields) (same signature as
 * getRecordSummaryText) returns ["{n} 則發言", "{m} 位發言者"] (en
 * "{n} turns", "{m} speakers"). The workspace left rail renders one
 * data-testid="ws-summary-tag" span per tag beside the summary in all three
 * places; annotation-list gets the prefix but no tags. Search text
 * (getRecordSearchText) never contains the prefix or the tags (AC-1.41).
 *
 * Seed facts (task-detail.data.js T013 absa-001): 5 utterances, speakers
 * rottenrockteahouse / 張峯獎-f6w / isbonny / rottenrockteahouse /
 * rottenrockteahouse -> 3 distinct speakers.
 *
 * Reviewer / exception-pool surfaces: T014 / T016 have no dialogue seed, so
 * those tests add a dialogue-shaped Input `thread` through patchDataFile
 * (the same route-level technique as issue-1339) and set dialogue_fields.
 *
 * Traceability: specs/annotation/015-annotation-workspace/spec.md (openspec
 * delta) FR-106 clause 6, AC-1.35, AC-1.39, AC-1.40, AC-1.41, SC-028. */

const T013_URL = buildWorkspaceUrl({ task_id: 'T013', sample_id: 'absa-001' });
const FIRST_SPEAKER = 'rottenrockteahouse';
const FIRST_TEXT = '我入手Note 10 plus第三天就退廠保修 過熱問題嚴重！差評';
const FIELDS = { text: 'text', speaker: 'speaker' };
const ROLES = { utterances: 'input', gold: 'output' };

const norm = (s: string | null | undefined) => (s || '').replace(/\s+/g, ' ').trim();

type Helpers = {
  getRecordSummaryText: (...a: unknown[]) => string;
  getRecordSummaryTags: (...a: unknown[]) => string[];
  getRecordSearchText: (...a: unknown[]) => string;
};

async function call<T>(page: Page, fn: keyof Helpers, args: unknown[]): Promise<T> {
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

/* The real T013 absa-001 record and its dialogue_fields, read from the seed. */
async function t013Seed(page: Page) {
  await page.goto(T013_URL);
  return page.evaluate(() => {
    const p = (window as unknown as {
      LabelSuiteTaskDetailData: { profiles: Record<string, { datasetRecords: { id: string }[]; fieldRoleMap: unknown; dialogue_fields: unknown }> };
    }).LabelSuiteTaskDetailData.profiles.T013;
    return { record: p.datasetRecords[0], roles: p.fieldRoleMap, fields: p.dialogue_fields };
  });
}

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
});

test.describe('issue #1378: data layer prefix and tags (FR-106 clause 6, tasks 1.1)', () => {
  test('AC-1.39 T013 absa-001 summary is "{speaker}：{text}" (zh) and "{speaker}: {text}" (en)', async ({ page }) => {
    const { record, roles, fields } = await t013Seed(page);
    const zh = await call<string>(page, 'getRecordSummaryText', [record, roles, null, 'zh', fields]);
    expect(norm(zh)).toBe(`${FIRST_SPEAKER}：${FIRST_TEXT}`);
    const en = await call<string>(page, 'getRecordSummaryText', [record, roles, null, 'en', fields]);
    expect(norm(en)).toBe(`${FIRST_SPEAKER}: ${FIRST_TEXT}`);
  });

  test('AC-1.39 T013 absa-001 tags are turn count then distinct speaker count (zh and en)', async ({ page }) => {
    const { record, roles, fields } = await t013Seed(page);
    expect(await call<string[]>(page, 'getRecordSummaryTags', [record, roles, null, 'zh', fields])).toEqual(['5 則發言', '3 位發言者']);
    expect(await call<string[]>(page, 'getRecordSummaryTags', [record, roles, null, 'en', fields])).toEqual(['5 turns', '3 speakers']);
  });

  test('AC-1.40 dialogue_fields null on an object array: "{n} 筆資料", no prefix, no tags', async ({ page }) => {
    const rec = { id: 'r', utterances: [{ text: 'T1', speaker: 'a' }, { text: 'T2', speaker: 'b' }] };
    expect(await call<string>(page, 'getRecordSummaryText', [rec, ROLES, null, 'zh', null])).toBe('2 筆資料');
    expect(await call<string[]>(page, 'getRecordSummaryTags', [rec, ROLES, null, 'zh', null])).toEqual([]);
    expect(await call<string[]>(page, 'getRecordSummaryTags', [rec, ROLES, null, 'en', null])).toEqual([]);
  });

  test('AC-1.40 dialogue_fields.speaker null: no prefix, only the turn-count tag', async ({ page }) => {
    const rec = { id: 'r', utterances: [{ text: 'T1', speaker: 'a' }, { text: 'T2', speaker: 'b' }] };
    const fields = { text: 'text', speaker: null };
    expect(await call<string>(page, 'getRecordSummaryText', [rec, ROLES, null, 'zh', fields])).toBe('T1');
    expect(await call<string[]>(page, 'getRecordSummaryTags', [rec, ROLES, null, 'zh', fields])).toEqual(['2 則發言']);
    expect(await call<string[]>(page, 'getRecordSummaryTags', [rec, ROLES, null, 'en', fields])).toEqual(['2 turns']);
  });

  test('AC-1.40 dialogue_fields without a speaker key behaves like speaker null', async ({ page }) => {
    const rec = { id: 'r', utterances: [{ text: 'T1', speaker: 'a' }] };
    expect(await call<string>(page, 'getRecordSummaryText', [rec, ROLES, null, 'zh', { text: 'text' }])).toBe('T1');
    expect(await call<string[]>(page, 'getRecordSummaryTags', [rec, ROLES, null, 'zh', { text: 'text' }])).toEqual(['1 則發言']);
  });

  test('AC-1.40 first speaker is an empty string: no prefix', async ({ page }) => {
    const rec = { id: 'r', utterances: [{ text: 'T1', speaker: '' }, { text: 'T2', speaker: 'b' }] };
    expect(await call<string>(page, 'getRecordSummaryText', [rec, ROLES, null, 'zh', FIELDS])).toBe('T1');
  });

  test('AC-1.39 speaker count ignores empty speakers and duplicates', async ({ page }) => {
    const rec = {
      id: 'r',
      utterances: [{ text: 'T1', speaker: 'a' }, { text: 'T2', speaker: '' }, { text: 'T3', speaker: 'a' }, { text: 'T4', speaker: 'b' }],
    };
    expect(await call<string[]>(page, 'getRecordSummaryTags', [rec, ROLES, null, 'zh', FIELDS])).toEqual(['4 則發言', '2 位發言者']);
  });

  test('AC-1.40 speaker sub-field name comes from dialogue_fields, not a hardcoded "speaker"', async ({ page }) => {
    const rec = { id: 'r', utterances: [{ who: 'WHO1', body: 'B1', speaker: 'DECOY' }, { who: 'WHO2', body: 'B2', speaker: 'DECOY' }] };
    const fields = { text: 'body', speaker: 'who' };
    expect(await call<string>(page, 'getRecordSummaryText', [rec, ROLES, null, 'zh', fields])).toBe('WHO1：B1');
    expect(await call<string[]>(page, 'getRecordSummaryTags', [rec, ROLES, null, 'zh', fields])).toEqual(['2 則發言', '2 位發言者']);
  });

  test('AC-1.40 non-dialogue summaries (plain string / empty) get no tags', async ({ page }) => {
    const rec = { id: 'r', utterances: 'just a string' };
    expect(await call<string>(page, 'getRecordSummaryText', [rec, ROLES, null, 'zh', FIELDS])).toBe('just a string');
    expect(await call<string[]>(page, 'getRecordSummaryTags', [rec, ROLES, null, 'zh', FIELDS])).toEqual([]);
    expect(await call<string[]>(page, 'getRecordSummaryTags', [{ id: 'r', utterances: [] }, ROLES, null, 'zh', FIELDS])).toEqual([]);
    expect(await call<string[]>(page, 'getRecordSummaryTags', [null, ROLES, null, 'zh', FIELDS])).toEqual([]);
  });

  test('AC-1.41 search text carries neither the prefix nor the tags', async ({ page }) => {
    const { record, roles, fields } = await t013Seed(page);
    const search = await call<string>(page, 'getRecordSearchText', [record, roles, 'zh', fields]);
    expect(search).toContain('唬爛');
    expect(search).not.toContain(`${FIRST_SPEAKER}：`);
    expect(search).not.toContain(`${FIRST_SPEAKER}:`);
    expect(search).not.toContain('則發言');
    expect(search).not.toContain('位發言者');
  });

  test('AC-1.41 Output fields never reach the prefix or the tags', async ({ page }) => {
    const rec = {
      id: 'r',
      gold: [{ text: 'OUTTEXT', speaker: 'OUTSPEAKER' }, { text: 'OUTTEXT2', speaker: 'OUTSPEAKER2' }, { text: 'OUTTEXT3', speaker: 'OUTSPEAKER3' }],
      utterances: [{ text: 'IN1', speaker: 'a' }],
    };
    const rolesOutFirst = { gold: 'output', utterances: 'input' };
    const summary = await call<string>(page, 'getRecordSummaryText', [rec, rolesOutFirst, 'gold', 'zh', FIELDS]);
    const tags = await call<string[]>(page, 'getRecordSummaryTags', [rec, rolesOutFirst, 'gold', 'zh', FIELDS]);
    expect(summary).toBe('a：IN1');
    expect(tags).toEqual(['1 則發言', '1 位發言者']);
    expect(JSON.stringify([summary, tags])).not.toContain('OUT');
    // An Output-only dialogue yields neither a summary prefix nor tags.
    const onlyOut = { id: 'r2', gold: rec.gold };
    expect(await call<string[]>(page, 'getRecordSummaryTags', [onlyOut, { gold: 'output' }, 'gold', 'zh', FIELDS])).toEqual([]);
    expect(await call<string>(page, 'getRecordSummaryText', [onlyOut, { gold: 'output' }, 'gold', 'zh', FIELDS])).not.toContain('OUT');
  });
});

/* ---- pages (tasks 2.1) ----------------------------------------------- */

/* Adds a dialogue-shaped Input `thread` (2 turns, 2 speakers) to a task and
 * turns the single-text field `text` off, so the left rail summary comes from
 * the dialogue; dialogue_fields names text + speaker. */
function threadPatch(taskId: string): string {
  return `
    var p = window.LabelSuiteTaskDetailData.profiles[${JSON.stringify(taskId)}];
    p.fieldRoleMap.thread = 'input';
    p.fieldRoleMap.text = 'unused';
    p.dialogue_fields = { text: 'text', speaker: 'speaker' };
    p.datasetRecords.forEach(function (r) {
      r.thread = [
        { speaker: 'SPK-A', text: 'THREAD-' + r.id },
        { speaker: 'SPK-B', text: 'second turn' }
      ];
    });
  `;
}

const T014_REVIEWER_URL = buildWorkspaceUrl({ task_id: 'T014', sample_id: 'dry-01-all-agree', role: 'reviewer', run_type: 'dry_run' });
const T016_POOL_URL =
  '/pages/annotation/annotation-workspace.html?task_id=T016&sample_id=ofm-05-final-exception&role=project_leader&run_type=official_run&annotator_id=kioleemg12';

test.describe('issue #1378: left rail renders prefix and ws-summary-tag (FR-106 clause 6, tasks 2.1)', () => {
  test('AC-1.39 annotator item: prefixed .sample-snippet with two tags beside it (zh)', async ({ page }) => {
    await page.goto(T013_URL);
    const item = page.getByTestId('ws-sample-item').first();
    await expect(item).toBeVisible();
    expect(norm(await item.locator('.sample-snippet').textContent())).toBe(`${FIRST_SPEAKER}：${FIRST_TEXT}`);
    const tags = item.getByTestId('ws-summary-tag');
    await expect(tags).toHaveCount(2);
    await expect(tags.nth(0)).toHaveText('5 則發言');
    await expect(tags.nth(1)).toHaveText('3 位發言者');
  });

  test('AC-1.39 annotator item in English: ": " prefix and "5 turns" / "3 speakers"', async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem('labelsuite.lang', 'en'));
    await page.goto(T013_URL);
    const item = page.getByTestId('ws-sample-item').first();
    await expect(item).toBeVisible();
    expect(norm(await item.locator('.sample-snippet').textContent())).toBe(`${FIRST_SPEAKER}: ${FIRST_TEXT}`);
    const tags = item.getByTestId('ws-summary-tag');
    await expect(tags).toHaveCount(2);
    await expect(tags.nth(0)).toHaveText('5 turns');
    await expect(tags.nth(1)).toHaveText('3 speakers');
  });

  test('AC-1.40 dialogue_fields null: annotator item has "5 筆資料" and no tags', async ({ page }) => {
    await patchDataFile(page, 'task-detail.data.js', 'window.LabelSuiteTaskDetailData.profiles.T013.dialogue_fields = null;');
    await page.goto(T013_URL);
    const item = page.getByTestId('ws-sample-item').first();
    await expect(item).toBeVisible();
    expect(norm(await item.locator('.sample-snippet').textContent())).toBe('5 筆資料');
    await expect(item.getByTestId('ws-summary-tag')).toHaveCount(0);
  });

  test('AC-1.40 dialogue_fields.speaker null: no prefix, only the turn-count tag', async ({ page }) => {
    await patchDataFile(
      page,
      'task-detail.data.js',
      "window.LabelSuiteTaskDetailData.profiles.T013.dialogue_fields = { text: 'text', speaker: null, utt_id: 'utt_id', reply_to: 'reply_to' };",
    );
    await page.goto(T013_URL);
    const item = page.getByTestId('ws-sample-item').first();
    await expect(item).toBeVisible();
    expect(norm(await item.locator('.sample-snippet').textContent())).toBe(FIRST_TEXT);
    const tags = item.getByTestId('ws-summary-tag');
    await expect(tags).toHaveCount(1);
    await expect(tags.first()).toHaveText('5 則發言');
  });

  test('AC-1.39 reviewer group header: prefixed snippet with tags beside it', async ({ page }) => {
    await patchDataFile(page, 'task-detail.data.js', threadPatch('T014'));
    await page.goto(T014_REVIEWER_URL);
    const group = page.getByTestId('ws-sample-group').first();
    await expect(group).toBeVisible();
    expect(norm(await group.getByTestId('ws-sample-group-snippet').textContent())).toBe('SPK-A：THREAD-dry-01-all-agree');
    const tags = group.getByTestId('ws-summary-tag');
    await expect(tags).toHaveCount(2);
    await expect(tags.nth(0)).toHaveText('2 則發言');
    await expect(tags.nth(1)).toHaveText('2 位發言者');
  });

  test('AC-1.39 exception-pool group header: prefixed snippet with tags beside it', async ({ page }) => {
    await patchDataFile(page, 'task-detail.data.js', threadPatch('T016'));
    await page.goto(T016_POOL_URL);
    const group = page.getByTestId('ws-exception-sample-group').first();
    await expect(group).toBeVisible();
    expect(norm(await group.getByTestId('ws-exception-sample-group-snippet').textContent())).toBe('SPK-A：THREAD-ofm-05-final-exception');
    const tags = group.getByTestId('ws-summary-tag');
    await expect(tags).toHaveCount(2);
    await expect(tags.nth(0)).toHaveText('2 則發言');
    await expect(tags.nth(1)).toHaveText('2 位發言者');
  });

  test('AC-1.40 non-dialogue tasks (T014 reviewer, seed) show no tags', async ({ page }) => {
    await page.goto(T014_REVIEWER_URL);
    await expect(page.getByTestId('ws-sample-group').first()).toBeVisible();
    await expect(page.getByTestId('ws-summary-tag')).toHaveCount(0);
  });
});

test.describe('issue #1378: annotation-list summary is prefixed but has no tags (AC-1.39, SC-028)', () => {
  test('T013 list row shows the speaker prefix and the page has no ws-summary-tag', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: 'T013' }));
    const row = page.getByTestId('ws-sample-item').filter({ hasText: 'absa-001' });
    await expect(row).toBeVisible();
    expect(norm(await row.locator('.text-snippet-content').textContent())).toBe(`${FIRST_SPEAKER}：${FIRST_TEXT}`);
    await expect(page.getByTestId('ws-summary-tag')).toHaveCount(0);
  });

  test('list summary equals the workspace left rail summary (SC-028)', async ({ page }) => {
    await page.goto(T013_URL);
    const item = page.getByTestId('ws-sample-item').first();
    await expect(item).toBeVisible();
    const rail = norm(await item.locator('.sample-snippet').textContent());
    await page.goto(buildListUrl({ task_id: 'T013' }));
    const row = page.getByTestId('ws-sample-item').filter({ hasText: 'absa-001' });
    await expect(row).toBeVisible();
    const list = norm(await row.locator('.text-snippet-content').textContent());
    expect(list).toBe(rail);
    expect(list.startsWith(`${FIRST_SPEAKER}：`)).toBe(true);
  });
});
