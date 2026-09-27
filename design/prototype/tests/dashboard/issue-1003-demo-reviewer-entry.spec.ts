/**
 * issue #1003 -- dashboard.assignments.js hardcodes 'reviewer_chen' as the
 * Reviewer entry identity for all three review-flow demo tasks (T014
 * dashboard.assignments.js:294, T015 :307-309, T016 :322-324). reviewer_chen
 * is T014's and T015's ONLY arbiterIds roster member
 * (task-detail.data.js:1040,1099), and FR-060's reviewAssignmentRoster()
 * (annotation-workspace.data.js:2533) reserves every arbiter from new review
 * assignment -- so chen's own getAssignedReviewUnits() count on T014/T015 is
 * permanently 0. Since issue #956's filterUnitsToAssigned()
 * (annotation-workspace.config.js:1664) narrows a reviewer's left column to
 * assigned ∪ arbitrable-disputed units, entering T014/T015 as chen hides
 * every pending and finalized unit behind the one dispute chen may
 * arbitrate, and the demo can never walk 待審 -> 審核 -> 定稿 on those two
 * tasks.
 *
 * The ruled fix (this spec is the Red contract for, not a redesign): T014's
 * entry identity becomes 'reviewer_li', T015's becomes 'reviewer_wang'. T016
 * is unchanged -- it stays reviewer_chen's own arbitration/final-exception
 * demo and is out of scope here.
 *
 * Numbers below were measured directly against the CURRENT (unpatched) data
 * layer via page.evaluate(listReviewUnits + getAssignedReviewUnits +
 * findNextActionableReviewUnit), not assumed from the task brief:
 *   T014 dry_run reviewer_li -- 6 assigned units: 3 pending
 *     (dry-02-one-divergent×tony0950127, dry-05-pending-review×113450022,
 *     dry-05-pending-review×tony0950127), 2 disputed
 *     (dry-02-one-divergent×113450022, dry-05-pending-review×kioleemg12), 1
 *     finalized (dry-02-one-divergent×kioleemg12).
 *     findNextActionableReviewUnit -> dry-02-one-divergent×tony0950127
 *     (pending) -- matches the workspace's own quick-review priority rule
 *     (dashboard-quick-review-next-actionable.spec.ts).
 *   T015 official_run reviewer_wang -- 2 assigned units: 1 pending
 *     (ofs-04-pending-review×kioleemg12), 1 finalized
 *     (ofs-01-agree-gold×kioleemg12).
 *     findNextActionableReviewUnit -> ofs-04-pending-review×kioleemg12
 *     (pending).
 *   reviewer_chen's own getAssignedReviewUnits() is [] on both T014 and T015
 *     (FR-060 reservation) -- true today, unaffected by this fix.
 *   An identity with no T014 assignment at all (reviewer_test_unassigned)
 *     sees 0 T014 units in the workspace left column today (issue #956's
 *     filterUnitsToAssigned()) -- also unaffected by this fix.
 *
 * Expected outcome against the CURRENT (unpatched) dashboard.assignments.js:
 *   The two "demo walkability" tests below MUST FAIL -- quick review still
 *   opens as reviewer_chen and lands on the one dispute chen may arbitrate,
 *   not the new identity's next actionable pending unit. The two invariant
 *   tests MUST PASS -- neither one moves when dashboard.assignments.js's
 *   reviewerId argument changes.
 */
import { test, expect, type Page } from '@playwright/test';
import { skipGuidelineModal, trackPageErrors, assertNoPageErrors } from '../annotation/_workspace-helpers';

/* Same known static-server <script src> flake guard as the sibling review-
 * unit specs (issue #582 lineage). */
test.describe.configure({ retries: 2 });

const DASHBOARD_URL = '/pages/dashboard/dashboard.html';

interface WorkspaceDataWindow {
  LabelSuiteAnnotationWorkspaceData: {
    listReviewUnits: (
      taskId: string,
      runType: string
    ) => { sampleId: string; annotatorId: string; status: string }[];
    getAssignedReviewUnits: (
      taskId: string,
      runType: string,
      reviewerId: string,
      units: { sample_id: string; annotator_id: string }[]
    ) => { sample_id: string; annotator_id: string }[];
  };
}

async function openReviewerScenario(page: Page) {
  await page.goto(DASHBOARD_URL);
  const trigger = page.locator('.scenario-pill[data-scenario="reviewer"]');
  await expect(trigger).toBeVisible();
  await trigger.click();
}

function quickReviewButton(page: Page, taskId: string) {
  return page.locator(`#reviewerTaskList [data-example-task-id="${taskId}"] .role-task-action-btn`);
}

function sampleItem(page: Page, sampleId: string, annotatorId: string) {
  return page.locator(
    `[data-testid="ws-sample-item"][data-sample-id="${sampleId}"][data-annotator-id="${annotatorId}"]`
  );
}

