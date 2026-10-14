/*
 * Traceability: issue #1390 PR-B — shared modal skeleton (pages/shared/modal.css)
 * Pages in scope: user-management, role-settings, annotation-workspace.
 * These pages keep their `hidden`-class JS, so the visibility contract is:
 * shared modal.css hides `.modal-overlay` by default and each page adds ONE
 * local `.modal-overlay:not(.hidden) { display: flex }` rule.
 * PR-A (task-list / task-new / task-detail) is covered by modal-shared-skeleton.spec.ts.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test, expect } from '../fixtures';
import type { Page } from '@playwright/test';

const PROTO = resolve(__dirname, '../..');
const MODAL_CSS = resolve(PROTO, 'pages/shared/modal.css');

const PAGES = {
  'user-management': 'pages/admin/user-management.html',
  'role-settings': 'pages/admin/role-settings.html',
  'annotation-workspace': 'pages/annotation/annotation-workspace.html',
} as const;

const read = (p: string) => readFileSync(p, 'utf8');
const inlineStyles = (html: string) =>
  [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n');
function expectMatch(text: string, re: RegExp, shouldMatch: boolean) {
  expect(re.test(text), `${shouldMatch ? 'expected' : 'unexpected'} match for ${re}`).toBe(shouldMatch);
}

test.describe('shared modal skeleton (rest): static contract (#1390 PR-B)', () => {
  test('modal.css defines .modal-header and .modal-close', () => {
    const css = read(MODAL_CSS);
    expectMatch(css, /(^|[\s,}])\.modal-header\s*[{,]/, true);
    expectMatch(css, /(^|[\s,}])\.modal-close\s*[{,]/, true);
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
      // Rule start = beginning of text, a newline or a closing brace, so local
      // modifiers (.modal.image-modal, .image-modal-close, .rv-flow-overlay,
      // .modal-icon) never match.
      const start = String.raw`(^|[\n}])\s*`;
      for (const sel of [
        String.raw`\.modal-overlay`,
        String.raw`\.modal-overlay\.hidden`,
        String.raw`\.modal`,
        String.raw`\.modal-header`,
        String.raw`\.modal-title`,
        String.raw`\.modal-close`,
        String.raw`\.modal-footer`,
        String.raw`\.modal-actions`,
      ]) {
        expectMatch(style, new RegExp(`${start}${sel}\\s*[{,]`), false);
      }
      expectMatch(style, /\.modal-card/, false);
      expect(read(resolve(PROTO, rel)).includes('modal-card'), 'markup still uses modal-card').toBe(false);
    });

    test(`${name} adds exactly one local .modal-overlay:not(.hidden) visibility rule`, () => {
      const style = inlineStyles(read(resolve(PROTO, rel)));
      const rules = [...style.matchAll(/\.modal-overlay:not\(\.hidden\)\s*\{([^}]*)\}/g)];
      expect(rules.length, 'expected exactly one .modal-overlay:not(.hidden) rule').toBe(1);
      expectMatch(rules[0][1], /display:\s*flex/, true);
    });
  }
});

type Target = {
  page: keyof typeof PAGES;
  url: string;
  modal: string;
  /** footer container; omitted when the modal has none */
  footer?: string;
  cancel?: string;
  confirm?: string;
};

const WS_URL =
  '/pages/annotation/annotation-workspace.html?task_id=T001&sample_id=sent-001&role=annotator&run_type=official_run';

const TARGETS: Target[] = [
  { page: 'user-management', url: '/pages/admin/user-management.html', modal: '#addModal', footer: '#addModal .modal-footer', cancel: '#addCancelBtn', confirm: '#addSaveBtn' },
  { page: 'user-management', url: '/pages/admin/user-management.html', modal: '#editModal', footer: '#editModal .modal-footer', cancel: '#editCancelBtn', confirm: '#editSaveBtn' },
  { page: 'user-management', url: '/pages/admin/user-management.html', modal: '#disableModal', footer: '#disableModal .modal-footer', cancel: '#disableCancelBtn', confirm: '#disableConfirmBtn' },
  { page: 'role-settings', url: '/pages/admin/role-settings.html', modal: '#dirtyModal', footer: '#dirtyModal .modal-actions', cancel: '#dirtyModal .btn-ghost', confirm: '#dirtyModal .btn-danger' },
  { page: 'annotation-workspace', url: WS_URL, modal: '#wsGuidelineModal', footer: '#wsGuidelineModal .modal-actions' },
  { page: 'annotation-workspace', url: WS_URL, modal: '#wsGuidelineImageModal' },
  { page: 'annotation-workspace', url: WS_URL, modal: '#wsGuidelinePdfModal' },
  { page: 'annotation-workspace', url: WS_URL, modal: '#wsGuidelineMdModal' },
  { page: 'annotation-workspace', url: WS_URL, modal: '#wsReviewFlowDrawer' },
];

