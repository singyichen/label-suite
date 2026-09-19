import { test, expect, type Page } from '@playwright/test';
import { buildListUrl, buildWorkspaceUrl, skipGuidelineModal } from './_workspace-helpers';

/* Submitted-but-no-mock-row review units join enumeration (issue #792,
 * spec 015 FR-055 delta -- see openspec/changes/enumerate-submitted-review-units).
 *
 * T015's ofs-05-not-submitted ships no REVIEWER_MOCK_ROWS entry -- it is the
 * AC-3.38 empty-unit-gate demo point (issue #307/#784). Today's three
 * enumeration call sites (listReviewUnits(), annotation-list's
 * buildAllReviewUnitRows(), the workspace's buildUnits()) walk ONLY
 * REVIEWER_MOCK_ROWS, so a real annotator submission against this sample
 * never becomes a review unit anywhere: not in the summary counters, not in
 * the reviewer's list, not in FR-093 assignment, not in the workspace left
 * nav. Expected failure of this Red run is exactly that absence.
 *
 * Type access uses a local interface + `window as unknown as DataWindow`
 * cast (same idiom as issue-784-enumerated-units-have-seed-source.spec.ts
 * and issue-596-unit-context.spec.ts) -- never a second `declare global`
 * (TS2717: a global augmentation may only be declared once per program).
 *
 * No test here hardcodes a task's total unit count (design.md D1) or WHICH
 * roster reviewer FR-093 assigns the new unit to (design.md D4): the
 * assignee is discovered at runtime by asking every roster candidate.
 */

interface ReviewUnit {
  sampleId: string;
  annotatorId: string;
  status: string | null;
}

interface ReviewSummary {
  total: number;
  pending: number;
  unfinalized: number;
}

interface ActionableEntry {
  unit: ReviewUnit;
  rank: number;
}

interface AssignedUnit {
  sample_id: string;
  annotator_id: string;
}

interface WorkspaceData {
  DEFAULT_ANNOTATOR_ID: string;
  REVIEWER_ROSTER: Array<{ id: string }>;
  markSampleSubmitted: (
    taskId: string, role: string, runType: string, sampleId: string,
    payload: unknown, historySummary: string,
    identity: { annotatorId?: string; reviewerId?: string }
  ) => void;
  markSampleSaved: (
    taskId: string, role: string, runType: string, sampleId: string,
    payload: unknown, historySummary: string,
    identity: { annotatorId?: string; reviewerId?: string }
  ) => void;
  listReviewUnits: (taskId: string, runType: string) => ReviewUnit[];
  computeReviewSummary: (taskId: string, runType: string) => ReviewSummary;
  getAssignedReviewUnits: (
    taskId: string, runType: string, reviewerId: string, units: AssignedUnit[]
  ) => AssignedUnit[];
  listActionableReviewUnits: (
    taskId: string, runType: string, reviewerId: string
  ) => ActionableEntry[];
}

interface DataWindow {
  LabelSuiteAnnotationWorkspaceData: WorkspaceData;
}

const TASK_ID = 'T015';
const RUN_TYPE = 'official_run';
const SAMPLE = 'ofs-05-not-submitted';
const ANSWER = 'positive';

const labelPayload = (selected: string) => ({ previewState: { single_label: { selected } } });

/* Same known static-server <script src> flake guard as the sibling
 * review-unit specs (issue #582 lineage). */
test.describe.configure({ retries: 2 });

async function readState(page: Page) {
  return page.evaluate(
    ({ taskId, runType, sample }) => {
      const data = (window as unknown as DataWindow).LabelSuiteAnnotationWorkspaceData;
      const units = data.listReviewUnits(taskId, runType);
      const summary = data.computeReviewSummary(taskId, runType);
      return {
        annotatorId: data.DEFAULT_ANNOTATOR_ID,
        hasUnit: units.some((u) => u.sampleId === sample && u.annotatorId === data.DEFAULT_ANNOTATOR_ID),
        unit: units.find((u) => u.sampleId === sample) || null,
        summary,
      };
    },
    { taskId: TASK_ID, runType: RUN_TYPE, sample: SAMPLE }
  );
}

async function seedSubmission(page: Page) {
  await page.evaluate(
    ({ taskId, runType, sample, answer }) => {
      const data = (window as unknown as DataWindow).LabelSuiteAnnotationWorkspaceData;
      const payload = { previewState: { single_label: { selected: answer } } };
      data.markSampleSubmitted(taskId, 'annotator', runType, sample, payload, '', {});
    },
    { taskId: TASK_ID, runType: RUN_TYPE, sample: SAMPLE, answer: ANSWER }
  );
}

