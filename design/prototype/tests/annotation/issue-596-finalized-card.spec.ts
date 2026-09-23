import { test, expect, type Page } from '@playwright/test';
import { buildWorkspaceUrl, skipGuidelineModal } from './_workspace-helpers';

/* Issue #596 introduced FR-094's pure-text finalized card. Issue #880
 * refines its information hierarchy: every finalized output shows the final
 * result; complex arbitration or exception-pool paths additionally show the
 * annotator's original answer and a data-derived finalization basis. The
 * retired vote table, responsibility-chain micro trace, actor tooltips and
 * all answer/decision controls remain absent from the finalized card.
 *
 * Seeding follows the existing data-layer helpers. A differing reviewer
 * payload creates a dispute; arbitration or exception-pool state supplies
 * the finalization basis. The assertions deliberately cover both adopted
 * sides, bypass, exception actions and the direct-approval result-only path.
 *
 * Traceability: specs/annotation/015-annotation-workspace/spec.md FR-053,
 * FR-094, FR-095, FR-097 and AC-3.52 (issues #596 and #880).
 */

type Identity = { annotatorId?: string; reviewerId?: string };

type DisputeItem = { outKey: string; key: string; annotatorValue: unknown };

type WorkspaceData = {
  markSampleSubmitted: (
    taskId: string, role: string, runType: string, sampleId: string,
    payload: unknown, historySummary: string, identity: Identity
  ) => void;
  getDisputeItems: (
    taskId: string, runType: string, sampleId: string,
    identity: Identity, outKeys: string[]
  ) => DisputeItem[];
  submitArbitration: (
    taskId: string, runType: string, sampleId: string, identity: Identity,
    decisions: { itemId: string; choice: string; value: unknown; reason?: string }[]
  ) => void;
  getReviewUnitStatus: (
    taskId: string, runType: string, sampleId: string,
    identity: Identity, outKeys: string[]
  ) => string | null;
};

/* No `declare global`: annotation-workspace-arbitration.spec.ts already
 * declares this window property with a different shape and a second
 * declaration collides (TS2717). Cast per evaluate call instead. */

const TASK = 'T001';
const SAMPLE = 'sent-001';
const OUT_KEY = 'single_label';
const ANNOTATOR = 'kioleemg12';
const REVIEWER = 'reviewer_wang';
const ARBITER = 'reviewer_chen'; // demo roster: can_arbitrate, non-participant
const LEAD = 'lead@labelsuite.io';

const labelPayload = (selected: string) => ({ previewState: { single_label: { selected } } });

function seed(
  page: Page,
  args: { role: string; payload: unknown; identity: Identity }
): Promise<void> {
  return page.evaluate((a) => {
    (window as unknown as { LabelSuiteAnnotationWorkspaceData: WorkspaceData })
      .LabelSuiteAnnotationWorkspaceData.markSampleSubmitted(
        'T001', a.role, 'official_run', 'sent-001', a.payload, '', a.identity
      );
  }, args);
}

/* Loads the workspace once so annotation-workspace.data.js exists, then
 * seeds the annotator plus one reviewer whose decision is `decision`. */
async function seedUnit(page: Page, decision: 'approve' | 'modify' | 'bypass'): Promise<void> {
  await page.goto(buildWorkspaceUrl({ task_id: TASK, sample_id: SAMPLE, role: 'annotator' }));
  await seed(page, {
    role: 'annotator',
    payload: labelPayload('sad'),
    identity: { annotatorId: ANNOTATOR },
  });
  const reviewerPayload =
    decision === 'approve'
      ? { ...labelPayload('sad'), decisions: { [OUT_KEY]: 'approve' }, reasons: {}, values: {} }
      : decision === 'modify'
        ? {
            ...labelPayload('happy'),
            decisions: { [OUT_KEY]: 'modify' },
            reasons: { [OUT_KEY]: 'tone is positive' },
            values: { [OUT_KEY]: 'happy' },
          }
        /* design.md D2: bypass writes NO values[outKey] -- the absent field
           is the sentinel, so the payload carries no answer at all. */
        : {
            previewState: {},
            decisions: { [OUT_KEY]: 'bypass' },
            reasons: { [OUT_KEY]: 'ambiguous sample' },
            values: {},
          };
  await seed(page, {
    role: 'reviewer',
    payload: reviewerPayload,
    identity: { annotatorId: ANNOTATOR, reviewerId: REVIEWER },
  });
}

/* Arbitrates every open dispute item of the unit with one choice. `value`
 * is what the adopted side holds; adopt_b on a bypass item adopts "no
 * determination", which design.md D3 stores as the reviewer's absent value
 * (null), never the annotator's answer. */
function arbitrate(page: Page, choice: 'adopt_a' | 'adopt_b', value: unknown): Promise<void> {
  return page.evaluate((a) => {
    const data = (window as unknown as { LabelSuiteAnnotationWorkspaceData: WorkspaceData })
      .LabelSuiteAnnotationWorkspaceData;
    const identity = { annotatorId: 'kioleemg12', reviewerId: 'reviewer_wang' };
    const items = data.getDisputeItems('T001', 'official_run', 'sent-001', identity, ['single_label']);
    data.submitArbitration(
      'T001', 'official_run', 'sent-001',
      { annotatorId: 'kioleemg12', reviewerId: 'reviewer_chen' },
      items.map((item) => ({
        itemId: item.outKey + '::' + item.key,
        choice: a.choice,
        value: a.value,
        reason: 'arbiter call',
      }))
    );
  }, { choice, value });
}

