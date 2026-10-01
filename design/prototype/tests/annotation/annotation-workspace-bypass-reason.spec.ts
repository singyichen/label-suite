import { test, expect, type Page } from '@playwright/test';
import {
  assertNoPageErrors,
  buildWorkspaceUrl,
  dismissGuidelineModal,
  gotoReviewerWorkspace,
  patchDataFile,
  skipGuidelineModal,
  trackPageErrors,
} from './_workspace-helpers';

/* issue #1082 (spec 015 delta v10.0.0, OpenSpec change
 * 1082-bypass-reason-remove-skip): the annotator-facing "跳過" (skip)
 * control is retired in full -- no replacement mechanism -- and FR-089's
 * reason-required contract moves to the annotator's existing "無法判定
 * (Bypass)" checkbox instead. This file is the Red contract for that move;
 * it supersedes issue-578-reason-required.spec.ts's whole
 * "AC-2.20: annotator skip requires a reason" describe block (removed in
 * the same change) except for its one rbac-risk case (reviewer never shows
 * the skip entry point), which is broadened here into a both-roles case
 * (see the last describe below).
 *
 * Delivered as two stacked PRs (G2a, G2b) to stay under the 300-line
 * hand-written production diff guardrail: G2a introduced this file with
 * only the three cases independent of the Bypass-reason field (AC-2.27,
 * FR-086, the both-roles skip-absence case) alongside the skip-control
 * removal; G2b (this commit) appends the remaining cases below, alongside
 * the Bypass-reason-field implementation, reaching the same 13-case file
 * the change was originally authored and reviewed as.
 *
 * New testid contract introduced by this file (none exist pre-v10.0.0;
 * Green (tasks.md 2.5-2.8) must implement exactly these, docked onto the
 * existing `.preview-bypass-row` per the established "consumers dock their
 * own trailing controls onto this row" pattern,
 * task-config.engine.js:2502):
 *
 *   ws-bypass-reason-<outKey>         -- the reason <input>/<textarea>,
 *                                        rendered inline in the SAME
 *                                        .preview-bypass-row as the existing
 *                                        ws-bypass-<outKey> chip, only while
 *                                        that outKey is bypassed.
 *   ws-bypass-reason-error-<outKey>   -- inline error (UXC-05), visible only
 *                                        after a blocked submit for that
 *                                        outKey, cleared the moment the
 *                                        field's value changes (UXC-04).
 *   ws-bypass-reason-helper-<outKey>  -- helper text, visible only once the
 *                                        field has a non-empty value; exact
 *                                        copy per the spec delta: 理由會隨提交
 *                                        寫入歷程，審核員可見.
 *   ws-review-bypass-reason           -- reviewer-card display of the
 *                                        annotator's Bypass reason (AC-3.66),
 *                                        SAME testid across every outKey,
 *                                        disambiguated by a `data-outkey`
 *                                        attribute -- mirrors the existing
 *                                        `ws-review-original-answer`
 *                                        convention (annotation-workspace.
 *                                        config.js:3742-3743) exactly, since
 *                                        it is this element's new sibling in
 *                                        the SAME per-outKey loop
 *                                        (appendCorrectionControl()). Absent
 *                                        entirely (count 0) when the
 *                                        annotator's Bypass answer carries no
 *                                        reason (pre-v10.0.0 data) --
 *                                        deliberately NOT a rendered-but-
 *                                        empty element, so "no reason" can
 *                                        never be confused with "empty
 *                                        string reason".
 *
 * `ws-review-original-answer`'s own exact-text contract (issue #809,
 * issue-809-previewbypass-original-answer.spec.ts) is UNCHANGED by this
 * file: AC-3.66 is required to add a new sibling element, never to extend
 * that element's own textContent, which is why the reason display above is
 * its own testid rather than appended text.
 */

const TASK = 'T001';
const SAMPLE = 'sent-001';
const SAMPLE_2 = 'sent-002';
const ANNOTATOR = 'kioleemg12';
const REVIEWER = 'reviewer_wang';

const REASON_TEXT = '樣本語意含糊，標記員無法判斷任何類別（issue #1082 Red）';
const REASON_TEXT_DIM = '量尺定義與樣本內容不符，標記員無法評分（issue #1082 Red）';

