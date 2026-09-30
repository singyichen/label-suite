/**
 * Shared sidebar i18n contract — the page x role x language matrix for the
 * six L0 nav labels, plus the five sidebar contracts that are NOT
 * (page, role, language, label) tuples and therefore keep their own
 * scenarios.
 *
 * Consolidates seven issue-named files (issue #1059 group 5, 39 cases):
 *   shared/issue-1041-group3-nav-i18n.spec.ts            (3 cases)
 *   shared/issue-1041-group4-nav-i18n.spec.ts            (3 cases)
 *   shared/issue-1041-sidebar-nav-i18n.spec.ts           (12 cases)
 *   shared/issue-1018-sidebar-pl-exception-label.spec.ts (6 cases)
 *   shared/issue-1023-list-sidebar-taskrole.spec.ts      (7 cases)
 *   shared/issue-944-sidebar-role-aware-labels.spec.ts   (6 cases)
 *   shared/language-switch-consistency.spec.ts           (2 cases)
 *
 * Nothing was dropped: every one of the 39 pre-image cases was `keep` or
 * `merge` in tests/inventory.csv (38 `nav-status` rows + 1 `security` row,
 * zero `delete`), so this is a purely structural merge — identical
 * coverage, fewer page loads, one file.
 *
 * TWO RESOLUTION PATHS, hence two matrix tables. sidebar.js resolves the
 * six labels twice, in two separate ternaries that do not share code:
 *   - at mount, renderSidebar()'s `navItems` array (sidebar.js:521-522,
 *     529-577) reads `taskRoleI18n[readStoredLang()]` /
 *     `l0NavI18n[readStoredLang()]`;
 *   - on a language switch, applyGlobalLanguage() -> updateL0NavLanguage()
 *     (sidebar.js:278, 409-423) re-resolves all six from `currentTaskRole`.
 * A bug in one is invisible to the other, so both paths stay covered:
 *   - TOGGLE_PAGES exercise the switch path (preset zh, assert six, click
 *     #langToggle, assert six) — these nine pages pass no `taskRole`, and
 *     their toggle routes through applyGlobalLanguage().
 *   - ROLE_CELLS preset the stored language BEFORE navigation and assert once
 *     per language. For annotation-workspace.html this is forced:
 *     setupLangToggle() (annotation-workspace.config.js:6761-6777) never calls
 *     applyGlobalLanguage(), so a post-navigation click cannot update the six
 *     labels at all on that page.
 *
 *     For annotation-list.html it is a choice, not a constraint. That page
 *     does call applyGlobalLanguage() on init and on toggle
 *     (annotation-list.html:2555, :2567), so one load per role could verify
 *     both languages and the eight cells could be four - the inventory's
 *     merge reason for the issue-1023 rows asks for exactly that. They are
 *     kept as eight because one cell per (role, language) is what every
 *     pre-image did, and collapsing them would fold the URL-parameter
 *     resolution and the toggle path into a single assertion; the four
 *     loads that costs are the price of keeping those two paths separable.
 *     Revisit if load count becomes the binding constraint.
 *
 * Which ternary each ROLE_CELLS page actually lands on was measured, not
 * assumed (issue #1059 group 5 mutation runs):
 *   - annotation-workspace.html reads renderSidebar()'s ternary. Deleting
 *     its `project_leader` arm reddened the two workspace project_leader
 *     cells and left the annotation-list ones green.
 *   - annotation-list.html calls applyGlobalLanguage() during its own init
 *     (annotation-list.html:2555), so updateL0NavLanguage() overwrites the
 *     mount-time value before the page settles. Deleting that second
 *     ternary's `project_leader` arm reddened exactly the two
 *     annotation-list project_leader cells and left the workspace ones
 *     green — the precise complement.
 * Neither duplicated ternary survives this suite.
 *
 * Six L0 labels asserted per scenario, per issue #1059 §3 item 4. The
 * pre-image zh cases on the two role-aware pages asserted `#navAnnotation`
 * alone; asserting all six there is the widening that item mandates, not a
 * new requirement.
 *
 * No `test.describe.configure({ retries: 2 })`. The pre-images that carried
 * it justified it as a guard against "the shared static server's occasional
 * keep-alive drop under parallel load" — a Python-http.server failure mode
 * that playwright.config.ts's move to `node tests/serve.mjs` removed
 * (playwright.config.ts:43-50). The three pre-images without retries
 * (group3, group4, language-switch-consistency) already exercised these same
 * pages retry-free.
 *
 * Traceability: specs/shared/008-sidebar-navbar-shared/spec.md
 *   FR-009, FR-009A, FR-009B, FR-020, FR-020A, FR-021,
 *   SC-006, SC-006A, SC-013, SC-013A, SC-014
 */
