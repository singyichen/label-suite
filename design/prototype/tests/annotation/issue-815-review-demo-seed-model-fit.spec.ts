import { test, expect, type Page } from '@playwright/test';
import { buildListUrl, skipGuidelineModal } from './_workspace-helpers';

/* Issue #815 (OpenSpec change retire-stale-review-demo-fixtures) task 1.1,
 * PR-815-A. tasks.md 1.1 pins four things about the review-flow demo seed
 * (T014-T017) against the current single-owner-relay model (v5.0.0,
 * FR-093/FR-092/FR-061/FR-095):
 *
 *   1. every T016 official_run review unit has exactly one reviewer
 *      (FR-093) -- ofm-04/ofm-05 today seed THREE reviewers each, a shape
 *      the current derivation cannot produce from a live user action.
 *   2. the whole seed set (T014-T017) witnesses all three REVIEW_DECISIONS
 *      values (approve/modify/bypass) at least once -- `bypass` has zero
 *      seed rows anywhere today.
 *   3. a unit exists whose arbitration outcome is 兩者皆非 (reject), the
 *      unit stays disputed, and it is queued in the final exception pool
 *      (FR-061 point 3, FR-095). Scoped to T016 (not "whole set", not bound
 *      to T017's oft-01-final-exception by id): T017's oft-01 already
 *      satisfies this today, so a whole-set-scoped assertion would already
 *      be green before this group's Green work even lands, contradicting
 *      tasks.md 1.1's "expected failure 必須是前三項同時紅". Scoping to
 *      T016 -- this group's own rewrite target -- keeps the assertion red
 *      today (T016 has no arbReject row yet) and green once 1.2 migrates
 *      oft-01's content into ofm-05, without hardcoding either the old or
 *      the migrated sample id.
 *   4. no reviewer-level "reject" decision exists anywhere in the whole
 *      seed set -- REVIEW_DECISIONS has been approve/modify/bypass only
 *      since v5.0.0; `reject` survives solely as an ARBITRATION_OUTCOMES
 *      value. Scoped whole-set per tasks.md 1.1's literal "整組種子" --
 *      note T014's dry-05-pending-review `rejectBy` is an explicit
 *      proposal.md 非目標 (never addressed by this change's five groups),
 *      so this assertion cannot go green under this change's current scope
 *      even after every later group lands; flagged in the PR-815-A handback
 *      for team-lead, not silently narrowed here.
 *
 * Type declarations use local casts per `page.evaluate()` call, matching
 * annotation-review-flow-demo-seed.spec.ts and issue-596-arbitration.spec.ts
 * -- annotation-workspace-arbitration.spec.ts already owns the one
 * `declare global` for this window property in this directory; a second
 * declaration collides (TS2717).
 *
 * Traceability: specs/annotation/015-annotation-workspace/spec.md FR-044,
 *   FR-092, FR-093, FR-061, FR-095;
 *   openspec/changes/retire-stale-review-demo-fixtures/tasks.md 1.1,
 *   proposal.md 非目標; issue #815
 */

const RUN_TYPE_BY_TASK: Record<string, string> = {
  T014: 'dry_run',
  T015: 'official_run',
  T016: 'official_run',
  T017: 'official_run',
};

type ArbitrationState = Record<
  string,
  { votes?: Array<{ arbiter_id?: string; choice?: string }>; finalized_value?: unknown; finalized_by?: string }
>;

type SeedUnit = {
  taskId: string;
  sampleId: string;
  annotatorId: string;
  reviewerCount: number;
  decisions: string[];
  status: string | null;
  arbitration: ArbitrationState;
};

type SeedProbe = { reviewDecisions: string[]; units: SeedUnit[] };

