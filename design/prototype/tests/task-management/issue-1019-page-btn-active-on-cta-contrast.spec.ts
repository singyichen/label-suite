/*
 * Traceability: GitHub issue #1019
 *   task-list.html's `.page-btn.active` (design/prototype/pages/task-management/task-list.html:276)
 *   and task-detail.html's member-management pagination `.page-btn.active`
 *   (design/prototype/pages/task-management/task-detail.html:744-746) both set a literal
 *   `color: white` on `background: var(--color-primary)` instead of a foreground semantic
 *   token (`--color-on-cta`, not yet added — this issue's Green step). In dark theme
 *   `--color-primary` becomes #818CF8, producing ~2.98:1 contrast against white text —
 *   below the WCAG 2.1 AA text threshold of 4.5:1.
 *
 *   In light theme `--color-primary` is #6366F1, producing ~4.47:1 — already marginally
 *   below the 4.5:1 threshold *before* this issue. That pre-existing gap is not called out
 *   by issue #1019 and is out of scope for this PR; the light-theme test below only guards
 *   against further regression (asserted at 4.4, not 4.5) rather than asserting AA pass,
 *   so the Green fix for #1019 is not required to also fix this unrelated pre-existing gap.
 *   Canonical page specs: specs/task-management/010-task-list/spec.md,
 *   specs/task-management/014-task-detail/spec.md
 *
 *   Update (issue #1030, maintainer decision 2026-09-27): the light-theme gap is resolved
 *   as a sanctioned accepted tradeoff, not a defect — see the Step Indicator arbitration
 *   record in design/system/MASTER.md (measured 4.4669:1, 0.033 under AA). The floor below
 *   still guards against regression rather than asserting AA pass, so a future change to
 *   `--color-primary` or `--color-on-cta` that pushes this below 4.4 fails here as a signal
 *   to update that arbitration record.
 */
import { test, expect, type Page } from '@playwright/test';

const WCAG_AA_MIN_CONTRAST = 4.5;
// Accepted-tradeoff light-theme floor (issue #1030) — see traceability note above.
const ACCEPTED_TRADEOFF_LIGHT_FLOOR = 4.4;

const TASK_LIST_URL = '/pages/task-management/task-list.html';
const TASK_DETAIL_URL = '/pages/task-management/task-detail.html';
const PANEL_LOAD_TIMEOUT = 15000;

/** Parses a computed `rgb(r, g, b)` / `rgba(r, g, b, a)` string into channel values. */
function parseRgbChannels(rgbString: string): [number, number, number] {
  const matches = rgbString.match(/\d+(?:\.\d+)?/g);
  if (!matches || matches.length < 3) {
    throw new Error(`Cannot parse computed color as rgb(): ${rgbString}`);
  }
  return [Number(matches[0]), Number(matches[1]), Number(matches[2])];
}

/** WCAG 2.1 relative luminance (sRGB gamma-corrected). */
function relativeLuminance([r, g, b]: [number, number, number]): number {
  const toLinear = (channel8bit: number) => {
    const c = channel8bit / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const [rl, gl, bl] = [toLinear(r), toLinear(g), toLinear(b)];
  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
}

/** WCAG 2.1 contrast ratio between two computed color strings. */
function contrastRatio(colorA: string, colorB: string): number {
  const luminanceA = relativeLuminance(parseRgbChannels(colorA));
  const luminanceB = relativeLuminance(parseRgbChannels(colorB));
  const lighter = Math.max(luminanceA, luminanceB);
  const darker = Math.min(luminanceA, luminanceB);
  return (lighter + 0.05) / (darker + 0.05);
}

async function gotoWithTheme(page: Page, url: string, theme: 'light' | 'dark') {
  await page.addInitScript((selectedTheme) => {
    window.localStorage.setItem('label-suite-theme', selectedTheme);
  }, theme);
  await page.goto(url);
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
}

/**
 * A page re-render (e.g. task-detail.html's 560ms skeleton timer, or this file's own
 * #1040 regression test) can detach-and-replace the target element between resolving it
 * and reading its computed style (issue #1040). `Locator.evaluate()` does these as two
 * separate steps -- resolve the selector to an element handle, then call a function on
 * that handle -- each a distinct round trip, leaving a gap where a re-render can swap the
 * element in between; the stale handle's `getComputedStyle()` then returns empty strings.
 *
 * An earlier version of this fix retried around that gap with `expect(...).toPass()` at
 * various intervals/timeouts. Independent review reproduced failures against every
 * interval/timeout tried (including a 10s timeout, sequential single-worker, no CI
 * contention: 2/20 failed) -- retrying a fixed-period poll against a fixed-period
 * artificial swap loop can alias instead of converging, so no interval was actually safe,
 * only harder to catch failing.
 *
 * This version removes the gap instead of outrunning it: `page.evaluate()` (not
 * `Locator.evaluate()`) resolves the selector via `document.querySelector` and reads
 * `getComputedStyle` in the same synchronous callback, with no `await` between them. JS
 * execution in a page is single-threaded and non-preemptive, so nothing -- including a
 * pending re-render's setTimeout callback -- can run between those two statements; the
 * callback observes a live element (old or new, whichever is currently attached) and
 * never a stale handle. No retry, interval, or timeout is needed.
 *
 * document.querySelector() (unlike Playwright's strict-mode Locator) silently returns
 * only the first match on a multi-match selector instead of erroring. Verified this
 * doesn't matter for either caller's selector: '.page-btn.active' matches exactly 1
 * element on task-list.html, and '#memberPaginationControls .page-btn.active' matches
 * exactly 1 on task-detail.html even though the page has 4 total .page-btn.active across
 * its other pagination controls (metadata/work-log/audit-record/audit-export) -- the
 * #memberPaginationControls scope already disambiguates those.
 */
async function measureLocatorContrast(page: Page, selector: string): Promise<number> {
  await expect(page.locator(selector).first()).toBeVisible();
  const { color, backgroundColor } = await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) throw new Error(`No element matched selector after toBeVisible(): ${sel}`);
    const style = window.getComputedStyle(el);
    return { color: style.color, backgroundColor: style.backgroundColor };
  }, selector);
  return contrastRatio(color, backgroundColor);
}

