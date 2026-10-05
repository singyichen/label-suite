/*
 * Traceability: openspec/changes/1120-task-lifecycle-alignment/specs/task-management/014-task-detail/spec.md
 *   DRY_RUN_COMPLETION_RULE (BREAKING) + its four scenarios, FR-008a (BREAKING) + its scenario,
 *   FR-013 (1) + 停用原因涵蓋審核與仲裁, FR-018 (5); design.md D1 (five conditions, current round
 *   only), D4 (legal exclusions), D1 last paragraph (dry_run closure offers no custom_answer).
 *   Issue #1120 G4a (tasks.md 4.1). FR-023 (leader arbitration) is G4b and NOT asserted here.
 *
 * Contract (structure pinned, WORDING is not):
 *   - A dry_run task auto-advances to waiting_iaa_confirmation only when ALL hold for the current
 *     round: no unassigned dry-run work, every active annotator submitted, every dry_run review
 *     unit derived `finalized` (015 FR-051), no unit left `disputed`, no pending dry_run
 *     final-exception-pool item. Otherwise it stays dry_run_in_progress.
 *   - Each unmet condition is ONE visible `li` inside #publishActionRow; the disabled
 *     新增試標回合 button (#publishDryRunBtn) points at that list with aria-describedby, so screen
 *     readers get the same text (same pattern as the official gate, task-detail-completion-gate).
 *   - Reasons carry a count with a unit, and are never phrased as an IAA problem (FR-010o-3/4).
 *
 * Fixture facts (verified on the real page, dry_run scope; T014 round 1, 5 samples x 3 annotators):
 *   T014 seed = 15 review units: finalized 7 / disputed 3 / pending 5; awaiting arbitration 3
 *   items; dry_run pending exceptions 0; all 5 samples already submitted. design.md D5 says the
 *   pending count cannot be fixed by static reading -- the live page gives 5 (dashboard.assignments.js
 *   :268's comment `6 of 15` is a per-reviewer view and is stale for this purpose).
 *   The seed never writes the dry-run progress flag (only the workspace page does), so each case
 *   writes it itself AFTER shaping review state, which makes the init-time gate the thing tested.
 *   Every state is produced through the workspace module's public write paths
 *   (see _dry-run-completion-helpers.ts); no production seed change is required.
 *
 * Not covered (reported to the lead): the FR-005h half of delta (2). Excluded / unassigned
 * assignments are in-page state of task-detail.html (EXCLUDED_ANNOTATION_ASSIGNMENTS, reset on
 * every load, never persisted) and the gate only runs at init, so no public write path can put
 * that state in front of the gate. Green must expose a persisted source before that can be tested.
 */
import { test, expect } from '@playwright/test';
import {
  TASK_DETAIL_URL,
  WAITING_BADGE,
  IN_PROGRESS_BADGE,
  openWithState,
  applyDryRunState,
  reasonTexts,
  digit,
  pick,
  REVIEW,
  DISPUTED,
  POOL,
  expectStillInProgress,
  expectNoIaaPhrasing,
  persistedStatus,
  writeFullySubmittedFlag,
} from './_dry-run-completion-helpers';

const TASK = 'T014';
const SAMPLES = 5;

