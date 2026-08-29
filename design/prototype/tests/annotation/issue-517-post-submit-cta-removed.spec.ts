/**
 * The reviewer workspace no longer renders a post-submit exit card (issue #517)
 * Source spec: specs/annotation/015-annotation-workspace/spec.md
 *
 * Issue #456 AC-5 asked for "so what now?" exits once a review unit was done
 * with, and FR-082 / AC-4.34 delivered a card offering 下一個可處理單位,
 * 返回審核清單 and 返回 Dashboard. Review of the shipped screen found all
 * three destinations already reachable from the same view: the list and the
 * dashboard are FR-081's breadcrumb levels, and moving between units is what
 * the left sample list and 上一筆 / 下一筆 already do. The card therefore
 * stacked a second navigation layer under a read-only unit, so FR-082 and
 * AC-4.34 were retired and it was removed.
 *
 * Each test anchors on something the page still renders, so none of them can
 * pass merely because the workspace failed to load.
 */
import { expect, test, type Page } from '@playwright/test';
import { buildWorkspaceUrl, dismissGuidelineModal, skipGuidelineModal } from './_workspace-helpers';

/* T001 defaults to min_reviewers = 1, so a single submitted review finalizes
 * the unit — the shortest route to the state that used to raise the card. */
const T001_UNIT = buildWorkspaceUrl({
  task_id: 'T001',
  sample_id: 'sent-001',
  role: 'reviewer',
  run_type: 'official_run',
});

/* T014 dry-04 × kioleemg12 is seeded finalized, so it reproduces the other
 * half of the retired contract: a finished unit the reviewer merely visits. */
const T014_FINALIZED_UNIT = buildWorkspaceUrl({
  task_id: 'T014',
  sample_id: 'dry-04-dispute-resolved',
  role: 'reviewer',
  run_type: 'dry_run',
  reviewer_id: 'reviewer_chen',
  annotator_id: 'kioleemg12',
});

const RETIRED_TESTIDS = [
  'ws-post-submit-cta',
  'ws-post-submit-cta-title',
  'ws-post-submit-next-unit',
  'ws-post-submit-next-none',
  'ws-post-submit-list',
  'ws-post-submit-dashboard',
];

async function approveAndSubmit(page: Page) {
  await page.getByTestId('ws-review-row-approve').click();
  await page.getByTestId('ws-review-submit-btn').click();
}

async function expectNoExitCard(page: Page) {
  for (const testId of RETIRED_TESTIDS) {
    await expect(page.getByTestId(testId)).toHaveCount(0);
  }
  await expect(page.locator('#wsPostSubmitMount')).toHaveCount(0);
  await expect(page.locator('.rv-exits, .rv-exits-title, .rv-exits-note, .rv-exits-actions, .rv-exits-none')).toHaveCount(0);

  /* issue #562: the role-dependent status note that once sat under the
     banner (issue #526) is retired too -- nothing may grow back there. */
  await expect(page.getByTestId('ws-review-action-hint')).toHaveCount(0);
}

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
});

test.describe('Reviewer workspace — post-submit exit card removed (issue #517)', () => {
  test('送出審核後不再長出出口卡', async ({ page }) => {
    await page.goto(T001_UNIT);
    await dismissGuidelineModal(page);
    await approveAndSubmit(page);

    /* Anchor: the submit really happened. */
    await expect(page.locator('#toastMsg')).toHaveText('審核已送出');
    await expectNoExitCard(page);
  });

  test('重新整理後仍然沒有出口卡（狀態推導路徑也已移除）', async ({ page }) => {
    await page.goto(T001_UNIT);
    await dismissGuidelineModal(page);
    await approveAndSubmit(page);
    await expect(page.locator('#toastMsg')).toHaveText('審核已送出');

    await page.reload();
    await dismissGuidelineModal(page);

    /* Anchor: nothing was submitted on this page load, but the stored state
       still says this reviewer is done with the unit — the exact condition
       the retired card derived itself from. */
    await expect(page.getByTestId('ws-progress-text')).toContainText('我的審核提交 1 /');
    await expectNoExitCard(page);
  });

  test('直接開啟已定稿單位也沒有出口卡', async ({ page }) => {
    await page.goto(T014_FINALIZED_UNIT);
    await dismissGuidelineModal(page);

    await expect(page.locator('[data-testid="ws-review-unit-context"] .rv-unit-state'))
      .toHaveText('目前：已定稿 · 已鎖定');
    await expectNoExitCard(page);
  });

  test('未送出的可互動單位維持原樣，沒有出口卡也沒有被連帶移除的內容', async ({ page }) => {
    await page.goto(T001_UNIT);
    await dismissGuidelineModal(page);

    /* Anchor: this unit is still the reviewer's to do. */
    await expect(page.getByTestId('ws-review-submit-btn')).toBeVisible();
    await expectNoExitCard(page);
  });

  test('麵包屑仍帶得回清單檢視狀態（buildListReturnUrl 未被連帶移除）', async ({ page }) => {
    await page.goto(T001_UNIT + '&status=pending&limit=50');
    await dismissGuidelineModal(page);

    const listHref = await page
      .getByTestId('entry-breadcrumb')
      .locator('a')
      .nth(1)
      .getAttribute('href');
    expect(listHref).toContain('status=pending');
    expect(listHref).toContain('limit=50');
  });
});
