import { test, expect, type Page } from '@playwright/test';
import { buildWorkspaceUrl, skipGuidelineModal, trackPageErrors, assertNoPageErrors } from './_workspace-helpers';

/**
 * issue #1053 -- a reviewer who already submitted a decision on a review
 * unit, which then became DISPUTED because another reviewer disagreed, sees
 * the SAME interactive "not yet reviewed" card on reopen instead of a
 * read-only summary of their own decision.
 *
 * Root cause (specs/annotation/015-annotation-workspace/spec.md FR-103;
 * proposal of the archived OpenSpec change
 * `fix-1053-reviewer-submitted-disputed`): `reviewUnitBlockReason()`
 * (annotation-workspace.config.js:3883) only intercepts a DISPUTED unit via
 * the ARBITRATION branch (:3889), whose condition includes
 * `isArbiterCandidate()` (annotation-workspace.data.js:2579) -- always
 * `false` for the reviewer who is the one who submitted -- so the function
 * falls through to its tail `return null` (interactive layout). Even with
 * that gap patched, `seedReviewRow()` (:3693) unconditionally seeds the
 * correction panel from whatever `submission` its caller passes; the
 * interactive branch's caller (around :5347, `var submission =
 * getAnnotatorSubmission();`) always passes the ANNOTATOR's answer, never
 * the current reviewer's own prior submission.
 *
 * Fixture (REVIEW_FLOW_DEMO_SEED_KEY_V4 bootstrap seed,
 * annotation-workspace.data.js:3551-3553): T014/dry_run/dry-02-one-divergent,
 * annotator B = '113450022' answered `neutral`; reviewer_li modified it to
 * `positive` with reason '依 [[正向（positive）的判準]]，整段以讚賞語氣收尾，
 * 應判讀為正面而非中性'. A third reviewer (li) is the disputing party that
 * makes this unit DISPUTED and reviewer_li is not can_arbitrate for T014, so
 * this is exactly the "當事審核員" (non-arbiter, already-submitted reviewer)
 * case FR-103 targets.
 *
 * Traceability: specs/annotation/015-annotation-workspace/spec.md FR-103,
 * AC-4.81 (delivered by the archived OpenSpec change
 * `fix-1053-reviewer-submitted-disputed`).
 */

interface Identity {
  annotatorId?: string;
  reviewerId?: string;
}

interface Submission {
  previewState?: Record<string, { selected?: string }>;
  decisions?: Record<string, string>;
  reasons?: Record<string, string>;
}

interface HistoryEvent {
  action: string;
  role: string;
  actorId: string;
  at: string;
  [key: string]: unknown;
}

interface HistoryViewer {
  role: string;
  actorId?: string;
}

interface WorkspaceData {
  getSubmission: (taskId: string, role: string, runType: string, sampleId: string, identity: Identity) => Submission | null;
  getSampleHistory: (
    taskId: string,
    runType: string,
    sampleId: string,
    identity: Identity,
    viewer: HistoryViewer
  ) => HistoryEvent[];
}

async function getSubmission(
  page: Page,
  taskId: string,
  role: string,
  runType: string,
  sampleId: string,
  identity: Identity
): Promise<Submission | null> {
  return page.evaluate(
    ([t, r, rt, s, id]) =>
      (window as unknown as { LabelSuiteAnnotationWorkspaceData: WorkspaceData }).LabelSuiteAnnotationWorkspaceData
        .getSubmission(t, r, rt, s, id as Identity),
    [taskId, role, runType, sampleId, identity] as const
  );
}

async function getSampleHistory(
  page: Page,
  taskId: string,
  runType: string,
  sampleId: string,
  identity: Identity,
  viewer: HistoryViewer
): Promise<HistoryEvent[]> {
  return page.evaluate(
    ([t, rt, s, id, v]) =>
      (window as unknown as { LabelSuiteAnnotationWorkspaceData: WorkspaceData }).LabelSuiteAnnotationWorkspaceData
        .getSampleHistory(t, rt, s, id as Identity, v as HistoryViewer),
    [taskId, runType, sampleId, identity, viewer] as const
  );
}

const TASK_014 = 'T014';
const RUN_DRY = 'dry_run';
const SAMPLE = 'dry-02-one-divergent';
const ANNOTATOR_B = '113450022'; // seed's `B` -- verified via grep against annotation-workspace.data.js:3477
const REVIEWER_LI = 'reviewer_li'; // submitting, non-arbiter reviewer for this unit
const ANNOTATOR_ORIGINAL_VALUE = 'neutral';
const REVIEWER_CORRECTED_VALUE = 'positive';
const REVIEWER_REASON =
  '依 [[正向（positive）的判準]]，整段以讚賞語氣收尾，應判讀為正面而非中性'; // verbatim, annotation-workspace.data.js:3553

