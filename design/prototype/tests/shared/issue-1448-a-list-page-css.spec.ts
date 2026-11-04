/**
 * Issue #1448 PR-A: the list-page rules duplicated across dataset-analysis-list,
 * task-list and annotation-list move into pages/shared/list-page.css; PR-A adopts
 * it on dataset-analysis-list only. The same PR folds the three page-local
 * `.btn.btn-danger` patches into one rule in pages/shared/modal.css.
 *
 * Contract:
 *   - list-page.css exists; its element reset is `:where(button, input, select)` so
 *     page-local layout can still override it (lesson of #1465: a bare reset at
 *     (0,0,1) beats `:where()` rules)
 *   - dataset-analysis-list links it and owns none of the moved selectors (outside
 *     @media), except `.filter-select { min-width }` and `.task-table { min-width }`
 *   - runtime (zh + en): the dataset page keeps its pre-refactor computed look
 *     (values captured from origin/main before the refactor)
 *   - modal.css holds one `.btn.btn-danger { padding: 10px 20px; border: 1px solid
 *     transparent }`; task-detail / task-list / task-new no longer patch it locally;
 *     standalone `.btn-danger` (admin pages) keeps 8px 20px / no border
 *   - MASTER.md changelog has a v1.42 row naming #1448 and list-page.css
 *
 * Traceability: design/system/MASTER.md changelog; issue #1448
 */
