import { test, expect, type Page } from '@playwright/test';
import { buildListUrl } from './_workspace-helpers';

/* issue #606: the list's 累計耗時 multiplies a reviewer's time by the number
 * of outputs they decided.
 *
 * FR-088 defines lead_time as the accumulated page-visible time for one open
 * session, and the workspace timer implements exactly that: readLeadTiming()
 * returns a running accumulator identified by the started_at stamped when the
 * sample was opened, and never resets on submit. One reviewer submit then
 * writes an envelope `submitted` event plus one decision event per outKey,
 * and the data layer copies that SAME timing object onto every one of them.
 * buildSampleSummary() sums the column, so a three-output task reports four
 * times the reviewer's real time.
 *
 * The fix has to survive the legitimate case that looks identical from the
 * outside: the same reviewer opening the same sample twice and submitting
 * each time. Those two sessions are genuinely additive, so "one entry per
 * actor" and "take the largest value" both produce a wrong number here --
 * which is why the tests below assert the double-submit total as strictly as
 * the multiplied one.
 */

const TASK = 'T001';
const SAMPLE = 'sent-001';
const ANNOTATOR = 'kioleemg12';
/* the reviewer FR-093 assigns this unit to, so the row survives task 4.7 */
const REVIEWER = 'reviewer_li';

const ANNOTATOR_BUCKET = `${TASK}::annotator::official_run::${ANNOTATOR}::-`;
const REVIEWER_BUCKET = `${TASK}::reviewer::official_run::${ANNOTATOR}::${REVIEWER}`;

type SeededEvent = {
  action: string;
  role: string;
  actorId: string;
  at: string;
  summary: string;
  started_at?: string | null;
  lead_time?: number;
};

function seed(page: Page, buckets: Array<[string, string, SeededEvent[]]>) {
  return page.addInitScript((entries) => {
    (entries as Array<[string, string, unknown[]]>).forEach(([key, status, history]) => {
      window.localStorage.setItem(
        'labelsuite.wsSubmissions.' + key,
        JSON.stringify({
          'sent-001': { status, submittedAt: '2026-08-31T09:00:00.000Z', answers: {}, history },
        })
      );
    });
  }, buckets);
}

/* the annotator's own session: 6s, always counted once, so every expected
   total below is 6s + whatever the reviewer legitimately spent */
const ANNOTATOR_EVENTS: SeededEvent[] = [
  {
    action: 'submitted',
    role: 'annotator',
    actorId: ANNOTATOR,
    at: '2026-08-31T09:10:00.000Z',
    summary: '',
    started_at: '2026-08-31T09:09:54.000Z',
    lead_time: 6_000,
  },
];

/* One reviewer submit over a three-output task: the envelope plus three
   decisions, all carrying the one timing object the data layer copied. */
function oneSubmit(startedAt: string, leadMs: number, at: string, actions: string[]): SeededEvent[] {
  return ['submitted', ...actions].map((action, idx) => ({
    action,
    role: 'reviewer',
    actorId: REVIEWER,
    at: `${at.slice(0, 19).replace(/:\d\d$/, ':' + String(10 + idx).padStart(2, '0'))}.000Z`,
    summary: '',
    started_at: startedAt,
    lead_time: leadMs,
  }));
}

function leadTime(page: Page) {
  return page
    .getByTestId('ws-sample-item')
    .filter({ hasText: SAMPLE })
    .filter({ hasText: ANNOTATOR })
    .first()
    .getByTestId('list-summary-lead-time');
}

async function openReviewerList(page: Page) {
  await page.goto(buildListUrl({
    task_id: TASK, role: 'reviewer', run_type: 'official_run', reviewer_id: REVIEWER,
  }));
}

test.describe('issue #606 累計耗時不得因逐項決策而重複累加', () => {
  test('一次送出寫入的信封與三筆決策事件只計一次工時', async ({ page }) => {
    await seed(page, [
      [ANNOTATOR_BUCKET, 'submitted', ANNOTATOR_EVENTS],
      [REVIEWER_BUCKET, 'submitted', oneSubmit(
        '2026-08-31T09:19:51.000Z', 9_000, '2026-08-31T09:20:00.000Z',
        ['accepted', 'modified', 'accepted'],
      )],
    ]);
    await openReviewerList(page);

    /* 6s annotator + 9s reviewer. Today the four reviewer rows each add
       their 9s, so this reads 42s -- the reviewer looks like they spent
       nearly four times as long as they did. */
    await expect(leadTime(page)).toHaveText('15s');
  });

  test('同一位審核員在同一樣本上分兩次送出，兩段工時必須相加', async ({ page }) => {
    await seed(page, [
      [ANNOTATOR_BUCKET, 'submitted', ANNOTATOR_EVENTS],
      [REVIEWER_BUCKET, 'submitted', [
        ...oneSubmit('2026-08-31T09:19:51.000Z', 9_000, '2026-08-31T09:20:00.000Z', ['accepted']),
        ...oneSubmit('2026-08-31T11:04:56.000Z', 4_000, '2026-08-31T11:05:00.000Z', ['modified']),
      ]],
    ]);
    await openReviewerList(page);

    /* 6s + 9s + 4s. The two reviewer sessions are separate openings of the
       same sample -- distinct started_at -- so they are genuinely additive.
       Any fix that dedupes per actor, or keeps only the largest value,
       reports 15s here and is wrong. */
    await expect(leadTime(page)).toHaveText('19s');
  });

  test('沒有 started_at 的舊事件各自獨立計時，不被誤併', async ({ page }) => {
    await seed(page, [
      [ANNOTATOR_BUCKET, 'submitted', [
        {
          action: 'submitted', role: 'annotator', actorId: ANNOTATOR,
          at: '2026-08-31T09:10:00.000Z', summary: '', lead_time: 5_000,
        },
      ]],
      [REVIEWER_BUCKET, 'submitted', [
        {
          action: 'accepted', role: 'reviewer', actorId: REVIEWER,
          at: '2026-08-31T09:20:00.000Z', summary: '', lead_time: 3_000,
        },
      ]],
    ]);
    await openReviewerList(page);

    /* Events written before FR-088 carry a duration but no session stamp.
       There is nothing to group them by, so each must keep counting on its
       own -- collapsing them would silently shrink historical totals. */
    await expect(leadTime(page)).toHaveText('8s');
  });
});
