import { test, expect } from '@playwright/test';
import { buildWorkspaceUrl, skipGuidelineModal } from './_workspace-helpers';

/* Finalized vote breakdown (issue #403, spec 015 v4.24.0).
 *
 * Before this fix a finalized review unit's resolved row only showed the
 * converged/arbitrated VALUE, never which reviewers voted for it. A
 * minority-side reviewer (e.g. reviewer_wang below) had no way to see the
 * per-reviewer breakdown -- they could only infer they were outvoted by
 * comparing the resolved value against their own memory of what they
 * submitted.
 *
 * T016/ofm-04-majority-converged (min_reviewers = 3) is a real seeded
 * majority-converged unit: annotator answered positive; reviewer_wang and
 * reviewer_li both changed it to neutral (2/3 majority), reviewer_lin agreed
 * with positive. Viewing as reviewer_wang (the minority), the finalized card
 * must list all three reviewers' individual votes and mark reviewer_wang's
 * own row.
 *
 * Traceability: specs/annotation/015-annotation-workspace/spec.md
 *   FR-069, AC-1.22
 */

function reviewerUrl(reviewerId: string) {
  return buildWorkspaceUrl({
    task_id: 'T016', sample_id: 'ofm-04-majority-converged', role: 'reviewer',
    run_type: 'official_run', reviewer_id: reviewerId,
  });
}

test.describe('issue #403 -- finalized card lists per-reviewer vote breakdown', () => {
  test('lists every reviewer\'s submitted value and marks the current viewer\'s own vote', async ({ page }) => {
    await skipGuidelineModal(page);
    await page.goto(reviewerUrl('reviewer_wang'));

    await expect(page.getByTestId('ws-review-finalized-card')).toBeVisible();
    await expect(page.getByTestId('ws-finalized-resolved')).toContainText('neutral');

    const votes = page.getByTestId('ws-finalized-vote');
    await expect(votes).toHaveCount(3);

    const li = page.locator('[data-testid="ws-finalized-vote"][data-reviewer-id="reviewer_li"]');
    const lin = page.locator('[data-testid="ws-finalized-vote"][data-reviewer-id="reviewer_lin"]');
    const wang = page.locator('[data-testid="ws-finalized-vote"][data-reviewer-id="reviewer_wang"]');

    await expect(li).toContainText('neutral');
    await expect(li).not.toHaveAttribute('data-self', 'true');

    await expect(lin).toContainText('positive');
    await expect(lin).not.toHaveAttribute('data-self', 'true');

    // reviewer_wang is the current viewer (reviewer_id query param) and the
    // minority voter: their own row must both carry the submitted value
    // (neutral, matching what they actually changed it to) and be marked
    // as the viewer's own vote.
    await expect(wang).toContainText('neutral');
    await expect(wang).toHaveAttribute('data-self', 'true');
    await expect(wang).toContainText('你');
  });

  test('viewing as a different reviewer marks a different row as self', async ({ page }) => {
    await skipGuidelineModal(page);
    await page.goto(reviewerUrl('reviewer_lin'));

    const wang = page.locator('[data-testid="ws-finalized-vote"][data-reviewer-id="reviewer_wang"]');
    const lin = page.locator('[data-testid="ws-finalized-vote"][data-reviewer-id="reviewer_lin"]');

    await expect(wang).not.toHaveAttribute('data-self', 'true');
    await expect(lin).toHaveAttribute('data-self', 'true');
  });
});
