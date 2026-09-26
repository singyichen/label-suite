/**
 * issue #1000 -- `filterUnitsToAssigned()`'s issue #956 sticky disjunct
 * (annotation-workspace.config.js:1656-1701) currently reads:
 *
 *   return isCurrentUnit(unit) &&
 *     data.isArbitrationSubmitted(
 *       currentProfile.id, currentRunType, unit.recordId, unitIdentity(unit),
 *       state.selectedOutputTypes);
 *
 * The maintainer ruled in issue #1000 that the `isCurrentUnit(unit) &&`
 * qualifier must be dropped: once an arbiter has submitted an arbitration
 * vote on a unit (`isArbitrationSubmitted()`, annotation-workspace.data.js
 * :2975), that unit must stay permanently sticky in the arbiter's own left
 * column/nav -- not only while it happens to be the currently open unit.
 * `isArbitrationSubmitted()`'s own contract already scopes this to "did
 * THIS arbiter submit," so dropping `isCurrentUnit()` cannot resurrect a
 * unit some OTHER arbiter finalized, nor one that was finalized without
 * ever being disputed at all (`getDisputeItems()`,
 * annotation-workspace.data.js:2584, returns `[]` for those, and
 * `isArbitrationSubmitted()` short-circuits to `false` on an empty list).
 *
 * Fixture: T015 official_run (roster and sticky facts taken verbatim from
 * issue-956-workspace-left-column-filter.spec.ts's header, already verified
 * against that spec's merged PR):
 *   - LI_OWNED_SAMPLE  = 'ofs-02-modified-dispute' -- sticky to reviewer_li,
 *     DISPUTED. Also the only unit reviewer_chen (T015's one can_arbitrate
 *     roster member) may arbitrate on this task via the FR-060 disjunct.
 *   - ARBITRATED_SAMPLE = 'ofs-03-arbitrated-gold' -- sticky to
 *     reviewer_lin, FINALIZED by a real, past `reviewer_chen` arbitration
 *     vote (annotation-workspace.data.js's REVIEW_FLOW_DEMO_SEED_KEY_V4
 *     bootstrap seed: row `{ t: 'T015', ..., s: 'ofs-03-arbitrated-gold',
 *     a: 'kioleemg12', ... arb: 'neutral', ... }` is finalized via
 *     `submitArbitration(row.t, row.r, row.s, { annotatorId: row.a,
 *     reviewerId: 'reviewer_chen' }, ...)` -- annotation-workspace.data.js
 *     :3581,3690).
 *   - AGREE_SAMPLE = 'ofs-01-agree-gold' -- sticky to reviewer_wang,
 *     FINALIZED, but by unanimous agreement: no reviewer ever disagreed
 *     with the annotator on it, so `getDisputeItems()` returns `[]` for
 *     every identity and `isArbitrationSubmitted()` is `false` for
 *     everyone, `reviewer_chen` included. This is the case (a)/(b) fixes
 *     must NOT resurrect.
 * T001 official_run/sent-001 and sent-002 (case (a)): mirrors
 * issue-722-arbiter-progress-counter.spec.ts's own T001/sent-001 fixture
 * (annotator kioleemg12 vs. reviewer reviewer_wang -> disputed,
 * reviewer_chen is `can_arbitrate`-eligible and holds zero ordinary T001
 * FR-093 assignments, issue #868) plus a second, freshly-seeded disputed
 * unit at sent-002/113450022 so reviewer_chen's left column holds two
 * units to switch between without ever leaving T001.
 *
 * Expected outcomes against the CURRENT (unpatched) code:
 *   (a) may or may not hold -- see its own in-test comment for why even
 *       this "regression guard" case is not guaranteed to pass today.
 *   (b) MUST FAIL -- ARBITRATED_SAMPLE is never the current unit in this
 *       test, so the current `isCurrentUnit(unit) &&` qualifier excludes it.
 *   (c) MUST PASS -- AGREE_SAMPLE was never disputed, so neither disjunct
 *       ever matches it, on the current code or the fixed code.
 *   (d) MUST PASS -- reviewer_wang is not `can_arbitrate` and has submitted
 *       no arbitration vote anywhere, so `isArbitrationSubmitted()` is
 *       `false` for every unit under wang's identity regardless of how the
 *       disjunct is scoped.
 */
import { test, expect, type Page } from '@playwright/test';
import {
  buildWorkspaceUrl,
  skipGuidelineModal,
  trackPageErrors,
  assertNoPageErrors,
  fillArbitrationReasons,
} from './_workspace-helpers';

/* Same known static-server <script src> flake guard as the sibling review-
 * unit specs (issue #582 lineage, reused by issue-956-workspace-left-column
 * -filter.spec.ts). */
test.describe.configure({ retries: 2 });

