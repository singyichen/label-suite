/**
 * Reviewer summaries derive from live review-unit state (issue #450).
 * Source specs: specs/annotation/015-annotation-workspace/spec.md (FR-072),
 *               specs/dashboard/012-dashboard/spec.md (FR-013)
 *
 * Before this fix the annotation-list task info card and the dashboard
 * reviewer card both printed the pre-composed `detail` string from
 * dashboard.assignments.js, while the review-unit rows on the very same
 * page derived their state from localStorage. Finishing a review therefore
 * flipped the row to 已定稿 while the summary above it still promised
 * 待審 1 筆 · 審核覆蓋率 75%.
 *
 * The contract pinned here:
 *   - computeReviewSummary() is the ONLY place the counters are computed
 *     (pending / unfinalized / disputed / coverage), and both consumers
 *     read it.
 *   - 審核覆蓋率 is share-of-units-past-待審, NOT a completion rate: T016
 *     sits at 100% coverage while still disclosing 未定稿 3 · 爭議 1.
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

declare global {
  interface Window {
    LabelSuiteAnnotationWorkspaceData: {
      computeReviewSummary: (taskId: string, runType: string) => Summary;
    };
  }
}

function readSummary(page: Page, taskId: string, runType: string): Promise<Summary> {
  return page.evaluate(
    ([id, run]) => window.LabelSuiteAnnotationWorkspaceData.computeReviewSummary(id, run),
    [taskId, runType] as const,
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
      '審核覆蓋率 100% · 未定稿 3 筆 · 爭議 1 筆 · IAA 0.68',
    );
    await expect(page.locator('#taskInfoStatus')).not.toHaveText('已完成');
  });

  test('T015 drops its pending count once the last 待審 unit is submitted', async ({ page }) => {
    await skipGuidelineModal(page);
    await page.goto(T015_LIST_URL);
    await expect(page.locator('#taskInfoDetail')).toContainText('待審 1 筆 · 審核覆蓋率 75%');

    await page.goto(buildWorkspaceUrl({
      task_id: 'T015', sample_id: 'ofs-04-pending-review', role: 'reviewer', run_type: 'official_run',
    }));
    await page.getByTestId('ws-review-row-approve').click();
    await page.getByTestId('ws-review-submit-btn').click();
    await expect(page.locator('#toastMsg')).toHaveText('審查已提交');

    await page.goto(T015_LIST_URL);
    const detail = page.locator('#taskInfoDetail');
    await expect(detail).not.toContainText('待審');
    await expect(detail).toContainText('審核覆蓋率 100% · 未定稿 1 筆 · 爭議 1 筆 · IAA 0.81');

    // Reload: the derived numbers must be stable, not a one-shot render.
    await page.reload();
    await expect(page.locator('#taskInfoDetail'))
      .toContainText('審核覆蓋率 100% · 未定稿 1 筆 · 爭議 1 筆 · IAA 0.81');
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
    await expect(page.locator(T015_CARD)).toContainText('待審 1 筆 · 審核覆蓋率 75%');

    await page.goto(buildWorkspaceUrl({
      task_id: 'T015', sample_id: 'ofs-04-pending-review', role: 'reviewer', run_type: 'official_run',
    }));
    await page.getByTestId('ws-review-row-approve').click();
    await page.getByTestId('ws-review-submit-btn').click();
    await expect(page.locator('#toastMsg')).toHaveText('審查已提交');

    await openReviewerDashboard(page);
    await expect(page.locator(T015_CARD)).not.toContainText('待審');
    await expect(page.locator(T015_CARD))
      .toContainText('審核覆蓋率 100% · 未定稿 1 筆 · 爭議 1 筆 · IAA 0.81');
  });

  /* Non-derivable tasks keep their seeded illustrative summary, so the
     13 legacy demo rows are untouched by this change. */
  test('a task without derivable review-unit state keeps its seeded summary', async ({ page }) => {
    await openReviewerDashboard(page);

    await expect(
      page.locator('#reviewerTaskList [data-example-task-id="T001"] .list-item-detail'),
    ).toHaveText('待審 7 筆 · 進度 34% · IAA 0.80');
  });
});