function reviewerUrl(params: { task_id: string; sample_id: string; run_type: 'dry_run' | 'official_run'; reviewer_id: string; annotator_id?: string }) {
  return buildWorkspaceUrl({ ...params, role: 'reviewer' });
}

test.describe('issue #1053 -- reopening a submitted, now-disputed review unit as the submitting (non-arbiter) reviewer', () => {
  test('1. default read-only summary reflects the reviewer\'s own submitted decision, not a blank card', async ({ page }) => {
    const errors = trackPageErrors(page);
    await skipGuidelineModal(page);
    await page.goto(
      reviewerUrl({ task_id: TASK_014, sample_id: SAMPLE, run_type: RUN_DRY, reviewer_id: REVIEWER_LI, annotator_id: ANNOTATOR_B })
    );

    // Ground truth: confirm the fixture's actual stored submission before
    // asserting the UI reflects it, so this test fails against the UI gap
    // rather than a stale assumption about the seed.
    const submission = await getSubmission(page, TASK_014, 'reviewer', RUN_DRY, SAMPLE, {
      annotatorId: ANNOTATOR_B,
      reviewerId: REVIEWER_LI,
    });
    expect(submission).not.toBeNull();
    expect(submission!.decisions?.single_label).toBe('modify');
    expect(submission!.previewState?.single_label?.selected).toBe(REVIEWER_CORRECTED_VALUE);
    expect(submission!.reasons?.single_label).toBe(REVIEWER_REASON);

    // Core Red assertion: the read-only summary card must exist and reflect
    // that same submission. Under current (unpatched) code this card is
    // never rendered at all -- reviewUnitBlockReason() falls through to the
    // interactive layout instead.
    const card = page.getByTestId('ws-review-submitted-card');
    await expect(card).toBeVisible();
    await expect(card).toContainText(ANNOTATOR_ORIGINAL_VALUE);
    await expect(card).toContainText(REVIEWER_CORRECTED_VALUE);
    await expect(card).toContainText(REVIEWER_REASON);
    await expect(card).toContainText('修正'); // reviewModifyLabel -- li's decision

    assertNoPageErrors(errors);
  });

  test('2. submit is neither visible nor triggerable via Ctrl/Cmd+Enter in read-only mode', async ({ page }) => {
    await skipGuidelineModal(page);
    await page.goto(
      reviewerUrl({ task_id: TASK_014, sample_id: SAMPLE, run_type: RUN_DRY, reviewer_id: REVIEWER_LI, annotator_id: ANNOTATOR_B })
    );

    await expect(page.getByTestId('ws-review-submitted-card')).toBeVisible();
    await expect(page.getByTestId('ws-review-submit-btn')).toBeHidden();

    // setupActionShortcuts() skips hidden buttons (annotation-workspace
    // .config.js:3453-3462); a hidden submit button must not fire a submit
    // toast via the Ctrl/Cmd+Enter shortcut either.
    await page.keyboard.press('ControlOrMeta+Enter');
    await expect(page.locator('#toastMsg')).not.toHaveText('審核已送出');
  });

  test('3. "修改我的審核" seeds the correction panel from the reviewer\'s own submission, not the annotator\'s original answer', async ({ page }) => {
    await skipGuidelineModal(page);
    await page.goto(
      reviewerUrl({ task_id: TASK_014, sample_id: SAMPLE, run_type: RUN_DRY, reviewer_id: REVIEWER_LI, annotator_id: ANNOTATOR_B })
    );

    await expect(page.getByTestId('ws-review-submitted-card')).toBeVisible();
    await page.getByTestId('ws-review-edit-my-decision-btn').click();

    // Core regression this bug describes: the correction panel must show
    // li's own corrected value (`positive`), NOT the annotator's original
    // (`neutral`). Under current code seedReviewRow() always seeds from
    // getAnnotatorSubmission(), so `neutral` (annotator) would be selected
    // instead of `positive` (reviewer).
    const correction = page.getByTestId('ws-review-correct-single_label');
    await expect(correction.getByTestId(`ws-single-label-chip-${REVIEWER_CORRECTED_VALUE}`)).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    await expect(correction.getByTestId(`ws-single-label-chip-${ANNOTATOR_ORIGINAL_VALUE}`)).toHaveAttribute(
      'aria-pressed',
      'false'
    );

    // The `modify` decision button must be pre-selected, and the reason
    // field pre-filled with li's own reason text.
    await expect(page.getByTestId('ws-review-row-modify')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('ws-review-reason')).toHaveValue(REVIEWER_REASON);
  });

  test('4. "取消，維持原決策" returns to the read-only summary without writing any change', async ({ page }) => {
    await skipGuidelineModal(page);
    await page.goto(
      reviewerUrl({ task_id: TASK_014, sample_id: SAMPLE, run_type: RUN_DRY, reviewer_id: REVIEWER_LI, annotator_id: ANNOTATOR_B })
    );

    await expect(page.getByTestId('ws-review-submitted-card')).toBeVisible();
    await page.getByTestId('ws-review-edit-my-decision-btn').click();
    await expect(page.getByTestId('ws-review-cancel-edit-btn')).toBeVisible();
    await page.getByTestId('ws-review-cancel-edit-btn').click();

    await expect(page.getByTestId('ws-review-submitted-card')).toBeVisible();
    await expect(page.getByTestId('ws-review-row-modify')).toHaveCount(0);

    const submission = await getSubmission(page, TASK_014, 'reviewer', RUN_DRY, SAMPLE, {
      annotatorId: ANNOTATOR_B,
      reviewerId: REVIEWER_LI,
    });
    expect(submission!.decisions?.single_label).toBe('modify');
    expect(submission!.previewState?.single_label?.selected).toBe(REVIEWER_CORRECTED_VALUE);
    expect(submission!.reasons?.single_label).toBe(REVIEWER_REASON);
  });
});