import { test, expect, type Page } from '@playwright/test';
import { buildListUrl, buildWorkspaceUrl, skipGuidelineModal } from '../annotation/_workspace-helpers';

type Lang = 'zh' | 'en';
/** `none` = no `role` URL param / no `taskRole` passed to mountSidebar(). */
type TaskRole = 'annotator' | 'reviewer' | 'project_leader' | 'none';

/** The five role-independent L0 labels (sidebar.js's `l0NavI18n`). */
const L0_LABELS: Record<Lang, Record<string, string>> = {
  zh: {
    navDashboard: '儀表板',
    navTaskManagement: '任務管理',
    navDataset: '資料集分析',
    navAdmin: '系統管理',
    navProfile: '個人設定',
  },
  en: {
    navDashboard: 'Dashboard',
    navTaskManagement: 'Task Management',
    navDataset: 'Dataset Analytics',
    navAdmin: 'System Administration',
    navProfile: 'Profile',
  },
};

/** The sixth label, `#navAnnotation`, is the one that varies by task role
 * (sidebar.js's `taskRoleI18n`). */
const NAV_ANNOTATION: Record<Lang, Record<TaskRole, string>> = {
  zh: {
    annotator: '標記作業',
    none: '標記作業',
    reviewer: '審核作業',
    project_leader: '例外處置',
  },
  en: {
    annotator: 'Annotation',
    none: 'Annotation',
    reviewer: 'Review',
    project_leader: 'Exception Disposition',
  },
};

/* Presets the shared sidebar's stored language BEFORE navigation, so
 * mountSidebar() resolves the six labels in that language at mount time. */
async function presetLang(page: Page, lang: Lang) {
  await page.addInitScript((value) => {
    window.localStorage.setItem('labelsuite.lang', value);
  }, lang);
}

/** Asserts all six L0 labels for one (language, task role) cell.
 * `toHaveText()` polls, so it never reads a detached node (issue #1040). */
async function expectSixLabels(page: Page, lang: Lang, role: TaskRole) {
  for (const [navId, text] of Object.entries(L0_LABELS[lang])) {
    await expect(page.locator(`#${navId}`)).toHaveText(text);
  }
  await expect(page.locator('#navAnnotation')).toHaveText(NAV_ANNOTATION[lang][role]);
}

const TASK = 'T001';
const SAMPLE = 'sent-001';
const RUN_TYPE = 'dry_run';

/* `_workspace-helpers.ts`'s `Role` type is intentionally
 * `'annotator' | 'reviewer'` only, so project_leader deep links are built
 * locally. The T016 / pre-seeded final-exception / official_run / roster
 * annotator combination is the one proven to render the project-leader
 * exception-disposition screen. */
const PL_TASK = 'T016';
const PL_SAMPLE = 'ofm-05-final-exception';
const PL_ANNOTATOR = 'kioleemg12';
const PL_WORKSPACE_URL = `/pages/annotation/annotation-workspace.html?task_id=${PL_TASK}&sample_id=${PL_SAMPLE}&role=project_leader&run_type=official_run&annotator_id=${PL_ANNOTATOR}`;
const PL_LIST_URL = `/pages/annotation/annotation-list.html?task_id=${TASK}&role=project_leader&run_type=${RUN_TYPE}`;
const NO_ROLE_LIST_URL = `/pages/annotation/annotation-list.html?task_id=${TASK}&run_type=${RUN_TYPE}`;

