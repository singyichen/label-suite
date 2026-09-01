/**
 * Reviewer summaries derive from live review-unit state (issue #450).
 * Source specs: specs/annotation/015-annotation-workspace/spec.md (FR-072),
 *               specs/dashboard/012-dashboard/spec.md (FR-020)
 *
 * Before this fix the annotation-list task info card and the dashboard
 * reviewer card both printed the pre-composed `detail` string from
 * dashboard.assignments.js, while the review-unit rows on the very same
 * page derived their state from localStorage. Finishing a review therefore
 * flipped the row to 已定稿 while the summary above it still promised
 * a stale pending count. (Issue #452 later renamed the rendered wording to
 * 任務覆蓋 x / n 個審核單位; the counters pinned here are unchanged.)
 *
 * The contract pinned here:
 *   - computeReviewSummary() is the ONLY place the counters are computed
 *     (pending / unfinalized / disputed / coverage), and both consumers
 *     read it.
 *   - coverage is share-of-units-past-待審, NOT a completion rate: T016
 *     sits at 5 / 5 coverage while still disclosing 未達定稿門檻 3 · 爭議中 1.
 *   - `derivable: false` reports "no unit has been reviewed yet" and is
 *     keyed on the presence of review-unit data, never on a task id.
 *     (Issue #501 later removed the consumer fallback it used to gate: a
 *     task nobody has reviewed has a summary the formula states truthfully,
 *     so the seeds stopped carrying a competing one. The flag itself still
 *     describes the state accurately and is pinned below.)
 */
import { test, expect, type Page } from '@playwright/test';
import { buildListUrl, buildWorkspaceUrl, skipGuidelineModal } from './_workspace-helpers';

type Summary = {
  total: number;
  pending: number;
  approved: number;
  modified: number;
  disputed: number;
  finalized: number;
  unfinalized: number;
  coveragePct: number;
  derivable: boolean;
};

type WorkspaceData = {
  computeReviewSummary: (taskId: string, runType: string) => Summary;
};

function readSummary(page: Page, taskId: string, runType: string): Promise<Summary> {
  return page.evaluate(
    (a) =>
      (window as unknown as { LabelSuiteAnnotationWorkspaceData: WorkspaceData })
        .LabelSuiteAnnotationWorkspaceData.computeReviewSummary(a.taskId, a.runType),
    { taskId, runType },
  );
}

/* The seeded review-state matrix (annotation-workspace.data.js
   seedReviewFlowDemo) expressed as counters. Every number here is
   reproducible from the per-row status comments in that seeder.
   issue #551 (v4.54.0) moved several T014/T015 rows between finalized and
   disputed (see seedReviewFlowDemo's per-row comments): T014's dry-02 and
   dry-03 "B" rows now converge at N=1 (finalized, +2 vs before), and
   dry-05's pure reject now blocks finalization instead of reading as
   agreement (disputed, -1 vs before) -- net +1 finalized / -1 disputed;
   T015's ofs-02 now converges at N=1 too (finalized, was disputed). */
const MATRIX = [
  {
    taskId: 'T014', runType: 'dry_run',
    expected: { total: 15, pending: 5, approved: 0, modified: 0, disputed: 1, finalized: 9, unfinalized: 6, coveragePct: 67, derivable: true },
  },
  {
    taskId: 'T015', runType: 'official_run',
    expected: { total: 4, pending: 1, approved: 0, modified: 0, disputed: 0, finalized: 3, unfinalized: 1, coveragePct: 75, derivable: true },
  },
  {
    taskId: 'T016', runType: 'official_run',
    expected: { total: 5, pending: 0, approved: 1, modified: 1, disputed: 1, finalized: 2, unfinalized: 3, coveragePct: 100, derivable: true },
  },
  {
    taskId: 'T017', runType: 'official_run',
    expected: { total: 5, pending: 1, approved: 1, modified: 1, disputed: 1, finalized: 1, unfinalized: 4, coveragePct: 80, derivable: true },
  },
] as const;

const T015_LIST_URL = buildListUrl({ task_id: 'T015', role: 'reviewer', run_type: 'official_run' });

test.describe('issue #450 -- the reviewer summary formula', () => {
  test('computeReviewSummary reproduces the seeded review-state matrix', async ({ page }) => {
    await page.goto(T015_LIST_URL);

    for (const row of MATRIX) {
      expect(await readSummary(page, row.taskId, row.runType), row.taskId).toEqual(row.expected);
    }
  });

  /* Generalization-First: the flag is keyed on "no unit reviewed yet", not
     on a task id list. T001 ships mock rows but no stored annotator
     submissions, so no unit of it has been reviewed. */
  test('a task without stored review-unit state reports derivable: false', async ({ page }) => {
    await page.goto(T015_LIST_URL);

    const summary = await readSummary(page, 'T001', 'official_run');
    expect(summary.derivable).toBe(false);
    expect(summary.total).toBe(15);
  });

  test('coverage is share-of-units-past-待審, so 100% never implies finished', async ({ page }) => {
    await page.goto(T015_LIST_URL);

    const summary = await readSummary(page, 'T016', 'official_run');
    expect(summary.coveragePct).toBe(100);
    expect(summary.pending).toBe(0);
    expect(summary.unfinalized).toBeGreaterThan(0);
    expect(summary.disputed).toBeGreaterThan(0);
  });
});

