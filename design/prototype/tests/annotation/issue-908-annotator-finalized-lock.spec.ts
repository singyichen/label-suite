import { test, expect, type Page } from '@playwright/test';
import {
  buildWorkspaceUrl,
  skipGuidelineModal,
  patchDataFile,
  selectWorkspaceText,
  dismissGuidelineModal,
} from './_workspace-helpers';

/* Annotator finalized-lock (issue #908, spec 015 v6.19.0 FR-101 / AC-2.27).
 *
 * Trigger condition (the part most likely to be implemented wrong, per the
 * proposal's own framing): the lock is NOT "unit status === finalized"
 * alone. getReviewUnitStatus()'s first line (annotation-workspace.data.js)
 * already requires a REAL annotator submission (getSubmission(taskId,
 * 'annotator', runType, sampleId, identity) truthy) before it will ever
 * derive 'finalized' -- a unit seeded only through a reviewer decision on an
 * FR-044a demo row, with no real annotator submission underneath it, reads
 * back as `null`, never 'finalized'. The guard this change adds MUST reuse
 * that same derivation rather than inventing a second "does a reviewer
 * decision exist" shortcut, so the demo-row exemption falls out of the
 * existing status derivation for free. Test 3 below pins exactly that.
 *
 * Fresh annotator ids (test_annotator_908*) are used throughout instead of
 * the demo roster (kioleemg12 / 113450022 / tony0950127) so submission
 * buckets -- keyed by taskId::role::runType::annotatorId::reviewerId -- are
 * fully independent of the T014-T017 seed data, regardless of which T015
 * sample_id is reused.
 *
 * Deviation flag (verified against annotation-workspace.data.js before
 * writing this file, not assumed): `appendSampleTimelineEvent` DOES exist
 * as a named function (data.js:713) but, unlike markSampleSubmitted /
 * markSampleSaved / markSampleSkipped / markSampleRejected, it is currently
 * NOT included in the `global.LabelSuiteAnnotationWorkspaceData` export
 * object (data.js:3759-3831). Calling it through
 * `window.LabelSuiteAnnotationWorkspaceData.appendSampleTimelineEvent` today
 * resolves to `undefined`, not a function. Test 2 below therefore probes it
 * defensively (typeof-guarded) and expects a `false` return -- today it
 * reports the sentinel 'NOT_A_FUNCTION' instead, which is itself a valid RED
 * failure: Green (tasks.md 2.1) must both export it and guard it. This is
 * called out explicitly per the Red-contract report obligation, not silently
 * routed around.
 *
 * markSampleSubmitted / markSampleSaved currently return `undefined` on
 * every call (no return statement in either function) -- FR-101 requires
 * `false` when locked and `true` otherwise, so the RED assertions on `false`
 * fail today for that reason (undefined !== false), which is the correct
 * failure shape for this stage.
 */

type Identity = { annotatorId?: string; reviewerId?: string };

type WorkspaceData = {
  markSampleSubmitted: (
    taskId: string,
    role: string,
    runType: string,
    sampleId: string,
    payload: unknown,
    historySummary: string,
    identity: Identity
  ) => boolean | void;
  markSampleSaved: (
    taskId: string,
    role: string,
    runType: string,
    sampleId: string,
    payload: unknown,
    historySummary: string,
    identity: Identity
  ) => boolean | void;
  appendSampleTimelineEvent: (
    taskId: string,
    runType: string,
    sampleId: string,
    action: string,
    role: string,
    reason: string,
    historySummary: string,
    identity: Identity,
    timing?: unknown,
    resultSnapshot?: unknown
  ) => boolean | void;
  getReviewUnitStatus: (
    taskId: string,
    runType: string,
    sampleId: string,
    identity: Identity,
    outKeys: string[]
  ) => string | null;
  getSampleAnswers: (
    taskId: string,
    role: string,
    runType: string,
    sampleId: string,
    identity: Identity
  ) => unknown;
  getSampleHistory: (taskId: string, runType: string, sampleId: string, identity: Identity) => unknown[];
  isSampleSubmitted: (
    taskId: string,
    role: string,
    runType: string,
    sampleId: string,
    identity: Identity
  ) => boolean;
};

