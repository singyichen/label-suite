import { test, expect } from '@playwright/test';
import {
  buildWorkspaceUrl,
  dismissGuidelineModal,
  resolveAssignedReviewerId,
  skipGuidelineModal,
  trackPageErrors,
  assertNoPageErrors,
} from './_workspace-helpers';

/* issue #804 drift guard: issue-804-review-decision-emission.spec.ts already
 * proves the CONCRETE three-value contract (approve -> accepted, modify ->
 * modified, bypass -> bypassed) with one hardcoded test per value. Its whole
 * value came from knowing the mapping; this file's whole value is knowing
 * NOTHING about it.
 *
 * REVIEW_DECISIONS (annotation-workspace.data.js:1736, exported at :3376) is
 * exactly the failure shape issue #804 itself hit: it grew from one value to
 * three (issue #596) while appendReviewDecisionEvents()'s lookup table
 * (REVIEW_DECISION_EVENT_ACTION, annotation-workspace.data.js:397) silently
 * dropped everything it did not name --
 * `var action = REVIEW_DECISION_EVENT_ACTION[decisions[outKey]]; if (!action) return;`
 * -- and two of the three decisions produced zero history events for months
 * while every verification gate stayed green, because nothing asserted the
 * vocabulary and its consumer never drift apart.
 *
 * This test reads REVIEW_DECISIONS off the live page at runtime and loops
 * over it -- it does not hardcode the three current values or how many of
 * them exist, and it does NOT assert which action name each decision maps
 * to (that belongs to issue-804-review-decision-emission.spec.ts). It only
 * asserts the FR-086 / AC-2.21 contract that must hold for every member,
 * present or future: a reviewer submit carrying that decision for an outKey
 * produces exactly one new history event for that outKey, attributed to the
 * reviewer. If a 4th value is ever added to REVIEW_DECISIONS without a
 * matching REVIEW_DECISION_EVENT_ACTION entry, this test turns red on its
 * own -- no edit to this file required.
 *
 * Task and sample choice: T001/sent-001 has exactly one output type
 * (single_label), so a single decision click plus (when required) a reason
 * fully decides the unit -- no per-outKey bookkeeping needed. Each loop
 * iteration reviews an INDEPENDENT review unit (same sample, a distinct
 * `annotator_id` per iteration, given a real submission through the
 * annotator flow -- issue #970) rather than resubmitting against the same
 * unit repeatedly: an `approve` decision finalizes a unit and issue #308
 * makes a finalized unit read-only, which would silently block every
 * iteration after it.
 *
 * Why filtering out the `submitted` badge is safe and still generic: every
 * submit -- decided or not -- writes a `submitted` wrapper event first
 * (markSampleSubmitted, data.js:377), a fixed action name that is not itself
 * a member of REVIEW_DECISIONS or of its mapped action set. The history
 * panel's collapseHistory() (shared/annotation-history.js:146) hides that
 * wrapper ONLY when the reviewer's next event is a real decision action; if
 * the decision's emission point were silently dropped (the exact issue #804
 * defect), no decision action would exist to collapse into and the
 * `submitted` badge would stay visible instead -- so asserting "exactly one
 * NON-`submitted` badge" is what actually distinguishes the correct
 * behaviour from the silent-drop bug, not a weaker stand-in for it.
 */

/* issue #970 (fixed; was "FLAGGED, NOT FIXED" under issue #960): the
 * synthetic, never-submitted `annotator_id` this file used per iteration
 * (`issue-804-drift-guard-${i}`) was never a member of
 * getReviewUnitRows()'s FR-055 union -- it had no REVIEWER_MOCK_ROWS entry
 * and no real submission -- so it could never be "assigned" to any
 * reviewer_id once FR-093's gate (issue #921) checks that enumeration. No
 * reviewer_id choice fixed that: the fix instead makes each iteration's unit
 * REAL. Before opening the review card, the loop now submits a genuine
 * annotator answer under that iteration's id through the real annotator
 * flow (the same one `annotation-workspace-review-identity.spec.ts` uses).
 * That submission puts the unit in FR-055's "actually-submitted annotator"
 * source, so it IS enumerated, and `resolveAssignedReviewerId()` (issue
 * #960) resolves whichever reviewer the round-robin actually deals it --
 * this still needs no maintainer-picked reviewer_id and stays fully generic
 * over REVIEW_DECISIONS. The isolation property issue #308 needed (each
 * decision reviews an INDEPENDENT unit so a prior `approve` can't lock a
 * later iteration) is unaffected: every iteration still uses its own
 * distinct annotator_id, now with a real submission behind it instead of a
 * fallback demo answer. */

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
});

