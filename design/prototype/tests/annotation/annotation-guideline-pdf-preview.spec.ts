import { test, expect } from '@playwright/test';
import { buildWorkspaceUrl, dismissGuidelineModal } from './_workspace-helpers';

/* Traceability: specs/annotation/015-annotation-workspace/spec.md
 *   FR-020, FR-020B, AC-5.3, AC-5.4, SC-005C
 *
 * Issue #353: clicking a PDF guideline file must open an in-page preview
 * modal (mirroring the image modal's interaction contract) instead of a
 * new browser tab. Annotator and reviewer share renderGuidelineFileList(),
 * so the annotator path below covers both roles' file-list behavior.
 */

const pdfItem = (page: import('@playwright/test').Page) =>
  page.getByTestId('ws-guideline-file-item').filter({ hasText: '.pdf' });

test('opens the PDF preview modal in-page instead of a new tab', async ({ page, context }) => {
  await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001' }));
  await dismissGuidelineModal(page);

  await pdfItem(page).click();

  const pdfModal = page.getByTestId('ws-guideline-pdf-modal');
  const frame = page.getByTestId('ws-guideline-pdf-modal-preview');
  await expect(pdfModal).toBeVisible();
  // Path convention only — the concrete asset name is a content decision
  // (same rationale as annotation-guideline-image-preview.spec.ts).
  await expect(frame).toHaveAttribute('src', /assets\/guidelines\/.+\.pdf/);
  // The old behavior was window.open(file.url, '_blank'): no second page
  // may exist after the click.
  expect(context.pages()).toHaveLength(1);
});

test('PDF row shows the preview action hint, not the new-tab hint', async ({ page }) => {
  await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001' }));
  await dismissGuidelineModal(page);

  await expect(pdfItem(page).locator('.guideline-file-action')).toHaveText('預覽');
});

test('closes via close button and via Esc', async ({ page }) => {
  await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001' }));
  await dismissGuidelineModal(page);

  const pdfModal = page.getByTestId('ws-guideline-pdf-modal');

  await pdfItem(page).click();
  await expect(pdfModal).toBeVisible();
  await page.getByTestId('ws-guideline-pdf-modal-close').click();
  await expect(pdfModal).toBeHidden();

  await pdfItem(page).click();
  await expect(pdfModal).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(pdfModal).toBeHidden();
});