test.describe('issue #1003 -- T014 demo enters as reviewer_li, not the FR-060-reserved reviewer_chen', () => {
  test('quick review opens reviewer_li on the next actionable unit, with pending, disputed, and finalized units all visible in the left column', async ({
    page,
  }) => {
    const errors = trackPageErrors(page);
    await skipGuidelineModal(page);
    await openReviewerScenario(page);
    await quickReviewButton(page, 'T014').click();

    await expect(page).toHaveURL(/\/pages\/annotation\/annotation-workspace\.html\?/);
    await expect(page).toHaveURL(/task_id=T014/);
    await expect(page).toHaveURL(/reviewer_id=reviewer_li/);
    await expect(page).not.toHaveURL(/reviewer_id=reviewer_chen/);
    await expect(page).toHaveURL(/sample_id=dry-02-one-divergent/);
    await expect(page).toHaveURL(/annotator_id=tony0950127/);
    await expect(page).toHaveURL(/run_type=dry_run/);
    await expect(page).toHaveURL(/role=reviewer/);

    // pending (3 of the 6 assigned units)
    await expect(sampleItem(page, 'dry-02-one-divergent', 'tony0950127')).toHaveCount(1);
    await expect(sampleItem(page, 'dry-05-pending-review', '113450022')).toHaveCount(1);
    await expect(sampleItem(page, 'dry-05-pending-review', 'tony0950127')).toHaveCount(1);
    // disputed (2 of the 6)
    await expect(sampleItem(page, 'dry-02-one-divergent', '113450022')).toHaveCount(1);
    await expect(sampleItem(page, 'dry-05-pending-review', 'kioleemg12')).toHaveCount(1);
    // finalized (1 of the 6)
    await expect(sampleItem(page, 'dry-02-one-divergent', 'kioleemg12')).toHaveCount(1);

    assertNoPageErrors(errors);
  });
});

test.describe('issue #1003 -- T015 demo enters as reviewer_wang, not the FR-060-reserved reviewer_chen', () => {
  test('quick review opens reviewer_wang on the next actionable unit, with pending and finalized units both visible in the left column', async ({
    page,
  }) => {
    const errors = trackPageErrors(page);
    await skipGuidelineModal(page);
    await openReviewerScenario(page);
    await quickReviewButton(page, 'T015').click();

    await expect(page).toHaveURL(/\/pages\/annotation\/annotation-workspace\.html\?/);
    await expect(page).toHaveURL(/task_id=T015/);
    await expect(page).toHaveURL(/reviewer_id=reviewer_wang/);
    await expect(page).not.toHaveURL(/reviewer_id=reviewer_chen/);
    await expect(page).toHaveURL(/sample_id=ofs-04-pending-review/);
    await expect(page).toHaveURL(/annotator_id=kioleemg12/);
    await expect(page).toHaveURL(/run_type=official_run/);
    await expect(page).toHaveURL(/role=reviewer/);

    await expect(sampleItem(page, 'ofs-04-pending-review', 'kioleemg12')).toHaveCount(1); // pending
    await expect(sampleItem(page, 'ofs-01-agree-gold', 'kioleemg12')).toHaveCount(1); // finalized

    assertNoPageErrors(errors);
  });
});

test.describe('issue #1003 -- invariants the fix must not disturb', () => {
  /* FR-060 (annotation-workspace.data.js reviewAssignmentRoster:2533):
   * reviewer_chen is T014's/T015's only arbiterIds member, so new review
   * assignment reserves them out entirely. True on the current code and
   * must stay true after dashboard.assignments.js's reviewerId literals
   * change -- the fix only touches WHICH identity the demo enters as, never
   * this roster rule. */
  test('reviewer_chen still holds zero FR-060-reserved assignments on T014 and T015', async ({ page }) => {
    await page.goto(DASHBOARD_URL);
    const assigned = await page.evaluate(() => {
      const data = (window as unknown as WorkspaceDataWindow).LabelSuiteAnnotationWorkspaceData;
      function assignedFor(taskId: string, runType: string) {
        const units = data.listReviewUnits(taskId, runType).map((u) => ({
          sample_id: u.sampleId,
          annotator_id: u.annotatorId,
        }));
        return data.getAssignedReviewUnits(taskId, runType, 'reviewer_chen', units);
      }
      return {
        t014: assignedFor('T014', 'dry_run'),
        t015: assignedFor('T015', 'official_run'),
      };
    });

    expect(assigned.t014).toEqual([]);
    expect(assigned.t015).toEqual([]);
  });

  /* issue #956's filterUnitsToAssigned() (annotation-workspace.config.js
   * :1664) narrows a reviewer's left column to assigned ∪
   * arbitrable-disputed units; a fabricated identity with neither an FR-093
   * assignment nor an arbiterIds seat on T014 must still see nothing. This
   * is the FR-093/#956 contract the fix must leave standing, not something
   * the fix is meant to change. */
  test('an identity with no T014 assignment sees zero T014 units in the workspace left column', async ({ page }) => {
    const errors = trackPageErrors(page);
    await skipGuidelineModal(page);
    await page.goto(
      '/pages/annotation/annotation-workspace.html?task_id=T014&sample_id=dry-02-one-divergent&annotator_id=tony0950127&role=reviewer&run_type=dry_run&reviewer_id=reviewer_test_unassigned'
    );

    await expect(page.getByTestId('ws-sample-item')).toHaveCount(0);

    assertNoPageErrors(errors);
  });
});
