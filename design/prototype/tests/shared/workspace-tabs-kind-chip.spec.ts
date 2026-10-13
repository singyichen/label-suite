/* Red tests for issue #1280 G2 (openspec/changes/1280-workspace-tab-kind-chip,
 * specs/shared/019-workspace-tabs/spec.md FR-010 delta + AC-1.6 revision).
 *
 * A workspace tab's title is now two DOM parts: a kind chip
 * (`.workspace-tab-kind`: 標記 / 審核 / 詳情 / 試標 RN / 正式 / 分析, absent for
 * kinds without a target) and the target name (`.workspace-tab-label`, the
 * task name). The stage colour (TAB_STAGE_BADGE) moves from the whole tab's
 * text to the chip; the tab body text is always --color-ink-muted (inactive)
 * or --color-ink (active). `title`, the close button's aria-label, the
 * overview-menu rows and the mobile menu carry the plain-text title
 * "<chip text> <name>" with no chip markup; the overview filter matches the
 * task name.
 *
 * None of this exists in sidebar.js / sidebar.css yet: no `.workspace-tab-kind`
 * node is ever rendered, `annotation-workspace` tabs are titled only
 * "標記作業"/"審核作業" with no task name, the name snapshot is written for
 * `task-detail` only, and `[data-stage-badge]` colours the whole tab text.
 *
 * Colours are asserted against the RESOLVED token values (a probe element is
 * given `color/background-color: var(--token)` and its computed value is read
 * in the active theme), never against hard-coded hex, in both light and dark.
 */
import { test, expect } from '../fixtures';
import type { Locator, Page } from '@playwright/test';
import { tabBar, workspaceTabs, closeButton, setDesktopViewport, waitForTaskDetailReady, TAB_STORAGE_KEY } from './_workspace-tabs-helpers';
import { buildWorkspaceUrl, skipGuidelineModal } from '../annotation/_workspace-helpers';

const DASHBOARD_URL = '/pages/dashboard/dashboard.html';
const PROFILE_URL = '/pages/account/profile.html';
const DATASET_LIST_URL = '/pages/dataset/dataset-analysis-list.html';
const ANALYSIS_T001_URL = '/pages/dataset/dataset-analysis-detail.html?task_id=T001&task_role=project_leader';
const ANALYSIS_T002_URL = '/pages/dataset/dataset-analysis-detail.html?task_id=T002&task_role=project_leader';
const DETAIL_BASE = '/pages/task-management/task-detail.html?task_role=project_leader&task_id=';
const DETAIL_T001_R1_URL = DETAIL_BASE + 'T001&ap_stage=r1';
const DETAIL_T001_OFFICIAL_URL = DETAIL_BASE + 'T001&ap_stage=official';
const DETAIL_T001_PLAIN_URL = DETAIL_BASE + 'T001';
const DETAIL_T002_R1_URL = DETAIL_BASE + 'T002&ap_stage=r1';
const DETAIL_T016_OFFICIAL_URL = DETAIL_BASE + 'T016&ap_stage=official';
const ANNOTATE_T001_URL = buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001', role: 'annotator', run_type: 'official_run' });
const ANNOTATE_T001_OTHER_SAMPLE_URL = buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-002', role: 'annotator', run_type: 'dry_run' });
const REVIEW_T001_URL = buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001', role: 'reviewer', run_type: 'official_run' });
const ANNOTATE_T002_URL = buildWorkspaceUrl({ task_id: 'T002', sample_id: 'emo-001', role: 'annotator', run_type: 'official_run' });

// task-list.data.js / dataset-analysis-list.data.js (grep-verified).
const NAME_ZH_T001 = '醫療文本情感分類';
const NAME_EN_T001 = 'Medical Text Sentiment Classification';
const NAME_ZH_T002 = '癌症歷程情緒多標籤分類';
const NAME_EN_T002 = 'Cancer Journey Emotion Multi-label Classification';
const NAME_ZH_T016 = '審核流程示範：正式標記（輪派、仲裁與最終例外）';

