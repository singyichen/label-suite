import { test, expect, type Page } from '@playwright/test';
import { buildWorkspaceUrl, skipGuidelineModal } from './_workspace-helpers';

/* issue #596 (task 1.1, RED) -- REVIEW_UNIT_STATUS collapses from five states
 * to three (`pending | disputed | finalized`), derived by a single predicate
 * per design.md D1. The current implementation
 * (annotation-workspace.data.js getReviewUnitStatus()) still implements the
 * OLD five-state / quorum model: REVIEW_UNIT_STATUS has PENDING / APPROVED /
 * MODIFIED / DISPUTED / FINALIZED, and a lone reviewer's correction at
 * min_reviewers = 1 auto-CONVERGES to FINALIZED without ever visiting an
 * arbiter (resolveDisputeConvergence(), issue #551 point 3). Under the new
 * single-owner-relay model (FR-051, design.md D1 row 4) any `modify` or
 * `bypass` decision MUST send the outKey to the dispute pool and MUST NOT
 * auto-finalize regardless of reviewer count -- there is no "quorum" concept
 * left to satisfy (FR-093: exactly one reviewer per unit).
 *
 * This file seeds through the SAME data-layer entry points the sibling
 * annotation-review-unit.spec.ts already uses for this exact function
 * (markSampleSubmitted / submitArbitration via page.evaluate), not raw
 * localStorage, because that is the established idiom for exercising
 * getReviewUnitStatus() directly. The one exception is the final exception
 * pool (case 6): design.md D2 documents the future `exceptionPool` shape but
 * no write path exists in the codebase yet, so that case seeds a
 * localStorage record directly using the `labelsuite.wsExceptionPool`
 * prefix, which is the decided contract Green (task 1.3) must implement
 * against -- see the comment on that test.
 *
 * Every case seeds AT MOST one reviewer per unit: FR-093 ("每個審核單位恰有
 * 一位指派審核員") and FR-051 v5.0.0 forbid a review unit from ever having
 * more than one reviewer, and status derivation MUST read only that one
 * assigned reviewer's decision.
 *
 * Traceability: openspec/changes/2026-09-01-single-owner-review-relay/
 *   design.md D1 (status table), D2 (persisted shapes), D3 (bypass);
 *   specs/annotation/015-annotation-workspace delta FR-051 / AC-4.52,
 *   FR-063 (exclude_from_dataset MUST NOT produce a gold value).
 */

type Identity = { annotatorId?: string; reviewerId?: string };

type WorkspaceData = {
  REVIEW_UNIT_STATUS: Record<string, string>;
  getReviewUnitStatus: (
    taskId: string,
    runType: string,
    sampleId: string,
    identity: { annotatorId: string },
    outKeys: string[]
  ) => string | null;
  markSampleSubmitted: (
    taskId: string,
    role: string,
    runType: string,
    sampleId: string,
    payload: unknown,
    historySummary: string,
    identity: Identity
  ) => void;
  getDisputeItems: (
    taskId: string,
    runType: string,
    sampleId: string,
    identity: { annotatorId: string },
    outKeys: string[]
  ) => Array<{ outKey: string; key: string }>;
  submitArbitration: (
    taskId: string,
    runType: string,
    sampleId: string,
    identity: Identity,
    decisions: Array<{ itemId: string; choice: string; value: unknown; reason: string }>
  ) => void;
};

const TASK = 'T001';
const SAMPLE = 'sent-001';
const ANNOTATOR = 'kioleemg12';
const REVIEWER = 'reviewer_wang';
const ARBITER = 'reviewer_chen'; // REVIEWER_ROSTER entry with can_arbitrate: true

const labelPayload = (selected: string) => ({ previewState: { single_label: { selected } } });
const noAnswerPayload = () => ({ previewState: { single_label: {} } });

/* Seeds a submission bucket directly rather than driving the UI -- same
 * approach as the sibling annotation-review-unit.spec.ts `seed()` helper. */
function seed(
  page: Page,
  args: { role: string; runType: string; payload: unknown; identity: Identity }
): Promise<void> {
  return page.evaluate(
    (a) => {
      (window as unknown as { LabelSuiteAnnotationWorkspaceData: WorkspaceData })
        .LabelSuiteAnnotationWorkspaceData.markSampleSubmitted(
          'T001',
          a.role,
          a.runType,
          'sent-001',
          a.payload,
          '',
          a.identity
        );
    },
    args
  );
}

function statusOf(page: Page, runType: string): Promise<string | null> {
  return page.evaluate(
    (a) =>
      (window as unknown as { LabelSuiteAnnotationWorkspaceData: WorkspaceData })
        .LabelSuiteAnnotationWorkspaceData.getReviewUnitStatus(
          'T001',
          a.runType,
          'sent-001',
          { annotatorId: 'kioleemg12' },
          ['single_label']
        ),
    { runType }
  );
}