test.describe('issue #1053 -- regression guards (must behave identically to current code, no-op assertions)', () => {
  test('5. ARBITRATION: an eligible arbiter still sees the arbitration card, not the submitted-decision summary', async ({
    page,
  }) => {
    const errors = trackPageErrors(page);
    await skipGuidelineModal(page);
    // T016/official_run/ofm-03-awaiting-arbitration x kioleemg12 (annotator
    // A): reviewer_lin already modified it to `disputed`, and reviewer_chen
    // is T016's can_arbitrate roster member who never reviewed this unit --
    // annotation-workspace.data.js:3595.
    await page.goto(
      reviewerUrl({
        task_id: 'T016',
        sample_id: 'ofm-03-awaiting-arbitration',
        run_type: 'official_run',
        reviewer_id: 'reviewer_chen',
        annotator_id: 'kioleemg12',
      })
    );

    await expect(page.getByTestId('ws-arbitration-card')).toBeVisible();
    await expect(page.getByTestId('ws-review-submitted-card')).toHaveCount(0);

    assertNoPageErrors(errors);
  });

  test('6. FINALIZED: a finalized unit still renders the finalized read-only card, not the submitted-decision summary', async ({
    page,
  }) => {
    const errors = trackPageErrors(page);
    await skipGuidelineModal(page);
    // T015/official_run/ofs-01-agree-gold x kioleemg12 (annotator A):
    // reviewer_wang agreed, unit is finalized -- annotation-workspace.data
    // .js:3578. Any reviewer identity opens it read-only, per issue-308
    // -finalized-unit-lock.spec.ts's own fixture use of `reviewer_chen` here.
    await page.goto(
      reviewerUrl({
        task_id: 'T015',
        sample_id: 'ofs-01-agree-gold',
        run_type: 'official_run',
        reviewer_id: 'reviewer_chen',
        annotator_id: 'kioleemg12',
      })
    );

    await expect(page.getByTestId('ws-review-finalized-card')).toBeVisible();
    await expect(page.getByTestId('ws-review-submitted-card')).toHaveCount(0);

    assertNoPageErrors(errors);
  });
});

