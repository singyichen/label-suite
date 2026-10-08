/*
 * Traceability: specs/task-management/014-task-detail/spec.md FR-027 (1)-(6), FR-026 (4), SC-019
 *   (openspec/changes/task-detail-overview-settings-split, tasks.md 3.1 + 3.2 + 3.4a, issue #1199 sections C and E)
 *
 * TDD Red for G3 (overview). 2026-10-08 maintainer ruling: restore the original visuals, keep the new
 * content. Contract:
 *   1. The primary CTA background resolves to --color-cta (site-wide btn-primary), resolved at runtime.
 *      With several publish buttons (waiting_iaa_confirmation) only #publishOfficialRunBtn is primary.
 *   2. The CTA shares a row with the stop-condition pills (#execStopPills) and sits to their right.
 *   3. The numbers row has exactly four columns (目前回合 / 最新 IAA / 已用試標 / 正式標記池; the
 *      已用試標 value reads "used / total") and no 已完成試標回合.
 *   4. The trial-round table has seven columns; the result column is coloured by text colour
 *      (--color-success / --color-error). Pills / fills are allowed again, so only colour is asserted.
 *   5. A `draft` task renders no round rows.
 *   6. The sampling section view (settings tab) no longer shows 試標回合 / 目前判定 / 已用試標 / 可進正式.
 *   7. `reviewer`: the run control is disabled and carries a tooltip.
 *   8. Dark mode: CTA text on CTA background reaches a contrast ratio >= 4.5.
 *
 * Selectors: [data-testid="overview-metrics" | "overview-metric" | "overview-metric-label" |
 *   "trial-round-table" | "trial-round-row" | "trial-round-result"], plus existing ids #overviewPanel,
 *   #trialDecisionTitle, #publishActionRow, #execStopPills, #loadingSkeleton, #trialUsedValue.
 *   The CTA is the first button inside #publishActionRow.
 *
 * Fixtures: T013 -> draft, no round rows.   T016 -> two finished rounds: R1 failed (0.62), R2 passed (0.84).
 *
 * Every geometry / visibility check waits for #loadingSkeleton to be hidden first.
 */
import { test, expect, type Page } from '@playwright/test';
import { openSettingsSection } from './_task-detail-settings-helpers';

const BASE = '/pages/task-management/task-detail.html';
const DRAFT_URL = `${BASE}?task_id=T013&task_role=project_leader`;
const ROUNDS_URL = `${BASE}?task_id=T016&task_role=project_leader`;
const WAITING_URL = `${BASE}?task_id=T001&task_role=project_leader&status=waiting_iaa_confirmation`;
const REVIEWER_URL = `${BASE}?task_id=T013&task_role=reviewer`;

async function open(page: Page, url: string, theme: 'light' | 'dark' = 'light') {
  await page.addInitScript((t) => window.localStorage.setItem('label-suite-theme', t), theme);
  await page.goto(url);
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  await page.locator('#workLogPanel').waitFor({ state: 'attached', timeout: 15000 });
  await expect(page.locator('#loadingSkeleton')).toBeHidden();
  await expect(page.locator('#overviewPanel')).toBeVisible();
}

const cta = (page: Page) => page.locator('#publishActionRow button').first();

/** Resolve a token to the rgb() string a computed style reports. */
function resolveColor(page: Page, token: string): Promise<string> {
  return page.evaluate((tok) => {
    const probe = document.createElement('div');
    probe.style.cssText = `position:absolute;color:var(${tok})`;
    document.body.appendChild(probe);
    const c = getComputedStyle(probe).color;
    probe.remove();
    return c;
  }, token);
}

/** Resolve a token to the rgb() string a computed style reports for background-color. */
function resolveBg(page: Page, token: string): Promise<string> {
  return page.evaluate((tok) => {
    const probe = document.createElement('div');
    probe.style.cssText = `position:absolute;background-color:var(${tok})`;
    document.body.appendChild(probe);
    const c = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return c;
  }, token);
}