type Theme = 'light' | 'dark';
type ChipTone = 'warning' | 'primary' | 'review' | 'neutral';

// Delta spec point 4: [background token, text token] per tone.
const CHIP_TOKENS: Record<ChipTone, [string, string]> = {
  warning: ['--color-warning-bg', '--color-warning'],
  primary: ['--color-primary-soft-bg', '--color-primary'],
  review: ['--color-info-bg', '--color-info'],
  neutral: ['--color-border-muted', '--color-text-soft'],
};

function kindOf(tab: Locator): Locator {
  return tab.locator('.workspace-tab-kind');
}

function labelOf(tab: Locator): Locator {
  return tab.locator('.workspace-tab-label');
}

async function setTheme(page: Page, theme: Theme): Promise<void> {
  await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
}

/* Resolve a design token to its computed rgb() value in the page's current
 * theme by painting a throwaway probe element with it. */
async function resolveToken(page: Page, property: 'color' | 'background-color', token: string): Promise<string> {
  return page.evaluate(
    ([prop, tok]) => {
      const probe = document.createElement('span');
      probe.style.setProperty(prop, `var(${tok})`);
      document.body.appendChild(probe);
      const value = getComputedStyle(probe).getPropertyValue(prop);
      probe.remove();
      return value;
    },
    [property, token] as const,
  );
}

async function computed(locator: Locator, property: string): Promise<string> {
  return locator.evaluate((el, prop) => getComputedStyle(el).getPropertyValue(prop), property);
}

async function expectChipTone(page: Page, tab: Locator, tone: ChipTone): Promise<void> {
  const [bgToken, fgToken] = CHIP_TOKENS[tone];
  const chip = kindOf(tab);
  await expect(chip).toHaveCount(1);
  expect(await computed(chip, 'background-color')).toBe(await resolveToken(page, 'background-color', bgToken));
  expect(await computed(chip, 'color')).toBe(await resolveToken(page, 'color', fgToken));
}

// Overview menu locators (selector contract from workspace-tabs-overview-menu.spec.ts).
function overviewTrigger(page: Page): Locator {
  return page.getByTestId('workspace-tab-overview-trigger');
}
function overviewMenu(page: Page): Locator {
  return page.getByTestId('workspace-tab-overview-menu');
}
function overviewItems(page: Page): Locator {
  return overviewMenu(page).getByTestId('workspace-tab-overview-item');
}
function overviewFilter(page: Page): Locator {
  return overviewMenu(page).getByTestId('workspace-tab-overview-filter');
}

