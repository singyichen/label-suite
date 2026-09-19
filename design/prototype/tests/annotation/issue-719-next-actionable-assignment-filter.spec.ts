/**
 * findNextActionableReviewUnit() must honor the FR-093 assignment model
 * (defect fix, issue #719, PR #751).
 *
 * Source spec: specs/annotation/015-annotation-workspace/spec.md
 *   FR-093 -- assignment is split by the system, evenly, across the checked
 *             reviewers; a reviewer never self-selects a unit, and every
 *             assignment target has exactly ONE reviewer.
 *   FR-060 -- only a non-participant with can_arbitrate may arbitrate a
 *             disputed unit.
 *
 * Today findNextActionableReviewUnit() (annotation-workspace.data.js:2789)
 * enumerates listReviewUnits(taskId, runType) and ranks every `pending` unit
 * as actionable WITHOUT ever consulting getAssignedReviewUnits() -- so it
 * hands a reviewer a pending unit that FR-093 assigned to someone else. The
 * correct predicate mirrors filterToAssignedUnits() in annotation-list.html
 * (line 1674): a unit is actionable for reviewer R iff
 *   (R is the FR-093 assignee)  OR  (unit is disputed AND R can arbitrate it)
 *
 * The arbiter half is load-bearing, not optional: an eligible arbiter is by
 * construction never the assignee (isArbiterCandidate requires R hold no
 * submission on the unit, and the assignee is exactly who does), so an
 * assigned-ONLY filter would make FR-060 arbitration unreachable. Every
 * assertion below is written so that filter alone -- the most obvious wrong
 * fix -- still fails it.
 *
 * All three scenarios below are derived generically from the live demo
 * dataset (every taskId in REVIEWER_MOCK_ROWS x both run types x the whole
 * REVIEWER_ROSTER) rather than pinned to one observed task/reviewer, so the
 * contract does not encode a hardcoded task-id branch (Generalization-First)
 * and keeps holding if the demo seed data changes shape.
 *
 * Bootstrapped on annotation-list.html (not the workspace or dashboard):
 * it is the lightest page that (a) loads annotation-workspace.data.js as a
 * plain <script> tag, so window.LabelSuiteAnnotationWorkspaceData is
 * available, and (b) triggers seedReviewFlowDemo() on load, which is what
 * stages the T014-T016 pending/disputed/finalized review states this
 * contract reads. The task_id/run_type in the URL only pick an initial
 * render target for the list page itself -- every assertion below re-derives
 * its own task/run_type/reviewer scenario from the full demo dataset via
 * page.evaluate(), so which task the page happens to open on is irrelevant.
 */
import { test, expect } from '@playwright/test';
import { buildListUrl } from './_workspace-helpers';

interface ReviewUnit {
  sampleId: string;
  annotatorId: string;
  status: string | null;
}

interface AssignedUnit {
  sample_id: string;
  annotator_id: string;
}

interface RosterEntry {
  id: string;
  name: string;
  can_arbitrate?: boolean;
}

interface Identity {
  annotatorId?: string;
  reviewerId?: string;
}

interface WorkspaceData {
  listReviewUnits: (taskId: string, runType: string) => ReviewUnit[];
  getAssignedReviewUnits: (
    taskId: string,
    runType: string,
    reviewerId: string,
    units: AssignedUnit[],
  ) => AssignedUnit[];
  isArbiterCandidate: (
    taskId: string,
    runType: string,
    sampleId: string,
    identity: Identity,
  ) => boolean;
  findNextActionableReviewUnit: (
    taskId: string,
    runType: string,
    reviewerId: string,
  ) => ReviewUnit | null;
  REVIEWER_ROSTER: RosterEntry[];
  REVIEWER_MOCK_ROWS: Record<string, unknown>;
  REVIEW_UNIT_STATUS: { PENDING: string; DISPUTED: string; FINALIZED: string };
}

interface DataWindow {
  LabelSuiteAnnotationWorkspaceData: WorkspaceData;
}

