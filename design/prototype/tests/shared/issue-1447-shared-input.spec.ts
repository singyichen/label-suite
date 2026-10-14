/**
 * Issue #1447: annotation-workspace's three text inputs converge on the shared
 * .input / .input-textarea stylesheet (MASTER.md "Inputs").
 *
 * Contract:
 *   - pages/shared/input.css exists and defines ONLY .input and .input-textarea
 *   - annotation-workspace.html links it; task-new / task-detail / profile do not
 *   - the page-level .rv-review-reason textarea / .ws-bypass-reason-group input
 *     rules no longer carry padding / font-size / border-radius
 *   - runtime (1440x900): T009 ws-free-text-input, T015 reviewer ws-review-reason
 *     and annotator ws-bypass-reason-* all compute font-size 16px,
 *     padding 12px 16px, border-radius == --radius-md, and carry the shared class
 *   - MASTER.md "Inputs" names pages/shared/input.css and annotation-workspace;
 *     the changelog has an issue #1447 row
 *
 * Traceability: design/system/MASTER.md "Inputs"; issue #1447
 */
import { test, expect } from '../fixtures';
import type { Locator, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import {
  buildWorkspaceUrl,
  dismissGuidelineModal,
  gotoReviewerWorkspace,
  patchDataFile,
  skipGuidelineModal,
} from '../annotation/_workspace-helpers';

const PROTO_ROOT = path.resolve(__dirname, '../..');
const MASTER_PATH = path.resolve(PROTO_ROOT, '../system/MASTER.md');
const CSS_PATH = path.join(PROTO_ROOT, 'pages/shared/input.css');
const WORKSPACE_HTML = 'pages/annotation/annotation-workspace.html';
const NON_ADOPTERS = [
  'pages/task-management/task-new.html',
  'pages/task-management/task-detail.html',
  'pages/account/profile.html',
];
const LINK_RE =
  /<link[^>]+rel="stylesheet"[^>]+href="\.\.\/shared\/input\.css"|<link[^>]+href="\.\.\/shared\/input\.css"[^>]+rel="stylesheet"/;

function inlineStyleText(html: string): string {
  return [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).join('\n');
}

function ruleBody(css: string, selectorRe: RegExp): string | null {
  const m = css.match(new RegExp(selectorRe.source + '\\s*\\{([^}]*)\\}'));
  return m ? m[1] : null;
}

test.describe('Issue #1447 shared input: static contract', () => {
  test('input.css exists and defines .input and .input-textarea only', () => {
    expect(fs.existsSync(CSS_PATH)).toBe(true);
    const css = fs.readFileSync(CSS_PATH, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(css).toMatch(/\.input\s*[{,:]/);
    expect(css).toMatch(/\.input-textarea\s*[{,:]/);
    // Every selector's root class must be .input or .input-textarea.
    const selectors = [...css.matchAll(/([^{}]+)\{/g)].flatMap((m) =>
      m[1].split(',').map((s) => s.trim()).filter(Boolean),
    );
    expect(selectors.length).toBeGreaterThan(0);
    for (const sel of selectors) {
      expect(sel, `unexpected selector "${sel}"`).toMatch(/^\.input(-textarea)?(?![\w-])/);
    }
  });

  test('annotation-workspace links input.css', () => {
    const html = fs.readFileSync(path.join(PROTO_ROOT, WORKSPACE_HTML), 'utf8');
    expect(html).toMatch(LINK_RE);
  });

  for (const file of NON_ADOPTERS) {
    test(`${file} does not link input.css`, () => {
      const html = fs.readFileSync(path.join(PROTO_ROOT, file), 'utf8');
      expect(html).not.toMatch(/shared\/input\.css/);
    });
  }

  test('workspace <style> no longer styles reviewer reason / bypass reason inputs', () => {
    const style = inlineStyleText(fs.readFileSync(path.join(PROTO_ROOT, WORKSPACE_HTML), 'utf8'));
    for (const re of [/\.rv-review-reason textarea/, /\.ws-bypass-reason-group input/]) {
      const body = ruleBody(style, re);
      if (body === null) continue; // rule removed entirely is fine
      expect(body, `${re} still sets padding`).not.toMatch(/padding\s*:/);
      expect(body, `${re} still sets font-size`).not.toMatch(/font-size\s*:/);
      expect(body, `${re} still sets border-radius`).not.toMatch(/border-radius\s*:/);
    }
  });

  test('MASTER.md Inputs names input.css and annotation-workspace; changelog has #1447', () => {
    const master = fs.readFileSync(MASTER_PATH, 'utf8');
    const start = master.indexOf('### Inputs');
    expect(start).toBeGreaterThan(-1);
    const next = master.indexOf('\n### ', start + 5);
    const section = master.slice(start, next === -1 ? undefined : next);
    expect(section).toContain('pages/shared/input.css');
    expect(section).toContain('annotation-workspace');
    expect(master).toMatch(/\|\s*v[\d.]+\s*\|[^\n]*#1447/);
  });
});

async function expectSharedInputMetrics(locator: Locator, cls: string[]) {
  await expect(locator).toBeVisible();
  for (const c of cls) await expect(locator).toHaveClass(new RegExp(`(^|\\s)${c}(\\s|$)`));
  const m = await locator.evaluate((el) => {
    const cs = getComputedStyle(el);
    const probe = document.createElement('div');
    probe.style.borderRadius = 'var(--radius-md)';
    document.body.appendChild(probe);
    const radius = getComputedStyle(probe).borderTopLeftRadius;
    probe.remove();
    return {
      fontSize: cs.fontSize,
      paddingTop: cs.paddingTop,
      paddingBottom: cs.paddingBottom,
      paddingLeft: cs.paddingLeft,
      paddingRight: cs.paddingRight,
      radius: cs.borderTopLeftRadius,
      expectedRadius: radius,
      inlineStyle: el.getAttribute('style') || '',
    };
  });
  expect(m.fontSize).toBe('16px');
  expect(m.paddingTop).toBe('12px');
  expect(m.paddingBottom).toBe('12px');
  expect(m.paddingLeft).toBe('16px');
  expect(m.paddingRight).toBe('16px');
  expect(m.expectedRadius).not.toBe('0px');
  expect(m.radius).toBe(m.expectedRadius);
  expect(m.inlineStyle).not.toMatch(/padding|font-size|border-radius/);
}

test.describe('Issue #1447 shared input: runtime metrics at 1440x900', () => {
  test.beforeEach(async ({ page }) => {
    await skipGuidelineModal(page);
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test('T009 ws-free-text-input uses .input-textarea with shared metrics', async ({ page }) => {
    await page.goto(buildWorkspaceUrl({ task_id: 'T009', sample_id: 'sum-001' }));
    await dismissGuidelineModal(page);
    await expectSharedInputMetrics(page.getByTestId('ws-free-text-input'), ['input-textarea']);
  });

  test('T015 reviewer ws-review-reason uses .input-textarea with shared metrics', async ({ page }) => {
    await gotoReviewerWorkspace(page, { task_id: 'T015', sample_id: 'ofs-04-pending-review' });
    await dismissGuidelineModal(page);
    await page.getByTestId('ws-review-row-modify').first().click();
    await expectSharedInputMetrics(page.getByTestId('ws-review-reason').first(), ['input-textarea']);
  });

  test('annotator ws-bypass-reason-* uses .input with shared metrics', async ({ page }) => {
    await patchDataFile(
      page,
      'task-detail.data.js',
      `window.LabelSuiteTaskDetailData.profiles.T001.outputs[0].config.allow_bypass = true;`,
    );
    await page.goto(
      buildWorkspaceUrl({
        task_id: 'T001',
        sample_id: 'sent-001',
        role: 'annotator',
        run_type: 'official_run',
        annotator_id: 'kioleemg12',
      }),
    );
    await dismissGuidelineModal(page);
    await page.getByTestId('ws-bypass-single_label').check();
    await expectSharedInputMetrics(page.getByTestId('ws-bypass-reason-single_label'), ['input']);
  });
});
