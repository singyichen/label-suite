/**
 * Issue #1448 PR-C: the task-type badge palette (.badge-task-type-{single,sequence,relation,
 * pairs,scoring,default}, light rules + html[data-theme="dark"] overrides) moves into ONE shared
 * file, pages/shared/task-type-badge.css. GOAL: zero visible change, so the runtime half pins the
 * computed values of the unmodified tree (origin/main adfc21e0) and must pass before AND after.
 *
 * Contract:
 *   - pages/shared/task-type-badge.css is the single definition (6 light + 6 dark triples)
 *   - dashboard.html, task-list.html, annotation-list.html, dataset-analysis-list.html link it
 *   - dashboard.layout.css, dashboard.components.css, task-list.html, annotation-list.html,
 *     dataset-analysis-list.html and dataset-analysis-detail.html (dead dark-only copy) own no
 *     `.badge-task-type-*` rule any more
 *   - cascade: the page `.badge { border: 1px solid transparent }` shorthand resets border-color
 *     when the shared file loads earlier at equal specificity, so the shared file must load AFTER
 *     each page's badge base rule. Pinned through the border-color computed values, not link order.
 *   - MASTER.md changelog has a v1.44 row naming #1448 and task-type-badge.css
 *
 * Traceability: design/system/MASTER.md changelog; issue #1448
 */
import { test, expect } from '../fixtures';
import type { Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { buildListUrl } from '../annotation/_workspace-helpers';

const PROTO_ROOT = path.resolve(__dirname, '../..');
const MASTER_PATH = path.resolve(PROTO_ROOT, '../system/MASTER.md');
const SHARED_FILE = 'pages/shared/task-type-badge.css';
const read = (rel: string) => fs.readFileSync(path.join(PROTO_ROOT, rel), 'utf8');
const stripComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '');

type Kind = 'single' | 'sequence' | 'relation' | 'pairs' | 'scoring' | 'default';
type Triple = { color: string; bg: string; border: string };
const KINDS: Kind[] = ['single', 'sequence', 'relation', 'pairs', 'scoring', 'default'];

const LIGHT: Record<Kind, Triple> = {
  single: { color: '#0E7490', bg: '#ECFEFF', border: '#A5F3FC' },
  sequence: { color: '#7C2D12', bg: '#FFF7ED', border: '#FDBA74' },
  relation: { color: '#155E75', bg: '#ECFEFF', border: '#67E8F9' },
  pairs: { color: '#065F46', bg: '#ECFDF5', border: '#A7F3D0' },
  scoring: { color: '#7E22CE', bg: '#FAF5FF', border: '#E9D5FF' },
  default: { color: '#334155', bg: '#F8FAFC', border: '#CBD5E1' },
};
const DARK: Record<Kind, Triple> = {
  single: { color: '#A5F3FC', bg: '#0C2230', border: '#155E75' },
  sequence: { color: '#FB923C', bg: '#2A1805', border: '#7C3A16' },
  relation: { color: '#A5F3FC', bg: '#0C2230', border: '#155E75' },
  pairs: { color: '#4ADE80', bg: '#0F2A18', border: '#1F5132' },
  scoring: { color: '#C084FC', bg: '#1A0A2E', border: '#4C1D95' },
  default: { color: '#94A3B8', bg: '#1F1F28', border: '#2A2A35' },
};
const PALETTE = { light: LIGHT, dark: DARK } as const;

function rgb(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
}
const expectedRgb = (t: Triple) => ({ color: rgb(t.color), bg: rgb(t.bg), border: rgb(t.border) });

