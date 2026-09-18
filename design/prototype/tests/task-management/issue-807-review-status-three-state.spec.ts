/*
 * Traceability: specs/_archive/014-task-detail/spec.md
 *   FR-015a-1, FR-015d (AR_REVIEW_STATUS)
 * Issue #807: canonical 014 v3.0.0 (issue #688) collapsed AR_REVIEW_STATUS
 * from five states to three (pending / disputed / finalized), retiring the
 * `approved` / `modified` interim states -- the single-relay review model
 * (015 FR-093) assigns exactly one reviewer per official_run unit, so there
 * is no longer a waiting-for-quorum interim state between a reviewer's
 * decision and the unit's outcome. task-detail.html's implementation never
 * followed: it still renders five options in the review-status filter and
 * five badge variants.
 *
 * This spec asserts the concrete three-state SET (not just "the filter is
 * derived from a constant" -- that mechanism was already correct and is
 * exactly why the existing gates didn't catch a wrong constant VALUE).
 */
import { test, expect } from '@playwright/test';

const TASK_DETAIL_URL = '/pages/task-management/task-detail.html';
const PANEL_LOAD_TIMEOUT = 15000;

test.describe('Task detail annotation-results review status is three-state (issue #807)', () => {
  test('review status filter dropdown offers exactly 全部 + 三態, not five legacy states', async ({ page }) => {
    await page.goto(`${TASK_DETAIL_URL}?task_id=T001&tab=annotation-results`);
    await expect(page.locator('#arTableSection')).toBeVisible({ timeout: PANEL_LOAD_TIMEOUT });

    const select = page.locator('#arReviewStatusSelect');
    const options = select.locator('option');

    const values = await options.evaluateAll((els) => els.map((el) => (el as HTMLOptionElement).value));
    const texts = await options.evaluateAll((els) => els.map((el) => el.textContent));

    expect(values).toEqual(['all', 'pending', 'disputed', 'finalized']);
    expect(texts).toEqual(['全部', '待審', '爭議中', '已定稿']);
    expect(texts).not.toContain('已同意');
    expect(texts).not.toContain('已修改');
  });

  test('a single-reviewer approve decision renders 已定稿 (finalized), not 已同意', async ({ page }) => {
    // CLS-001 (T001, first summary row): kioleemg12's annotation was reviewed
    // by a single reviewer with decision 'approved' and no arbitration --
    // under the single-relay model a lone approve closes the unit outright.
    await page.goto(`${TASK_DETAIL_URL}?task_id=T001&tab=annotation-results`);
    await expect(page.locator('#arTableSection')).toBeVisible({ timeout: PANEL_LOAD_TIMEOUT });

    const firstRow = page.locator('#arResultTableBody tr.ar-summary-row').first();
    await expect(firstRow).toContainText('CLS-001');
    await firstRow.click();

    const detailRows = page.locator('#arResultTableBody .annotator-row');
    const kioleeRow = detailRows.filter({ hasText: 'kioleemg12' }).first();
    await expect(kioleeRow.locator('.ar-review-badge .badge')).toHaveText('已定稿');
  });

  test('a single-reviewer modify decision (no arbitration) renders 爭議中 (disputed), not 已修改', async ({ page }) => {
    // CLS-002 (T001, second summary row): 113450022's annotation was
    // reviewed by a single reviewer with decision 'modified' and no
    // arbitration -- an unresolved reviewer/annotator disagreement, same
    // pattern as the already-migrated ofs-02-modified-dispute seed.
    await page.goto(`${TASK_DETAIL_URL}?task_id=T001&tab=annotation-results`);
    await expect(page.locator('#arTableSection')).toBeVisible({ timeout: PANEL_LOAD_TIMEOUT });

    const secondRow = page.locator('#arResultTableBody tr.ar-summary-row').nth(1);
    await expect(secondRow).toContainText('CLS-002');
    await secondRow.click();

    const detailRows = page.locator('#arResultTableBody .annotator-row');
    const targetRow = detailRows.filter({ hasText: '113450022' }).first();
    await expect(targetRow.locator('.ar-review-badge .badge')).toHaveText('爭議中');
  });

  test('the review-flow demo interim seeds (T016/T017) resolve to finalized/disputed, not approved/modified', async ({ page }) => {
    // Same disambiguation already applied to annotation-workspace.data.js's
    // seedReviewFlowDemo() output (issue #627) and asserted in
    // tests/annotation/annotation-review-flow-demo-seed.spec.ts:
    //   ofm-02-reviewer-accepts-a -> 已定稿, ofm-03-awaiting-arbitration -> 爭議中.
    // task-detail.html keeps its own REVIEW_FLOW_UNITS copy for the
    // annotation-results tab and must agree.
    await page.goto(`${TASK_DETAIL_URL}?task_id=T016&tab=annotation-results`);
    await expect(page.locator('#arTableSection')).toBeVisible({ timeout: PANEL_LOAD_TIMEOUT });

    const approvedInterimRow = page.locator('#arResultTableBody tr.ar-summary-row').filter({ hasText: 'ofm-02-reviewer-accepts-a' });
    await approvedInterimRow.locator('.ar-expand-btn').click();
    const kioleeRow = page.locator('#arResultTableBody .annotator-row').filter({ hasText: 'kioleemg12' });
    await expect(kioleeRow.locator('.ar-review-badge .badge')).toHaveText('已定稿');
  });
});
