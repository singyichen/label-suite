/**
 * issue #956 -- `buildUnits()` (annotation-workspace.config.js:1625) still
 * enumerates EVERY review unit of a task into the reviewer's left column and
 * nav, unfiltered by FR-093 assignment. `annotation-list.html`'s
 * `filterToAssignedUnits()` (issue #824, annotation-list.html:1858) already
 * narrows its own rows to only the units `getAssignedReviewUnits()`
 * (annotation-workspace.data.js:2556) deals to the current reviewer_id; the
 * workspace's own comment at buildUnits() (annotation-workspace.config.js
 * :1619-1624) explicitly defers this narrowing to this issue. This spec pins
 * the contract the fix owes: the workspace's left column must agree with
 * annotation-list.html's already-correct filter, unit for unit.
 *
 * issue #921's own regression spec (issue-921-review-assignment-gate.spec.ts)
 * already covers the SUBMIT gate on a direct-URL unassigned unit and its own
 * arbiter-exemption regression guard -- its header comment explicitly scopes
 * left-column narrowing out to here. Fixture facts (T015 official_run roster,
 * sticky assignment table, reviewer_chen's arbiter-only standing) are taken
 * verbatim from that spec's header, already verified correct by its merged
 * PR. The T001 fixture and its ASSIGNED_UNITS constant are taken from
 * annotation-list-reviewer.spec.ts, which already proves those counts correct
 * against annotation-list.html -- (b) below re-asserts the identical counts
 * against the workspace page, so the two pages can never silently disagree.
 *
 * Every assertion here is expected to FAIL against the current, unpatched
 * buildUnits(): nothing filters the left column yet, so unassigned units
 * still render (a), the raw per-task unit count still shows instead of the
 * per-reviewer assigned count (b), and reviewer_chen's arbiter-only left
 * column still shows the full unfiltered unit set instead of exactly the one
 * unit chen may arbitrate (c).
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
 * unit specs (issue #582 lineage, reused by issue-921-review-assignment-gate
 * .spec.ts). */
test.describe.configure({ retries: 2 });

const TASK_015 = 'T015';
const RUN_015 = 'official_run';

const REVIEWER_LI = 'reviewer_li';
const REVIEWER_CHEN = 'reviewer_chen'; // T015's only can_arbitrate roster member

/* Sticky to reviewer_li, DISPUTED -- reviewer_li's only T015 official_run
 * unit. Also the only unit reviewer_chen may arbitrate on this task (chen
 * has never submitted on it and can_arbitrate is set). */
const LI_OWNED_SAMPLE = 'ofs-02-modified-dispute';
/* T015's annotator for every official_run row is DEFAULT_ANNOTATOR_ID
 * ('kioleemg12', annotation-workspace.data.js:210,3466) -- each sample has
 * exactly one annotator submission on this task. */
const LI_OWNED_ANNOTATOR = 'kioleemg12';

const WANG_OWNED_SAMPLE = 'ofs-04-pending-review'; // sticky to reviewer_wang, PENDING
const ARBITRATED_SAMPLE = 'ofs-03-arbitrated-gold'; // sticky to reviewer_lin, FINALIZED
const AGREE_SAMPLE = 'ofs-01-agree-gold'; // sticky to reviewer_wang, FINALIZED

test.describe('Unassigned units do not appear in the workspace left column', () => {
  test("reviewer_li's left column shows only ofs-02 -- the other three T015 units are absent", async ({ page }) => {
    const errors = trackPageErrors(page);
    await skipGuidelineModal(page);
    await page.goto(
      buildWorkspaceUrl({
        task_id: TASK_015,
        sample_id: LI_OWNED_SAMPLE,
        role: 'reviewer',
        run_type: RUN_015,
        reviewer_id: REVIEWER_LI,
      })
    );

    await expect(
      page.locator(`[data-testid="ws-sample-item"][data-sample-id="${AGREE_SAMPLE}"]`)
    ).toHaveCount(0);
    await expect(
      page.locator(`[data-testid="ws-sample-item"][data-sample-id="${ARBITRATED_SAMPLE}"]`)
    ).toHaveCount(0);
    await expect(
      page.locator(`[data-testid="ws-sample-item"][data-sample-id="${WANG_OWNED_SAMPLE}"]`)
    ).toHaveCount(0);

    // li's own assigned unit is still there.
    await expect(
      page.locator(`[data-testid="ws-sample-item"][data-sample-id="${LI_OWNED_SAMPLE}"]`)
    ).toHaveCount(1);

    assertNoPageErrors(errors);
  });
});

