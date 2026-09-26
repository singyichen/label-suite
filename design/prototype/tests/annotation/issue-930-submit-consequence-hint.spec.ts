/**
 * issue #930 — a one-line, ALWAYS-VISIBLE (not a tooltip) submit-consequence
 * hint next to the review submit entry point, deriving live from the
 * reviewer's current, not-yet-submitted draft decisions for the review
 * unit: `ws-review-submit-consequence`, next to the fixed footer
 * `ws-review-submit-btn`.
 *
 * issue #1004: the decision-row quick-submit control
 * (`ws-review-quick-submit-btn`) and its would-be consequence-hint sibling
 * (`ws-review-quick-submit-consequence`) are removed entirely -- the footer
 * button is the single review submit entry point, so no quick-submit hint
 * parity requirement remains. The second `test.describe` below now pins
 * that removal instead of hint parity.
 *
 * Source spec (delta, not yet archived):
 * openspec/changes/2026-09-26-review-submit-consequence-hint/specs/annotation/015-annotation-workspace/spec.md
 * FR-102, AC-3.64, AC-3.65.
 * Proposal (the "why"):
 * openspec/changes/2026-09-26-review-submit-consequence-hint/proposal.md
 *
 * RED: `ws-review-submit-consequence` does not exist yet -- every assertion
 * below targeting it must fail (element not found / timeout) until FR-102
 * lands. `ws-review-quick-submit-btn`/`-consequence` assertions are RED for
 * the opposite reason: those elements are still rendered by today's code
 * and must be removed for issue #1004's Green.
 *
 * Fixtures:
 *  - official_run: T015/ofs-04-pending-review (single output type
 *    single_label, no reviewer decision yet) -- the exact repro URL from
 *    issue #930 (`role=reviewer&reviewer_id=reviewer_wang`, no
 *    `annotator_id`, confirmed pending via annotation-workspace.data.js's
 *    T014/T015 script table, ~3582).
 *  - dry_run: T014/dry-05-pending-review, annotator `113450022` (the `B`
 *    seed row in that same script table, ~3572 -- ships no `rev` key yet,
 *    i.e. genuinely undecided). T014's dry_run reviewer assignment is
 *    per-(sample_id, annotator_id) round-robin, not per-sample, so its
 *    `reviewer_id` is resolved via `gotoReviewerWorkspace()` /
 *    `resolveAssignedReviewerId()` (`_workspace-helpers.ts`) -- the SAME
 *    FR-093 assignment derivation the workspace itself uses -- rather than
 *    a hardcoded guess. No existing spec in this directory opens exactly
 *    this (sample_id, annotator_id) pair as a full interactive review, so
 *    this resolves it live against the production derivation instead of
 *    copying a literal from another file (flagged in the handback report).
 *
 * Deviation flagged (see handback report): AC-3.64's "即時切換" bullet
 * describes returning to "尚未選擇決策" by editing the answer under an
 * active `modify` decision. That contradicts the CURRENT
 * `syncDecisionsWithCorrections()` (annotation-workspace.config.js:3844,
 * issue #925's already-merged fix): a `modify` decision is explicitly never
 * reset by an answer edit, unlike `approve`/`bypass`. Test (d) below
 * instead returns to "undecided" by re-clicking the SAME decision button
 * (config.js:3327's toggle-off), a different, already-existing reset path
 * -- so the assertion stays correct against actual current/Green behavior
 * instead of embedding a claim today's code disproves.
 */
import { expect, test } from '@playwright/test';
import { buildWorkspaceUrl, dismissGuidelineModal, gotoReviewerWorkspace, skipGuidelineModal } from './_workspace-helpers';

const OFFICIAL_URL = buildWorkspaceUrl({
  task_id: 'T015',
  sample_id: 'ofs-04-pending-review',
  role: 'reviewer',
  run_type: 'official_run',
  reviewer_id: 'reviewer_wang',
});

const DRY_RUN = {
  task_id: 'T014',
  sample_id: 'dry-05-pending-review',
  run_type: 'dry_run' as const,
  annotator_id: '113450022',
};

const SUBMIT_HINT = 'ws-review-submit-consequence';
const QUICK_HINT = 'ws-review-quick-submit-consequence';

