/**
 * Workspace missing <h1> and <main> landmark (issue #934).
 *
 * design/prototype/pages/annotation/annotation-workspace.html renders its
 * three-column shell with no <h1> and no <main> (or role="main") landmark:
 * `grep -n '<h1\|<main\|role="main"' pages/annotation/annotation-workspace.html`
 * returns nothing. Screen reader / accessibility-tree users have no way to
 * jump straight to the page's primary content, and no heading names which
 * task or sample they are looking at.
 *
 * Scope: ONLY the missing <h1> and missing <main> landmark. Color-contrast,
 * aria-allowed-attr, and any other axe-core finding are explicitly out of
 * scope for this fix.
 *
 * The h1 must describe the CURRENT task/sample (issue #934's actual ask: "頁
 * 面有一個描述目前任務／樣本的 h1"), not just be a static, role-agnostic
 * screen-type label -- a hardcoded label (e.g. always "標記作業") both fails
 * to name the current task/sample AND duplicates the wrong-label defect that
 * issue #931 exists to fix (hardcoding the annotator-mode label even in
 * reviewer mode). `annotation-workspace.config.js` -- the only place task/
 * sample data exists at render time -- is a separate in-flight issue's
 * (#931) conflict zone the Green implementer must not touch, but real task/
 * sample content is still achievable HTML-only by having the h1 mirror the
 * already-rendered breadcrumb DOM (`#entryBreadcrumb`, populated by
 * config.js's existing `renderEntryBreadcrumb()`), so this test still
 * requires the h1 text to concretely name the task or the sample.
 */
import { test, expect } from '@playwright/test';
import { buildWorkspaceUrl, skipGuidelineModal } from './_workspace-helpers';

/** T016 -- official_run, reviewer path (same fixture as annotation-entry-breadcrumb.spec.ts). */
const T016_NAME = '審核流程示範：正式標記（輪派、仲裁與最終例外）';
const SAMPLE_ID = 'ofm-03-awaiting-arbitration';

test.describe('issue #934 -- workspace has an <h1> and a <main> landmark', () => {
  test.beforeEach(async ({ page }) => {
    await skipGuidelineModal(page);
    await page.goto(
      buildWorkspaceUrl({ task_id: 'T016', sample_id: SAMPLE_ID, role: 'reviewer', run_type: 'official_run' })
    );
    // Anchor on a control that IS rendered, so a page that failed to load
    // cannot pass the landmark/heading assertions vacuously.
    await expect(page.getByTestId('ws-content-scroll')).toBeVisible();
  });

  test('exactly one <main> (or role="main") landmark wraps the working content', async ({ page }) => {
    const main = page.locator('main, [role="main"]');
    await expect(main).toHaveCount(1);
    // The real working content -- the sample list / content-scroll area --
    // must live inside the landmark, not merely co-exist next to it.
    await expect(main.getByTestId('ws-content-scroll')).toBeVisible();
  });

  test('exactly one <h1> names the current task or sample', async ({ page }) => {
    const h1 = page.locator('h1');
    await expect(h1).toHaveCount(1);
    const text = (await h1.textContent())?.trim() ?? '';
    expect(text.length).toBeGreaterThan(0);
    // Must concretely describe the current task/sample -- not a generic
    // decorative label with no task/sample context.
    expect(text.includes(T016_NAME) || text.includes(SAMPLE_ID)).toBe(true);
  });
});
