import { test, expect, type Page } from '@playwright/test';
import { buildListUrl } from './_workspace-helpers';

/* Issue #837 (maintainer ruling, 2026-09-19): the review-flow demo seed's
 * T014 dry_run row dry-05-pending-review still seeds a reviewer-level
 * `reject` decision (`rejectBy: 'reviewer_wang'`,
 * annotation-workspace.data.js ~line 3128) even though `REVIEW_DECISIONS`
 * has been `approve | modify | bypass` only since v5.0.0 (issue #596) --
 * `reject` survives solely as an ARBITRATION_OUTCOMES value, never a
 * reviewer decision. The maintainer ruled that dry_run reviewer-level
 * reject is retired too, so dry-05 must be rewritten into a shape the
 * current decision set can express.
 *
 * Issue #815's Group 1 Red (annotation-review-flow-demo-seed.spec.ts
 * sibling issue-815-review-demo-seed-model-fit.spec.ts, commits `a1cba0e6`
 * / `96ec6d9a`) scoped an equivalent guard to T016 only, specifically
 * *because of* this dry-05 row -- it was T014's own committed non-goal at
 * the time (proposal.md 非目標). This test widens that guard from T016 to
 * the whole T014-T016 review-flow demo seed so dry-05's reject is caught,
 * closing the gap #815 deliberately left open for this issue.
 *
 * Assertion pins STORED DECISION VALUES (`decisions.includes('reject')`),
 * not derived unit status -- dry-05's derived status ('disputed') can stay
 * the same either way the seed is rewritten and would hide the defect.
 *
 * Traceability: specs/annotation/015-annotation-workspace/spec.md FR-044,
 *   FR-092 (line ~969); issue #596 (REVIEW_DECISIONS closed to
 *   approve/modify/bypass); issue #815 tasks.md 1.1 item 4 (T016-only
 *   scoping and its stated reason); issue #837.
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
  decisions: string[];
};

type SeedProbe = { units: SeedUnit[] };

async function collectSeedProbe(page: Page): Promise<SeedProbe> {
  return page.evaluate((runTypeByTask) => {
    const data = (window as unknown as {
      LabelSuiteAnnotationWorkspaceData: {
        REVIEWER_MOCK_ROWS: Record<string, Record<string, Array<{ annotator: string; answers: Record<string, unknown> }>>>;
        readReviewerSubmissions: (
          taskId: string, runType: string, sampleId: string, identity: { annotatorId: string }
        ) => Array<{ reviewerId: string; answers?: { decisions?: Record<string, string> } }>;
      };
    }).LabelSuiteAnnotationWorkspaceData;

    const units: SeedUnit[] = [];
    Object.keys(runTypeByTask).forEach((taskId) => {
      const runType = runTypeByTask[taskId];
      const samples = data.REVIEWER_MOCK_ROWS[taskId] || {};
      Object.keys(samples).forEach((sampleId) => {
        samples[sampleId].forEach((row) => {
          const identity = { annotatorId: row.annotator };
          const submissions = data.readReviewerSubmissions(taskId, runType, sampleId, identity);
          const decisions: string[] = [];
          submissions.forEach((submission) => {
            Object.values(submission.answers?.decisions || {}).forEach((decision) => decisions.push(decision));
          });
          units.push({
            taskId,
            sampleId,
            annotatorId: row.annotator,
            reviewerCount: submissions.length,
            decisions,
          });
        });
      });
    });
    return { units };
  }, RUN_TYPE_BY_TASK);
}

test.describe('review-flow demo seed: no reviewer-level reject anywhere in T014-T016 (issue #837)', () => {
  test('T014 dry_run has reviewed units with recorded decisions (probe is not vacuous)', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: 'T014', role: 'reviewer', run_type: 'dry_run', reviewer_id: 'reviewer_wang' }));
    const probe = await collectSeedProbe(page);

    const t014Reviewed = probe.units.filter((unit) => unit.taskId === 'T014' && unit.reviewerCount > 0);
    expect(t014Reviewed.length, 'no T014 dry_run reviewed seed units found -- probe is vacuous').toBeGreaterThan(0);

    const t014Decisions = t014Reviewed.flatMap((unit) => unit.decisions);
    expect(t014Decisions.length, 'no T014 dry_run reviewer decisions recorded at all -- probe is vacuous').toBeGreaterThan(0);
  });

  test('no T014-T016 unit stores a reviewer-level "reject" decision', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: 'T014', role: 'reviewer', run_type: 'dry_run', reviewer_id: 'reviewer_wang' }));
    const probe = await collectSeedProbe(page);

    const offenders = probe.units.filter((unit) => unit.decisions.includes('reject'));
    expect(
      offenders.map((unit) => `${unit.taskId}/${unit.sampleId} (annotator ${unit.annotatorId}): decisions=${JSON.stringify(unit.decisions)}`),
      'reviewer-level "reject" decision found -- REVIEW_DECISIONS only allows approve/modify/bypass since v5.0.0 (issue #596), and the maintainer ruled dry_run reviewer-level reject retired too (issue #837)'
    ).toEqual([]);
  });
});