async function firstDisputeItemId(page: Page, runType: string): Promise<string> {
  const items = await page.evaluate(
    (a) =>
      (window as unknown as { LabelSuiteAnnotationWorkspaceData: WorkspaceData })
        .LabelSuiteAnnotationWorkspaceData.getDisputeItems(
          'T001',
          a.runType,
          'sent-001',
          { annotatorId: 'kioleemg12' },
          ['single_label']
        ),
    { runType }
  );
  expect(items.length, 'expected at least one dispute item to adjudicate').toBeGreaterThan(0);
  return `${items[0].outKey}::${items[0].key}`;
}

function adjudicate(
  page: Page,
  args: { runType: string; itemId: string; choice: string; value: unknown; arbiterId: string }
): Promise<void> {
  return page.evaluate((a) => {
    (window as unknown as { LabelSuiteAnnotationWorkspaceData: WorkspaceData })
      .LabelSuiteAnnotationWorkspaceData.submitArbitration(
        'T001',
        a.runType,
        'sent-001',
        { annotatorId: 'kioleemg12', reviewerId: a.arbiterId },
        [{ itemId: a.itemId, choice: a.choice, value: a.value, reason: '仲裁理由（測試）' }]
      );
  }, args);
}

/* Seeds design.md D2's `exceptionPool` persisted shape. No data-layer write
 * function exists for this yet (see file header) -- this writes a
 * localStorage record directly under the `labelsuite.wsExceptionPool`
 * prefix, keyed by the same `task_id x run_type x annotator_id x sample_id`
 * addressing D2 pins for every review-unit bucket (matching the sibling
 * `labelsuite.wsArbitration` / `labelsuite.wsSubmissions` convention in
 * annotation-workspace.data.js), with the value shaped exactly as D2
 * specifies: `{ [outKey]: { action, ... } }`. This key is the decided
 * contract Green (task 1.3) must implement against -- if Green's
 * implementation disagrees with this key, Green is wrong, not this test. */
function seedExceptionPoolExclusion(
  page: Page,
  args: { runType: string; outKey: string }
): Promise<void> {
  return page.evaluate((a) => {
    const key = `labelsuite.wsExceptionPool.T001::${a.runType}::kioleemg12::sent-001`;
    window.localStorage.setItem(
      key,
      JSON.stringify({
        [a.outKey]: {
          resolver_id: 'pl_chen',
          action: 'exclude_from_dataset',
          reason: '測試排除（issue #596 RED）',
          resolved_at: new Date().toISOString(),
        },
      })
    );
  }, args);
}

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
  await page.goto(buildWorkspaceUrl({ task_id: TASK, sample_id: SAMPLE }));
});

