import { test, expect } from '@playwright/test';
import { buildWorkspaceUrl, skipGuidelineModal } from '../annotation/_workspace-helpers';

/* issue #944: the shared sidebar's `navItems` "annotation" entry
 * (#navAnnotation) and the user chip's `roleIndicator`
 * (data-testid="role-indicator") are both currently rendered from a single
 * hard-coded default string (標記作業 / 一般使用者) inside
 * design/prototype/pages/shared/sidebar.js, with no branching on task role.
 *
 * The annotation-workspace page's reviewer-mode override for these two
 * nodes has so far been patched in twice on the CONSUMER side
 * (annotation-workspace.config.js's applyStaticI18nText(): issue #309 for
 * roleIndicator, issue #931 for navAnnotation), each time writing directly
 * via document.getElementById(...).textContent = ... after sidebar.js has
 * already mounted. The maintainer's 2026-09-25 ruling on issue #944 is to
 * converge this at the source: sidebar.js itself must resolve both labels
 * from a new `opts.taskRole` option at mount time (FR-020 / FR-020A,
 * specs/shared/008-sidebar-navbar-shared/spec.md), and the two consumer-side
 * overrides are to be removed in the paired Green step.
 *
 * Until sidebar.js gains `opts.taskRole` support, the reviewer-mode
 * assertions below (cases 1, 3, 5's reviewer half, 6) MUST fail because the
 * sidebar keeps emitting its unconditional defaults. The annotator-mode
 * assertions (cases 2, 4, 5's annotator half) pin the existing, already
 * correct default behavior as a non-regression guard — they are expected to
 * pass today, same as this project's TDD convention for a pre-existing
 * correct path (see issue-908 task 1.3).
 *
 * Each scenario lives in its own `test.describe` (retries: 2) mirroring
 * issue-931/issue-309's guard against the shared static server's occasional
 * keep-alive drop under parallel load, rather than one `mode: 'serial'`
 * block whose early failure would hide a later non-regression pin as
 * "did not run" instead of reporting it as passed.
 */

test.describe('issue #944: reviewer navAnnotation reads 審核作業, matches breadcrumb', () => {
  test.describe.configure({ retries: 2 });

  test('reviewer: #navAnnotation reads 審核作業 and matches entry breadcrumb first crumb', async ({ page }) => {
    await skipGuidelineModal(page);
    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001', role: 'reviewer', run_type: 'dry_run' }));

    const breadcrumbText = await page.getByTestId('entry-breadcrumb').locator('a').first().textContent();
    const sidebarText = await page.locator('#navAnnotation').textContent();

    expect(sidebarText).toBe('審核作業');
    expect(sidebarText).toBe(breadcrumbText);
  });
});

test.describe('issue #944: annotator navAnnotation keeps default 標記作業 (non-regression pin)', () => {
  test.describe.configure({ retries: 2 });

  test('annotator: #navAnnotation stays 標記作業', async ({ page }) => {
    await skipGuidelineModal(page);
    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001', role: 'annotator', run_type: 'dry_run' }));

    const sidebarText = await page.locator('#navAnnotation').textContent();
    expect(sidebarText).toBe('標記作業');
  });
});

test.describe('issue #944: reviewer roleIndicator reads 審核員', () => {
  test.describe.configure({ retries: 2 });

  test('reviewer: role-indicator reads 審核員', async ({ page }) => {
    await skipGuidelineModal(page);
    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001', role: 'reviewer', run_type: 'dry_run' }));

    await expect(page.getByTestId('role-indicator')).toHaveText('審核員');
  });
});

test.describe('issue #944: annotator roleIndicator keeps default 一般使用者 (non-regression pin)', () => {
  test.describe.configure({ retries: 2 });

  test('annotator: role-indicator stays 一般使用者', async ({ page }) => {
    await skipGuidelineModal(page);
    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001', role: 'annotator', run_type: 'dry_run' }));

    await expect(page.getByTestId('role-indicator')).toHaveText('一般使用者');
  });
});

test.describe('issue #944: sidebar.js resolves taskRole itself, independent of any consumer-page override', () => {
  test.describe.configure({ retries: 2 });

  test('re-mounting via window.LabelSuiteSharedSidebar.mountSidebar({ taskRole }) resolves both labels with no consumer JS involved', async ({ page }) => {
    // Load the workspace as annotator so the legacy consumer-side
    // applyStaticI18nText() reviewer-only override branches (issue #309,
    // issue #931), if still present, do NOT fire for this page load --
    // isolating the assertions below to sidebar.js's own mount resolution.
    await skipGuidelineModal(page);
    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001', role: 'annotator', run_type: 'dry_run' }));

    await page.evaluate(() => {
      (window as any).LabelSuiteSharedSidebar.mountSidebar({
        mountId: 'sharedSidebarMount',
        taskRole: 'reviewer',
      });
    });

    expect(await page.locator('#navAnnotation').textContent()).toBe('審核作業');
    await expect(page.getByTestId('role-indicator')).toHaveText('審核員');

    // Inverse: re-mounting with the annotator taskRole (or omitting it)
    // must restore the existing defaults -- proving the resolution is a
    // live function of `taskRole` on each mount, not a one-way patch.
    await page.evaluate(() => {
      (window as any).LabelSuiteSharedSidebar.mountSidebar({
        mountId: 'sharedSidebarMount',
        taskRole: 'annotator',
      });
    });

    expect(await page.locator('#navAnnotation').textContent()).toBe('標記作業');
    await expect(page.getByTestId('role-indicator')).toHaveText('一般使用者');
  });
});

test.describe('issue #944: taskRole option does not reopen the issue #946 userName XSS contract', () => {
  test.describe.configure({ retries: 2 });

  test('a malicious userName combined with taskRole still renders as literal text', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/pages/annotation/annotation-workspace.html');

    const payload = '<img src=x onerror="window.__sidebarXssFired = true">';

    // Same injection path as issue-946-sidebar-escape-username.spec.ts
    // (renderSidebar() string-concatenates userName into the HTML it hands
    // to mountNode.innerHTML on initial render), now combined with the new
    // taskRole option in the same mountSidebar() call to prove taskRole
    // resolution doesn't disturb the userName escaping contract.
    await page.evaluate((userNamePayload) => {
      (window as any).__sidebarXssFired = false;
      (window as any).LabelSuiteSharedSidebar.mountSidebar({ userName: userNamePayload, taskRole: 'reviewer' });
    }, payload);

    const userName = page.locator('#userName');

    await expect(userName).toHaveText(payload);
    await expect(page.locator('#userName img')).toHaveCount(0);
    await expect(page.locator('#userAvatar img')).toHaveCount(0);

    const xssFired = await page.evaluate(() => (window as any).__sidebarXssFired);
    expect(xssFired).toBe(false);
  });
});
