/**
 * Reviewer workspace — role-dependent action hint removed (issue #562).
 * Source spec: specs/annotation/015-annotation-workspace/spec.md FR-064
 * point 7.6 (FR-084 / AC-4.47 ~ AC-4.50 retired).
 *
 * The line under the review-unit banner ("需要你的審核", "需要你的仲裁", ...)
 * repeated what the review card, the arbitration layout and the top
 * progress track already said. It is gone for every status and every
 * reviewer identity; the banner is followed directly by the card.
 *
 * Fixtures (annotation-review-flow-demo-seed.spec.ts status matrix). The
 * per-task min_reviewers annotations are historical: issue #596 (FR-093)
 * retired the setting, so a unit is disputed or finalized on its one
 * reviewer's decision, not on a quorum.
 *   T017 oft-01 disputed [wang, li]   T015 ofs-04 pending (no reviewer yet)
 *   T016 ofm-01 finalized             T016 ofm-02 reviewed [wang]
 *   T015 ofs-05 no annotator submission (null)
 *   T014 dry_run dry-05 x kioleemg12 disputed [wang, pure reject]
 */
import { test, expect, type Page } from '@playwright/test';
import { buildWorkspaceUrl, skipGuidelineModal } from './_workspace-helpers';

test.describe.configure({ retries: 2 });

const HINT = 'ws-review-action-hint';

async function openUnit(
  page: Page,
  params: {
    task_id: string;
    sample_id: string;
    run_type?: 'dry_run' | 'official_run';
    reviewer_id?: string;
    annotator_id?: string;
  },
) {
  await page.goto(
    buildWorkspaceUrl({
      role: 'reviewer',
      run_type: params.run_type ?? 'official_run',
      reviewer_id: params.reviewer_id ?? 'reviewer_chen',
      annotator_id: params.annotator_id ?? 'kioleemg12',
      ...params,
    }),
  );
  await expect(page.getByTestId('ws-review-unit-context')).toBeVisible();
}

async function expectNoHint(page: Page) {
  await expect(page.getByTestId(HINT)).toHaveCount(0);
  await expect(page.locator('.rv-action-hint, [data-needs-action]')).toHaveCount(0);
  for (const copy of ['需要你的審核', '需要你的仲裁', 'Your review is needed', 'Your arbitration is needed']) {
    await expect(page.getByText(copy, { exact: true })).toHaveCount(0);
  }
}

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
});

test.describe('issue #562 — no action hint under the review-unit banner', () => {
  /* Re-pointed for issue #596: T017 oft-03-modified-interim used to be the
     "unit needs your review" fixture because a second reviewer could still
     act on a unit another reviewer had already modified. FR-093 gives a unit
     exactly one reviewer, so oft-03 no longer renders a review card for
     anyone but its owner. T015 ofs-04-pending-review is the unit that now
     carries this case: annotator submitted, no reviewer decision yet. */
  test('pending unit, its reviewer has not submitted (was 需要你的審核)', async ({ page }) => {
    await openUnit(page, { task_id: 'T015', sample_id: 'ofs-04-pending-review' });
    await expectNoHint(page);
    await expect(page.getByTestId('ws-review-submit-btn')).toBeVisible();
  });

  test('modified unit, reviewer already submitted (was 你的審核已記錄)', async ({ page }) => {
    await openUnit(page, { task_id: 'T017', sample_id: 'oft-03-modified-interim', reviewer_id: 'reviewer_wang' });
    await expectNoHint(page);
  });

  test('disputed unit, arbiter candidate (was 需要你的仲裁)', async ({ page }) => {
    await openUnit(page, { task_id: 'T017', sample_id: 'oft-01-final-exception' });
    await expectNoHint(page);
    await expect(page.getByTestId('ws-arbitration-card')).toHaveCount(1);
  });

  test('disputed unit, participant without arbitration rights', async ({ page }) => {
    await openUnit(page, { task_id: 'T017', sample_id: 'oft-01-final-exception', reviewer_id: 'reviewer_wang' });
    await expectNoHint(page);
  });

  test('approved unit (T016, min 3)', async ({ page }) => {
    await openUnit(page, { task_id: 'T016', sample_id: 'ofm-02-approved-interim' });
    await expectNoHint(page);
  });

  test('finalized unit', async ({ page }) => {
    await openUnit(page, { task_id: 'T016', sample_id: 'ofm-01-reviewer-corrects-b' });
    await expectNoHint(page);
  });

  test('unit without annotator submission', async ({ page }) => {
    await openUnit(page, { task_id: 'T015', sample_id: 'ofs-05-not-submitted' });
    await expectNoHint(page);
  });

  test('dry_run disputed unit', async ({ page }) => {
    await openUnit(page, { task_id: 'T014', sample_id: 'dry-05-pending-review', run_type: 'dry_run' });
    await expectNoHint(page);
  });

  test('hint stays absent after switching language', async ({ page }) => {
    await openUnit(page, { task_id: 'T017', sample_id: 'oft-03-modified-interim' });
    await page.getByTestId('lang-toggle').click();
    await expectNoHint(page);
  });
});