test.describe('Workspace tabs — FR-010 kind chip + target name (desktop, zh)', () => {
  test.beforeEach(async ({ page }) => {
    await skipGuidelineModal(page);
    await setDesktopViewport(page);
  });

  test('annotation tabs of two different tasks show the 標記 chip and their own task name', async ({ page }) => {
    await page.goto(ANNOTATE_T001_URL);
    await page.goto(ANNOTATE_T002_URL);
    const tabs = workspaceTabs(page);
    await expect(tabs).toHaveCount(2);

    await expect(kindOf(tabs.nth(0))).toHaveText('標記');
    await expect(labelOf(tabs.nth(0))).toHaveText(NAME_ZH_T001);
    await expect(kindOf(tabs.nth(1))).toHaveText('標記');
    await expect(labelOf(tabs.nth(1))).toHaveText(NAME_ZH_T002);
  });

  test('the same task opened for annotate and review shows 標記 / 審核 chips with the same name, and dedupe is unchanged', async ({ page }) => {
    await page.goto(ANNOTATE_T001_URL);
    await page.goto(REVIEW_T001_URL);
    const tabs = workspaceTabs(page);
    await expect(tabs).toHaveCount(2);

    await expect(kindOf(tabs.nth(0))).toHaveText('標記');
    await expect(kindOf(tabs.nth(1))).toHaveText('審核');
    await expect(labelOf(tabs.nth(0))).toHaveText(NAME_ZH_T001);
    await expect(labelOf(tabs.nth(1))).toHaveText(NAME_ZH_T001);

    // FR-006 dedupe key (task id + mode) is display-independent: a different
    // sample_id / run_type for the same task + mode reuses the existing tab.
    await page.goto(ANNOTATE_T001_OTHER_SAMPLE_URL);
    await expect(tabs).toHaveCount(2);
    await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'true');
  });

  test('task-detail tabs show 試標 R1 / 正式 / 詳情 chips, each with the task name', async ({ page }) => {
    await page.goto(DETAIL_T001_R1_URL);
    await page.goto(DETAIL_T001_OFFICIAL_URL);
    await page.goto(DETAIL_T001_PLAIN_URL);
    const tabs = workspaceTabs(page);
    await expect(tabs).toHaveCount(3);

    const expected = ['試標 R1', '正式', '詳情'];
    for (let i = 0; i < 3; i++) {
      await expect(kindOf(tabs.nth(i))).toHaveText(expected[i]);
      await expect(labelOf(tabs.nth(i))).toHaveText(NAME_ZH_T001);
    }
  });

  test('the analysis detail tab shows the 分析 chip and task name; the list tab shows no chip', async ({ page }) => {
    await page.goto(DATASET_LIST_URL);
    await page.goto(ANALYSIS_T001_URL);
    const tabs = workspaceTabs(page);
    await expect(tabs).toHaveCount(2);

    await expect(kindOf(tabs.nth(0))).toHaveCount(0);
    await expect(labelOf(tabs.nth(0))).toHaveText('資料集分析');
    await expect(kindOf(tabs.nth(1))).toHaveText('分析');
    await expect(labelOf(tabs.nth(1))).toHaveText(NAME_ZH_T001);
  });

  test('kinds without a target (dashboard, profile) render no chip and keep their page-kind name', async ({ page }) => {
    await page.goto(DASHBOARD_URL);
    await page.goto(PROFILE_URL);
    const tabs = workspaceTabs(page);
    await expect(tabs).toHaveCount(2);
    for (let i = 0; i < 2; i++) {
      await expect(kindOf(tabs.nth(i))).toHaveCount(0);
      await expect(labelOf(tabs.nth(i))).toHaveCount(1);
    }
  });

  test('the name snapshot is written for every task-bound page kind and survives a page with no task data', async ({ page }) => {
    await page.goto(ANNOTATE_T001_URL);
    await page.goto(REVIEW_T001_URL);
    await page.goto(ANALYSIS_T002_URL);
    await page.goto(PROFILE_URL); // provides no window.LabelSuiteTaskListData
    const tabs = workspaceTabs(page);
    await expect(tabs).toHaveCount(4);

    await expect(kindOf(tabs.nth(0))).toHaveText('標記');
    await expect(labelOf(tabs.nth(0))).toHaveText(NAME_ZH_T001);
    await expect(kindOf(tabs.nth(1))).toHaveText('審核');
    await expect(labelOf(tabs.nth(1))).toHaveText(NAME_ZH_T001);
    await expect(kindOf(tabs.nth(2))).toHaveText('分析');
    await expect(labelOf(tabs.nth(2))).toHaveText(NAME_ZH_T002);
  });

  test('the chip is 10.5px / 600 with padding 1px 5px and the --radius-sm corner', async ({ page }) => {
    await page.goto(ANNOTATE_T001_URL);
    const chip = kindOf(workspaceTabs(page).first());
    await expect(chip).toHaveCount(1);

    expect(await computed(chip, 'font-size')).toBe('10.5px');
    expect(await computed(chip, 'font-weight')).toBe('600');
    expect(await computed(chip, 'padding')).toBe('1px 5px');
    const radiusSm = await page.evaluate(() => {
      const probe = document.createElement('span');
      probe.style.setProperty('border-radius', 'var(--radius-sm)');
      document.body.appendChild(probe);
      const value = getComputedStyle(probe).borderTopLeftRadius;
      probe.remove();
      return value;
    });
    expect(await computed(chip, 'border-top-left-radius')).toBe(radiusSm);
  });

  test('a long task name ellipsizes in .workspace-tab-label while the chip stays fully visible', async ({ page }) => {
    await page.goto(DETAIL_T016_OFFICIAL_URL);
    const tab = workspaceTabs(page).first();
    const chip = kindOf(tab);
    await expect(chip).toHaveText('正式');
    await expect(labelOf(tab)).toHaveText(NAME_ZH_T016);
    await expect(labelOf(tab)).toHaveCSS('text-overflow', 'ellipsis');
    const labelTruncated = await labelOf(tab).evaluate((el) => el.scrollWidth > el.clientWidth);
    expect(labelTruncated).toBe(true);
    const chipTruncated = await chip.evaluate((el) => el.scrollWidth > el.clientWidth);
    expect(chipTruncated).toBe(false);
  });
});