test.describe('Assigned units still appear, and the count matches annotation-list.html', () => {
  /* T001 ships 5 dataset records x 3 mock annotators = 15 review units.
   * annotation-list-reviewer.spec.ts already proves reviewer_wang's (the
   * default identity) FR-093 share of that universe is 6 in dry_run and 5
   * in official_run, verified against annotation-list.html's
   * filterToAssignedUnits(). The workspace left column must report the
   * identical counts once buildUnits() applies the same filter. */
  const ASSIGNED_UNITS = { dry_run: 6, official_run: 5 } as const;

  for (const runType of ['dry_run', 'official_run'] as const) {
    test(`${runType}: reviewer_wang's left column has exactly ${ASSIGNED_UNITS[runType]} entries`, async ({
      page,
    }) => {
      const errors = trackPageErrors(page);
      await skipGuidelineModal(page);
      await page.goto(
        buildWorkspaceUrl({
          task_id: 'T001',
          sample_id: 'sent-001',
          role: 'reviewer',
          run_type: runType,
        })
      );

      await expect(page.getByTestId('ws-sample-item')).toHaveCount(ASSIGNED_UNITS[runType]);

      assertNoPageErrors(errors);
    });
  }
});

test.describe('Arbiter exemption is not blocked by the new filter', () => {
  test('reviewer_chen (never submitted on ofs-02, can_arbitrate) sees exactly that one unit, and can still arbitrate it', async ({
    page,
  }) => {
    const errors = trackPageErrors(page);
    await skipGuidelineModal(page);
    await page.goto(
      buildWorkspaceUrl({
        task_id: TASK_015,
        sample_id: LI_OWNED_SAMPLE,
        role: 'reviewer',
        run_type: RUN_015,
        reviewer_id: REVIEWER_CHEN,
      })
    );

    /* chen holds zero ordinary FR-093 assignments on T015 (excluded from the
     * round-robin pool entirely, issue #868) -- if the left-column filter
     * only consults getAssignedReviewUnits(), chen's column would be
     * completely empty. The arbiter exemption must still surface exactly
     * the one unit chen may arbitrate, no more and no fewer. */
    const items = page.getByTestId('ws-sample-item');
    await expect(items).toHaveCount(1);
    await expect(
      page.locator(
        `[data-testid="ws-sample-item"][data-sample-id="${LI_OWNED_SAMPLE}"][data-annotator-id="${LI_OWNED_ANNOTATOR}"]`
      )
    ).toHaveCount(1);

    // Selecting that entry must still reach the arbitration card, with a
    // submit control that is not hidden -- chen's lack of an ordinary
    // assignment must never block the arbitration entry point itself
    // (regression guard for issue #921's own arbiter-exemption fix).
    await items.first().click();
    await expect(page.getByTestId('ws-arbitration-card')).toBeVisible();
    await expect(page.locator('#wsArbitrationSubmitBtn')).toBeVisible();

    assertNoPageErrors(errors);
  });
});

