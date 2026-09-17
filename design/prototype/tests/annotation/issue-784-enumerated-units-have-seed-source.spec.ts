/**
 * FR-072 §1 / FR-073 §2 priority 1 (spec 015 v6.3.1, issue #784) -- the
 * "annotator has not submitted yet" units that FR-073 counts as pending are
 * units WITH a FR-044a demo-answer stand-in, never units missing BOTH seed
 * sources.
 *
 * Source spec: specs/annotation/015-annotation-workspace/spec.md
 *   FR-044a  -- review-row seed order: stored submission -> REVIEWER_MOCK_ROWS
 *               stand-in for that sample.
 *   AC-3.38  -- a unit missing BOTH seed sources renders the empty-unit gate
 *               (`ws-review-empty-unit`), so a reviewer cannot act on it.
 *   FR-072 §1 / FR-073 §2 (v6.3.1 clarification) -- such truly empty units
 *               are outside the listReviewUnits() enumeration, so they are
 *               neither counted as 待審 nor offered by quick review.
 *
 * The workspace gate (annotation-workspace.config.js reviewUnitBlockReason)
 * fires only when the unit status is null AND the sample has no mock row, so
 * "every enumerated unit's sample has a mock row" is exactly the invariant
 * that keeps the counted/actionable set and the gated set disjoint.
 *
 * Swept generically over every task in REVIEWER_MOCK_ROWS x both run types
 * (Generalization-First -- no task-id branch). This pins the clarified
 * wording; it passes today by design, since the change is spec-only.
 */
import { test, expect } from '@playwright/test';
import { buildListUrl } from './_workspace-helpers';

interface ReviewUnit {
  sampleId: string;
  annotatorId: string;
  status: string | null;
}

interface WorkspaceData {
  listReviewUnits: (taskId: string, runType: string) => ReviewUnit[];
  getReviewerMockRows: (taskId: string, sampleId: string) => unknown[] | null;
  REVIEWER_MOCK_ROWS: Record<string, unknown>;
}

interface DataWindow {
  LabelSuiteAnnotationWorkspaceData: WorkspaceData;
}

/* Same known static-server <script src> flake guard as the sibling
 * review-unit specs (issue #582 lineage). */
test.describe.configure({ retries: 2 });

test('every enumerated review unit has a FR-044a seed source, so none is AC-3.38 gated', async ({ page }) => {
  await page.goto(buildListUrl({ task_id: 'T015', role: 'reviewer', run_type: 'official_run' }));

  const result = await page.evaluate(() => {
    const data = (window as unknown as DataWindow).LabelSuiteAnnotationWorkspaceData;
    const violations: string[] = [];
    let enumerated = 0;
    for (const taskId of Object.keys(data.REVIEWER_MOCK_ROWS)) {
      for (const runType of ['dry_run', 'official_run']) {
        for (const unit of data.listReviewUnits(taskId, runType)) {
          enumerated += 1;
          const rows = data.getReviewerMockRows(taskId, unit.sampleId) || [];
          if (unit.status === null && rows.length === 0) {
            violations.push(`${taskId}/${runType}/${unit.sampleId}/${unit.annotatorId}`);
          }
        }
      }
    }
    return { violations, enumerated };
  });

  // Guard against a vacuous pass: the sweep must actually see units.
  expect(result.enumerated).toBeGreaterThan(0);
  expect(result.violations).toEqual([]);
});

test('T015 ofs-05-not-submitted (both seed sources missing) is not enumerated', async ({ page }) => {
  await page.goto(buildListUrl({ task_id: 'T015', role: 'reviewer', run_type: 'official_run' }));

  const sampleIds = await page.evaluate(() => {
    const data = (window as unknown as DataWindow).LabelSuiteAnnotationWorkspaceData;
    return data.listReviewUnits('T015', 'official_run').map((unit) => unit.sampleId);
  });

  expect(sampleIds.length).toBeGreaterThan(0);
  expect(sampleIds).not.toContain('ofs-05-not-submitted');
});