/** task-list.html renders its numbered pagination buttons synchronously on load. */
async function measureTaskListPageBtnActiveContrast(page: Page): Promise<number> {
  return measureLocatorContrast(page, '.page-btn.active');
}

/**
 * task-detail.html's member-management pagination lives behind a tab click, and its
 * panels arrive via fetched partials — wait for the last partial before interacting,
 * matching the pattern in task-detail-member-management-add.spec.ts.
 */
async function measureTaskDetailPageBtnActiveContrast(page: Page): Promise<number> {
  await page.locator('#workLogPanel').waitFor({ state: 'attached', timeout: PANEL_LOAD_TIMEOUT });
  await page.locator('#tabMemberManagement').click();
  await expect(page.locator('#memberManagementPanel')).not.toHaveClass(/hidden/);
  return measureLocatorContrast(page, '#memberPaginationControls .page-btn.active');
}

test.describe('task-list.html .page-btn.active WCAG contrast (issue #1019)', () => {
  test('light theme: accepted-tradeoff floor, not regressed (issue #1030)', async ({ page }) => {
    await gotoWithTheme(page, TASK_LIST_URL, 'light');
    const ratio = await measureTaskListPageBtnActiveContrast(page);
    expect(ratio).toBeGreaterThanOrEqual(ACCEPTED_TRADEOFF_LIGHT_FLOOR);
  });

  test('dark theme meets AA contrast on .page-btn.active', async ({ page }) => {
    await gotoWithTheme(page, TASK_LIST_URL, 'dark');
    const ratio = await measureTaskListPageBtnActiveContrast(page);
    expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_MIN_CONTRAST);
  });
});

test.describe('task-detail.html member-management .page-btn.active WCAG contrast (issue #1019)', () => {
  test('light theme: accepted-tradeoff floor, not regressed (issue #1030)', async ({ page }) => {
    await gotoWithTheme(page, TASK_DETAIL_URL, 'light');
    const ratio = await measureTaskDetailPageBtnActiveContrast(page);
    expect(ratio).toBeGreaterThanOrEqual(ACCEPTED_TRADEOFF_LIGHT_FLOOR);
  });

  test('dark theme meets AA contrast on .page-btn.active', async ({ page }) => {
    await gotoWithTheme(page, TASK_DETAIL_URL, 'dark');
    const ratio = await measureTaskDetailPageBtnActiveContrast(page);
    expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_MIN_CONTRAST);
  });
});

test.describe('measureLocatorContrast survives a detach race (issue #1040 regression guard)', () => {
  test('measures a live element even while it is continuously detached and replaced', async ({ page }) => {
    await gotoWithTheme(page, TASK_DETAIL_URL, 'dark');
    // Scoped to a throwaway container (unique id) so this test's own .page-btn.active
    // node can never collide with any of task-detail.html's real pagination controls
    // (member-management/metadata/work-log/audit-record/audit-export), regardless of
    // whether the page's own 560ms re-render timer has fired yet.
    //
    // A single one-shot 0ms replace (matching production's single 560ms timer) reliably
    // fires *before* the test script even reaches measureLocatorContrast, because the
    // preceding awaited round trips already exceed 0ms -- so it never lands in the
    // narrow internal gap between a Locator resolving an element handle and evaluating
    // on that handle. To turn that rare production race into a deterministic repro,
    // this continuously detaches-and-replaces the button (capped at MAX_ITERATIONS)
    // for the whole duration of the test, guaranteeing some replacement lands inside
    // whatever gap toBeVisible() / evaluate() leave open.
    await page.evaluate(() => {
      const container = document.createElement('div');
      container.id = 'racetestContainer1040';
      document.body.appendChild(container);
      let current = document.createElement('button');
      current.className = 'page-btn active';
      current.style.color = 'rgb(255, 255, 255)';
      current.style.backgroundColor = 'rgb(0, 0, 0)';
      container.appendChild(current);

      const MAX_ITERATIONS = 20000;
      let iterations = 0;
      const swap = () => {
        if (iterations++ >= MAX_ITERATIONS) return;
        const fresh = document.createElement('button');
        fresh.className = 'page-btn active';
        fresh.style.color = 'rgb(255, 255, 255)';
        fresh.style.backgroundColor = 'rgb(0, 0, 0)';
        current.replaceWith(fresh);
        current = fresh;
        window.setTimeout(swap, 0);
      };
      window.setTimeout(swap, 0);
    });
    const ratio = await measureLocatorContrast(page, '#racetestContainer1040 .page-btn.active');
    expect(ratio).toBeGreaterThan(1);
  });
});