const SINGLE_LABEL_DISPLAY_ZH = '單一標籤'; // task-config.data.js OUTPUT_TYPE_REGISTRY.single_label.zh
const SINGLE_DIM_DISPLAY_ZH = '單維度回歸'; // task-config.data.js OUTPUT_TYPE_REGISTRY.single_dim.zh

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

async function patchBypassAllowed(page: Page) {
  await patchDataFile(
    page,
    'task-detail.data.js',
    `window.LabelSuiteTaskDetailData.profiles.T001.outputs[0].config.allow_bypass = true;`
  );
}

/* Pushes a second, native-allow_bypass output type onto T001 so the
 * AC-2.29 / submit-validation "multi-output-type task" scenarios exercise a
 * REAL two-output-type task (not a synthetic multi-outKey payload) --
 * same runtime-patch technique already used across the suite (e.g.
 * issue-892-reviewer-identity-sync.spec.ts:189's `profile.outputs.push(...)`
 * for task-management, annotation-workspace-bypass.spec.ts's own
 * allow_bypass stubbing for this exact task). single_dim's shape mirrors
 * T004's native config (task-detail.data.js:232-238). */
async function patchSecondOutputType(page: Page) {
  await patchDataFile(
    page,
    'task-detail.data.js',
    `
    window.LabelSuiteTaskDetailData.profiles.T001.outputs[0].config.allow_bypass = true;
    window.LabelSuiteTaskDetailData.profiles.T001.outputs.push({
      type: 'single_dim',
      config: {
        dimension_name: 'clarity',
        min: 1,
        max: 5,
        step: 1,
        allow_bypass: true
      }
    });
    `
  );
}

async function openAnnotator(page: Page, sampleId: string = SAMPLE) {
  await page.goto(
    buildWorkspaceUrl({ task_id: TASK, sample_id: sampleId, role: 'annotator', run_type: 'official_run', annotator_id: ANNOTATOR })
  );
  await dismissGuidelineModal(page);
}

function readHistory(page: Page, sampleId: string = SAMPLE): Promise<HistoryEvent[]> {
  return page.evaluate(
    ({ taskId, sampleId, annotatorId }) =>
      (window as unknown as { LabelSuiteAnnotationWorkspaceData: WorkspaceData }).LabelSuiteAnnotationWorkspaceData.getSampleHistory(
        taskId,
        'official_run',
        sampleId,
        { annotatorId }
      ),
    { taskId: TASK, sampleId, annotatorId: ANNOTATOR }
  );
}

/* Locates the ONE `.preview-bypass-row` that contains the given chip --
 * scoping assertions to "the same row" (AC-2.29's literal requirement)
 * rather than merely asserting the reason field exists SOMEWHERE on the
 * page, which a two-output-type task would make a weak (false-positive-
 * prone) check. */
function bypassRowFor(page: Page, outKey: string) {
  return page
    .getByTestId('ws-bypass-' + outKey)
    .locator('xpath=ancestor::*[contains(concat(" ", normalize-space(@class), " "), " preview-bypass-row ")]')
    .first();
}

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
});

