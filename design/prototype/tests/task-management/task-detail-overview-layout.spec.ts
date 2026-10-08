/*
 * Traceability: specs/task-management/014-task-detail/spec.md FR-027 (1)-(6), FR-026 (4), SC-019
 *   (openspec/changes/task-detail-overview-settings-split, tasks.md 3.1 + 3.2, issue #1199 sections C and E)
 *
 * TDD Red for G3 (overview re-layout). Contract:
 *   1. 1440x900: the verdict row (#trialDecisionTitle) and the CTA are inside the first viewport;
 *      the CTA background resolves to --color-primary (token resolved at runtime, never hardcoded).
 *   2. The numbers row has exactly four columns and no 已完成試標回合 / "completed trial rounds".
 *   3. The trial-round table has seven columns; the result column conveys pass / fail by text
 *      colour only (--color-success / --color-error), with no pill: transparent background, no
 *      border, no padding on the coloured element.
 *   4. A `draft` task renders no round rows.
 *   5. The sampling section view (settings tab) no longer shows 試標回合 / 目前判定 / 已用試標 / 可進正式.
 *   6. `reviewer`: the run control is disabled and carries a tooltip.
 *   7. Dark mode: CTA text on CTA background reaches a contrast ratio >= 4.5.
 *
 * Selectors introduced for the Green implementer (task 3.3 / 3.4) -- these do not exist yet:
 *   [data-testid="overview-metrics"]       container of the numbers row
 *   [data-testid="overview-metric"]        one per column inside the numbers row (exactly four)
 *   [data-testid="trial-round-table"]      the trial-round table (a real <table>)
 *   [data-testid="trial-round-row"]        one per round in the table body
 *   [data-testid="trial-round-result"]     the element inside each row's 結果 cell that carries the
 *                                          text colour (may be the <td> itself)
 *   Column headers are read through role=columnheader inside the table, in this order:
 *   回合 / 筆數 / 標記者 / IAA / Std / 結果 / 完成時間. The result column is the 6th.
 * Existing ids reused: #overviewPanel, #trialDecisionTitle, #publishActionRow, #loadingSkeleton,
 *   #trialRoundsUsedLabel (must be gone), #settingsPanel via _task-detail-settings-helpers.
 * The CTA is the first button inside #publishActionRow (no new id needed).
 *
 * Fixtures (seed data, read from task-detail.data.js / task-detail.html):
 *   T013 -> draft, no round rows.   T016 -> two finished rounds: R1 failed (0.62), R2 passed (0.84).
 *
 * Every geometry / visibility check waits for #loadingSkeleton to be hidden first (a 560ms
 * skeleton shifts layout and re-renders the panel).
 */
import { test, expect, type Page } from '@playwright/test';
import { openSettingsSection } from './_task-detail-settings-helpers';

const BASE = '/pages/task-management/task-detail.html';
const DRAFT_URL = `${BASE}?task_id=T013&task_role=project_leader`;
const ROUNDS_URL = `${BASE}?task_id=T016&task_role=project_leader`;
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

  test('1440x900: verdict row and CTA are inside the first viewport', async ({ page }) => {
    await open(page, DRAFT_URL);
    for (const [name, locator] of [
      ['verdict title', page.locator('#trialDecisionTitle')],
      ['CTA', cta(page)],
    ] as const) {
      await expect(locator, `${name} visible`).toBeVisible();
      const box = await locator.boundingBox();
      expect(box, `${name} box`).not.toBeNull();
      expect(box!.y, `${name} top`).toBeGreaterThanOrEqual(0);
      expect(box!.y + box!.height, `${name} bottom within 900px`).toBeLessThanOrEqual(900);
    }
  });

  test('CTA background resolves to --color-primary', async ({ page }) => {
    await open(page, DRAFT_URL);
    const primary = await resolveColor(page, '--color-primary');
    const bg = await cta(page).evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(bg).toBe(primary);
  });

  test('numbers row has exactly four columns', async ({ page }) => {
    await open(page, ROUNDS_URL);
    await expect(page.locator('[data-testid="overview-metrics"]')).toBeVisible();
    await expect(page.locator('[data-testid="overview-metrics"] [data-testid="overview-metric"]')).toHaveCount(4);
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

  test('result column conveys pass / fail by text colour only (no pill)', async ({ page }) => {
    await open(page, ROUNDS_URL);
    const success = await resolveColor(page, '--color-success');
    const error = await resolveColor(page, '--color-error');
    const rows = page.locator('[data-testid="trial-round-table"] [data-testid="trial-round-row"]');
    await expect(rows).toHaveCount(2);
    const results = rows.locator('[data-testid="trial-round-result"]');
    await expect(results).toHaveCount(2);
    const styles = await results.evaluateAll((els) =>
      els.map((el) => {
        const cs = getComputedStyle(el);
        return {
          color: cs.color,
          bgAlpha: cs.backgroundColor === 'rgba(0, 0, 0, 0)' || cs.backgroundColor === 'transparent',
          border: cs.borderTopWidth,
          radius: cs.borderTopLeftRadius,
        };
      }),
    );
    expect(styles[0].color, 'R1 failed -> --color-error').toBe(error);
    expect(styles[1].color, 'R2 passed -> --color-success').toBe(success);
    for (const [i, s] of styles.entries()) {
      expect(s.bgAlpha, `row ${i} result has no fill`).toBe(true);
      expect(s.border, `row ${i} result has no border`).toBe('0px');
      expect(s.radius, `row ${i} result is not rounded like a pill`).toBe('0px');
    }
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
