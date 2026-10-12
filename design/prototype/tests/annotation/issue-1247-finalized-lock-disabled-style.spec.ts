import { test, expect, type Page } from '@playwright/test';
import { buildWorkspaceUrl, skipGuidelineModal } from './_workspace-helpers';

/* Annotator finalized-lock VISUAL layer (issue #1247, spec 015 FR-101 / AC-2.27).
 *
 * The functional lock (disabled + aria-disabled, shortcuts inert) is already
 * pinned by issue-908-annotator-finalized-lock.spec.ts and stays untouched.
 * This file pins only what #1247 adds: a locked sample must LOOK locked --
 * disabled styling on the two action buttons and the answer chips, a
 * warning-toned two-line notice with a lock icon, a lock icon in the autosave
 * status bar, and no toast spam on a direct click of a greyed-out button.
 *
 * Fixture: same technique as the 908 spec -- a fresh annotator id plus a real
 * annotator submission and a matching reviewer approve (unanimous lane), so
 * getReviewUnitStatus() derives 'finalized' for official_run, with 'negative'
 * selected so a selected chip exists to compare against unselected ones.
 *
 * Shortcut/toast note (verified against annotation-workspace.config.js, not
 * assumed): setupActionShortcuts() only calls btn.click() when the target is
 * NOT disabled, so on a locked sample Ctrl/Cmd+S and Ctrl/Cmd+Enter currently
 * reach no handler and show NO toast. The issue text says the shortcuts
 * "keep the existing toast"; the existing behavior is actually silent. The
 * shortcut-toast test below follows the issue's stated intent and is
 * therefore RED today for that reason (Green must route the shortcut to the
 * annotatorFinalizedToast while the button itself stays disabled).
 */

const TASK_ID = 'T015';
const SAMPLE_ID = 'ofs-01-agree-gold';
const FINALIZED_NOTICE_TITLE = '此標記結果已定稿';
const FINALIZED_NOTICE_DESC = '作答內容已鎖定，無法再修改或提交。如需異動請聯絡審核員。';
const AUTOSAVE_FINALIZED_TEXT = '已定稿，不再自動儲存';
const FINALIZED_TOAST_TEXT = '已定稿';

type Identity = { annotatorId: string; reviewerId?: string };
type WorkspaceData = {
  markSampleSubmitted: (
    taskId: string, role: string, runType: string, sampleId: string,
    payload: unknown, historySummary: string, identity: Identity
  ) => unknown;
};

async function openFinalizedSample(page: Page, runType: 'official_run' | 'dry_run', annotatorId: string) {
  await skipGuidelineModal(page);
  const url = buildWorkspaceUrl({
    task_id: TASK_ID, sample_id: SAMPLE_ID, role: 'annotator', run_type: runType, annotator_id: annotatorId,
  });
  await page.goto(url);
  await page.evaluate(
    ({ taskId, sampleId, runType, annotatorId }) => {
      const data = (window as unknown as { LabelSuiteAnnotationWorkspaceData: WorkspaceData })
        .LabelSuiteAnnotationWorkspaceData;
      const payload = { previewState: { single_label: { selected: 'negative' } } };
      data.markSampleSubmitted(taskId, 'annotator', runType, sampleId, payload, '', { annotatorId });
      data.markSampleSubmitted(taskId, 'reviewer', runType, sampleId, payload, '', {
        annotatorId, reviewerId: 'reviewer_wang',
      });
    },
    { taskId: TASK_ID, sampleId: SAMPLE_ID, runType, annotatorId }
  );
  await page.reload();
}

async function styleOf(locator: import('@playwright/test').Locator) {
  return locator.evaluate((el) => {
    const cs = getComputedStyle(el);
    return { cursor: cs.cursor, opacity: parseFloat(cs.opacity) };
  });
}

