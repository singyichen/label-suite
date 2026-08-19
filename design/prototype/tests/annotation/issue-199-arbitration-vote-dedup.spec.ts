import { test, expect, type Page } from '@playwright/test';
import { buildWorkspaceUrl, skipGuidelineModal } from './_workspace-helpers';

/* Issue #199: submitArbitration() (annotation-workspace.data.js) pushed a new
 * votes[] entry on every call with no dedup by reviewer_id. A repeated
 * submission by the same arbitrator (double-click / re-trigger) left
 * finalized_value idempotent but inflated votes[] with duplicate entries for
 * that arbitrator, polluting arbitration history/statistics (spec 015
 * FR-061, AC-4.23: "each dispute item must have exactly one votes[] entry
 * written"). Expected: a repeated submission by the same arbitrator leaves
 * exactly one votes[] entry for that reviewer_id -- overwrite semantics,
 * consistent with finalized_value/finalized_by already being last-write-wins
 * for the same item.
 */

type WorkspaceData = {
  markSampleSubmitted: (
    taskId: string, role: string, runType: string, sampleId: string,
    payload: unknown, historySummary: string,
    identity: { annotatorId?: string; reviewerId?: string }
  ) => void;
  getArbitrationState: (
    taskId: string, runType: string, sampleId: string,
    identity: { annotatorId?: string }
  ) => Record<string, {
    votes: Array<{ arbiter_id: string; choice: 'A' | 'B'; voted_at: string }>;
    finalized_value?: unknown;
    finalized_by?: string;
  }>;
  submitArbitration: (
    taskId: string, runType: string, sampleId: string,
    identity: { annotatorId?: string; reviewerId?: string },
    decisions: Array<{ itemId: string; choice: 'A' | 'B'; value: unknown }>
  ) => void;
};

const TASK = 'T001';
const SAMPLE = 'sent-001';
const ANNOTATOR = 'kioleemg12';
const PARTICIPANT = 'reviewer_wang';
const ARBITER = 'reviewer_chen'; // can_arbitrate: true
const ITEM_ID = 'single_label::single_label';

const labelPayload = (selected: string) => ({ previewState: { single_label: { selected } } });

/* Cast rather than `declare global`: another spec in this directory already
 * augments `Window.LabelSuiteAnnotationWorkspaceData` with a differently
 * shaped WorkspaceData, and TS requires merged global declarations to be
 * structurally identical (see annotation-dispute-items.spec.ts for the same
 * pattern). */
function seed(
  page: Page,
  args: { role: string; payload: unknown; identity: { annotatorId?: string; reviewerId?: string } }
): Promise<void> {
  return page.evaluate((a) => {
    (window as unknown as { LabelSuiteAnnotationWorkspaceData: WorkspaceData })
      .LabelSuiteAnnotationWorkspaceData.markSampleSubmitted(
        'T001', a.role, 'official_run', 'sent-001', a.payload, '', a.identity
      );
  }, args);
}

/* Annotator says sad, reviewer_wang says fear -> disputed with one dispute
 * item (single_label::selected) under min_reviewers = 1. */
async function seedDisputedUnit(page: Page): Promise<void> {
  await seed(page, { role: 'annotator', payload: labelPayload('sad'), identity: { annotatorId: ANNOTATOR } });
  await seed(page, {
    role: 'reviewer',
    payload: labelPayload('fear'),
    identity: { annotatorId: ANNOTATOR, reviewerId: PARTICIPANT },
  });
}

function gotoWorkspace(page: Page, reviewerId: string) {
  return page.goto(buildWorkspaceUrl({
    task_id: TASK, sample_id: SAMPLE, role: 'reviewer', run_type: 'official_run',
    annotator_id: ANNOTATOR, reviewer_id: reviewerId,
  }));
}

function submit(page: Page, choice: 'A' | 'B', value: string): Promise<void> {
  return page.evaluate((a) => {
    (window as unknown as { LabelSuiteAnnotationWorkspaceData: WorkspaceData })
      .LabelSuiteAnnotationWorkspaceData.submitArbitration(
        'T001', 'official_run', 'sent-001',
        { annotatorId: 'kioleemg12', reviewerId: 'reviewer_chen' },
        [{ itemId: a.itemId, choice: a.choice, value: a.value }]
      );
  }, { itemId: ITEM_ID, choice, value });
}

function readState(page: Page) {
  return page.evaluate(() =>
    (window as unknown as { LabelSuiteAnnotationWorkspaceData: WorkspaceData })
      .LabelSuiteAnnotationWorkspaceData.getArbitrationState(
        'T001', 'official_run', 'sent-001', { annotatorId: 'kioleemg12' }
      )
  );
}

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
  await gotoWorkspace(page, ARBITER);
  await seedDisputedUnit(page);
  await page.reload();
});

test.describe('arbitration vote dedup (issue #199)', () => {
  test('resubmitting the same choice leaves exactly one vote entry', async ({ page }) => {
    await submit(page, 'B', 'fear');
    await submit(page, 'B', 'fear');

    const state = await readState(page);
    const item = state[ITEM_ID];
    expect(item.votes).toHaveLength(1);
    expect(item.votes[0].arbiter_id).toBe(ARBITER);
    expect(item.votes[0].choice).toBe('B');
    expect(item.finalized_value).toBe('fear');
    expect(item.finalized_by).toBe(ARBITER);
  });

  test('resubmitting with a changed choice updates the single entry in place', async ({ page }) => {
    await submit(page, 'B', 'fear');
    await submit(page, 'A', 'sad');

    const state = await readState(page);
    const item = state[ITEM_ID];
    expect(item.votes).toHaveLength(1);
    expect(item.votes[0].arbiter_id).toBe(ARBITER);
    expect(item.votes[0].choice).toBe('A');
    expect(item.finalized_value).toBe('sad');
    expect(item.finalized_by).toBe(ARBITER);
  });

  test('a single vote still records normally (regression)', async ({ page }) => {
    await submit(page, 'B', 'fear');

    const state = await readState(page);
    const item = state[ITEM_ID];
    expect(item.votes).toHaveLength(1);
    expect(item.votes[0].choice).toBe('B');
    expect(item.finalized_value).toBe('fear');
    expect(item.finalized_by).toBe(ARBITER);
  });
});
