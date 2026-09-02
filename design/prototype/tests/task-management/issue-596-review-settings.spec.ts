/*
 * Traceability: openspec/changes/2026-09-01-single-owner-review-relay/specs/task-management/spec.md
 *   FR-010s, FR-010s-1, FR-010s-2, FR-010t
 *
 * TDD Red for tasks.md 5.1. This spec is the Green contract: PR group 5's
 * frontend implementation (tasks 5.2/5.3) MUST make every assertion below
 * pass by rebuilding the "審核設定" block in
 * design/prototype/pages/task-management/task-detail.panels/overview.html
 * (rendered at runtime inside task-detail.html). Green MUST NOT edit this
 * file to make it pass -- if a case here conflicts with Green's
 * implementation, Green is wrong, not this test.
 *
 * ---------------------------------------------------------------------
 * Contract decided by this Red (selectors reused or newly picked below;
 * "existing" = already present in task-detail.html before this change):
 *
 *   View mode (#reviewSummaryView), exactly two `.kv-dl-row` children:
 *     - #labelReviewerIdsControl (text "審核員") / #valueReviewerIdsControl
 *       -- summary value: "已勾選 N 人" / "未勾選審核員" when N = 0 (FR-010s bullet 1)
 *     - #labelArbiterIdsControl  (text "仲裁者") / #valueArbiterIdsControl
 *       -- summary value: "未指定仲裁者" / "仲裁者 N 人" (FR-010s-2), never
 *          prefixed with "啟用"/"停用"
 *   These are brand-new IDs (chosen instead of reusing the existing
 *   #labelArbitrationControl/#valueArbitrationControl pair, because that
 *   pair belongs to the toggle-driven "第三人仲裁" field FR-010s retires;
 *   reusing it would conflate a removed field with a new one).
 *
 *   Existing four-field IDs that FR-010s says MUST NOT render anymore
 *   (kept as literal selectors here specifically so a regression back to
 *   the four-field layout is caught by name, not just by row count):
 *     #labelMinReviewersControl, #labelReviewAssignmentControl,
 *     #labelAutoFinalizeControl, #labelArbitrationControl
 *
 *   Edit mode (#reviewEditForm):
 *     - MUST NOT contain #minReviewersInput, input[name="reviewAssignmentMode"],
 *       or any `.toggle-switch` (covers the existing #autoFinalizeToggle /
 *       #arbitrationToggle behavior toggles) -- FR-010s-1.
 *     - #reviewerOptionList mounts one `.reviewer-option` checkbox per
 *       active reviewer member (existing getActiveReviewerMembers() roster:
 *       taskRole = reviewer AND status = active -- seeded as Mandy Chen,
 *       Kevin Liu, Rachel Wu). Checking one writes into `reviewer_ids`.
 *       (New mount id/class, parallel to the existing #arbiterOptionList
 *       pattern reused below for the arbiter checklist.)
 *     - #arbiterOptionList mounts one `.arbiter-option` checkbox per
 *       currently-checked reviewer-option only (FR-010s-1 subset rule).
 *       This reuses the existing #arbiterOptionList / .arbiter-option
 *       mount+class from the pre-v3.0.0 arbiter picker, since it is the
 *       same visual widget repurposed under the new candidate rule.
 *     - #reviewSettingsError (existing id) carries the reviewer_ids-empty
 *       save-blocking message; exact copy is left to Green, this Red only
 *       requires it to be non-empty and visible per FR-010s-1's "顯示可
 *       修正錯誤訊息" (message content not specified by the spec).
 * ---------------------------------------------------------------------
 */
import { test, expect } from '@playwright/test';

const TASK_DETAIL_URL = '/pages/task-management/task-detail.html';

async function openReviewEdit(page: import('@playwright/test').Page) {
  await page.goto(TASK_DETAIL_URL);
  await page.locator('#reviewEditBtn').click();
}

