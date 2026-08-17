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

  test('sequence_tagging compares token by token', async ({ page }) => {
    const same = await compare(
      page,
      'sequence_tagging',
      [{ text: '台', tag: 'B-LOC' }],
      [{ text: '台', tag: 'B-LOC' }]
    );
    expect(same.equal).toBe(true);

    const retagged = await compare(
      page,
      'sequence_tagging',
      [{ text: '台', tag: 'B-LOC' }],
      [{ text: '台', tag: 'B-ORG' }]
    );
    expect(retagged.equal).toBe(false);
    expect(retagged.diffs).toEqual([{ key: '0', annotator: 'B-LOC', reviewer: 'B-ORG' }]);
  });

  test('free_text compares verbatim', async ({ page }) => {
    expect((await compare(page, 'free_text', 'abc', 'abc')).equal).toBe(true);
    expect((await compare(page, 'free_text', 'abc', 'abd')).equal).toBe(false);
  });
});

test.describe('review unit: five-state machine', () => {
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

  /* approved is the "agreed, still short of the required reviewer count"
     state -- reachable today by asking for two reviewers, and the state
     min_reviewers > 1 will make routine. */
  test('an agreeing reviewer short of min_reviewers leaves the unit approved', async ({ page }) => {
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
    expect(await statusOf(page, { runType: 'official_run', minReviewers: 2 })).toBe('approved');
  });

  test('a reviewer who changed the answer disputes the unit', async ({ page }) => {
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

  test('a disagreement short of min_reviewers leaves the unit modified', async ({ page }) => {
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
    expect(await statusOf(page, { runType: 'official_run', minReviewers: 2 })).toBe('modified');
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

  test('REVIEW_UNIT_STATUS exposes all five states', async ({ page }) => {
    const statuses = await page.evaluate(
      () =>
        (window as unknown as { LabelSuiteAnnotationWorkspaceData: WorkspaceData })
          .LabelSuiteAnnotationWorkspaceData.REVIEW_UNIT_STATUS
    );
    expect(Object.values(statuses).sort()).toEqual([
      'approved',
      'disputed',
      'finalized',
      'modified',
      'pending',
    ]);
  });
});