const TASK_ID = 'T015';
const OUT_KEYS = ['single_label'];
const OFFICIAL_RUN = 'official_run' as const;
const DRY_RUN = 'dry_run' as const;

/* Seeds BOTH a real annotator submission and a matching reviewer `approve`
 * with the SAME answer value, so getReviewUnitStatus() derives 'finalized'
 * via its unanimous-agreement lane (no dispute). Must run after an initial
 * page.goto() to this task_id so the data-layer global is already attached;
 * caller reloads afterward to re-render off the seeded state. */
async function seedFinalizedUnit(
  page: Page,
  params: { sampleId: string; annotatorId: string; runType?: string; value?: string }
) {
  const { sampleId, annotatorId, runType = OFFICIAL_RUN, value = 'negative' } = params;
  await page.evaluate(
    ({ taskId, sampleId, annotatorId, runType, value }) => {
      const data = (window as unknown as { LabelSuiteAnnotationWorkspaceData: WorkspaceData })
        .LabelSuiteAnnotationWorkspaceData;
      const payload = { previewState: { single_label: { selected: value } } };
      data.markSampleSubmitted(taskId, 'annotator', runType, sampleId, payload, '', { annotatorId });
      data.markSampleSubmitted(taskId, 'reviewer', runType, sampleId, payload, '', {
        annotatorId,
        reviewerId: 'reviewer_wang',
      });
    },
    { taskId: TASK_ID, sampleId, annotatorId, runType, value }
  );
}

async function readReviewUnitStatus(
  page: Page,
  params: { sampleId: string; annotatorId: string; runType?: string }
): Promise<string | null> {
  const { sampleId, annotatorId, runType = OFFICIAL_RUN } = params;
  return page.evaluate(
    ({ taskId, sampleId, annotatorId, runType, outKeys }) => {
      const data = (window as unknown as { LabelSuiteAnnotationWorkspaceData: WorkspaceData })
        .LabelSuiteAnnotationWorkspaceData;
      return data.getReviewUnitStatus(taskId, runType, sampleId, { annotatorId }, outKeys);
    },
    { taskId: TASK_ID, sampleId, annotatorId, runType, outKeys: OUT_KEYS }
  );
}

async function readBucketSnapshot(
  page: Page,
  params: { sampleId: string; annotatorId: string; runType?: string }
): Promise<{ answers: unknown; historyLength: number }> {
  const { sampleId, annotatorId, runType = OFFICIAL_RUN } = params;
  return page.evaluate(
    ({ taskId, sampleId, annotatorId, runType }) => {
      const data = (window as unknown as { LabelSuiteAnnotationWorkspaceData: WorkspaceData })
        .LabelSuiteAnnotationWorkspaceData;
      const identity = { annotatorId };
      return {
        answers: data.getSampleAnswers(taskId, 'annotator', runType, sampleId, identity),
        historyLength: data.getSampleHistory(taskId, runType, sampleId, identity).length,
      };
    },
    { taskId: TASK_ID, sampleId, annotatorId, runType }
  );
}

/* Calls the three annotator write points directly, typeof-guarded so a
 * not-yet-exported function (see file-header deviation note) reports a
 * readable sentinel instead of throwing and aborting the whole evaluate. */
async function probeGuardedWrites(
  page: Page,
  params: { sampleId: string; annotatorId: string; runType?: string; value?: string; reason?: string }
): Promise<{ submitted: unknown; saved: unknown; timeline: unknown }> {
  const {
    sampleId,
    annotatorId,
    runType = OFFICIAL_RUN,
    value = 'positive',
    reason = '測試略過理由（issue #908 Red）',
  } = params;
  return page.evaluate(
    ({ taskId, sampleId, annotatorId, runType, value, reason }) => {
      const data = (window as unknown as { LabelSuiteAnnotationWorkspaceData: WorkspaceData })
        .LabelSuiteAnnotationWorkspaceData;
      const payload = { previewState: { single_label: { selected: value } } };
      const identity = { annotatorId };
      const call = (fn: unknown, args: unknown[]): unknown =>
        typeof fn === 'function' ? (fn as (...a: unknown[]) => unknown)(...args) : 'NOT_A_FUNCTION';
      return {
        submitted: call(data.markSampleSubmitted, [taskId, 'annotator', runType, sampleId, payload, '', identity]),
        saved: call(data.markSampleSaved, [taskId, 'annotator', runType, sampleId, payload, '', identity]),
        timeline: call(data.appendSampleTimelineEvent, [
          taskId,
          runType,
          sampleId,
          'skipped',
          'annotator',
          reason,
          '',
          identity,
        ]),
      };
    },
    { taskId: TASK_ID, sampleId, annotatorId, runType, value, reason }
  );
}

