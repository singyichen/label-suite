/*
 * Traceability: issue #1446 PR-A (retires the #1390 PR-B `.hidden` contract) —
 * shared modal skeleton (pages/shared/modal.css).
 * Pages in scope: user-management, role-settings, annotation-workspace.
 * Visibility contract: shared modal.css hides `.modal-overlay` by default and
 * `.show` opens it. Pages carry NO local `.modal-overlay:not(.hidden)` rule and
 * their overlays carry no `hidden` class; JS toggles `.show`. The workspace's
 * four modals reuse the shared `.modal-header` / `.modal-close` (no page-own
 * `.image-modal-header` / `.image-modal-close`).
 * PR-A of #1390 (task-list / task-new / task-detail) is covered by modal-shared-skeleton.spec.ts.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test, expect } from '../fixtures';
import type { Page } from '@playwright/test';
import { buildWorkspaceUrl, dismissGuidelineModal } from '../annotation/_workspace-helpers';

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

    test(`${name} inline <style> has no local .modal-overlay:not(.hidden) rule`, () => {
      const style = inlineStyles(read(resolve(PROTO, rel)));
      expectMatch(style, /\.modal-overlay:not\(\.hidden\)/, false);
    });
  }

  const WS_SOURCES = [PAGES['annotation-workspace'], 'pages/annotation/annotation-workspace.config.js'];
  for (const rel of WS_SOURCES) {
    test(`${rel} no longer uses page-own image-modal-close / image-modal-header`, () => {
      const src = read(resolve(PROTO, rel));
      expect(src.includes('image-modal-close'), 'still references image-modal-close').toBe(false);
      expect(src.includes('image-modal-header'), 'still references image-modal-header').toBe(false);
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

/** open = add `.show`; closed = remove `.show` (the shared modal.css contract). */
async function setOpen(page: Page, t: Target, open: boolean) {
  await page.goto(t.url);
  await page.locator(t.modal).waitFor({ state: 'attached' });
  await page.evaluate(
    ([sel, o]) => document.querySelector(sel as string)!.classList.toggle('show', o as boolean),
    [t.modal, open],
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
        await setOpen(page, t, true);
        const hrefs = await page.evaluate(() => [...document.styleSheets].map((s) => s.href ?? ''));
        expect(hrefs.some((h) => h.endsWith('/pages/shared/modal.css'))).toBe(true);
      });

      test('markup carries neither `hidden` nor `show` on first paint', async ({ page }) => {
        await page.goto(t.url);
        await page.locator(t.modal).waitFor({ state: 'attached' });
        const cls = await page.locator(t.modal).evaluate((el) => [...el.classList]);
        expect(cls).not.toContain('hidden');
        // the workspace guideline modal may auto-open on load; every other overlay starts closed
        if (t.modal !== '#wsGuidelineModal') expect(cls).not.toContain('show');
      });

      test('closed (no .show) overlay computes display:none', async ({ page }) => {
        await setOpen(page, t, false);
        await expect(page.locator(t.modal)).toHaveCSS('display', 'none');
      });

      test('open overlay is fixed flex, z-index 300, rgba(0, 0, 0, 0.5), blur(4px)', async ({ page }) => {
        await setOpen(page, t, true);
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
        await setOpen(page, t, true);
        const token = await page.evaluate(() =>
          getComputedStyle(document.documentElement).getPropertyValue('--radius-xl').trim(),
        );
        expect(token).not.toBe('');
        const radius = await page.locator(`${t.modal} > .modal`).evaluate((el) => getComputedStyle(el).borderRadius);
        expect(radius).toBe(token);
      });

      if (t.modal.startsWith('#wsGuideline') && t.modal !== '#wsGuidelineModal' || t.modal === '#wsReviewFlowDrawer') {
        test('header is the shared .modal-header holding a button.modal-close', async ({ page }) => {
          await page.goto(t.url);
          await page.locator(t.modal).waitFor({ state: 'attached' });
          await expect(page.locator(`${t.modal} .modal-header button.modal-close`)).toHaveCount(1);
        });
      }

      if (t.footer) {
        test('footer is right-aligned flex with --space-sm gap and secondary left of primary', async ({ page }) => {
          await setOpen(page, t, true);
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
      await setOpen(page, t, true);
      seen.push(JSON.stringify(await footerStyle(page, t.footer!)));
    }
    expect(seen.length).toBe(5);
    expect(new Set(seen).size).toBe(1);
    expect(JSON.parse(seen[0]).justifyContent).toBe('flex-end');
  });
});

test.describe('shared modal skeleton (rest): .show open/close behavior (#1446)', () => {
  test('workspace guideline image modal gains .show on open and loses it on close', async ({ page }) => {
    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001' }));
    await dismissGuidelineModal(page);
    const modal = page.getByTestId('ws-guideline-image-modal');
    await expect(modal).not.toHaveClass(/\bshow\b/);
    await page.getByTestId('ws-guideline-file-item').first().click();
    await expect(modal).toHaveClass(/\bshow\b/);
    await expect(modal).toBeVisible();
    await page.getByTestId('ws-guideline-image-modal-close').click();
    await expect(modal).not.toHaveClass(/\bshow\b/);
    await expect(modal).toBeHidden();
  });

  test('user-management addModal gains .show on open and loses it on cancel', async ({ page }) => {
    await page.goto('/pages/admin/user-management.html');
    const modal = page.locator('#addModal');
    await expect(modal).not.toHaveClass(/\bshow\b/);
    await page.locator('#addUserBtn').click();
    await expect(modal).toHaveClass(/\bshow\b/);
    await expect(modal).toBeVisible();
    await page.locator('#addCancelBtn').click();
    await expect(modal).not.toHaveClass(/\bshow\b/);
    await expect(modal).toBeHidden();
  });

  test('role-settings dirtyModal gains .show on dirty cancel and loses it on keep-editing', async ({ page }) => {
    await page.goto('/pages/admin/role-settings.html');
    const modal = page.locator('#dirtyModal');
    await expect(modal).not.toHaveClass(/\bshow\b/);
    await page.locator('#editBtn').click();
    await page.locator('[data-key="task.create"][data-role="user"]').uncheck();
    await page.locator('#cancelBtn').click();
    await expect(modal).toHaveClass(/\bshow\b/);
    await expect(modal).toBeVisible();
    await modal.getByText('繼續編輯').click();
    await expect(modal).not.toHaveClass(/\bshow\b/);
    await expect(modal).toBeHidden();
  });
});
