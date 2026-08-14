import { test, expect } from '@playwright/test';
import {
  buildWorkspaceUrl,
  dismissGuidelineModal,
  patchDataFile,
  setRangeValue,
  skipGuidelineModal,
} from './_workspace-helpers';

/* allow_bypass ("無法判定") coverage for output types whose seed profiles
 * don't natively set allow_bypass=true (unlike T003/multi_label and
 * T006/sequence_tagging, whose native bypass behavior is already covered
 * in their own per-type spec files). Patches allow_bypass at runtime via
 * patchDataFile() — never edits a file under pages/. */

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
});

test.describe('single_label bypass (T001, stubbed allow_bypass)', () => {
  test.beforeEach(async ({ page }) => {
    await patchDataFile(page, 'task-detail.data.js', `
      window.LabelSuiteTaskDetailData.profiles.T001.outputs[0].config.allow_bypass = true;
    `);
  });

  test('checking bypass clears the selected chip and disables the chip group', async ({ page }) => {
    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001' }));
    await dismissGuidelineModal(page);

    await page.getByTestId('ws-single-label-chip-positive').click();
    await page.getByTestId('ws-bypass-single_label').check();

    await expect(page.getByTestId('ws-single-label-chip-positive')).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByTestId('ws-single-label-chip-positive')).toBeDisabled();
  });
});

test.describe('single_dim bypass (T004, stubbed allow_bypass)', () => {
  test.beforeEach(async ({ page }) => {
    await patchDataFile(page, 'task-detail.data.js', `
      window.LabelSuiteTaskDetailData.profiles.T004.outputs[0].config.allow_bypass = true;
    `);
  });

  test('checking bypass clears the slider value and disables it', async ({ page }) => {
    await page.goto(buildWorkspaceUrl({ task_id: 'T004', sample_id: 'read-001' }));
    await dismissGuidelineModal(page);

    await setRangeValue(page.getByTestId('ws-single-dim-slider'), '4');
    await page.getByTestId('ws-bypass-single_dim').check();

    await expect(page.getByTestId('ws-single-dim-value')).toHaveText('—');
    await expect(page.getByTestId('ws-single-dim-slider')).toBeDisabled();
  });
});

test.describe('free_text bypass (T009, stubbed allow_bypass)', () => {
  test.beforeEach(async ({ page }) => {
    await patchDataFile(page, 'task-detail.data.js', `
      window.LabelSuiteTaskDetailData.profiles.T009.outputs[0].config.allow_bypass = true;
    `);
  });

  test('checking bypass clears the textarea and disables it', async ({ page }) => {
    await page.goto(buildWorkspaceUrl({ task_id: 'T009', sample_id: 'sum-001' }));
    await dismissGuidelineModal(page);

    await page.getByTestId('ws-free-text-input').fill('草稿內容');
    await page.getByTestId('ws-bypass-free_text').check();

    await expect(page.getByTestId('ws-free-text-input')).toHaveValue('');
    await expect(page.getByTestId('ws-free-text-input')).toBeDisabled();
  });
});