/* ── matrix 1: the language-switch path ──────────────────────────────────
 * Nine pages that mount the shared sidebar with no `taskRole` and whose own
 * language toggle routes through LabelSuiteSharedSidebar.applyGlobalLanguage().
 * `preset: null` reproduces a pre-image that relied on readStoredLang()'s
 * 'zh' fallback rather than writing localStorage first. */
const TOGGLE_PAGES: ReadonlyArray<{ name: string; url: string; preset: Lang | null }> = [
  { name: 'dashboard/dashboard.html', url: '/pages/dashboard/dashboard.html', preset: null },
  { name: 'account/profile.html', url: '/pages/account/profile.html', preset: 'zh' },
  {
    name: 'dataset/dataset-analysis-detail.html',
    url: '/pages/dataset/dataset-analysis-detail.html?task_id=T102',
    preset: 'zh',
  },
  { name: 'dataset/dataset-analysis-list.html', url: '/pages/dataset/dataset-analysis-list.html', preset: 'zh' },
  {
    name: 'task-management/task-detail.html',
    url: '/pages/task-management/task-detail.html?task_id=T001',
    preset: 'zh',
  },
  { name: 'task-management/task-list.html', url: '/pages/task-management/task-list.html', preset: 'zh' },
  { name: 'task-management/task-new.html', url: '/pages/task-management/task-new.html', preset: 'zh' },
  { name: 'admin/user-management.html', url: '/pages/admin/user-management.html', preset: 'zh' },
  { name: 'admin/role-settings.html', url: '/pages/admin/role-settings.html', preset: 'zh' },
];

test.describe('shared sidebar i18n — six L0 labels re-resolve in place on a language switch (FR-021, SC-014)', () => {
  for (const { name, url, preset } of TOGGLE_PAGES) {
    test(`${name}: all six L0 labels go zh -> en in place after clicking #langToggle`, async ({ page }) => {
      if (preset) await presetLang(page, preset);
      await page.goto(url);

      await expectSixLabels(page, 'zh', 'none');

      await page.locator('#langToggle').click();

      await expectSixLabels(page, 'en', 'none');
    });
  }
});

/* ── matrix 2: language chosen before navigation ─────────────────────────
 * The two role-aware pages. `taskRole` comes from the URL's `role` param
 * (annotation-workspace.html:1120-1123; annotation-list.html's
 * mountSidebar() call site, fixed by issue #1023), so each role is a
 * distinct URL and therefore a distinct page load. `role: 'none'` is the
 * no-`role`-param URL, which must resolve identically to `annotator`. */
const ROLE_CELLS: ReadonlyArray<{ page: string; role: TaskRole; url: string; guideline: boolean }> = [
  {
    page: 'annotation/annotation-list.html',
    role: 'reviewer',
    url: buildListUrl({ task_id: TASK, role: 'reviewer', run_type: RUN_TYPE }),
    guideline: false,
  },
  { page: 'annotation/annotation-list.html', role: 'project_leader', url: PL_LIST_URL, guideline: false },
  {
    page: 'annotation/annotation-list.html',
    role: 'annotator',
    url: buildListUrl({ task_id: TASK, role: 'annotator', run_type: RUN_TYPE }),
    guideline: false,
  },
  { page: 'annotation/annotation-list.html', role: 'none', url: NO_ROLE_LIST_URL, guideline: false },
  {
    page: 'annotation/annotation-workspace.html',
    role: 'reviewer',
    url: buildWorkspaceUrl({ task_id: TASK, sample_id: SAMPLE, role: 'reviewer', run_type: RUN_TYPE }),
    guideline: true,
  },
  {
    page: 'annotation/annotation-workspace.html',
    role: 'project_leader',
    url: PL_WORKSPACE_URL,
    guideline: true,
  },
  {
    page: 'annotation/annotation-workspace.html',
    role: 'annotator',
    url: buildWorkspaceUrl({ task_id: TASK, sample_id: SAMPLE, role: 'annotator', run_type: RUN_TYPE }),
    guideline: true,
  },
];

