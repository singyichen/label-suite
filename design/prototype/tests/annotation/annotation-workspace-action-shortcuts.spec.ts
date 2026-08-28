import { test, expect } from '@playwright/test';
import { buildWorkspaceUrl, skipGuidelineModal } from './_workspace-helpers';

/* The four workspace shortcuts the sidebar panel advertises (issue #152).
 *
 * `?`/`ESC` and the reviewer's `A`/`R` were already wired; 儲存草稿,
 * 提交目前標記, 上一筆 and 下一筆 were advertised but did nothing, so the
 * panel taught a key that had no effect.
 *
 * Each shortcut is an alias for a button that already exists, which is why
 * the tests assert the BUTTON's outcome (toast, unit change, disabled edge)
 * rather than any shortcut-specific state.
 */

const ANNOTATOR_URL = buildWorkspaceUrl({
  task_id: 'T001',
  sample_id: 'sent-001',
  role: 'annotator',
  run_type: 'dry_run',
});

/* T009 sum-001 is the free_text seed: the only annotator sample that renders
 * a real, persisted text-entry control. The two "shortcut still fires while a
 * text field has focus" cases below used the workspace's 備註 textarea until
 * issue #457 removed it as dead UI; they moved here so they keep exercising a
 * genuine text field rather than a control that stored nothing. */
const FREE_TEXT_URL = buildWorkspaceUrl({
  task_id: 'T009',
  sample_id: 'sum-001',
  role: 'annotator',
  run_type: 'official_run',
});

function reviewerUrl(annotatorId: string): string {
  return buildWorkspaceUrl({
    task_id: 'T001',
    sample_id: 'sent-001',
    role: 'reviewer',
    run_type: 'dry_run',
    annotator_id: annotatorId,
  });
}

function sampleIdOf(url: string): string | null {
  return new URL(url).searchParams.get('sample_id');
}

test.describe('Alt+Arrow steps between review units', () => {
  test('annotator: Alt+ArrowRight moves to the next record', async ({ page }) => {
    await skipGuidelineModal(page);
    await page.goto(ANNOTATOR_URL);

    await page.keyboard.press('Alt+ArrowRight');

    await expect(page.getByTestId('ws-sample-item').nth(1)).toHaveClass(/active/);
    expect(sampleIdOf(page.url())).toBe('sent-002');
  });

  test('annotator: Alt+ArrowLeft moves back', async ({ page }) => {
    await skipGuidelineModal(page);
    await page.goto(ANNOTATOR_URL);

    await page.keyboard.press('Alt+ArrowRight');
    await page.keyboard.press('Alt+ArrowRight');
    await page.keyboard.press('Alt+ArrowLeft');

    expect(sampleIdOf(page.url())).toBe('sent-002');
  });

  test('Alt+ArrowLeft on the first unit does nothing', async ({ page }) => {
    await skipGuidelineModal(page);
    await page.goto(ANNOTATOR_URL);

    // 上一筆 is disabled here, and the shortcut must honour that rather than
    // wrapping around to the last record.
    await page.keyboard.press('Alt+ArrowLeft');

    await expect(page.getByTestId('ws-sample-item').nth(0)).toHaveClass(/active/);
    expect(sampleIdOf(page.url())).toBe('sent-001');
  });

  test('reviewer: Alt+ArrowRight steps one review unit, not one sample', async ({ page }) => {
    await skipGuidelineModal(page);
    await page.goto(reviewerUrl('kioleemg12'));

    await page.keyboard.press('Alt+ArrowRight');

    await expect(page.locator('.sample-item.active').getByTestId('ws-sample-annotator')).toHaveText('113450022');
    expect(sampleIdOf(page.url())).toBe('sent-001');
  });

  test('Alt+ArrowRight still steps while a text field has focus', async ({ page }) => {
    await skipGuidelineModal(page);
    await page.goto(FREE_TEXT_URL);

    // Unlike the bare `a`/`r` review keys, a modifier combo produces no text,
    // so suppressing it inside inputs would only cost the annotator the
    // shortcut exactly where they spend most of their time.
    await page.getByTestId('ws-free-text-input').click();
    await page.keyboard.press('Alt+ArrowRight');

    expect(sampleIdOf(page.url())).toBe('sum-002');
  });

  test('the browser Back navigation is suppressed', async ({ page }) => {
    await skipGuidelineModal(page);
    await page.goto(ANNOTATOR_URL);

    // Alt+ArrowLeft is Back in Chrome/Firefox; without preventDefault the
    // shortcut would step forward and leave the workspace at the same time.
    //
    // The probe is installed by an AWAITED evaluate that returns at once and
    // parks the verdict on `window`: an un-awaited evaluate returning a
    // pending promise races the key press, and on a slow runner the press
    // wins and nothing ever resolves.
    await page.evaluate(() => {
      const probe = window as Window & { __arrowPrevented?: boolean };
      // Pressing a combo emits a keydown for Alt itself first, which is not
      // prevented -- wait for the arrow.
      document.addEventListener('keydown', function onKey(e) {
        if (e.key !== 'ArrowRight') return;
        document.removeEventListener('keydown', onKey);
        probe.__arrowPrevented = e.defaultPrevented;
      });
    });

    await page.keyboard.press('Alt+ArrowRight');

    await expect
      .poll(() => page.evaluate(() => (window as Window & { __arrowPrevented?: boolean }).__arrowPrevented))
      .toBe(true);
  });
});