test.describe('REVIEW_DECISIONS closed-vocabulary emission-point drift guard (FR-086 / AC-2.21 / FR-092)', () => {
  test('every REVIEW_DECISIONS value produces exactly one attributable history event for its outKey', async ({ page }) => {
    const pageErrors = trackPageErrors(page);

    // Load once to read the canonical vocabulary at runtime -- this is the
    // ONLY place any REVIEW_DECISIONS value could leak into this file, and
    // it never does: the loop below is driven entirely by what the page
    // itself reports, so a future 4th value is exercised automatically.
    await page.goto(
      buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001', role: 'reviewer', run_type: 'official_run' })
    );
    await dismissGuidelineModal(page);
    const decisions: string[] = await page.evaluate(
      () => (window as any).LabelSuiteAnnotationWorkspaceData.REVIEW_DECISIONS
    );
    expect(decisions.length).toBeGreaterThan(0);

    for (let i = 0; i < decisions.length; i += 1) {
      const decision = decisions[i];
      const annotatorId = `issue-804-drift-guard-${i}`;

      // issue #970: make this iteration's unit real -- a genuine annotator
      // submission under a fresh id lands it in FR-055's "actually-submitted
      // annotator" enumeration source, so FR-093's assignment derivation
      // (issue #921) can resolve a real assignee for it below.
      await page.goto(
        buildWorkspaceUrl({
          task_id: 'T001', sample_id: 'sent-001', role: 'annotator', run_type: 'official_run', annotator_id: annotatorId,
        })
      );
      await dismissGuidelineModal(page);
      await page.getByTestId('ws-single-label-chip-negative').click();
      await page.getByTestId('ws-submit-btn').click();

      const reviewerId = await resolveAssignedReviewerId(page, {
        task_id: 'T001', sample_id: 'sent-001', run_type: 'official_run', annotator_id: annotatorId,
      });
      const url = buildWorkspaceUrl({
        task_id: 'T001',
        sample_id: 'sent-001',
        role: 'reviewer',
        run_type: 'official_run',
        annotator_id: annotatorId,
        reviewer_id: reviewerId,
      });

      await page.goto(url);
      await dismissGuidelineModal(page);

      await page.getByTestId(`ws-review-row-${decision}`).click();
      // Whether this decision requires a reason is itself derived from
      // REVIEW_DECISIONS by the page (config.js:2852-2857, everything but
      // `approve`) -- filling it only when the field is actually mounted
      // keeps this generic instead of assuming which values need one.
      const reasonField = page.getByTestId('ws-review-reason');
      if (await reasonField.count()) {
        await reasonField.fill(`REVIEW_DECISIONS drift-guard reason (${decision})`);
      }

      await page.getByTestId('ws-review-submit-btn').click();
      await expect(page.locator('#toastMsg')).toHaveText('審核已送出');

      // issue #719: a non-finalizing submit can silently advance
      // currentIdentity.annotatorId to a different review unit. Re-navigate
      // to the exact unit just reviewed before reading its history.
      await page.goto(url);
      await dismissGuidelineModal(page);
      await page.getByTestId('ws-guideline-tab-history').click();

      const decisionBadge = page.locator(
        '#wsHistoryContainer .history-action-badge:not([data-action="submitted"])'
      );
      await expect(
        decisionBadge,
        `decision "${decision}" must produce exactly one non-wrapper history event (FR-086 emission point)`
      ).toHaveCount(1);

      const decisionCard = decisionBadge.locator('xpath=ancestor::div[contains(@class,"history-item")]');
      await expect(
        decisionCard.locator('.history-actor'),
        `decision "${decision}"'s history event must be attributed to the reviewer (AC-2.21)`
      ).toHaveText(`審核員 · ${reviewerId}`);
    }

    assertNoPageErrors(pageErrors);
  });
});
