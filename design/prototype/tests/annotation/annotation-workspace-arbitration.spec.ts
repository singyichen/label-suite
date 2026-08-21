import { test, expect, type Page } from '@playwright/test';
import { buildWorkspaceUrl, patchDataFile, skipGuidelineModal } from './_workspace-helpers';

/* Workspace arbitration layout (spec 015 v4.8.0, issue #147 P3c).
 *
 * When an arbitration-eligible reviewer (can_arbitrate AND not a dispute
 * participant, FR-060) opens a DISPUTED unit, the whole review card switches
 * to an arbitration layout: the arbiter picks per dispute item between the
 * annotator's value (A) and the reviewer side's value (B) — they never
 * re-annotate, so correction controls and the ✕/✓ row decisions must not
 * render at all. Items whose reviewer votes already converge to a per-item
 * majority (resolveDisputeConvergence) skip the pool and auto-finalize;
 * only genuinely unresolvable items get an A/B row.
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
  getReviewUnitStatus: (
    taskId: string, runType: string, sampleId: string,
    identity: { annotatorId?: string }, outKeys: string[]
  ) => string | null;
  resolveDisputeConvergence: (
    item: { outKey: string; key: string; annotatorValue: unknown; reviewerValues: Record<string, unknown> },
    reviewerCount: number
  ) => { converged: boolean; value?: unknown };
};

declare global {
  interface Window {
    LabelSuiteAnnotationWorkspaceData: WorkspaceData;
  }
}

const TASK = 'T001';
const SAMPLE = 'sent-001';
const ANNOTATOR = 'kioleemg12';
const PARTICIPANT = 'reviewer_wang';
const BYSTANDER = 'reviewer_li'; // no can_arbitrate flag
const ARBITER = 'reviewer_chen'; // can_arbitrate: true

const labelPayload = (selected: string) => ({ previewState: { single_label: { selected } } });

function seed(
  page: Page,
  args: {
    task?: string; sample?: string; role: string; payload: unknown;
    identity: { annotatorId?: string; reviewerId?: string };
  }
): Promise<void> {
  return page.evaluate((a) => {
    window.LabelSuiteAnnotationWorkspaceData.markSampleSubmitted(
      a.task || 'T001', a.role, 'official_run', a.sample || 'sent-001', a.payload, '', a.identity
    );
  }, args);
}

const dimsPayload = (dims: Record<string, number>) => ({
  previewState: {
    multi_dim: {
      dims: Object.fromEntries(Object.entries(dims).map(([name, value]) => [name, { value }])),
    },
  },
});

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

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
  await gotoWorkspace(page, ARBITER);
  await seedDisputedUnit(page);
  await page.reload();
});

test.describe('arbitration layout: eligible arbiter on a disputed unit', () => {
  test('the review card switches to the arbitration layout', async ({ page }) => {
    await expect(page.getByTestId('ws-arbitration-card')).toBeVisible();

    const items = page.getByTestId('ws-arbitration-item');
    await expect(items).toHaveCount(1);
    await expect(items.first().getByTestId('ws-arbitration-choose-a')).toContainText('sad');
    await expect(items.first().getByTestId('ws-arbitration-choose-b')).toContainText('fear');
  });

  test('correction controls and row decisions do not render', async ({ page }) => {
    await expect(page.getByTestId('ws-arbitration-card')).toBeVisible();
    await expect(page.getByTestId('ws-review-row-approve')).toHaveCount(0);
    await expect(page.getByTestId('ws-review-row-reject')).toHaveCount(0);
    /* The single_label correction chips belong to the reviewer's re-annotate
       flow; an arbiter only chooses A or B. */
    await expect(page.getByTestId('ws-single-label-chip-sad')).toHaveCount(0);
  });
});

test.describe('arbitration layout: negative paths keep the normal review card', () => {
  test('a dispute participant reviews normally', async ({ page }) => {
    await gotoWorkspace(page, PARTICIPANT);
    await expect(page.getByTestId('ws-arbitration-card')).toHaveCount(0);
    await expect(page.getByTestId('ws-review-row-approve').first()).toBeVisible();
  });

  test('a non-participant without the can_arbitrate flag reviews normally', async ({ page }) => {
    await gotoWorkspace(page, BYSTANDER);
    await expect(page.getByTestId('ws-arbitration-card')).toHaveCount(0);
    await expect(page.getByTestId('ws-review-row-approve').first()).toBeVisible();
  });

  test('an arbiter on a non-disputed unit reviews normally', async ({ page }) => {
    /* Overwrite the participant's decision with an agreeing one so there
       is nothing to arbitrate. Under T001's default minReviewers = 1 one
       agreeing review would derive FINALIZED (which issue #308 locks into
       the read-only card, a different branch than the one under test), so
       the threshold is raised to 2: one agreeing review of two required
       derives APPROVED, the interim state that keeps the normal card. */
    await seed(page, {
      role: 'reviewer',
      payload: labelPayload('sad'),
      identity: { annotatorId: ANNOTATOR, reviewerId: PARTICIPANT },
    });
    await patchDataFile(page, 'task-detail.data.js', `
      window.LabelSuiteTaskDetailData.profiles.${TASK}.minReviewers = 2;
    `);
    await page.reload();
    await expect(page.getByTestId('ws-arbitration-card')).toHaveCount(0);
    await expect(page.getByTestId('ws-review-row-approve').first()).toBeVisible();
  });
});

