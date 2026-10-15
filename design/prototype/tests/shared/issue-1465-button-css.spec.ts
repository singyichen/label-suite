/**
 * Issue #1465 PR-A: profile + role-settings converge on the shared button
 * stylesheet (MASTER.md "Buttons").
 *
 * Contract:
 *   - pages/shared/button.css exists, defines ONLY .btn-primary / .btn-secondary /
 *     .btn-ghost / .btn-cta, tokens only (no hex); .btn-danger stays in modal.css
 *   - account/profile and admin/role-settings link it; user-management adopted it in PR-C (see issue-1465-c spec)
 *   - neither adopter's inline <style> keeps a base rule for the four classes
 *   - runtime (zh + en): profile .btn-primary / .btn-secondary and role-settings
 *     .btn-ghost (#editBtn) / .btn-cta (#saveBtn) compute the shared chrome
 *   - MASTER.md "Buttons" names pages/shared/button.css, account/profile and
 *     admin/role-settings; the changelog has an issue #1465 row
 *
 * Traceability: design/system/MASTER.md "Buttons"; issue #1465
 */
import { test, expect } from '../fixtures';
import type { Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const PROTO_ROOT = path.resolve(__dirname, '../..');
const MASTER_PATH = path.resolve(PROTO_ROOT, '../system/MASTER.md');
const CSS_PATH = path.join(PROTO_ROOT, 'pages/shared/button.css');
const ADOPTERS = ['pages/account/profile.html', 'pages/admin/role-settings.html'];
const CLASSES = ['btn-primary', 'btn-secondary', 'btn-ghost', 'btn-cta'];
const LINK_RE =
  /<link[^>]+rel="stylesheet"[^>]+href="\.\.\/shared\/button\.css"|<link[^>]+href="\.\.\/shared\/button\.css"[^>]+rel="stylesheet"/;

function inlineStyleText(html: string): string {
  return [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).join('\n');
}

test.describe('Issue #1465 shared button: static contract', () => {
  test('button.css exists, is token-only and defines only the four classes', () => {
    expect(fs.existsSync(CSS_PATH)).toBe(true);
    const css = fs.readFileSync(CSS_PATH, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    for (const c of CLASSES) expect(css).toMatch(new RegExp(`\\.${c}\\s*[{,:]`));
    const selectors = [...css.matchAll(/([^{}]+)\{/g)].flatMap((m) =>
      m[1].split(',').map((s) => s.trim()).filter(Boolean),
    );
    expect(selectors.length).toBeGreaterThan(0);
    for (const sel of selectors) {
      expect(sel, `unexpected selector "${sel}"`).toMatch(
        /^\.btn-(primary|secondary|ghost|cta)(?![\w-])/,
      );
    }
  });

  for (const file of ADOPTERS) {
    test(`${file} links button.css and drops its base button rules`, () => {
      const html = fs.readFileSync(path.join(PROTO_ROOT, file), 'utf8');
      expect(html).toMatch(LINK_RE);
      const style = inlineStyleText(html);
      for (const c of CLASSES) {
        expect(style, `.${c} base rule still inline`).not.toMatch(
          new RegExp(`^\\s*\\.${c}\\s*\\{`, 'm'),
        );
      }
    });
  }

  test('MASTER.md Buttons names button.css and both adopters; changelog has #1465', () => {
    const master = fs.readFileSync(MASTER_PATH, 'utf8');
    const start = master.indexOf('### Buttons');
    expect(start).toBeGreaterThan(-1);
    const next = master.indexOf('\n### ', start + 5);
    const section = master.slice(start, next === -1 ? undefined : next);
    expect(section).toContain('pages/shared/button.css');
    expect(section).toContain('account/profile');
    expect(section).toContain('admin/role-settings');
    expect(master).toMatch(/\|\s*v[\d.]+\s*\|[^\n]*issue #1465/);
  });
});

type Lang = 'zh' | 'en';
type Expected = {
  padding: string;
  weight: string;
  borderTop: string;
  bg: string | 'transparent';
  color: string;
  paddingBlockOnly?: boolean;
};

async function seed(page: Page, lang: Lang): Promise<void> {
  await page.addInitScript((l) => localStorage.setItem('labelsuite.lang', l), lang);
}

// Resolves tokens by painting them on a probe so values compare as rgb()/px.
async function expectChrome(page: Page, selector: string, want: Expected): Promise<void> {
  const el = page.locator(selector).first();
  await expect(el).toBeVisible();
  const got = await el.evaluate(
    (node, w) => {
      const cs = getComputedStyle(node);
      const probe = document.createElement('div');
      document.body.appendChild(probe);
      const paint = (prop: 'color' | 'backgroundColor' | 'borderRadius', v: string) => {
        probe.style[prop] = v;
        return getComputedStyle(probe)[prop];
      };
      const out = {
        padding: w.paddingBlockOnly
          ? `${cs.paddingTop} ${cs.paddingBottom}`
          : `${cs.paddingTop} ${cs.paddingRight} ${cs.paddingBottom} ${cs.paddingLeft}`,
        fontSize: cs.fontSize,
        weight: cs.fontWeight,
        radius: cs.borderTopLeftRadius,
        expectedRadius: paint('borderRadius', 'var(--radius-md)'),
        borderTop: cs.borderTopWidth,
        bg: cs.backgroundColor,
        expectedBg:
          w.bg === 'transparent' ? 'rgba(0, 0, 0, 0)' : paint('backgroundColor', `var(${w.bg})`),
        color: cs.color,
        expectedColor: paint('color', `var(${w.color})`),
        cursor: cs.cursor,
      };
      probe.remove();
      return out;
    },
    want,
  );
  expect(got.padding, `${selector} padding`).toBe(want.padding);
  expect(got.fontSize, `${selector} font-size`).toBe('14px');
  expect(got.weight, `${selector} font-weight`).toBe(want.weight);
  expect(got.radius, `${selector} radius`).toBe(got.expectedRadius);
  expect(got.borderTop, `${selector} border-top-width`).toBe(want.borderTop);
  expect(got.bg, `${selector} background`).toBe(got.expectedBg);
  expect(got.color, `${selector} color`).toBe(got.expectedColor);
  expect(got.cursor, `${selector} cursor`).toBe('pointer');
}

const CTA: Expected = {
  padding: '10px 20px 10px 20px',
  weight: '600',
  borderTop: '0px',
  bg: '--color-cta',
  color: '--color-on-cta',
};

for (const lang of ['zh', 'en'] as const) {
  test.describe(`Issue #1465 shared button: runtime (${lang})`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await seed(page, lang);
    });

    test('profile: .btn-primary and .btn-secondary use shared chrome', async ({ page }) => {
      await page.goto('/pages/account/profile.html');
      await expectChrome(page, '#saveProfileBtn', CTA);
      // The only .btn-secondary is the back button on the email-sent step; it
      // keeps a page-level horizontal padding, so only block padding is shared.
      await page.evaluate(() => (window as any).setState('emailSent'));
      await expectChrome(page, '.btn-secondary', {
        padding: '10px 10px',
        paddingBlockOnly: true,
        weight: '600',
        borderTop: '1px',
        bg: 'transparent',
        color: '--color-primary',
      });
    });

    test('role-settings: #editBtn (.btn-ghost) and #saveBtn (.btn-cta)', async ({ page }) => {
      await page.goto('/pages/admin/role-settings.html');
      await expectChrome(page, '#editBtn', {
        padding: '8px 12px 8px 12px',
        weight: '500',
        borderTop: '0px',
        bg: 'transparent',
        color: '--color-primary',
      });
      await page.locator('#editBtn').click();
      await expectChrome(page, '#saveBtn', CTA);
    });
  });
}
