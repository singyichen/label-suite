import { test, expect, type Page } from '@playwright/test';
import { buildWorkspaceUrl, skipGuidelineModal } from './_workspace-helpers';

/* Dead 備註 field removal (issue #457, spec 015 v4.30.0 FR-075 / AC-3.41).
 *
 * The workspace shipped a static `field-group` (`ws-note-label` +
 * `ws-note-input`) that no code path ever read: the ONLY reference outside
 * the markup was applyStaticI18nText() setting its label text and
 * placeholder. Nothing serialised it into a draft, a submission, a review
 * decision or the arbitration store -- in ANY role, run_type or unit state.
 *
 * Issue #457 asked to choose between (A) "finalized note is part of the
 * audit record" and (B) "post-finalize private note". Both models require
 * inventing persistence for a control that never had any, so the maintainer
 * ruled a third way: remove the dead UI (Simplicity First / YAGNI). The
 * finalized card's read-only promise then holds without qualification --
 * there is no editable control left to contradict it.
 *
 * The guard is state- and role-exhaustive on purpose: an accidental
 * re-introduction would most plausibly land in one render branch only.
 *
 * issue #596 fixup: the "reviewer, pending unit" case used to anchor on
 * T017 oft-02-approved-interim, which was short of min_reviewers and thus
 * still awaiting the reviewer's decision. The single-owner relay model
 * retired min_reviewers -- a lone reviewer's unchanged decision now
 * finalizes the unit immediately, so that sample id is finalized before
 * this test ever loads it and its submit button is gone. Swapped to T017
 * oft-05-pending-review, a unit whose annotator has submitted but whose
 * (sole) reviewer has not -- genuinely pre-finalize under the new model.
 */

async function expectNoNoteField(page: Page) {
  await expect(page.getByTestId('ws-note-label')).toHaveCount(0);
  await expect(page.getByTestId('ws-note-input')).toHaveCount(0);
  // The id lookups applyStaticI18nText() used must find nothing either, so a
  // stray `#wsNoteInput` re-added without the testid still fails this guard.
  await expect(page.locator('#wsNoteLabel')).toHaveCount(0);
  await expect(page.locator('#wsNoteInput')).toHaveCount(0);
}

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
});

test.describe('issue #457 -- the workspace ships no unpersisted free-text note field', () => {
  test('annotator, pending sample: no note field', async ({ page }) => {
    await page.goto(
      buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001', role: 'annotator', run_type: 'dry_run' })
    );

    // Anchor on a control that IS rendered, so a page that failed to load
    // cannot pass the absence assertions vacuously.
    await expect(page.getByTestId('ws-save-btn')).toBeVisible();
    await expectNoNoteField(page);
  });

  test('annotator, finalized unit: no note field', async ({ page }) => {
    await page.goto(
      buildWorkspaceUrl({
        task_id: 'T015', sample_id: 'ofs-01-agree-gold',
        role: 'annotator', run_type: 'official_run',
      })
    );

    await expect(page.getByTestId('ws-content-scroll')).toBeVisible();
    await expectNoNoteField(page);
  });

  test('reviewer, pending unit: no note field', async ({ page }) => {
    await page.goto(
      buildWorkspaceUrl({
        task_id: 'T017', sample_id: 'oft-05-pending-review',
        role: 'reviewer', run_type: 'official_run', reviewer_id: 'reviewer_chen',
      })
    );

    // Still an interactive unit -- the submit path proves we are pre-finalize.
    await expect(page.getByTestId('ws-review-submit-btn')).toBeVisible();
    await expectNoNoteField(page);
  });

  test('reviewer, finalized unit: read-only card and no note field', async ({ page }) => {
    await page.goto(
      buildWorkspaceUrl({
        task_id: 'T015', sample_id: 'ofs-01-agree-gold',
        role: 'reviewer', run_type: 'official_run', reviewer_id: 'reviewer_chen',
      })
    );

    // AC-3.41: the finalized card may not claim read-only while an editable
    // control of undefined semantics sits below it.
    await expect(page.getByTestId('ws-review-finalized-card')).toBeVisible();
    await expectNoNoteField(page);
  });
});
