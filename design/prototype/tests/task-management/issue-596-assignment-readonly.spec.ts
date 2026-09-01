/*
 * Traceability: openspec/changes/2026-09-01-single-owner-review-relay/specs/task-management/014-task-detail/spec.md
 *   FR-005j, FR-005k, FR-010t
 *
 * TDD Red for tasks.md 5.4. This spec is the Green contract: PR group 5's
 * frontend implementation (task 5.5) MUST make every assertion below pass by
 * rebuilding the "審核指派" block in
 * design/prototype/pages/task-management/task-detail.panels/member-management.html
 * (rendered at runtime inside task-detail.html, which also owns the
 * canPublish()/getMembershipGapMessages() gating logic per the tasks.md 5.x
 * file-scope note). Green MUST NOT edit this file to make it pass -- if a
 * case here conflicts with Green's implementation, Green is wrong, not this
 * test.
 *
 * ---------------------------------------------------------------------
 * Contract decided by this Red (selectors reused or newly picked below):
 *
 *   FR-005j (assignment section is always read-only -- review_assignment_mode
 *   is retired, assignment is always system-automatic):
 *     - #reviewAssignmentBody MUST NOT mount any per-row action <button>
 *       (existing "指派…" button from the pre-v3.0.0 manual mode).
 *     - #reviewAutoFillBtn (existing id, the "自動補齊" button) MUST NOT
 *       exist in the DOM at all -- not just hidden via a class, since the
 *       mode it depended on no longer exists to toggle it back on.
 *
 *   FR-005k (dispute pool row and new final-exception-pool row are both
 *   read-only info rows, no dispatch button):
 *     - .dispute-pool-row (existing class) MUST contain zero <button>
 *       elements -- #disputeAssignBtn (existing id, "分派給仲裁者") MUST NOT
 *       exist in the DOM at all, same reasoning as #reviewAutoFillBtn above.
 *     - #disputePoolText (existing id) keeps showing the "{n} 項待仲裁"
 *       count per FR-005k's literal scenario copy.
 *     - #exceptionPoolText / .exception-pool-row (BRAND NEW id/class, no
 *       prior art -- this row does not exist pre-v3.0.0) shows the
 *       "{m} 項待處置" count and MUST contain zero <button> elements. The
 *       exact seeded count of m is left to Green (FR-018's exception-pool
 *       data lands in PR group 6), so this Red only pins the text pattern
 *       via regex, not a specific digit.
 *
 *   FR-010t (publish gate counts active members inside reviewer_ids /
 *   arbiter_ids, not a removed min_reviewers threshold):
 *     - reviewer_ids empty (no active member left inside TASK_DATA.reviewerIds)
 *       MUST hard-block publish and surface "審核員還差 1 位" through the
 *       existing #toastMsg (existing memberGapReviewerTpl pattern, reused
 *       from FR-010t's issue-505 predecessor test).
 *     - arbiter_ids empty (T001's seeded DEFAULT_TASK_DATA.arbiterIds = [])
 *       MUST NOT block publish (the trial round is still created), but MUST
 *       show a persistent, non-auto-dismissing warning through a BRAND NEW
 *       #publishArbiterWarning element, carrying the exact phrase quoted in
 *       design.md's Risks section: "未指定仲裁者將導致無法結案". A dedicated
 *       element (rather than reusing the 2.4s-auto-dismissing #toastMsg) is
 *       chosen so Green's warning does not need to race the toast timer.
 * ---------------------------------------------------------------------
 */
import { test, expect, type Page } from '@playwright/test';

const TASK_DETAIL_URL = '/pages/task-management/task-detail.html';

// Tab panels arrive via fetched partials and event bindings only attach after
// the last partial (#workLogPanel) lands; wait for it before interacting.
const PANEL_LOAD_TIMEOUT = 15000;

async function openMemberTab(page: Page) {
  await page.locator('#workLogPanel').waitFor({ state: 'attached', timeout: PANEL_LOAD_TIMEOUT });
  await page.locator('#tabMemberManagement').click();
  await expect(page.locator('#memberManagementPanel')).not.toHaveClass(/hidden/);
}

