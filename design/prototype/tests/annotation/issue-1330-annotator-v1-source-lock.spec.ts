import { test, expect } from '../fixtures';
import type { Page } from '@playwright/test';
import { buildWorkspaceUrl, skipGuidelineModal } from './_workspace-helpers';

/* Annotator V1 source-integrity lock, presentation + write guard
 * (issue #1330; spec 015 v12.5.0 FR-101 "V1 source-integrity lock" /
 * "under-review lock presentation", AC-2.27, AC-2.30).
 *
 * Contract under test: once a reviewer has made a formal submission for a
 * run x assignment, the annotator is locked out of that unit -- in BOTH
 * dry_run and official_run -- even when the unit is not (yet) finalized.
 * The lock notice carries data-lock-reason: "under_review" (warning tones)
 * for the V1 lock, "finalized" (info tones) for the official_run terminal
 * lock. Neither state may leak dispute / arbitration / exception-pool words or
 * any reviewer decision type / reason / identity (Data Fairness).
 *
 * Facts verified against the prototype before writing (not assumed):
 *  - Seeding: a reviewer "formal submission" is
 *    markSampleSubmitted(taskId, 'reviewer', runType, sampleId, payload, '',
 *    { annotatorId, reviewerId }) -- the same call issue-908 / issue-1247
 *    use. It writes the reviewer bucket
 *    `taskId::reviewer::runType::annotatorId::reviewerId`.
 *  - run dimension: submissionBucketKey() (annotation-workspace.data.js)
 *    is taskId::role::runType::annotatorId::reviewerId. There is NO run_id /
 *    assignment_id segment, and currentTrialRound() only stamps entries, it
 *    does not partition buckets. So the prototype cannot tell two dry runs
 *    of the same annotator x sample apart; AC-2.30's "different dry run is
 *    unaffected" is therefore NOT testable here. Test 3 instead pins the only
 *    separable axis: an official_run under-review unit must not lock the
 *    same annotator's dry_run of the same sample.
 *  - T016 official_run seed (annotator kioleemg12): ofm-03 (reviewer_lin
 *    modifies, awaiting arbitration), ofm-04 (reviewer_wang bypasses),
 *    ofm-05 (reviewer_li modifies, arbitration rejected -> exception pool).
 *    All three have a real reviewer submission and are derived `disputed`
 *    (asserted below as a precondition, so a seed change fails loudly).
 *  - appendSampleTimelineEvent IS already exported
 *    (window.LabelSuiteAnnotationWorkspaceData.appendSampleTimelineEvent).
 *
 * Regression-guard tests (expected GREEN before implementation): the
 * FR-044a demo-row exemption (test 5) and the dry_run/official_run isolation
 * (test 3 write-return part may already pass). The
 * `data-lock-reason="finalized"` assertion (test 4) is expected RED today.
 */

const TASK_ID = 'T015';
const T016 = 'T016';
const T016_ANNOTATOR = 'kioleemg12';
const OUT_KEYS = ['single_label'];

const UNDER_REVIEW_TITLE = '此標記已進入審核';
const UNDER_REVIEW_DESC = '審核員已開始處理這筆作答，內容已鎖定，無法再修改或提交。';
const UNDER_REVIEW_AUTOSAVE = '審核中，不再自動儲存';
const FINALIZED_TITLE = '此標記結果已定稿，無法再修改或提交';
const FINALIZED_AUTOSAVE = '已定稿，不再自動儲存';
const FORBIDDEN_WORDS = ['爭議中', '等待仲裁', '例外池'];

type Identity = { annotatorId?: string; reviewerId?: string };
type WorkspaceData = {
  markSampleSubmitted: (
    taskId: string, role: string, runType: string, sampleId: string,
    payload: unknown, historySummary: string, identity: Identity
  ) => boolean | void;
  markSampleSaved: (
    taskId: string, role: string, runType: string, sampleId: string,
    payload: unknown, historySummary: string, identity: Identity
  ) => boolean | void;
  appendSampleTimelineEvent: (
    taskId: string, runType: string, sampleId: string, action: string, role: string,
    reason: string, historySummary: string, identity: Identity
  ) => boolean | void;
  getReviewUnitStatus: (
    taskId: string, runType: string, sampleId: string, identity: Identity, outKeys: string[]
  ) => string | null;
  getSampleAnswers: (
    taskId: string, role: string, runType: string, sampleId: string, identity: Identity
  ) => unknown;
  getSampleHistory: (taskId: string, runType: string, sampleId: string, identity: Identity) => unknown[];
};

