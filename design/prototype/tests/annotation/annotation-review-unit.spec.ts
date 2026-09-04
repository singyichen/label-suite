import { test, expect, type Page } from '@playwright/test';
import { buildWorkspaceUrl, skipGuidelineModal } from './_workspace-helpers';

/* Review unit data model (spec 015 v3.9.0, issue #146 P2a).
 *
 * The review unit is `sample_id x annotator_id x run_type`: one sample
 * labelled by three annotators is three independently reviewable units, in
 * BOTH run types. This file pins the data contract only -- no layout. The
 * list granularity and the converged review card land in the follow-up PRs.
 *
 * Two things are asserted here:
 *   1. compareOutputAnswer() -- "did the reviewer change the annotator's
 *      answer", per output type, reusing the existing merge keys.
 *   2. getReviewUnitStatus() -- the five-state machine derived from the
 *      annotator's submission plus every reviewer submission on it.
 *
 * Traceability: specs/annotation/015-annotation-workspace/spec.md
 *   FR-051, FR-052, AC-4.9, AC-4.10, AC-4.11, SC-004K
 *
 * issue #596 fixup: the single-owner relay model (FR-093: exactly one
 * reviewer per unit) retires min_reviewers and the five-state machine's two
 * quorum-interim states (`approved` / `modified`) -- getReviewUnitStatus()
 * no longer accepts an `opts.minReviewers` argument at all, and the state
 * space collapses to three (`pending` | `disputed` | `finalized`, design.md
 * D1). The two cases below that existed ONLY to exercise "decided but short
 * of a >1 min_reviewers threshold" (`approved` / `modified`) are deleted:
 * there is no quorum left to be short of. "A lone reviewer's correction
 * converges the unit at min_reviewers = 1" is converted rather than
 * deleted -- the scenario itself (one reviewer submits a differing answer)
 * still occurs, it now MUST stay disputed instead of auto-finalizing (see
 * the sibling issue-596-review-unit-status.spec.ts, which pins this same
 * behavior as new-model RED/GREEN evidence).
 */

type Diff = { key: string; annotator: unknown; reviewer: unknown };
type Comparison = { equal: boolean; diffs: Diff[] };

type WorkspaceData = {
  REVIEW_UNIT_STATUS: Record<string, string>;
  compareOutputAnswer: (outKey: string, annotator: unknown, reviewer: unknown) => Comparison;
  getReviewUnitStatus: (
    taskId: string,
    runType: string,
    sampleId: string,
    identity: { annotatorId: string },
    outKeys: string[],
    opts?: { minReviewers?: number }
  ) => string | null;
  markSampleSubmitted: (
    taskId: string,
    role: string,
    runType: string,
    sampleId: string,
    payload: unknown,
    historySummary: string,
    identity: { annotatorId?: string; reviewerId?: string }
  ) => void;
};

const ANNOTATOR = 'kioleemg12';
const REVIEWER_A = 'reviewer_wang';
const REVIEWER_B = 'reviewer_li';
const TASK = 'T001';
const SAMPLE = 'sent-001';

function compare(page: Page, outKey: string, annotator: unknown, reviewer: unknown): Promise<Comparison> {
  return page.evaluate(
    (a) =>
      (window as unknown as { LabelSuiteAnnotationWorkspaceData: WorkspaceData })
        .LabelSuiteAnnotationWorkspaceData.compareOutputAnswer(a.outKey, a.annotator, a.reviewer),
    { outKey, annotator, reviewer }
  );
}

/* Seeds a submission bucket directly rather than driving the UI: this PR
 * changes no layout, and the reviewer card that would produce a *modified*
 * submission only arrives in the next PR. */
function seed(
  page: Page,
  args: { role: string; runType: string; payload: unknown; identity: { annotatorId?: string; reviewerId?: string } }
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

function statusOf(
  page: Page,
  args: { runType: string; minReviewers?: number }
): Promise<string | null> {
  return page.evaluate(
    (a) =>
      (window as unknown as { LabelSuiteAnnotationWorkspaceData: WorkspaceData })
        .LabelSuiteAnnotationWorkspaceData.getReviewUnitStatus(
          'T001',
          a.runType,
          'sent-001',
          { annotatorId: 'kioleemg12' },
          ['single_label'],
          a.minReviewers ? { minReviewers: a.minReviewers } : undefined
        ),
    args
  );
}

const labelPayload = (selected: string) => ({ previewState: { single_label: { selected } } });

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
  await page.goto(buildWorkspaceUrl({ task_id: TASK, sample_id: SAMPLE }));
});

