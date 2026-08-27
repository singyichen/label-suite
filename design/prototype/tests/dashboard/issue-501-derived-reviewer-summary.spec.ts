/**
 * Reviewer card summaries are derived on EVERY task (issue #501).
 * Source spec: specs/dashboard/012-dashboard/spec.md FR-007C/FR-007D
 *              specs/dataset/017-dataset-analysis-detail/spec.md FR-039.4 (IAA tri-state)
 *
 * PR #499 made T014-T017 derive their reviewer summary from live review-unit
 * state. T001-T013 kept hand-written narrative strings -- '待審 7 個審核單位 ·
 * 任務覆蓋率 34% · IAA 0.80' and twelve more like it -- because
 * computeReviewSummary() only took over when a task had stored review state
 * (`derivable`). None of those thirteen tasks has any, so every one of them
 * rendered numbers that matched nothing in the seeds: the unit rows below say
 * 15 units all 待審, the card said 7 pending at 34% coverage.
 *
 * These tests pin the fix: the formula owns the summary for every reviewer
 * task, and a task with nothing reviewed yet honestly shows 0 coverage rather
 * than an invented figure. They also pin the IAA distinction the derivation
 * makes possible -- 「無法計算」 is a claim about the DATA, so a task whose
 * output type has no nominal-alpha definition at all must say nothing about
 * IAA instead of claiming its agreement could not be computed.
 */
import { test, expect, type Page } from '@playwright/test';

const DASHBOARD_URL = '/pages/dashboard/dashboard.html';

/** T003: multi_label, official_run, 15 units, none reviewed. */
const T003_DERIVED = '任務覆蓋 0 / 15 個審核單位 · 待審 15 個 · 未達定稿門檻 15 個';

async function openReviewer(page: Page) {
  await page.goto(DASHBOARD_URL);
  await page.locator('.scenario-pill[data-scenario="reviewer"]').click();
  await expect(page.getByTestId('reviewer-view')).toBeVisible();
}

function reviewerCard(page: Page, taskId: string) {
  return page.getByTestId('reviewer-view').locator(`.list-item[data-example-task-id="${taskId}"]`);
}

test.describe('Reviewer card summary — derived on every task', () => {
  test('T003 shows the derived unit counts, not the seeded narrative', async ({ page }) => {
    await openReviewer(page);
    const detail = reviewerCard(page, 'T003').locator('.list-item-detail');
    await expect(detail).toHaveText(T003_DERIVED);
  });

  test('no reviewer card still carries the old hand-written wording', async ({ page }) => {
    await openReviewer(page);
    // 任務覆蓋率 N% was the seeds' phrasing; the formula says 任務覆蓋 n / total.
    await expect(
      page.getByTestId('reviewer-view').locator('.list-item-detail', { hasText: '任務覆蓋率' })
    ).toHaveCount(0);
  });

  test('a task with nothing reviewed shows a 0% progress bar', async ({ page }) => {
    await openReviewer(page);
    const bar = reviewerCard(page, 'T003').locator('.progress span');
    await expect(bar).toHaveAttribute('style', /width:\s*0%/);
  });
});

test.describe('Reviewer card summary — IAA is tri-state, not binary', () => {
  test('an output type with no nominal-alpha definition says nothing about IAA', async ({ page }) => {
    await openReviewer(page);
    // T003 is multi_label: computeIaaAlpha() only defines alpha over
    // single_label, so this task has no IAA line at all -- claiming it
    // "could not be computed" would assert a measurement was attempted.
    await expect(reviewerCard(page, 'T003').locator('.list-item-detail')).not.toContainText('IAA');
  });

  test('a single_label task with too few submissions says IAA is not computable', async ({ page }) => {
    await openReviewer(page);
    // T001 IS single_label, so alpha is defined for it -- there are simply
    // no annotator submissions to derive it from. That must be stated.
    await expect(reviewerCard(page, 'T001').locator('.list-item-detail')).toContainText(
      'IAA 無法計算'
    );
  });

  test('T014 keeps its derived alpha untouched', async ({ page }) => {
    await openReviewer(page);
    await expect(reviewerCard(page, 'T014').locator('.list-item-detail')).toContainText('IAA 0.59');
  });
});

test.describe('Reviewer summary — the two pages still agree', () => {
  test('annotation-list renders the same derived summary as the dashboard card', async ({ page }) => {
    await openReviewer(page);
    const fromCard = await reviewerCard(page, 'T003').locator('.list-item-detail').innerText();

    await page.goto(
      '/pages/annotation/annotation-list.html?task_id=T003&role=reviewer&run_type=official_run'
    );
    // The list appends its own run/count suffix, so the card text is a prefix.
    await expect(page.locator('#taskInfoDetail')).toContainText(fromCard);
  });
});
