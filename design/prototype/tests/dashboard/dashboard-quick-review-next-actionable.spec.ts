/**
 * Reviewer quick-review routes to the next ACTIONABLE review unit (issue #449)
 * Source spec: specs/dashboard/012-dashboard/spec.md FR-021
 *              specs/annotation/015-annotation-workspace/spec.md FR-073 / AC-1.23
 *
 * The reviewer CTA used to open each task's FIRST dataset record, taken from
 * the dashboard.assignments.js `latestUnfinishedSampleId` seed. On the demo
 * tasks that first unit is already finalized, so "快速審核" dropped the
 * reviewer on a read-only card and made them hunt for their real backlog.
 *
 * The target is now derived from the shared review-unit enumeration
 * (annotation-workspace.data.js findNextActionableReviewUnit) using the
 * signed-in reviewer's identity, with a fixed priority:
 *   1. pending (nobody has reviewed the unit yet)
 *   2. disputed units THIS reviewer is eligible to arbitrate (FR-060)
 *   3. approved/modified units short of quorum this reviewer has not judged
 *   4. nothing actionable -> the review list plus an explicit empty state
 *
 * The rule reads task state and reviewer identity only -- no T014-T017
 * branch anywhere (Generalization-First).
 */
import { test, expect, type Page } from '@playwright/test';

const DASHBOARD_URL = '/pages/dashboard/dashboard.html';

interface ReviewUnit {
  sampleId: string;
  annotatorId: string;
  status: string | null;
}

interface WorkspaceDataWindow {
  LabelSuiteAnnotationWorkspaceData: {
    findNextActionableReviewUnit: (
      taskId: string,
      runType: string,
      reviewerId: string,
    ) => ReviewUnit | null;
    markSampleSubmitted: (
      taskId: string,
      role: string,
      runType: string,
      sampleId: string,
      payload: unknown,
      historySummary: string,
      identity: { annotatorId?: string; reviewerId?: string },
    ) => void;
    submitArbitration: (
      taskId: string,
      runType: string,
      sampleId: string,
      identity: { annotatorId?: string; reviewerId?: string },
      decisions: { itemId: string; choice: string; value: unknown }[],
    ) => void;
  };
}

async function openReviewerScenario(page: Page) {
  await page.goto(DASHBOARD_URL);
  const trigger = page.locator('.scenario-pill[data-scenario="reviewer"]');
  await expect(trigger).toBeVisible();
  await trigger.click();
}

function quickReviewButton(page: Page, taskId: string) {
  return page.locator(
    `#reviewerTaskList [data-example-task-id="${taskId}"] .role-task-action-btn`,
  );
}