test.describe('issue #908 -- annotator finalized-lock (FR-101 / AC-2.27)', () => {
  test('finalized unit: notice shown, controls disabled, shortcuts inert', async ({ page }) => {
    const sampleId = 'ofs-01-agree-gold';
    const annotatorId = 'test_annotator_908a';
    await skipGuidelineModal(page);
    await page.goto(
      buildWorkspaceUrl({
        task_id: TASK_ID,
        sample_id: sampleId,
        role: 'annotator',
        run_type: OFFICIAL_RUN,
        annotator_id: annotatorId,
      })
    );
    await seedFinalizedUnit(page, { sampleId, annotatorId });
    await page.reload();

    // Precondition: the seed really is finalized per FR-051 before we test the lock.
    expect(await readReviewUnitStatus(page, { sampleId, annotatorId })).toBe('finalized');

    await expect(page.getByTestId('ws-annotator-finalized-notice')).toBeVisible();

    for (const testId of ['ws-skip-btn', 'ws-save-btn', 'ws-submit-btn']) {
      const btn = page.getByTestId(testId);
      await expect(btn).toHaveCount(1);
      await expect(btn).toBeDisabled();
      await expect(btn).toHaveAttribute('aria-disabled', 'true');
    }

    await expect(page.locator('#wsAutosaveLabel')).toContainText('已定稿');

    await page.keyboard.press('ControlOrMeta+S');
    await expect(page.locator('#toastMsg')).not.toHaveText('已儲存');
    await page.keyboard.press('ControlOrMeta+Enter');
    await expect(page.locator('#toastMsg')).not.toHaveText('已提交');

    // Neither shortcut attempt may flip the unit back to disputed/pending.
    expect(await readReviewUnitStatus(page, { sampleId, annotatorId })).toBe('finalized');
  });

  test('finalized unit: guarded writes return false and the bucket stays unchanged', async ({ page }) => {
    const sampleId = 'ofs-01-agree-gold';
    const annotatorId = 'test_annotator_908a2';
    await skipGuidelineModal(page);
    await page.goto(
      buildWorkspaceUrl({
        task_id: TASK_ID,
        sample_id: sampleId,
        role: 'annotator',
        run_type: OFFICIAL_RUN,
        annotator_id: annotatorId,
      })
    );
    await seedFinalizedUnit(page, { sampleId, annotatorId, value: 'negative' });
    await page.reload();

    expect(await readReviewUnitStatus(page, { sampleId, annotatorId })).toBe('finalized');
    const before = await readBucketSnapshot(page, { sampleId, annotatorId });

    // Deliberately attempts a DIFFERENT value than the seeded 'negative' --
    // if the guard were absent this would visibly change the stored answer,
    // making the before/after comparison below a meaningful RED signal.
    const result = await probeGuardedWrites(page, { sampleId, annotatorId, value: 'positive' });

    expect(result.submitted).toBe(false);
    expect(result.saved).toBe(false);
    expect(result.timeline).toBe(false);

    expect(await readReviewUnitStatus(page, { sampleId, annotatorId })).toBe('finalized');
    const after = await readBucketSnapshot(page, { sampleId, annotatorId });
    expect(after.answers).toEqual(before.answers);
    expect(after.historyLength).toBe(before.historyLength);
  });

  test('demo-row seed exemption: no lock without a real annotator submission, first submit succeeds', async ({
    page,
  }) => {
    const sampleId = 'ofs-04-pending-review';
    const annotatorId = 'test_annotator_908b';
    await skipGuidelineModal(page);
    await page.goto(
      buildWorkspaceUrl({
        task_id: TASK_ID,
        sample_id: sampleId,
        role: 'annotator',
        run_type: OFFICIAL_RUN,
        annotator_id: annotatorId,
      })
    );
    // ONLY a reviewer decision on the FR-044a demo-row substitute -- this
    // annotator has NOT submitted anything of their own yet.
    await page.evaluate(
      ({ taskId, sampleId, annotatorId, runType }) => {
        const data = (window as unknown as { LabelSuiteAnnotationWorkspaceData: WorkspaceData })
          .LabelSuiteAnnotationWorkspaceData;
        const payload = { previewState: { single_label: { selected: 'positive' } } };
        data.markSampleSubmitted(taskId, 'reviewer', runType, sampleId, payload, '', {
          annotatorId,
          reviewerId: 'reviewer_wang',
        });
      },
      { taskId: TASK_ID, sampleId, annotatorId, runType: OFFICIAL_RUN }
    );
    await page.reload();

    // The mechanism this exemption relies on: getReviewUnitStatus()'s first
    // line requires a real annotator submission, so it reads null here, not
    // 'finalized' -- never a second, independent "no real submission" check.
    expect(await readReviewUnitStatus(page, { sampleId, annotatorId })).toBeNull();

    await expect(page.getByTestId('ws-annotator-finalized-notice')).toHaveCount(0);
    for (const testId of ['ws-skip-btn', 'ws-save-btn', 'ws-submit-btn']) {
      const btn = page.getByTestId(testId);
      await expect(btn).not.toHaveAttribute('aria-disabled', 'true');
      await expect(btn).toBeEnabled();
    }

    // The annotator's first REAL submission must go through unblocked.
    const submitted = await page.evaluate(
      ({ taskId, sampleId, annotatorId, runType }) => {
        const data = (window as unknown as { LabelSuiteAnnotationWorkspaceData: WorkspaceData })
          .LabelSuiteAnnotationWorkspaceData;
        const payload = { previewState: { single_label: { selected: 'positive' } } };
        data.markSampleSubmitted(taskId, 'annotator', runType, sampleId, payload, '', { annotatorId });
        return data.isSampleSubmitted(taskId, 'annotator', runType, sampleId, { annotatorId });
      },
      { taskId: TASK_ID, sampleId, annotatorId, runType: OFFICIAL_RUN }
    );
    expect(submitted).toBe(true);
  });

  test('dry_run scope: a finalized-equivalent dry_run unit is never locked', async ({ page }) => {
    const sampleId = 'ofs-01-agree-gold';
    const annotatorId = 'test_annotator_908c';
    await skipGuidelineModal(page);
    await page.goto(
      buildWorkspaceUrl({
        task_id: TASK_ID,
        sample_id: sampleId,
        role: 'annotator',
        run_type: DRY_RUN,
        annotator_id: annotatorId,
      })
    );
    await seedFinalizedUnit(page, { sampleId, annotatorId, runType: DRY_RUN });
    await page.reload();

    // Same finalized-equivalent shape as the official_run case above --
    // FR-101's scope limitation, not a difference in the underlying derivation.
    expect(await readReviewUnitStatus(page, { sampleId, annotatorId, runType: DRY_RUN })).toBe('finalized');

    await expect(page.getByTestId('ws-annotator-finalized-notice')).toHaveCount(0);
    // ws-skip-btn is deliberately excluded here: renderSkipControl()
    // (annotation-workspace.config.js) already removes it from the DOM for
    // ANY already-submitted sample, in every run_type, independent of this
    // feature -- that pre-existing behavior is not part of FR-101's surface.
    for (const testId of ['ws-save-btn', 'ws-submit-btn']) {
      const btn = page.getByTestId(testId);
      await expect(btn).toBeEnabled();
    }
  });

  /* CI regression (2026-09-25): setPreviewControlsLocked()/setControlLocked()
   * originally wrote `control.disabled = locked` unconditionally. When
   * `locked` was false (the ordinary, unlocked case), this forced
   * `disabled = false` onto EVERY control inside #annotationPreview,
   * overwriting disabled states other logic had just set for reasons that
   * have nothing to do with FR-101 -- e.g. relation_identification's
   * sequential builder (buildRelationStateMachine, task-config.engine.js)
   * disables ws-ri-relation-btn/-e2-btn/-add-btn/-undo-btn until an earlier
   * slot is filled. The fix makes the lock ADDITIVE ONLY: it may force
   * `disabled = true`, but on unlock it must leave `disabled` exactly as the
   * engine already left it, touching only `aria-disabled` (which is this
   * lock's own attribute to add/remove). This test pins that contract
   * directly against T008/rel-001 (relation_identification, unfinalized,
   * default identity -- no FR-101 lock in play at all) so a future
   * regression here fails immediately without depending on the separate
   * relation_identification suite being run in the same pass. */
  test('lock rendering must not clear disabled states other logic owns (relation_identification step gate)', async ({
    page,
  }) => {
    await skipGuidelineModal(page);
    // rel-001/rel-002 ship with an output-role `triples` prefill (013
    // FR-003g-5); strip both so each sample's relation draft starts
    // genuinely empty -- same technique as
    // annotation-workspace-relation-identification.spec.ts's own
    // stripTriplePrefill(), extended to the second record this test also
    // visits.
    await patchDataFile(page, 'task-detail.data.js', `
      window.LabelSuiteTaskDetailData.profiles.T008.datasetRecords[0].triples = [];
      window.LabelSuiteTaskDetailData.profiles.T008.datasetRecords[1].triples = [];
    `);
    await page.goto(buildWorkspaceUrl({ task_id: 'T008', sample_id: 'rel-001' }));
    await dismissGuidelineModal(page);

    // Not locked (unfinalized, fresh default identity) -- the engine's own
    // step gate must still hold: only E1/Arg1 is actionable on an empty draft.
    await expect(page.getByTestId('ws-annotator-finalized-notice')).toHaveCount(0);
    await expect(page.getByTestId('ws-ri-e1-btn')).toBeEnabled();
    await expect(page.getByTestId('ws-ri-relation-btn')).toBeDisabled();
    await expect(page.getByTestId('ws-ri-e2-btn')).toBeDisabled();
    await expect(page.getByTestId('ws-ri-add-btn')).toBeDisabled();
    await expect(page.getByTestId('ws-ri-undo-btn')).toBeDisabled();

    // Fill E1 so the gate is now mid-sequence (Relation actionable, E2/Add
    // still not) -- the more interesting state for the lock code to
    // accidentally clobber than the fully-empty one above.
    await selectWorkspaceText(page, 'ws-input-content', '高血壓');
    await page.getByTestId('ws-ri-e1-btn').click();
    await expect(page.getByTestId('ws-ri-relation-btn')).toBeEnabled();
    await expect(page.getByTestId('ws-ri-e2-btn')).toBeDisabled();
    await expect(page.getByTestId('ws-ri-add-btn')).toBeDisabled();

    // In-session navigation (no reload) to a second, likewise-unfinalized
    // sample -- exercises a fresh renderWorkspace() pass for a DIFFERENT
    // sample within the same page/JS session, the scenario most likely to
    // reveal any residual state the additive-only fix might have left
    // behind. #annotationPreview is fully torn down and rebuilt by
    // updateAnnotationPreview() on every render (task-config.engine.js:
    // `while (preview.firstChild) preview.removeChild(preview.firstChild)`),
    // so this must land on a clean empty-draft gate again, not the
    // mid-sequence state carried over from rel-001 and not force-enabled by
    // this lock's own code.
    await page.getByTestId('ws-next-btn').click();
    await expect(page.getByTestId('ws-annotator-finalized-notice')).toHaveCount(0);
    await expect(page.getByTestId('ws-ri-e1-btn')).toBeEnabled();
    await expect(page.getByTestId('ws-ri-relation-btn')).toBeDisabled();
    await expect(page.getByTestId('ws-ri-e2-btn')).toBeDisabled();
    await expect(page.getByTestId('ws-ri-add-btn')).toBeDisabled();
    await expect(page.getByTestId('ws-ri-undo-btn')).toBeDisabled();
  });
});