test.describe('findNextActionableReviewUnit honors FR-093 assignment', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(buildListUrl({ task_id: 'T001', role: 'reviewer', run_type: 'official_run' }));
  });

  /* Assertion 1 -- assignment is honored: the earliest pending/unreviewed
   * unit in enumeration order is assigned (via getAssignedReviewUnits) to
   * exactly one reviewer X. Calling with a DIFFERENT roster reviewer Y must
   * not hand them X's unit.
   *
   * This pins the exact defect: reviewUnitActionRank() ranks any pending
   * unit as actionable (rank 1) unconditionally on status alone, never
   * consulting reviewerId, so the loop in findNextActionableReviewUnit()
   * returns this same first-pending unit for EVERY reviewer id -- including
   * Y, who was never assigned it. */
  test('a pending unit is not handed to a reviewer other than its FR-093 assignee', async ({ page }) => {
    const scenario = await page.evaluate(() => {
      const data = (window as unknown as DataWindow).LabelSuiteAnnotationWorkspaceData;
      const roster = data.REVIEWER_ROSTER.map((r) => r.id);
      const taskIds = Object.keys(data.REVIEWER_MOCK_ROWS);

      for (const taskId of taskIds) {
        for (const runType of ['dry_run', 'official_run']) {
          const units = data.listReviewUnits(taskId, runType);
          if (!units.length) continue;

          const firstPending = units.find(
            (u) => u.status === null || u.status === data.REVIEW_UNIT_STATUS.PENDING,
          );
          if (!firstPending) continue;

          const assignmentInput: AssignedUnit[] = units.map((u) => ({
            sample_id: u.sampleId,
            annotator_id: u.annotatorId,
          }));

          let assignee: string | null = null;
          for (const reviewerId of roster) {
            const mine = data.getAssignedReviewUnits(taskId, runType, reviewerId, assignmentInput);
            if (
              mine.some(
                (m) => m.sample_id === firstPending.sampleId && m.annotator_id === firstPending.annotatorId,
              )
            ) {
              assignee = reviewerId;
              break;
            }
          }
          if (!assignee) continue;

          const other = roster.find((r) => r !== assignee);
          if (!other) continue;

          return {
            taskId,
            runType,
            assignee,
            other,
            expectedSampleId: firstPending.sampleId,
            expectedAnnotatorId: firstPending.annotatorId,
            result: data.findNextActionableReviewUnit(taskId, runType, other),
          };
        }
      }
      return null;
    });

    expect(scenario, 'no task/run_type in the demo dataset has an assignable pending unit').not.toBeNull();

    const returnedTheOtherReviewersUnit =
      scenario!.result !== null &&
      scenario!.result.sampleId === scenario!.expectedSampleId &&
      scenario!.result.annotatorId === scenario!.expectedAnnotatorId;

    expect(
      returnedTheOtherReviewersUnit,
      `findNextActionableReviewUnit(${scenario!.taskId}, ${scenario!.runType}, "${scenario!.other}") ` +
        `returned unit ${scenario!.expectedSampleId}/${scenario!.expectedAnnotatorId}, which FR-093 ` +
        `assigned to "${scenario!.assignee}", not to "${scenario!.other}"`,
    ).toBe(false);
  });

  /* Assertion 2 -- the arbiter exception survives. Find a task/run_type
   * and a can_arbitrate roster reviewer whose ONLY actionable candidate
   * (under the correct assigned-OR-arbiter predicate) is a disputed unit
   * they did not review and are not assigned. findNextActionableReviewUnit
   * must still return exactly that unit.
   *
   * An "assigned units only" fix (dropping the arbiter branch) would make
   * this scenario return null instead -- that is the wrong implementation
   * this assertion exists to catch. */
  test('an eligible arbiter still reaches a disputed unit that is not their assignment', async ({ page }) => {
    const scenario = await page.evaluate(() => {
      const data = (window as unknown as DataWindow).LabelSuiteAnnotationWorkspaceData;
      const taskIds = Object.keys(data.REVIEWER_MOCK_ROWS);

      for (const taskId of taskIds) {
        for (const runType of ['dry_run', 'official_run']) {
          const units = data.listReviewUnits(taskId, runType);
          if (!units.length) continue;

          const assignmentInput: AssignedUnit[] = units.map((u) => ({
            sample_id: u.sampleId,
            annotator_id: u.annotatorId,
          }));

          for (const entry of data.REVIEWER_ROSTER) {
            if (!entry.can_arbitrate) continue;
            const reviewerId = entry.id;

            const assignedSet = new Set(
              data
                .getAssignedReviewUnits(taskId, runType, reviewerId, assignmentInput)
                .map((a) => `${a.sample_id} ${a.annotator_id}`),
            );

            let bestRank = 0;
            let bestUnit: ReviewUnit | null = null;
            for (const u of units) {
              const key = `${u.sampleId} ${u.annotatorId}`;
              let rank = 0;
              if ((u.status === null || u.status === data.REVIEW_UNIT_STATUS.PENDING) && assignedSet.has(key)) {
                rank = 1;
              } else if (
                u.status === data.REVIEW_UNIT_STATUS.DISPUTED &&
                data.isArbiterCandidate(taskId, runType, u.sampleId, {
                  annotatorId: u.annotatorId,
                  reviewerId,
                })
              ) {
                rank = 2;
              }
              if (rank === 0) continue;
              if (bestUnit === null || rank < bestRank) {
                bestUnit = u;
                bestRank = rank;
              }
            }

            if (bestRank === 2 && bestUnit) {
              return {
                taskId,
                runType,
                reviewerId,
                expectedSampleId: bestUnit.sampleId,
                expectedAnnotatorId: bestUnit.annotatorId,
                result: data.findNextActionableReviewUnit(taskId, runType, reviewerId),
              };
            }
          }
        }
      }
      return null;
    });

    expect(
      scenario,
      'no task/run_type/reviewer in the demo dataset has a disputed unit as the sole arbiter-only candidate',
    ).not.toBeNull();

    expect(scenario!.result).not.toBeNull();
    expect(scenario!.result!.sampleId).toBe(scenario!.expectedSampleId);
    expect(scenario!.result!.annotatorId).toBe(scenario!.expectedAnnotatorId);
  });

  /* Assertion 3 -- property test: across every task, run_type and roster
   * reviewer in the demo dataset, whatever findNextActionableReviewUnit()
   * returns must be either that reviewer's FR-093 assignment or a disputed
   * unit they may arbitrate (FR-060). Null is acceptable (nothing
   * actionable). Collected as a violations list so a failure reports every
   * offending (task, run_type, reviewer) tuple at once instead of only the
   * first. */
  test('every returned unit is either the reviewer\'s assignment or an eligible arbitration', async ({ page }) => {
    const violations = await page.evaluate(() => {
      const data = (window as unknown as DataWindow).LabelSuiteAnnotationWorkspaceData;
      const taskIds = Object.keys(data.REVIEWER_MOCK_ROWS);
      const found: {
        taskId: string;
        runType: string;
        reviewerId: string;
        sampleId: string;
        annotatorId: string;
        status: string | null;
      }[] = [];

      for (const taskId of taskIds) {
        for (const runType of ['dry_run', 'official_run']) {
          const units = data.listReviewUnits(taskId, runType);
          if (!units.length) continue;

          const assignmentInput: AssignedUnit[] = units.map((u) => ({
            sample_id: u.sampleId,
            annotator_id: u.annotatorId,
          }));

          for (const entry of data.REVIEWER_ROSTER) {
            const reviewerId = entry.id;
            const result = data.findNextActionableReviewUnit(taskId, runType, reviewerId);
            if (result === null) continue;

            const assignedSet = new Set(
              data
                .getAssignedReviewUnits(taskId, runType, reviewerId, assignmentInput)
                .map((a) => `${a.sample_id} ${a.annotator_id}`),
            );
            const key = `${result.sampleId} ${result.annotatorId}`;
            const isAssigned = assignedSet.has(key);
            const isEligibleArbitration =
              result.status === data.REVIEW_UNIT_STATUS.DISPUTED &&
              data.isArbiterCandidate(taskId, runType, result.sampleId, {
                annotatorId: result.annotatorId,
                reviewerId,
              });

            if (!isAssigned && !isEligibleArbitration) {
              found.push({
                taskId,
                runType,
                reviewerId,
                sampleId: result.sampleId,
                annotatorId: result.annotatorId,
                status: result.status,
              });
            }
          }
        }
      }
      return found;
    });

    expect(violations).toEqual([]);
  });
});
