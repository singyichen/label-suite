import { test, expect } from '@playwright/test';
import { buildWorkspaceUrl, dismissGuidelineModal, skipGuidelineModal } from '../annotation/_workspace-helpers';

/* Issue #458 -- vocabulary regression guard: 審核 is the canonical zh-TW
 * term for the reviewer flow (outnumbering 審查 256:5 across
 * design/prototype/pages); this PR retargets the three known live copy
 * drifts (the review-submit toast and two dashboard reviewer-panel
 * strings). This spec is the guard against 審查 quietly coming back.
 *
 * Design choice: a BROWSER-level check against rendered text
 * (`body`'s textContent, via toContainText), not a source-code grep --
 * grepping source is a lint concern, not something a Playwright spec
 * should duplicate. Only two live surfaces are visited: the annotation
 * reviewer workspace (toast + note copy) and the dashboard reviewer
 * scenario view (panel copy + task-list status badges) -- the exact
 * surfaces this issue's audit covers.
 *
 * What this catches: any literal 審查 substring rendered on the specific
 * pages / states / run_types this test actually navigates to.
 * What this does NOT catch: pages this test never visits (notably
 * annotation-list.html's role-conditional subtitle, explicitly deferred
 * to the second PR per issue #458's scope split -- it is a known,
 * accepted gap, not an oversight), other roles' views, or any 審查 that
 * only appears in a state/run_type this test does not exercise. A
 * passing run here is evidence for "the paths this test walked are
 * clean," not a repo-wide guarantee -- that guarantee is a lint/grep
 * rule's job, not this test's.
 *
 * KNOWN FINDING, flagged for the Green PR (not in the original 3-item
 * audit table this Red PR was scoped against): dashboard.i18n.js's
 * `statusLabel.pending_review` ('待審查') renders as the reviewer
 * task-list status badge for every seeded reviewer entry -- none of the
 * 12 reviewer work items in dashboard.assignments.js override
 * `statusText`, so getStatusText() always falls through to this label.
 * That means the dashboard half of this guard fails today for a FOURTH
 * reason beyond the three catalogued drifts, and fixing only the
 * catalogued three will not turn it green. Resolving `pending_review`
 * is a production-code change and out of scope for this test-only PR.
 */

test.describe('issue #458 -- 審查 must not reappear in reviewer-flow UI copy', () => {
  test('annotation reviewer workspace renders no 審查, before or after a review submit', async ({ page }) => {
    await skipGuidelineModal(page);
    await page.goto(buildWorkspaceUrl({
      task_id: 'T001', sample_id: 'sent-001', role: 'reviewer', run_type: 'official_run',
    }));
    await dismissGuidelineModal(page);

    await expect(page.locator('body')).not.toContainText('審查');

    await page.getByTestId('ws-review-row-approve').click();
    await page.getByTestId('ws-review-submit-btn').click();
    await expect(page.locator('#toastMsg')).toBeVisible();

    // Re-checked post-submit: this is the exact moment the old
    // wsReviewSubmitSuccess ('審查已提交') toast used to render.
    await expect(page.locator('body')).not.toContainText('審查');
  });

  test('dashboard reviewer scenario view renders no 審查', async ({ page }) => {
    await page.goto('/pages/dashboard/dashboard.html?scenario=reviewer');
    await expect(page.getByTestId('reviewer-view')).toBeVisible();

    await expect(page.locator('body')).not.toContainText('審查');
  });
});
