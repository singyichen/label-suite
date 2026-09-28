import { test, expect, type Page } from '@playwright/test';
import { buildWorkspaceUrl, skipGuidelineModal, trackPageErrors, assertNoPageErrors } from './_workspace-helpers';

/**
 * issue #1053 -- a reviewer who already submitted a decision on a review
 * unit, which then became DISPUTED because another reviewer disagreed, sees
 * the SAME interactive "not yet reviewed" card on reopen instead of a
 * read-only summary of their own decision.
 *
 * Root cause (spec 015 FR-103, openspec/changes/fix-1053-reviewer-submitted
 * -disputed/proposal.md): `reviewUnitBlockReason()`
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
 * AC-4.81 (via openspec/changes/fix-1053-reviewer-submitted-disputed).
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

interface WorkspaceData {
  getSubmission: (taskId: string, role: string, runType: string, sampleId: string, identity: Identity) => Submission | null;
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
