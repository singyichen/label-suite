import { test, expect, type Page } from '@playwright/test';
import {
  buildWorkspaceUrl,
  dismissGuidelineModal,
  patchDataFile,
  selectWorkspaceText,
  skipGuidelineModal,
} from './_workspace-helpers';

/* Word snapping and its degradation in the annotator workspace (issue #581,
 * OpenSpec change seq-tagging-span-workspace, FR-024A-1).
 *
 * Snapping is a landing-point aid, not a data contract: when the browser has
 * no Intl.Segmenter the drag simply lands where the annotator released it and
 * the card says so. The task's configured snap_unit is never rewritten -- a
 * per-browser capability must not silently edit a task-level setting.
 *
 * 董事長 is the [3,6) word of sequence-tagging-001 and the one Intl.Segmenter's
 * zh dictionary actually merges (台積電 it splits per character), so dragging
 * its last two characters is what makes snapping observable.
 */

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
  await patchDataFile(page, 'task-detail.data.js', `
    window.LabelSuiteTaskDetailData.profiles.T006.outputs[0].config.snap_unit = 'word';
  `);
});

async function tagPartialWord(page: Page) {
  await page.goto(buildWorkspaceUrl({ task_id: 'T006', sample_id: 'sequence-tagging-001' }));
  await dismissGuidelineModal(page);
  await selectWorkspaceText(page, 'ws-input-content', '事長');
  await page.getByTestId('ws-seq-label-btn-PER').click();
}

test('a word-unit drag snaps out to the segmenter word boundary', async ({ page }) => {
  await tagPartialWord(page);

  const added = page.getByTestId('ws-input-content').locator('[data-label="PER"][data-start="3"]');
  await expect(added).toHaveAttribute('data-end', '6');
  await expect(page.getByTestId('ws-seq-snap-degraded')).toHaveCount(0);
});

test('without Intl.Segmenter the drag lands unsnapped and the card says so', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(Intl, 'Segmenter', { value: undefined, configurable: true });
  });

  await tagPartialWord(page);

  const added = page.getByTestId('ws-input-content').locator('[data-label="PER"][data-start="4"]');
  await expect(added).toHaveAttribute('data-end', '6');
  await expect(page.getByTestId('ws-seq-snap-degraded')).toBeVisible();
});

test('the degraded browser leaves the task-level snap_unit untouched', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(Intl, 'Segmenter', { value: undefined, configurable: true });
  });

  await tagPartialWord(page);

  const snapUnit = await page.evaluate(() => window.state.outputConfigs.sequence_tagging.snap_unit);
  expect(snapUnit).toBe('word');
});