const COPY = {
  pending: '尚未選擇決策',
  finalizedOfficial: '送出後即定稿，成為最終答案',
  finalizedDryRun: '送出後即定稿，成為最終答案（試標不產生最終答案，僅計入一致性統計）',
  disputed: '送出後進入爭議池，待仲裁定案',
};

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
});

test.describe('issue #930: footer submit-consequence hint (ws-review-submit-consequence)', () => {
  test('(a) shows the neutral "pending" hint before any decision, and the quick-submit hint stays hidden', async ({
    page,
  }) => {
    await page.goto(OFFICIAL_URL);
    await dismissGuidelineModal(page);

    const hint = page.getByTestId(SUBMIT_HINT);
    await expect(hint).toBeVisible();
    await expect(hint).toHaveAttribute('data-consequence', 'pending');
    await expect(hint).toHaveText(COPY.pending);

    // issue #1004: the decision-row quick-submit control and its
    // consequence hint were removed entirely -- neither should exist in the
    // DOM at all, regardless of decision state.
    await expect(page.getByTestId('ws-review-quick-submit-btn')).toHaveCount(0);
    await expect(page.getByTestId(QUICK_HINT)).toHaveCount(0);
  });

  test('(b1) approve on official_run shows the finalized hint with data-run-type="official_run"', async ({ page }) => {
    await page.goto(OFFICIAL_URL);
    await dismissGuidelineModal(page);

    await page.getByTestId('ws-review-row-approve').click();

    const hint = page.getByTestId(SUBMIT_HINT);
    await expect(hint).toHaveAttribute('data-consequence', 'finalized');
    await expect(hint).toHaveAttribute('data-run-type', 'official_run');
    await expect(hint).toHaveText(COPY.finalizedOfficial);
  });

  test('(b2) approve on dry_run shows the finalized hint with data-run-type="dry_run" and the dry-run caveat', async ({
    page,
  }) => {
    await gotoReviewerWorkspace(page, DRY_RUN);
    await dismissGuidelineModal(page);

    await page.getByTestId('ws-review-row-approve').click();

    const hint = page.getByTestId(SUBMIT_HINT);
    await expect(hint).toHaveAttribute('data-consequence', 'finalized');
    await expect(hint).toHaveAttribute('data-run-type', 'dry_run');
    await expect(hint).toHaveText(COPY.finalizedDryRun);
  });

  test('(c) modify and bypass (each with a filled reason) show the IDENTICAL disputed hint', async ({ page }) => {
    await page.goto(OFFICIAL_URL);
    await dismissGuidelineModal(page);

    await page.getByTestId('ws-review-row-modify').click();
    await page.getByTestId('ws-review-reason').fill('修正（測試理由）');

    const hint = page.getByTestId(SUBMIT_HINT);
    await expect(hint).toHaveAttribute('data-consequence', 'disputed');
    await expect(hint).toHaveText(COPY.disputed);

    // FR-092: modify and bypass have the same effect on unit status, so
    // switching to bypass MUST show the exact same disputed copy -- not a
    // second, differently-worded branch.
    await page.getByTestId('ws-review-row-bypass').click();
    await page.getByTestId('ws-review-reason').fill('無法裁決（測試理由）');

    await expect(hint).toHaveAttribute('data-consequence', 'disputed');
    await expect(hint).toHaveText(COPY.disputed);
  });

  test('(d) switching decisions updates the hint live without a page reload, back to pending once cleared', async ({
    page,
  }) => {
    await page.goto(OFFICIAL_URL);
    await dismissGuidelineModal(page);

    const hint = page.getByTestId(SUBMIT_HINT);
    const approveBtn = page.getByTestId('ws-review-row-approve');
    const modifyBtn = page.getByTestId('ws-review-row-modify');

    await approveBtn.click();
    await expect(hint).toHaveAttribute('data-consequence', 'finalized');

    await modifyBtn.click();
    await page.getByTestId('ws-review-reason').fill('修正（測試理由）');
    await expect(hint).toHaveAttribute('data-consequence', 'disputed');
    await expect(hint).toHaveText(COPY.disputed);

    // Toggle the same decision button off (config.js:3327) to clear the
    // decision back to undecided -- see the deviation note in the file
    // header for why this replaces an answer-edit reset here.
    await modifyBtn.click();
    await expect(modifyBtn).toHaveAttribute('aria-pressed', 'false');
    await expect(hint).toHaveAttribute('data-consequence', 'pending');
    await expect(hint).toHaveText(COPY.pending);
  });
});