test.describe('shared sidebar i18n — six L0 labels resolve from the URL task role (FR-020, FR-021)', () => {
  for (const cell of ROLE_CELLS) {
    for (const lang of ['zh', 'en'] as const) {
      test(`${cell.page} as ${cell.role} (${lang}): all six L0 labels, #navAnnotation reads ${NAV_ANNOTATION[lang][cell.role]}`, async ({
        page,
      }) => {
        if (cell.guideline) await skipGuidelineModal(page);
        /* zh is readStoredLang()'s fallback, and every pre-image zh case on
         * these two pages navigated without writing localStorage first. */
        if (lang === 'en') await presetLang(page, 'en');
        await page.goto(cell.url);

        await expectSixLabels(page, lang, cell.role);
      });
    }
  }
});

/* ── the five non-tuple sidebar contracts ────────────────────────────── */

test.describe('shared sidebar i18n — mobile language toggle stays in sync with the desktop one (FR-009A, FR-009B, SC-006A)', () => {
  const mobileSidebarPages = [
    '/pages/dashboard/dashboard.html',
    '/pages/admin/user-management.html',
    '/pages/admin/role-settings.html',
  ];

  test('375px: #mobileLangToggle switches the document language and both language labels', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });

    for (const url of mobileSidebarPages) {
      await presetLang(page, 'zh');
      await page.goto(url);

      await expect(page.locator('#mobileLangLabel')).toHaveText('ZH');
      await page.locator('#mobileLangToggle').click();
      await expect(page.locator('html')).toHaveAttribute('lang', 'en');
      await expect(page.locator('#langLabel')).toHaveText('EN');
      await expect(page.locator('#mobileLangLabel')).toHaveText('EN');
      await expect(page.locator('#mobileLangToggle')).toHaveAttribute('aria-label', 'Switch language');
    }
  });
});

/** First breadcrumb segment — the work-area label link. */
function workAreaCrumb(page: Page) {
  return page.getByTestId('entry-breadcrumb').locator('a').first();
}

test.describe('shared sidebar i18n — #navAnnotation agrees with the entry breadcrumb work-area label (FR-020)', () => {
  test('reviewer: sidebar and breadcrumb both read 審核作業', async ({ page }) => {
    await skipGuidelineModal(page);
    await page.goto(buildWorkspaceUrl({ task_id: TASK, sample_id: SAMPLE, role: 'reviewer', run_type: RUN_TYPE }));

    await expect(page.locator('#navAnnotation')).toHaveText('審核作業');
    await expect(workAreaCrumb(page)).toHaveText('審核作業');
  });

  test('project_leader: sidebar and breadcrumb both read 例外處置', async ({ page }) => {
    await skipGuidelineModal(page);
    await page.goto(PL_WORKSPACE_URL);

    await expect(page.locator('#navAnnotation')).toHaveText('例外處置');
    await expect(workAreaCrumb(page)).toHaveText('例外處置');
  });
});

test.describe('shared sidebar i18n — the user chip role indicator resolves from taskRole (FR-020A)', () => {
  test('reviewer: role-indicator reads 審核員', async ({ page }) => {
    await skipGuidelineModal(page);
    await page.goto(buildWorkspaceUrl({ task_id: TASK, sample_id: SAMPLE, role: 'reviewer', run_type: RUN_TYPE }));

    await expect(page.getByTestId('role-indicator')).toHaveText('審核員');
  });

  test('annotator: role-indicator stays 一般使用者', async ({ page }) => {
    await skipGuidelineModal(page);
    await page.goto(buildWorkspaceUrl({ task_id: TASK, sample_id: SAMPLE, role: 'annotator', run_type: RUN_TYPE }));

    await expect(page.getByTestId('role-indicator')).toHaveText('一般使用者');
  });
});