test.describe('A/B voting', () => {
  test('submitting a choice stores the vote and finalizes the item', async ({ page }) => {
    await page.getByTestId('ws-arbitration-choose-b').click();
    await page.getByTestId('ws-arbitration-submit').click();

    const state = await page.evaluate(() =>
      window.LabelSuiteAnnotationWorkspaceData.getArbitrationState(
        'T001', 'official_run', 'sent-001', { annotatorId: 'kioleemg12' }
      )
    );
    const item = state['single_label::single_label'];
    expect(item).toBeTruthy();
    expect(item.votes).toHaveLength(1);
    expect(item.votes[0].arbiter_id).toBe(ARBITER);
    expect(item.votes[0].choice).toBe('B');
    expect(item.finalized_value).toBe('fear');
    expect(item.finalized_by).toBe(ARBITER);
  });

  test('a fully arbitrated unit derives to finalized', async ({ page }) => {
    await page.getByTestId('ws-arbitration-choose-a').click();
    await page.getByTestId('ws-arbitration-submit').click();

    const status = await page.evaluate(() =>
      window.LabelSuiteAnnotationWorkspaceData.getReviewUnitStatus(
        'T001', 'official_run', 'sent-001', { annotatorId: 'kioleemg12' }, ['single_label']
      )
    );
    expect(status).toBe('finalized');
  });

  test('submit without choosing every item writes nothing', async ({ page }) => {
    await page.getByTestId('ws-arbitration-submit').click();

    const state = await page.evaluate(() =>
      window.LabelSuiteAnnotationWorkspaceData.getArbitrationState(
        'T001', 'official_run', 'sent-001', { annotatorId: 'kioleemg12' }
      )
    );
    expect(Object.keys(state)).toHaveLength(0);
  });
});

test.describe('per-item majority convergence (resolveDisputeConvergence)', () => {
  /* Data-level contract of the convergence rules (issue #147 ⑥③):
   * among N reviewers, reviewers absent from reviewerValues implicitly
   * agreed with the annotator's value. A value needs a strict majority
   * (> N/2) to converge; otherwise the item goes to the dispute pool.
   */
  const resolve = (
    page: Page,
    reviewerValues: Record<string, unknown>,
    reviewerCount: number
  ) =>
    page.evaluate(
      (a) =>
        window.LabelSuiteAnnotationWorkspaceData.resolveDisputeConvergence(
          { outKey: 'single_label', key: 'single_label', annotatorValue: 'sad', reviewerValues: a.reviewerValues },
          a.reviewerCount
        ),
      { reviewerValues, reviewerCount }
    );

  test('N=1 never converges: no majority is possible', async ({ page }) => {
    const r = await resolve(page, { reviewer_wang: 'fear' }, 1);
    expect(r.converged).toBe(false);
  });

  test('N=2 unanimous reviewers converge to their value', async ({ page }) => {
    const r = await resolve(page, { reviewer_wang: 'fear', reviewer_li: 'fear' }, 2);
    expect(r).toEqual({ converged: true, value: 'fear' });
  });

  test('N=2 split (one agrees with the annotator) is a tie: pool', async ({ page }) => {
    const r = await resolve(page, { reviewer_wang: 'fear' }, 2);
    expect(r.converged).toBe(false);
  });

  test('N=3 with a 2-vote majority converges', async ({ page }) => {
    const r = await resolve(page, { reviewer_wang: 'fear', reviewer_li: 'fear' }, 3);
    expect(r).toEqual({ converged: true, value: 'fear' });
  });

  test('N=3 all divergent: no value reaches a majority, pool', async ({ page }) => {
    const r = await resolve(page, { reviewer_wang: 'fear', reviewer_li: 'joy' }, 3);
    expect(r.converged).toBe(false);
  });

  test('a converged item auto-finalizes: no A/B row for it', async ({ page }) => {
    /* T005 (multi_dim, N=2): both reviewers score fluency 1 against the
       annotator's 3 — 2/2 votes converge, no arbitration needed. Only li
       touches adequacy (5 vs 3): wang's implicit agreement makes it a 1-1
       tie, so adequacy alone gets an A/B row. */
    const t005 = { task: 'T005', sample: 'mt-001' };
    await seed(page, {
      ...t005, role: 'annotator',
      payload: dimsPayload({ fluency: 3, adequacy: 3, coherence: 3 }),
      identity: { annotatorId: ANNOTATOR },
    });
    await seed(page, {
      ...t005, role: 'reviewer',
      payload: dimsPayload({ fluency: 1, adequacy: 3, coherence: 3 }),
      identity: { annotatorId: ANNOTATOR, reviewerId: PARTICIPANT },
    });
    await seed(page, {
      ...t005, role: 'reviewer',
      payload: dimsPayload({ fluency: 1, adequacy: 5, coherence: 3 }),
      identity: { annotatorId: ANNOTATOR, reviewerId: BYSTANDER },
    });
    await page.goto(buildWorkspaceUrl({
      task_id: 'T005', sample_id: 'mt-001', role: 'reviewer', run_type: 'official_run',
      annotator_id: ANNOTATOR, reviewer_id: ARBITER,
    }));

    await expect(page.getByTestId('ws-arbitration-card')).toBeVisible();
    await expect(page.getByTestId('ws-arbitration-converged')).toHaveCount(1);
    await expect(page.getByTestId('ws-arbitration-converged')).toContainText('fluency');
    const items = page.getByTestId('ws-arbitration-item');
    await expect(items).toHaveCount(1);
    await expect(items.first()).toContainText('adequacy');
  });
});