for (const theme of ['light', 'dark'] as const) {
  test.describe(`Workspace tabs — FR-010 / AC-1.6 chip colours come from semantic tokens (${theme})`, () => {
    test.beforeEach(async ({ page }) => {
      await skipGuidelineModal(page);
      await setDesktopViewport(page);
    });

    test(`${theme}: 試標 R1 uses the warning tokens, 正式 the primary tokens, 詳情 the neutral tokens`, async ({ page }) => {
      await page.goto(DETAIL_T001_R1_URL);
      await page.goto(DETAIL_T001_OFFICIAL_URL);
      await page.goto(DETAIL_T001_PLAIN_URL);
      await page.goto(DASHBOARD_URL); // active, keeps the three task-detail tabs inactive
      const tabs = workspaceTabs(page);
      await expect(tabs).toHaveCount(4);
      await setTheme(page, theme);

      await expect(kindOf(tabs.nth(0))).toHaveText('試標 R1');
      await expectChipTone(page, tabs.nth(0), 'warning');
      await expect(kindOf(tabs.nth(1))).toHaveText('正式');
      await expectChipTone(page, tabs.nth(1), 'primary');
      await expect(kindOf(tabs.nth(2))).toHaveText('詳情');
      await expectChipTone(page, tabs.nth(2), 'neutral');
    });

    test(`${theme}: review uses the info tokens; annotate and analysis use the neutral tokens`, async ({ page }) => {
      await page.goto(ANNOTATE_T001_URL);
      await page.goto(REVIEW_T001_URL);
      await page.goto(ANALYSIS_T001_URL);
      await page.goto(DASHBOARD_URL);
      const tabs = workspaceTabs(page);
      await expect(tabs).toHaveCount(4);
      await setTheme(page, theme);

      await expectChipTone(page, tabs.nth(0), 'neutral');
      await expectChipTone(page, tabs.nth(1), 'review');
      await expectChipTone(page, tabs.nth(2), 'neutral');
    });

    test(`${theme}: tab body text never changes with the stage (inactive --color-ink-muted, active --color-ink)`, async ({ page }) => {
      await page.goto(DETAIL_T001_R1_URL);
      await page.goto(DETAIL_T001_OFFICIAL_URL);
      await page.goto(DASHBOARD_URL);
      const tabs = workspaceTabs(page);
      await expect(tabs).toHaveCount(3);
      await setTheme(page, theme);

      const inkMuted = await resolveToken(page, 'color', '--color-ink-muted');

      // Inactive dry-run and official tabs: body and label both ink-muted.
      for (const i of [0, 1]) {
        await expect(kindOf(tabs.nth(i))).toHaveCount(1);
        expect(await computed(tabs.nth(i), 'color')).toBe(inkMuted);
        expect(await computed(labelOf(tabs.nth(i)), 'color')).toBe(inkMuted);
      }

      // Activate the dry-run tab: body goes to --color-ink, chip stays warning.
      await tabs.nth(0).click(); // navigates to the tab's URL: a fresh document resets the theme
      await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'true');
      await setTheme(page, theme);
      const ink = await resolveToken(page, 'color', '--color-ink');
      expect(await computed(tabs.nth(0), 'color')).toBe(ink);
      expect(await computed(labelOf(tabs.nth(0)), 'color')).toBe(ink);
      await expectChipTone(page, tabs.nth(0), 'warning');
    });
  });
}

