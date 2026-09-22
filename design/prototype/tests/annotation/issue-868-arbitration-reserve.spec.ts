/**
 * Issue #868 — designated arbiters are reserved from new review assignment.
 *
 * Contract sources:
 * - openspec/changes/reserve-arbiters-from-review-assignment/specs/
 *   annotation/015-annotation-workspace/spec.md (FR-060 / FR-093)
 * - openspec/changes/reserve-arbiters-from-review-assignment/design.md D1–D6
 *
 * These are prototype contracts. They do not exercise production frontend,
 * backend, or root E2E code.
 */
import { test, expect, type Page } from '@playwright/test';
import { buildListUrl } from './_workspace-helpers';

type Unit = { sample_id: string; annotator_id: string };
type Assignment = Unit & { reviewer_id: string };
type Identity = { annotatorId: string; reviewerId: string };

interface TaskProfile {
  reviewerIds?: string[];
  arbiterIds?: string[];
}

interface WorkspaceData {
  taskReviewerRoster: (taskId: string) => string[];
  taskArbiterRoster: (taskId: string) => string[];
  reviewAssignmentRoster: (reviewerIds: string[], arbiterIds: string[]) => string[];
  taskReviewAssignments: (taskId: string, runType: string, units: Unit[]) => Assignment[];
  isArbiterCandidate: (taskId: string, runType: string, sampleId: string, identity: Identity) => boolean;
  markSampleSubmitted: (
    taskId: string,
    role: string,
    runType: string,
    sampleId: string,
    payload: Record<string, unknown>,
    summary: string,
    identity: Identity
  ) => void;
}

interface TestWindow {
  LabelSuiteAnnotationWorkspaceData: WorkspaceData;
  LabelSuiteTaskDetailData?: { profiles: Record<string, TaskProfile> };
}

async function loadData(page: Page): Promise<void> {
  await page.goto(buildListUrl({ task_id: 'T014', role: 'reviewer', run_type: 'dry_run' }));
  await page.waitForFunction(() =>
    Boolean((window as unknown as Partial<TestWindow>).LabelSuiteAnnotationWorkspaceData)
  );
}

test.describe.configure({ retries: 2 });

test('all task-designated arbiters are excluded from new assignments and remaining reviewers stay balanced', async ({ page }) => {
  await loadData(page);

  const result = await page.evaluate(() => {
    const data = (window as unknown as TestWindow).LabelSuiteAnnotationWorkspaceData;
    const reviewers = ['reviewer_wang', 'reviewer_li', 'reviewer_chen', 'reviewer_lin'];
    const arbiters = ['reviewer_chen', 'reviewer_lin'];
    const units: Unit[] = Array.from({ length: 7 }, (_, index) => ({
      sample_id: `reserve-${index + 1}`,
      annotator_id: 'annotator-a',
    }));
    const effective = data.reviewAssignmentRoster(reviewers, arbiters);
    const assignments = data.taskReviewAssignments('T014', 'official_run', units);
    return { effective, assignments };
  });

  // The pure set-difference contract reserves every designated arbiter.
  expect(result.effective).toEqual(['reviewer_wang', 'reviewer_li']);

  // T014 has one designated arbiter (Chen); no new task-scoped assignment
  // may land on them, and the three remaining reviewers stay balanced.
  const owners = result.assignments.map((assignment) => assignment.reviewer_id);
  expect(owners).not.toContain('reviewer_chen');
  const counts = ['reviewer_wang', 'reviewer_li', 'reviewer_lin'].map(
    (reviewerId) => owners.filter((owner) => owner === reviewerId).length
  );
  expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
});

test('a historical submission by a now-reserved arbiter remains sticky but does not make them eligible to arbitrate it', async ({ page }) => {
  await loadData(page);

  const result = await page.evaluate(() => {
    const data = (window as unknown as TestWindow).LabelSuiteAnnotationWorkspaceData;
    const unit: Unit = { sample_id: 'legacy-arbiter-unit', annotator_id: 'legacy-annotator' };
    const identity: Identity = { annotatorId: unit.annotator_id, reviewerId: 'reviewer_chen' };
    data.markSampleSubmitted('T016', 'reviewer', 'official_run', unit.sample_id, {}, '', identity);
    return {
      assignments: data.taskReviewAssignments('T016', 'official_run', [unit]),
      canArbitrateOwnUnit: data.isArbiterCandidate('T016', 'official_run', unit.sample_id, identity),
    };
  });

  expect(result.assignments).toEqual([
    { sample_id: 'legacy-arbiter-unit', annotator_id: 'legacy-annotator', reviewer_id: 'reviewer_chen' },
  ]);
  expect(result.canArbitrateOwnUnit).toBe(false);
});

test('arbiter candidacy reads the task arbiterIds instead of the global demo flag', async ({ page }) => {
  await loadData(page);

  const result = await page.evaluate(() => {
    const win = window as unknown as TestWindow;
    const profile = win.LabelSuiteTaskDetailData?.profiles.T014;
    if (!profile) throw new Error('T014 profile missing');
    profile.arbiterIds = ['reviewer_lin'];
    const data = win.LabelSuiteAnnotationWorkspaceData;
    return {
      roster: data.taskArbiterRoster('T014'),
      lin: data.isArbiterCandidate('T014', 'dry_run', 'synthetic-no-submission', {
        annotatorId: 'annotator-a',
        reviewerId: 'reviewer_lin',
      }),
      chen: data.isArbiterCandidate('T014', 'dry_run', 'synthetic-no-submission', {
        annotatorId: 'annotator-a',
        reviewerId: 'reviewer_chen',
      }),
    };
  });

  expect(result.roster).toEqual(['reviewer_lin']);
  expect(result.lin).toBe(true);
  expect(result.chen).toBe(false);
});

for (const demo of [
  { taskId: 'T014', runType: 'dry_run', sampleId: 'dry-03-dispute-open', annotatorId: '113450022' },
  { taskId: 'T016', runType: 'official_run', sampleId: 'ofm-03-awaiting-arbitration', annotatorId: 'kioleemg12' },
] as const) {
  test(`${demo.taskId}: reserved reviewer_chen can reach the seeded dispute`, async ({ page }) => {
    await page.goto(
      buildListUrl({
        task_id: demo.taskId,
        role: 'reviewer',
        run_type: demo.runType,
        reviewer_id: 'reviewer_chen',
      })
    );

    const row = page
      .getByTestId('ws-sample-item')
      .filter({ hasText: demo.sampleId })
      .filter({ has: page.getByTestId('list-review-annotator').getByText(demo.annotatorId) });
    await expect(row).toHaveCount(1);
    await expect(row.getByTestId('list-arbitrate-entry')).toHaveText('仲裁');
  });
}
