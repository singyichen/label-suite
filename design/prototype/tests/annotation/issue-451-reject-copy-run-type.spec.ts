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
 * Issue #515 ③ narrows where that fact is told. `reviewNote` used to carry
 * BOTH run_type consequences in full, only because AC-3.33 forbids a
 * run_type presentation branch on the review card. The pre-submit
 * confirmation area (`ws-review-summary-effect`, FR-077/AC-3.42, v4.32.0)
 * sits OUTSIDE the review card and may legally branch on run_type, and it
 * already states both consequences almost verbatim. `reviewNote` is also
 * rendered once per outKey, so the long paragraph appeared three times on a
 * three-output-type task. The note therefore keeps only the
 * run-type-invariant decision-level semantics and defers the consequence to
 * the confirmation area, which becomes its single authority.
 *
 * What must NOT regress: the note stays ONE string identical across run
 * types (AC-3.33), it never promises the annotator-status rollback
 * unconditionally (AC-3.40), zh and en stay synchronised, and the real
 * submit-time state effect still differs per run_type.
 *
 * Traceability: specs/annotation/015-annotation-workspace/spec.md FR-070,
 * AC-3.40; related FR-014I, FR-077, AC-3.15, AC-3.33, AC-3.42, AC-6.4.
 */

const NOTE_ZH =
  '通過：採用標記員在該輸出類型的作答為審核結果。退回：記錄審核決策與修正差異；是否回退標記員狀態依試標／正式標記而異，實際影響見下方「送出前確認」。';

const NOTE_EN =
  'Approve: accept the annotator’s answer for that output type as the review result. Reject: records the review decision and any correction; whether the annotator status is rolled back differs between a dry run and an official run -- the actual effect is stated under “Confirm before submitting” below.';

/* The exact string issue #451 removed. Pinned verbatim so a future edit that
 * reinstates the false promise fails here rather than silently regressing. */
const FALSE_ROLLBACK_CLAIM = '該標記狀態會回到未標記，標記員需要重新標記';

/* Consequence wording that issue #515 ③ moved out of the review card. These
 * now belong exclusively to `ws-review-summary-effect`; finding any of them
 * back inside `ws-review-note` means the duplication has returned. */
const CONFIRMATION_ONLY_ZH = [
  '產生標記員重標待辦',
  '回到待標記',
  '試標退回不改變標記員狀態',
  'IAA',
];

const CONFIRMATION_ONLY_EN = [
  're-annotation task',
  'returns to pending',
  'leaves the annotator status unchanged',
  'IAA',
];

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

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
});

test.describe('reviewer reject copy matches the real per-run_type effect (issue #451/#515)', () => {
  test('dry_run: the note never claims the annotator status rolls back to pending', async ({ page }) => {
    await openReviewer(page, 'dry_run');

    const note = page.getByTestId('ws-review-note').first();
    await expect(note).toBeVisible();
    await expect(note).toHaveText(NOTE_ZH);
    await expect(note).not.toContainText(FALSE_ROLLBACK_CLAIM);
  });

  test('official_run: the note carries the same decision-level copy, not the official-run consequence', async ({
    page,
  }) => {
    await openReviewer(page, 'official_run');

    const note = page.getByTestId('ws-review-note').first();
    await expect(note).toBeVisible();
    await expect(note).toHaveText(NOTE_ZH);
  });

  test('the note separates the review decision from the annotator-status rollback', async ({ page }) => {
    await openReviewer(page, 'official_run');

    const note = page.getByTestId('ws-review-note').first();
    // The decision level is stated on the card ...
    await expect(note).toContainText('記錄審核決策與修正差異');
    // ... while the rollback is named as run-type dependent, never asserted.
    await expect(note).toContainText('是否回退標記員狀態依試標／正式標記而異');
    // ... and the reader is pointed at the single authority for the effect.
    await expect(note).toContainText('送出前確認');
  });

  test('the note no longer duplicates the confirmation area consequence copy (issue #515 ③)', async ({
    page,
  }) => {
    for (const runType of ['dry_run', 'official_run'] as RunType[]) {
      await openReviewer(page, runType);
      const note = page.getByTestId('ws-review-note').first();
      for (const phrase of CONFIRMATION_ONLY_ZH) {
        await expect(note).not.toContainText(phrase);
      }
      // The consequence still exists -- one level down, where run_type may
      // legally branch (FR-077/AC-3.42).
      const effect = page.getByTestId('ws-review-summary-effect');
      await expect(effect).toHaveAttribute('data-run-type', runType);
      await expect(effect).toContainText('送出後影響');
    }
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
    for (const phrase of CONFIRMATION_ONLY_EN) {
      await expect(note).not.toContainText(phrase);
    }
    await expect(note).toContainText('whether the annotator status is rolled back differs between');
    await expect(note).toContainText('Confirm before submitting');
  });

  test('both decision buttons stay rendered in both run types (AC-3.40 unchanged)', async ({ page }) => {
    for (const runType of ['dry_run', 'official_run'] as RunType[]) {
      await openReviewer(page, runType);
      await expect(page.getByTestId('ws-review-row-approve').first()).toBeVisible();
      await expect(page.getByTestId('ws-review-row-reject').first()).toBeVisible();
    }
  });
});

test.describe('the displayed copy matches the actual submit-time state effect (issue #451)', () => {
  test('dry_run: what the confirmation area promises (no rollback) is what submitting a reject does', async ({
    page,
  }) => {
    const errors = trackPageErrors(page);

    await submitAsAnnotator(page, 'dry_run');
    expect(await readAnnotatorStatus(page, 'dry_run')).toBe('submitted');

    await openReviewer(page, 'dry_run');
    await page.getByTestId('ws-review-row-reject').click();

    const effect = page.getByTestId('ws-review-summary-effect');
    await expect(effect).toHaveAttribute('data-run-type', 'dry_run');
    await expect(effect).toContainText('試標退回不會個別回退標記員狀態');

    await page.getByTestId('ws-review-submit-btn').click();
    await expect(page.locator('#toastMsg')).toHaveText('審核已送出');

    expect(await readAnnotatorStatus(page, 'dry_run')).toBe('submitted');
    assertNoPageErrors(errors);
  });

  test('official_run: what the confirmation area promises (re-annotation todo) is what submitting a reject does', async ({
    page,
  }) => {
    const errors = trackPageErrors(page);

    await submitAsAnnotator(page, 'official_run');
    expect(await readAnnotatorStatus(page, 'official_run')).toBe('submitted');

    await openReviewer(page, 'official_run');
    await page.getByTestId('ws-review-row-reject').click();

    const effect = page.getByTestId('ws-review-summary-effect');
    await expect(effect).toHaveAttribute('data-run-type', 'official_run');
    await expect(effect).toContainText('產生標記員重標待辦');

    await page.getByTestId('ws-review-submit-btn').click();
    await expect(page.locator('#toastMsg')).toHaveText('審核已送出');

    expect(await readAnnotatorStatus(page, 'official_run')).toBe('pending');
    assertNoPageErrors(errors);
  });
});