test.describe('shared sidebar i18n — mountSidebar({ taskRole }) resolves both labels with no consumer JS (FR-020, FR-020A)', () => {
  test('re-mounting flips #navAnnotation and role-indicator both ways', async ({ page }) => {
    // Load as annotator so any legacy consumer-side reviewer-only override
    // branch (issue #309, issue #931), if still present, does NOT fire for
    // this page load -- isolating the assertions to sidebar.js's own mount
    // resolution.
    await skipGuidelineModal(page);
    await page.goto(buildWorkspaceUrl({ task_id: TASK, sample_id: SAMPLE, role: 'annotator', run_type: RUN_TYPE }));

    await page.evaluate(() => {
      (window as any).LabelSuiteSharedSidebar.mountSidebar({
        mountId: 'sharedSidebarMount',
        taskRole: 'reviewer',
      });
    });

    await expect(page.locator('#navAnnotation')).toHaveText('審核作業');
    await expect(page.getByTestId('role-indicator')).toHaveText('審核員');

    // Inverse: re-mounting with the annotator taskRole must restore the
    // defaults -- proving the resolution is a live function of `taskRole` on
    // each mount, not a one-way patch.
    await page.evaluate(() => {
      (window as any).LabelSuiteSharedSidebar.mountSidebar({
        mountId: 'sharedSidebarMount',
        taskRole: 'annotator',
      });
    });

    await expect(page.locator('#navAnnotation')).toHaveText('標記作業');
    await expect(page.getByTestId('role-indicator')).toHaveText('一般使用者');
  });
});

/* SECURITY-INVARIANT, deliberately NOT a matrix cell: this scenario is not a
 * (page, role, language, label) tuple. It proves that adding the `taskRole`
 * option did not reopen the issue #946 userName escaping contract — a
 * hostile userName must render as literal text, never as parsed markup. */
test.describe('shared sidebar i18n — taskRole does not reopen the userName escaping contract (FR-020, FR-020A)', () => {
  test('a malicious userName combined with taskRole still renders as literal text', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/pages/annotation/annotation-workspace.html');

    const payload = '<img src=x onerror="window.__sidebarXssFired = true">';

    // Same injection path as issue-946-sidebar-escape-username.spec.ts
    // (renderSidebar() string-concatenates userName into the HTML it hands to
    // mountNode.innerHTML on initial render), now combined with the taskRole
    // option in the same mountSidebar() call.
    await page.evaluate((userNamePayload) => {
      (window as any).__sidebarXssFired = false;
      (window as any).LabelSuiteSharedSidebar.mountSidebar({ userName: userNamePayload, taskRole: 'reviewer' });
    }, payload);

    const userName = page.locator('#userName');

    // These three catch a different mutation than the canary below: if the
    // textContent write in updateUserChip() were removed, a parsed <img>
    // would stay in the DOM and the counts would see it. They do NOT catch an
    // injection that still gets patched over, because mountSidebar() rewrites
    // #userName synchronously - verified by mutation: re-introducing the
    // innerHTML concatenation fires onerror while all three of these pass.
    await expect(userName).toHaveText(payload);
    await expect(page.locator('#userName img')).toHaveCount(0);
    await expect(page.locator('#userAvatar img')).toHaveCount(0);

    // The load-bearing assertion. It is also payload-specific: it proves this
    // payload's onerror did not run, not that no markup was parsed. Asserting
    // renderSidebar()'s returned string would cover the parsed-but-inert case
    // too; that is tracked rather than done here.
    const xssFired = await page.evaluate(() => (window as any).__sidebarXssFired);
    expect(xssFired).toBe(false);
  });
});