import { test, expect } from '../fixtures';
import type { Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { openSettingsSection } from '../task-management/_task-detail-settings-helpers';

const PROTO_ROOT = path.resolve(__dirname, '../..');
const MASTER_PATH = path.resolve(PROTO_ROOT, '../system/MASTER.md');
const LIST_CSS = path.join(PROTO_ROOT, 'pages/shared/list-page.css');
const MODAL_CSS = path.join(PROTO_ROOT, 'pages/shared/modal.css');
const DATASET_FILE = 'pages/dataset/dataset-analysis-list.html';
const read = (rel: string) => fs.readFileSync(path.join(PROTO_ROOT, rel), 'utf8');

function inlineStyleText(html: string): string {
  return [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).join('\n');
}

// Drops comments and every @media / @supports block (responsive overrides may stay page-local).
function topLevelCss(css: string): string {
  let out = css.replace(/\/\*[\s\S]*?\*\//g, '');
  for (;;) {
    const at = out.search(/@(media|supports)[^{]*\{/);
    if (at === -1) return out;
    const open = out.indexOf('{', at);
    let depth = 1;
    let i = open + 1;
    while (i < out.length && depth > 0) {
      if (out[i] === '{') depth++;
      else if (out[i] === '}') depth--;
      i++;
    }
    out = out.slice(0, at) + out.slice(i);
  }
}

const MOVED = [
  'button', 'input', 'select',
  '.toolbar', '.toolbar-left', '.search-wrap', '.search-icon',
  '.search-input', '.search-input::placeholder', '.search-input:focus',
  '.filter-select', '.filter-select:focus',
  '.clear-btn', '.clear-btn:hover', '.clear-btn.hide-clear',
  '.task-table-wrap', '.task-table', '.task-table th', '.task-table td',
  '.pagination', '.pagination-left', '.pagination-info', '.pagination-controls',
  '.page-btn', '.page-btn:disabled', '.page-btn.active',
  '.page-btn:hover:not(:disabled):not(.active)',
  '.page-ellipsis', '.page-size-select',
];
// Deliberate page-owned overrides: selector -> the only declarations it may keep.
const ALLOWED_OVERRIDES: Record<string, string[]> = {
  '.filter-select': ['min-width'],
  '.task-table': ['min-width'],
};

function movedSelectorOffenders(css: string): string[] {
  const offenders: string[] = [];
  for (const m of topLevelCss(css).matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const props = m[2].split(';').map((d) => d.split(':')[0].trim().toLowerCase()).filter(Boolean);
    for (const raw of m[1].split(',')) {
      const sel = raw.trim().replace(/\s+/g, ' ');
      if (!MOVED.includes(sel)) continue;
      const allowed = ALLOWED_OVERRIDES[sel];
      if (allowed && props.every((p) => allowed.includes(p))) continue;
      offenders.push(`${sel} { ${props.join(', ')} }`);
    }
  }
  return offenders;
}

test.describe('Issue #1448-A list-page.css: static contract', () => {
  test('pages/shared/list-page.css exists and wraps the element reset in :where()', () => {
    expect(fs.existsSync(LIST_CSS), 'list-page.css exists').toBe(true);
    const css = fs.readFileSync(LIST_CSS, 'utf8');
    expect(css).toContain(':where(button, input, select)');
    expect(css).toMatch(/:where\(button, input, select\)\s*\{[^}]*font:\s*inherit/);
    // A bare `button, input, select { ... }` (0,0,1) would outrank the :where() layout rules.
    expect(css.replace(/\/\*[\s\S]*?\*\//g, '')).not.toMatch(/(^|\})\s*button\s*,\s*input\s*,\s*select\s*\{/);
  });

  test('list-page.css defines every moved selector', () => {
    expect(fs.existsSync(LIST_CSS), 'list-page.css exists').toBe(true);
    const css = fs.readFileSync(LIST_CSS, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    const missing = [
      '.toolbar', '.toolbar-left', '.search-wrap', '.search-icon', '.search-input',
      '.filter-select', '.clear-btn', '.task-table-wrap', '.task-table', '.pagination',
      '.pagination-left', '.pagination-info', '.pagination-controls', '.page-btn',
      '.page-ellipsis', '.page-size-select',
    ].filter((s) => !css.includes(s));
    expect(missing, 'selectors missing from list-page.css').toEqual([]);
  });

  test('dataset-analysis-list links ../shared/list-page.css', () => {
    expect(read(DATASET_FILE)).toMatch(
      /<link[^>]+rel="stylesheet"[^>]+href="\.\.\/shared\/list-page\.css"|<link[^>]+href="\.\.\/shared\/list-page\.css"[^>]+rel="stylesheet"/,
    );
  });

  test('dataset-analysis-list inline style owns none of the moved selectors', () => {
    expect(movedSelectorOffenders(inlineStyleText(read(DATASET_FILE))), 'page-owned moved rules').toEqual([]);
  });

  test('dataset-analysis-list keeps its deliberate overrides', () => {
    const css = topLevelCss(inlineStyleText(read(DATASET_FILE)));
    expect(css).toMatch(/\.filter-select\s*\{[^}]*min-width:\s*160px/);
    expect(css).toMatch(/\.task-table\s*\{[^}]*min-width:\s*760px/);
  });
});

test.describe('Issue #1448-A MASTER.md changelog', () => {
  test('has a v1.42 row naming #1448 and list-page.css', () => {
    const master = fs.readFileSync(MASTER_PATH, 'utf8');
    const row = master.split('\n').find((l) => /^\|\s*v1\.42\s*\|/.test(l));
    expect(row, 'v1.42 changelog row').toBeDefined();
    expect(row).toContain('#1448');
    expect(row).toContain('list-page.css');
  });
});

type Lang = 'zh' | 'en';
async function seed(page: Page, lang: Lang): Promise<void> {
  await page.addInitScript((l) => {
    localStorage.setItem('labelsuite.lang', l);
    localStorage.setItem('labelsuite.guidelineModalSeen', '1');
  }, lang);
}

// Baseline captured from the unmodified tree (origin/main 470cb63b) at 1440x900, zh and en identical.
const BORDER = '1px solid rgb(226, 232, 240)';
const BASELINE: Record<string, Record<string, string>> = {
  '.toolbar': { display: 'flex', flexWrap: 'wrap', alignItems: 'center', columnGap: '8px', rowGap: '8px', marginBottom: '24px' },
  '.toolbar-left': { display: 'flex', alignItems: 'center', columnGap: '8px', flexWrap: 'wrap' },
  '.search-wrap': { position: 'relative', display: 'flex', alignItems: 'center', minWidth: '220px', width: '280px', maxWidth: '280px' },
  '.search-icon': { position: 'absolute', width: '15px', height: '15px' },
  '.search-input': {
    paddingTop: '9px', paddingRight: '12px', paddingBottom: '9px', paddingLeft: '36px',
    borderTop: BORDER, borderTopLeftRadius: '8px', fontSize: '14px', fontWeight: '400',
    backgroundColor: 'rgb(255, 255, 255)', cursor: 'pointer', width: '280px',
  },
  '.filter-select': {
    paddingTop: '9px', paddingRight: '32px', paddingBottom: '9px', paddingLeft: '12px',
    borderTop: BORDER, borderTopLeftRadius: '8px', fontSize: '14px', fontWeight: '400',
    backgroundColor: 'rgb(255, 255, 255)', minWidth: '160px', cursor: 'pointer',
  },
  '.clear-btn': {
    display: 'flex', alignItems: 'center', columnGap: '4px',
    paddingTop: '8px', paddingRight: '12px', paddingBottom: '8px', paddingLeft: '12px',
    borderTop: BORDER, borderTopLeftRadius: '8px', fontSize: '13px', fontWeight: '500',
    color: 'rgb(100, 116, 139)', backgroundColor: 'rgb(255, 255, 255)', cursor: 'pointer',
  },
  '.task-table-wrap': { display: 'block', overflowX: 'auto' },
  '.task-table': { display: 'table', borderCollapse: 'collapse', fontSize: '14px', minWidth: '760px', whiteSpace: 'nowrap', textAlign: 'left' },
  '.task-table th': {
    paddingTop: '12px', paddingRight: '20px', paddingBottom: '12px', paddingLeft: '20px',
    fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.55px',
    color: 'rgb(100, 116, 139)', backgroundColor: 'rgb(248, 250, 252)', borderBottom: BORDER, textAlign: 'left',
  },
  '.task-table td': {
    paddingTop: '14px', paddingRight: '20px', paddingBottom: '14px', paddingLeft: '20px',
    borderBottom: '1px solid rgb(241, 245, 249)', textAlign: 'left',
  },
  '.pagination': {
    display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', columnGap: '16px',
    paddingTop: '16px', paddingRight: '24px', paddingBottom: '16px', paddingLeft: '24px', borderTop: BORDER,
  },
  '.pagination-left': { display: 'flex', alignItems: 'center', columnGap: '16px' },
  '.pagination-info': { fontSize: '13px', color: 'rgb(100, 116, 139)' },
  '.pagination-controls': { display: 'flex', alignItems: 'center', columnGap: '4px' },
  '.page-btn': {
    width: '32px', height: '32px',
    paddingTop: '0px', paddingRight: '8px', paddingBottom: '0px', paddingLeft: '8px',
    borderTop: BORDER, borderTopLeftRadius: '8px', fontSize: '13px', fontWeight: '500',
    backgroundColor: 'rgb(255, 255, 255)', justifyContent: 'center', cursor: 'not-allowed', opacity: '0.4',
  },
  '.page-size-select': {
    paddingTop: '5px', paddingRight: '28px', paddingBottom: '5px', paddingLeft: '10px',
    borderTop: BORDER, borderTopLeftRadius: '8px', fontSize: '13px', fontWeight: '400',
    backgroundColor: 'rgb(255, 255, 255)', cursor: 'pointer',
  },
};
// Properties whose baseline is "an image is present" rather than a literal value.
const HAS_BG_IMAGE = ['.filter-select', '.page-size-select'];

for (const lang of ['zh', 'en'] as const) {
  test.describe(`Issue #1448-A dataset-analysis-list computed baseline (${lang})`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await seed(page, lang);
      await page.goto('/pages/dataset/dataset-analysis-list.html');
      await page.waitForSelector('.task-table tbody tr');
    });

    for (const [selector, want] of Object.entries(BASELINE)) {
      test(`${selector} keeps its pre-refactor look`, async ({ page }) => {
        const got = await page.locator(selector).first().evaluate((el, props) => {
          const cs = getComputedStyle(el) as unknown as Record<string, string>;
          return Object.fromEntries(props.map((p) => [p, cs[p]]));
        }, Object.keys(want));
        expect(got, selector).toEqual(want);
        if (HAS_BG_IMAGE.includes(selector)) {
          const img = await page.locator(selector).first().evaluate((el) => getComputedStyle(el).backgroundImage);
          expect(img, `${selector} chevron background-image`).toContain('data:image/svg+xml');
        }
      });
    }

    test('element reset: button / input / select inherit the page font and keep the pointer cursor', async ({ page }) => {
      const got = await page.evaluate(() => {
        const bodyFont = getComputedStyle(document.body).fontFamily;
        const pick = (sel: string) => {
          const cs = getComputedStyle(document.querySelector(sel)!);
          return { family: cs.fontFamily, cursor: cs.cursor };
        };
        return {
          bodyFont,
          button: pick('#clearFiltersBtn'),
          input: pick('#searchInput'),
          select: pick('#outputTypeFilter'),
        };
      });
      expect(got.bodyFont).toContain('Inter');
      for (const k of ['button', 'input', 'select'] as const) {
        expect(got[k].family, `${k} font-family`).toBe(got.bodyFont);
        expect(got[k].cursor, `${k} cursor`).toBe('pointer');
      }
    });

    test('.task-table keeps the page-local min-width 760px', async ({ page }) => {
      await expect(page.locator('.task-table')).toHaveCSS('min-width', '760px');
    });

    test('.filter-select keeps the dataset page min-width 160px', async ({ page }) => {
      await expect(page.locator('.filter-select').first()).toHaveCSS('min-width', '160px');
    });
  });
}

// ---------------------------------------------------------------- btn-danger fold

test.describe('Issue #1448-A .btn.btn-danger: static contract', () => {
  test('modal.css holds one .btn.btn-danger rule with padding 10px 20px and a 1px transparent border', () => {
    const css = fs.readFileSync(MODAL_CSS, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    const rules = [...css.matchAll(/\.btn\.btn-danger\s*\{([^}]*)\}/g)];
    expect(rules, '.btn.btn-danger rules in modal.css').toHaveLength(1);
    const body = rules[0][1].replace(/\s+/g, ' ');
    expect(body).toMatch(/padding:\s*10px 20px/);
    expect(body).toMatch(/border:\s*1px solid transparent/);
  });

  for (const file of [
    'pages/task-management/task-detail.html',
    'pages/task-management/task-list.html',
    'pages/task-management/task-new.html',
  ]) {
    test(`${file} has no page-local .btn.btn-danger patch`, () => {
      const css = inlineStyleText(read(file)).replace(/\/\*[\s\S]*?\*\//g, '');
      expect(css).not.toMatch(/\.btn\.btn-danger/);
    });
  }
});

type DangerTarget = {
  name: string;
  confirm: string;
  cancel: string;
  open: (page: Page) => Promise<void>;
};
const DETAIL = '/pages/task-management/task-detail.html?task_role=project_leader&task_id=T001';

const SHARED_BTN_TARGETS: DangerTarget[] = [
  {
    name: 'task-list #deleteTaskConfirmBtn',
    confirm: '#deleteTaskConfirmBtn',
    cancel: '#deleteTaskCancelBtn',
    open: async (page) => {
      await page.goto('/pages/task-management/task-list.html?task_role=project_leader');
      await page.locator('.mini-btn-danger').first().click();
      await expect(page.locator('#deleteTaskModal')).toBeVisible();
    },
  },
  {
    name: 'task-new #taxonomyDeleteConfirmBtn',
    confirm: '#taxonomyDeleteConfirmBtn',
    cancel: '#taxonomyDeleteCancelBtn',
    open: async (page) => {
      await page.goto('/pages/task-management/task-new.html?task_role=project_leader');
      await page.evaluate(() => document.querySelector('#taxonomyDeleteModal')!.classList.add('show'));
      await expect(page.locator('#taxonomyDeleteModal')).toBeVisible();
    },
  },
  {
    name: 'task-detail #taxonomyDeleteConfirmBtn',
    confirm: '#taxonomyDeleteConfirmBtn',
    cancel: '#taxonomyDeleteCancelBtn',
    open: async (page) => {
      await page.goto(DETAIL);
      await page.locator('#taxonomyDeleteModal').waitFor({ state: 'attached' });
      await page.evaluate(() => document.querySelector('#taxonomyDeleteModal')!.classList.add('show'));
      await expect(page.locator('#taxonomyDeleteModal')).toBeVisible();
    },
  },
  {
    name: 'task-detail #settingsLeaveConfirmBtn',
    confirm: '#settingsLeaveConfirmBtn',
    cancel: '#settingsLeaveCancelBtn',
    open: async (page) => {
      await page.goto(DETAIL);
      await openSettingsSection(page, 'basic');
      await expect(page.locator('#overviewEditBtn')).toBeEnabled({ timeout: 15000 });
      await page.locator('#overviewEditBtn').click();
      await page.locator('#editTaskNameInput').fill('Edited task name 1448');
      await page.locator('#overviewCancelBtn').click();
      await expect(page.locator('#settingsLeaveModal')).toBeVisible();
    },
  },
];

for (const lang of ['zh', 'en'] as const) {
  test.describe(`Issue #1448-A .btn.btn-danger geometry (${lang})`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await seed(page, lang);
    });

    for (const t of SHARED_BTN_TARGETS) {
      test(`${t.name}: padding 10px 20px, 1px transparent border, same height as Cancel`, async ({ page }) => {
        await t.open(page);
        const got = await page.locator(t.confirm).evaluate((el) => {
          const cs = getComputedStyle(el);
          return {
            padding: `${cs.paddingTop} ${cs.paddingRight} ${cs.paddingBottom} ${cs.paddingLeft}`,
            borderWidth: cs.borderTopWidth,
            borderStyle: cs.borderTopStyle,
            borderColor: cs.borderTopColor,
          };
        });
        expect(got.padding, 'padding').toBe('10px 20px 10px 20px');
        expect(got.borderWidth, 'border-top-width').toBe('1px');
        expect(got.borderStyle, 'border-top-style').toBe('solid');
        expect(got.borderColor, 'border-top-color').toBe('rgba(0, 0, 0, 0)');
        const confirm = await page.locator(t.confirm).boundingBox();
        const cancel = await page.locator(t.cancel).boundingBox();
        expect(confirm, 'confirm box').not.toBeNull();
        expect(cancel, 'cancel box').not.toBeNull();
        expect(Math.abs(confirm!.height - cancel!.height)).toBeLessThanOrEqual(1);
      });
    }

    // Standalone .btn-danger (no .btn): the compound `.btn.btn-danger` rule must not leak onto it.
    test('user-management #disableConfirmBtn (standalone .btn-danger) keeps 8px 20px and no border', async ({ page }) => {
      await page.goto('/pages/admin/user-management.html');
      await page.evaluate(() => (window as unknown as { openDisableModal: (id: string) => void }).openDisableModal('u-002'));
      await expect(page.locator('#disableConfirmBtn')).toBeVisible();
      const got = await page.locator('#disableConfirmBtn').evaluate((el) => {
        const cs = getComputedStyle(el);
        return {
          padding: `${cs.paddingTop} ${cs.paddingRight} ${cs.paddingBottom} ${cs.paddingLeft}`,
          borderWidth: cs.borderTopWidth,
          borderStyle: cs.borderTopStyle,
        };
      });
      expect(got.padding, 'padding').toBe('8px 20px 8px 20px');
      expect(got.borderStyle, 'border-top-style').toBe('none');
      expect(got.borderWidth, 'border-top-width').toBe('0px');
    });

    test('role-settings dirty-modal discard (standalone .btn-danger) keeps 8px 20px and no border', async ({ page }) => {
      await page.goto('/pages/admin/role-settings.html');
      await page.locator('#editBtn').click();
      await page.locator('[data-key="task.create"][data-role="user"]').uncheck();
      await page.locator('#cancelBtn').click();
      await expect(page.locator('#dirtyModal')).toBeVisible();
      const got = await page.locator('#dirtyModal .btn-danger').evaluate((el) => {
        const cs = getComputedStyle(el);
        return {
          padding: `${cs.paddingTop} ${cs.paddingRight} ${cs.paddingBottom} ${cs.paddingLeft}`,
          borderWidth: cs.borderTopWidth,
          borderStyle: cs.borderTopStyle,
        };
      });
      expect(got.padding, 'padding').toBe('8px 20px 8px 20px');
      expect(got.borderStyle, 'border-top-style').toBe('none');
      expect(got.borderWidth, 'border-top-width').toBe('0px');
    });
  });
}
