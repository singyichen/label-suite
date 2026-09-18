/*
 * Traceability: openspec/changes/task-detail-trial-round-from-waiting/
 *   tasks.md group 2 (2.1); specs/task-management/014-task-detail/spec.md
 *   delta -- FR-013, FR-013(1)-(4), FR-017, FR-008a, FR-010o-3, AC-3.12,
 *   SC-047. Issue #791.
 *
 * Scenarios 3 and 4 exercise AC-3.12's revision-note gate (FR-017). Nothing
 * under pages/ implements this gate today (confirmed by an exhaustive grep
 * across pages/, tests/, and `git log --all -S` for prior_round_findings,
 * guideline_change_summary, no_change_reason, and every plausible i18n/JS
 * name -- all zero hits), and design.md's D1-D5 do not name any UI for it
 * either. Per CLAUDE.md ("A static prototype shell may precede Red, but
 * target selectors and behavior may not"), this Red test establishes the
 * selectors below (#trialRoundRevisionModal and its fields) as the contract
 * task 2.3 must implement against; they are not sourced from an existing
 * design artifact and should be confirmed with the design owner before
 * Green, since task 2.3/2.4's own descriptions never mention building this
 * modal.
 */
import { test, expect } from '@playwright/test';

const DRY_RUN_PROGRESS_KEY = 'labelsuite.prototypeDryRunProgress';
const TASK_ID = 'T001';
const TASK_DETAIL_URL = '/pages/task-management/task-detail.html';

test('publishing R1 from draft always lands in dry_run_in_progress regardless of the round outcome (FR-013(1), FR-010o-3)', async ({ page }) => {
  await page.goto(`${TASK_DETAIL_URL}?task_id=${TASK_ID}`);

  await expect(page.locator('#statusBadge')).toContainText('草稿');
  await page.locator('#publishDryRunBtn').click();

  // R1's scripted result is 'failed' (getTrialRoundScenario(1)), so this
  // assertion alone cannot distinguish the old IAA-branching bug from the
  // fix for round 1 specifically -- the smoking gun for the :10096 branch
  // is covered by the R2 scenario below (scripted 'passed'). This assertion
  // still pins down the required regardless-of-outcome invariant for R1.
  await expect(page.locator('#statusBadge')).toContainText('試標進行中');
  await expect(page.locator('#trialRoundTimeline .round-timeline-item')).toHaveCount(1);
});

test('a fully-submitted dry-run progress moves the task into waiting_iaa_confirmation (FR-008a)', async ({ page }) => {
  await page.addInitScript(
    ({ key, taskId }) => {
      window.localStorage.setItem(
        key,
        JSON.stringify({ runType: 'dry_run', taskId, submittedSamples: 1, totalSamples: 1 })
      );
    },
    { key: DRY_RUN_PROGRESS_KEY, taskId: TASK_ID }
  );

  await page.goto(`${TASK_DETAIL_URL}?task_id=${TASK_ID}&status=dry_run_in_progress`);

  await expect(page.locator('#statusBadge')).toContainText('待 IAA 確認');
  await expect(page.locator('#publishOfficialRunBtn')).toBeEnabled();
  await expect(page.locator('#publishDryRunBtn')).toBeEnabled();
});

test('blocks creating R2 from waiting_iaa_confirmation until the revision note is complete (AC-3.12, FR-017)', async ({ page }) => {
  await page.goto(`${TASK_DETAIL_URL}?task_id=${TASK_ID}&status=waiting_iaa_confirmation`);

  await expect(page.locator('#statusBadge')).toContainText('待 IAA 確認');
  const roundCountBefore = await page.locator('#trialRoundTimeline .round-timeline-item').count();

  await page.locator('#publishDryRunBtn').click();

  const modal = page.locator('#trialRoundRevisionModal');
  await expect(modal).toBeVisible();

  await page.locator('#trialRoundRevisionConfirmBtn').click();

  // Blocked: modal stays open, no round created, status unchanged.
  await expect(modal).toBeVisible();
  await expect(page.locator('#statusBadge')).toContainText('待 IAA 確認');
  await expect(page.locator('#trialRoundTimeline .round-timeline-item')).toHaveCount(roundCountBefore);

  // "逐欄提示缺項" -- field-by-field indication of the two missing fields.
  await expect(page.locator('#trialRoundFindingsInput')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#trialRoundGuidelineChangeInput')).toHaveAttribute('aria-invalid', 'true');
});

test('creates R2 once the revision note is complete, stays dry_run_in_progress until R2 is submitted (AC-3.12, SC-047)', async ({ page }) => {
  await page.goto(`${TASK_DETAIL_URL}?task_id=${TASK_ID}&status=waiting_iaa_confirmation`);

  await page.locator('#publishDryRunBtn').click();
  await expect(page.locator('#trialRoundRevisionModal')).toBeVisible();
  await page.locator('#trialRoundFindingsInput').fill('R1 顯示情緒界線案例分歧較大。');
  await page.locator('#trialRoundGuidelineChangeInput').fill('已於指引補充情緒界線案例的判定原則。');
  await page.locator('#trialRoundRevisionConfirmBtn').click();

  await expect(page.locator('#trialRoundRevisionModal')).toBeHidden();

  // FR-013(3): creating R2 from waiting_iaa_confirmation must land in
  // dry_run_in_progress -- never jump straight back to waiting_iaa_confirmation.
  // This is the exact :10096 IAA-branch bug this change removes: R2's
  // scripted result is 'passed' (getTrialRoundScenario(2)), so the pre-fix
  // ternary would jump straight to waiting_iaa_confirmation with zero
  // submissions against the new round.
  await expect(page.locator('#statusBadge')).toContainText('試標進行中');
  await expect(page.locator('#publishDryRunBtn')).toBeDisabled();
  await expect(page.locator('#publishDryRunBtn')).toHaveText('新增試標回合 R3');
  await expect(page.locator('#publishActionRow')).toContainText('本回合全部提交並完成 IAA 後才能新增下一回合');
  await expect(page.locator('#publishActionRow button')).toHaveCount(1);

  // "新回合建立後在任何提交前不會自動轉回待確認": a fresh load of
  // dry_run_in_progress with no submitted progress must not auto-advance.
  await page.goto(`${TASK_DETAIL_URL}?task_id=${TASK_ID}&status=dry_run_in_progress`);
  await expect(page.locator('#statusBadge')).toContainText('試標進行中');
});