test.describe('issue #450 -- annotation-list task info card', () => {
  test('T016 discloses 未定稿 and 爭議 at 100% coverage and is not badged as completed', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: 'T016', role: 'reviewer', run_type: 'official_run' }));

    await expect(page.locator('#taskInfoDetail')).toContainText(
      '任務覆蓋 5 / 5 個審核單位 · 未達定稿門檻 3 個 · 爭議中 1 個 · IAA 無法計算',
    );
    await expect(page.locator('#taskInfoStatus')).not.toHaveText('已完成');
  });

  test('T015 drops its pending count once the last 待審 unit is submitted', async ({ page }) => {
    await skipGuidelineModal(page);
    await page.goto(T015_LIST_URL);
    await expect(page.locator('#taskInfoDetail')).toContainText('任務覆蓋 3 / 4 個審核單位 · 待審 1 個');

    await page.goto(buildWorkspaceUrl({
      task_id: 'T015', sample_id: 'ofs-04-pending-review', role: 'reviewer', run_type: 'official_run',
    }));
    await page.getByTestId('ws-review-row-approve').click();
    await page.getByTestId('ws-review-submit-btn').click();
    await expect(page.locator('#toastMsg')).toHaveText('審核已送出');

    await page.goto(T015_LIST_URL);
    const detail = page.locator('#taskInfoDetail');
    await expect(detail).not.toContainText('待審');
    /* issue #551: this agreeing review both finalizes ofs-04 (N=1) AND, by
       the time this test runs, ofs-02 has already converged at N=1 too (see
       annotation-review-flow-demo-seed.spec.ts) -- so all 4 units are now
       finalized and neither 未達定稿門檻 nor 爭議中 has anything to report
       (formatReviewSummary only appends a clause when its count is > 0).
       This used to read '未達定稿門檻 1 個 · 爭議中 1 個' back when ofs-02
       stayed disputed at N=1. */
    await expect(detail).toContainText('任務覆蓋 4 / 4 個審核單位 · IAA 無法計算');
    await expect(detail).not.toContainText('未達定稿門檻');
    await expect(detail).not.toContainText('爭議中');

    // Reload: the derived numbers must be stable, not a one-shot render.
    await page.reload();
    await expect(page.locator('#taskInfoDetail')).toContainText('任務覆蓋 4 / 4 個審核單位 · IAA 無法計算');
  });
});

test.describe('issue #450 -- dashboard reviewer card', () => {
  const T015_CARD = '#reviewerTaskList [data-example-task-id="T015"] .list-item-detail';

  async function openReviewerDashboard(page: Page) {
    await page.goto('/pages/dashboard/dashboard.html?scenario=reviewer');
    await expect(page.locator(T015_CARD)).toBeVisible();
  }

  test('the T015 card recomputes after the reviewer submits the last 待審 unit', async ({ page }) => {
    await skipGuidelineModal(page);
    await openReviewerDashboard(page);
    await expect(page.locator(T015_CARD)).toContainText('任務覆蓋 3 / 4 個審核單位 · 待審 1 個');

    await page.goto(buildWorkspaceUrl({
      task_id: 'T015', sample_id: 'ofs-04-pending-review', role: 'reviewer', run_type: 'official_run',
    }));
    await page.getByTestId('ws-review-row-approve').click();
    await page.getByTestId('ws-review-submit-btn').click();
    await expect(page.locator('#toastMsg')).toHaveText('審核已送出');

    await openReviewerDashboard(page);
    await expect(page.locator(T015_CARD)).not.toContainText('待審');
    /* issue #551: ofs-02 has already converged at N=1 by the time this
       test runs (see annotation-review-flow-demo-seed.spec.ts), so all 4
       units are finalized and neither clause has anything to report --
       this used to read '未達定稿門檻 1 個 · 爭議中 1 個'. */
    await expect(page.locator(T015_CARD)).toContainText('任務覆蓋 4 / 4 個審核單位 · IAA 無法計算');
    await expect(page.locator(T015_CARD)).not.toContainText('未達定稿門檻');
    await expect(page.locator(T015_CARD)).not.toContainText('爭議中');
  });

  /* Issue #501 closed the other half of this contract at the source: a
     reviewer seed no longer carries a `detail` string at all, so no second
     copy of the counters can drift back in behind the formula. Asserted on
     the seed rather than on rendered text, because rendered text is what a
     reintroduced seed would silently replace. */
  test('reviewer seeds carry no summary text for the formula to compete with', async ({ page }) => {
    await openReviewerDashboard(page);

    const detailFields = await page.evaluate(() => {
      const seeds = (window as unknown as {
        LabelSuiteAssignmentSeeds: { reviewer: { detail?: unknown }; annotator: { detail?: unknown } }[];
      }).LabelSuiteAssignmentSeeds;
      return {
        reviewer: seeds.map((seed) => typeof seed.reviewer.detail),
        annotator: seeds.map((seed) => typeof seed.annotator.detail),
      };
    });

    expect(new Set(detailFields.reviewer)).toEqual(new Set(['undefined']));
    // Annotator seeds are untouched: their stats have no formula behind them.
    expect(new Set(detailFields.annotator)).toEqual(new Set(['object']));
  });
});