test.describe('Workspace tabs — FR-010 plain-text title for title / aria-label (desktop, zh)', () => {
  test.beforeEach(async ({ page }) => {
    await skipGuidelineModal(page);
    await setDesktopViewport(page);
  });

  test('title and the close button aria-label are the full plain "chip name" text, with no markup', async ({ page }) => {
    await page.goto(ANNOTATE_T001_URL);
    await page.goto(DETAIL_T001_R1_URL);
    await page.goto(DASHBOARD_URL);
    const tabs = workspaceTabs(page);
    await expect(tabs).toHaveCount(3);

    const cases: Array<[number, string]> = [
      [0, `標記 ${NAME_ZH_T001}`],
      [1, `試標 R1 ${NAME_ZH_T001}`],
    ];
    for (const [i, plain] of cases) {
      await expect(kindOf(tabs.nth(i))).toHaveCount(1);
      await expect(tabs.nth(i)).toHaveAttribute('title', plain);
      expect(await closeButton(tabs.nth(i)).getAttribute('aria-label')).toBe(`關閉 ${plain}`);
    }
    // A kind without a chip keeps its bare page-kind name as the plain title.
    const dashboardLabel = ((await labelOf(tabs.nth(2)).textContent()) ?? '').trim();
    expect(dashboardLabel).not.toBe('');
    await expect(tabs.nth(2)).toHaveAttribute('title', dashboardLabel);
  });
});

test.describe('Workspace tabs — FR-010 / FR-023 overview menu and mobile menu use plain-text titles', () => {
  test.beforeEach(async ({ page }) => {
    await skipGuidelineModal(page);
  });

  for (const viewport of ['desktop', 'mobile'] as const) {
    test(`${viewport}: rows show the plain "chip name" text without chip markup, and filtering by task name finds the annotation tab`, async ({ page }) => {
      await setDesktopViewport(page);
      await page.goto(DASHBOARD_URL);
      if (viewport === 'mobile') await page.setViewportSize({ width: 375, height: 812 });
      await page.goto(ANNOTATE_T001_URL);
      await page.goto(DETAIL_T002_R1_URL);

      await overviewTrigger(page).click();
      await expect(overviewMenu(page)).toBeVisible();
      await expect(overviewItems(page)).toHaveCount(3);

      await expect(overviewMenu(page).locator('.workspace-tab-kind')).toHaveCount(0);
      const annotateRow = overviewItems(page).filter({ hasText: `標記 ${NAME_ZH_T001}` });
      await expect(annotateRow).toHaveCount(1);
      const detailRow = overviewItems(page).filter({ hasText: `試標 R1 ${NAME_ZH_T002}` });
      await expect(detailRow).toHaveCount(1);

      // The annotation tab's title contains the task name only through the
      // new composition; its page-kind corpus has no entry for it.
      await overviewFilter(page).fill('醫療文本情感');
      const visibleRows = overviewItems(page).filter({ visible: true });
      await expect(visibleRows).toHaveCount(1);
      await expect(visibleRows.first()).toContainText(`標記 ${NAME_ZH_T001}`);
    });
  }
});

