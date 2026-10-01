import { test, expect, type Page } from '@playwright/test';
import {
  assertNoPageErrors,
  buildWorkspaceUrl,
  dismissGuidelineModal,
  skipGuidelineModal,
  trackPageErrors,
} from './_workspace-helpers';

/* issue #1082 (spec 015 delta v10.0.0, OpenSpec change
 * 1082-bypass-reason-remove-skip), G2a of 2 (G2a = remove the skip control;
 * G2b = add the Bypass reason field that supersedes its reason-required
 * contract -- stacked on this branch).
 *
 * This file starts as the removal-only subset of the full Red contract:
 * these three cases are exactly the ones whose pass/fail does not depend on
 * the new `ws-bypass-reason-*` field G2b adds, so they can be verified true
 * here on their own. G2b appends its own describe blocks (AC-2.29,
 * Bypass-reason-required-on-submit, AC-3.66) to this SAME file rather than
 * creating a second one, since they require the field this branch does not
 * yet add -- the final state after G2b matches the single 13-case file this
 * change was originally implemented as (before the PR-size split).
 *
 * Supersedes issue-578-reason-required.spec.ts's whole "AC-2.20: annotator
 * skip requires a reason" describe block (removed in this same branch)
 * except for its one rbac-risk case (reviewer never shows the skip entry
 * point), which the last describe below broadens to both roles.
 */

const TASK = 'T001';
const SAMPLE = 'sent-001';
const ANNOTATOR = 'kioleemg12';
const REVIEWER = 'reviewer_wang';

type HistoryEvent = {
  action: string;
  role: string;
  actorId: string | null;
  at: string;
  reason?: string;
};

type WorkspaceData = {
  getSampleHistory: (
    taskId: string,
    runType: string,
    sampleId: string,
    identity: { annotatorId?: string }
  ) => HistoryEvent[];
  markSampleSubmitted: (
    taskId: string,
    role: string,
    runType: string,
    sampleId: string,
    payload: unknown,
    historySummary: string,
    identity: { annotatorId?: string; reviewerId?: string }
  ) => boolean | void;
};

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
});

test.describe('AC-2.27: finalized unit locks exactly two controls; wsSkipBtn is entirely absent from the DOM', () => {
  test('finalized official_run unit disables wsSaveBtn/wsSubmitBtn; wsSkipBtn does not exist', async ({ page }) => {
    await page.goto(
      buildWorkspaceUrl({ task_id: TASK, sample_id: SAMPLE, role: 'annotator', run_type: 'official_run', annotator_id: ANNOTATOR })
    );
    await page.evaluate(
      ({ taskId, sampleId, annotatorId, reviewerId }) => {
        const data = (window as unknown as { LabelSuiteAnnotationWorkspaceData: WorkspaceData })
          .LabelSuiteAnnotationWorkspaceData;
        const payload = { previewState: { single_label: { selected: 'positive' } } };
        data.markSampleSubmitted(taskId, 'annotator', 'official_run', sampleId, payload, '', { annotatorId });
        data.markSampleSubmitted(taskId, 'reviewer', 'official_run', sampleId, payload, '', { annotatorId, reviewerId });
      },
      { taskId: TASK, sampleId: SAMPLE, annotatorId: ANNOTATOR, reviewerId: REVIEWER }
    );
    await page.reload();
    await dismissGuidelineModal(page);

    await expect(page.getByTestId('ws-annotator-finalized-notice')).toBeVisible();

    for (const testId of ['ws-save-btn', 'ws-submit-btn']) {
      const btn = page.getByTestId(testId);
      await expect(btn).toHaveCount(1);
      await expect(btn).toBeDisabled();
      await expect(btn).toHaveAttribute('aria-disabled', 'true');
    }

    // Not merely disabled -- the skip control is retired, so it must not
    // exist in the DOM at all, locked or not.
    await expect(page.getByTestId('ws-skip-btn')).toHaveCount(0);
    await expect(page.locator('#wsSkipGroup')).toHaveCount(0);
  });
});

test.describe('FR-086: a pre-existing skipped history event still renders, with a neutral badge and literal English text', () => {
  test('a seeded skipped event renders a neutral badge with the literal text "skipped"', async ({ page }) => {
    const bucketKey = `labelsuite.wsSubmissions.${TASK}::annotator::official_run::${ANNOTATOR}::-`;
    await page.addInitScript(
      ([key, sample]) => {
        window.localStorage.setItem(
          key as string,
          JSON.stringify({
            [sample as string]: {
              status: 'submitted',
              submittedAt: '2026-08-31T09:00:00.000Z',
              answers: {},
              history: [
                {
                  action: 'skipped',
                  role: 'annotator',
                  actorId: 'kioleemg12',
                  at: '2026-08-31T09:10:00.000Z',
                  summary: '事件 skipped（issue #1082 之前寫入的舊資料）',
                  reason: '舊版跳過理由（issue #1082 之前）',
                },
              ],
            },
          })
        );
      },
      [bucketKey, SAMPLE] as const
    );

    const errors = trackPageErrors(page);
    await page.goto(
      buildWorkspaceUrl({ task_id: TASK, sample_id: SAMPLE, role: 'annotator', run_type: 'official_run', annotator_id: ANNOTATOR })
    );
    await page.getByTestId('ws-guideline-tab-history').click();

    const badge = page.locator('#wsHistoryContainer .history-action-badge[data-action="skipped"]');
    await expect(badge).toHaveCount(1);
    // Neutral base badge only -- `skipped` no longer owns a modifier class.
    expect(await badge.evaluate((node) => Array.from(node.classList))).toEqual(['history-action-badge']);
    // Literal English value, NOT a Chinese label -- `skipped` is deliberately
    // NOT in the rejected/saved style exception list (FR-086 v10.0.0).
    await expect(badge).toHaveText('skipped');

    assertNoPageErrors(errors);
  });
});

/* Supersedes issue-578-reason-required.spec.ts's rbac-risk case "the
 * reviewer view never renders the skip entry point (annotator-only
 * action)" -- broadened to both roles (inventory.csv decision=merge, not
 * delete, per design/prototype/README.md's rbac-risk exception). */
test.describe('Skip entry point is absent from the DOM for every role (supersedes the AC-2.20 reviewer-only case)', () => {
  test('neither the annotator view nor the reviewer view renders #wsSkipGroup / ws-skip-reason / ws-skip-btn', async ({
    page,
  }) => {
    await page.goto(
      buildWorkspaceUrl({ task_id: TASK, sample_id: SAMPLE, role: 'annotator', run_type: 'official_run', annotator_id: ANNOTATOR })
    );
    await dismissGuidelineModal(page);
    await expect(page.locator('#wsSkipGroup')).toHaveCount(0);
    await expect(page.getByTestId('ws-skip-reason')).toHaveCount(0);
    await expect(page.getByTestId('ws-skip-btn')).toHaveCount(0);

    await page.goto(
      buildWorkspaceUrl({
        task_id: TASK,
        sample_id: SAMPLE,
        role: 'reviewer',
        run_type: 'official_run',
        annotator_id: ANNOTATOR,
        reviewer_id: REVIEWER,
      })
    );
    await dismissGuidelineModal(page);
    await expect(page.locator('#wsSkipGroup')).toHaveCount(0);
    await expect(page.getByTestId('ws-skip-reason')).toHaveCount(0);
    await expect(page.getByTestId('ws-skip-btn')).toHaveCount(0);
  });
});
