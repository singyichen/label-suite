/**
 * Issue #1465 PR-B: annotation-list, annotation-workspace,
 * dataset-analysis-detail and dashboard converge on the shared button
 * stylesheet (MASTER.md "Buttons").
 *
 * Contract:
 *   - each adopter links pages/shared/button.css
 *   - no page-owned rule whose selector is exactly .btn-primary / .btn-secondary
 *     / .btn-ghost / .btn-cta (incl. :hover/:disabled) re-declares the standard
 *     look; variants (.btn-primary.slim, .btn-sm, .mini-btn*) and layout-only
 *     bare rules may stay. Dashboard styles live in dashboard.layout.css.
 *   - runtime (zh + en): the visible standard buttons compute the shared chrome
 *   - MASTER.md "Buttons" names the four adopters; changelog has >= 2 #1465 rows
 *
 * Traceability: design/system/MASTER.md "Buttons"; issue #1465
 */
import { test, expect } from '../fixtures';
import type { Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const PROTO_ROOT = path.resolve(__dirname, '../..');
const MASTER_PATH = path.resolve(PROTO_ROOT, '../system/MASTER.md');
const ADOPTERS = [
  'pages/annotation/annotation-list.html',
  'pages/annotation/annotation-workspace.html',
  'pages/dataset/dataset-analysis-detail.html',
  'pages/dashboard/dashboard.html',
];
// CSS text that carries each adopter's own rules (dashboard keeps them in a sheet).
const STYLE_SOURCES: Record<string, string[]> = {
  'pages/dashboard/dashboard.html': ['pages/dashboard/dashboard.layout.css'],
};
const LINK_RE =
  /<link[^>]+rel="stylesheet"[^>]+href="\.\.\/shared\/button\.css"|<link[^>]+href="\.\.\/shared\/button\.css"[^>]+rel="stylesheet"/;
const LOOK_PROPS = [
  'background', 'color', 'border', 'padding', 'border-radius', 'font-size',
  'font-weight', 'cursor', 'opacity', 'transform', 'transition',
];

function inlineStyleText(html: string): string {
  return [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).join('\n');
}

// Returns "<selector> { <prop> }" offenders for exact standard-class selectors.
function standardLookRules(css: string): string[] {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const offenders: string[] = [];
  for (const m of clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selectors = m[1].split(',').map((s) => s.trim());
    const exact = selectors.filter((s) =>
      /^\.btn-(primary|secondary|ghost|cta)(:(hover|disabled|focus-visible)(:not\(:disabled\))?)*$/.test(s),
    );
    if (!exact.length) continue;
    const props = m[2]
      .split(';')
      .map((d) => d.split(':')[0].trim().toLowerCase())
      .filter(Boolean);
    const hit = props.filter((p) => LOOK_PROPS.some((l) => p === l || p.startsWith(`${l}-`)));
    if (hit.length) offenders.push(`${exact.join(', ')} { ${hit.join(', ')} }`);
  }
  return offenders;
}

test.describe('Issue #1465-B shared button: static contract', () => {
  for (const file of ADOPTERS) {
    test(`${file} links button.css`, () => {
      const html = fs.readFileSync(path.join(PROTO_ROOT, file), 'utf8');
      expect(html).toMatch(LINK_RE);
    });

    test(`${file} owns no standard-look rule for the four classes`, () => {
      const html = fs.readFileSync(path.join(PROTO_ROOT, file), 'utf8');
      const css = [
        inlineStyleText(html),
        ...(STYLE_SOURCES[file] ?? []).map((f) => fs.readFileSync(path.join(PROTO_ROOT, f), 'utf8')),
      ].join('\n');
      expect(standardLookRules(css), 'page-owned standard button rules').toEqual([]);
    });
  }

  test('MASTER.md Buttons names the four adopters; changelog has a second #1465 row', () => {
    const master = fs.readFileSync(MASTER_PATH, 'utf8');
    const start = master.indexOf('### Buttons');
    expect(start).toBeGreaterThan(-1);
    const next = master.indexOf('\n### ', start + 5);
    const section = master.slice(start, next === -1 ? undefined : next);
    for (const a of [
      'annotation/annotation-list',
      'annotation/annotation-workspace',
      'dashboard/dashboard',
      'dataset/dataset-analysis-detail',
    ]) {
      expect(section, a).toContain(a);
    }
    const rows = master.match(/\|\s*v[\d.]+\s*\|[^\n]*issue #1465/g) ?? [];
    expect(rows.length).toBeGreaterThanOrEqual(2);
  });
});

type Lang = 'zh' | 'en';
type Expected = {
  weight: string;
  borderTop: string;
  bg: string | 'transparent';
  color: string;
  padding: string; // "<top> <bottom>" (block only when blockOnly) or full 4-value
  blockOnly?: boolean;
  fontSize?: string; // defaults to 14px; .btn-sm keeps its own 13px
};

async function seed(page: Page, lang: Lang): Promise<void> {
  await page.addInitScript((l) => {
    localStorage.setItem('labelsuite.lang', l);
    localStorage.setItem('labelsuite.guidelineModalSeen', '1');
  }, lang);
}

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
        padding: w.blockOnly
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
  expect(got.fontSize, `${selector} font-size`).toBe(want.fontSize ?? '14px');
  expect(got.weight, `${selector} font-weight`).toBe(want.weight);
  expect(got.radius, `${selector} radius`).toBe(got.expectedRadius);
  expect(got.borderTop, `${selector} border-top-width`).toBe(want.borderTop);
  expect(got.bg, `${selector} background`).toBe(got.expectedBg);
  expect(got.color, `${selector} color`).toBe(got.expectedColor);
  expect(got.cursor, `${selector} cursor`).toBe('pointer');
}

const PRIMARY: Expected = {
  padding: '10px 20px 10px 20px',
  weight: '600',
  borderTop: '0px',
  bg: '--color-cta',
  color: '--color-on-cta',
};
const PRIMARY_BLOCK: Expected = { ...PRIMARY, padding: '10px 10px', blockOnly: true };
const SECONDARY_BLOCK: Expected = {
  padding: '10px 10px',
  blockOnly: true,
  weight: '600',
  borderTop: '1px',
  bg: 'transparent',
  color: '--color-primary',
};

async function openScenario(page: Page, scenario: string): Promise<void> {
  await page.goto('/pages/dashboard/dashboard.html');
  const pill = page.locator(`.scenario-pill[data-scenario="${scenario}"]`);
  await expect(pill).toBeVisible();
  await pill.click();
}

for (const lang of ['zh', 'en'] as const) {
  test.describe(`Issue #1465-B shared button: runtime (${lang})`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await seed(page, lang);
    });

    test('annotation-list: #taskQuickContinueBtn (.btn-primary.slim)', async ({ page }) => {
      await page.goto(
        '/pages/annotation/annotation-list.html?task_id=T001&role=annotator&run_type=official_run',
      );
      await expectChrome(page, '#taskQuickContinueBtn', PRIMARY_BLOCK);
    });

    test('annotation-workspace: #wsSubmitBtn (.btn-cta)', async ({ page }) => {
      await page.goto(
        '/pages/annotation/annotation-workspace.html?task_id=T001&sample_id=sent-001&role=annotator&run_type=official_run',
      );
      await expectChrome(page, '#wsSubmitBtn', PRIMARY);
    });

    test('dataset-analysis-detail: #statsEmptyBtn (.btn-secondary.btn-sm)', async ({ page }) => {
      await page.goto('/pages/dataset/dataset-analysis-detail.html?task_id=T001&s_state=empty');
      await expectChrome(page, '#statsEmptyBtn', SECONDARY_BLOCK_SM());
    });

    test('dataset-analysis-detail: panel-load retry (.btn-secondary.btn-sm)', async ({ page }) => {
      await page.route('**/dataset-analysis-detail.partials/quality-*.html', (r) => r.abort());
      await page.goto('/pages/dataset/dataset-analysis-detail.html?task_id=T001&tab=quality');
      await expectChrome(page, '#qualityPanelMount .panel-load-error button', SECONDARY_BLOCK_SM());
    });

    test('dashboard: annotator .role-task-action-btn (.btn-primary)', async ({ page }) => {
      await openScenario(page, 'annotator');
      await expectChrome(page, '#annotatorTaskList .role-task-action-btn', PRIMARY);
    });

    test('dashboard: #adminViewAllBtn (.btn-secondary.slim)', async ({ page }) => {
      await openScenario(page, 'super_admin_data');
      await expectChrome(page, '#adminViewAllBtn', SECONDARY_BLOCK);
    });

    test('dashboard: #plViewAllBtn (.btn-secondary.slim)', async ({ page }) => {
      await openScenario(page, 'project_leader');
      await expectChrome(page, '#plViewAllBtn', SECONDARY_BLOCK);
    });
  });
}

