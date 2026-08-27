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
 *   - a task with no stored annotator submissions has nothing to derive and
 *     keeps its seeded illustrative summary (`derivable: false`) -- the
 *     condition is the presence of review-unit data, never a task id.
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
   reproducible from the per-row status comments in that seeder. */
const MATRIX = [
  {
    taskId: 'T014', runType: 'dry_run',
    expected: { total: 15, pending: 6, approved: 0, modified: 0, disputed: 2, finalized: 7, unfinalized: 8, coveragePct: 60, derivable: true },
  },
  {
    taskId: 'T015', runType: 'official_run',
    expected: { total: 4, pending: 1, approved: 0, modified: 0, disputed: 1, finalized: 2, unfinalized: 2, coveragePct: 75, derivable: true },
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

  /* Generalization-First: the fallback is keyed on "no derivable review-unit
     state", not on a task id list. T001 ships mock rows but no stored
     annotator submissions, so nothing can be derived for it. */
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
    await expect(detail).toContainText('任務覆蓋 4 / 4 個審核單位 · 未達定稿門檻 1 個 · 爭議中 1 個 · IAA 無法計算');

    // Reload: the derived numbers must be stable, not a one-shot render.
    await page.reload();
    await expect(page.locator('#taskInfoDetail'))
      .toContainText('任務覆蓋 4 / 4 個審核單位 · 未達定稿門檻 1 個 · 爭議中 1 個 · IAA 無法計算');
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
    await expect(page.locator(T015_CARD))
      .toContainText('任務覆蓋 4 / 4 個審核單位 · 未達定稿門檻 1 個 · 爭議中 1 個 · IAA 無法計算');
  });

  /* Non-derivable tasks keep their seeded illustrative summary, so the
     13 legacy demo rows are untouched by this change. */
  test('a task without derivable review-unit state keeps its seeded summary', async ({ page }) => {
    await openReviewerDashboard(page);

    await expect(
      page.locator('#reviewerTaskList [data-example-task-id="T001"] .list-item-detail'),
    ).toHaveText('待審 7 個審核單位 · 任務覆蓋率 34% · IAA 0.80');
  });
});