test.describe('review unit: annotator vs reviewer comparison', () => {
  test('single_label agreement and disagreement', async ({ page }) => {
    expect(await compare(page, 'single_label', 'sad', 'sad')).toMatchObject({ equal: true, diffs: [] });

    const changed = await compare(page, 'single_label', 'sad', 'fear');
    expect(changed.equal).toBe(false);
    expect(changed.diffs).toEqual([{ key: 'single_label', annotator: 'sad', reviewer: 'fear' }]);
  });

  test('multi_label compares as a set, not a sequence', async ({ page }) => {
    const reordered = await compare(page, 'multi_label', ['sad', 'fear'], ['fear', 'sad']);
    expect(reordered.equal).toBe(true);

    const added = await compare(page, 'multi_label', ['sad'], ['sad', 'fear']);
    expect(added.equal).toBe(false);
    expect(added.diffs).toEqual([{ key: 'fear', annotator: null, reviewer: 'fear' }]);
  });

  /* DIM_CONSENSUS_TOLERANCE deliberately does NOT apply: it answers "are two
   * annotators close enough to agree", while a review unit asks "did the
   * reviewer change this value". A change of any size is a change. */
  test('single_dim uses strict equality, not the consensus tolerance', async ({ page }) => {
    expect((await compare(page, 'single_dim', 4, 4)).equal).toBe(true);

    const nudged = await compare(page, 'single_dim', 4, 4.1);
    expect(nudged.equal).toBe(false);
    expect(nudged.diffs).toEqual([{ key: 'single_dim', annotator: 4, reviewer: 4.1 }]);
  });

  test('multi_dim reports one diff per changed dimension', async ({ page }) => {
    const result = await compare(
      page,
      'multi_dim',
      { valence: 3, arousal: 5 },
      { valence: 3, arousal: 2 }
    );
    expect(result.equal).toBe(false);
    expect(result.diffs).toEqual([{ key: 'arousal', annotator: 5, reviewer: 2 }]);
  });

  test('entity_recognition diffs per merge key', async ({ page }) => {
    const same = await compare(
      page,
      'entity_recognition',
      [{ text: '確診', type: 'SYMPTOM' }],
      [{ text: '確診', type: 'SYMPTOM' }]
    );
    expect(same.equal).toBe(true);

    const retyped = await compare(
      page,
      'entity_recognition',
      [{ text: '確診', type: 'SYMPTOM' }],
      [{ text: '確診', type: 'DIAGNOSIS' }]
    );
    expect(retyped.equal).toBe(false);
    expect(retyped.diffs).toHaveLength(2);
    expect(retyped.diffs.map((d) => d.key).sort()).toEqual(['確診::DIAGNOSIS', '確診::SYMPTOM']);
  });

  test('relation_identification diffs per merge key', async ({ page }) => {
    const dropped = await compare(
      page,
      'relation_identification',
      [{ subj: 'A', rel: 'causes', obj: 'B' }],
      []
    );
    expect(dropped.equal).toBe(false);
    expect(dropped.diffs).toEqual([
      { key: 'A::causes::B', annotator: { subj: 'A', rel: 'causes', obj: 'B' }, reviewer: null },
    ]);
  });

  /* issue #581: the CompactAnswer is a span list keyed by (start, end,
     label), so it compares as a set like the other span-shaped types. The
     n-character retag count and the reordering case are pinned in
     issue-581-span-diff-and-stats.spec.ts. */
  test('sequence_tagging compares as a set of spans', async ({ page }) => {
    const span = { text: '台北', label: 'LOC', start: 13, end: 15 };
    const same = await compare(page, 'sequence_tagging', [span], [span]);
    expect(same.equal).toBe(true);

    const retagged = await compare(page, 'sequence_tagging', [span], [{ ...span, label: 'ORG' }]);
    expect(retagged.equal).toBe(false);
    expect(retagged.diffs).toEqual([
      { key: '13::15::LOC', annotator: span, reviewer: null },
      { key: '13::15::ORG', annotator: null, reviewer: { ...span, label: 'ORG' } },
    ]);
  });

  test('free_text compares verbatim', async ({ page }) => {
    expect((await compare(page, 'free_text', 'abc', 'abc')).equal).toBe(true);
    expect((await compare(page, 'free_text', 'abc', 'abd')).equal).toBe(false);
  });
});