test.describe('AC-2.29: Bypass reason field expand/collapse and validation timing', () => {
  test.beforeEach(async ({ page }) => {
    await patchBypassAllowed(page);
  });

  test('checking Bypass expands a reason field inline in the same row, with no error shown yet', async ({ page }) => {
    const errors = trackPageErrors(page);
    await openAnnotator(page);

    await expect(page.getByTestId('ws-bypass-reason-single_label')).toHaveCount(0);

    await page.getByTestId('ws-bypass-single_label').check();

    const row = bypassRowFor(page, 'single_label');
    const reasonField = row.getByTestId('ws-bypass-reason-single_label');
    await expect(reasonField).toBeVisible();
    // UXC-04: no validation on the check itself -- nothing was submitted yet.
    await expect(page.getByTestId('ws-bypass-reason-error-single_label')).not.toBeVisible();

    assertNoPageErrors(errors);
  });

  test('unchecking Bypass collapses the reason field and clears its content', async ({ page }) => {
    await openAnnotator(page);

    await page.getByTestId('ws-bypass-single_label').check();
    await page.getByTestId('ws-bypass-reason-single_label').fill(REASON_TEXT);
    await expect(page.getByTestId('ws-bypass-reason-single_label')).toHaveValue(REASON_TEXT);

    await page.getByTestId('ws-bypass-single_label').uncheck();
    await expect(page.getByTestId('ws-bypass-reason-single_label')).toHaveCount(0);

    // Re-checking must not resurrect the previously typed content.
    await page.getByTestId('ws-bypass-single_label').check();
    await expect(page.getByTestId('ws-bypass-reason-single_label')).toHaveValue('');
  });

  test('typing in the reason field clears an existing inline error', async ({ page }) => {
    await openAnnotator(page);

    await page.getByTestId('ws-bypass-single_label').check();
    await page.getByTestId('ws-submit-btn').click();
    await expect(page.getByTestId('ws-bypass-reason-error-single_label')).toBeVisible();

    // UXC-05 clear-on-input.
    await page.getByTestId('ws-bypass-reason-single_label').fill(REASON_TEXT);
    await expect(page.getByTestId('ws-bypass-reason-error-single_label')).not.toBeVisible();
  });

  test('once the reason is filled, helper text appears below the field', async ({ page }) => {
    await openAnnotator(page);

    await page.getByTestId('ws-bypass-single_label').check();
    await expect(page.getByTestId('ws-bypass-reason-helper-single_label')).not.toBeVisible();

    await page.getByTestId('ws-bypass-reason-single_label').fill(REASON_TEXT);
    const helper = page.getByTestId('ws-bypass-reason-helper-single_label');
    await expect(helper).toBeVisible();
    await expect(helper).toHaveText('理由會隨提交寫入歷程，審核員可見');
  });

  test('multi-output-type task: checking one outKey’s Bypass does not expand or affect another outKey’s reason field', async ({
    page,
  }) => {
    await patchSecondOutputType(page);
    await openAnnotator(page);

    await page.getByTestId('ws-bypass-single_label').check();

    await expect(page.getByTestId('ws-bypass-reason-single_label')).toBeVisible();
    await expect(page.getByTestId('ws-bypass-reason-single_dim')).toHaveCount(0);
    await expect(page.getByTestId('ws-bypass-single_dim')).not.toBeChecked();
  });
});

test.describe('Bypass reason required on submit (supersedes AC-2.20)', () => {
  test.beforeEach(async ({ page }) => {
    await patchBypassAllowed(page);
  });

  test('submitting with Bypass checked but its reason empty is blocked, with an inline error and a toast naming the outKey', async ({
    page,
  }) => {
    await openAnnotator(page);

    await page.getByTestId('ws-bypass-single_label').check();
    await page.getByTestId('ws-submit-btn').click();

    await expect(page.getByTestId('ws-bypass-reason-error-single_label')).toBeVisible();
    await expect(page.locator('#toast')).toHaveClass(/toast-warning/);
    await expect(page.locator('#toastMsg')).toContainText(SINGLE_LABEL_DISPLAY_ZH);

    const history = await readHistory(page);
    expect(history.some((e) => e.action === 'submitted')).toBe(false);
  });

  test('filling the reason and resubmitting succeeds, and the submitted event carries it', async ({ page }) => {
    await openAnnotator(page);

    await page.getByTestId('ws-bypass-single_label').check();
    await page.getByTestId('ws-submit-btn').click(); // blocked first
    await page.getByTestId('ws-bypass-reason-single_label').fill(REASON_TEXT);
    await page.getByTestId('ws-submit-btn').click();

    const history = await readHistory(page);
    const submitted = history.filter((e) => e.action === 'submitted');
    expect(submitted).toHaveLength(1);
    expect(submitted[0].reason).toContain('single_label');
    expect(submitted[0].reason).toContain(REASON_TEXT);
  });

  test('multi-output-type: only the outKey(s) missing a reason block submission; an already-filled outKey is unaffected', async ({
    page,
  }) => {
    await patchSecondOutputType(page);
    await openAnnotator(page);

    await page.getByTestId('ws-bypass-single_label').check();
    await page.getByTestId('ws-bypass-reason-single_label').fill(REASON_TEXT);
    await page.getByTestId('ws-bypass-single_dim').check();
    // single_dim's reason is left empty on purpose.

    await page.getByTestId('ws-submit-btn').click();

    await expect(page.getByTestId('ws-bypass-reason-error-single_dim')).toBeVisible();
    await expect(page.getByTestId('ws-bypass-reason-error-single_label')).not.toBeVisible();
    await expect(page.locator('#toastMsg')).toContainText(SINGLE_DIM_DISPLAY_ZH);
    await expect(page.locator('#toastMsg')).not.toContainText(SINGLE_LABEL_DISPLAY_ZH);

    const history = await readHistory(page);
    expect(history.some((e) => e.action === 'submitted')).toBe(false);

    // Completing the missing reason lets the whole submit through, and the
    // already-filled outKey's own text must have survived untouched.
    await page.getByTestId('ws-bypass-reason-single_dim').fill(REASON_TEXT_DIM);
    await page.getByTestId('ws-submit-btn').click();

    const after = await readHistory(page);
    const submitted = after.filter((e) => e.action === 'submitted');
    expect(submitted).toHaveLength(1);
    expect(submitted[0].reason).toContain(REASON_TEXT);
    expect(submitted[0].reason).toContain(REASON_TEXT_DIM);
  });
});

