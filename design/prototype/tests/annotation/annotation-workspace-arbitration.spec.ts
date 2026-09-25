import { test, expect, type Page } from '@playwright/test';
import { buildWorkspaceUrl, fillArbitrationReasons, skipGuidelineModal } from './_workspace-helpers';

/* Workspace arbitration layout (spec 015, issue #147 P3c; issue #596
 * FR-060/FR-061/FR-093).
 *
 * When an arbitration-eligible reviewer (can_arbitrate AND not a dispute
 * participant, FR-060) opens a DISPUTED unit, the whole review card switches
 * to an arbitration layout: the arbiter picks per dispute item between the
 * annotator's value (A) and the reviewer side's value (B) — they never
 * re-annotate, so correction controls and the row decisions must not render
 * at all.
 *
 * issue #596 (FR-093): exactly ONE reviewer owns a unit, so there is no
 * quorum and no majority convergence left to skip the pool with — every
 * dispute item reaches the arbiter. seedDisputedUnit() therefore seeds that
 * single reviewer only; the second silently-agreeing reviewer the old
 * min_reviewers = 2 tie needed is gone, and with it the reason the card had
 * to pick a B value out of a per-reviewer list (design.md D2: MUST NOT
 * 出現多個 B). BYSTANDER (li) still means "never reviewed this unit".
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
    votes: Array<{ arbiter_id: string; choice: 'adopt_a' | 'adopt_b' | 'reject'; voted_at: string }>;
    finalized_value?: unknown;
    finalized_by?: string;
  }>;
  getReviewUnitStatus: (
    taskId: string, runType: string, sampleId: string,
    identity: { annotatorId?: string }, outKeys: string[]
  ) => string | null;
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

/* Annotator says sad, the unit's ONE assigned reviewer (reviewer_wang) says
 * fear -> disputed with one dispute item (single_label::single_label), whose
 * single B candidate is 'fear'. */
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
    for (const decision of ['approve', 'modify', 'bypass']) {
      await expect(page.getByTestId('ws-review-row-' + decision)).toHaveCount(0);
    }
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

  /* issue #921 (FR-093): PARTICIPANT (wang) already holds the sticky
     submission on this unit (seeded by beforeEach's seedDisputedUnit()), so
     FR-093 makes wang -- and only wang -- its assigned reviewer. Before the
     workspace enforced assignment, BYSTANDER (li, no can_arbitrate flag)
     could still open and normally review a unit that was never theirs; this
     was exactly the multi-submission shape FR-093 forbids and the bug issue
     #921 fixes (the "premise" of this test -- a non-owning, non-arbiter
     reviewer getting the normal interactive card on someone else's disputed
     unit -- no longer holds under the assignment gate). Repurposed to
     assert the now-correct outcome: li gets the read-only NOT_ASSIGNED
     gate, not the normal card and not the arbitration layout either (li
     lacks can_arbitrate). */
  test('a non-participant without the can_arbitrate flag is gated as not assigned, not shown the normal card', async ({ page }) => {
    await gotoWorkspace(page, BYSTANDER);
    await expect(page.getByTestId('ws-arbitration-card')).toHaveCount(0);
    await expect(page.getByTestId('ws-review-row-approve')).toHaveCount(0);
    await expect(page.getByTestId('ws-review-not-assigned')).toBeVisible();
    await expect(page.getByTestId('ws-review-submit-btn')).toBeHidden();
  });

  /* PENDING, not "agreeing reviewer": with one reviewer per unit (FR-093)
     an agreeing review derives straight to FINALIZED, which issue #308
     locks into the read-only card -- a different branch than the
     interactive one under test. A unit whose reviewer has not submitted yet
     is the only non-disputed state that still keeps the normal card, so
     seed a second sample the arbiter has yet to review.
     issue #921 (FR-093, v6.15.0/issue #868): ARBITER (chen) is reserved
     from ALL new round-robin assignment, so chen can never be a fresh
     PENDING unit's assignee -- there is no reachable state left where an
     arbiter "normally reviews" a non-disputed unit as its owner. Repurposed
     to assert the now-correct outcome instead: chen's arbitration
     eligibility (FR-060) does not exempt them from the FR-093 assignment
     gate on a unit that is not (yet) disputed -- they see the read-only
     NOT_ASSIGNED note, the same as any other non-assignee, not the
     arbitration layout and not the normal interactive card. */
  test('an arbiter on a non-disputed, unassigned unit is gated as not assigned, not shown the normal card', async ({ page }) => {
    const PENDING_SAMPLE = 'sent-002';
    await seed(page, {
      sample: PENDING_SAMPLE, role: 'annotator',
      payload: labelPayload('sad'), identity: { annotatorId: ANNOTATOR },
    });
    await page.goto(buildWorkspaceUrl({
      task_id: TASK, sample_id: PENDING_SAMPLE, role: 'reviewer', run_type: 'official_run',
      annotator_id: ANNOTATOR, reviewer_id: ARBITER,
    }));

    await expect(page.getByTestId('ws-arbitration-card')).toHaveCount(0);
    await expect(page.getByTestId('ws-review-row-approve')).toHaveCount(0);
    await expect(page.getByTestId('ws-review-not-assigned')).toBeVisible();
    await expect(page.getByTestId('ws-review-submit-btn')).toBeHidden();
  });
});

test.describe('A/B voting', () => {
  test('submitting a choice stores the vote and finalizes the item', async ({ page }) => {
    await page.getByTestId('ws-arbitration-choose-b').click();
    await fillArbitrationReasons(page);
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
    // issue #596 FR-061: the stored outcome is one of ARBITRATION_OUTCOMES,
    // not the positional letter the button shows.
    expect(item.votes[0].choice).toBe('adopt_b');
    expect(item.finalized_value).toBe('fear');
    expect(item.finalized_by).toBe(ARBITER);
  });

  test('a fully arbitrated unit derives to finalized', async ({ page }) => {
    await page.getByTestId('ws-arbitration-choose-a').click();
    await fillArbitrationReasons(page);
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
