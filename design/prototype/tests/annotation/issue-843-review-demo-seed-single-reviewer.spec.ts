import { test, expect, type Page } from '@playwright/test';
import { buildListUrl } from './_workspace-helpers';

/* Issue #843: the review-flow demo seed (T014-T016, seedReviewFlowDemo() in
 * annotation-workspace.data.js) pins two shapes the current single-owner-relay
 * model cannot produce:
 *
 *   A. FR-093 (v6.6.0 clarification, issue #815) + AC-6.12: every `official_run`
 *      seed row's reviewer set must contain EXACTLY ONE reviewer -- a `rev`
 *      map with two or more reviewer keys describes a state the model can
 *      never derive at runtime. T015 `ofs-03-arbitrated-gold` seeds
 *      `{ reviewer_wang, reviewer_li }`, a two-reviewer shape left over from
 *      the pre-issue-#551 majority-vote era.
 *
 *   B. FR-092: `approve` (通過) means "no objection", and an `official_run`
 *      or `dry_run` reviewer row that stores `approve` MUST carry the same
 *      answer value as the annotator -- a stored `approve` next to a
 *      DIFFERENT value is a shape FR-092 cannot produce (a value change is
 *      always `modify`, reason required). Several seed rows changed the
 *      value in `rev` without setting `modifyBy`, so `seedReviewFlowDemo()`
 *      defaults their decision to `approve` -- an invalid combination.
 *      `bypass` rows store no answer value (design.md D2's absent-value
 *      sentinel) and are exempt from this diff check.
 *
 * Traceability: specs/annotation/015-annotation-workspace/spec.md FR-092
 *   (line ~969), FR-093 (line ~970, v6.6.0 clarification), AC-6.12
 *   (line ~514); issue #843.
 *
 * Type declarations use local casts per `page.evaluate()` call, matching
 * issue-815-review-demo-seed-model-fit.spec.ts in this directory --
 * annotation-workspace-arbitration.spec.ts already owns the one
 * `declare global` for this window property in this directory; a second
 * declaration collides (TS2717).
 */

const RUN_TYPE_BY_TASK: Record<string, string> = {
  T014: 'dry_run',
  T015: 'official_run',
  T016: 'official_run',
};

type SeedUnit = {
  taskId: string;
  sampleId: string;
  annotatorId: string;
  reviewerCount: number;
};

type ReviewerOutcome = {
  taskId: string;
  sampleId: string;
  annotatorId: string;
  reviewerId: string;
  outKey: string;
  annotatorValue: unknown;
  reviewerValue: unknown;
  decision: string | undefined;
  reason: string | undefined;
};

type SeedProbe = { units: SeedUnit[]; outcomes: ReviewerOutcome[] };

async function collectSeedProbe(page: Page): Promise<SeedProbe> {
  return page.evaluate((runTypeByTask) => {
    const data = (window as unknown as {
      LabelSuiteAnnotationWorkspaceData: {
        REVIEWER_MOCK_ROWS: Record<string, Record<string, Array<{ annotator: string; answers: Record<string, unknown> }>>>;
        readReviewerSubmissions: (
          taskId: string, runType: string, sampleId: string, identity: { annotatorId: string }
        ) => Array<{
          reviewerId: string;
          answers?: {
            decisions?: Record<string, string>;
            reasons?: Record<string, string>;
            previewState?: Record<string, { selected?: unknown }>;
          };
        }>;
      };
    }).LabelSuiteAnnotationWorkspaceData;

    const units: SeedUnit[] = [];
    const outcomes: ReviewerOutcome[] = [];
    Object.keys(runTypeByTask).forEach((taskId) => {
      const runType = runTypeByTask[taskId];
      const samples = data.REVIEWER_MOCK_ROWS[taskId] || {};
      Object.keys(samples).forEach((sampleId) => {
        samples[sampleId].forEach((row) => {
          const identity = { annotatorId: row.annotator };
          const outKeys = Object.keys(row.answers || {});
          const submissions = data.readReviewerSubmissions(taskId, runType, sampleId, identity);
          units.push({ taskId, sampleId, annotatorId: row.annotator, reviewerCount: submissions.length });
          submissions.forEach((submission) => {
            outKeys.forEach((outKey) => {
              outcomes.push({
                taskId,
                sampleId,
                annotatorId: row.annotator,
                reviewerId: submission.reviewerId,
                outKey,
                annotatorValue: row.answers[outKey],
                reviewerValue: submission.answers?.previewState?.[outKey]?.selected,
                decision: submission.answers?.decisions?.[outKey],
                reason: submission.answers?.reasons?.[outKey],
              });
            });
          });
        });
      });
    });
    return { units, outcomes };
  }, RUN_TYPE_BY_TASK);
}

test.describe('review-flow demo seed: single reviewer + modify decision on changed values (issue #843)', () => {
  test('every T014-T016 review unit with a reviewer submission has exactly one reviewer (FR-093, AC-6.12)', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: 'T016', role: 'reviewer', run_type: 'official_run', reviewer_id: 'reviewer_wang' }));
    const probe = await collectSeedProbe(page);

    const reviewedUnits = probe.units.filter((unit) => unit.reviewerCount > 0);
    expect(reviewedUnits.length, 'no reviewed seed units found at all -- probe is vacuous').toBeGreaterThan(0);

    for (const taskId of Object.keys(RUN_TYPE_BY_TASK)) {
      const reviewedForTask = reviewedUnits.filter((unit) => unit.taskId === taskId);
      expect(reviewedForTask.length, `${taskId} has no reviewed units -- probe is vacuous for this task`).toBeGreaterThan(0);
    }

    const offenders = reviewedUnits.filter((unit) => unit.reviewerCount !== 1);
    expect(
      offenders.map((unit) => `${unit.taskId}/${unit.sampleId} (annotator ${unit.annotatorId}): reviewerCount=${unit.reviewerCount}`),
      'seed row(s) register more (or fewer) than exactly one reviewer for an official_run/dry_run unit (FR-093, AC-6.12)'
    ).toEqual([]);
  });

  test('every reviewer submission with a changed answer value stores a reasoned "modify" decision (FR-092, FR-016A)', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: 'T016', role: 'reviewer', run_type: 'official_run', reviewer_id: 'reviewer_wang' }));
    const probe = await collectSeedProbe(page);

    expect(probe.outcomes.length, 'no reviewer outcomes found at all -- probe is vacuous').toBeGreaterThan(0);

    const changedValueOutcomes = probe.outcomes.filter(
      (o) => o.reviewerValue !== undefined && o.reviewerValue !== o.annotatorValue
    );
    expect(changedValueOutcomes.length, 'no seed row changes the reviewer value away from the annotator value -- probe is vacuous').toBeGreaterThan(0);

    const offenders = changedValueOutcomes.filter(
      (o) => o.decision !== 'modify' || typeof o.reason !== 'string' || o.reason.trim() === ''
    );
    expect(
      offenders.map(
        (o) =>
          `${o.taskId}/${o.sampleId} (annotator ${o.annotatorId}, reviewer ${o.reviewerId}, outKey ${o.outKey}): ` +
          `annotatorValue=${JSON.stringify(o.annotatorValue)} reviewerValue=${JSON.stringify(o.reviewerValue)} decision=${o.decision} reason=${JSON.stringify(o.reason)}`
      ),
      'changed answer value not stored as a reasoned "modify" -- FR-092 approve means no objection to the annotator value, so a changed value must be "modify", and FR-016A requires its reason'
    ).toEqual([]);
  });
});