// --- static helpers -----------------------------------------------------------------------
type Rule = { selector: string; decls: Record<string, string> };
function rules(css: string): Rule[] {
  const out: Rule[] = [];
  for (const m of stripComments(css).matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const decls: Record<string, string> = {};
    for (const d of m[2].split(';')) {
      const i = d.indexOf(':');
      if (i > 0) decls[d.slice(0, i).trim().toLowerCase()] = d.slice(i + 1).trim().toUpperCase();
    }
    out.push({ selector: m[1].trim().replace(/\s+/g, ' '), decls });
  }
  return out;
}
function paletteRule(css: string, theme: 'light' | 'dark', kind: Kind): Rule | undefined {
  return rules(css).find((r) => {
    const dark = /data-theme=["']dark["']/.test(r.selector);
    return (theme === 'dark') === dark && new RegExp(`\\.badge-task-type-${kind}(?![\\w-])`).test(r.selector);
  });
}

const COPY_OWNERS = [
  'pages/dashboard/dashboard.layout.css',
  'pages/dashboard/dashboard.components.css',
  'pages/task-management/task-list.html',
  'pages/annotation/annotation-list.html',
  'pages/dataset/dataset-analysis-list.html',
  'pages/dataset/dataset-analysis-detail.html',
];
const RENDERING_PAGES = [
  'pages/dashboard/dashboard.html',
  'pages/task-management/task-list.html',
  'pages/annotation/annotation-list.html',
  'pages/dataset/dataset-analysis-list.html',
];

test.describe('Issue #1448-C task-type-badge.css: static contract', () => {
  test('shared file exists', () => {
    expect(fs.existsSync(path.join(PROTO_ROOT, SHARED_FILE)), SHARED_FILE).toBe(true);
  });

  for (const theme of ['light', 'dark'] as const) {
    for (const kind of KINDS) {
      test(`shared file defines ${theme} .badge-task-type-${kind} triple`, () => {
        const css = fs.existsSync(path.join(PROTO_ROOT, SHARED_FILE)) ? read(SHARED_FILE) : '';
        const rule = paletteRule(css, theme, kind);
        expect(rule, `${theme} ${kind} rule`).toBeDefined();
        const want = PALETTE[theme][kind];
        expect(rule!.decls['color']).toBe(want.color);
        expect(rule!.decls['background'] ?? rule!.decls['background-color']).toBe(want.bg);
        expect(rule!.decls['border-color']).toBe(want.border);
      });
    }
  }

  for (const file of RENDERING_PAGES) {
    test(`${file} links ../shared/task-type-badge.css`, () => {
      expect(read(file)).toMatch(
        /<link[^>]+href="(?:\.\.\/shared|\.\/\.\.\/shared)\/task-type-badge\.css"/,
      );
    });
  }

  for (const file of COPY_OWNERS) {
    test(`${file} owns no .badge-task-type-* rule`, () => {
      const offenders = rules(read(file))
        .filter((r) => /\.badge-task-type-/.test(r.selector))
        .map((r) => r.selector);
      expect(offenders, 'page-level palette copies').toEqual([]);
    });
  }

  test('MASTER.md changelog has a v1.44 row naming #1448 and task-type-badge.css', () => {
    const master = fs.readFileSync(MASTER_PATH, 'utf8');
    const row = master.split('\n').find((l) => /^\|\s*v1\.44\s*\|/.test(l));
    expect(row, 'v1.44 changelog row').toBeDefined();
    expect(row).toContain('#1448');
    expect(row).toContain('task-type-badge.css');
  });
});

// --- runtime ------------------------------------------------------------------------------
type Lang = 'zh' | 'en';
type Theme = 'light' | 'dark';

async function seed(page: Page, lang: Lang, theme: Theme): Promise<void> {
  await page.addInitScript(
    ([l, t]) => {
      localStorage.setItem('labelsuite.lang', l);
      localStorage.setItem('labelsuite.guidelineModalSeen', '1');
      localStorage.setItem('label-suite-theme', t);
    },
    [lang, theme],
  );
}

type Target = { name: string; url: string; rowReady: string };
const TARGETS: Target[] = [
  { name: 'dashboard', url: '/pages/dashboard/dashboard.html', rowReady: '.output-type-tag' },
  {
    name: 'task-list',
    url: '/pages/task-management/task-list.html?task_role=project_leader',
    rowReady: '.task-table tbody tr .output-type-tag',
  },
  {
    name: 'annotation-list',
    url: buildListUrl({ task_id: 'T016', role: 'annotator', run_type: 'official_run' }),
    rowReady: '#taskInfoOutputTypes .output-type-tag',
  },
  {
    name: 'dataset-analysis-list',
    url: '/pages/dataset/dataset-analysis-list.html',
    rowReady: '.output-type-tag',
  },
];

for (const theme of ['light', 'dark'] as const) {
  for (const lang of ['zh', 'en'] as const) {
    for (const target of TARGETS) {
      test.describe(`Issue #1448-C ${target.name} badge palette (${theme}, ${lang})`, () => {
        test.beforeEach(async ({ page }) => {
          await page.setViewportSize({ width: 1440, height: 900 });
          await seed(page, lang, theme);
          await page.goto(target.url);
          await page.waitForSelector(target.rowReady, { state: 'attached' });
          await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
        });

        for (const kind of KINDS) {
          test(`synthetic .badge-task-type-${kind} computes the pinned palette`, async ({ page }) => {
            const got = await page.evaluate((k) => {
              const host = document.querySelector('.output-type-tags, #taskInfoOutputTypes') ?? document.body;
              const el = document.createElement('span');
              el.className = `badge output-type-tag badge-task-type-${k}`;
              el.textContent = k;
              host.appendChild(el);
              const cs = getComputedStyle(el);
              const out = { color: cs.color, bg: cs.backgroundColor, border: cs.borderTopColor };
              el.remove();
              return out;
            }, kind);
            expect(got).toEqual(expectedRgb(PALETTE[theme][kind]));
          });
        }

        test('every data-rendered badge matches the palette of its class', async ({ page }) => {
          const rendered = await page.evaluate(() =>
            [...document.querySelectorAll('.output-type-tag')].map((el) => {
              const cs = getComputedStyle(el);
              const m = el.className.match(/badge-task-type-(\w+)/);
              return {
                kind: m ? m[1] : null,
                color: cs.color,
                bg: cs.backgroundColor,
                border: cs.borderTopColor,
              };
            }),
          );
          expect(rendered.length, 'rendered badges').toBeGreaterThan(0);
          for (const b of rendered) {
            expect(b.kind, 'badge carries a task-type class').not.toBeNull();
            expect({ color: b.color, bg: b.bg, border: b.border }, `rendered ${b.kind}`).toEqual(
              expectedRgb(PALETTE[theme][b.kind as Kind]),
            );
          }
        });
      });
    }
  }
}
