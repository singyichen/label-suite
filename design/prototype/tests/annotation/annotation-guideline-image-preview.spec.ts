import { test, expect } from '@playwright/test';
import { buildWorkspaceUrl, dismissGuidelineModal } from './_workspace-helpers';

test('opens guideline image modal when image file is clicked', async ({ page }) => {
  await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001' }));
  await dismissGuidelineModal(page);

  await page.getByTestId('ws-guideline-file-item').first().click();

  const imageModal = page.getByTestId('ws-guideline-image-modal');
  const modalImage = page.getByTestId('ws-guideline-image-modal-preview');

  await expect(imageModal).toBeVisible();
  await expect(modalImage).toBeVisible();
  // Path convention only — the specific guideline asset filename is a
  // content decision for whoever authors T001's guideline material, not
  // something this test should hardcode.
  await expect(modalImage).toHaveAttribute('src', /assets\/images\/task-management\//);
});
