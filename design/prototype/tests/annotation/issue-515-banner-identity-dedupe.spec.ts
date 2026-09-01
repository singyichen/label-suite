import { test, expect, type Page } from '@playwright/test';
import { buildWorkspaceUrl, dismissGuidelineModal, skipGuidelineModal } from './_workspace-helpers';

/* spec 015 FR-064 (revised) / AC-4.27 (revised) / AC-4.35 -- issue #515 ①.
 *
 * "Who am I reviewing" is currently answered THREE times on the same screen:
 *
 *   1. the entry breadcrumb's level 3 -- 審核單位 {sample} · {annotator}
 *   2. the left column's group header -- {n} 位標記員 (FR-071)
 *   3. the context banner's third chip -- 標記員 {id} · 本樣本 {m} 位標記員
 *
 * The third one carries nothing the first two do not already carry, and it
 * sits in the banner whose job is the REVIEW MODEL (run type, finalize
 * threshold, state, state track) -- not identity. This spec removes it and
 * pins that the two remaining answers still hold, so the information is
 * deduplicated rather than lost.
 *
 * The banner keeps exactly two chips afterwards: run type and finalize
 * threshold. Counting them is the point -- an assertion that merely greps
 * the banner for an account name would still pass if the chip came back
 * carrying different text.
 *
 * Traceability: specs/annotation/015-annotation-workspace/spec.md FR-064
 * item (3) removed, AC-4.27, AC-4.29 (375px identity clause), AC-4.35.
 */

/* Same retry guard the sibling review-unit specs carry: parallel workers
   hammering the static server occasionally drop a <script src>. */
test.describe.configure({ retries: 2 });

/** T014 — dry_run, 5 samples × 3 annotators: roster > 1, so the removed chip
 *  used to carry BOTH halves (account + roster note). */
const T014_UNIT = buildWorkspaceUrl({
  task_id: 'T014',
  sample_id: 'dry-01-all-agree',
  role: 'reviewer',
  run_type: 'dry_run',
  annotator_id: 'kioleemg12',
});

/** T015 — official_run, min_reviewers = 1 and a single annotator per sample:
 *  roster === 1, the branch where the chip used to render the account alone. */
const T015_UNIT = buildWorkspaceUrl({
  task_id: 'T015',
  sample_id: 'ofs-01-agree-gold',
  role: 'reviewer',
  run_type: 'official_run',
});

function banner(page: Page) {
  return page.getByTestId('ws-review-unit-context');
}

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
});

test.describe('脈絡橫幅不再重複身分資訊 (issue #515 ①)', () => {
  test('多標記員樣本：橫幅只剩 run type 與定稿門檻兩個 chip', async ({ page }) => {
    await page.goto(T014_UNIT);
    await dismissGuidelineModal(page);

    /* issue #525 PR-B re-anchor: the two chips are unchanged, but the state
       element now reads BETWEEN them, so the run chip is still chip 0 while
       the threshold chip is now the LAST child of the banner rather than
       `.rv-unit-chip` index 1. Same two assertions, same two subjects. */
    const chips = banner(page).locator('.rv-unit-chip');
    await expect(chips).toHaveCount(2);
    await expect(chips.nth(0)).toHaveClass(/rv-unit-run/);
    await expect(chips.nth(1)).toHaveClass(/rv-unit-threshold/);
  });

  test('多標記員樣本：橫幅不得出現標記員帳號或名冊人數', async ({ page }) => {
    await page.goto(T014_UNIT);
    await dismissGuidelineModal(page);

    await expect(banner(page)).not.toContainText('kioleemg12');
    await expect(banner(page)).not.toContainText('位標記員');
  });

  test('單一標記員樣本：橫幅同樣不得出現標記員帳號', async ({ page }) => {
    await page.goto(T015_UNIT);
    await dismissGuidelineModal(page);

    await expect(banner(page).locator('.rv-unit-chip')).toHaveCount(2);
    await expect(banner(page)).not.toContainText('標記員 ');
  });

  test('英文版同樣不得出現 Annotator 身分 chip', async ({ page }) => {
    await page.goto(T014_UNIT);
    await dismissGuidelineModal(page);
    await page.getByTestId('lang-toggle').click();

    await expect(banner(page).locator('.rv-unit-chip')).toHaveCount(2);
    await expect(banner(page)).not.toContainText('Annotator ');
    await expect(banner(page)).not.toContainText('annotators on this sample');
  });
});

test.describe('橫幅其餘內容不受影響 (issue #515 ①)', () => {
  test('run type 徽章、定稿門檻、五態 pill 與狀態軌都還在', async ({ page }) => {
    await page.goto(T014_UNIT);
    await dismissGuidelineModal(page);

    await expect(banner(page).locator('.rv-unit-run')).toContainText('試標');
    await expect(banner(page).locator('.rv-unit-threshold')).toContainText('定稿門檻');
    await expect(banner(page).locator('.rv-unit-state')).toHaveCount(1);
    /* issue #525 PR-A re-anchor: the state track moved out of the banner into
       the on-demand review-flow drawer. The original assertion is kept
       verbatim, re-rooted at the element that now carries the track. */
    await page.getByTestId('ws-review-flow-trigger').click();
    await expect(page.getByTestId('ws-review-flow-drawer').locator('.review-track')).toHaveCount(1);
  });
});

test.describe('身分改由麵包屑與左欄承載，未因去重而消失 (issue #515 ①)', () => {
  test('麵包屑第 3 層仍同時說出樣本與標記員', async ({ page }) => {
    await page.goto(T014_UNIT);
    await dismissGuidelineModal(page);

    const nav = page.locator('nav.breadcrumb[data-testid="entry-breadcrumb"]');
    await expect(nav).toBeVisible();
    await expect(nav).toContainText('dry-01-all-agree');
    await expect(nav).toContainText('kioleemg12');
  });

  test('左欄群組表頭仍說出本樣本的標記員人數', async ({ page }) => {
    await page.goto(T014_UNIT);
    await dismissGuidelineModal(page);

    const counts = page.getByTestId('ws-sample-group-count');
    await expect(counts.first()).toHaveText('3 位標記員');
  });
});