test.describe('Ctrl/Cmd+S saves the draft', () => {
  test('annotator: the shortcut saves and reports it', async ({ page }) => {
    await skipGuidelineModal(page);
    await page.goto(ANNOTATOR_URL);

    await page.keyboard.press('Control+s');

    await expect(page.locator('#toastMsg')).toHaveText('已儲存');
    await expect(page.getByTestId('ws-sample-item').nth(0)).toContainText('已儲存');
  });

  test('the shortcut works while typing in a text field', async ({ page }) => {
    await skipGuidelineModal(page);
    await page.goto(FREE_TEXT_URL);

    await page.getByTestId('ws-free-text-input').fill('半途想存檔');
    await page.keyboard.press('Control+s');

    await expect(page.locator('#toastMsg')).toHaveText('已儲存');
  });

  test('reviewer: the shortcut does nothing, because 儲存草稿 is hidden', async ({ page }) => {
    await skipGuidelineModal(page);
    await page.goto(reviewerUrl('kioleemg12'));

    await page.keyboard.press('Control+s');

    // A reviewer has no draft; firing the annotator handler would write a
    // submission row under the reviewer's identity. The toast node is always
    // in the DOM -- `.visible` is what makes it appear.
    await expect(page.locator('#toast')).not.toHaveClass(/visible/);
  });
});

/* T001 carries an output-role column, which FR-024M counts as answered, so
   an annotator's incomplete-submit guard is unreachable here; the reviewer
   case below is what proves the shortcut goes through the guarded handler
   rather than around it. */
test.describe('Ctrl/Cmd+Enter submits the unit on screen', () => {
  test('annotator: a complete answer submits', async ({ page }) => {
    await skipGuidelineModal(page);
    await page.goto(ANNOTATOR_URL);

    await page.getByTestId('ws-single-label-chip-negative').click();
    await page.keyboard.press('Control+Enter');

    await expect(page.locator('#toastMsg')).toHaveText('已提交');
    await expect(page.getByTestId('ws-sample-item').nth(0)).toContainText('已提交');
  });

  test('reviewer: the shortcut routes to 送出審核, not 提交', async ({ page }) => {
    await skipGuidelineModal(page);
    await page.goto(reviewerUrl('kioleemg12'));

    await page.keyboard.press('Control+Enter');

    // No decision has been made, so the reviewer submit guard speaks up --
    // which is what proves the reviewer handler ran rather than handleSubmit.
    // issue #550: the toast now names the still-undecided output type(s);
    // T001 carries a single output type (single_label).
    await expect(page.locator('#toastMsg')).toHaveText('請完成以下輸出類型的審核決策：single_label');
  });
});

/* w6-resilience-a11y.md A11Y-04: the primary annotator actions must be
 * reachable through role + accessible name (what a screen reader announces),
 * not only through test ids. These role-based lookups sit ALONGSIDE the
 * testid-based assertions elsewhere in this file -- they do not replace
 * them.
 *
 * Known gap, recorded as a deviation in the PR report rather than papered
 * over here: the reviewer rows' per-type ✓/✕ decision buttons
 * (buildRowDecisionButtons, annotation-workspace.config.js) are icon-only
 * with no aria-label, so they expose NO accessible name and cannot be
 * located by role+name at all. Adding aria-labels is a production change
 * outside this test-only PR, so the assertions below target the
 * text-bearing action-bar buttons. */
test.describe('Action-bar buttons are reachable by role and accessible name (A11Y-04)', () => {
  test('儲存草稿 and 提交 resolve via getByRole and still operate', async ({ page }) => {
    await skipGuidelineModal(page);
    await page.goto(ANNOTATOR_URL);

    const saveBtn = page.getByRole('button', { name: '儲存草稿', exact: true });
    await expect(saveBtn).toBeVisible();
    await saveBtn.click();
    await expect(page.locator('#toastMsg')).toHaveText('已儲存');

    await page.getByTestId('ws-single-label-chip-negative').click();
    const submitBtn = page.getByRole('button', { name: '提交', exact: true });
    await expect(submitBtn).toBeVisible();
    await submitBtn.click();
    await expect(page.locator('#toastMsg')).toHaveText('已提交');
  });
});
