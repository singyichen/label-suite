import { test, expect } from '@playwright/test';
import { buildWorkspaceUrl, skipGuidelineModal } from './_workspace-helpers';

/* issue #309: the reviewer-view workspace reused annotator vocabulary.
 *
 * With `role=reviewer` the page still rendered:
 *   1. 待標記 as the per-entry status in the left column — annotator
 *      tri-state wording on rows that are review units, while
 *      annotation-list (AC-1.15) and the context banner (FR-064) already
 *      speak the REVIEW_UNIT_STATUS vocabulary;
 *   2. `0 / N 已提交` in the top progress summary — the reviewer's count
 *      is reviewed units, not their own submissions;
 *   3. 一般使用者 as the sidebar role indicator — annotation-list already
 *      swaps it to 審核員 for reviewers.
 *
 * All three strings are shared with the annotator view, so the fix must
 * branch on role: the annotator assertions at the bottom pin the existing
 * wording unchanged.
 *
 * issue #596 narrowed REVIEW_UNIT_STATUS from five states to three (已同意／
 * 已修改 only ever named a unit waiting for more reviewers to reach a
 * quorum, and FR-093 gives every unit exactly one reviewer). issue #626
 * found the whitelist below still listed all five: `expect(FIVE_STATES_ZH)
 * .toContain(text)` would keep passing even if a regression brought back
 * 已同意／已修改, because a whitelist can only reject values outside the
 * set it names, and the retired two were still in it.
 */

const REVIEW_STATES_ZH = ['待審', '爭議中', '已定稿'];

/* Same guard the other workspace suites carry: the static server can drop
 * a keep-alive socket under parallel load, which presents as an unrendered
 * page rather than a vocabulary bug. */
test.describe.configure({ mode: 'serial', retries: 2 });

test.describe('Reviewer view speaks review vocabulary (zh)', () => {
  /* No reviewer_id on purpose: the generic reviewer path (default roster
   * identity) must be correct too, not only the T014–T017 demo entries. */
  test('left-column entries read 待審, not 待標記', async ({ page }) => {
    await skipGuidelineModal(page);
    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001', role: 'reviewer', run_type: 'dry_run' }));

    const statuses = page.getByTestId('ws-sample-status');
    await expect(statuses.first()).toHaveText('待審');
    const texts = await statuses.allTextContents();
    for (const text of texts) {
      expect(REVIEW_STATES_ZH).toContain(text);
    }
  });

  test('progress summary reads 我的審核提交 x / n, not N 已提交', async ({ page }) => {
    await skipGuidelineModal(page);
    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001', role: 'reviewer', run_type: 'dry_run' }));

    await expect(page.getByTestId('ws-progress-text')).toHaveText('我的審核提交 0 / 15 個審核單位');
  });

  test('sidebar role indicator reads 審核員, not 一般使用者', async ({ page }) => {
    await skipGuidelineModal(page);
    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001', role: 'reviewer', run_type: 'dry_run' }));

    await expect(page.getByTestId('role-indicator')).toHaveText('審核員');
  });

  /* T014–T017 seeded demo units (the walkthrough that surfaced #309) must
   * surface the seeded review-state mix, never the annotator tri-state nor
   * the retired 已同意／已修改 wording (issue #626). */
  test('seeded demo task T016 lists review-state labels only, never the retired 已同意／已修改', async ({ page }) => {
    await skipGuidelineModal(page);
    await page.goto(
      buildWorkspaceUrl({
        task_id: 'T016', sample_id: 'ofm-01', role: 'reviewer', run_type: 'official_run',
        reviewer_id: 'reviewer_wang',
      })
    );

    const statuses = page.getByTestId('ws-sample-status');
    await expect(statuses.first()).not.toHaveText('待標記');
    const texts = await statuses.allTextContents();
    expect(texts.length).toBeGreaterThan(0);
    for (const text of texts) {
      expect(text).not.toBe('已同意');
      expect(text).not.toBe('已修改');
      expect(REVIEW_STATES_ZH).toContain(text);
    }
  });
});

test.describe('Reviewer view speaks review vocabulary (en)', () => {
  test.beforeEach(async ({ page }) => {
    await skipGuidelineModal(page);
    await page.addInitScript(() => {
      window.localStorage.setItem('labelsuite.lang', 'en');
    });
  });

  test('status, progress and role indicator are translated', async ({ page }) => {
    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001', role: 'reviewer', run_type: 'dry_run' }));

    await expect(page.getByTestId('ws-sample-status').first()).toHaveText('Pending review');
    await expect(page.getByTestId('ws-progress-text')).toHaveText(
      'My review submissions 0 / 15 review units',
    );
    await expect(page.getByTestId('role-indicator')).toHaveText('Reviewer');
  });
});

test.describe('Annotator view keeps its existing vocabulary', () => {
  test('zh: 待標記 status, N 已提交 progress, 一般使用者 identity', async ({ page }) => {
    await skipGuidelineModal(page);
    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001', role: 'annotator', run_type: 'dry_run' }));

    await expect(page.getByTestId('ws-sample-status').first()).toHaveText('待標記');
    await expect(page.getByTestId('ws-progress-text')).toHaveText('0 / 5 已提交');
    await expect(page.getByTestId('role-indicator')).toHaveText('一般使用者');
  });
});
