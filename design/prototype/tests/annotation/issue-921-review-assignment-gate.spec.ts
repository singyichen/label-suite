/**
 * issue #921 -- the review workspace never checks review assignment. Any
 * in-roster reviewer can open ANY review unit in the workspace -- via the
 * left column or a direct URL -- and submit a decision on it, producing
 * the multi-submission shape FR-093 forbids (the actual production path
 * behind #913/#914). `getAssignedReviewUnits()` (annotation-workspace.
 * data.js:2422) already exists and is already consumed by annotation-list.
 * html's `filterToAssignedUnits()` (issue #824); the workspace's
 * `buildUnits()` (annotation-workspace.config.js:1508) and its interaction
 * gate `reviewUnitBlockReason()` (:3611) never call it.
 *
 * Fixture: T015 official_run (seedReviewFlowDemo(), annotation-workspace.
 * data.js ~:3413-3422). T015's mock-row roster (annotation-workspace.
 * data.js's REVIEWER_MOCK_ROWS-equivalent table, ~:1436-1449) deliberately
 * OMITS ofs-05-not-submitted, so the review-unit universe for this task is
 * only 4 units: ofs-01..ofs-04. T015's reviewerIds are ['reviewer_wang',
 * 'reviewer_li', 'reviewer_chen', 'reviewer_lin'] with arbiterIds
 * ['reviewer_chen']; issue #868 excludes designated arbiters from the
 * assignment roster, so the effective 3-member round-robin pool is
 * ['reviewer_wang', 'reviewer_li', 'reviewer_lin'].
 *
 * Sorted sample order is ofs-01..ofs-04. ofs-01/02/03 each carry a seeded
 * reviewer submission (`rev`) and are therefore STICKY (issue #824) to
 * their original reviewer regardless of roster position; ofs-04 carries no
 * `rev` and is the sole member of the non-sticky pool, dealt at pool index
 * 0:
 *   ofs-01-agree-gold        -> reviewer_wang (sticky, agree -> FINALIZED)
 *   ofs-02-modified-dispute  -> reviewer_li   (sticky, modify -> DISPUTED)
 *   ofs-03-arbitrated-gold   -> reviewer_lin  (sticky, modify+arb -> FINALIZED)
 *   ofs-04-pending-review    -> reviewer_wang (positional pool index 0, PENDING)
 * This matches the issue's own repro fixture verbatim: ofs-04-pending-review
 * -> reviewer_wang, ofs-02-modified-dispute -> reviewer_li. reviewer_li's
 * ENTIRE T015 official_run assignment is therefore exactly one unit:
 * ofs-02-modified-dispute.
 *
 * Design: openspec/changes/2026-09-25-gate-review-assignment/design.md
 *   D1 (buildAllUnits()/buildUnits() split), D2 (filterToAssignedReviewUnits,
 *   mirrors annotation-list.html's filterToAssignedUnits()), D3
 *   (REVIEW_UNIT_BLOCK.NOT_ASSIGNED, judgement order ARBITRATION ->
 *   FINALIZED -> OFF_ROSTER -> NOT_ASSIGNED -> EMPTY), D4 (read-only render
 *   branch, `ws-review-not-assigned`, mirrors the existing OFF_ROSTER
 *   branch's `ws-review-off-roster`).
 *
 * tasks.md 1.1 bullet 7: no assertion below hardcodes the task's total
 * unit count -- the left-column check cross-references the SAME identity's
 * annotation-list count instead (mirrors the ASSIGNED_UNITS cross-check
 * already established in annotation-list-reviewer.spec.ts:23-37 for a
 * different task/identity pair), and separately asserts absence of the one
 * specific unassigned unit under test.
 */
import { test, expect } from '@playwright/test';
import {
  buildListUrl,
  buildWorkspaceUrl,
  skipGuidelineModal,
  trackPageErrors,
  assertNoPageErrors,
} from './_workspace-helpers';

/* Same known static-server <script src> flake guard as the sibling
 * review-unit specs (issue #582 lineage). */
test.describe.configure({ retries: 2 });

const TASK = 'T015';
const RUN = 'official_run';

const REVIEWER_LI = 'reviewer_li';
const REVIEWER_CHEN = 'reviewer_chen'; // T015's only can_arbitrate roster member