test.describe('Arbiter sticky visibility -- issue #722 progress-counter regression guard', () => {
  /* filterUnitsToAssigned()'s FR-060 disjunct only re-admits a unit that is
   * NOT this reviewer's own FR-093 assignment when it is both DISPUTED and
   * `isArbiterCandidate()`-eligible. The moment the arbiter actually submits
   * an arbitration vote, the unit's status moves off DISPUTED (or, in some
   * outcomes, the vote itself already counts against it) -- so the disjunct
   * stops matching and the unit silently drops out of the arbiter's own left
   * column and nav mid-session, with no reload. That breaks issue #722's
   * contract that the arbiter's progress counter advances immediately after
   * submitting: the counter's denominator is driven by exactly this same
   * enumerated-units list, so a unit that vanishes here is a unit issue #722
   * can no longer count. This test asserts the unit stays enumerated in the
   * left column across the submit, independent of the counter text itself
   * (issue-722-arbiter-progress-counter.spec.ts already owns that assertion).
   *
   * Fixture mirrors issue-722-arbiter-progress-counter.spec.ts verbatim:
   * T001/sent-001, annotator kioleemg12 says 'sad', the unit's one assigned
   * reviewer (reviewer_wang) says 'fear' -> disputed with a single dispute
   * item. reviewer_chen (can_arbitrate: true, not a participant) is FR-060
   * eligible to arbitrate it.
   */
  const TASK = 'T001';
  const SAMPLE = 'sent-001';
  const ANNOTATOR = 'kioleemg12';
  const PARTICIPANT = 'reviewer_wang';
  const ARBITER = 'reviewer_chen'; // can_arbitrate: true
  const labelPayload = (selected: string) => ({ previewState: { single_label: { selected } } });

  type WorkspaceData = {
    markSampleSubmitted: (
      taskId: string, role: string, runType: string, sampleId: string,
      payload: unknown, historySummary: string,
      identity: { annotatorId?: string; reviewerId?: string }
    ) => void;
  };

  function seedDisputedUnit(page: Page): Promise<void> {
    return page.evaluate(
      (a) => {
        const data = (window as unknown as { LabelSuiteAnnotationWorkspaceData: WorkspaceData })
          .LabelSuiteAnnotationWorkspaceData;
        data.markSampleSubmitted(
          a.task, 'annotator', 'official_run', a.sample, a.annotatorPayload, '', { annotatorId: a.annotator }
        );
        data.markSampleSubmitted(
          a.task, 'reviewer', 'official_run', a.sample, a.reviewerPayload, '',
          { annotatorId: a.annotator, reviewerId: a.participant }
        );
      },
      {
        task: TASK, sample: SAMPLE, annotator: ANNOTATOR, participant: PARTICIPANT,
        annotatorPayload: labelPayload('sad'), reviewerPayload: labelPayload('fear'),
      }
    );
  }

  test("reviewer_chen's left column still shows the disputed unit after submitting the arbitration vote", async ({
    page,
  }) => {
    const errors = trackPageErrors(page);
    await skipGuidelineModal(page);
    await page.goto(
      buildWorkspaceUrl({
        task_id: TASK, sample_id: SAMPLE, role: 'reviewer', run_type: 'official_run',
        annotator_id: ANNOTATOR, reviewer_id: ARBITER,
      })
    );
    await seedDisputedUnit(page);
    await page.reload();

    const unitLocator = page.locator(
      `[data-testid="ws-sample-item"][data-sample-id="${SAMPLE}"][data-annotator-id="${ANNOTATOR}"]`
    );

    // Sanity check -- the unit must be visible in the left column BEFORE
    // arbitrating (mirrors issue-722's first test, re-confirmed here because
    // this test's flow depends on it).
    await expect(unitLocator).toHaveCount(1);

    await page.getByTestId('ws-arbitration-choose-b').click();
    await fillArbitrationReasons(page);
    await page.getByTestId('ws-arbitration-submit').click();

    // Core regression assertion: the unit must remain enumerated in the
    // arbiter's own left column after the vote -- filterUnitsToAssigned()'s
    // DISPUTED-status disjunct must not go stale the moment this arbiter's
    // own submission changes that very status.
    await expect(unitLocator).toHaveCount(1);

    assertNoPageErrors(errors);
  });
});
