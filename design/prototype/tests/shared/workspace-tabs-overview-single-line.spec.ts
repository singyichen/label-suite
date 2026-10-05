/* Red tests for the shared Workspace Tabs Overview Menu -- G4b (issue #1099,
 * openspec/changes/1099-workspace-tabs-overview-menu/design.md "### G4b
 * 總覽選單每列單行", spec delta FR-023 point 2 revision).
 *
 * Maintainer requirement: each overview menu row is icon + title + close
 * button only. The second line `.workspace-tab-overview-item-secondary` (the
 * page-kind name) is removed from the DOM. The page-kind name is STILL part
 * of the filter corpus (FR-023 point 3 / AC-023.3 unchanged), it is just no
 * longer rendered.
 *
 * Expected Red state against current sidebar.js: the "no secondary line" and
 * "only the title carries text" cases FAIL (the secondary span is rendered
 * for every row whose pageKind has a page-kind name). The filter guard and
 * the geometry/truncation guard are regression guards and may already PASS.
 *
 * Geometry/DOM assertions only; no computed-CSS colour or font checks. The
 * full-title `title` attribute is asserted on the tab-bar tab (existing
 * G1 behaviour, sidebar.js tabEl.title) because overview rows carry no
 * `title` attribute today; the row label is checked for real truncation by
 * scrollWidth > clientWidth instead.
 */
import { test, expect, type Locator, type Page } from '@playwright/test';
import { workspaceTabs, setDesktopViewport } from './_workspace-tabs-helpers';
import { buildWorkspaceUrl } from '../annotation/_workspace-helpers';

const DASHBOARD_URL = '/pages/dashboard/dashboard.html';
const TASK_LIST_URL = '/pages/task-management/task-list.html';
// T001 (task-list.data.js) with ap_stage=r1: the task-detail tab whose title
// ("... Medical Text Sentiment Classification") is long and does NOT contain
// its own page-kind name ("Task Detail" / "任務詳情").
const TASK_DETAIL_T001_R1_URL = '/pages/task-management/task-detail.html?task_id=T001&ap_stage=r1';

type Lang = 'zh-TW' | 'en';
type Viewport = 'desktop' | 'mobile';

const PAGE_KIND_QUERY: Record<Lang, string> = { 'zh-TW': '任務詳情', en: 'Task Detail' };

function trigger(page: Page): Locator {
  return page.getByTestId('workspace-tab-overview-trigger');
}
function menu(page: Page): Locator {
  return page.getByTestId('workspace-tab-overview-menu');
}
function items(page: Page): Locator {
  return menu(page).getByTestId('workspace-tab-overview-item');
}
function filterInput(page: Page): Locator {
  return menu(page).getByTestId('workspace-tab-overview-filter');
}

/** Opens 4 tabs (dashboard, task-list, task-detail, annotation workspace) in
 * the requested language/viewport, then opens the overview menu. Language is
 * switched at desktop size first because #langToggle is unreachable at 375px
 * (choice persists in localStorage). */
async function openMenuWith(page: Page, lang: Lang, viewport: Viewport): Promise<void> {
  await setDesktopViewport(page);
  await page.goto(DASHBOARD_URL);
  if (lang === 'en') await page.locator('#langToggle').click();
  if (viewport === 'mobile') await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(TASK_LIST_URL);
  await page.goto(TASK_DETAIL_T001_R1_URL);
  await page.goto(
    buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001', role: 'annotator', run_type: 'official_run' }),
  );
  await trigger(page).click();
  await expect(menu(page)).toBeVisible();
  await expect(items(page)).toHaveCount(4);
}

const CASES: Array<[Lang, Viewport]> = [
  ['zh-TW', 'desktop'],
  ['en', 'desktop'],
  ['zh-TW', 'mobile'],
  ['en', 'mobile'],
];