type RunType = 'dry_run' | 'official_run';

async function open(page: Page, taskId: string, sampleId: string, annotatorId: string, runType: RunType) {
  await skipGuidelineModal(page);
  await page.goto(
    buildWorkspaceUrl({ task_id: taskId, sample_id: sampleId, role: 'annotator', run_type: runType, annotator_id: annotatorId })
  );
}

/* Annotator submits (when asked), then a reviewer formally submits.
 * `reviewerValue` equal to `annotatorValue` -> unanimous approve lane;
 * different -> reviewer modification (unit not finalized). */
async function seedReviewerSubmission(
  page: Page,
  p: { runType: RunType; sampleId: string; annotatorId: string; annotatorValue: string; reviewerValue: string }
) {
  await page.evaluate(
    ({ taskId, ...q }) => {
      const data = (window as unknown as { LabelSuiteAnnotationWorkspaceData: WorkspaceData })
        .LabelSuiteAnnotationWorkspaceData;
      const mk = (v: string) => ({ previewState: { single_label: { selected: v } } });
      data.markSampleSubmitted(taskId, 'annotator', q.runType, q.sampleId, mk(q.annotatorValue), '', {
        annotatorId: q.annotatorId,
      });
      data.markSampleSubmitted(taskId, 'reviewer', q.runType, q.sampleId, mk(q.reviewerValue), '', {
        annotatorId: q.annotatorId,
        reviewerId: 'reviewer_wang',
      });
    },
    { taskId: TASK_ID, ...p }
  );
}

async function readStatus(page: Page, taskId: string, runType: RunType, sampleId: string, annotatorId: string) {
  return page.evaluate(
    ({ taskId, runType, sampleId, annotatorId, outKeys }) =>
      (window as unknown as { LabelSuiteAnnotationWorkspaceData: WorkspaceData })
        .LabelSuiteAnnotationWorkspaceData.getReviewUnitStatus(taskId, runType, sampleId, { annotatorId }, outKeys),
    { taskId, runType, sampleId, annotatorId, outKeys: OUT_KEYS }
  );
}

async function readBucket(page: Page, runType: RunType, sampleId: string, annotatorId: string) {
  return page.evaluate(
    ({ taskId, runType, sampleId, annotatorId }) => {
      const data = (window as unknown as { LabelSuiteAnnotationWorkspaceData: WorkspaceData })
        .LabelSuiteAnnotationWorkspaceData;
      const identity = { annotatorId };
      return {
        answers: data.getSampleAnswers(taskId, 'annotator', runType, sampleId, identity),
        historyLength: data.getSampleHistory(taskId, runType, sampleId, identity).length,
      };
    },
    { taskId: TASK_ID, runType, sampleId, annotatorId }
  );
}

async function probeGuardedWrites(page: Page, runType: RunType, sampleId: string, annotatorId: string) {
  return page.evaluate(
    ({ taskId, runType, sampleId, annotatorId }) => {
      const data = (window as unknown as { LabelSuiteAnnotationWorkspaceData: WorkspaceData })
        .LabelSuiteAnnotationWorkspaceData;
      const payload = { previewState: { single_label: { selected: 'neutral' } } };
      const identity = { annotatorId };
      const call = (fn: unknown, args: unknown[]): unknown =>
        typeof fn === 'function' ? (fn as (...a: unknown[]) => unknown)(...args) : 'NOT_A_FUNCTION';
      return {
        submitted: call(data.markSampleSubmitted, [taskId, 'annotator', runType, sampleId, payload, '', identity]),
        saved: call(data.markSampleSaved, [taskId, 'annotator', runType, sampleId, payload, '', identity]),
        timeline: call(data.appendSampleTimelineEvent, [
          // Non-empty reason: appendSampleTimelineEvent returns false on an empty
          // reason regardless of any lock, which would make the assertions vacuous.
          taskId, runType, sampleId, 'submitted', 'annotator', 'probe', '', identity,
        ]),
      };
    },
    { taskId: TASK_ID, runType, sampleId, annotatorId }
  );
}