test.describe('Dashboard — quick review opens the next actionable unit', () => {
  /* T014's first record (dry-01-all-agree) is finalized for all three
     annotators; the first unit anybody still has to review is
     dry-02-one-divergent x tony0950127. dry-02 x 113450022 sorts EARLIER in
     the enumeration but is not actionable either way -- it is finalized
     (issue #551: its sole reviewer's correction converges at N=1), so this
     test still pins pending as the top priority, just no longer against a
     disputed sibling. */
  test('routes to the first pending unit, not the first dataset record', async ({ page }) => {
    await openReviewerScenario(page);
    await quickReviewButton(page, 'T014').click();

    await expect(page).toHaveURL(/\/pages\/annotation\/annotation-workspace\.html\?/);
    await expect(page).toHaveURL(/task_id=T014/);
    await expect(page).toHaveURL(/sample_id=dry-02-one-divergent/);
    await expect(page).toHaveURL(/annotator_id=tony0950127/);
    await expect(page).toHaveURL(/reviewer_id=reviewer_chen/);
    await expect(page).toHaveURL(/role=reviewer/);
    await expect(page).toHaveURL(/run_type=dry_run/);
  });

  /* T016 has zero pending units (審核覆蓋率 100%). issue #596 (FR-092): the
     two units that used to sit interim below a min_reviewers = 3 quorum are
     now disputed like ofm-05, because a single owner's modify always enters
     the pool. reviewer_chen is the only can_arbitrate reviewer and took no
     part, so all three are actionable for them and the enumeration order
     (listReviewUnits sorts by sample_id) decides which one opens --
     ofm-03, not ofm-05. */
  test('routes to a disputed unit this reviewer may arbitrate when nothing is pending', async ({ page }) => {
    await openReviewerScenario(page);
    await quickReviewButton(page, 'T016').click();

    await expect(page).toHaveURL(/\/pages\/annotation\/annotation-workspace\.html\?/);
    await expect(page).toHaveURL(/task_id=T016/);
    await expect(page).toHaveURL(/sample_id=ofm-03-modified-interim/);
    await expect(page).toHaveURL(/annotator_id=kioleemg12/);
    await expect(page).toHaveURL(/reviewer_id=reviewer_chen/);
    await expect(page).toHaveURL(/run_type=official_run/);
  });

  /* Eligibility is per reviewer, not per unit. reviewer_wang judged the
     T016 units that are not finalized and cannot arbitrate, so nothing is
     actionable for them -- they must never be handed the dispute they
     themselves produced. reviewer_li is null for a different reason:
     issue #596 (FR-093) leaves every unfinalized T016 unit disputed, and a
     disputed unit is offered only to an eligible arbiter (FR-060). li has
     no can_arbitrate flag, so there is nothing for them either -- the
     interim `approved` unit this used to return no longer exists as a
     status at all (REVIEW_UNIT_STATUS has only pending/disputed/finalized). */
  test('a reviewer who took part is not routed to their own dispute', async ({ page }) => {
    await openReviewerScenario(page);

    const targets = await page.evaluate(() => {
      const data = (window as unknown as WorkspaceDataWindow)
        .LabelSuiteAnnotationWorkspaceData;
      return {
        wang: data.findNextActionableReviewUnit('T016', 'official_run', 'reviewer_wang'),
        li: data.findNextActionableReviewUnit('T016', 'official_run', 'reviewer_li'),
      };
    });

    expect(targets.wang).toBeNull();
    expect(targets.li).toBeNull();
  });

  /* Once every T015 unit is finalized there is nothing to open: the CTA must
     fall back to the review list with a stated empty state instead of
     silently opening a read-only unit. T015's remaining actionable unit was
     one pending (agree -> finalized at min_reviewers = 1); ofs-02 is already
     finalized on its own by the time this test runs (issue #551: its sole
     reviewer's correction converges at N=1), so the submitArbitration()
     call below is redundant but harmless -- kept to also cover an arbiter
     resolving an already-converged item as a no-op. */
  test('falls back to the review list with an empty state when nothing is actionable', async ({ page }) => {
    await openReviewerScenario(page);

    await page.evaluate(() => {
      const data = (window as unknown as WorkspaceDataWindow)
        .LabelSuiteAnnotationWorkspaceData;
      data.markSampleSubmitted(
        'T015', 'reviewer', 'official_run', 'ofs-04-pending-review',
        { previewState: { single_label: { selected: 'positive' } } }, '',
        { annotatorId: 'kioleemg12', reviewerId: 'reviewer_wang' },
      );
      data.submitArbitration(
        'T015', 'official_run', 'ofs-02-modified-dispute',
        { annotatorId: 'kioleemg12', reviewerId: 'reviewer_chen' },
        [{ itemId: 'single_label::single_label', choice: 'B', value: 'positive' }],
      );
    });

    await quickReviewButton(page, 'T015').click();

    await expect(page).toHaveURL(/\/pages\/annotation\/annotation-list\.html\?/);
    await expect(page).toHaveURL(/task_id=T015/);
    await expect(page).toHaveURL(/role=reviewer/);
    await expect(page).toHaveURL(/run_type=official_run/);
    await expect(page).toHaveURL(/reviewer_id=reviewer_chen/);
    await expect(page).not.toHaveURL(/sample_id=/);

    const notice = page.getByTestId('list-no-actionable-notice');
    await expect(notice).toBeVisible();
    await expect(notice).toContainText('目前沒有可處理項目');

    await page.getByTestId('lang-toggle').click();
    await expect(notice).toContainText('No actionable items');
  });
});