async function disableMember(page: Page, name: string) {
  await page.locator('#tabMemberManagement').click();
  await expect(page.locator('#memberManagementPanel')).not.toHaveClass(/hidden/);
  const row = page.locator('#memberTableBody tr').filter({ hasText: name });
  await row.locator('button:has-text("停用")').click();
  await page.locator('#memberActionConfirmBtn').click();
  await expect(row).toContainText('停用');
}

test.describe('Review assignment read-only + publish gate (issue #596)', () => {
  // FR-005j: the assignment section renders no assign/auto-fill button at
  // all, because review_assignment_mode (manual vs auto) has been retired --
  // assignment is always system-automatic.
  test('assignment section mounts no assign or auto-fill button', async ({ page }) => {
    await page.goto(TASK_DETAIL_URL);
    await openMemberTab(page);

    await expect(page.locator('#reviewAssignmentBody button')).toHaveCount(0);
    await expect(page.locator('#reviewAutoFillBtn')).toHaveCount(0);
  });

  // FR-005k: both the dispute pool row and the final exception pool row are
  // read-only info rows with no dispatch button.
  test('dispute pool row and final exception pool row are read-only with no dispatch button', async ({ page }) => {
    await page.goto(TASK_DETAIL_URL);
    await openMemberTab(page);

    await expect(page.locator('.dispute-pool-row button')).toHaveCount(0);
    await expect(page.locator('#disputeAssignBtn')).toHaveCount(0);
    await expect(page.locator('#disputePoolText')).toBeVisible();
    await expect(page.locator('#disputePoolText')).toHaveText(/\d+\s*項待仲裁/);

    await expect(page.locator('#exceptionPoolText')).toBeVisible();
    await expect(page.locator('#exceptionPoolText')).toHaveText(/\d+\s*項待處置/);
    await expect(page.locator('.exception-pool-row button')).toHaveCount(0);
  });

  // FR-010t: reviewer_ids with zero active members hard-blocks publish and
  // reports the reviewer gap, same "還差 N 位" template as the pre-existing
  // annotator gap (issue #505).
  test('blocks publish and shows the reviewer gap when reviewer_ids has no active member', async ({ page }) => {
    await page.goto(TASK_DETAIL_URL + '?task_id=T001&status=draft');
    await page.locator('#workLogPanel').waitFor({ state: 'attached', timeout: PANEL_LOAD_TIMEOUT });

    // T001's default reviewer_ids seeds all three reviewer members (Mandy
    // Chen, Kevin Liu, Rachel Wu); disabling every one of them drops the
    // active-member-inside-reviewer_ids count to 0, opening a gap of 1.
    await disableMember(page, 'Mandy Chen');
    await disableMember(page, 'Kevin Liu');
    await disableMember(page, 'Rachel Wu');

    await page.locator('#tabOverview').click();
    await expect(page.locator('#overviewPanel')).not.toHaveClass(/hidden/);
    await page.locator('#publishDryRunBtn').click();

    await expect(page.locator('#toastMsg')).toContainText('審核員還差 1 位');
    await expect(page.locator('#statusBadge')).toHaveText('草稿');
    await expect(page.locator('#trialRoundTimeline .round-timeline-item')).toHaveCount(0);
  });

  // FR-010t: arbiter_ids empty does not block publish, but a persistent
  // warning must be shown.
  test('does not block publish but shows a persistent arbiter-gap warning when arbiter_ids is empty', async ({ page }) => {
    // T001 seeds a full reviewer_ids roster but an empty arbiter_ids
    // (DEFAULT_TASK_DATA.arbiterIds = []), so only the soft-warning branch
    // fires here -- the reviewer_ids hard gate above stays satisfied.
    await page.goto(TASK_DETAIL_URL + '?task_id=T001&status=draft');
    await page.locator('#workLogPanel').waitFor({ state: 'attached', timeout: PANEL_LOAD_TIMEOUT });

    await page.locator('#tabOverview').click();
    await expect(page.locator('#overviewPanel')).not.toHaveClass(/hidden/);
    await page.locator('#publishDryRunBtn').click();

    // Not blocked: the trial round is created immediately, no extra
    // confirmation click required.
    await expect(page.locator('#trialRoundTimeline .round-timeline-item')).toHaveCount(1);

    await expect(page.locator('#publishArbiterWarning')).toBeVisible();
    await expect(page.locator('#publishArbiterWarning')).toContainText('未指定仲裁者將導致無法結案');
  });
});
