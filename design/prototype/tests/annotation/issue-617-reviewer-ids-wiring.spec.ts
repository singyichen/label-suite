import { test, expect } from '@playwright/test';
import { buildListUrl } from './_workspace-helpers';

/* issue #617 (FR-093, spec 015): getAssignedReviewUnits() derived assignment
 * from the hardcoded REVIEWER_ROSTER demo seed only, so any reviewer outside
 * that four-person roster was assigned zero units no matter what the task's
 * own `reviewer_ids` said. T015 (review-flow demo, single reviewer) sets
 * `reviewerIds: ['mandy@labelsuite.io', 'kevin.liu@labelsuite.io',
 * 'rachel.wu@labelsuite.io']` -- none of which appear in REVIEWER_ROSTER --
 * so it is a direct fixture for the bug without needing a synthetic patch.
 */

const TASK = 'T015';
const TASK_REVIEWER_IDS = ['mandy@labelsuite.io', 'kevin.liu@labelsuite.io', 'rachel.wu@labelsuite.io'];
/* T015 seeds 5 dataset records, but `ofs-05-not-submitted` has no annotator
 * submission yet, so only 4 become review units. */
const TOTAL_REVIEW_UNITS = 4;

async function visibleUnits(page: import('@playwright/test').Page): Promise<string[]> {
  return page.getByTestId('ws-sample-item').evaluateAll((rows) =>
    rows.map((row) => {
      const id = row.querySelector('[data-testid="list-review-id"]');
      const annotator = row.querySelector('[data-testid="list-review-annotator"]');
      return `${(id?.textContent || '').trim()}/${(annotator?.textContent || '').trim()}`;
    })
  );
}

test.describe('issue #617 審核指派改讀任務自身 reviewer_ids', () => {
  test('任務自訂審核名冊內的審核員各自看得到指派單位，且合計等於全部審核單位、彼此無交集', async ({ page }) => {
    const seen = new Map<string, string[]>();
    for (const reviewerId of TASK_REVIEWER_IDS) {
      await page.goto(buildListUrl({ task_id: TASK, role: 'reviewer', run_type: 'official_run', reviewer_id: reviewerId }));
      seen.set(reviewerId, await visibleUnits(page));
    }

    TASK_REVIEWER_IDS.forEach((reviewerId) => {
      expect(seen.get(reviewerId)!.length).toBeGreaterThan(0);
    });

    const all = TASK_REVIEWER_IDS.flatMap((reviewerId) => seen.get(reviewerId)!);
    expect(all).toHaveLength(TOTAL_REVIEW_UNITS);
    expect(new Set(all).size).toBe(TOTAL_REVIEW_UNITS);
  });

  test('不在任務 reviewer_ids 內、也不在 demo 名冊內的審核員看不到任何單位', async ({ page }) => {
    await page.goto(buildListUrl({
      task_id: TASK, role: 'reviewer', run_type: 'official_run', reviewer_id: 'outsider@labelsuite.io',
    }));

    expect(await visibleUnits(page)).toEqual([]);
  });
});
