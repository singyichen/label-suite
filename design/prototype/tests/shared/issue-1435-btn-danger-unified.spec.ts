/*
 * Traceability: issue #1435; design/system/MASTER.md §Modals / §Danger (solid) — one shared
 * solid destructive confirm `.btn-danger`, defined once in pages/shared/modal.css.
 *
 * TDD Red. Contract:
 *   - exactly one `.btn-danger { ... }` rule definition across pages/**, and it lives in
 *     pages/shared/modal.css (components-showcase.html's ghost styleguide variant is out of scope)
 *   - every page that uses the `btn-danger` class links shared/modal.css
 *   - opened through the real UI, every consumer button renders background --color-error,
 *     text --color-on-cta, weight 600, 14px, radius --radius-md; admin buttons (no `.btn`)
 *     get padding 8px 20px / no border / inline-flex (gap 6px, centred) from the unified rule; `.btn` pages keep
 *     the `.btn` padding 10px 20px
 *   - in dark theme the text/background contrast ratio is >= 4.5 (WCAG AA)
 *
 * Note: the task-detail taxonomy-delete modal is only reachable through a long taxonomy
 * setup, so it is opened via the `.show` class, as modal-shared-skeleton.spec.ts does.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import path from 'node:path';
import { test, expect } from '../fixtures';
import type { Page } from '@playwright/test';
import { openSettingsSection } from '../task-management/_task-detail-settings-helpers';

const PROTO = resolve(__dirname, '../..');
const PAGES = join(PROTO, 'pages');
const EXAMPLE_DATA = path.resolve(__dirname, '../../../../docs/product/example-data');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}
const sources = walk(PAGES).filter(
  (f) => /\.(css|html|js)$/.test(f) && !f.endsWith('components-showcase.html'),
);
const rel = (f: string) => relative(PROTO, f).split(path.sep).join('/');

/** Rule definitions whose selector is exactly `.btn-danger` (not :hover, not mini-btn-danger). */
const DEFINITION = /(?:^|\})\s*\.btn-danger\s*\{/gm;
/** The bare class token `btn-danger` in markup / JS class strings. */
const CLASS_TOKEN = /class(?:Name)?\s*=\s*["'][^"']*(?<![\w-])btn-danger(?![\w-])/;

test.describe('unified .btn-danger: static (#1435)', () => {
  test('exactly one .btn-danger rule definition exists across pages/**', () => {
    const defs = sources.flatMap((f) => {
      const n = (readFileSync(f, 'utf8').match(DEFINITION) ?? []).length;
      return n ? [`${rel(f)} x${n}`] : [];
    });
    expect(defs, `definitions found: ${defs.join(', ')}`).toHaveLength(1);
  });

  test('the single definition lives in pages/shared/modal.css', () => {
    const defs = sources
      .filter((f) => DEFINITION.test(readFileSync(f, 'utf8')) || ((DEFINITION.lastIndex = 0), false))
      .map(rel);
    DEFINITION.lastIndex = 0;
    expect(defs).toEqual(['pages/shared/modal.css']);
  });

  test('every page that uses the btn-danger class links shared/modal.css', () => {
    const htmls = sources.filter((f) => f.endsWith('.html'));
    const jsFilesWithClass = sources
      .filter((f) => f.endsWith('.js'))
      .filter((f) => CLASS_TOKEN.test(readFileSync(f, 'utf8')));
    const users = htmls.filter((f) => {
      const text = readFileSync(f, 'utf8');
      if (CLASS_TOKEN.test(text)) return true;
      return jsFilesWithClass.some((js) => text.includes(js.split(path.sep).pop()!));
    });
    expect(users.length, 'at least the six known consumer pages').toBeGreaterThanOrEqual(5);
    const missing = users
      .filter((f) => !/<link[^>]+href="[^"]*shared\/modal\.css"/.test(readFileSync(f, 'utf8')))
      .map(rel);
    expect(missing, `pages using btn-danger without shared/modal.css: ${missing.join(', ')}`).toEqual([]);
  });
});

type Target = {
  name: string;
  sel: string;
  hasBtn: boolean; // carries the `.btn` class (padding from .btn rule)
  open: (page: Page) => Promise<void>;
};

async function setupHierarchicalMultiLabel(page: Page) {
  await page.goto('/pages/task-management/task-new.html?task_role=project_leader', { waitUntil: 'load' });
  await page.waitForFunction(() => document.querySelectorAll('#taskCategoryChips [data-key]').length > 0);
  await page.fill('#taskNameInput', 'btn-danger-unify');
  await page.locator('#taskCategoryChips [data-key="classification"]').click();
  await page.locator('#taskInputTypeChips [data-key="single_item"]').click();
  await page.locator('#taskOutputTypeChips [data-key="multi_label"]').click();
  await page.locator('#datasetFileInput').setInputFiles(path.join(EXAMPLE_DATA, 'multi-label-hierarchical.json'));
  await expect(page.locator('.inline-dataset-preview-wrap')).toBeVisible();
  await page.locator('.inline-preview-role-select[aria-label$="text"]').selectOption('input');
  await page.locator('.inline-preview-role-select[aria-label$="gold_labels"]').selectOption('output');
  await page.evaluate(() => (window as unknown as { revalidateCurrentStep?: () => void }).revalidateCurrentStep?.());
  await page.locator('#nextBtn').click();
  await expect(page.locator('#step2Panel')).not.toHaveClass(/hidden/);
}

const TARGETS: Target[] = [
  {
    name: 'task-list #deleteTaskConfirmBtn',
    sel: '#deleteTaskConfirmBtn',
    hasBtn: true,
    open: async (page) => {
      await page.goto('/pages/task-management/task-list.html?task_role=project_leader');
      const row = page.locator('#taskTableBody tr[data-source-file="single-label.json"]');
      await row.getByRole('button', { name: '刪除' }).click();
      await expect(page.locator('#deleteTaskModal')).toBeVisible();
    },
  },
  {
    name: 'task-new #taxonomyDeleteConfirmBtn',
    sel: '#taxonomyDeleteConfirmBtn',
    hasBtn: true,
    open: async (page) => {
      await setupHierarchicalMultiLabel(page);
      const negativeRow = page
        .getByTestId('taxonomy-tree-editor')
        .locator('[data-testid="taxonomy-treeitem"][data-node-id="negative"]')
        .locator(':scope > .taxonomy-node-row');
      await negativeRow.hover();
      await negativeRow.getByRole('button', { name: '刪除' }).click();
      await expect(page.locator('#taxonomyDeleteModal')).toBeVisible();
    },
  },
  {
    name: 'task-detail #taxonomyDeleteConfirmBtn',
    sel: '#taxonomyDeleteConfirmBtn',
    hasBtn: true,
    open: async (page) => {
      await page.goto('/pages/task-management/task-detail.html?task_role=project_leader&task_id=T001');
      await page.locator('#taxonomyDeleteModal').waitFor({ state: 'attached' });
      await page.evaluate(() => document.querySelector('#taxonomyDeleteModal')!.classList.add('show'));
      await expect(page.locator('#taxonomyDeleteModal')).toBeVisible();
    },
  },
  {
    name: 'task-detail #settingsLeaveConfirmBtn',
    sel: '#settingsLeaveConfirmBtn',
    hasBtn: true,
    open: async (page) => {
      await page.goto('/pages/task-management/task-detail.html?task_role=project_leader&task_id=T001');
      await openSettingsSection(page, 'basic');
      await expect(page.locator('#overviewEditBtn')).toBeEnabled({ timeout: 15000 });
      await page.locator('#overviewEditBtn').click();
      await page.locator('#editTaskNameInput').fill('Edited task name 1435');
      await page.locator('#overviewCancelBtn').click();
      await expect(page.locator('#settingsLeaveModal')).toBeVisible();
    },
  },
  {
    name: 'user-management #disableConfirmBtn',
    sel: '#disableConfirmBtn',
    hasBtn: false,
    open: async (page) => {
      await page.goto('/pages/admin/user-management.html');
      await page.locator('#userTableBody tr', { hasText: 'Alex Wang' }).getByText('停用').click();
      await expect(page.locator('#disableConfirmBtn')).toBeVisible();
    },
  },
  {
    name: 'role-settings dirty-modal discard button',
    sel: '#dirtyModal .btn-danger',
    hasBtn: false,
    open: async (page) => {
      await page.goto('/pages/admin/role-settings.html');
      await page.locator('#editBtn').click();
      await page.locator('[data-key="task.create"][data-role="user"]').uncheck();
      await page.locator('#cancelBtn').click();
      await expect(page.locator('#dirtyModal')).toBeVisible();
    },
  },
];

type Rgb = [number, number, number];
function parseRgb(v: string): Rgb {
  const m = v.match(/rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)/);
  expect(m, `not an rgb() value: ${v}`).not.toBeNull();
  return [Number(m![1]), Number(m![2]), Number(m![3])];
}
function luminance([r, g, b]: Rgb): number {
  const f = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function contrast(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

async function resolveTokens(page: Page) {
  return page.evaluate(() => {
    const probe = document.createElement('div');
    document.body.appendChild(probe);
    probe.style.backgroundColor = 'var(--color-error)';
    probe.style.color = 'var(--color-on-cta)';
    probe.style.borderTopLeftRadius = 'var(--radius-md)';
    const cs = getComputedStyle(probe);
    const out = { error: cs.backgroundColor, onCta: cs.color, radius: cs.borderTopLeftRadius };
    probe.remove();
    return out;
  });
}

async function readStyle(page: Page, sel: string) {
  return page.locator(sel).evaluate((el) => {
    const cs = getComputedStyle(el);
    return {
      backgroundColor: cs.backgroundColor,
      color: cs.color,
      paddingTop: cs.paddingTop, paddingRight: cs.paddingRight,
      paddingBottom: cs.paddingBottom, paddingLeft: cs.paddingLeft,
      borderTopWidth: cs.borderTopWidth, borderTopStyle: cs.borderTopStyle, borderTopColor: cs.borderTopColor,
      fontWeight: cs.fontWeight, fontSize: cs.fontSize, borderRadius: cs.borderTopLeftRadius,
      display: cs.display, columnGap: cs.columnGap, alignItems: cs.alignItems,
    };
  });
}

for (const theme of ['light', 'dark'] as const) {
  test.describe(`unified .btn-danger: computed, ${theme} theme (#1435)`, () => {
    for (const t of TARGETS) {
      test(`${t.name}`, async ({ page }) => {
        await t.open(page);
        await page.evaluate((th) => document.documentElement.setAttribute('data-theme', th), theme);
        const tokens = await resolveTokens(page);
        const s = await readStyle(page, t.sel);

        expect(s.backgroundColor).toBe(tokens.error);
        expect(s.color).toBe(tokens.onCta);
        expect(s.fontWeight).toBe('600');
        expect(s.fontSize).toBe('14px');
        expect(s.borderRadius).toBe(tokens.radius);

        if (t.hasBtn) {
          expect([s.paddingTop, s.paddingRight, s.paddingBottom, s.paddingLeft]).toEqual(['10px', '20px', '10px', '20px']);
        } else {
          expect([s.paddingTop, s.paddingRight, s.paddingBottom, s.paddingLeft]).toEqual(['8px', '20px', '8px', '20px']);
          expect(s.borderTopWidth).toBe('0px');
          // inline-flex is blockified to `flex` inside the flex-row modal footer, so accept both
          expect(s.display).toMatch(/^(inline-)?flex$/);
          expect(s.alignItems).toBe('center');
          expect(s.columnGap).toBe('6px');
        }

        if (theme === 'dark') {
          // Guard the failing case this issue targets: white-ish text on #F87171 is below AA.
          expect(contrast([255, 255, 255], [248, 113, 113])).toBeLessThan(4.5);
          expect(contrast(parseRgb(s.color), parseRgb(s.backgroundColor))).toBeGreaterThanOrEqual(4.5);
        }
      });
    }
  });
}