test.describe('issue #792 -- submitted-but-no-mock-row unit joins enumeration', () => {
  test('listReviewUnits() and computeReviewSummary() count the unit as pending once submitted', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: TASK_ID, role: 'reviewer', run_type: RUN_TYPE }));

    const before = await readState(page);
    expect(before.hasUnit).toBe(false);

    await seedSubmission(page);
    const after = await readState(page);

    expect(after.hasUnit).toBe(true);
    expect(after.unit?.status).toBe('pending');
    expect(after.summary.pending).toBe(before.summary.pending + 1);
    expect(after.summary.unfinalized).toBe(before.summary.unfinalized + 1);
    expect(after.summary.total).toBe(before.summary.total + 1);
  });

  test('the unit is assigned to exactly one roster reviewer, who sees it in annotation-list with the submitted answer', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: TASK_ID, role: 'reviewer', run_type: RUN_TYPE }));
    await seedSubmission(page);

    const { annotatorId, assignedTo } = await page.evaluate(
      ({ taskId, runType, sample }) => {
        const data = (window as unknown as DataWindow).LabelSuiteAnnotationWorkspaceData;
        const units = data.listReviewUnits(taskId, runType).map((u) => ({
          sample_id: u.sampleId,
          annotator_id: u.annotatorId,
        }));
        const target = units.find((u) => u.sample_id === sample);
        const candidates = data.REVIEWER_ROSTER.map((r) => r.id);
        const owners = target
          ? candidates.filter((reviewerId) =>
              data
                .getAssignedReviewUnits(taskId, runType, reviewerId, units)
                .some((a) => a.sample_id === target.sample_id && a.annotator_id === target.annotator_id)
            )
          : [];
        return { annotatorId: data.DEFAULT_ANNOTATOR_ID, assignedTo: owners };
      },
      { taskId: TASK_ID, runType: RUN_TYPE, sample: SAMPLE }
    );

    // Exactly one owner -- design.md D4: never assert WHICH one.
    expect(assignedTo.length).toBe(1);
    const reviewerId = assignedTo[0];

    // That reviewer's list view shows the row with the submitted answer.
    await skipGuidelineModal(page);
    await page.goto(buildListUrl({ task_id: TASK_ID, role: 'reviewer', run_type: RUN_TYPE, reviewer_id: reviewerId }));

    const row = page.locator('[data-testid="ws-sample-item"]').filter({
      has: page.locator('[data-testid="list-review-id"]', { hasText: SAMPLE }),
    }).filter({
      has: page.locator('[data-testid="list-review-annotator"]', { hasText: annotatorId }),
    });
    await expect(row).toHaveCount(1);
    await expect(row.locator('[data-testid="list-review-answer"]')).toContainText(ANSWER);

    // That reviewer can reach the unit via the actionable/quick-review path.
    const actionable = await page.evaluate(
      ({ taskId, runType, sample, rid }) => {
        const data = (window as unknown as DataWindow).LabelSuiteAnnotationWorkspaceData;
        return data
          .listActionableReviewUnits(taskId, runType, rid)
          .some((entry) => entry.unit.sampleId === sample && entry.rank === 1);
      },
      { taskId: TASK_ID, runType: RUN_TYPE, sample: SAMPLE, rid: reviewerId }
    );
    expect(actionable).toBe(true);

    // And the workspace left nav for this reviewer includes the unit.
    await page.goto(buildWorkspaceUrl({
      task_id: TASK_ID, sample_id: SAMPLE, role: 'reviewer', run_type: RUN_TYPE, reviewer_id: reviewerId,
    }));
    await expect(
      page.locator(`[data-testid="ws-sample-item"][data-sample-id="${SAMPLE}"][data-annotator-id="${annotatorId}"]`)
    ).toHaveCount(1);
  });

  test('a draft-only (not submitted) answer does not join enumeration', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: TASK_ID, role: 'reviewer', run_type: RUN_TYPE }));

    const before = await readState(page);
    expect(before.hasUnit).toBe(false);

    await page.evaluate(
      ({ taskId, runType, sample, answer }) => {
        const data = (window as unknown as DataWindow).LabelSuiteAnnotationWorkspaceData;
        data.markSampleSaved(taskId, 'annotator', runType, sample, { previewState: { single_label: { selected: answer } } }, '', {});
      },
      { taskId: TASK_ID, runType: RUN_TYPE, sample: SAMPLE, answer: ANSWER }
    );
    const after = await readState(page);

    expect(after.hasUnit).toBe(false);
    expect(after.summary.total).toBe(before.summary.total);
  });

  test('a unit missing both seed sources (no mock row, no stored submission) stays excluded', async ({ page }) => {
    // Same invariant as issue-784-enumerated-units-have-seed-source.spec.ts:
    // pinned again here because this file owns the ofs-05-not-submitted
    // fixture's positive case and a regression here would otherwise only
    // surface in a sibling file.
    await page.goto(buildListUrl({ task_id: TASK_ID, role: 'reviewer', run_type: RUN_TYPE }));

    const state = await readState(page);
    expect(state.hasUnit).toBe(false);
  });
});