const TASK_015 = 'T015';
const RUN_015 = 'official_run';
const REVIEWER_CHEN = 'reviewer_chen'; // T015's only can_arbitrate roster member
const REVIEWER_WANG = 'reviewer_wang'; // plain reviewer, never can_arbitrate

const LI_OWNED_SAMPLE = 'ofs-02-modified-dispute'; // sticky reviewer_li, DISPUTED
const LI_OWNED_ANNOTATOR = 'kioleemg12'; // T015's fixed official_run annotator
const ARBITRATED_SAMPLE = 'ofs-03-arbitrated-gold'; // sticky reviewer_lin, FINALIZED by reviewer_chen's past vote
const AGREE_SAMPLE = 'ofs-01-agree-gold'; // sticky reviewer_wang, FINALIZED by unanimous agreement (never disputed)

type WorkspaceData = {
  markSampleSubmitted: (
    taskId: string,
    role: string,
    runType: string,
    sampleId: string,
    payload: unknown,
    historySummary: string,
    identity: { annotatorId?: string; reviewerId?: string }
  ) => void;
};

const labelPayload = (selected: string) => ({ previewState: { single_label: { selected } } });

function seedDisputedUnit(
  page: Page,
  args: { task: string; sample: string; annotator: string; participant: string; annotatorLabel: string; reviewerLabel: string }
): Promise<void> {
  return page.evaluate(
    (a) => {
      const data = (window as unknown as { LabelSuiteAnnotationWorkspaceData: WorkspaceData })
        .LabelSuiteAnnotationWorkspaceData;
      data.markSampleSubmitted(
        a.task, 'annotator', 'official_run', a.sample, { previewState: { single_label: { selected: a.annotatorLabel } } }, '',
        { annotatorId: a.annotator }
      );
      data.markSampleSubmitted(
        a.task, 'reviewer', 'official_run', a.sample, { previewState: { single_label: { selected: a.reviewerLabel } } }, '',
        { annotatorId: a.annotator, reviewerId: a.participant }
      );
    },
    args
  );
}

test.describe('issue #1000 -- arbitration sticky must survive switching away, not just re-selecting', () => {
  const TASK = 'T001';
  const UNIT_A_SAMPLE = 'sent-001';
  const UNIT_A_ANNOTATOR = 'kioleemg12'; // mirrors issue-722's fixture verbatim
  const UNIT_A_PARTICIPANT = 'reviewer_wang';
  const UNIT_B_SAMPLE = 'sent-002';
  const UNIT_B_ANNOTATOR = '113450022'; // distinct unit (sample x annotator) from A
  const UNIT_B_PARTICIPANT = 'reviewer_wang';

  test("(a) after submitting arbitration on unit A, switching to unit B and back still shows unit A in the left column", async ({
    page,
  }) => {
    const errors = trackPageErrors(page);
    await skipGuidelineModal(page);
    await page.goto(
      buildWorkspaceUrl({
        task_id: TASK, sample_id: UNIT_A_SAMPLE, role: 'reviewer', run_type: 'official_run',
        annotator_id: UNIT_A_ANNOTATOR, reviewer_id: REVIEWER_CHEN,
      })
    );
    await seedDisputedUnit(page, {
      task: TASK, sample: UNIT_A_SAMPLE, annotator: UNIT_A_ANNOTATOR, participant: UNIT_A_PARTICIPANT,
      annotatorLabel: 'sad', reviewerLabel: 'fear',
    });
    await seedDisputedUnit(page, {
      task: TASK, sample: UNIT_B_SAMPLE, annotator: UNIT_B_ANNOTATOR, participant: UNIT_B_PARTICIPANT,
      annotatorLabel: 'joy', reviewerLabel: 'anger',
    });
    await page.reload();

    const unitA = page.locator(
      `[data-testid="ws-sample-item"][data-sample-id="${UNIT_A_SAMPLE}"][data-annotator-id="${UNIT_A_ANNOTATOR}"]`
    );
    const unitB = page.locator(
      `[data-testid="ws-sample-item"][data-sample-id="${UNIT_B_SAMPLE}"][data-annotator-id="${UNIT_B_ANNOTATOR}"]`
    );

    // Sanity -- both disputed units start out visible to reviewer_chen (this
    // is what gives us a second unit to switch to, staying inside T001 so
    // the left column click itself never needs a page reload).
    await expect(unitA).toHaveCount(1);
    await expect(unitB).toHaveCount(1);

    // Submit reviewer_chen's arbitration vote on unit A, which is the
    // currently open unit at this point.
    await expect(page.getByTestId('ws-arbitration-card')).toBeVisible();
    await page.getByTestId('ws-arbitration-choose-b').click();
    await fillArbitrationReasons(page);
    await page.getByTestId('ws-arbitration-submit').click();

    // Switch to unit B via the left column (no reload).
    await unitB.click();
    await expect(page.getByTestId('ws-arbitration-card')).toBeVisible();

    // Switch back to unit A via the left column (no reload) and assert it
    // is still enumerated. NOTE: this is the case the task brief flagged as
    // possibly already broken today -- filterUnitsToAssigned()'s sticky
    // disjunct is scoped to `isCurrentUnit(unit) &&`, and `isCurrentUnit()`
    // is evaluated against whatever `currentSampleId`/`currentAnnotatorId()`
    // are AT RENDER TIME. The moment the click above makes B the current
    // unit, A's own isCurrentUnit(A) check goes false too, and A's status
    // has already left DISPUTED (it was just arbitrated) -- so BOTH
    // disjuncts miss it and it may vanish from the left column while B is
    // open, before we ever get a chance to click back on it. If that is
    // what happens, `unitA.click()` below has nothing to click and this
    // assertion fails for real, not for a contrived reason.
    await unitA.click();
    await expect(unitA).toHaveCount(1);

    assertNoPageErrors(errors);
  });
});

