import { test, expect, type Page } from '@playwright/test';
import { buildListUrl } from './_workspace-helpers';

/* issue #627 item 7 (RED) — the reviewer summary must stop rendering
 * 「未達定稿門檻 {n} 個」.
 *
 * Under the single-owner relay model REVIEW_UNIT_STATUS holds only
 * `pending` / `disputed` / `finalized` (spec 015:58), so `counts.approved`
 * and `counts.modified` are permanently 0 and computeReviewSummary()'s
 *   unfinalized: total - counts.finalized          (data.js :2851)
 * is an IDENTITY with `pending + disputed`, not an independent dimension.
 * Printing all three side by side --「任務覆蓋 5 / 5 個審核單位 ·
 * 未達定稿門檻 3 個 · 爭議中 3 個」-- invites the reader to add them up.
 * 「門檻」 also lost its referent when MIN_REVIEWERS_DEFAULT was retired
 * (015:63).
 *
 * This is not a requirement removal. Canonical AC-1.24 (015:167) already
 * dropped the clause in v5.0.0 with the note 「原含 `未達定稿門檻 4 個` 一
 * 項，該計數隨 `approved`／`modified` 中間狀態移除而失效」; FR-076 point 1
 * (015:870) was simply missed in the same version. The prototype has been
 * rendering a clause AC-1.24 no longer asks for -- removing it returns to
 * the canon. Maintainer adjudication: issue #627, 2026-09-18.
 *
 * --- Decided Red contract (Green is wrong if it disagrees, not this file) ---
 *   1. The clause disappears from BOTH languages of the formatted summary.
 *      Every other counter (待審 / 爭議中 / IAA) and the coverage lead keep
 *      their current wording and order.
 *   2. `summary.unfinalized` -- the FIELD -- must survive untouched.
 *      annotation-list.html :2009 tests `reviewSummary.unfinalized === 0`
 *      to decide whether a task is done for this reviewer; that is a
 *      non-display use, and FR-076 states 「本條僅規範顯示文字」. Deleting
 *      the computation instead of the clause would silently mark every
 *      task complete.
 *
 * Traceability: specs/annotation/015-annotation-workspace/spec.md FR-076
 *   point 1, AC-1.24; issue #627 item 7.
 */

type ReviewSummary = { total: number; pending: number; disputed: number; unfinalized: number };
type WorkspaceData = {
  computeReviewSummary: (taskId: string, runType: string) => ReviewSummary;
  formatReviewSummary: (summary: ReviewSummary, iaa?: number | null) => { zh: string; en: string };
};

/* T016: 5 / 5 coverage with 3 units still disputed -- the profile whose
   summary carries the clause in every language today. */
const TASK = 'T016';
/* The scenario is reviewer × official_run in every case below; naming it once
   keeps computeReviewSummary() and buildListUrl() from drifting apart. */
const ROLE = 'reviewer';
const RUN_TYPE = 'official_run';

function summaryOf(page: Page) {
  return page.evaluate(([taskId, runType]) => {
    const data = (window as unknown as { LabelSuiteAnnotationWorkspaceData: WorkspaceData })
      .LabelSuiteAnnotationWorkspaceData;
    const summary = data.computeReviewSummary(taskId, runType);
    return { summary, text: data.formatReviewSummary(summary, null) };
  }, [TASK, RUN_TYPE] as const);
}

test.describe('issue #627 item 7: 摘要不再渲染「未達定稿門檻」', () => {
  test('neither language renders the clause, and the rest of the line is unchanged', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: TASK, role: ROLE, run_type: RUN_TYPE }));
    const { text } = await summaryOf(page);

    expect(text.zh).not.toContain('未達定稿門檻');
    expect(text.en).not.toContain('short of finalize threshold');
    expect(text.zh).toBe('任務覆蓋 5 / 5 個審核單位 · 爭議中 3 個 · IAA 無法計算');
    expect(text.en).toBe('Task coverage 5 / 5 review units · 3 disputed · IAA Not computable');
  });

  test('the unfinalized FIELD survives — annotation-list reads it to decide completion', async ({ page }) => {
    /* Contract point 2. This is the boundary between 「刪文案」 and
       「刪計算式」: the field must still be derivable and still non-zero
       here, or annotation-list.html :2009 would read T016 as finished. */
    await page.goto(buildListUrl({ task_id: TASK, role: ROLE, run_type: RUN_TYPE }));
    const { summary } = await summaryOf(page);

    expect(summary.unfinalized).toBe(summary.pending + summary.disputed);
    expect(summary.unfinalized).toBeGreaterThan(0);
  });

  test('the rendered annotation-list task info drops the clause too', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: TASK, role: ROLE, run_type: RUN_TYPE }));

    const detail = page.locator('#taskInfoDetail');
    await expect(detail).toContainText('任務覆蓋 5 / 5 個審核單位');
    await expect(detail).toContainText('爭議中 3 個');
    await expect(detail).not.toContainText('未達定稿門檻');
  });
});