async function expectUnderReviewPresentation(page: Page) {
  const notice = page.getByTestId('ws-annotator-finalized-notice');
  await expect(notice).toBeVisible();
  await expect(notice).toHaveAttribute('data-lock-reason', 'under_review');
  await expect(notice.getByText(UNDER_REVIEW_TITLE, { exact: true })).toHaveCount(1);
  await expect(notice.getByText(UNDER_REVIEW_DESC, { exact: true })).toHaveCount(1);
  for (const testId of ['ws-save-btn', 'ws-submit-btn']) {
    const btn = page.getByTestId(testId);
    await expect(btn).toHaveCount(1);
    await expect(btn).toBeDisabled();
    await expect(btn).toHaveAttribute('aria-disabled', 'true');
  }
  await expect(page.getByTestId('ws-autosave-status')).toContainText(UNDER_REVIEW_AUTOSAVE);
  const bodyText = await page.locator('body').innerText();
  for (const word of FORBIDDEN_WORDS) expect(bodyText, `page must not contain ${word}`).not.toContain(word);
}

test.describe('issue #1330 -- annotator V1 source-integrity lock (FR-101 / AC-2.27 / AC-2.30)', () => {
  /* 1. T016 official_run: three reviewer-touched, not-finalized units. */
  for (const sampleId of ['ofm-03-awaiting-arbitration', 'ofm-04-reviewer-bypass', 'ofm-05-final-exception']) {
    test(`T016 ${sampleId}: annotator sees the under-review lock, no dispute wording or reviewer detail`, async ({
      page,
    }) => {
      await open(page, T016, sampleId, T016_ANNOTATOR, 'official_run');
      // Precondition (seed fact, not the lock): reviewer already submitted and
      // the unit is NOT finalized, so only the V1 lock can apply. If the seed
      // ever finalizes one of these, switch to a still-disputed sample.
      expect(await readStatus(page, T016, 'official_run', sampleId, T016_ANNOTATOR)).toBe('disputed');

      await expectUnderReviewPresentation(page);

      const bodyText = await page.locator('body').innerText();
      // Reviewer decision reasons / identities seeded for these units must not surface.
      for (const leak of ['反諷語氣明顯', '文本正負面線索交雜', '語境不足以判斷', 'reviewer_lin', 'reviewer_wang', 'reviewer_li']) {
        expect(bodyText, `page must not contain reviewer detail ${leak}`).not.toContain(leak);
      }
    });
  }

  /* 2. dry_run: V1 lock applies to dry runs too; write guard returns false. */
  for (const [label, reviewerValue] of [
    ['reviewer modifies (not finalized)', 'neutral'],
    ['reviewer approves (dry_run never takes the finalized lock)', 'positive'],
  ] as const) {
    test(`dry_run ${label}: under-review lock and guarded writes`, async ({ page }) => {
      const sampleId = 'ofs-01-agree-gold';
      const annotatorId = `test_annotator_1330_dry_${reviewerValue}`;
      await open(page, TASK_ID, sampleId, annotatorId, 'dry_run');
      await seedReviewerSubmission(page, {
        runType: 'dry_run', sampleId, annotatorId, annotatorValue: 'positive', reviewerValue,
      });
      await page.reload();

      await expectUnderReviewPresentation(page);

      const before = await readBucket(page, 'dry_run', sampleId, annotatorId);
      const result = await probeGuardedWrites(page, 'dry_run', sampleId, annotatorId);
      expect(result.submitted).toBe(false);
      expect(result.saved).toBe(false);
      expect(result.timeline).toBe(false);
      const after = await readBucket(page, 'dry_run', sampleId, annotatorId);
      expect(after.answers).toEqual(before.answers);
      expect(after.historyLength).toBe(before.historyLength);
    });
  }

  /* 3. Isolation. The prototype bucket key has no run_id dimension (see file
   * header), so two dry runs cannot be distinguished; the only separable axis
   * is run_type. An official_run under-review unit must not lock the same
   * annotator's dry_run of the same sample. */
  test('official_run under-review lock does not affect the same annotator x sample in dry_run', async ({ page }) => {
    const sampleId = 'ofs-01-agree-gold';
    const annotatorId = 'test_annotator_1330_iso';
    await open(page, TASK_ID, sampleId, annotatorId, 'official_run');
    await seedReviewerSubmission(page, {
      runType: 'official_run', sampleId, annotatorId, annotatorValue: 'positive', reviewerValue: 'neutral',
    });
    await page.reload();
    // Precondition: the official_run side really is under review (RED today: no notice).
    await expect(page.getByTestId('ws-annotator-finalized-notice')).toHaveAttribute('data-lock-reason', 'under_review');

    await page.goto(
      buildWorkspaceUrl({ task_id: TASK_ID, sample_id: sampleId, role: 'annotator', run_type: 'dry_run', annotator_id: annotatorId })
    );
    await expect(page.getByTestId('ws-annotator-finalized-notice')).toHaveCount(0);
    for (const testId of ['ws-save-btn', 'ws-submit-btn']) {
      await expect(page.getByTestId(testId)).toBeEnabled();
      await expect(page.getByTestId(testId)).not.toHaveAttribute('aria-disabled', 'true');
    }
    const result = await probeGuardedWrites(page, 'dry_run', sampleId, annotatorId);
    expect(result.submitted).toBe(true);
    expect(result.saved).toBe(true);
    expect(result.timeline).toBe(true);
  });

  /* 4. Both locks: official_run finalized keeps the terminal presentation. */
  test('official_run finalized: reason "finalized", terminal copy, no under-review copy', async ({ page }) => {
    const sampleId = 'ofs-01-agree-gold';
    const annotatorId = 'test_annotator_1330_fin';
    await open(page, TASK_ID, sampleId, annotatorId, 'official_run');
    await seedReviewerSubmission(page, {
      runType: 'official_run', sampleId, annotatorId, annotatorValue: 'negative', reviewerValue: 'negative',
    });
    await page.reload();
    expect(await readStatus(page, TASK_ID, 'official_run', sampleId, annotatorId)).toBe('finalized');

    const notice = page.getByTestId('ws-annotator-finalized-notice');
    await expect(notice).toBeVisible();
    await expect(notice).toHaveAttribute('data-lock-reason', 'finalized'); // RED today: attribute missing
    await expect(notice).toContainText(FINALIZED_TITLE.split('，')[0]);
    await expect(page.getByTestId('ws-autosave-status')).toContainText(FINALIZED_AUTOSAVE);
    const bodyText = await page.locator('body').innerText();
    for (const s of [UNDER_REVIEW_TITLE, UNDER_REVIEW_DESC, UNDER_REVIEW_AUTOSAVE]) {
      expect(bodyText).not.toContain(s);
    }
  });

  /* 5. Regression guard (likely GREEN today): FR-044a demo-row substitute. */
  test('FR-044a demo-row unit is exempt: no notice, controls enabled, first submit succeeds', async ({ page }) => {
    const sampleId = 'ofs-04-pending-review';
    const annotatorId = 'test_annotator_1330_demo';
    await open(page, TASK_ID, sampleId, annotatorId, 'official_run');
    // Reviewer decision only on the demo-row substitute; the annotator has no real submission.
    await page.evaluate(
      ({ taskId, sampleId, annotatorId }) => {
        const data = (window as unknown as { LabelSuiteAnnotationWorkspaceData: WorkspaceData })
          .LabelSuiteAnnotationWorkspaceData;
        data.markSampleSubmitted(
          taskId, 'reviewer', 'official_run', sampleId,
          { previewState: { single_label: { selected: 'positive' } } }, '',
          { annotatorId, reviewerId: 'reviewer_wang' }
        );
      },
      { taskId: TASK_ID, sampleId, annotatorId }
    );
    await page.reload();

    await expect(page.getByTestId('ws-annotator-finalized-notice')).toHaveCount(0);
    for (const testId of ['ws-save-btn', 'ws-submit-btn']) {
      await expect(page.getByTestId(testId)).toBeEnabled();
      await expect(page.getByTestId(testId)).not.toHaveAttribute('aria-disabled', 'true');
    }
    const submitted = await page.evaluate(
      ({ taskId, sampleId, annotatorId }) => {
        const data = (window as unknown as { LabelSuiteAnnotationWorkspaceData: WorkspaceData })
          .LabelSuiteAnnotationWorkspaceData;
        return data.markSampleSubmitted(
          taskId, 'annotator', 'official_run', sampleId,
          { previewState: { single_label: { selected: 'positive' } } }, '', { annotatorId }
        );
      },
      { taskId: TASK_ID, sampleId, annotatorId }
    );
    expect(submitted).toBe(true);
  });

  /* 6. Tone tokens, verified by resolved computed style (not class / title). */
  test('notice tones: finalized = info tokens, under_review = warning tokens, and they differ', async ({ page }) => {
    const sampleId = 'ofs-01-agree-gold';
    const readTones = async () =>
      page.evaluate(() => {
        const resolve = (token: string, prop: 'color' | 'backgroundColor') => {
          const probe = document.createElement('div');
          probe.style.cssText = `${prop === 'color' ? 'color' : 'background-color'}:var(${token})`;
          document.body.appendChild(probe);
          const v = getComputedStyle(probe)[prop];
          probe.remove();
          return v;
        };
        const el = document.querySelector('[data-testid="ws-annotator-finalized-notice"]') as HTMLElement;
        const cs = getComputedStyle(el);
        return {
          border: cs.borderTopColor,
          bg: cs.backgroundColor,
          infoBorder: resolve('--color-info-border', 'color'),
          infoBg: resolve('--color-info-bg', 'backgroundColor'),
          warningBorder: resolve('--color-warning-border', 'color'),
          warningBg: resolve('--color-warning-bg', 'backgroundColor'),
        };
      });

    const finId = 'test_annotator_1330_tone_fin';
    await open(page, TASK_ID, sampleId, finId, 'official_run');
    await seedReviewerSubmission(page, {
      runType: 'official_run', sampleId, annotatorId: finId, annotatorValue: 'negative', reviewerValue: 'negative',
    });
    await page.reload();
    await expect(page.getByTestId('ws-annotator-finalized-notice')).toBeVisible();
    const fin = await readTones();
    expect(fin.border).toBe(fin.infoBorder);
    expect(fin.bg).toBe(fin.infoBg);

    const urId = 'test_annotator_1330_tone_ur';
    await page.goto(
      buildWorkspaceUrl({ task_id: TASK_ID, sample_id: sampleId, role: 'annotator', run_type: 'dry_run', annotator_id: urId })
    );
    await seedReviewerSubmission(page, {
      runType: 'dry_run', sampleId, annotatorId: urId, annotatorValue: 'positive', reviewerValue: 'neutral',
    });
    await page.reload();
    await expect(page.getByTestId('ws-annotator-finalized-notice')).toBeVisible();
    const ur = await readTones();
    expect(ur.border).toBe(ur.warningBorder);
    expect(ur.bg).toBe(ur.warningBg);

    expect(ur.border).not.toBe(fin.border);
    expect(ur.bg).not.toBe(fin.bg);
  });

  /* 7. Autosave status text per lock reason. */
  test('ws-autosave-status text: under review vs finalized', async ({ page }) => {
    const sampleId = 'ofs-01-agree-gold';
    const urId = 'test_annotator_1330_as_ur';
    await open(page, TASK_ID, sampleId, urId, 'official_run');
    await seedReviewerSubmission(page, {
      runType: 'official_run', sampleId, annotatorId: urId, annotatorValue: 'positive', reviewerValue: 'neutral',
    });
    await page.reload();
    await expect(page.getByTestId('ws-autosave-status')).toContainText(UNDER_REVIEW_AUTOSAVE);
    await expect(page.getByTestId('ws-autosave-status')).not.toContainText('已定稿');

    const finId = 'test_annotator_1330_as_fin';
    await page.goto(
      buildWorkspaceUrl({ task_id: TASK_ID, sample_id: sampleId, role: 'annotator', run_type: 'official_run', annotator_id: finId })
    );
    await seedReviewerSubmission(page, {
      runType: 'official_run', sampleId, annotatorId: finId, annotatorValue: 'negative', reviewerValue: 'negative',
    });
    await page.reload();
    await expect(page.getByTestId('ws-autosave-status')).toContainText(FINALIZED_AUTOSAVE);
    await expect(page.getByTestId('ws-autosave-status')).not.toContainText('審核中');
  });
});
