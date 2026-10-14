/**
 * Issue #1445: the annotation-workspace guideline panel tabs (指引 / 歷程) use the
 * shared Desktop Content Tabs component instead of a page-level 5th tab style.
 *
 * Contract:
 *   - annotation-workspace.html links ../shared/content-tabs.css
 *   - no page-level .guideline-tabs / .guideline-tab rule remains in <style>
 *   - container carries .admin-tabs, buttons carry .admin-tab (+ .active)
 *   - computed metrics match the shared component (14px, 10px 20px, 500/600, text-soft/primary)
 *   - tab switching and active toggling are unchanged
 *   - design/system/MASTER.md "Desktop Content Tabs" lists annotation-workspace
 *
 * Traceability: design/system/MASTER.md "Desktop Content Tabs"; issue #1445
 */
import { test, expect } from '../fixtures';
import * as fs from 'fs';
import * as path from 'path';

const PROTO_ROOT = path.resolve(__dirname, '../..');
const PAGE_FILE = path.join(PROTO_ROOT, 'pages/annotation/annotation-workspace.html');
const MASTER_PATH = path.resolve(PROTO_ROOT, '../system/MASTER.md');
const URL = '/pages/annotation/annotation-workspace.html?task_id=T001&role=annotator';

function inlineStyleText(html: string): string {
  return [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).join('\n');
}

test.describe('Issue #1445 guideline tabs: shared content-tabs', () => {
  test('annotation-workspace links content-tabs.css and has no page-level .guideline-tab rule', () => {
    const html = fs.readFileSync(PAGE_FILE, 'utf8');
    expect(html).toMatch(
      /<link[^>]+rel="stylesheet"[^>]+href="\.\.\/shared\/content-tabs\.css"|<link[^>]+href="\.\.\/shared\/content-tabs\.css"[^>]+rel="stylesheet"/,
    );
    expect(inlineStyleText(html)).not.toMatch(/\.guideline-tab/);
  });

  test('guideline tabs use .admin-tabs / .admin-tab with shared computed metrics', async ({ page }) => {
    await page.goto(URL);
    const guideline = page.locator('#wsTabGuideline');
    const history = page.locator('#wsTabHistory');
    await expect(guideline).toBeVisible();

    await expect(guideline.locator('xpath=..')).toHaveClass(/(^|\s)admin-tabs(\s|$)/);
    await expect(guideline).toHaveClass(/(^|\s)admin-tab(\s|$)/);
    await expect(history).toHaveClass(/(^|\s)admin-tab(\s|$)/);

    // Resolve token colors through probe elements so no hex is hard-coded.
    const expected = await page.evaluate(() => {
      const resolve = (token: string) => {
        const probe = document.createElement('span');
        probe.style.color = `var(${token})`;
        document.body.appendChild(probe);
        const c = getComputedStyle(probe).color;
        probe.remove();
        return c;
      };
      return { soft: resolve('--color-text-soft'), primary: resolve('--color-primary') };
    });

    const read = (loc: typeof history) =>
      loc.evaluate((el) => {
        const cs = getComputedStyle(el);
        return {
          fontSize: cs.fontSize,
          padding: cs.padding,
          fontWeight: cs.fontWeight,
          color: cs.color,
          borderBottomColor: cs.borderBottomColor,
        };
      });

    const inactive = await read(history);
    expect(inactive.fontSize).toBe('14px');
    expect(inactive.padding).toBe('10px 20px');
    expect(inactive.fontWeight).toBe('500');
    expect(inactive.color).toBe(expected.soft);

    const active = await read(guideline);
    expect(active.fontWeight).toBe('600');
    expect(active.color).toBe(expected.primary);
    expect(active.borderBottomColor).toBe(expected.primary);
  });

  test('switching tabs still toggles active and the history panel', async ({ page }) => {
    await page.goto(URL);
    const guideline = page.locator('#wsTabGuideline');
    const history = page.locator('#wsTabHistory');
    const panel = page.locator('#wsHistoryPanel');
    await expect(guideline).toHaveClass(/(^|\s)active(\s|$)/);
    await expect(panel).toHaveClass(/hidden/);

    await history.click();
    await expect(history).toHaveClass(/(^|\s)active(\s|$)/);
    await expect(guideline).not.toHaveClass(/(^|\s)active(\s|$)/);
    await expect(panel).not.toHaveClass(/hidden/);

    await guideline.click();
    await expect(guideline).toHaveClass(/(^|\s)active(\s|$)/);
    await expect(history).not.toHaveClass(/(^|\s)active(\s|$)/);
    await expect(panel).toHaveClass(/hidden/);
  });

  test('MASTER.md Desktop Content Tabs section lists annotation-workspace', () => {
    const master = fs.readFileSync(MASTER_PATH, 'utf8');
    const start = master.indexOf('### Desktop Content Tabs');
    expect(start).toBeGreaterThan(-1);
    const rest = master.slice(start + 1);
    const next = rest.search(/\n### /);
    const section = next === -1 ? rest : rest.slice(0, next);
    expect(section).toMatch(/annotation-workspace/);
  });
});
