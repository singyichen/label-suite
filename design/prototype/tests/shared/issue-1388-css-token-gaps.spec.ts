/*
 * Traceability: issue #1388 -- undefined CSS custom properties were silently
 * dropped (or masked by a var() fallback). Contract: each consumer resolves to
 * an existing tokens.css token, and annotation-workspace's mobile
 * layout (which has no --navbar-mobile-* by design) stays unchanged.
 */
import { test, expect } from '../fixtures';
import type { Page } from '@playwright/test';

const WORKSPACE =
  '/pages/annotation/annotation-workspace.html?task_id=T001&sample_id=sent-001&role=project_leader&run_type=dry_run&annotator_id=kioleemg12';
const TASK_DETAIL = '/pages/task-management/task-detail.html?task_role=project_leader&task_id=T016';

/** Resolve a token to the browser's rgb() form via a throwaway probe. */
async function tokenRgb(page: Page, token: string): Promise<string> {
  return page.evaluate((t) => {
    const probe = document.createElement('div');
    probe.style.color = `var(${t})`;
    document.body.appendChild(probe);
    const out = getComputedStyle(probe).color;
    probe.remove();
    return out;
  }, token);
}

test.describe('Issue #1388 -- CSS token gaps', () => {
  test('annotation-workspace guideline markdown preview uses an existing surface token', async ({ page }) => {
    await page.goto(WORKSPACE);
    expect(page.url()).toContain('annotation-workspace.html');
    const expected = await tokenRgb(page, '--color-border-muted');
    const got = await page.evaluate(() => {
      const host = document.createElement('div');
      host.className = 'guideline-md-preview';
      host.innerHTML = '<code>c</code><pre>p</pre><table><tr><th>h</th></tr></table>';
      document.body.appendChild(host);
      const bg = (sel: string) => getComputedStyle(host.querySelector(sel)!).backgroundColor;
      const out = { code: bg('code'), pre: bg('pre'), th: bg('th') };
      host.remove();
      return out;
    });
    expect(got).toEqual({ code: expected, pre: expected, th: expected });
  });

  test('task-detail .btn-view-detail hover background is effective', async ({ page }) => {
    await page.goto(TASK_DETAIL);
    const expected = await tokenRgb(page, '--color-primary-soft-bg');
    await page.evaluate(() => {
      const b = document.createElement('button');
      b.className = 'btn-view-detail';
      b.id = 'probe-view-detail';
      b.textContent = 'x';
      b.style.cssText = 'position:fixed;top:10px;left:10px;z-index:99999';
      document.body.appendChild(b);
    });
    const probe = page.locator('#probe-view-detail');
    await probe.hover();
    await expect(probe).toHaveCSS('background-color', expected);
  });

  test('task-detail active run-control tab border-color is effective', async ({ page }) => {
    await page.goto(TASK_DETAIL);
    const expected = await tokenRgb(page, '--color-primary-border');
    const got = await page.evaluate(() => {
      const t = document.createElement('button');
      t.className = 'run-control-tab active';
      document.body.appendChild(t);
      const c = getComputedStyle(t).borderTopColor;
      t.remove();
      return c;
    });
    expect(got).toBe(expected);
  });

  test('annotation-workspace mobile layout does not gain sidebar navbar padding', async ({ page }) => {
    // Guard: the workspace never declares --navbar-mobile-*; its body padding must stay at the
    // initial value (a sidebar.css :root default shifted the mobile drawer, RESP-01 / issue #928).
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(WORKSPACE);
    expect(page.url()).toContain('annotation-workspace.html');
    const pad = await page.evaluate(() => {
      const cs = getComputedStyle(document.body);
      return [cs.paddingTop, cs.paddingBottom];
    });
    expect(pad).toEqual(['0px', '0px']);
  });
});
