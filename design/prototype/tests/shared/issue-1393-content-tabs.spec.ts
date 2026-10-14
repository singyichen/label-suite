/**
 * Issue #1393 (PR-A): Desktop Content Tabs share one stylesheet and stay on a
 * single horizontally scrollable row at narrow viewports.
 *
 * Contract:
 *   - pages/shared/content-tabs.css is the ONLY definition of .admin-tabs / .admin-tab
 *   - task-detail and dataset-analysis-detail link it and carry no inline definition
 *   - 390px: overflow-x auto, nowrap, one row, hidden scrollbar, role=tablist kept
 *   - 1280px: desktop metrics unchanged
 *   - design/system/MASTER.md "Desktop Content Tabs" documents the narrow rule
 *
 * Traceability: design/system/MASTER.md "Desktop Content Tabs"; issue #1393
 */
import { test, expect } from '../fixtures';
import * as fs from 'fs';
import * as path from 'path';

const PROTO_ROOT = path.resolve(__dirname, '../..');
const MASTER_PATH = path.resolve(PROTO_ROOT, '../system/MASTER.md');

const PAGES = [
  {
    name: 'task-detail',
    file: 'pages/task-management/task-detail.html',
    url: '/pages/task-management/task-detail.html?task_role=project_leader',
  },
  {
    name: 'dataset-analysis-detail',
    file: 'pages/dataset/dataset-analysis-detail.html',
    url: '/pages/dataset/dataset-analysis-detail.html?task_id=T001',
  },
];

function inlineStyleText(html: string): string {
  return [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).join('\n');
}

test.describe('Issue #1393 content tabs: shared stylesheet', () => {
  test('content-tabs.css exists and defines .admin-tabs and .admin-tab', () => {
    const cssPath = path.join(PROTO_ROOT, 'pages/shared/content-tabs.css');
    expect(fs.existsSync(cssPath)).toBe(true);
    const css = fs.readFileSync(cssPath, 'utf8');
    expect(css).toMatch(/\.admin-tabs\s*\{/);
    expect(css).toMatch(/\.admin-tab\s*\{/);
  });

  for (const p of PAGES) {
    test(`${p.name} links content-tabs.css`, () => {
      const html = fs.readFileSync(path.join(PROTO_ROOT, p.file), 'utf8');
      expect(html).toMatch(
        /<link[^>]+rel="stylesheet"[^>]+href="\.\.\/shared\/content-tabs\.css"|<link[^>]+href="\.\.\/shared\/content-tabs\.css"[^>]+rel="stylesheet"/,
      );
    });

    test(`${p.name} has no inline .admin-tabs / .admin-tab rule in <style>`, () => {
      const html = fs.readFileSync(path.join(PROTO_ROOT, p.file), 'utf8');
      const style = inlineStyleText(html);
      expect(style).not.toMatch(/\.admin-tabs\s*\{/);
      expect(style).not.toMatch(/\.admin-tab\s*\{/);
    });
  }
});

test.describe('Issue #1393 content tabs: narrow viewport (390px)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  for (const p of PAGES) {
    test(`${p.name}: tabs stay on one scrollable row with hidden scrollbar`, async ({ page }) => {
      await page.goto(p.url);
      const tablist = page.locator('.admin-tabs[role="tablist"]');
      await expect(tablist).toBeVisible();

      const info = await tablist.evaluate((el) => {
        const cs = getComputedStyle(el);
        const tops = Array.from(el.querySelectorAll('.admin-tab')).map(
          (t) => (t as HTMLElement).offsetTop,
        );
        return {
          overflowX: cs.overflowX,
          flexWrap: cs.flexWrap,
          scrollbarWidth: cs.scrollbarWidth,
          tabCount: tops.length,
          distinctTops: new Set(tops).size,
        };
      });
      expect(['auto', 'scroll']).toContain(info.overflowX);
      expect(info.flexWrap).toBe('nowrap');
      expect(info.scrollbarWidth).toBe('none');
      expect(info.tabCount).toBeGreaterThan(1);
      expect(info.distinctTops).toBe(1);
    });
  }
});

test.describe('Issue #1393 content tabs: desktop viewport (1280px) unchanged', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  for (const p of PAGES) {
    test(`${p.name}: desktop metrics preserved`, async ({ page }) => {
      await page.goto(p.url);
      const tablist = page.locator('.admin-tabs[role="tablist"]');
      await expect(tablist).toBeVisible();
      const m = await tablist.evaluate((el) => {
        const cs = getComputedStyle(el);
        const tab = getComputedStyle(el.querySelector('.admin-tab') as Element);
        return {
          display: cs.display,
          borderBottomWidth: cs.borderBottomWidth,
          padding: `${tab.paddingTop} ${tab.paddingRight} ${tab.paddingBottom} ${tab.paddingLeft}`,
          fontSize: tab.fontSize,
        };
      });
      expect(m.display).toBe('flex');
      expect(m.borderBottomWidth).toBe('2px');
      expect(m.padding).toBe('10px 20px 10px 20px');
      expect(m.fontSize).toBe('14px');
    });
  }
});

test.describe('Issue #1393 content tabs: MASTER.md', () => {
  test('Desktop Content Tabs section documents the narrow-viewport rule', () => {
    const md = fs.readFileSync(MASTER_PATH, 'utf8');
    const start = md.indexOf('### Desktop Content Tabs');
    const end = md.indexOf('### Table', start);
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);
    const section = md.slice(start, end);
    expect(section).toContain('overflow-x: auto');
    expect(section).toMatch(/single[- ]row|no[- ]wrap|nowrap|must not wrap/i);
    expect(section).toContain('content-tabs.css');
  });
});