test.describe('issue #1000 -- historically-arbitrated units stay sticky even when never the current unit', () => {
  test("(b) reviewer_chen's left column includes ofs-03-arbitrated-gold even while viewing a different unit", async ({
    page,
  }) => {
    const errors = trackPageErrors(page);
    await skipGuidelineModal(page);
    // Opens on LI_OWNED_SAMPLE, NOT ARBITRATED_SAMPLE -- ARBITRATED_SAMPLE is
    // never the current unit anywhere in this test.
    await page.goto(
      buildWorkspaceUrl({
        task_id: TASK_015, sample_id: LI_OWNED_SAMPLE, role: 'reviewer', run_type: RUN_015,
        annotator_id: LI_OWNED_ANNOTATOR, reviewer_id: REVIEWER_CHEN,
      })
    );

    // Core Red assertion: reviewer_chen submitted a real arbitration vote on
    // ARBITRATED_SAMPLE in the past (the demo seed's finalized-by-arbitration
    // row) -- issue #1000 requires this unit to stay in the left column
    // permanently, not only while it is the open unit. Under the current,
    // unpatched `isCurrentUnit(unit) &&` qualifier this MUST fail (count 0).
    await expect(
      page.locator(
        `[data-testid="ws-sample-item"][data-sample-id="${ARBITRATED_SAMPLE}"][data-annotator-id="${LI_OWNED_ANNOTATOR}"]`
      )
    ).toHaveCount(1);

    assertNoPageErrors(errors);
  });
});

test.describe('issue #1000 -- boundary: a finalized unit this arbiter never voted on stays excluded', () => {
  test("(c) reviewer_chen's left column excludes ofs-01-agree-gold, which was finalized by unanimous agreement and never arbitrated by anyone", async ({
    page,
  }) => {
    const errors = trackPageErrors(page);
    await skipGuidelineModal(page);
    await page.goto(
      buildWorkspaceUrl({
        task_id: TASK_015, sample_id: LI_OWNED_SAMPLE, role: 'reviewer', run_type: RUN_015,
        annotator_id: LI_OWNED_ANNOTATOR, reviewer_id: REVIEWER_CHEN,
      })
    );

    // AGREE_SAMPLE was never disputed (unanimous agreement), so
    // getDisputeItems() returns [] for every identity and
    // isArbitrationSubmitted() is false for reviewer_chen too --
    // dropping `isCurrentUnit()` in the Green fix must not resurrect this
    // unit. Guards against a naive "always sticky" implementation that
    // revives every finalized unit instead of only ones this arbiter
    // actually voted on.
    await expect(
      page.locator(`[data-testid="ws-sample-item"][data-sample-id="${AGREE_SAMPLE}"]`)
    ).toHaveCount(0);

    assertNoPageErrors(errors);
  });
});

test.describe('issue #1000 -- a plain (non-arbiter) reviewer is unaffected', () => {
  const ASSIGNED_UNITS = { dry_run: 6, official_run: 5 } as const;

  for (const runType of ['dry_run', 'official_run'] as const) {
    test(`(d) ${runType}: reviewer_wang's left column still has exactly ${ASSIGNED_UNITS[runType]} entries`, async ({
      page,
    }) => {
      const errors = trackPageErrors(page);
      await skipGuidelineModal(page);
      await page.goto(
        buildWorkspaceUrl({
          task_id: 'T001', sample_id: 'sent-001', role: 'reviewer', run_type: runType,
          reviewer_id: REVIEWER_WANG,
        })
      );

      // reviewer_wang is not can_arbitrate and has never submitted an
      // arbitration vote anywhere, so isArbitrationSubmitted() evaluates to
      // false for every unit under wang's own identity -- the disjunct's
      // scoping change must not add or remove anything from wang's count,
      // which matches the same FR-093-assigned count issue-956's own
      // contract test already pins for reviewer_wang on this task.
      await expect(page.getByTestId('ws-sample-item')).toHaveCount(ASSIGNED_UNITS[runType]);

      assertNoPageErrors(errors);
    });
  }
});