test.describe('Workspace tabs overview menu (G4b) — every row is icon + title + close, no second line', () => {
  for (const [lang, viewport] of CASES) {
    test(`${lang} ${viewport}: no .workspace-tab-overview-item-secondary exists in the menu DOM`, async ({ page }) => {
      await openMenuWith(page, lang, viewport);
      await expect(menu(page).locator('.workspace-tab-overview-item-secondary')).toHaveCount(0);
    });

    test(`${lang} ${viewport}: each row has exactly one text-bearing element, and it is the title label`, async ({ page }) => {
      await openMenuWith(page, lang, viewport);
      const rows = await items(page).evaluateAll((els) =>
        els.map((row) => {
          const textBearing = Array.from(row.querySelectorAll('*')).filter((el) =>
            Array.from(el.childNodes).some((n) => n.nodeType === Node.TEXT_NODE && (n.textContent ?? '').trim() !== ''),
          );
          const rowDirectText = Array.from(row.childNodes).filter(
            (n) => n.nodeType === Node.TEXT_NODE && (n.textContent ?? '').trim() !== '',
          ).length;
          return {
            rowDirectText,
            textClasses: textBearing.map((el) => el.className),
            label: row.querySelector('.workspace-tab-overview-item-label')?.textContent?.trim() ?? '',
            rowText: (row.textContent ?? '').replace(/\s+/g, ' ').trim(),
          };
        }),
      );
      expect(rows).toHaveLength(4);
      for (const r of rows) {
        expect(r.rowDirectText).toBe(0);
        expect(r.textClasses).toEqual(['workspace-tab-overview-item-label']);
        expect(r.label).not.toBe('');
        expect(r.rowText).toBe(r.label);
      }
    });
  }
});

test.describe('Workspace tabs overview menu (G4b) — filter still matches the page-kind name (AC-023.3 unchanged)', () => {
  for (const [lang, viewport] of CASES) {
    test(`${lang} ${viewport}: typing the page-kind name "${PAGE_KIND_QUERY[lang]}" shows only the task-detail row`, async ({ page }) => {
      await openMenuWith(page, lang, viewport);
      await filterInput(page).fill(PAGE_KIND_QUERY[lang]);

      // Title of the task-detail tab never contains its own page-kind name,
      // so a hit proves the (now invisible) page-kind corpus is still used.
      const visibleRows = items(page).filter({ visible: true });
      await expect(visibleRows).toHaveCount(1);
      await expect(visibleRows.first()).toContainText(lang === 'en' ? /Dry Run R1/ : /R1/);
    });
  }
});

test.describe('Workspace tabs overview menu (G4b) — long titles truncate inside the row and keep the full title', () => {
  for (const [lang, viewport] of CASES) {
    test(`${lang} ${viewport}: long task-detail title ellipsizes within its row, close button stays inside the row`, async ({ page }) => {
      await openMenuWith(page, lang, viewport);
      const m = await items(page).evaluateAll((els) =>
        els.map((row) => {
          const label = row.querySelector('.workspace-tab-overview-item-label') as HTMLElement;
          const close = row.querySelector('[data-testid="workspace-tab-overview-item-close"]') as HTMLElement;
          const rr = row.getBoundingClientRect();
          const lr = label.getBoundingClientRect();
          const cr = close.getBoundingClientRect();
          return {
            text: label.textContent ?? '',
            labelRight: lr.right,
            closeLeft: cr.left,
            closeRight: cr.right,
            rowRight: rr.right,
            truncated: label.scrollWidth > label.clientWidth,
          };
        }),
      );
      const tolerance = 1;
      for (const r of m) {
        expect(r.labelRight).toBeLessThanOrEqual(r.closeLeft + tolerance);
        expect(r.closeRight).toBeLessThanOrEqual(r.rowRight + tolerance);
      }
      // The en task-detail title is the longest; at 375px it must really
      // truncate (the zh title is short enough to fit, so zh is not asserted).
      if (viewport === 'mobile' && lang === 'en') {
        const longest = m.reduce((a, b) => (b.text.length > a.text.length ? b : a));
        expect(longest.truncated).toBe(true);
      }
    });
  }

  test('desktop: the tab-bar tab keeps the full untruncated label as its title attribute', async ({ page }) => {
    await openMenuWith(page, 'en', 'desktop');
    await page.keyboard.press('Escape');
    const detailTab = workspaceTabs(page).filter({ hasText: /Dry Run R1/ });
    await expect(detailTab).toHaveCount(1);
    await expect(detailTab).toHaveAttribute('title', /Dry Run R1 .*Medical Text Sentiment Classification/);
  });
});
