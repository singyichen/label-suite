/*
 * Traceability: openspec/changes/task-detail-trial-round-from-waiting/
 *   tasks.md group 2 (2.1, as rewritten in commit 9fb4450a); design.md
 *   "範圍界線" last bullet (FR-017's revision-note gate is out of scope for
 *   #791 -- moved to issue #838, so no scenario here asserts revision-note
 *   blocking; since #838 the R2 scenario fills the note to get past the
 *   gate, whose blocking paths live in
 *   issue-838-fr017-revision-note-gate.spec.ts); specs/task-management/
 *   014-task-detail/spec.md delta -- FR-013, FR-013(1)-(3), FR-008a,
 *   FR-010o-3, AC-3.12, SC-047. Issue #791.
 *
 * Reaching R2's creation from waiting_iaa_confirmation must pass through
 * canPublish()'s existing isolation risk-confirm modal if it opens, exactly
 * like the other task-management specs that click a publish button (see
 * task-detail-publish-risk-confirm.spec.ts). T001 seeds isolationEnabled:
 * true, so the modal does not open for these tests, but the check is kept
 * for parity with that convention rather than relying on the seed.
 */
import { test, expect, type Page } from '@playwright/test';

const DRY_RUN_PROGRESS_KEY = 'labelsuite.prototypeDryRunProgress';
const TASK_ID = 'T001';
const TASK_DETAIL_URL = '/pages/task-management/task-detail.html';

async function publishDryRunRound(page: Page) {
  await page.locator('#publishDryRunBtn').click();
  const riskModal = page.locator('#riskModal');
  if (await riskModal.isVisible()) {
    await page.locator('#riskConfirmBtn').click();
  }
}

test('publishing R1 from draft always lands in dry_run_in_progress regardless of the round outcome (FR-013(1), FR-010o-3)', async ({ page }) => {
  await page.goto(`${TASK_DETAIL_URL}?task_id=${TASK_ID}`);

  await expect(page.locator('#statusBadge')).toContainText('草稿');
  await publishDryRunRound(page);

  // R1's scripted result is 'failed' (getTrialRoundScenario(1)), so this
  // assertion alone cannot distinguish the old IAA-branching bug from the
  // fix for round 1 specifically -- the smoking gun for the :10096 branch
  // is covered by the R2 scenario below (scripted 'passed'). This assertion
  // still pins down the required regardless-of-outcome invariant for R1.
  await expect(page.locator('#statusBadge')).toContainText('試標進行中');
  await expect(page.locator('#trialRoundTimeline .round-timeline-item')).toHaveCount(1);
});

test('a fully-submitted dry-run progress moves the task into waiting_iaa_confirmation regardless of the round outcome (FR-008a, FR-010o-3)', async ({ page }) => {
  await page.addInitScript(
    ({ key, taskId }) => {
      window.localStorage.setItem(
        key,
        JSON.stringify({ runType: 'dry_run', taskId, submittedSamples: 1, totalSamples: 1 })
      );
    },
    { key: DRY_RUN_PROGRESS_KEY, taskId: TASK_ID }
  );

  // task-detail.html has no cross-reload persistence of TASK_DATA itself
  // (only DRY_RUN_PROGRESS_KEY survives a navigation), so this loads
  // dry_run_in_progress directly rather than clicking through a real R1 --
  // syncStatusFromDryRunProgress() only runs once, synchronously, inside
  // init(). The round it sees is task-detail.html's own not-yet-computable
  // fallback (getTrialRounds()'s synthesis, since T001 has no seeded
  // dry-run submissions), but the transition below is unconditional on the
  // round's outcome either way, which is exactly what FR-010o-3 requires.
  // D2: syncStatusFromDryRunProgress() fills that fallback record with
  // getTrialRoundScenario(1)'s scripted result only once it fires this
  // transition -- getTrialRoundScenario(1) is 'failed', so the round-history
  // badge below reads 未通過.
  await page.goto(`${TASK_DETAIL_URL}?task_id=${TASK_ID}&status=dry_run_in_progress`);

  await expect(page.locator('#statusBadge')).toContainText('待 IAA 確認');
  await expect(page.locator('#trialRoundTimeline .round-status-badge').first()).toHaveText('未通過');
  await expect(page.locator('#publishOfficialRunBtn')).toBeEnabled();
  await expect(page.locator('#publishDryRunBtn')).toBeEnabled();
});

test('creating R2 from waiting_iaa_confirmation lands in dry_run_in_progress, never straight back to waiting_iaa_confirmation (FR-013(2)-(3))', async ({ page }) => {
  await page.goto(`${TASK_DETAIL_URL}?task_id=${TASK_ID}&status=waiting_iaa_confirmation`);
  await expect(page.locator('#statusBadge')).toContainText('待 IAA 確認');

  await publishDryRunRound(page);
  // FR-017 (issue #838): R2 must pass the revision-note dialog first.
  await expect(page.locator('#trialRoundRevisionModal')).toBeVisible();
  await page.locator('#priorRoundFindingsInput').fill('R1 的 A 類與 B 類邊界判讀分歧大');
  await page.locator('#guidelineChangeSummaryInput').fill('補充 A／B 邊界的正反例各兩則');
  await page.locator('#trialRoundRevisionConfirmBtn').click();

  // R2 is created, and R1's round-history entry must still be present:
  // publishDryRun() has to materialize getTrialRounds()'s synthetic R1
  // fallback into TASK_DATA.trialRounds before pushing R2, not push R2 onto
  // an empty array (FR-013(2)).
  await expect(page.locator('#trialRoundTimeline .round-timeline-item')).toHaveCount(2);
  await expect(page.locator('#trialRoundTimeline .round-timeline-item').nth(0)).toContainText('R1');
  await expect(page.locator('#trialRoundTimeline .round-timeline-item').nth(1)).toContainText('R2');

  // FR-013(3) / the smoking-gun assertion: getTrialRoundScenario(2) is
  // hardcoded 'passed', so today's :10096 ternary
  // (`scenario.result === 'passed' ? 'waiting_iaa_confirmation' :
  // 'dry_run_in_progress'`) jumps R2 straight back to
  // waiting_iaa_confirmation with zero submissions against the new round.
  // This must land in dry_run_in_progress instead.
  await expect(page.locator('#statusBadge')).toContainText('試標進行中');
  await expect(page.locator('#publishDryRunBtn')).toBeDisabled();
  // FR-013: the label is R{trial_round + 1}. With R1 and R2 both
  // materialized in TASK_DATA.trialRounds, the next round is R3.
  await expect(page.locator('#publishDryRunBtn')).toHaveText('新增試標回合 R3');
  await expect(page.locator('#publishActionRow')).toContainText('本回合全部提交並完成 IAA 後才能新增下一回合');
  await expect(page.locator('#publishActionRow button')).toHaveCount(1);

  // Reloading before any R2 progress is written must not auto-advance past
  // dry_run_in_progress (a fresh load with no progress key set stays put).
  await page.goto(`${TASK_DETAIL_URL}?task_id=${TASK_ID}&status=dry_run_in_progress`);
  await expect(page.locator('#statusBadge')).toContainText('試標進行中');
});
