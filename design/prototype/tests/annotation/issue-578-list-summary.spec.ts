import { test, expect, type Page } from '@playwright/test';
import { buildListUrl } from './_workspace-helpers';

/* FR-091 / AC-1.25: the annotation list carries a per-sample processing
 * summary -- last action, last activity time, accumulated lead time -- so a
 * viewer can read how far a sample has got without opening each workspace.
 *
 * All three are DERIVED from that sample's history events (FR-091 forbids a
 * second stored copy), which is why these specs seed the workspace
 * submission store directly, the same per-bucket keys the data layer writes
 * (issue #283), rather than driving the workspace UI. */

const ANNOTATOR = 'kioleemg12';
const ANNOTATOR_BUCKET = `T001::annotator::official_run::${ANNOTATOR}::-`;

const SUBMITTED_AT = '2026-08-29T02:00:00.000Z';
const REJECTED_AT = '2026-08-31T02:00:00.000Z';

/* 12s + 8s. The two instants are two days apart so the rendered dates differ
   under any plausible browser timezone -- the assertions below must be able
   to tell "the last event" from "the first event", not merely find a date. */
const SUBMIT_LEAD_MS = 12_000;
const REJECT_LEAD_MS = 8_000;
const TOTAL_LEAD_TEXT = '20s';

/* sent-001 has a submit followed by a reviewer reject; sent-003 is left
   untouched so it has no history at all -- the empty-state case AC-1.25
   requires to read as empty, never as a zero. */
function seedHistory(page: Page) {
  return page.addInitScript(
    ([key, bucketJson]) => {
      window.localStorage.setItem('labelsuite.wsSubmissions.' + key, bucketJson);
    },
    [
      ANNOTATOR_BUCKET,
      JSON.stringify({
        'sent-001': {
          status: 'pending',
          answers: {},
          history: [
            {
              action: 'submitted',
              role: 'annotator',
              actorId: ANNOTATOR,
              at: SUBMITTED_AT,
              summary: '',
              started_at: '2026-08-29T01:59:48.000Z',
              lead_time: SUBMIT_LEAD_MS,
            },
            {
              action: 'rejected',
              role: 'reviewer',
              actorId: 'reviewer-01',
              at: REJECTED_AT,
              summary: '',
              started_at: '2026-08-31T01:59:52.000Z',
              lead_time: REJECT_LEAD_MS,
            },
          ],
        },
      }),
    ]
  );
}

function rowFor(page: Page, sampleId: string) {
  return page.getByTestId('ws-sample-item').filter({ hasText: sampleId }).first();
}

test.describe('FR-091 標記清單處理狀況彙總 (issue #578)', () => {
  test('AC-1.25: the reviewer view shows last action, last activity and summed lead time', async ({ page }) => {
    await seedHistory(page);
    /* issue #596 (FR-093): sent-001's kioleemg12 unit -- the one seeded above
       -- belongs to reviewer_li, so any other reviewer's list no longer
       carries the row this case reads. */
    await page.goto(buildListUrl({
      task_id: 'T001', role: 'reviewer', run_type: 'official_run', reviewer_id: 'reviewer_li',
    }));

    const row = rowFor(page, 'sent-001');

    /* The reject is the newest event, so the summary must speak for it and
       not for the submit that came two days earlier. */
    const action = row.getByTestId('list-summary-last-action');
    await expect(action).toHaveAttribute('data-action', 'rejected');
    await expect(action).not.toBeEmpty();
    await expect(action).toHaveText('審核退回');

    const activity = row.getByTestId('list-summary-last-activity');
    /* The exact instant is asserted through the attribute; the visible text
       is only checked for shape, so the assertion does not break on the
       runner's timezone. */
    await expect(activity).toHaveAttribute('data-at', REJECTED_AT);
    await expect(activity).toHaveText(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);

    /* Summed across BOTH events -- a summary that showed only the latest
       event's duration would answer a different question. */
    await expect(row.getByTestId('list-summary-lead-time')).toHaveText(TOTAL_LEAD_TEXT);
  });

  test('AC-1.25: the annotator view keeps the two event-row fields and drops the lead time', async ({ page }) => {
    await seedHistory(page);
    await page.goto(buildListUrl({ task_id: 'T001', run_type: 'official_run' }));

    const row = rowFor(page, 'sent-001');
    await expect(row.getByTestId('list-summary-last-action')).toHaveAttribute('data-action', 'rejected');
    await expect(row.getByTestId('list-summary-last-activity')).toHaveAttribute('data-at', REJECTED_AT);

    /* FR-088 visibility: no annotator-facing presentation path may carry a
       duration, so the element must be absent rather than blanked. */
    await expect(row.getByTestId('list-summary-lead-time')).toHaveCount(0);
  });

  test('AC-1.25: a sample with no history reads as empty, not as zero', async ({ page }) => {
    await seedHistory(page);
    await page.goto(buildListUrl({ task_id: 'T001', role: 'reviewer', run_type: 'official_run' }));

    const row = rowFor(page, 'sent-003');
    for (const testId of ['list-summary-last-action', 'list-summary-last-activity', 'list-summary-lead-time']) {
      const cell = row.getByTestId(testId);
      await expect(cell).toHaveAttribute('data-empty', 'true');
      /* A 0s or a 1970 date would each be a false statement about a sample
         nobody has touched. */
      await expect(cell).not.toHaveText(/0s|1970/);
    }
  });
});
