/**
 * Issue #1393 (PR-B): admin user-management and role-settings reuse the shared
 * Desktop Content Tabs stylesheet and stay on one scrollable row at narrow widths.
 *
 * Contract:
 *   - both pages link ../shared/content-tabs.css
 *   - neither page defines .admin-tabs / .admin-tab in an inline <style>
 *   - 390px: overflow-x auto, nowrap, hidden scrollbar, tabs share one row
 *   - 1280px: desktop metrics unchanged
 *
 * Traceability: design/system/MASTER.md "Desktop Content Tabs"; issue #1393
 */
import { test, expect } from '../fixtures';
import * as fs from 'fs';
import * as path from 'path';

const PROTO_ROOT = path.resolve(__dirname, '../..');

const PAGES = [
  {
    name: 'user-management',
    file: 'pages/admin/user-management.html',
    url: '/pages/admin/user-management.html',
  },
  {
    name: 'role-settings',
    file: 'pages/admin/role-settings.html',
    url: '/pages/admin/role-settings.html',
  },
];

function inlineStyleText(html: string): string {
  return [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).join('\n');
}

test.describe('Issue #1393 admin content tabs: shared stylesheet', () => {
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

test.describe('Issue #1393 admin content tabs: narrow viewport (390px)', () => {
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

test.describe('Issue #1393 admin content tabs: desktop viewport (1280px) unchanged', () => {
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
