/**
 * Review-unit context banner in the reviewer workspace (issue #302).
 * Source spec: specs/annotation/015-annotation-workspace/spec.md
 *
 * These tests pin the banner that surfaces each task's review model on the
 * FIRST record the dashboard quick-review entry lands on: run_type and the
 * unit's three-state pill (issue #596, FR-051 -- 待審/爭議中/已定稿 only).
 *
 * issue #596 (OpenSpec change 2026-09-01-single-owner-review-relay,
 * FR-093/FR-064 v5.0.0): a review unit now has exactly ONE assigned
 * reviewer, so there is no population left for a finalize threshold to
 * count against. The 定稿門檻 {x} / {n} 位審核員 chip (`.rv-unit-threshold`)
 * is removed for every task, not only T016/T017 -- confirmed by grep of
 * annotation-workspace.config.js:4459-4461 (comment) and the absence of the
 * `.rv-unit-threshold` class anywhere in that file. T016/T017 additionally
 * lose their whole seed shape (majority-of-3 / tie-of-2 have no meaning
 * with one reviewer); design.md's Migration Plan retargets both at a single
 * canonical relay path each -- see annotation-review-flow-demo-seed.spec.ts's
 * header for the full path description.
 */
import { test, expect, type Page } from '@playwright/test';

const WORKSPACE_URL = '/pages/annotation/annotation-workspace.html';

async function openReviewerWorkspace(
  page: Page,
  taskId: string,
  sampleId: string,
  runType: 'dry_run' | 'official_run',
) {
  await page.goto(
    `${WORKSPACE_URL}?task_id=${taskId}&sample_id=${sampleId}` +
      `&role=reviewer&run_type=${runType}&reviewer_id=reviewer_chen`,
  );
}

function contextBanner(page: Page) {
  return page.locator('[data-testid="ws-review-unit-context"]');
}

test.describe('Reviewer workspace — review-unit context banner (T014-T017)', () => {
  test('T014 dry-01: dry_run badge, 3-annotator roster, finalized, no threshold chip', async ({ page }) => {
    await openReviewerWorkspace(page, 'T014', 'dry-01-all-agree', 'dry_run');

    const banner = contextBanner(page);
    await expect(banner).toBeVisible();
    await expect(banner).toContainText('試標');
    await expect(banner.locator('.rv-unit-threshold')).toHaveCount(0);
    await expect(banner.locator('.rv-unit-state')).toHaveText('已定稿 · 已鎖定');

    /* issue #515: the banner stopped repeating the identity the breadcrumb
       and the left column already carry. Same two facts, retargeted at the
       elements that now own them -- who is being reviewed, and how many
       annotators this sample has. */
    await expect(page.locator('nav.breadcrumb[data-testid="entry-breadcrumb"]')).toContainText(
      'kioleemg12'
    );
    await expect(page.getByTestId('ws-sample-group-count').first()).toHaveText('3 位標記員');
  });

  test('T015 ofs-01: official badge, finalized, no threshold chip', async ({ page }) => {
    await openReviewerWorkspace(page, 'T015', 'ofs-01-agree-gold', 'official_run');

    const banner = contextBanner(page);
    await expect(banner).toBeVisible();
    await expect(banner).toContainText('正式標記');
    await expect(banner.locator('.rv-unit-threshold')).toHaveCount(0);
    await expect(banner.locator('.rv-unit-state')).toHaveText('已定稿 · 已鎖定');
  });

  test('T016 ofm-01-reviewer-corrects-b: reviewer corrected, arbitration adopted B, finalized, no threshold chip', async ({ page }) => {
    await openReviewerWorkspace(page, 'T016', 'ofm-01-reviewer-corrects-b', 'official_run');

    const banner = contextBanner(page);
    await expect(banner).toBeVisible();
    await expect(banner.locator('.rv-unit-threshold')).toHaveCount(0);
    await expect(banner.locator('.rv-unit-state')).toHaveText('已定稿 · 已鎖定');
  });

  test('T017 oft-01-final-exception: arbitration rejected both sides, still disputed, banner coexists with the arbitration card, no threshold chip', async ({ page }) => {
    await openReviewerWorkspace(page, 'T017', 'oft-01-final-exception', 'official_run');

    const banner = contextBanner(page);
    await expect(banner).toBeVisible();
    await expect(banner.locator('.rv-unit-threshold')).toHaveCount(0);
    await expect(banner.locator('.rv-unit-state')).toHaveText('爭議中 · 未定稿，待仲裁');
    await expect(
      page.locator('[data-testid="ws-arbitration-card"]'),
    ).toBeVisible();
  });

  test('T015 ofs-05: unsubmitted sample reports no review unit', async ({ page }) => {
    await openReviewerWorkspace(page, 'T015', 'ofs-05-not-submitted', 'official_run');

    const banner = contextBanner(page);
    await expect(banner).toBeVisible();
    await expect(banner.locator('.rv-unit-state')).toHaveText('尚無標記提交');
  });
});