async function setHidden(page: Page, t: Target, hidden: boolean) {
  await page.goto(t.url);
  await page.locator(t.modal).waitFor({ state: 'attached' });
  await page.evaluate(
    ([sel, h]) => document.querySelector(sel as string)!.classList.toggle('hidden', h as boolean),
    [t.modal, hidden],
  );
}

const footerStyle = (page: Page, sel: string) =>
  page.locator(sel).evaluate((el) => {
    const cs = getComputedStyle(el);
    return { display: cs.display, justifyContent: cs.justifyContent, gap: cs.columnGap };
  });

test.describe('shared modal skeleton (rest): computed styles (#1390 PR-B)', () => {
  for (const t of TARGETS) {
    test.describe(`${t.page} ${t.modal}`, () => {
      test('modal.css is the stylesheet that supplies the skeleton', async ({ page }) => {
        await setHidden(page, t, false);
        const hrefs = await page.evaluate(() => [...document.styleSheets].map((s) => s.href ?? ''));
        expect(hrefs.some((h) => h.endsWith('/pages/shared/modal.css'))).toBe(true);
      });

      test('closed (hidden) overlay computes display:none', async ({ page }) => {
        await setHidden(page, t, true);
        await expect(page.locator(t.modal)).toHaveCSS('display', 'none');
      });

      test('open overlay is fixed flex, z-index 300, rgba(0, 0, 0, 0.5), blur(4px)', async ({ page }) => {
        await setHidden(page, t, false);
        const cs = await page.locator(t.modal).evaluate((el) => {
          const s = getComputedStyle(el);
          return { position: s.position, zIndex: s.zIndex, bg: s.backgroundColor, display: s.display, blur: s.backdropFilter };
        });
        expect(cs).toMatchObject({
          position: 'fixed',
          zIndex: '300',
          bg: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          blur: 'blur(4px)',
        });
      });

      // The review-flow drawer is a right-edge sheet whose local modifier
      // (.rv-flow-drawer) intentionally squares the right corners.
      const radiusTest = t.modal === '#wsReviewFlowDrawer' ? test.skip : test;
      radiusTest('.modal radius equals --radius-xl', async ({ page }) => {
        await setHidden(page, t, false);
        const token = await page.evaluate(() =>
          getComputedStyle(document.documentElement).getPropertyValue('--radius-xl').trim(),
        );
        expect(token).not.toBe('');
        const radius = await page.locator(`${t.modal} > .modal`).evaluate((el) => getComputedStyle(el).borderRadius);
        expect(radius).toBe(token);
      });

      if (t.footer) {
        test('footer is right-aligned flex with --space-sm gap and secondary left of primary', async ({ page }) => {
          await setHidden(page, t, false);
          const gapToken = await page.evaluate(() =>
            getComputedStyle(document.documentElement).getPropertyValue('--space-sm').trim(),
          );
          const f = await footerStyle(page, t.footer!);
          expect(f.display).toBe('flex');
          expect(f.justifyContent).toBe('flex-end');
          expect(f.gap).toBe(gapToken);
          if (t.cancel && t.confirm) {
            const cancel = await page.locator(t.cancel).boundingBox();
            const confirm = await page.locator(t.confirm).boundingBox();
            expect(cancel).not.toBeNull();
            expect(confirm).not.toBeNull();
            expect(cancel!.x).toBeLessThan(confirm!.x);
          }
        });
      }
    });
  }

  test('footer computed values are identical across all three pages (single source)', async ({ page }) => {
    const seen: string[] = [];
    for (const t of TARGETS.filter((x) => x.footer)) {
      await setHidden(page, t, false);
      seen.push(JSON.stringify(await footerStyle(page, t.footer!)));
    }
    expect(seen.length).toBe(5);
    expect(new Set(seen).size).toBe(1);
    expect(JSON.parse(seen[0]).justifyContent).toBe('flex-end');
  });
});