test.describe('review unit: three-state machine', () => {
  test('no annotator submission means there is no review unit yet', async ({ page }) => {
    expect(await statusOf(page, { runType: 'official_run' })).toBeNull();
  });

  test('an unreviewed annotator submission is pending', async ({ page }) => {
    await seed(page, {
      role: 'annotator',
      runType: 'official_run',
      payload: labelPayload('sad'),
      identity: { annotatorId: ANNOTATOR },
    });
    expect(await statusOf(page, { runType: 'official_run' })).toBe('pending');
  });

  test('an agreeing reviewer finalizes the unit when min_reviewers is met', async ({ page }) => {
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
      identity: { annotatorId: ANNOTATOR, reviewerId: REVIEWER_A },
    });
    expect(await statusOf(page, { runType: 'official_run' })).toBe('finalized');
  });

  /* issue #596: FR-093 assigns exactly one reviewer per unit, so a lone
     reviewer's decision is immediately decisive -- there is no longer a
     "decided, still short of the required reviewer count" resting state to
     land in. A `modify` decision (the reviewer submits a differing answer)
     now sends the outKey straight to the dispute pool and MUST stay
     disputed until arbitrated, instead of auto-converging the way N = 1
     quorum used to (issue #551, superseded). */
  test("a lone reviewer's correction stays disputed, not finalized", async ({ page }) => {
    await seed(page, {
      role: 'annotator',
      runType: 'official_run',
      payload: labelPayload('sad'),
      identity: { annotatorId: ANNOTATOR },
    });
    await seed(page, {
      role: 'reviewer',
      runType: 'official_run',
      payload: labelPayload('fear'),
      identity: { annotatorId: ANNOTATOR, reviewerId: REVIEWER_A },
    });
    expect(await statusOf(page, { runType: 'official_run' })).toBe('disputed');
  });

  test('two disagreeing reviewers with no strict majority still dispute the unit', async ({ page }) => {
    await seed(page, {
      role: 'annotator',
      runType: 'official_run',
      payload: labelPayload('sad'),
      identity: { annotatorId: ANNOTATOR },
    });
    await seed(page, {
      role: 'reviewer',
      runType: 'official_run',
      payload: labelPayload('fear'),
      identity: { annotatorId: ANNOTATOR, reviewerId: REVIEWER_A },
    });
    // A second reviewer agreeing with the annotator makes this a genuine
    // 1:1 tie (implicit 'sad' vote vs REVIEWER_A's 'fear') at N=2 -- no
    // value reaches a strict majority, so the unit stays disputed.
    await seed(page, {
      role: 'reviewer',
      runType: 'official_run',
      payload: labelPayload('sad'),
      identity: { annotatorId: ANNOTATOR, reviewerId: REVIEWER_B },
    });
    expect(await statusOf(page, { runType: 'official_run' })).toBe('disputed');
  });

  /* One dissenting reviewer is enough to dispute the unit even when the
     other agrees -- majority convergence across reviewers is P4's job. */
  test('one dissenting reviewer among two disputes the unit', async ({ page }) => {
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
      identity: { annotatorId: ANNOTATOR, reviewerId: REVIEWER_A },
    });
    await seed(page, {
      role: 'reviewer',
      runType: 'official_run',
      payload: labelPayload('fear'),
      identity: { annotatorId: ANNOTATOR, reviewerId: REVIEWER_B },
    });
    expect(await statusOf(page, { runType: 'official_run', minReviewers: 2 })).toBe('disputed');
  });

  /* The whole point of retiring REVIEW_MODEL_BY_RUN_TYPE: the state machine
     is identical in both run types. */
  test('dry_run derives the same states as official_run', async ({ page }) => {
    await seed(page, {
      role: 'annotator',
      runType: 'dry_run',
      payload: labelPayload('sad'),
      identity: { annotatorId: ANNOTATOR },
    });
    expect(await statusOf(page, { runType: 'dry_run' })).toBe('pending');

    await seed(page, {
      role: 'reviewer',
      runType: 'dry_run',
      payload: labelPayload('sad'),
      identity: { annotatorId: ANNOTATOR, reviewerId: REVIEWER_A },
    });
    expect(await statusOf(page, { runType: 'dry_run' })).toBe('finalized');
  });

  test('run types keep separate review units for the same sample', async ({ page }) => {
    await seed(page, {
      role: 'annotator',
      runType: 'official_run',
      payload: labelPayload('sad'),
      identity: { annotatorId: ANNOTATOR },
    });
    expect(await statusOf(page, { runType: 'dry_run' })).toBeNull();
  });

  test('REVIEW_UNIT_STATUS exposes all three states', async ({ page }) => {
    const statuses = await page.evaluate(
      () =>
        (window as unknown as { LabelSuiteAnnotationWorkspaceData: WorkspaceData })
          .LabelSuiteAnnotationWorkspaceData.REVIEW_UNIT_STATUS
    );
    expect(Object.values(statuses).sort()).toEqual(['disputed', 'finalized', 'pending']);
  });
});

