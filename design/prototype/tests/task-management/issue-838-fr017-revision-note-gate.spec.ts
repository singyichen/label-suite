/*
 * Traceability: specs/task-management/014-task-detail/spec.md (v4.1.0) --
 *   FR-017, FR-013(4), FR-010f-2, AC-3.12, SC-042; TrialRound entity
 *   (prior_round_findings / guideline_change_summary / no_change_reason).
 *   Issue #838 (split out of #791, whose design.md "範圍界線" left the
 *   revision-note gate unimplemented).
 *
 * FR-017: creating trial round R{n} with n >= 2 (only reachable from
 * waiting_iaa_confirmation, FR-013(2)) requires prior_round_findings plus
 * guideline_change_summary, or -- when no_change is checked --
 * no_change_reason in place of guideline_change_summary. prior_round_findings
 * stays required either way (TrialRound entity: "round >= 2 必填").
 * A missing item blocks creation per FR-013(4): every missing field gets its
 * own hint (per-item, same "list every unmet condition" rule as FR-010t's
 * toast), and the task stays in waiting_iaa_confirmation. R1 (draft ->
 * dry_run_in_progress) is exempt: no revision-note dialog opens at all.
 *
 * Contract for Green -- selectors this file pins down:
 *   - #trialRoundRevisionModal: .modal-overlay dialog, opened (.show) by the
 *     add-round button whenever the round being created is R2 or later.
 *   - #priorRoundFindingsInput / #guidelineChangeSummaryInput /
 *     #noChangeReasonInput: textareas; #noChangeCheckbox swaps
 *     #guidelineChangeSummaryInput out for #noChangeReasonInput.
 *   - #priorRoundFindingsError / #guidelineChangeSummaryError /
 *     #noChangeReasonError: per-field .inline-error hints, visible only for
 *     the fields that are actually missing.
 *   - #trialRoundRevisionConfirmBtn / #trialRoundRevisionCancelBtn.
 *   - A successful creation stores the note on the new TASK_DATA.trialRounds
 *     entry (priorRoundFindings / guidelineChangeSummary / noChangeReason;
 *     guidelineChangeSummary === 'no_change' when no_change is checked).
 *
 * T001 seeds isolationEnabled: true, so the isolation risk modal never opens
 * here (see task-detail-publish-risk-confirm.spec.ts for that branch).
 */
import { test, expect, type Page } from '@playwright/test';

const TASK_DETAIL_URL = '/pages/task-management/task-detail.html?task_id=T001';

type StoredRound = {
  round: number;
  priorRoundFindings?: string | null;
  guidelineChangeSummary?: string | null;
  noChangeReason?: string | null;
};

async function readTrialRounds(page: Page): Promise<StoredRound[]> {
  return page.evaluate(() => {
    const win = window as unknown as { TASK_DATA: { trialRounds: StoredRound[] } };
    return win.TASK_DATA.trialRounds;
  });
}

async function openRevisionModalFromWaiting(page: Page) {
  await page.goto(`${TASK_DETAIL_URL}&status=waiting_iaa_confirmation`);
  await expect(page.locator('#statusBadge')).toContainText('待 IAA 確認');
  await expect(page.locator('#publishDryRunBtn')).toHaveText('新增試標回合 R2');
  await page.locator('#publishDryRunBtn').click();
  const modal = page.locator('#trialRoundRevisionModal');
  await expect(modal).toBeVisible();
  await expect(modal).toContainText('R2');
  return modal;
}

async function expectStillWaitingWithOnlyR1(page: Page) {
  await expect(page.locator('#trialRoundRevisionModal')).toBeVisible();
  await expect(page.locator('#statusBadge')).toContainText('待 IAA 確認');
  await expect(page.locator('#trialRoundTimeline .round-timeline-item')).toHaveCount(1);
}

