import { test, expect } from '@playwright/test';
import { buildWorkspaceUrl, skipGuidelineModal } from './_workspace-helpers';

/* issue #931: reviewer-mode workspace shows two different names for the
 * same destination on one screen.
 *
 * The breadcrumb's first crumb link resolves its text from
 * `crumbWorkAreaReviewer` / `crumbWorkAreaAnnotator` in the i18n table
 * (annotation-workspace.config.js:94), branching on `currentRole` when it
 * renders the crumb (annotation-workspace.config.js:1431) — so in reviewer
 * mode it correctly reads 審核作業.
 *
 * The shared sidebar's "annotation" nav item resolves its `navItems` entry's
 * `defaultLabel` from the `opts.taskRole` option passed into
 * `mountSidebar()` (design/prototype/pages/shared/sidebar.js, FR-020,
 * specs/shared/008-sidebar-navbar-shared/spec.md), which the workspace page
 * derives from the URL's `role` query param before mounting
 * (annotation-workspace.html, `taskRole: urlTaskRole`), so `#navAnnotation`
 * reads 審核作業 in reviewer mode, matching the breadcrumb next to it.
 *
 * These assertions now pin that source-of-truth resolution as a regression
 * guard for both roles (reviewer and annotator).
 *
 * Each mode lives in its own `test.describe` (each with its own
 * `retries: 2` guard against the shared static server's occasional
 * keep-alive drop under parallel load, mirroring issue #309's suite-wide
 * guard) rather than one shared `mode: 'serial'` block: a single serial
 * chain would skip the annotator test ("did not run") once the reviewer
 * test exhausts its retries and fails, hiding the regression-guard result
 * instead of reporting it as passed.
 */

test.describe('Reviewer workspace: sidebar and breadcrumb agree on the work-area label (reviewer)', () => {
  test.describe.configure({ retries: 2 });

  test('reviewer: sidebar #navAnnotation matches breadcrumb first crumb, both read 審核作業', async ({ page }) => {
    await skipGuidelineModal(page);
    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001', role: 'reviewer', run_type: 'dry_run' }));

    const breadcrumbText = await page.getByTestId('entry-breadcrumb').locator('a').first().textContent();
    const sidebarText = await page.locator('#navAnnotation').textContent();

    expect(breadcrumbText).toBe('審核作業');
    expect(sidebarText).toBe(breadcrumbText);
  });
});

test.describe('Reviewer workspace: sidebar and breadcrumb agree on the work-area label (annotator)', () => {
  test.describe.configure({ retries: 2 });

  test('annotator: sidebar #navAnnotation and breadcrumb first crumb both keep reading 標記作業', async ({ page }) => {
    await skipGuidelineModal(page);
    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001', role: 'annotator', run_type: 'dry_run' }));

    const breadcrumbText = await page.getByTestId('entry-breadcrumb').locator('a').first().textContent();
    const sidebarText = await page.locator('#navAnnotation').textContent();

    expect(breadcrumbText).toBe('標記作業');
    expect(sidebarText).toBe('標記作業');
  });
});
