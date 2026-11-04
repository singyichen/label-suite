/*
 * Traceability: issue #1390 PR-A — shared modal skeleton (pages/shared/modal.css)
 * Pages in scope: task-list, task-new, task-detail. (user-management,
 * role-settings, annotation-workspace belong to PR-B.)
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { test, expect } from '../fixtures';
import type { Page } from '@playwright/test';

const PROTO = resolve(__dirname, '../..');
const MODAL_CSS = resolve(PROTO, 'pages/shared/modal.css');
const MASTER = resolve(PROTO, '../system/MASTER.md');

const PAGES = {
  'task-list': 'pages/task-management/task-list.html',
  'task-new': 'pages/task-management/task-new.html',
  'task-detail': 'pages/task-management/task-detail.html',
} as const;

function expectMatch(text: string, re: RegExp, shouldMatch: boolean) {
  expect(re.test(text), `${shouldMatch ? 'expected' : 'unexpected'} match for ${re}`).toBe(shouldMatch);
}
const read = (p: string) => readFileSync(p, 'utf8');
const inlineStyles = (html: string) =>
  [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n');

test.describe('shared modal skeleton: static contract (#1390)', () => {
  test('pages/shared/modal.css exists and defines the skeleton', () => {
    expect(existsSync(MODAL_CSS), 'pages/shared/modal.css must exist').toBe(true);
    const css = read(MODAL_CSS);
    expectMatch(css, /\.modal-overlay\s*[{,]/, true);
    expectMatch(css, /\.modal-overlay\.show\s*\{[^}]*display:\s*flex/, true);
    expectMatch(css, /(^|[\s,}])\.modal\s*[{,]/, true);
    expectMatch(css, /\.modal-title\s*[{,]/, true);
    expectMatch(css, /\.modal-(footer|actions)\s*[{,]/, true);
  });

  for (const [name, rel] of Object.entries(PAGES)) {
    test(`${name} links ../shared/modal.css`, () => {
      expectMatch(
        read(resolve(PROTO, rel)),
        /<link\s+[^>]*rel="stylesheet"[^>]*href="\.\.\/shared\/modal\.css"|<link\s+[^>]*href="\.\.\/shared\/modal\.css"[^>]*rel="stylesheet"/,
        true,
      );
    });

    test(`${name} inline <style> no longer defines the modal skeleton`, () => {
      const style = inlineStyles(read(resolve(PROTO, rel)));
      expectMatch(style, /(^|[\n}])\s*\.modal-overlay\s*\{/, false);
      expectMatch(style, /(^|[\n}])\s*\.modal-overlay\.show\s*\{/, false);
      expectMatch(style, /\.modal-backdrop/, false);
      expectMatch(style, /(^|[\n}])\s*\.modal\s*\{/, false);
    });
  }

  test('task-list has no modal-backdrop anywhere', () => {
    expect(read(resolve(PROTO, PAGES['task-list'])).includes('modal-backdrop'), 'task-list still contains modal-backdrop').toBe(false);
  });

  test('MASTER.md Modals section documents modal.css and the footer rules', () => {
    const md = read(MASTER);
    const start = md.indexOf('### Modals');
    const end = md.indexOf('### Status Badges');
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const section = md.slice(start, end);
    expect(section.includes('modal.css'), 'MASTER Modals section must mention modal.css').toBe(true);
    expectMatch(section, /right-aligned/i, true);
    expectMatch(section, /secondary/i, true);
    expectMatch(section, /primary/i, true);
    expectMatch(section, /Danger/, true);
  });
});

type Target = {
  page: keyof typeof PAGES;
  url: string;
  modal: string;
  cancel: string;
  confirm: string;
};

const TARGETS: Target[] = [
  { page: 'task-list', url: '/pages/task-management/task-list.html?task_role=project_leader', modal: '#deleteTaskModal', cancel: '#deleteTaskCancelBtn', confirm: '#deleteTaskConfirmBtn' },
  { page: 'task-new', url: '/pages/task-management/task-new.html?task_role=project_leader', modal: '#leaveModal', cancel: '#leaveModalStayBtn', confirm: '#leaveModalLeaveBtn' },
  { page: 'task-new', url: '/pages/task-management/task-new.html?task_role=project_leader', modal: '#taxonomyDeleteModal', cancel: '#taxonomyDeleteCancelBtn', confirm: '#taxonomyDeleteConfirmBtn' },
  { page: 'task-detail', url: '/pages/task-management/task-detail.html?task_role=project_leader&task_id=T001&status=draft', modal: '#riskModal', cancel: '#riskCancelBtn', confirm: '#riskConfirmBtn' },
  { page: 'task-detail', url: '/pages/task-management/task-detail.html?task_role=project_leader&task_id=T001&status=draft', modal: '#settingsLeaveModal', cancel: '#settingsLeaveCancelBtn', confirm: '#settingsLeaveConfirmBtn' },
];

async function openByClass(page: Page, t: Target) {
  await page.goto(t.url);
  await page.locator(t.modal).waitFor({ state: 'attached' });
  await page.evaluate((sel) => document.querySelector(sel)!.classList.add('show'), t.modal);
  await expect(page.locator(t.modal)).toBeVisible();
}

const footerStyle = (page: Page, modal: string) =>
  page.locator(`${modal} .modal-actions`).evaluate((el) => {
    const cs = getComputedStyle(el);
    return { display: cs.display, justifyContent: cs.justifyContent, gap: cs.columnGap };
  });

test.describe('shared modal skeleton: computed styles (#1390)', () => {
  const footers: Record<string, unknown> = {};

  for (const t of TARGETS) {
    test.describe(`${t.page} ${t.modal}`, () => {
      test('modal.css is the stylesheet that supplies the skeleton', async ({ page }) => {
        await openByClass(page, t);
        const hrefs = await page.evaluate(() =>
          [...document.styleSheets].map((s) => s.href ?? ''),
        );
        expect(hrefs.some((h) => h.endsWith('/pages/shared/modal.css'))).toBe(true);
      });

      test('overlay is fixed, z-index 300, rgba(0, 0, 0, 0.5)', async ({ page }) => {
        await openByClass(page, t);
        const cs = await page.locator(t.modal).evaluate((el) => {
          const s = getComputedStyle(el);
          return { position: s.position, zIndex: s.zIndex, bg: s.backgroundColor, display: s.display };
        });
        expect(cs).toMatchObject({ position: 'fixed', zIndex: '300', bg: 'rgba(0, 0, 0, 0.5)', display: 'flex' });
      });

      test('.modal radius equals --radius-xl', async ({ page }) => {
        await openByClass(page, t);
        const token = await page.evaluate(() =>
          getComputedStyle(document.documentElement).getPropertyValue('--radius-xl').trim(),
        );
        expect(token).not.toBe('');
        const radius = await page.locator(`${t.modal} > .modal`).evaluate((el) => getComputedStyle(el).borderRadius);
        expect(radius).toBe(token);
      });

      test('footer is right-aligned flex with secondary left of primary', async ({ page }) => {
        await openByClass(page, t);
        const f = await footerStyle(page, t.modal);
        expect(f.display).toBe('flex');
        expect(f.justifyContent).toBe('flex-end');
        const cancel = await page.locator(t.cancel).boundingBox();
        const confirm = await page.locator(t.confirm).boundingBox();
        expect(cancel).not.toBeNull();
        expect(confirm).not.toBeNull();
        expect(cancel!.x).toBeLessThan(confirm!.x);
        footers[`${t.page}${t.modal}`] = f;
      });
    });
  }

  test('footer computed values are identical across all pages (single source)', async ({ page }) => {
    const seen: string[] = [];
    for (const t of TARGETS) {
      await openByClass(page, t);
      seen.push(JSON.stringify(await footerStyle(page, t.modal)));
    }
    expect(new Set(seen).size).toBe(1);
    expect(JSON.parse(seen[0]).display).toBe('flex');
    expect(JSON.parse(seen[0]).justifyContent).toBe('flex-end');
  });
});

/*
 * Traceability: issue #1446 PR-B — single modal close button class.
 * Decision: keep `.modal-close`, retire `.modal-close-btn`.
 */
