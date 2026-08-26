import { test, expect, type Page } from '@playwright/test';
import {
  assertNoPageErrors,
  buildWorkspaceUrl,
  dismissGuidelineModal,
  skipGuidelineModal,
  trackPageErrors,
  type RunType,
} from './_workspace-helpers';

/* Issue #451: the reviewer workspace's `reviewNote` helper text claimed
 * "退回：該標記狀態會回到未標記，標記員需要重新標記" for BOTH run types, but
 * spec 015 AC-3.15 / AC-6.4 / FR-014I scope the annotator-status rollback to
 * `official_run` only -- issue-192-dry-run-reject-guard.spec.ts already pins
 * that a dry_run reject leaves the annotator submission at `submitted`. The
 * copy therefore promised a state transition that never happens in dry_run.
 *
 * The fix must NOT branch the copy on run_type: AC-3.33 forbids any
 * run_type-based presentation branch on the review card (which is also why
 * issue #409 phrased the sidebar shortcut as a single run-type-qualified
 * string). So one unified note has to (a) separate the *review decision*
 * from the *annotator-status rollback*, (b) state the official_run
 * re-annotation todo, and (c) state that dry_run does not move the
 * annotator's status.
 *
 * Traceability: specs/annotation/015-annotation-workspace/spec.md FR-070,
 * AC-6.11; related FR-014I, AC-3.15, AC-3.33, AC-6.4.
 */

const NOTE_ZH =
  '通過：採用此筆標記。退回：記錄審核決策與修正差異，與回退標記員狀態是不同層級的效果——正式標記退回後該樣本回到待標記，產生標記員重標待辦；試標退回不改變標記員狀態，品質問題由 IAA 閘門與下一輪試標處理。';

const NOTE_EN =
  'Approve: accept this annotation. Reject: records the review decision and any correction, which is a different level of effect from rolling back the annotator status -- in an official run a reject returns the sample to pending and creates a re-annotation task for the annotator; in a dry run a reject leaves the annotator status unchanged, and quality issues are handled by the IAA gate and the next dry run.';

/* The exact string this issue removes. Pinned verbatim so a future edit that
 * reinstates the false promise fails here rather than silently regressing. */
const FALSE_ROLLBACK_CLAIM = '該標記狀態會回到未標記，標記員需要重新標記';

async function openReviewer(page: Page, runType: RunType) {
  await page.goto(
    buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001', role: 'reviewer', run_type: runType })
  );
  await dismissGuidelineModal(page);
}

async function submitAsAnnotator(page: Page, runType: RunType) {
  await page.goto(
    buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001', role: 'annotator', run_type: runType })
  );
  await dismissGuidelineModal(page);
  await page.getByTestId('ws-single-label-chip-negative').click();
  await page.getByTestId('ws-submit-btn').click();
}

function readAnnotatorStatus(page: Page, runType: RunType) {
  return page.evaluate(
    (rt) =>
      (window as any).LabelSuiteAnnotationWorkspaceData.getSampleStatus(
        'T001',
        'annotator',
        rt,
        'sent-001',
        {}
      ),
    runType
  );
}

async function rejectAndSubmitReview(page: Page) {
  await page.getByTestId('ws-review-row-reject').click();
  await page.getByTestId('ws-review-submit-btn').click();
  await expect(page.locator('#toastMsg')).toHaveText('審查已提交');
}

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
});

test.describe('reviewer reject copy matches the real per-run_type effect (issue #451)', () => {
  test('dry_run: the note never claims the annotator status rolls back to pending', async ({ page }) => {
    await openReviewer(page, 'dry_run');

    const note = page.getByTestId('ws-review-note').first();
    await expect(note).toBeVisible();
    await expect(note).toHaveText(NOTE_ZH);
    await expect(note).not.toContainText(FALSE_ROLLBACK_CLAIM);
    // The dry_run consequence must be stated positively, not merely omitted.
    await expect(note).toContainText('試標退回不改變標記員狀態');
  });

  test('official_run: the note states the reject creates a re-annotation todo', async ({ page }) => {
    await openReviewer(page, 'official_run');

    const note = page.getByTestId('ws-review-note').first();
    await expect(note).toBeVisible();
    await expect(note).toHaveText(NOTE_ZH);
    await expect(note).toContainText('產生標記員重標待辦');
  });

  test('the note separates the review decision from the annotator-status rollback', async ({ page }) => {
    await openReviewer(page, 'official_run');

    const note = page.getByTestId('ws-review-note').first();
    await expect(note).toContainText('記錄審核決策與修正差異');
    await expect(note).toContainText('與回退標記員狀態是不同層級的效果');
  });

  test('the note is identical across run types (AC-3.33 forbids a run_type presentation branch)', async ({ page }) => {
    await openReviewer(page, 'dry_run');
    const dryText = await page.getByTestId('ws-review-note').first().textContent();

    await openReviewer(page, 'official_run');
    const officialText = await page.getByTestId('ws-review-note').first().textContent();

    expect(dryText).toBe(officialText);
  });

  test('the English note is synchronised with the Traditional Chinese note', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('labelsuite.lang', 'en');
    });
    await openReviewer(page, 'dry_run');

    const note = page.getByTestId('ws-review-note').first();
    await expect(note).toHaveText(NOTE_EN);
    await expect(note).not.toContainText('the sample returns to pending and the annotator must redo it');
    await expect(note).toContainText('in a dry run a reject leaves the annotator status unchanged');
  });
});

test.describe('the displayed copy matches the actual submit-time state effect (issue #451)', () => {
  test('dry_run: what the note promises (no rollback) is what submitting a reject does', async ({ page }) => {
    const errors = trackPageErrors(page);

    await submitAsAnnotator(page, 'dry_run');
    expect(await readAnnotatorStatus(page, 'dry_run')).toBe('submitted');

    await openReviewer(page, 'dry_run');
    await expect(page.getByTestId('ws-review-note').first()).toContainText('試標退回不改變標記員狀態');
    await rejectAndSubmitReview(page);

    expect(await readAnnotatorStatus(page, 'dry_run')).toBe('submitted');
    assertNoPageErrors(errors);
  });

  test('official_run: what the note promises (re-annotation todo) is what submitting a reject does', async ({ page }) => {
    const errors = trackPageErrors(page);

    await submitAsAnnotator(page, 'official_run');
    expect(await readAnnotatorStatus(page, 'official_run')).toBe('submitted');

    await openReviewer(page, 'official_run');
    await expect(page.getByTestId('ws-review-note').first()).toContainText('產生標記員重標待辦');
    await rejectAndSubmitReview(page);

    expect(await readAnnotatorStatus(page, 'official_run')).toBe('pending');
    assertNoPageErrors(errors);
  });
});
