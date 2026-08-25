/**
 * Brand link and L0 module nav links in the shared sidebar must render with
 * no text underline (computed text-decoration-line: none) across all
 * sidebar consumer module pages.
 *
 * Traceability: specs/shared/008-sidebar-navbar-shared/spec.md
 *   FR-013A, SC-005B
 */
import { test, expect, type Page } from '@playwright/test';

const sidebarPages = [
  '/pages/dashboard/dashboard.html',
  '/pages/task-management/task-list.html',
  '/pages/annotation/annotation-list.html',
  '/pages/dataset/dataset-analysis-list.html',
  '/pages/account/profile.html',
  '/pages/admin/user-management.html',
];

async function readSidebarLinkDecorations(pageUrl: string, page: Page) {
  await page.goto(pageUrl);

  return page.evaluate(() => {
    const links = Array.from(
      document.querySelectorAll<HTMLElement>('.navbar-brand, .navbar-center .nav-link')
    );

    if (links.length === 0) {
      throw new Error('Missing shared sidebar links');
    }

    return links.map((link) => ({
      label: link.textContent?.trim() || link.getAttribute('aria-label') || link.className,
      decorationLine: window.getComputedStyle(link).textDecorationLine,
    }));
  });
}

test.describe('Shared sidebar link decoration', () => {
  test('does not underline brand or module links across modules', async ({ page }) => {
    for (const pageUrl of sidebarPages) {
      const decorations = await readSidebarLinkDecorations(pageUrl, page);
      for (const decoration of decorations) {
        expect(decoration.decorationLine, `${pageUrl} ${decoration.label}`).toBe('none');
      }
    }
  });
});