const PAGES_DIR = resolve(PROTO, 'pages');
const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
    d.isDirectory() ? walk(resolve(dir, d.name)) : [resolve(dir, d.name)],
  );

const CLOSE_BUTTONS = [
  { name: 'task-detail', rel: 'pages/task-management/task-detail.html', id: 'datasetPreviewCloseBtn' },
  { name: 'task-new', rel: 'pages/task-management/task-new.html', id: 'datasetPreviewCloseBtn' },
  { name: 'annotation-progress', rel: 'pages/task-management/task-detail.panels/annotation-progress.html', id: 'memberDetailCloseBtn' },
] as const;

test.describe('single modal close button class (#1446)', () => {
  test('modal.css has no .modal-close-btn selector', () => {
    expectMatch(read(MODAL_CSS), /\.modal-close-btn\b/, false);
  });

  test('no html/css/js under pages/ references modal-close-btn', () => {
    const offenders = walk(PAGES_DIR)
      .filter((f) => ['.html', '.css', '.js'].includes(extname(f)))
      .filter((f) => read(f).includes('modal-close-btn'))
      .map((f) => f.slice(PROTO.length + 1));
    expect(offenders, 'files still referencing modal-close-btn').toEqual([]);
  });

  for (const b of CLOSE_BUTTONS) {
    test(`${b.name} #${b.id} uses class modal-close`, () => {
      const html = read(resolve(PROTO, b.rel));
      const tag = html.match(new RegExp(`<button\\b[^>]*\\bid="${b.id}"[^>]*>`));
      expect(tag, `#${b.id} button not found`).not.toBeNull();
      const cls = tag![0].match(/\bclass="([^"]*)"/);
      expect(cls, `#${b.id} has no class attribute`).not.toBeNull();
      expect(cls![1].split(/\s+/)).toContain('modal-close');
    });
  }

  test('MASTER.md Modals section documents .modal-close and not modal-close-btn', () => {
    const md = read(MASTER);
    const start = md.indexOf('### Modals');
    const end = md.indexOf('### Status Badges');
    expect(start).toBeGreaterThan(-1);
    const section = md.slice(start, end);
    expect(section.includes('.modal-close'), 'MASTER Modals section must mention .modal-close').toBe(true);
    expect(section.includes('modal-close-btn'), 'MASTER Modals section must not mention modal-close-btn').toBe(false);
  });

  test('task-detail dataset preview close button computes the shared .modal-close look', async ({ page }) => {
    await page.goto('/pages/task-management/task-detail.html?task_role=project_leader&task_id=T001&status=draft');
    await page.locator('#datasetPreviewModal').waitFor({ state: 'attached' });
    await page.evaluate(() => document.querySelector('#datasetPreviewModal')!.classList.add('show'));
    await expect(page.locator('#datasetPreviewCloseBtn')).toBeVisible();
    const cs = await page.locator('#datasetPreviewCloseBtn').evaluate((el) => {
      const s = getComputedStyle(el);
      return { width: s.width, height: s.height, borderTopWidth: s.borderTopWidth, borderTopStyle: s.borderTopStyle };
    });
    // .modal-close: 32x32 with a 1px solid border; retired .modal-close-btn had border: none
    expect(cs).toEqual({ width: '32px', height: '32px', borderTopWidth: '1px', borderTopStyle: 'solid' });
  });
});