test.describe('Task detail review settings — single-owner relay roster (issue #596)', () => {
  // FR-010s: view mode shows exactly two fields, 審核員 and 仲裁者.
  test('view mode shows exactly two fields: 審核員 and 仲裁者', async ({ page }) => {
    await page.goto(TASK_DETAIL_URL);

    await expect(page.locator('#reviewSummaryView .kv-dl-row')).toHaveCount(2);

    await expect(page.locator('#labelReviewerIdsControl')).toHaveText('審核員');
    await expect(page.locator('#valueReviewerIdsControl')).toBeVisible();
    await expect(page.locator('#labelArbiterIdsControl')).toHaveText('仲裁者');
    await expect(page.locator('#valueArbiterIdsControl')).toBeVisible();

    // The four retired fields must be entirely gone, not just hidden.
    await expect(page.locator('#labelMinReviewersControl')).toHaveCount(0);
    await expect(page.locator('#labelReviewAssignmentControl')).toHaveCount(0);
    await expect(page.locator('#labelAutoFinalizeControl')).toHaveCount(0);
    await expect(page.locator('#labelArbitrationControl')).toHaveCount(0);
  });

  // FR-010s-1: edit mode provides exactly two checklists, no numeric
  // input, no mode radio, no behavior toggle.
  test('edit mode provides two checklists with no numeric input, radio, or toggle', async ({ page }) => {
    await openReviewEdit(page);

    await expect(page.locator('#reviewEditForm #minReviewersInput')).toHaveCount(0);
    await expect(page.locator('#reviewEditForm input[name="reviewAssignmentMode"]')).toHaveCount(0);
    await expect(page.locator('#reviewEditForm .toggle-switch')).toHaveCount(0);

    // 審核員 checklist candidates = active reviewer members (Mandy Chen,
    // Kevin Liu, Rachel Wu per the seeded TASK_MEMBERS roster).
    const reviewerOptions = page.locator('#reviewerOptionList .reviewer-option');
    await expect(page.locator('#reviewerOptionList')).toBeVisible();
    await expect(reviewerOptions).toHaveCount(3);
    await expect(reviewerOptions).toContainText(['Mandy Chen', 'Kevin Liu', 'Rachel Wu']);

    await expect(page.locator('#arbiterOptionList')).toBeVisible();
  });

  // FR-010s-1: arbiter candidates are a subset of the checked reviewers.
  test('arbiter candidates are limited to checked reviewers', async ({ page }) => {
    await openReviewEdit(page);

    // Fast-failing precondition (fails on the missing checklist itself
    // instead of timing out 30s later on a .check() call against nothing).
    await expect(page.locator('#reviewerOptionList .reviewer-option')).toHaveCount(3);

    // Normalize to a known state: uncheck every reviewer, then check only
    // Mandy Chen and Kevin Liu, leaving Rachel Wu unchecked.
    const reviewerCheckboxes = page.locator('#reviewerOptionList .reviewer-option input');
    const count = await reviewerCheckboxes.count();
    for (let i = 0; i < count; i += 1) {
      const box = reviewerCheckboxes.nth(i);
      if (await box.isChecked()) await box.uncheck();
    }
    await page
      .locator('#reviewerOptionList .reviewer-option', { hasText: 'Mandy Chen' })
      .locator('input')
      .check();
    await page
      .locator('#reviewerOptionList .reviewer-option', { hasText: 'Kevin Liu' })
      .locator('input')
      .check();

    const arbiterOptions = page.locator('#arbiterOptionList .arbiter-option');
    await expect(arbiterOptions).toHaveCount(2);
    await expect(arbiterOptions).toContainText(['Mandy Chen', 'Kevin Liu']);
    await expect(page.locator('#arbiterOptionList .arbiter-option', { hasText: 'Rachel Wu' })).toHaveCount(0);
  });

  // FR-010s-1: unchecking a reviewer synchronously clears their arbiter
  // checkbox too.
  test('unchecking a reviewer clears their arbiter selection', async ({ page }) => {
    await openReviewEdit(page);

    await expect(page.locator('#reviewerOptionList .reviewer-option')).toHaveCount(3);

    await page
      .locator('#reviewerOptionList .reviewer-option', { hasText: 'Mandy Chen' })
      .locator('input')
      .check();
    await page
      .locator('#arbiterOptionList .arbiter-option', { hasText: 'Mandy Chen' })
      .locator('input')
      .check();
    await expect(
      page.locator('#arbiterOptionList .arbiter-option', { hasText: 'Mandy Chen' }).locator('input')
    ).toBeChecked();

    await page
      .locator('#reviewerOptionList .reviewer-option', { hasText: 'Mandy Chen' })
      .locator('input')
      .uncheck();

    // Mandy Chen must no longer be an arbiter candidate at all (she is no
    // longer a checked reviewer), so her prior arbiter selection is gone.
    await expect(page.locator('#arbiterOptionList .arbiter-option', { hasText: 'Mandy Chen' })).toHaveCount(0);
  });

  // FR-010s-1: saving with an empty reviewer_ids is blocked.
  test('blocks save when reviewer_ids is empty', async ({ page }) => {
    await openReviewEdit(page);

    const reviewerCheckboxes = page.locator('#reviewerOptionList .reviewer-option input');
    const count = await reviewerCheckboxes.count();
    for (let i = 0; i < count; i += 1) {
      const box = reviewerCheckboxes.nth(i);
      if (await box.isChecked()) await box.uncheck();
    }

    await page.locator('#reviewSaveBtn').click();

    await expect(page.locator('#reviewEditForm')).not.toHaveClass(/hidden/);
    await expect(page.locator('#reviewSaveBtn')).toBeVisible();
    const errorText = await page.locator('#reviewSettingsError').innerText();
    expect(errorText.trim().length).toBeGreaterThan(0);
    await expect(page.locator('#reviewSettingsError')).toBeVisible();
  });

  // FR-010s-2: the 仲裁者 summary value never carries an 啟用/停用 prefix,
  // and follows the "未指定仲裁者" / "仲裁者 N 人" rule.
  test('arbiter summary value has no 啟用/停用 prefix and follows the count rule', async ({ page }) => {
    await openReviewEdit(page);

    await expect(page.locator('#reviewerOptionList .reviewer-option')).toHaveCount(3);

    const reviewerCheckboxes = page.locator('#reviewerOptionList .reviewer-option input');
    const count = await reviewerCheckboxes.count();
    for (let i = 0; i < count; i += 1) {
      const box = reviewerCheckboxes.nth(i);
      if (await box.isChecked()) await box.uncheck();
    }
    await page
      .locator('#reviewerOptionList .reviewer-option', { hasText: 'Mandy Chen' })
      .locator('input')
      .check();
    await page
      .locator('#reviewerOptionList .reviewer-option', { hasText: 'Kevin Liu' })
      .locator('input')
      .check();
    await page
      .locator('#arbiterOptionList .arbiter-option', { hasText: 'Mandy Chen' })
      .locator('input')
      .check();
    await page
      .locator('#arbiterOptionList .arbiter-option', { hasText: 'Kevin Liu' })
      .locator('input')
      .check();
    await page.locator('#reviewSaveBtn').click();

    await expect(page.locator('#valueArbiterIdsControl')).toHaveText('仲裁者 2 人');
    await expect(page.locator('#valueArbiterIdsControl')).not.toContainText('啟用');
    await expect(page.locator('#valueArbiterIdsControl')).not.toContainText('停用');

    // Re-enter edit mode and clear all arbiters to hit the empty-state text.
    await page.locator('#reviewEditBtn').click();
    const arbiterCheckboxes = page.locator('#arbiterOptionList .arbiter-option input');
    const arbiterCount = await arbiterCheckboxes.count();
    for (let i = 0; i < arbiterCount; i += 1) {
      const box = arbiterCheckboxes.nth(i);
      if (await box.isChecked()) await box.uncheck();
    }
    await page.locator('#reviewSaveBtn').click();

    await expect(page.locator('#valueArbiterIdsControl')).toHaveText('未指定仲裁者');
    await expect(page.locator('#valueArbiterIdsControl')).not.toContainText('啟用');
    await expect(page.locator('#valueArbiterIdsControl')).not.toContainText('停用');
  });
});