test.describe('issue #1053 -- AC-4.82 write-side residual-path guard', () => {
  test('7. a residual invocation of handleReviewSubmit() while the read-only summary is showing must not write or advance past its entry guards', async ({
    page,
  }) => {
    const errors = trackPageErrors(page);
    await skipGuidelineModal(page);
    await page.goto(
      reviewerUrl({ task_id: TASK_014, sample_id: SAMPLE, run_type: RUN_DRY, reviewer_id: REVIEWER_LI, annotator_id: ANNOTATOR_B })
    );
    const identity = { annotatorId: ANNOTATOR_B, reviewerId: REVIEWER_LI };

    await expect(page.getByTestId('ws-review-submitted-card')).toBeVisible();
    await expect(page.getByTestId('ws-review-submit-btn')).toBeHidden();

    const before = await getSubmission(page, TASK_014, 'reviewer', RUN_DRY, SAMPLE, identity);
    const historyBefore = await getSampleHistory(page, TASK_014, RUN_DRY, SAMPLE, identity, {
      role: 'reviewer',
      actorId: REVIEWER_LI,
    });

    /*
     * Investigation (handleReviewSubmit() is never exposed on `window` --
     * grep -n "window\.[A-Za-z_]* = " annotation-workspace.config.js only
     * lists state/t/el/setText/markDirty/revalidateCurrentStep/
     * showFieldError/showToast/renderMarkdown/track/onChipSelectionChange/
     * showTaxonomyDeleteModal/hideTaxonomyDeleteModal/
     * getDatasetTotalEstimate -- handleReviewSubmit is not among them, so
     * it cannot be called directly via page.evaluate()).
     *
     * The Ctrl/Cmd+Enter shortcut is already covered above by test 2 and is
     * NOT a residual path into this function at all: setupActionShortcuts()
     * explicitly skips a button carrying the `hidden` class
     * (annotation-workspace.config.js:3496) before it ever dispatches a
     * click, so it never reaches handleReviewSubmit()'s body.
     *
     * The one invocation this file's own wiring leaves genuinely reachable
     * is the listener `reviewSubmitBtn.addEventListener('click',
     * handleReviewSubmit)` (:6654): it is attached unconditionally to
     * #wsReviewSubmitBtn and stays attached even after the SUBMITTED_DISPUTED
     * read-only branch adds the `hidden` class to that same element --
     * native HTMLElement.click() fires a listener regardless of the
     * element's CSS visibility, unlike Playwright's own locator `.click()`,
     * which refuses to act on a hidden target. A raw
     * `document.getElementById('wsReviewSubmitBtn').click()` is therefore a
     * real residual call path -- exactly the "未來的呼叫變更" the AC-4.82
     * rationale names -- distinct from the already-covered shortcut case.
     *
     * Empirically, in this single-output-type fixture the write itself is
     * already incidentally blocked today by the separate, pre-existing
     * FR-083 "every output decided" gate (pendingReviewOutputKeys(),
     * further down handleReviewSubmit()): the read-only render path never
     * seeds reviewRowDecisions, so that gate treats every output as
     * undecided and returns before reaching the actual write. That is NOT
     * the AC-4.82 entry-time guard task 2.5 adds, though -- it is reached
     * only after the function has already rebuilt rowsByOutKey and
     * evaluated every output's decision, and it responds with a visible
     * blocking warning toast ("請完成以下輸出類型的審核決策..."), which is
     * observable proof the function ran deep past its entry point instead
     * of returning immediately the way AC-4.82 requires. The new
     * entry-time guard MUST return before any of that runs, so the warning
     * toast must not appear either -- that is this test's actual Red
     * signal. The getSubmission()/history invariants below already hold
     * today (the incidental FR-083 gate already prevents the write) and
     * must keep holding after Green; they are asserted as the AC-4.82
     * regression guard the spec scenario names, not as the changing part.
     */
    await page.evaluate(() => {
      var btn = document.getElementById('wsReviewSubmitBtn');
      if (btn) btn.click();
    });

    await expect(page.locator('#toast')).not.toHaveClass(/visible/);

    const after = await getSubmission(page, TASK_014, 'reviewer', RUN_DRY, SAMPLE, identity);
    expect(after).toEqual(before);

    const historyAfter = await getSampleHistory(page, TASK_014, RUN_DRY, SAMPLE, identity, {
      role: 'reviewer',
      actorId: REVIEWER_LI,
    });
    expect(historyAfter).toEqual(historyBefore);

    assertNoPageErrors(errors);
  });

  test('8. contrast -- the "修改我的審核" edit-mode entry is not blocked by the residual-path guard and still submits normally', async ({
    page,
  }) => {
    const errors = trackPageErrors(page);
    await skipGuidelineModal(page);
    await page.goto(
      reviewerUrl({ task_id: TASK_014, sample_id: SAMPLE, run_type: RUN_DRY, reviewer_id: REVIEWER_LI, annotator_id: ANNOTATOR_B })
    );
    const identity = { annotatorId: ANNOTATOR_B, reviewerId: REVIEWER_LI };

    await expect(page.getByTestId('ws-review-submitted-card')).toBeVisible();
    await page.getByTestId('ws-review-edit-my-decision-btn').click();

    /* AC-4.82's guard third condition ("not in edit mode") does not hold
     * here -- the guard MUST NOT fire, and the pre-filled decision (test 3
     * above) must submit through the real, now-visible submit control
     * exactly as FR-103's own re-adjudication entry point always could. */
    await expect(page.getByTestId('ws-review-row-modify')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('ws-review-submit-btn')).toBeVisible();
    await page.getByTestId('ws-review-submit-btn').click();

    await expect(page.locator('#toastMsg')).toHaveText('審核已送出');

    const after = await getSubmission(page, TASK_014, 'reviewer', RUN_DRY, SAMPLE, identity);
    expect(after!.decisions?.single_label).toBe('modify');
    expect(after!.previewState?.single_label?.selected).toBe(REVIEWER_CORRECTED_VALUE);
    expect(after!.reasons?.single_label).toBe(REVIEWER_REASON);

    assertNoPageErrors(errors);
  });
});