test.describe('Workspace tabs — FR-010 English UI (chip kind text, nameEn, fallbacks)', () => {
  test.beforeEach(async ({ page }) => {
    await skipGuidelineModal(page);
    await setDesktopViewport(page);
  });

  test('en: chips read Annotate / Review / Dry Run R1 / Official / Detail / Analysis and names use nameEn', async ({ page }) => {
    await page.goto(DETAIL_T001_R1_URL);
    await waitForTaskDetailReady(page); // #langToggle is bound only after init (issue #1202)
    await page.locator('#langToggle').click();
    await page.goto(DETAIL_T001_OFFICIAL_URL);
    await page.goto(DETAIL_T001_PLAIN_URL);
    await page.goto(ANNOTATE_T001_URL);
    await page.goto(REVIEW_T001_URL);
    await page.goto(ANALYSIS_T001_URL);
    const tabs = workspaceTabs(page);
    await expect(tabs).toHaveCount(6);

    const expected = ['Dry Run R1', 'Official', 'Detail', 'Annotate', 'Review', 'Analysis'];
    for (let i = 0; i < expected.length; i++) {
      await expect(kindOf(tabs.nth(i))).toHaveText(expected[i]);
      await expect(labelOf(tabs.nth(i))).toHaveText(NAME_EN_T001);
    }
    await expect(tabs.nth(3)).toHaveAttribute('title', `Annotate ${NAME_EN_T001}`);
    expect(await closeButton(tabs.nth(3)).getAttribute('aria-label')).toBe(`Close Annotate ${NAME_EN_T001}`);
  });

  test('en: a snapshot without nameEn falls back to nameZh, and with no snapshot to the raw taskId', async ({ page }) => {
    await page.goto(DASHBOARD_URL);
    await page.locator('#langToggle').click();
    const seeded = {
      tabs: [
        {
          dedupeKey: 'annotation-workspace:T901:annotate',
          url: '/pages/annotation/annotation-workspace.html?task_id=T901&sample_id=x&role=annotator&run_type=official_run',
          pageKind: 'annotation-workspace',
          taskId: 'T901',
          mode: 'annotate',
          stageBadge: null,
          stageRound: null,
          taskName: { zh: '僅有中文名稱', en: '' },
          lastActiveAt: 1,
        },
        {
          dedupeKey: 'annotation-workspace:T902:review',
          url: '/pages/annotation/annotation-workspace.html?task_id=T902&sample_id=x&role=reviewer&run_type=official_run',
          pageKind: 'annotation-workspace',
          taskId: 'T902',
          mode: 'review',
          stageBadge: null,
          stageRound: null,
          lastActiveAt: 2,
        },
      ],
      activeIndex: 1,
    };
    await page.evaluate(([key, state]) => window.sessionStorage.setItem(key as string, JSON.stringify(state)), [TAB_STORAGE_KEY, seeded] as const);
    await page.goto(PROFILE_URL);

    const tabs = workspaceTabs(page);
    await expect(tabs).toHaveCount(3);
    await expect(kindOf(tabs.nth(0))).toHaveText('Annotate');
    await expect(labelOf(tabs.nth(0))).toHaveText('僅有中文名稱');
    await expect(kindOf(tabs.nth(1))).toHaveText('Review');
    await expect(labelOf(tabs.nth(1))).toHaveText('T902');
  });
});

test('the tab bar still exposes exactly one role=tablist and every tab one chip at most', async ({ page }) => {
  await skipGuidelineModal(page);
  await setDesktopViewport(page);
  await page.goto(ANNOTATE_T001_URL);
  await page.goto(DETAIL_T002_R1_URL);
  await expect(tabBar(page)).toHaveAttribute('role', 'tablist');
  const tabs = workspaceTabs(page);
  await expect(tabs).toHaveCount(2);
  for (let i = 0; i < 2; i++) {
    await expect(kindOf(tabs.nth(i))).toHaveCount(1);
  }
});