// .btn-sm keeps its own padding and 13px size; weight/border/colour still come from button.css.
function SECONDARY_BLOCK_SM(): Expected {
  return { ...SECONDARY_BLOCK, padding: '6px 6px', fontSize: '13px' };
}

// Regression: the pages' element reset `button, input, select { font: inherit }`
// (specificity 0,0,1) beats the zero-specificity `:where(.btn)` font rule, so
// non-standard .btn variants lost the page's .btn size/weight. Values below
// equal each page's `:where(.btn)` rule (and origin/main behaviour).
for (const lang of ['zh', 'en'] as const) {
  test.describe(`Issue #1465-B shared button: non-standard variant font (${lang})`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await seed(page, lang);
    });

    test('annotation-workspace: #wsSaveBtn (.btn-outline) keeps .btn font 13px / 600', async ({ page }) => {
      await page.goto(
        '/pages/annotation/annotation-workspace.html?task_id=T001&sample_id=sent-001&role=annotator&run_type=official_run',
      );
      const save = page.locator('#wsSaveBtn');
      await expect(save).toBeVisible();
      const got = await save.evaluate((n) => {
        const cs = getComputedStyle(n);
        return { size: cs.fontSize, weight: cs.fontWeight };
      });
      expect(got.size, '#wsSaveBtn font-size').toBe('13px');
      expect(got.weight, '#wsSaveBtn font-weight').toBe('600');
    });

    test('dashboard: #ctaLeaderBtn (.btn-emerald.btn-full) keeps .btn font 14px / 600', async ({ page }) => {
      await page.goto('/pages/dashboard/dashboard.html');
      const cta = page.locator('#ctaLeaderBtn');
      await expect(cta).toBeVisible();
      const got = await cta.evaluate((n) => {
        const cs = getComputedStyle(n);
        return { size: cs.fontSize, weight: cs.fontWeight };
      });
      expect(got.size, '#ctaLeaderBtn font-size').toBe('14px');
      expect(got.weight, '#ctaLeaderBtn font-weight').toBe('600');
    });

    test('annotation-workspace: #wsSaveBtn and #wsSubmitBtn are equal height', async ({ page }) => {
      await page.goto(
        '/pages/annotation/annotation-workspace.html?task_id=T001&sample_id=sent-001&role=annotator&run_type=official_run',
      );
      const save = await page.locator('#wsSaveBtn').boundingBox();
      const submit = await page.locator('#wsSubmitBtn').boundingBox();
      expect(save, 'save box').not.toBeNull();
      expect(submit, 'submit box').not.toBeNull();
      expect(Math.abs(save!.height - submit!.height)).toBeLessThanOrEqual(1);
    });
  });
}
