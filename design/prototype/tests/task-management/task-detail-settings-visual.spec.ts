/*
 * Traceability: specs/task-management/014-task-detail/spec.md FR-026 (1)(6)
 *   (openspec/changes/task-detail-overview-settings-split, tasks.md 2.10 + 2.11, issue #1199)
 *
 * TDD Red for G2, maintainer ruling 2026-10-08 (white card layout). Contract:
 *   - each settings section (the visible role="tabpanel" in #settingsPanel) is a white card in
 *     BOTH view and edit state: background --color-white, 1px solid --color-border,
 *     radius --radius-lg, box-shadow none
 *   - .settings-nav-item text is 14px and horizontally centered in the button
 *   - active nav item background is --color-white; inactive is not
 *   - the same holds in dark theme, against the dark-resolved token values
 *
 * Tokens are resolved at runtime (never hardcoded). Colors are normalized by applying them to a
 * probe element; lengths via a probe's border-radius / border-width.
 *
 * Centering approach: measure the text node with a Range and compare the text's horizontal
 * center to the button's content-box center (padding is symmetrical in the product CSS, so
 * border-box center is used); tolerance 2px. Geometry is robust to text-align vs flex centering.
 */
import { test, expect, type Page } from '@playwright/test';
import { openSettingsSection, type SettingsSlug } from './_task-detail-settings-helpers';

const URL = '/pages/task-management/task-detail.html?task_id=T013&task_role=project_leader';

/* [slug, edit button id] -- two sections, one per distinct edit-form implementation. */
const SECTIONS: ReadonlyArray<readonly [SettingsSlug, string]> = [
  ['basic', '#overviewEditBtn'],
  ['labeling', '#settingsEditBtn'],
];

type Resolved = { white: string; border: string; radius: string };

async function openPage(page: Page, theme: 'light' | 'dark') {
  await page.addInitScript((t) => window.localStorage.setItem('label-suite-theme', t), theme);
  await page.goto(URL);
  await page.locator('#workLogPanel').waitFor({ state: 'attached', timeout: 15000 });
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
}

/** Resolve tokens to the values a computed style reports. */
async function resolveTokens(page: Page): Promise<Resolved> {
  return page.evaluate(() => {
    const probe = document.createElement('div');
    probe.style.cssText =
      'position:absolute;background-color:var(--color-white);border:1px solid var(--color-border);border-radius:var(--radius-lg)';
    document.body.appendChild(probe);
    const cs = getComputedStyle(probe);
    const r = { white: cs.backgroundColor, border: cs.borderTopColor, radius: cs.borderTopLeftRadius };
    probe.remove();
    return r;
  });
}

const visibleCard = (page: Page) => page.locator('#settingsPanel [role="tabpanel"]:visible');

async function cardStyle(page: Page) {
  return visibleCard(page).evaluate((el) => {
    const cs = getComputedStyle(el);
    return {
      bg: cs.backgroundColor,
      radius: [cs.borderTopLeftRadius, cs.borderTopRightRadius, cs.borderBottomRightRadius, cs.borderBottomLeftRadius],
      widths: [cs.borderTopWidth, cs.borderRightWidth, cs.borderBottomWidth, cs.borderLeftWidth],
      styles: [cs.borderTopStyle, cs.borderRightStyle, cs.borderBottomStyle, cs.borderLeftStyle],
      colors: [cs.borderTopColor, cs.borderRightColor, cs.borderBottomColor, cs.borderLeftColor],
      shadow: cs.boxShadow,
    };
  });
}

function expectCard(s: Awaited<ReturnType<typeof cardStyle>>, t: Resolved, label: string) {
  expect.soft(s.bg, `${label} background`).toBe(t.white);
  expect.soft(s.widths, `${label} border width`).toEqual(['1px', '1px', '1px', '1px']);
  expect.soft(s.styles, `${label} border style`).toEqual(['solid', 'solid', 'solid', 'solid']);
  expect.soft(s.colors, `${label} border color`).toEqual([t.border, t.border, t.border, t.border]);
  expect.soft(s.radius, `${label} radius`).toEqual([t.radius, t.radius, t.radius, t.radius]);
  expect.soft(s.shadow, `${label} shadow`).toBe('none');
}

for (const theme of ['light', 'dark'] as const) {
  test.describe(`task-detail settings white card (FR-026 (1)(6)) [${theme}]`, () => {
    test(`section renders as a white card in view state and edit state is identical [${theme}]`, async ({ page }) => {
      await openPage(page, theme);
      const tokens = await resolveTokens(page);
      for (const [slug, editBtn] of SECTIONS) {
        await openSettingsSection(page, slug);
        const view = await cardStyle(page);
        expectCard(view, tokens, `${slug} view`);

        await expect(page.locator(editBtn)).toBeEnabled();
        await page.locator(editBtn).click();
        const edit = await cardStyle(page);
        expectCard(edit, tokens, `${slug} edit`);
        expect(edit.bg, `${slug} view/edit background`).toBe(view.bg);
        expect(edit.colors, `${slug} view/edit border`).toEqual(view.colors);
        expect(edit.radius, `${slug} view/edit radius`).toEqual(view.radius);
      }
    });

    test(`nav items are 14px, horizontally centered; active is --color-white, inactive is not [${theme}]`, async ({ page }) => {
      await openPage(page, theme);
      const tokens = await resolveTokens(page);
      await openSettingsSection(page, 'basic');
      const items = page.locator('.settings-nav-item');
      await expect(items).toHaveCount(5);
      for (let i = 0; i < 5; i++) {
        const m = await items.nth(i).evaluate((el) => {
          const range = document.createRange();
          range.selectNodeContents(el);
          const text = range.getBoundingClientRect();
          const box = el.getBoundingClientRect();
          return {
            fontSize: getComputedStyle(el).fontSize,
            offset: text.left + text.width / 2 - (box.left + box.width / 2),
            bg: getComputedStyle(el).backgroundColor,
            selected: el.getAttribute('aria-selected') === 'true',
          };
        });
        expect.soft(m.fontSize, `nav ${i} font-size`).toBe('14px');
        expect.soft(Math.abs(m.offset), `nav ${i} text center offset`).toBeLessThanOrEqual(2);
        if (m.selected) expect.soft(m.bg, `nav ${i} active bg`).toBe(tokens.white);
        else expect.soft(m.bg, `nav ${i} inactive bg`).not.toBe(tokens.white);
      }
      await expect(items.nth(0)).toHaveAttribute('aria-selected', 'true');
    });
  });
}