async function collectSeedProbe(page: Page): Promise<SeedProbe> {
  return page.evaluate((runTypeByTask) => {
    const data = (window as unknown as {
      LabelSuiteAnnotationWorkspaceData: {
        REVIEWER_MOCK_ROWS: Record<string, Record<string, Array<{ annotator: string; answers: Record<string, unknown> }>>>;
        REVIEW_DECISIONS: string[];
        readReviewerSubmissions: (
          taskId: string, runType: string, sampleId: string, identity: { annotatorId: string }
        ) => Array<{ reviewerId: string; answers?: { decisions?: Record<string, string> } }>;
        getReviewUnitStatus: (
          taskId: string, runType: string, sampleId: string, identity: { annotatorId: string }, outKeys: string[]
        ) => string | null;
        getArbitrationState: (
          taskId: string, runType: string, sampleId: string, identity: { annotatorId: string }
        ) => ArbitrationState;
      };
    }).LabelSuiteAnnotationWorkspaceData;

    const units: SeedUnit[] = [];
    Object.keys(runTypeByTask).forEach((taskId) => {
      const runType = runTypeByTask[taskId];
      const samples = data.REVIEWER_MOCK_ROWS[taskId] || {};
      Object.keys(samples).forEach((sampleId) => {
        samples[sampleId].forEach((row) => {
          const identity = { annotatorId: row.annotator };
          const outKeys = Object.keys(row.answers || {});
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
            status: data.getReviewUnitStatus(taskId, runType, sampleId, identity, outKeys),
            arbitration: data.getArbitrationState(taskId, runType, sampleId, identity),
          });
        });
      });
    });
    return { reviewDecisions: data.REVIEW_DECISIONS.slice(), units };
  }, RUN_TYPE_BY_TASK);
}

test.describe('review-flow demo seed fits the single-owner-relay model (issue #815)', () => {
  test('T016: every official_run review unit has exactly one reviewer (FR-093)', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: 'T016', role: 'reviewer', run_type: 'official_run', reviewer_id: 'reviewer_wang' }));
    const probe = await collectSeedProbe(page);
    const t016Units = probe.units.filter((unit) => unit.taskId === 'T016');
    expect(t016Units.length).toBeGreaterThan(0);
    for (const unit of t016Units) {
      expect(unit.reviewerCount, `${unit.taskId}/${unit.sampleId}`).toBe(1);
    }
  });

  test('the whole demo seed set (T014-T017) witnesses all three REVIEW_DECISIONS values at least once', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: 'T016', role: 'reviewer', run_type: 'official_run', reviewer_id: 'reviewer_wang' }));
    const probe = await collectSeedProbe(page);
    const witnessed = new Set<string>();
    probe.units.forEach((unit) => unit.decisions.forEach((decision) => witnessed.add(decision)));
    for (const decision of probe.reviewDecisions) {
      expect(witnessed.has(decision), `decision value "${decision}" has no witnessing seed row`).toBe(true);
    }
  });

  test('T016 has a unit whose arbitration outcome is 兩者皆非 (reject), still disputed, queued in the final exception pool', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: 'T016', role: 'reviewer', run_type: 'official_run', reviewer_id: 'reviewer_wang' }));
    const probe = await collectSeedProbe(page);
    const queued = probe.units.filter(
      (unit) =>
        unit.taskId === 'T016' &&
        unit.status === 'disputed' &&
        Object.values(unit.arbitration).some(
          (item) =>
            !item.finalized_by &&
            item.finalized_value === undefined &&
            (item.votes || []).some((vote) => vote.choice === 'reject')
        )
    );
    expect(
      queued.map((unit) => `${unit.taskId}/${unit.sampleId}`),
      'no T016 unit has an arbitration reject (兩者皆非) vote left queued and unresolved'
    ).not.toEqual([]);

    const target = queued[0];
    await skipGuidelineModal(page);
    await page.goto(
      `/pages/annotation/annotation-workspace.html?task_id=${target.taskId}&sample_id=${target.sampleId}` +
        `&role=project_leader&run_type=${RUN_TYPE_BY_TASK[target.taskId]}&annotator_id=${target.annotatorId}`
    );
    await expect(page.getByTestId('ws-exception-pool')).toBeVisible();
    await expect(page.getByTestId('ws-exception-pool-item')).toHaveCount(1);
  });

  test('the whole demo seed set (T014-T017) has no reviewer-level reject decision', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: 'T016', role: 'reviewer', run_type: 'official_run', reviewer_id: 'reviewer_wang' }));
    const probe = await collectSeedProbe(page);
    const offenders = probe.units.filter((unit) => unit.decisions.includes('reject'));
    expect(
      offenders.map((unit) => `${unit.taskId}/${unit.sampleId}`),
      'reviewer-level "reject" decision found -- REVIEW_DECISIONS only allows approve/modify/bypass since v5.0.0'
    ).toEqual([]);
  });
});
