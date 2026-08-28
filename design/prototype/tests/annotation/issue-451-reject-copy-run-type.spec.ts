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
 * Issue #550 (spec 015 v4.55.0) replaced the run-type-invariant note (and
 * the separate pre-submit confirmation area that used to carry the real
 * per-run_type consequence) with a single tooltip that branches on
 * `run_type` directly -- see issue-550-review-note-tooltip.spec.ts for its
 * content-pinning and mutual-exclusivity contract. What THIS spec still
 * owns: the historical false-rollback-claim string must never resurface
 * (regression guard), and the displayed copy must match the REAL
 * submit-time state effect end to end.
 *
 * Traceability: specs/annotation/015-annotation-workspace/spec.md FR-070,
 * AC-3.40; related FR-014I, AC-3.15, AC-6.4.
 */

/* The exact string issue #451 removed. Pinned verbatim so a future edit that
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

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
});

test.describe('the false unconditional rollback claim never resurfaces (issue #451 regression guard)', () => {
  test('dry_run: the tooltip never claims the annotator status rolls back to pending', async ({ page }) => {
    await openReviewer(page, 'dry_run');
    await expect(page.getByTestId('ws-review-note-bubble')).not.toContainText(FALSE_ROLLBACK_CLAIM);
  });

  test('official_run: the tooltip states the rollback only as an official_run consequence, not unconditionally', async ({
    page,
  }) => {
    await openReviewer(page, 'official_run');
    await expect(page.getByTestId('ws-review-note-bubble')).not.toContainText(FALSE_ROLLBACK_CLAIM);
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
  test('dry_run: what the tooltip promises (no rollback) is what submitting a reject does', async ({
    page,
  }) => {
    const errors = trackPageErrors(page);

    await submitAsAnnotator(page, 'dry_run');
    expect(await readAnnotatorStatus(page, 'dry_run')).toBe('submitted');

    await openReviewer(page, 'dry_run');
    await expect(page.getByTestId('ws-review-note-bubble')).toContainText('不回退標記員狀態');
    await page.getByTestId('ws-review-row-reject').click();
    await page.getByTestId('ws-review-submit-btn').click();
    await expect(page.locator('#toastMsg')).toHaveText('審核已送出');

    expect(await readAnnotatorStatus(page, 'dry_run')).toBe('submitted');
    assertNoPageErrors(errors);
  });

  test('official_run: what the tooltip promises (re-annotation todo) is what submitting a reject does', async ({
    page,
  }) => {
    const errors = trackPageErrors(page);

    await submitAsAnnotator(page, 'official_run');
    expect(await readAnnotatorStatus(page, 'official_run')).toBe('submitted');

    await openReviewer(page, 'official_run');
    await expect(page.getByTestId('ws-review-note-bubble')).toContainText('重標待辦');
    await page.getByTestId('ws-review-row-reject').click();
    await page.getByTestId('ws-review-submit-btn').click();
    await expect(page.locator('#toastMsg')).toHaveText('審核已送出');

    expect(await readAnnotatorStatus(page, 'official_run')).toBe('pending');
    assertNoPageErrors(errors);
  });
});