test.describe('Review-aware dry-run completion gate (DRY_RUN_COMPLETION_RULE, FR-008a, FR-013(1), FR-018(5))', () => {
  test('T014 fixture facts: dry_run in progress, 15 review units = 7 finalized / 3 disputed / 5 pending, 3 awaiting arbitration, no pending exception', async ({
    page,
  }) => {
    await page.goto(`${TASK_DETAIL_URL}?task_id=${TASK}`);
    await expect(page.locator('#statusBadge')).toContainText(IN_PROGRESS_BADGE);
    const facts = await applyDryRunState(page, TASK, {});
    expect(facts.byStatus).toEqual({ finalized: 7, disputed: 3, pending: 5 });
    expect(facts.awaitingArbitration).toBe(3);
    expect(facts.pendingExceptions).toBe(0);
  });

  test('all annotators submitted but dry_run review units are pending: stays dry_run_in_progress and lists the remaining review count with its unit (DRY_RUN_COMPLETION_RULE scenario 1)', async ({
    page,
  }) => {
    const facts = await openWithState(page, TASK, SAMPLES, { arbitrate: 'all' });
    expect(facts.byStatus).toEqual({ finalized: 10, pending: 5 }); // precondition: only review is outstanding

    await expectStillInProgress(page, TASK);
    const texts = await reasonTexts(page);
    const review = pick(texts, REVIEW.accept, REVIEW.reject);
    expect(review).toHaveLength(1);
    expect(review[0]).toMatch(digit(5));
    expect(review[0]).toMatch(/單位/);
    expect(pick(texts, DISPUTED.accept, DISPUTED.reject)).toHaveLength(0);
    expect(pick(texts, POOL.accept)).toHaveLength(0);
    await expect(page.locator('#publishActionRow li', { hasText: review[0] }).first()).toBeVisible();
    await expectNoIaaPhrasing(page);
  });

  test('review is done but dry_run units are still disputed: stays dry_run_in_progress and lists the disputed count (DRY_RUN_COMPLETION_RULE scenario 2)', async ({
    page,
  }) => {
    const facts = await openWithState(page, TASK, SAMPLES, { review: true });
    expect(facts.byStatus.pending).toBeUndefined(); // precondition: every review is submitted
    expect(facts.byStatus.disputed).toBe(3);

    await expectStillInProgress(page, TASK);
    const texts = await reasonTexts(page);
    const disputed = pick(texts, DISPUTED.accept, DISPUTED.reject);
    expect(disputed).toHaveLength(1);
    expect(disputed[0]).toMatch(digit(3));
    expect(disputed[0]).toMatch(/單位|項/);
    // Review itself is complete, so the review reason must be gone (the two are told apart).
    expect(pick(texts, REVIEW.accept, REVIEW.reject)).toHaveLength(0);
    expect(pick(texts, POOL.accept)).toHaveLength(0);
    await expectNoIaaPhrasing(page);
  });

  test('a pending dry_run exception-pool item keeps the task in progress and is listed with its count (DRY_RUN_COMPLETION_RULE scenario 3, FR-018(5))', async ({
    page,
  }) => {
    const facts = await openWithState(page, TASK, SAMPLES, { review: true, arbitrate: 'all-but-one-rejected' });
    expect(facts.pendingExceptions).toBe(1); // precondition: exactly one 兩者皆非 item awaits closure
    expect(facts.awaitingArbitration).toBe(0);

    await expectStillInProgress(page, TASK);
    const pool = pick(await reasonTexts(page), POOL.accept);
    expect(pool).toHaveLength(1);
    expect(pool[0]).toMatch(digit(1));
    expect(pool[0]).toMatch(/項/);
    await expectNoIaaPhrasing(page);
  });

  test('advances to waiting_iaa_confirmation only once review, arbitration and the exception pool are all complete, and is not blocked by IAA (FR-008a, FR-010o-3, FR-010o-4)', async ({
    page,
  }) => {
    // Seed state: submissions complete, review/arbitration outstanding -> must hold.
    await openWithState(page, TASK, SAMPLES, {});
    await expectStillInProgress(page, TASK);
    const before = await reasonTexts(page);
    expect(before.length).toBeGreaterThanOrEqual(2);
    await expectNoIaaPhrasing(page);

    // Close every remaining blocker through the public write paths, then re-evaluate on load.
    const facts = await applyDryRunState(page, TASK, { review: true, arbitrate: 'all' });
    expect(facts.byStatus).toEqual({ finalized: 15 });
    expect(facts.pendingExceptions).toBe(0);
    await page.reload();

    // The round's scripted IAA outcome is below target (791: R1 is 'failed'); the transition must
    // still happen -- IAA is advisory, and the three new conditions are not IAA conditions.
    await expect(page.locator('#statusBadge')).toContainText(WAITING_BADGE);
    expect(await persistedStatus(page, TASK)).toBe('waiting_iaa_confirmation');
    await expect(page.locator('#publishActionRow li')).toHaveCount(0);
  });

  test('unmet reasons are visible text and reach screen readers through aria-describedby on the disabled next-round button (FR-008a scenario, AC-3.16 accessibility)', async ({
    page,
  }) => {
    await openWithState(page, TASK, SAMPLES, {});

    await expect(page.locator('#publishDryRunBtn')).toBeDisabled();
    await expect(page.locator('#publishDryRunBtn')).toHaveAttribute('aria-describedby', /\S+/);
    const texts = await reasonTexts(page);
    expect(texts.length).toBeGreaterThanOrEqual(2); // review (5) and disputed (3) both outstanding
    for (const reason of texts) {
      await expect(page.locator('#publishActionRow li', { hasText: reason }).first()).toBeVisible();
      const escaped = reason.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
      await expect(page.locator('#publishDryRunBtn')).toHaveAccessibleDescription(new RegExp(escaped));
    }
    // Both categories are separate, countable items (units never summed into one number).
    const review = pick(texts, REVIEW.accept, REVIEW.reject);
    const disputed = pick(texts, DISPUTED.accept, DISPUTED.reject);
    expect(review).toHaveLength(1);
    expect(disputed).toHaveLength(1);
    expect(review[0]).toMatch(digit(5));
    expect(disputed[0]).toMatch(digit(3));
  });

  test('新增試標回合 stays disabled and its visible reason names required review and required arbitration; clicking it creates no round (FR-013(1))', async ({
    page,
  }) => {
    await openWithState(page, TASK, SAMPLES, {});

    await expect(page.locator('#publishDryRunBtn')).toBeDisabled();
    await expect(page.locator('#publishDryRunBtn')).toHaveText('新增試標回合 R2');
    const rowText = await page.locator('#publishActionRow').innerText();
    expect(rowText).toMatch(/審核/);
    expect(rowText).toMatch(/仲裁/);
    // Only the disabled next-round control is offered, as in every dry_run_in_progress state.
    await expect(page.locator('#publishActionRow button')).toHaveCount(1);

    // The page's skeleton hides and renders the overview (which rebuilds this button) in one task,
    // ~560 ms after load. Wait for that to have happened so the forced click hits the final node.
    await expect(page.locator('#loadingSkeleton')).toBeHidden();
    await expect(page.locator('#publishDryRunBtn')).toBeDisabled();

    const roundsBefore = await page.locator('#trialRoundTimeline .round-timeline-item').count();
    await page.evaluate(() => document.getElementById('publishDryRunBtn')!.removeAttribute('disabled'));
    await page.locator('#publishDryRunBtn').click();
    // With R1 present the next step of an unblocked click is the FR-017 revision-note dialog, so
    // "no dialog" proves the handler itself re-validated (verified with a temporary probe that
    // stripped the re-validation from the served HTML: the dialog opened and this failed).
    await expect(page.locator('#trialRoundRevisionModal')).toBeHidden();
    await expect(page.locator('#trialRoundTimeline .round-timeline-item')).toHaveCount(roundsBefore);
    await expect(page.locator('#statusBadge')).toContainText(IN_PROGRESS_BADGE);
  });

  test('an incomplete round submission is listed as its own IAA-free reason naming the unfinished annotation submission (FR-008a, FR-013(1), FR-010o-3)', async ({
    page,
  }) => {
    // Only submission is outstanding: review and arbitration are closed, the round's progress flag
    // says 4 of 5 samples submitted. Wording pinned: 未全部提交 (zh) / "not all ... submitted" (en).
    await page.goto(`${TASK_DETAIL_URL}?task_id=${TASK}`);
    await expect(page.locator('#statusBadge')).toBeAttached();
    const facts = await applyDryRunState(page, TASK, { review: true, arbitrate: 'all' });
    expect(facts.byStatus).toEqual({ finalized: 15 }); // precondition: review and arbitration are complete
    await writeFullySubmittedFlag(page, TASK, SAMPLES, 1, SAMPLES - 1);
    await page.reload();
    await expect(page.locator('#statusBadge')).toBeAttached();

    await expectStillInProgress(page, TASK);
    const reasons = page.locator('#publishDryRunReasons li');
    await expect(reasons).toHaveCount(1);
    await expect(reasons.first()).toBeVisible();
    await expect(reasons.first()).toContainText('未全部提交');
    await expect(page.locator('#publishDryRunBtn')).toHaveAttribute('aria-describedby', /publishDryRunReasons/);
    expect(await reasonTexts(page)).toHaveLength(1);
    await expectNoIaaPhrasing(page);
    // The delta's FR-013(1) wording is shown next to the disabled button as well, and the retired
    // IAA phrasing is gone from the whole action row.
    await expect(page.locator('#publishActionRow')).toContainText('本回合的標註、必要審核與必要仲裁全部完成後才能新增下一回合');
    await expect(page.locator('#publishActionRow')).not.toContainText(/IAA/i);
  });

  test('dry_run exception items gate the trial but not the official completion gate (FR-018(5))', async ({ page }) => {
    await openWithState(page, TASK, SAMPLES, { review: true, arbitrate: 'all-but-one-rejected' });

    // Trial gate: the pending dry_run item is a reason (Red until Green wires the pool in).
    await expectStillInProgress(page, TASK);
    expect(pick(await reasonTexts(page), POOL.accept)).toHaveLength(1);

    // Official gate on the same stored state: the dry_run item is NOT an official blocker.
    await page.goto(`${TASK_DETAIL_URL}?task_id=${TASK}&status=official_run_in_progress`);
    await expect(page.locator('#publishCompleteBtn')).toBeVisible();
    await expect(page.locator('#publishCompleteBtn')).toBeDisabled(); // other conditions are unmet, so reasons exist
    expect((await reasonTexts(page)).length).toBeGreaterThanOrEqual(1);
    expect(pick(await reasonTexts(page), POOL.accept)).toHaveLength(0);
  });

  test('guard (015 FR-095(3), AC-4.57; may already pass): the dry_run exception-pool closure UI offers adopt_annotator / adopt_reviewer / exclude_from_dataset and no custom_answer', async ({
    page,
  }) => {
    const sampleId = 'dry-03-dispute-open';
    const annotatorId = '113450022';
    await page.goto(
      `/pages/annotation/annotation-workspace.html?task_id=${TASK}&sample_id=${sampleId}&role=project_leader&run_type=dry_run&annotator_id=${annotatorId}`,
    );
    // Put one dry_run item into the pool through the arbitration screen's public write path.
    const pending = await page.evaluate(
      ({ task, sample, annotator }) => {
        const ws = (window as any).LabelSuiteAnnotationWorkspaceData;
        ws.submitArbitration(task, 'dry_run', sample, { annotatorId: annotator, reviewerId: 'reviewer_chen' }, [
          { itemId: 'single_label::single_label', choice: 'reject', reason: 'QA fixture: neither value is supported' },
        ]);
        return ws.listReviewPoolItems(task, 'dry_run').pendingExceptions.length;
      },
      { task: TASK, sample: sampleId, annotator: annotatorId },
    );
    expect(pending).toBe(1);
    await page.reload();

    const item = page.getByTestId('ws-exception-pool-item').first();
    await expect(item).toBeVisible();
    await expect(item.locator('[data-testid^="ws-exception-pool-action-"]')).toHaveCount(3);
    for (const action of ['adopt_annotator', 'adopt_reviewer', 'exclude_from_dataset']) {
      await expect(item.getByTestId(`ws-exception-pool-action-${action}`)).toHaveCount(1);
    }
    await expect(item.getByTestId('ws-exception-pool-action-custom_answer')).toHaveCount(0);
  });

  test('a dry_run item closed with exclude_from_dataset counts as resolved: the task stays in progress while it is pending, then advances once excluded (DRY_RUN_COMPLETION_RULE (2), FR-008b(2) parity)', async ({
    page,
  }) => {
    /* CONTRACT AMBIGUITY (same as the official gate, reported to lead): 015's getReviewUnitStatus()
     * keeps a unit with an exclude_from_dataset marker as `disputed`, while delta (2) says an item
     * closed by exclusion is resolved. This case pins the delta: a pool-closed exclusion must NOT
     * keep blocking. Green must not read condition (4) off the raw `disputed` status for such units. */
    const pendingFacts = await openWithState(page, TASK, SAMPLES, { review: true, arbitrate: 'all-but-one-rejected' });
    expect(pendingFacts.pendingExceptions).toBe(1);
    await expectStillInProgress(page, TASK); // while the item is open the pool reason blocks

    const facts = await applyDryRunState(page, TASK, { arbitrate: 'all-but-one-excluded' });
    expect(facts.pendingExceptions).toBe(0); // precondition: nothing left pending
    expect(facts.byStatus.disputed).toBe(1); // fact: 015 still derives the excluded unit as disputed
    await page.reload();

    await expect(page.locator('#statusBadge')).toContainText(WAITING_BADGE);
    expect(await persistedStatus(page, TASK)).toBe('waiting_iaa_confirmation');
  });
});
