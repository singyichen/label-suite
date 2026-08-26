/**
 * Review-unit context banner in the reviewer workspace (issue #302).
 * Source spec: specs/annotation/015-annotation-workspace/spec.md
 *
 * The four review-flow demo tasks exercise four different review models
 * (dry_run consensus, official single reviewer, majority-of-3, tie-of-2),
 * but FR-051 makes the review card itself identical for every model — so
 * without a context banner a reviewer cannot tell the tasks apart inside
 * the workspace. These tests pin the banner that surfaces each task's
 * review model on the FIRST record the dashboard quick-review entry lands
 * on: run_type, the finalize threshold (reviewers so far / required),
 * annotator identity/roster size, and the unit's five-state pill. Issue
 * #452 merged the old quorum + 已審 chips into one 定稿門檻 x / n chip so
 * the number states which population it counts.
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
  test('T014 dry-01: dry_run badge, quorum 1, 3-annotator roster, finalized', async ({ page }) => {
    await openReviewerWorkspace(page, 'T014', 'dry-01-all-agree', 'dry_run');

    const banner = contextBanner(page);
    await expect(banner).toBeVisible();
    await expect(banner).toContainText('試標');
    await expect(banner).toContainText('定稿門檻 1 / 1 位審核員');
    await expect(banner).toContainText('標記員 kioleemg12');
    await expect(banner).toContainText('本樣本 3 位標記員');
    await expect(banner.locator('.rv-unit-state')).toHaveText('已定稿 · 已鎖定');
  });

  test('T015 ofs-01: official badge, finalize threshold 1/1, finalized', async ({ page }) => {
    await openReviewerWorkspace(page, 'T015', 'ofs-01-agree-gold', 'official_run');

    const banner = contextBanner(page);
    await expect(banner).toBeVisible();
    await expect(banner).toContainText('正式標記');
    await expect(banner).toContainText('定稿門檻 1 / 1 位審核員');
    await expect(banner.locator('.rv-unit-state')).toHaveText('已定稿 · 已鎖定');
  });

  test('T016 ofm-01: finalize threshold 3/3, finalized', async ({ page }) => {
    await openReviewerWorkspace(page, 'T016', 'ofm-01-unanimous-gold', 'official_run');

    const banner = contextBanner(page);
    await expect(banner).toBeVisible();
    await expect(banner).toContainText('定稿門檻 3 / 3 位審核員');
    await expect(banner.locator('.rv-unit-state')).toHaveText('已定稿 · 已鎖定');
  });

  test('T017 oft-01: finalize threshold 2/2, disputed, banner coexists with the arbitration card', async ({ page }) => {
    await openReviewerWorkspace(page, 'T017', 'oft-01-even-tie', 'official_run');

    const banner = contextBanner(page);
    await expect(banner).toBeVisible();
    await expect(banner).toContainText('定稿門檻 2 / 2 位審核員');
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
