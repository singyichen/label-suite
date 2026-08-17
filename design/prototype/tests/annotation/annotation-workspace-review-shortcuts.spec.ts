import { test, expect, type Page } from '@playwright/test';
import {
  assertNoPageErrors,
  buildWorkspaceUrl,
  dismissGuidelineModal,
  skipGuidelineModal,
  trackPageErrors,
} from './_workspace-helpers';

/* Reviewer A/R decision shortcuts (spec 015 v4.1.0, FR-054).
 *
 * The shared sidebar has advertised four review shortcuts since spec 008, but
 * none were ever wired up. v4.0.0 made the review unit `sample × annotator`,
 * which retired the two batch rows (Shift+A / Shift+R) -- a unit is one
 * annotator, so there is nothing left to batch over. The two that survive
 * apply to the WHOLE current review unit: a task may ship several output
 * types, `handleReviewSubmit()` requires every one of them decided, and there
 * is no notion of a focused output type, so `A` decides all of them at once.
 */

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
});

async function gotoReviewer(page: Page, taskId: string, sampleId: string) {
  await page.goto(buildWorkspaceUrl({ task_id: taskId, sample_id: sampleId, role: 'reviewer', run_type: 'dry_run' }));
  await dismissGuidelineModal(page);
  await expect(page.getByTestId('ws-review-row-approve').first()).toBeVisible();
}

test.describe('A / R decide the current review unit', () => {
  test('A approves, a second A cancels back to undecided', async ({ page }) => {
    await gotoReviewer(page, 'T001', 'sent-001');
    const approve = page.getByTestId('ws-review-row-approve');
    const reject = page.getByTestId('ws-review-row-reject');

    await expect(approve).toHaveAttribute('aria-pressed', 'false');

    await page.keyboard.press('a');
    await expect(approve).toHaveAttribute('aria-pressed', 'true');
    await expect(reject).toHaveAttribute('aria-pressed', 'false');

    await page.keyboard.press('a');
    await expect(approve).toHaveAttribute('aria-pressed', 'false');
  });

  test('R rejects, and A afterwards flips the unit to approved', async ({ page }) => {
    await gotoReviewer(page, 'T001', 'sent-001');
    const approve = page.getByTestId('ws-review-row-approve');
    const reject = page.getByTestId('ws-review-row-reject');

    await page.keyboard.press('r');
    await expect(reject).toHaveAttribute('aria-pressed', 'true');
    await expect(approve).toHaveAttribute('aria-pressed', 'false');

    await page.keyboard.press('a');
    await expect(approve).toHaveAttribute('aria-pressed', 'true');
    await expect(reject).toHaveAttribute('aria-pressed', 'false');
  });

  /* T013 ships entity_recognition + relation_identification + multi_dim, so
   * the unit carries three decision pairs. One keystroke must satisfy the
   * all-decided submit gate -- otherwise the shortcut is useless on exactly
   * the tasks where clicking is most tedious. */
  test('one A decides every output type of a multi-output unit', async ({ page }) => {
    await gotoReviewer(page, 'T013', 'absa-001');
    const approve = page.getByTestId('ws-review-row-approve');
    await expect(approve).toHaveCount(3);

    await page.keyboard.press('a');
    for (let i = 0; i < 3; i += 1) {
      await expect(approve.nth(i)).toHaveAttribute('aria-pressed', 'true');
    }

    await page.getByTestId('ws-review-submit-btn').click();
    await expect(page.locator('#toastMsg')).toHaveText('審查已提交');
  });
});

test.describe('Keystrokes that must not decide', () => {
  /* Shift+A / Shift+R were the retired batch shortcuts. They are no longer
   * advertised and must not silently fall through to the single-unit path. */
  test('Shift+A and Shift+R leave the unit undecided', async ({ page }) => {
    await gotoReviewer(page, 'T001', 'sent-001');
    const approve = page.getByTestId('ws-review-row-approve');
    const reject = page.getByTestId('ws-review-row-reject');

    await page.keyboard.press('Shift+A');
    await page.keyboard.press('Shift+R');

    await expect(approve).toHaveAttribute('aria-pressed', 'false');
    await expect(reject).toHaveAttribute('aria-pressed', 'false');
  });

  test('Control+A and Meta+A leave the unit undecided', async ({ page }) => {
    await gotoReviewer(page, 'T001', 'sent-001');
    const approve = page.getByTestId('ws-review-row-approve');

    await page.keyboard.press('Control+a');
    await page.keyboard.press('Meta+a');

    await expect(approve).toHaveAttribute('aria-pressed', 'false');
  });

  /* free_text corrections are typed, so the letters `a` and `r` are ordinary
   * input the moment a field has focus. */
  test('typing a and r into the free_text correction field only types', async ({ page }) => {
    await gotoReviewer(page, 'T009', 'sum-001');
    const approve = page.getByTestId('ws-review-row-approve');

    const field = page.getByTestId('ws-review-row').locator('textarea, input[type="text"]').first();
    await field.click();
    await field.fill('');
    await page.keyboard.type('arar');

    await expect(field).toHaveValue('arar');
    await expect(approve).toHaveAttribute('aria-pressed', 'false');
  });

  test('the annotator workspace ignores a and r', async ({ page }) => {
    const errors = trackPageErrors(page);
    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001', role: 'annotator' }));
    await dismissGuidelineModal(page);

    await page.keyboard.press('a');
    await page.keyboard.press('r');

    await expect(page.getByTestId('ws-review-row-approve')).toHaveCount(0);
    assertNoPageErrors(errors);
  });
});