test.describe('AC-3.66: reviewer card shows the annotator Bypass reason next to the chip', () => {
  test('a submitted Bypass answer with a reason shows that reason on the reviewer card', async ({ page }) => {
    await patchBypassAllowed(page);
    await openAnnotator(page);

    await page.getByTestId('ws-bypass-single_label').check();
    await page.getByTestId('ws-bypass-reason-single_label').fill(REASON_TEXT);
    await page.getByTestId('ws-submit-btn').click();

    await gotoReviewerWorkspace(page, { task_id: TASK, sample_id: SAMPLE, run_type: 'official_run' });
    await dismissGuidelineModal(page);

    // issue #809's exact-text contract on the origin label is unchanged.
    await expect(page.getByTestId('ws-review-original-answer')).toHaveText('標記員原答案：無法判定 (Bypass)');

    const reasonDisplay = page.getByTestId('ws-review-bypass-reason');
    await expect(reasonDisplay).toHaveCount(1);
    await expect(reasonDisplay).toHaveAttribute('data-outkey', 'single_label');
    await expect(reasonDisplay).toContainText(REASON_TEXT);
  });

  test('a pre-existing Bypass answer with no reason renders the chip normally, with no reason text and no crash', async ({
    page,
  }) => {
    await patchBypassAllowed(page);
    // Pre-v10.0.0 shaped data: previewBypass set, no bypassReasons field at
    // all -- same "data already on disk" precedent issue #809's own second
    // test uses (navigate first, localStorage is inaccessible from
    // about:blank).
    await page.goto(buildWorkspaceUrl({ task_id: TASK, sample_id: SAMPLE_2, role: 'annotator' }));
    await page.evaluate(
      ({ taskId, sampleId, annotatorId }) => {
        window.localStorage.setItem(
          `labelsuite.wsSubmissions.${taskId}::annotator::official_run::${annotatorId}::-`,
          JSON.stringify({
            [sampleId]: {
              status: 'submitted',
              submittedAt: '2026-01-01T00:00:00.000Z',
              answers: {
                previewState: { single_label: { selected: null } },
                previewBypass: { single_label: true },
              },
            },
          })
        );
      },
      { taskId: TASK, sampleId: SAMPLE_2, annotatorId: ANNOTATOR }
    );

    const errors = trackPageErrors(page);
    await gotoReviewerWorkspace(page, { task_id: TASK, sample_id: SAMPLE_2, run_type: 'official_run' });
    await dismissGuidelineModal(page);

    await expect(page.getByTestId('ws-review-original-answer')).toHaveText('標記員原答案：無法判定 (Bypass)');
    // Absent, not rendered-empty: "no reason" must never read as an empty
    // string.
    await expect(page.getByTestId('ws-review-bypass-reason')).toHaveCount(0);

    assertNoPageErrors(errors);
  });
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