/* design.md D2's exceptionPool blob: one record per outKey under
 * `labelsuite.wsExceptionPool.<taskId>::<runType>::<annotatorId>::<sampleId>`.
 * Group 6 owns the write UI; this is the storage contract it will write. */
function seedExceptionPoolResolution(page: Page, action: string): Promise<void> {
  return page.evaluate((a) => {
    window.localStorage.setItem(
      'labelsuite.wsExceptionPool.T001::official_run::kioleemg12::sent-001',
      JSON.stringify({
        single_label: {
          resolver_id: a.lead,
          action: a.action,
          finalized_value: 'neutral',
          reason: 'lead decided',
          resolved_at: new Date().toISOString(),
        },
      })
    );
  }, { action, lead: LEAD });
}

function gotoAsReviewer(page: Page) {
  return page.goto(buildWorkspaceUrl({
    task_id: TASK, sample_id: SAMPLE, role: 'reviewer', run_type: 'official_run',
    annotator_id: ANNOTATOR, reviewer_id: REVIEWER,
  }));
}

test.describe('issue #596 FR-094 + issue #880: pure-text finalized result summary', () => {
  test.beforeEach(async ({ page }) => {
    await skipGuidelineModal(page);
  });

  test('a modified-then-arbitrated unit shows original, adopted result and reviewer-side basis', async ({ page }) => {
    await seedUnit(page, 'modify');
    await arbitrate(page, 'adopt_b', 'happy');
    await gotoAsReviewer(page);

    const card = page.getByTestId('ws-review-finalized-card');
    await expect(card.getByTestId('ws-finalized-original')).toHaveText('標記員原答案：single_label：sad');
    await expect(card.getByTestId('ws-finalized-result')).toHaveText('最終結果：single_label：happy');
    await expect(card.getByTestId('ws-finalized-basis')).toHaveText('定稿依據：仲裁採用審核員答案');
  });

  test('adopting a bypassed reviewer side renders the final result as no answer', async ({ page }) => {
    await seedUnit(page, 'bypass');
    await arbitrate(page, 'adopt_b', null);
    await gotoAsReviewer(page);

    await expect(page.getByTestId('ws-finalized-result')).toHaveText('最終結果：single_label：（無）');
    await expect(page.getByTestId('ws-finalized-basis')).toHaveText('定稿依據：仲裁採用審核員答案');
  });

  test('adopt_a keeps the annotator value and names the annotator-side basis', async ({ page }) => {
    await seedUnit(page, 'modify');
    await arbitrate(page, 'adopt_a', 'sad');
    await gotoAsReviewer(page);

    await expect(page.getByTestId('ws-finalized-result')).toHaveText('最終結果：single_label：sad');
    await expect(page.getByTestId('ws-finalized-basis')).toHaveText('定稿依據：仲裁採用標記員答案');
  });

  test('an exception-pool closure shows its finalized value and disposition basis', async ({ page }) => {
    await seedUnit(page, 'modify');
    await seedExceptionPoolResolution(page, 'adopt_annotator');
    await gotoAsReviewer(page);

    await expect(page.getByTestId('ws-finalized-result')).toHaveText('最終結果：single_label：neutral');
    await expect(page.getByTestId('ws-finalized-basis')).toHaveText('定稿依據：例外池採用標記員答案');
  });

  test('an approved unit shows only the final result', async ({ page }) => {
    await seedUnit(page, 'approve');
    await gotoAsReviewer(page);

    await expect(page.getByTestId('ws-finalized-result')).toHaveText('最終結果：single_label：sad');
    await expect(page.getByTestId('ws-finalized-original')).toHaveCount(0);
    await expect(page.getByTestId('ws-finalized-basis')).toHaveCount(0);
  });

  test('the retired vote table and micro trace are gone', async ({ page }) => {
    await seedUnit(page, 'modify');
    await arbitrate(page, 'adopt_b', 'happy');
    await gotoAsReviewer(page);

    const card = page.getByTestId('ws-review-finalized-card');
    await expect(card.getByTestId('ws-finalized-vote')).toHaveCount(0);
    await expect(card.getByTestId('ws-finalized-trace')).toHaveCount(0);
    await expect(card.getByTestId('ws-trace-actor')).toHaveCount(0);
    await expect(card).not.toContainText('多數決');
  });

  test('the card remains pure text with no answer or decision controls', async ({ page }) => {
    await seedUnit(page, 'modify');
    await arbitrate(page, 'adopt_b', 'happy');
    await gotoAsReviewer(page);

    const card = page.getByTestId('ws-review-finalized-card');
    await expect(card).toBeVisible();
    await expect(card.locator('input, select, textarea, button')).toHaveCount(0);
    await expect(page.getByTestId('ws-review-row-approve')).toHaveCount(0);
    await expect(page.getByTestId('ws-review-row-modify')).toHaveCount(0);
    await expect(page.getByTestId('ws-review-row-bypass')).toHaveCount(0);
    await expect(page.locator('#wsReviewSubmitBtn')).toBeHidden();
  });
});
