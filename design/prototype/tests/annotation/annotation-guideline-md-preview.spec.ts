import { test, expect } from '@playwright/test';
import { buildWorkspaceUrl, dismissGuidelineModal } from './_workspace-helpers';

/* Traceability: specs/annotation/015-annotation-workspace/spec.md
 *   FR-020, FR-020D, AC-5.3, SC-005D
 *
 * Issue #527: clicking a Markdown guideline file must open an in-page
 * preview modal (same interaction contract as the PDF / image modals)
 * with the Markdown rendered to HTML, instead of dumping the raw source
 * into an inline block under the file list. Annotator and reviewer share
 * renderGuidelineFileList(), so the annotator path covers both roles.
 */

const mdItem = (page: import('@playwright/test').Page) =>
  page.getByTestId('ws-guideline-file-item').filter({ hasText: '.md' });

test('opens the Markdown preview modal with the file name as title', async ({ page }) => {
  await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001' }));
  await dismissGuidelineModal(page);

  await mdItem(page).click();

  const modal = page.getByTestId('ws-guideline-md-modal');
  await expect(modal).toBeVisible();
  await expect(modal.locator('.modal-title')).toHaveText('常見問題.md');
  // The old inline block must be gone -- no second rendering surface.
  await expect(page.locator('#wsGuidelineMdPreview')).toHaveCount(0);
});

test('renders Markdown to HTML instead of showing raw source', async ({ page }) => {
  await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001' }));
  await dismissGuidelineModal(page);

  await mdItem(page).click();

  const body = page.getByTestId('ws-guideline-md-modal-body');
  await expect(body.locator('h1')).toHaveText('常見問題');
  await expect(body.locator('li')).toHaveCount(2);
  await expect(body.locator('li strong').first()).toHaveText('Q: 如何開始標記？');
  await expect(body).not.toContainText('**');
  await expect(body).not.toContainText('# ');
});

test('closes via close button, backdrop and Esc', async ({ page }) => {
  await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001' }));
  await dismissGuidelineModal(page);

  const modal = page.getByTestId('ws-guideline-md-modal');

  await mdItem(page).click();
  await expect(modal).toBeVisible();
  await page.getByTestId('ws-guideline-md-modal-close').click();
  await expect(modal).toBeHidden();

  await mdItem(page).click();
  await expect(modal).toBeVisible();
  await modal.click({ position: { x: 5, y: 5 } });
  await expect(modal).toBeHidden();

  await mdItem(page).click();
  await expect(modal).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(modal).toBeHidden();
});

test('first-visit guideline gate renders the same Markdown to HTML', async ({ page }) => {
  await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001' }));

  const body = page.getByTestId('ws-guideline-modal-body');
  await expect(body.locator('h1')).toHaveText('常見問題');
  await expect(body).not.toContainText('**');
});

test('escapes raw HTML in Markdown source (no script injection)', async ({ page }) => {
  await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001' }));
  await dismissGuidelineModal(page);

  const html = await page.evaluate(() =>
    (window as any).renderMarkdown(
      '# T <img src=x onerror="alert(1)">\n\n[x](javascript:alert(1))'
    )
  );
  expect(html).not.toContain('<img');
  expect(html).not.toContain('onerror');
  expect(html).not.toContain('javascript:');
  expect(html).toContain('&lt;img');
});
