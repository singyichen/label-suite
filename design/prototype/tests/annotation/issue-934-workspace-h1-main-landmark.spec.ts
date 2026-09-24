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
 * The h1 is asserted as a static, role/task-agnostic screen-type label (the
 * same pattern as annotation-list.html's `<h1 class="page-title"
 * id="pageTitle">標記清單</h1>`), not required to contain the live task name
 * or sample id: `annotation-workspace.config.js` -- the only place that data
 * exists at render time -- is a separate in-flight issue's (#931) conflict
 * zone the Green implementer must not touch, so a JS-populated per-task h1
 * is out of scope here. Only the non-empty, human-meaningful text and the
 * <main> landmark are asserted.
 */
import { test, expect } from '@playwright/test';
import { buildWorkspaceUrl, skipGuidelineModal } from './_workspace-helpers';

/** T016 -- official_run, reviewer path (same fixture as annotation-entry-breadcrumb.spec.ts). */
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

  test('exactly one <h1> carries a non-empty, human-meaningful label', async ({ page }) => {
    const h1 = page.locator('h1');
    await expect(h1).toHaveCount(1);
    const text = (await h1.textContent())?.trim() ?? '';
    expect(text.length).toBeGreaterThan(0);
  });
});