test.describe('issue #1247 -- finalized lock visual disabled styling', () => {
  test('wsSaveBtn / wsSubmitBtn render as disabled (not-allowed cursor, reduced opacity)', async ({ page }) => {
    await openFinalizedSample(page, 'official_run', 'test_annotator_1247a');
    await expect(page.getByTestId('ws-annotator-finalized-notice')).toBeVisible();

    for (const testId of ['ws-save-btn', 'ws-submit-btn']) {
      const btn = page.getByTestId(testId);
      await expect(btn).toBeDisabled();
      const { cursor, opacity } = await styleOf(btn);
      expect(cursor, `${testId} cursor`).toBe('not-allowed');
      expect(opacity, `${testId} opacity`).toBeLessThan(1);
    }
  });

  test('unselected answer chips look disabled; selected chip stays more prominent', async ({ page }) => {
    await openFinalizedSample(page, 'official_run', 'test_annotator_1247b');
    const preview = page.locator('#annotationPreview');

    for (const label of ['positive', 'neutral']) {
      const chip = preview.getByTestId(`ws-single-label-chip-${label}`);
      await expect(chip).toBeDisabled();
      await expect(chip).toHaveAttribute('aria-pressed', 'false');
      const { cursor, opacity } = await styleOf(chip);
      expect(cursor, `${label} chip cursor`).toBe('not-allowed');
      expect(opacity, `${label} chip opacity`).toBeLessThan(1);
    }

    const selected = preview.getByTestId('ws-single-label-chip-negative');
    await expect(selected).toHaveAttribute('aria-pressed', 'true');
    const selectedStyle = await styleOf(selected);
    const unselectedStyle = await styleOf(preview.getByTestId('ws-single-label-chip-positive'));
    expect(selectedStyle.cursor).toBe('not-allowed');
    // Selected answer must not be dimmed as far as the unselected ones.
    expect(selectedStyle.opacity).toBeGreaterThan(unselectedStyle.opacity);
  });

  test('notice has a lock svg, two-line copy, and warning tokens', async ({ page }) => {
    await openFinalizedSample(page, 'official_run', 'test_annotator_1247c');
    const notice = page.getByTestId('ws-annotator-finalized-notice');
    await expect(notice).toBeVisible();

    await expect(notice.locator('svg')).toHaveCount(1);
    // Title and description are separate elements, not one concatenated string.
    const title = notice.getByText(FINALIZED_NOTICE_TITLE, { exact: true });
    const desc = notice.getByText(FINALIZED_NOTICE_DESC, { exact: true });
    await expect(title).toHaveCount(1);
    await expect(desc).toHaveCount(1);
    const titleBox = await title.boundingBox();
    const descBox = await desc.boundingBox();
    expect(titleBox && descBox && descBox.y).toBeGreaterThan(titleBox!.y);

    const { border, bg, warningBorder, warningBg, infoBg } = await page.evaluate(() => {
      const resolve = (token: string, prop: 'color' | 'backgroundColor') => {
        const probe = document.createElement('div');
        probe.style.cssText = `${prop === 'color' ? 'color' : 'background-color'}:var(${token})`;
        document.body.appendChild(probe);
        const v = getComputedStyle(probe)[prop];
        probe.remove();
        return v;
      };
      const el = document.querySelector('[data-testid="ws-annotator-finalized-notice"]') as HTMLElement;
      const cs = getComputedStyle(el);
      return {
        border: cs.borderTopColor,
        bg: cs.backgroundColor,
        warningBorder: resolve('--color-warning-border', 'color'),
        warningBg: resolve('--color-warning-bg', 'backgroundColor'),
        infoBg: resolve('--color-info-bg', 'backgroundColor'),
      };
    });
    expect(border).toBe(warningBorder);
    expect(bg).toBe(warningBg);
    expect(bg).not.toBe(infoBg);
  });

  test('autosave status bar shows a lock svg instead of the green dot, text unchanged', async ({ page }) => {
    await openFinalizedSample(page, 'official_run', 'test_annotator_1247d');
    const status = page.getByTestId('ws-autosave-status');
    await expect(page.locator('#wsAutosaveLabel')).toHaveText(AUTOSAVE_FINALIZED_TEXT);
    await expect(status.locator('svg')).toHaveCount(1);
    await expect(status.locator('.autosave-dot.saved')).toHaveCount(0);
  });

  test('force-clicking a disabled button shows no finalized toast', async ({ page }) => {
    await openFinalizedSample(page, 'official_run', 'test_annotator_1247e');
    for (const testId of ['ws-save-btn', 'ws-submit-btn']) {
      const btn = page.getByTestId(testId);
      await expect(btn).toBeDisabled();
      await btn.click({ force: true });
      await btn.dispatchEvent('click');
    }
    await expect(page.locator('#toast.visible')).toHaveCount(0);
    await expect(page.locator('#toastMsg')).not.toContainText(FINALIZED_TOAST_TEXT);
  });

  for (const [name, combo] of [['Ctrl/Cmd+S', 'ControlOrMeta+S'], ['Ctrl/Cmd+Enter', 'ControlOrMeta+Enter']] as const) {
    test(`${name} on a locked sample still shows the finalized toast`, async ({ page }) => {
      await openFinalizedSample(page, 'official_run', `test_annotator_1247_${name.length}`);
      await expect(page.getByTestId('ws-annotator-finalized-notice')).toBeVisible();
      await page.keyboard.press(combo);
      await expect(page.locator('#toast.visible')).toHaveCount(1);
      await expect(page.locator('#toastMsg')).toContainText(FINALIZED_TOAST_TEXT);
    });
  }

  test('negative: dry_run finalized sample has no lock styling', async ({ page }) => {
    await openFinalizedSample(page, 'dry_run', 'test_annotator_1247f');
    await expect(page.getByTestId('ws-annotator-finalized-notice')).toHaveCount(0);

    for (const testId of ['ws-save-btn', 'ws-submit-btn']) {
      const btn = page.getByTestId(testId);
      await expect(btn).toBeEnabled();
      const { cursor, opacity } = await styleOf(btn);
      expect(cursor, `${testId} cursor`).not.toBe('not-allowed');
      expect(opacity, `${testId} opacity`).toBe(1);
    }
    const chip = page.locator('#annotationPreview').getByTestId('ws-single-label-chip-positive');
    await expect(chip).toBeEnabled();
    const { cursor, opacity } = await styleOf(chip);
    expect(cursor).not.toBe('not-allowed');
    expect(opacity).toBe(1);
  });
});