function parseRgb(css: string): [number, number, number] {
  const m = css.match(/rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)/);
  if (!m) throw new Error(`cannot parse colour: ${css}`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

function luminance([r, g, b]: [number, number, number]): number {
  const lin = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrast(a: string, b: string): number {
  const [la, lb] = [luminance(parseRgb(a)), luminance(parseRgb(b))];
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

test.describe('task-detail overview layout (FR-027)', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('CTA background resolves to --color-cta (site-wide btn-primary)', async ({ page }) => {
    await open(page, DRAFT_URL);
    const ctaColor = await resolveBg(page, '--color-cta');
    const bg = await cta(page).evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(bg).toBe(ctaColor);
  });

  test('CTA shares a row with the stop-condition pills and sits to their right', async ({ page }) => {
    await open(page, DRAFT_URL);
    const pills = await page.locator('#execStopPills').boundingBox();
    const btn = await cta(page).boundingBox();
    expect(pills, 'pills box').not.toBeNull();
    expect(btn, 'CTA box').not.toBeNull();
    const overlap = Math.min(pills!.y + pills!.height, btn!.y + btn!.height) - Math.max(pills!.y, btn!.y);
    expect(overlap, 'vertical overlap (same row)').toBeGreaterThan(0);
    expect(btn!.x, 'CTA is right of the pills').toBeGreaterThanOrEqual(pills!.x + pills!.width);
  });

  test('「已用試標」 value reads "used / total"', async ({ page }) => {
    await open(page, ROUNDS_URL);
    await expect(page.locator('#trialUsedValue')).toHaveText(/^\d+ \/ \d+$/);
  });

  test('numbers row has exactly four columns', async ({ page }) => {
    await open(page, ROUNDS_URL);
    await expect(page.locator('[data-testid="overview-metrics"]')).toBeVisible();
    await expect(page.locator('[data-testid="overview-metrics"] [data-testid="overview-metric"]')).toHaveCount(4);
  });

  test('numbers row labels are exactly 目前回合 / 最新 IAA / 已用試標 / 正式標記池, in order', async ({ page }) => {
    await open(page, ROUNDS_URL);
    await expect(
      page.locator('[data-testid="overview-metrics"] [data-testid="overview-metric-label"]'),
    ).toHaveText(['目前回合', '最新 IAA', '已用試標', '正式標記池']);
  });

  test('waiting_iaa_confirmation: exactly one button in the publish row is --color-cta (publishOfficialRunBtn)', async ({ page }) => {
    await open(page, WAITING_URL);
    const primary = await resolveBg(page, '--color-cta');
    const buttons = page.locator('#publishActionRow button');
    await expect(page.locator('#publishOfficialRunBtn')).toBeVisible();
    expect(await buttons.count(), 'publish row has several buttons').toBeGreaterThan(1);
    const bgs = await buttons.evaluateAll((els) =>
      els.map((el) => ({ id: el.id, bg: getComputedStyle(el).backgroundColor })),
    );
    const primaries = bgs.filter((b) => b.bg === primary).map((b) => b.id);
    expect(primaries, `buttons on --color-cta: ${JSON.stringify(bgs)}`).toEqual(['publishOfficialRunBtn']);
  });

  test('「已完成試標回合」 is gone from the overview', async ({ page }) => {
    await open(page, ROUNDS_URL);
    await expect(page.locator('#trialRoundsUsedLabel')).toHaveCount(0);
    await expect(page.locator('#overviewPanel')).not.toContainText('已完成試標回合');
  });

  test('trial-round table has seven columns in the FR-027 (4) order', async ({ page }) => {
    await open(page, ROUNDS_URL);
    const table = page.locator('[data-testid="trial-round-table"]');
    await expect(table).toBeVisible();
    await expect(table.getByRole('columnheader')).toHaveText([
      '回合', '筆數', '標記者', 'IAA', 'Std', '結果', '完成時間',
    ]);
    await expect(table.locator('[data-testid="trial-round-row"]')).toHaveCount(2);
  });

  test('result column is coloured by text colour (success / error)', async ({ page }) => {
    await open(page, ROUNDS_URL);
    const success = await resolveColor(page, '--color-success');
    const error = await resolveColor(page, '--color-error');
    const rows = page.locator('[data-testid="trial-round-table"] [data-testid="trial-round-row"]');
    await expect(rows).toHaveCount(2);
    const results = rows.locator('[data-testid="trial-round-result"]');
    await expect(results).toHaveCount(2);
    const colors = await results.evaluateAll((els) => els.map((el) => getComputedStyle(el).color));
    expect(colors[0], 'R1 failed -> --color-error').toBe(error);
    expect(colors[1], 'R2 passed -> --color-success').toBe(success);
  });

  test('a draft task renders no round rows', async ({ page }) => {
    await open(page, DRAFT_URL);
    await expect(page.locator('[data-testid="trial-round-row"]')).toHaveCount(0);
  });

  test('sampling settings view no longer lists 試標回合 / 目前判定 / 已用試標 / 可進正式', async ({ page }) => {
    await open(page, ROUNDS_URL);
    await openSettingsSection(page, 'sampling');
    const section = page.locator('#settingsPanel [role="tabpanel"]:visible');
    await expect(section).toBeVisible();
    await expect(section).not.toContainText('試標回合');
    await expect(section).not.toContainText('目前判定');
    await expect(section).not.toContainText('已用試標 / 可進正式');
  });

  test('reviewer: the run control is disabled and has a tooltip', async ({ page }) => {
    await open(page, REVIEWER_URL);
    const button = cta(page);
    await expect(button).toBeVisible();
    await expect(button).toBeDisabled();
    const title = await button.getAttribute('title');
    expect(title && title.trim().length, 'tooltip (title) is non-empty').toBeGreaterThan(0);
  });

  test('dark mode: CTA text on CTA background has contrast >= 4.5', async ({ page }) => {
    await open(page, DRAFT_URL, 'dark');
    const { bg, fg } = await cta(page).evaluate((el) => {
      const cs = getComputedStyle(el);
      return { bg: cs.backgroundColor, fg: cs.color };
    });
    expect(contrast(fg, bg), `fg ${fg} on bg ${bg}`).toBeGreaterThanOrEqual(4.5);
  });
});