test.describe('issue #1004: no quick-submit entry point exists, even where its hint parity used to be checked', () => {
  test('(e) once decisions are complete (finalized, official_run), no quick-submit button/hint exist and the footer hint is finalized', async ({
    page,
  }) => {
    await page.goto(OFFICIAL_URL);
    await dismissGuidelineModal(page);

    await page.getByTestId('ws-review-row-approve').click();

    await expect(page.getByTestId('ws-review-quick-submit-btn')).toHaveCount(0);
    await expect(page.getByTestId(QUICK_HINT)).toHaveCount(0);

    const submitHint = page.getByTestId(SUBMIT_HINT);
    await expect(submitHint).toHaveText(COPY.finalizedOfficial);
    await expect(submitHint).toHaveAttribute('data-consequence', 'finalized');
    await expect(submitHint).toHaveAttribute('data-run-type', 'official_run');
  });

  test('(e2) disputed via modify: no quick-submit button/hint exist and the footer hint is disputed', async ({ page }) => {
    await page.goto(OFFICIAL_URL);
    await dismissGuidelineModal(page);

    // T015/ofs-04-pending-review ships a single output type, so one
    // approve decides the whole unit before switching to modify below.
    await page.getByTestId('ws-review-row-approve').click();

    await page.getByTestId('ws-review-row-modify').click();
    await page.getByTestId('ws-review-reason').fill('修正（測試理由）');

    await expect(page.getByTestId('ws-review-quick-submit-btn')).toHaveCount(0);
    await expect(page.getByTestId(QUICK_HINT)).toHaveCount(0);

    const submitHint = page.getByTestId(SUBMIT_HINT);
    await expect(submitHint).toHaveText(COPY.disputed);
    await expect(submitHint).toHaveAttribute('data-consequence', 'disputed');
  });

  test('(f) approve over an answer already changed from the annotator original shows disputed, not finalized, with no quick-submit entry (coordinator finding)', async ({
    page,
  }) => {
    await page.goto(OFFICIAL_URL);
    await dismissGuidelineModal(page);

    // Change the answer away from the annotator's original value
    // ('positive' -- annotation-workspace.data.js's ofs-04-pending-review
    // seed row, ~3582) BEFORE picking any decision. This is the order the
    // coordinator's finding turns on: syncDecisionsWithCorrections()
    // (annotation-workspace.config.js:3844) only resets an EXISTING
    // decision when the answer changes AFTER it -- an edit made before any
    // decision exists has nothing to reset.
    const correction = page.getByTestId('ws-review-correct-single_label');
    const negativeChip = correction.getByTestId('ws-single-label-chip-negative');
    await negativeChip.click();
    await expect(negativeChip).toHaveAttribute('aria-pressed', 'true');

    // THEN approve, without ever going through 修正 (modify) first.
    const approveBtn = page.getByTestId('ws-review-row-approve');
    await approveBtn.click();
    await expect(approveBtn).toHaveAttribute('aria-pressed', 'true');

    // reviewSubmitConsequenceStatus() (annotation-workspace.config.js:5596)
    // must mirror anyReviewerChanged() (annotation-workspace.data.js:2177),
    // which ORs two conditions: the decision is in
    // DISPUTE_FORCING_DECISIONS, OR the reviewer's current answer differs
    // from the annotator's original for this outKey. Here the decision is
    // `approve` (not dispute-forcing) but the answer now differs
    // ('negative' vs the seeded 'positive') -- that alone must force
    // disputed. RED: today's hint code only implements the decision half
    // of the OR, so it still reports data-consequence="finalized" here.
    const hint = page.getByTestId(SUBMIT_HINT);
    await expect(hint).toHaveAttribute('data-consequence', 'disputed');
    await expect(hint).toHaveText(COPY.disputed);

    // No quick-submit entry point exists (issue #1004), regardless of this
    // scenario's disputed/finalized outcome.
    await expect(page.getByTestId('ws-review-quick-submit-btn')).toHaveCount(0);
    await expect(page.getByTestId(QUICK_HINT)).toHaveCount(0);
  });
});