/* w6-resilience-a11y.md DUP-02: double-clicking 送出審核.
 *
 * Which guard is actually in play (verified against current code):
 * handleReviewSubmit (annotation-workspace.config.js) has NO submit-busy
 * flag -- unlike the annotator path, whose issue #201 fix added
 * state.submitBusy to handleSubmit. The reviewer path's idempotency comes
 * from TWO layers, the second added by issue #401:
 *   1. Data layer (pre-existing): markSampleSubmitted() overwrites the same
 *      bucket key (never appends a second record), and appendHistoryEvent()
 *      drops an identical consecutive 'submitted' event for the same
 *      role/actor (annotation-workspace.data.js).
 *   2. UI layer (issue #401): handleReviewSubmit() now calls
 *      renderReviewerWorkspace() synchronously on success. For a
 *      min_reviewers=1 unit the first submit finalizes it, and
 *      renderReviewerWorkspace()'s FINALIZED branch hides the footer
 *      submit button (classList.add('hidden'), which is `display:none
 *      !important` -- see annotation-workspace.html's .hidden rule). A
 *      genuine second click can no longer even land on the button:
 *      Playwright's actionability check (element must be visible) times
 *      out exactly the way a real second mouse click would find nothing
 *      to hit. That is a STRONGER guard than "clickable but no-ops" --
 *      before issue #401 the button stayed clickable after finalizing and
 *      only the data layer silently absorbed the duplicate; now the
 *      duplicate can't be dispatched by user interaction at all.
 * This test asserts both layers: the button becomes hidden after the
 * first submit (UI layer), and forcing a second click anyway (bypassing
 * Playwright's visibility check, the way a stray programmatic dispatch
 * might) still leaves exactly one review unit state and one reviewer
 * history event (data layer backstop, preserved unchanged from before). */
test.describe('review unit: double submit stays a single terminal unit (DUP-02)', () => {
  test('double-clicking 送出審核 leaves one review unit state and one reviewer history event', async ({ page }) => {
    await seed(page, {
      role: 'annotator',
      runType: 'official_run',
      payload: labelPayload('sad'),
      identity: { annotatorId: ANNOTATOR },
    });

    await page.goto(
      buildWorkspaceUrl({
        task_id: TASK,
        sample_id: SAMPLE,
        role: 'reviewer',
        run_type: 'official_run',
        reviewer_id: REVIEWER_A,
      })
    );
    await page.getByTestId('ws-review-row-approve').click();
    const submitBtn = page.getByTestId('ws-review-submit-btn');
    await submitBtn.click();

    // issue #401: the first submit finalizes this min_reviewers=1 unit,
    // and the resulting re-render hides the submit button (display:none).
    // A real second mouse click has nothing left to hit -- Playwright's
    // `{ force: true }` still refuses (a display:none element has no box
    // to click), which itself confirms the guard. Exercise the underlying
    // click *handler* directly (DOM .click(), which fires regardless of
    // visibility) to prove the pre-existing data-layer dedup still backstops
    // any second invocation that did get dispatched some other way.
    await expect(submitBtn).toBeHidden();
    await page.evaluate(() => document.getElementById('wsReviewSubmitBtn')?.click());

    // With min_reviewers=1 satisfied and the single review an unchanged
    // approval, the five-state machine lands on the terminal 'finalized'
    // (same convergence as the seeded five-state tests above) -- and stays
    // there: the duplicate submit adds no second unit and no state change.
    expect(await statusOf(page, { runType: 'official_run', minReviewers: 1 })).toBe('finalized');

    const reviewerSubmitted = await page.evaluate(() => {
      const data = (window as unknown as {
        LabelSuiteAnnotationWorkspaceData: {
          getSampleHistory: (
            taskId: string,
            runType: string,
            sampleId: string,
            identity: Record<string, never>
          ) => Array<{ action: string; role: string; actorId: string | null }>;
        };
      }).LabelSuiteAnnotationWorkspaceData;
      return data
        .getSampleHistory('T001', 'official_run', 'sent-001', {})
        .filter((e) => e.role === 'reviewer' && e.action === 'submitted');
    });
    expect(reviewerSubmitted).toHaveLength(1);
    expect(reviewerSubmitted[0].actorId).toBe(REVIEWER_A);
  });
});