/* Sticky to reviewer_li, DISPUTED (reviewer_li already modified it) --
 * reviewer_li's only T015 official_run unit. */
const LI_OWNED_SAMPLE = 'ofs-02-modified-dispute';
/* Positional to reviewer_wang, PENDING -- fully interactive pre-fix, which
 * is exactly what lets an unassigned reviewer submit against it today. */
const WANG_OWNED_SAMPLE = 'ofs-04-pending-review';
const WANG_OWNED_SAMPLE_TEXT = '主廚特餐每天不同';

test.describe('Left column and nav only list units assigned to the current reviewer', () => {
  test("reviewer_li's left column excludes ofs-04 (assigned to reviewer_wang) and matches annotation-list's count for the same identity", async ({
    page,
  }) => {
    await page.goto(buildListUrl({ task_id: TASK, role: 'reviewer', run_type: RUN, reviewer_id: REVIEWER_LI }));
    const listCount = await page.getByTestId('ws-sample-item').count();
    expect(listCount).toBeGreaterThan(0);

    await skipGuidelineModal(page);
    await page.goto(
      buildWorkspaceUrl({
        task_id: TASK,
        sample_id: LI_OWNED_SAMPLE,
        role: 'reviewer',
        run_type: RUN,
        reviewer_id: REVIEWER_LI,
      })
    );

    await expect(
      page.locator(`[data-testid="ws-sample-item"][data-sample-id="${WANG_OWNED_SAMPLE}"]`)
    ).toHaveCount(0);
    await expect(page.getByTestId('ws-sample-item')).toHaveCount(listCount);
  });
});

test.describe('Direct-URL access to an unassigned unit is read-only, not blocked', () => {
  test('reviewer_li opens ofs-04 (assigned to reviewer_wang) via URL: content still renders, submit is gated, and the shortcut is inert', async ({
    page,
  }) => {
    const errors = trackPageErrors(page);
    await skipGuidelineModal(page);
    await page.goto(
      buildWorkspaceUrl({
        task_id: TASK,
        sample_id: WANG_OWNED_SAMPLE,
        role: 'reviewer',
        run_type: RUN,
        reviewer_id: REVIEWER_LI,
      })
    );

    // The sample content is still visible to the unassigned reviewer
    // (maintainer ruling, issue #921 comment 2026-09-24) -- this is not a
    // permission-denied page.
    await expect(page.getByTestId('ws-input-content')).toContainText(WANG_OWNED_SAMPLE_TEXT);

    // ...but no submittable control renders.
    await expect(page.getByTestId('ws-review-submit-btn')).toBeHidden();
    await expect(page.getByTestId('ws-review-not-assigned')).toBeVisible();
    await expect(page.getByTestId('ws-review-not-assigned')).not.toHaveText('');

    // Hiding the footer submit is what closes the FR-058 Ctrl/Cmd+Enter
    // path (setupActionShortcuts skips hidden buttons, :3188) -- mirrors
    // the existing "reviewer: the shortcut does nothing, because 儲存草稿
    // is hidden" assertion pattern in
    // annotation-workspace-action-shortcuts.spec.ts:156-166.
    await page.keyboard.press('Control+Enter');
    await expect(page.locator('#toast')).not.toHaveClass(/visible/);

    assertNoPageErrors(errors);
  });
});

test.describe('Regression guard: the arbitration entry is not blocked by the assignment gate', () => {
  test('reviewer_chen (arbiter, never submitted on ofs-02) still gets the arbitration card, not the not-assigned note', async ({
    page,
  }) => {
    const errors = trackPageErrors(page);
    await skipGuidelineModal(page);
    await page.goto(
      buildWorkspaceUrl({
        task_id: TASK,
        sample_id: LI_OWNED_SAMPLE,
        role: 'reviewer',
        run_type: RUN,
        reviewer_id: REVIEWER_CHEN,
      })
    );

    // ofs-02-modified-dispute was never assigned to reviewer_chen by
    // FR-093's round-robin (it is sticky to reviewer_li) -- the ARBITRATION
    // branch of reviewUnitBlockReason() (design.md D3) MUST still take
    // precedence over the new NOT_ASSIGNED branch.
    await expect(page.getByTestId('ws-arbitration-card')).toBeVisible();
    await expect(page.getByTestId('ws-review-not-assigned')).toHaveCount(0);

    assertNoPageErrors(errors);
  });
});
