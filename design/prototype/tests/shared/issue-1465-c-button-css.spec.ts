/**
 * Issue #1465 PR-C: task-detail, task-list, task-new and user-management
 * converge on the shared button stylesheet (MASTER.md "Buttons"). Last batch.
 *
 * Contract:
 *   - each adopter links pages/shared/button.css
 *   - no page-owned rule whose selector is exactly .btn-primary / .btn-secondary
 *     / .btn-ghost / .btn-cta (incl. :hover/:disabled) re-declares the standard
 *     look; variants (.btn-link, .btn-danger, .mini-btn*) and layout-only bare
 *     rules (display/gap) may stay
 *   - runtime (zh + en): the visible standard buttons compute the shared chrome
 *   - non-standard .btn variants (.btn-link, .btn-danger) keep the page's .btn
 *     font (14px / 600) -- the `button, input, select { font: inherit }` reset
 *     must not outrank the zero-specificity `:where(.btn)` rule
 *   - MASTER.md "Buttons" names the four adopters; changelog has >= 3 #1465 rows
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
  'pages/task-management/task-detail.html',
  'pages/task-management/task-list.html',
  'pages/task-management/task-new.html',
  'pages/admin/user-management.html',
];
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

test.describe('Issue #1465-C shared button: static contract', () => {
  for (const file of ADOPTERS) {
    test(`${file} links button.css`, () => {
      const html = fs.readFileSync(path.join(PROTO_ROOT, file), 'utf8');
      expect(html).toMatch(LINK_RE);
    });

    test(`${file} owns no standard-look rule for the four classes`, () => {
      const html = fs.readFileSync(path.join(PROTO_ROOT, file), 'utf8');
      expect(standardLookRules(inlineStyleText(html)), 'page-owned standard button rules').toEqual([]);
    });
  }

  test('MASTER.md Buttons names the four adopters; changelog has a third #1465 row', () => {
    const master = fs.readFileSync(MASTER_PATH, 'utf8');
    const start = master.indexOf('### Buttons');
    expect(start).toBeGreaterThan(-1);
    const next = master.indexOf('\n### ', start + 5);
    const section = master.slice(start, next === -1 ? undefined : next);
    for (const a of [
      'task-management/task-detail',
      'task-management/task-list',
      'task-management/task-new',
      'admin/user-management',
    ]) {
      expect(section, a).toContain(a);
    }
    const rows = master.match(/\|\s*v[\d.]+\s*\|[^\n]*issue #1465/g) ?? [];
    expect(rows.length).toBeGreaterThanOrEqual(3);
  });
});

type Lang = 'zh' | 'en';
type Expected = {
  weight: string;
  borderTop: string;
  bg: string | 'transparent';
  color: string;
  padding: string; // full 4-value "<top> <right> <bottom> <left>"
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
        padding: `${cs.paddingTop} ${cs.paddingRight} ${cs.paddingBottom} ${cs.paddingLeft}`,
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

const PRIMARY: Expected = {
  padding: '10px 20px 10px 20px',
  weight: '600',
  borderTop: '0px',
  bg: '--color-cta',
  color: '--color-on-cta',
};
const SECONDARY: Expected = {
  padding: '10px 20px 10px 20px',
  weight: '600',
  borderTop: '1px',
  bg: 'transparent',
  color: '--color-primary',
};
const GHOST: Expected = {
  padding: '8px 12px 8px 12px',
  weight: '500',
  borderTop: '0px',
  bg: 'transparent',
  color: '--color-primary',
};

const DETAIL = '/pages/task-management/task-detail.html';
const LIST = '/pages/task-management/task-list.html?task_role=project_leader';
const NEW = '/pages/task-management/task-new.html';
const USERS = '/pages/admin/user-management.html';

for (const lang of ['zh', 'en'] as const) {
  test.describe(`Issue #1465-C shared button: runtime (${lang})`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await seed(page, lang);
    });

    // T002: waiting + IAA done -> official run (primary) and dry run (secondary) are both enabled.
    test('task-detail: #publishOfficialRunBtn (.btn.btn-primary)', async ({ page }) => {
      await page.goto(`${DETAIL}?task_id=T002&task_role=project_leader`);
      await expectChrome(page, '#publishOfficialRunBtn', PRIMARY);
    });

    test('task-detail: #publishDryRunBtn (.btn.btn-secondary)', async ({ page }) => {
      await page.goto(`${DETAIL}?task_id=T002&task_role=project_leader`);
      await expectChrome(page, '#publishDryRunBtn', SECONDARY);
    });

    test('task-list: #newTaskBtn (.btn.btn-primary)', async ({ page }) => {
      await page.goto(LIST);
      await expectChrome(page, '#newTaskBtn', PRIMARY);
    });

    test('task-list: #deleteTaskCancelBtn (.btn.btn-secondary)', async ({ page }) => {
      await page.goto(LIST);
      await page.locator('.mini-btn-danger').first().click();
      await expectChrome(page, '#deleteTaskCancelBtn', SECONDARY);
    });

    test('task-new: #cancelBtn (.btn.btn-ghost)', async ({ page }) => {
      await page.goto(NEW);
      await expectChrome(page, '#cancelBtn', GHOST);
    });

    // Step 1 ships #nextBtn disabled and #prevBtn hidden; lift both so the look is measurable.
    test('task-new: #nextBtn (.btn.btn-primary)', async ({ page }) => {
      await page.goto(NEW);
      await page.evaluate(() => ((document.getElementById('nextBtn') as HTMLButtonElement).disabled = false));
      await expectChrome(page, '#nextBtn', PRIMARY);
    });

    test('task-new: #prevBtn (.btn.btn-secondary)', async ({ page }) => {
      await page.goto(NEW);
      await page.evaluate(() => document.getElementById('prevBtn')!.classList.remove('hidden'));
      await expectChrome(page, '#prevBtn', SECONDARY);
    });

    test('user-management: #addUserBtn (.btn-primary)', async ({ page }) => {
      await page.goto(USERS);
      await expectChrome(page, '#addUserBtn', PRIMARY);
    });

    test('user-management: #addCancelBtn (.btn-ghost)', async ({ page }) => {
      await page.goto(USERS);
      await page.locator('#addUserBtn').click();
      await expectChrome(page, '#addCancelBtn', GHOST);
    });
  });
}

// Regression: the pages' element reset `button, input, select { font: inherit }`
// (specificity 0,0,1) beats a zero-specificity `:where(.btn)` font rule, so
// non-standard .btn variants lost the page's .btn size/weight. Values below are
// origin/main's computed values (verified on a baseline tree).
async function expectBtnFont(page: Page, selector: string): Promise<void> {
  const el = page.locator(selector).first();
  await expect(el).toBeVisible();
  const got = await el.evaluate((n) => {
    const cs = getComputedStyle(n);
    return { size: cs.fontSize, weight: cs.fontWeight };
  });
  expect(got.size, `${selector} font-size`).toBe('14px');
  expect(got.weight, `${selector} font-weight`).toBe('600');
}

for (const lang of ['zh', 'en'] as const) {
  test.describe(`Issue #1465-C shared button: non-standard variant font and rows (${lang})`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await seed(page, lang);
    });

    test('task-detail: #overviewEditBtn (.btn.btn-link) keeps .btn font 14px / 600', async ({ page }) => {
      await page.goto(`${DETAIL}?task_id=T013&task_role=project_leader&tab=settings`);
      await expectBtnFont(page, '#overviewEditBtn');
    });

    test('task-list: #deleteTaskConfirmBtn (.btn.btn-danger) keeps .btn font 14px / 600', async ({ page }) => {
      await page.goto(LIST);
      await page.locator('.mini-btn-danger').first().click();
      await expectBtnFont(page, '#deleteTaskConfirmBtn');
    });

    test('task-new: #prevBtn and #nextBtn share one height', async ({ page }) => {
      await page.goto(NEW);
      await page.evaluate(() => {
        (document.getElementById('nextBtn') as HTMLButtonElement).disabled = false;
        document.getElementById('prevBtn')!.classList.remove('hidden');
      });
      const prev = await page.locator('#prevBtn').boundingBox();
      const next = await page.locator('#nextBtn').boundingBox();
      expect(prev, 'prev box').not.toBeNull();
      expect(next, 'next box').not.toBeNull();
      expect(Math.abs(prev!.height - next!.height)).toBeLessThanOrEqual(1);
    });

    test('task-detail: #publishOfficialRunBtn and #publishDryRunBtn are equal height', async ({ page }) => {
      await page.goto(`${DETAIL}?task_id=T002&task_role=project_leader`);
      await expect(page.locator('#publishOfficialRunBtn')).toBeVisible();
      await expect(page.locator('#publishDryRunBtn')).toBeVisible();
      const official = await page.locator('#publishOfficialRunBtn').boundingBox();
      const dry = await page.locator('#publishDryRunBtn').boundingBox();
      expect(official, 'official box').not.toBeNull();
      expect(dry, 'dry box').not.toBeNull();
      expect(Math.abs(official!.height - dry!.height)).toBeLessThanOrEqual(1);
    });
  });
}