test.describe('FR-017 revision-note gate for trial round R{n}, n >= 2 (issue #838)', () => {
  test('R1 from draft is exempt: no revision-note dialog, round created directly', async ({ page }) => {
    await page.goto(TASK_DETAIL_URL);
    await expect(page.locator('#statusBadge')).toContainText('草稿');

    await page.locator('#publishDryRunBtn').click();

    await expect(page.locator('#trialRoundRevisionModal')).toBeHidden();
    await expect(page.locator('#statusBadge')).toContainText('試標進行中');
    await expect(page.locator('#trialRoundTimeline .round-timeline-item')).toHaveCount(1);
  });

  test('R2 with every field empty is blocked with one hint per missing field', async ({ page }) => {
    await openRevisionModalFromWaiting(page);
    await expect(page.locator('#noChangeCheckbox')).not.toBeChecked();
    await expect(page.locator('#noChangeReasonInput')).toBeHidden();
    // No hint before the user has tried to submit.
    await expect(page.locator('#priorRoundFindingsError')).toBeHidden();
    await expect(page.locator('#guidelineChangeSummaryError')).toBeHidden();

    await page.locator('#trialRoundRevisionConfirmBtn').click();

    await expectStillWaitingWithOnlyR1(page);
    await expect(page.locator('#priorRoundFindingsError')).toHaveText('請填寫前一輪發現摘要。');
    await expect(page.locator('#guidelineChangeSummaryError')).toHaveText('請填寫指引異動摘要，或勾選「本輪未變更指引」並說明理由。');
    await expect(page.locator('#noChangeReasonError')).toBeHidden();
    await expect(page.locator('#priorRoundFindingsInput')).toHaveClass(/\berror\b/);
    await expect(page.locator('#guidelineChangeSummaryInput')).toHaveClass(/\berror\b/);
    // FR-013(4): same "list every unmet item" block as FR-010t's toast.
    await expect(page.locator('#toastMsg')).toContainText('修訂紀錄未完成，無法新增試標回合 R2');
    await expect(page.locator('#toastMsg')).toContainText('前一輪發現摘要');
    await expect(page.locator('#toastMsg')).toContainText('指引異動摘要');
  });

  test('whitespace-only input counts as missing and only the missing field is flagged', async ({ page }) => {
    await openRevisionModalFromWaiting(page);
    await page.locator('#priorRoundFindingsInput').fill('R1 的 A 類與 B 類邊界判讀分歧大');
    await page.locator('#guidelineChangeSummaryInput').fill('   ');

    await page.locator('#trialRoundRevisionConfirmBtn').click();

    await expectStillWaitingWithOnlyR1(page);
    await expect(page.locator('#priorRoundFindingsError')).toBeHidden();
    await expect(page.locator('#priorRoundFindingsInput')).not.toHaveClass(/\berror\b/);
    await expect(page.locator('#guidelineChangeSummaryError')).toBeVisible();
  });

  test('cancelling the dialog creates nothing and leaves the status untouched', async ({ page }) => {
    await openRevisionModalFromWaiting(page);
    await page.locator('#trialRoundRevisionCancelBtn').click();

    await expect(page.locator('#trialRoundRevisionModal')).toBeHidden();
    await expect(page.locator('#statusBadge')).toContainText('待 IAA 確認');
    await expect(page.locator('#trialRoundTimeline .round-timeline-item')).toHaveCount(1);
  });

  test('both fields filled creates R2 and stores the revision note on the round', async ({ page }) => {
    await openRevisionModalFromWaiting(page);
    await page.locator('#priorRoundFindingsInput').fill('R1 的 A 類與 B 類邊界判讀分歧大');
    await page.locator('#guidelineChangeSummaryInput').fill('補充 A／B 邊界的正反例各兩則');

    await page.locator('#trialRoundRevisionConfirmBtn').click();

    await expect(page.locator('#trialRoundRevisionModal')).toBeHidden();
    await expect(page.locator('#statusBadge')).toContainText('試標進行中');
    await expect(page.locator('#trialRoundTimeline .round-timeline-item')).toHaveCount(2);
    const rounds = await readTrialRounds(page);
    expect(rounds[1]).toMatchObject({
      round: 2,
      priorRoundFindings: 'R1 的 A 類與 B 類邊界判讀分歧大',
      guidelineChangeSummary: '補充 A／B 邊界的正反例各兩則',
      noChangeReason: null,
    });
  });

  test('no_change with a reason creates R2 without a guideline change summary', async ({ page }) => {
    await openRevisionModalFromWaiting(page);
    await page.locator('#priorRoundFindingsInput').fill('R1 分歧集中在少數難例，指引本身無誤');
    await page.locator('#noChangeCheckbox').check();
    await expect(page.locator('#guidelineChangeSummaryInput')).toBeHidden();
    await expect(page.locator('#noChangeReasonInput')).toBeVisible();
    await page.locator('#noChangeReasonInput').fill('分歧來自標記員熟悉度，改以加開一輪觀察');

    await page.locator('#trialRoundRevisionConfirmBtn').click();

    await expect(page.locator('#trialRoundRevisionModal')).toBeHidden();
    await expect(page.locator('#statusBadge')).toContainText('試標進行中');
    await expect(page.locator('#trialRoundTimeline .round-timeline-item')).toHaveCount(2);
    const rounds = await readTrialRounds(page);
    expect(rounds[1]).toMatchObject({
      round: 2,
      priorRoundFindings: 'R1 分歧集中在少數難例，指引本身無誤',
      guidelineChangeSummary: 'no_change',
      noChangeReason: '分歧來自標記員熟悉度，改以加開一輪觀察',
    });
  });

  test('no_change without a reason is blocked with the reason hint only', async ({ page }) => {
    await openRevisionModalFromWaiting(page);
    await page.locator('#priorRoundFindingsInput').fill('R1 分歧集中在少數難例，指引本身無誤');
    await page.locator('#noChangeCheckbox').check();

    await page.locator('#trialRoundRevisionConfirmBtn').click();

    await expectStillWaitingWithOnlyR1(page);
    await expect(page.locator('#noChangeReasonError')).toHaveText('勾選「本輪未變更指引」時，請填寫未變更理由。');
    await expect(page.locator('#noChangeReasonInput')).toHaveClass(/\berror\b/);
    await expect(page.locator('#priorRoundFindingsError')).toBeHidden();
    await expect(page.locator('#guidelineChangeSummaryError')).toBeHidden();
    await expect(page.locator('#toastMsg')).toContainText('未變更理由');
  });
});