test.describe('issue #596: REVIEW_UNIT_STATUS three-state derivation (task 1.1)', () => {
  test('annotator has not submitted -> null', async ({ page }) => {
    expect(await statusOf(page, 'official_run')).toBeNull();
  });

  test('reviewer has not submitted -> pending', async ({ page }) => {
    await seed(page, {
      role: 'annotator',
      runType: 'official_run',
      payload: labelPayload('sad'),
      identity: { annotatorId: ANNOTATOR },
    });
    expect(await statusOf(page, 'official_run')).toBe('pending');
  });

  test('every outKey decided approve -> finalized', async ({ page }) => {
    await seed(page, {
      role: 'annotator',
      runType: 'official_run',
      payload: labelPayload('sad'),
      identity: { annotatorId: ANNOTATOR },
    });
    await seed(page, {
      role: 'reviewer',
      runType: 'official_run',
      payload: labelPayload('sad'), // unchanged value = approve on every outKey
      identity: { annotatorId: ANNOTATOR, reviewerId: REVIEWER },
    });
    expect(await statusOf(page, 'official_run')).toBe('finalized');
  });

  /* design.md D1 row 4 / FR-051 point 4: a `modify` decision MUST send the
   * outKey to the dispute pool and MUST stay disputed until arbitrated --
   * there is no reviewer-count quorum left to satisfy (FR-093: exactly one
   * reviewer per unit). The CURRENT implementation still treats a lone
   * reviewer's correction as the full quorum and auto-converges it to
   * FINALIZED (resolveDisputeConvergence, issue #551 point 3) -- see the
   * sibling annotation-review-unit.spec.ts test "a lone reviewer's
   * correction converges the unit at min_reviewers = 1", which asserts
   * exactly the behavior this test says MUST NOT happen anymore. */
  test('a lone reviewer "modify" decision must stay disputed, not auto-finalize', async ({ page }) => {
    await seed(page, {
      role: 'annotator',
      runType: 'official_run',
      payload: labelPayload('sad'),
      identity: { annotatorId: ANNOTATOR },
    });
    await seed(page, {
      role: 'reviewer',
      runType: 'official_run',
      payload: labelPayload('fear'), // reviewer corrects the value
      identity: { annotatorId: ANNOTATOR, reviewerId: REVIEWER },
    });
    expect(await statusOf(page, 'official_run')).toBe('disputed');
  });

  /* design.md D3: a `bypass` decision ("無法判定") carries no replacement
   * value -- modeled here as the reviewer submitting no selection at all,
   * which the CURRENT compareOutputAnswer() reads as a genuine diff
   * (annotator: 'sad', reviewer: null) and the CURRENT quorum-of-one logic
   * auto-converges to FINALIZED with that null value as the "winner". The
   * new model requires this to stay disputed until an arbiter picks A or
   * records the item as no-判定 (FR-061 point 2). */
  test('a lone reviewer "bypass" (no replacement value) must stay disputed, not auto-finalize', async ({ page }) => {
    await seed(page, {
      role: 'annotator',
      runType: 'official_run',
      payload: labelPayload('sad'),
      identity: { annotatorId: ANNOTATOR },
    });
    await seed(page, {
      role: 'reviewer',
      runType: 'official_run',
      payload: noAnswerPayload(),
      identity: { annotatorId: ANNOTATOR, reviewerId: REVIEWER },
    });
    expect(await statusOf(page, 'official_run')).toBe('disputed');
  });

  /* FR-093 ("每個審核單位恰有一位指派審核員") and FR-051 v5.0.0 forbid a
   * review unit from ever having more than one reviewer -- status
   * derivation MUST read only that unit's single assigned reviewer's
   * decision. So this reaches `disputed` the way the new model actually
   * reaches it: ONE reviewer decides `modify` on the outKey (the same
   * precondition as the case above), then that item is adjudicated.
   *
   * This is expected to legitimately FAIL today, for the same root cause
   * as the `modify` and `bypass` cases above: resolveDisputeConvergence()
   * treats a single reviewer as full quorum and auto-finalizes instead of
   * leaving the unit disputed, so the single-reviewer dispute path this
   * case depends on does not exist yet. The failure is in the state
   * derivation, not in arbitration itself -- once a genuinely disputed
   * single-reviewer unit exists, the current submitArbitration() /
   * resolveDisputeConvergence() adjudication path already finalizes it
   * correctly (see the two-reviewer precondition this test previously
   * used, which the current code does resolve after arbitration). */
  test('after every disputed item has been adjudicated -> finalized', async ({ page }) => {
    await seed(page, {
      role: 'annotator',
      runType: 'official_run',
      payload: labelPayload('sad'),
      identity: { annotatorId: ANNOTATOR },
    });
    await seed(page, {
      role: 'reviewer',
      runType: 'official_run',
      payload: labelPayload('fear'), // reviewer decides `modify`
      identity: { annotatorId: ANNOTATOR, reviewerId: REVIEWER },
    });
    expect(await statusOf(page, 'official_run')).toBe('disputed');

    const itemId = await firstDisputeItemId(page, 'official_run');
    await adjudicate(page, {
      runType: 'official_run',
      itemId,
      choice: 'adopt_a',
      value: 'sad',
      arbiterId: ARBITER,
    });
    expect(await statusOf(page, 'official_run')).toBe('finalized');
  });

  /* design.md D1 row 5 / FR-063: an outKey resolved via the final exception
   * pool's "自資料集排除" (exclude_from_dataset) action MUST NOT read as
   * finalized -- it produces no gold value. Baseline is a unit the CURRENT
   * code already finalizes (unanimous approve) so a failure here can only
   * be explained by the exception-pool exclusion marker being ignored,
   * which is exactly the case: getReviewUnitStatus() has no exceptionPool
   * awareness at all yet. */
  test('an item marked exclude_from_dataset must not read as finalized', async ({ page }) => {
    await seed(page, {
      role: 'annotator',
      runType: 'official_run',
      payload: labelPayload('sad'),
      identity: { annotatorId: ANNOTATOR },
    });
    await seed(page, {
      role: 'reviewer',
      runType: 'official_run',
      payload: labelPayload('sad'),
      identity: { annotatorId: ANNOTATOR, reviewerId: REVIEWER },
    });
    expect(await statusOf(page, 'official_run')).toBe('finalized'); // baseline, pre-exclusion

    await seedExceptionPoolExclusion(page, { runType: 'official_run', outKey: 'single_label' });
    expect(await statusOf(page, 'official_run')).not.toBe('finalized');
  });
});
