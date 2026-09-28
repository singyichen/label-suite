/**
 * issue #1041: two real, currently-reproducible language gaps in the Shared
 * Sidebar (design/prototype/pages/shared/sidebar.js):
 *
 * 1. `annotation-list.html`'s `#navAnnotation` for the `annotator` role (or
 *    no `role` param at all) renders the untranslated Chinese '標記作業'
 *    under an English locale, instead of 'Annotation'. This is the
 *    regression issue #1023 deliberately accepted and tracked here — see
 *    issue-1023-list-sidebar-taskrole.spec.ts's file header and its
 *    "DELIBERATELY ACCEPTED REGRESSION" case (that file/case is NOT edited
 *    by this task; a separate task updates it once the Green fix lands).
 *    Root cause: `sidebar.js`'s `taskRoleI18n` (~368-371) gives `reviewer`
 *    and `project_leader` an English string but the `annotator`/else branch
 *    (renderSidebar() ~512-513) has none.
 *
 * 2. `annotation-workspace.html` mounts the shared sidebar with no
 *    page-level nav-label override and no language-toggle UI of its own. A
 *    user who already set `localStorage.labelsuite.lang = 'en'` on another
 *    page and then deep-links here sees only `#navAnnotation` in English
 *    (via the existing `taskRoleI18n` table) while the other five L0 items
 *    (`navDashboard`/`navTaskManagement`/`navDataset`/`navAdmin`/
 *    `navProfile`) stay the hardcoded Chinese `defaultLabel` literals in
 *    `renderSidebar()`'s `navItems` array (~498-538) — a real "five Chinese,
 *    one English" mix, not a translation choice.
 *
 * The Green fix (not part of this file) makes all six L0 labels
 * language-aware inside `sidebar.js` and makes `applyGlobalLanguage()`
 * re-resolve and update all six `#navXxx` nodes on every call, not only at
 * initial mount (today it only updates `langLabel`/`mobileLangLabel`/toggle
 * aria-labels/shortcut-help text/admin-submenu text — confirmed by reading
 * `applyGlobalLanguage()`, sidebar.js ~249-280).
 *
 * Structural conventions (mirrors issue-1023-list-sidebar-taskrole.spec.ts
 * and issue-1018-sidebar-pl-exception-label.spec.ts):
 * - Each scenario lives in its own `test.describe` (retries: 2).
 * - AC-021.1/1.2/1.4 preset `localStorage.labelsuite.lang = 'en'` via
 *   `page.addInitScript` BEFORE `page.goto`, not a post-navigation
 *   `lang-toggle` click — `#navAnnotation`'s text is baked into static HTML
 *   once, at mount, from `taskRoleI18n[readStoredLang()]`. AC-021.3 is the
 *   one scenario that DOES click the toggle, because it exists specifically
 *   to assert the Green fix's new re-resolve-on-toggle behavior.
 * - All assertions use `expect(locator).toHaveText(...)`, which polls/
 *   retries, never a one-shot `.textContent()` / `.evaluate()` read after a
 *   separate `.toBeVisible()` (issue #1040 detached-element race).
 * - `project_leader` deep links are built locally (`_workspace-helpers.ts`'s
 *   `Role` type is intentionally `'annotator' | 'reviewer'` only), mirroring
 *   `buildProjectLeaderUrl()` in issue-1018-sidebar-pl-exception-label.spec.ts
 *   and `buildProjectLeaderListUrl()` in
 *   issue-1023-list-sidebar-taskrole.spec.ts.
 *
 * Traceability: issue #1041; openspec/changes/fix-1041-sidebar-nav-i18n/
 * tasks.md task 1.1; specs/shared/008-sidebar-navbar-shared/spec.md FR-021
 * (proposed), SC-014 (proposed).
 */
import { test, expect, type Page } from '@playwright/test';
import { buildListUrl, buildWorkspaceUrl, skipGuidelineModal } from '../annotation/_workspace-helpers';

async function presetEnglish(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('labelsuite.lang', 'en');
  });
}

function navAnnotation(page: Page) {
  return page.locator('#navAnnotation');
}

const TASK = 'T001';
const RUN_TYPE = 'dry_run';
const SAMPLE = 'sent-001';

/* Same combo as issue-1018-sidebar-pl-exception-label.spec.ts's
 * project_leader case: T016 / a pre-seeded final exception sample /
 * official_run / the roster's default annotator id — proven to render
 * annotation-workspace.html for role=project_leader without erroring. */
const PL_TASK = 'T016';
const PL_RUN_TYPE = 'official_run';
const PL_ANNOTATOR = 'kioleemg12';
const PL_SAMPLE_EXCEPTION = 'ofm-05-final-exception';

function buildProjectLeaderWorkspaceUrl(): string {
  return `/pages/annotation/annotation-workspace.html?task_id=${PL_TASK}&sample_id=${PL_SAMPLE_EXCEPTION}&role=project_leader&run_type=${PL_RUN_TYPE}&annotator_id=${PL_ANNOTATOR}`;
}

/** Asserts all six L0 labels read their English values; `expectedAnnotation`
 * varies by taskRole (Review / Exception Disposition / Annotation). */
async function assertAllSixLabelsEnglish(page: Page, expectedAnnotation: string) {
  await expect(page.locator('#navDashboard')).toHaveText('Dashboard');
  await expect(page.locator('#navTaskManagement')).toHaveText('Task Management');
  await expect(navAnnotation(page)).toHaveText(expectedAnnotation);
  await expect(page.locator('#navDataset')).toHaveText('Dataset Analytics');
  await expect(page.locator('#navAdmin')).toHaveText('System Administration');
  await expect(page.locator('#navProfile')).toHaveText('Profile');
}

/** Asserts all six L0 labels read their Chinese values; `expectedAnnotation`
 * varies by taskRole (審核作業 / 例外處置 / 標記作業). */
async function assertAllSixLabelsChinese(page: Page, expectedAnnotation: string) {
  await expect(page.locator('#navDashboard')).toHaveText('儀表板');
  await expect(page.locator('#navTaskManagement')).toHaveText('任務管理');
  await expect(navAnnotation(page)).toHaveText(expectedAnnotation);
  await expect(page.locator('#navDataset')).toHaveText('資料集分析');
  await expect(page.locator('#navAdmin')).toHaveText('系統管理');
  await expect(page.locator('#navProfile')).toHaveText('個人設定');
}

test.describe('issue #1041 AC-021.1: annotation-list.html #navAnnotation reads Annotation for annotator/no-role (en)', () => {
  test.describe.configure({ retries: 2 });

  test('annotator: #navAnnotation reads Annotation with English preset before navigation', async ({ page }) => {
    await presetEnglish(page);
    await page.goto(buildListUrl({ task_id: TASK, role: 'annotator', run_type: RUN_TYPE }));

    // Red: today sidebar.js's annotator/else branch has no English string,
    // so this renders the untranslated '標記作業' instead.
    await expect(navAnnotation(page)).toHaveText('Annotation');
  });

  test('no role param: #navAnnotation reads Annotation with English preset before navigation', async ({ page }) => {
    await presetEnglish(page);
    await page.goto(`/pages/annotation/annotation-list.html?task_id=${TASK}&run_type=${RUN_TYPE}`);

    await expect(navAnnotation(page)).toHaveText('Annotation');
  });
});

test.describe('issue #1041 AC-021.2: annotation-workspace.html deep link — all six L0 labels English, no toggle interaction', () => {
  test.describe.configure({ retries: 2 });

  test('reviewer deep link: all six labels English, #navAnnotation reads Review', async ({ page }) => {
    await skipGuidelineModal(page);
    await presetEnglish(page);
    await page.goto(buildWorkspaceUrl({ task_id: TASK, sample_id: SAMPLE, role: 'reviewer', run_type: RUN_TYPE }));

    // Red today: #navAnnotation already reads 'Review' (existing
    // taskRoleI18n), but the other five labels stay hardcoded Chinese —
    // the real "five Chinese, one English" mix this issue tracks.
    await assertAllSixLabelsEnglish(page, 'Review');
  });

  test('project_leader deep link: all six labels English, #navAnnotation reads Exception Disposition', async ({ page }) => {
    await skipGuidelineModal(page);
    await presetEnglish(page);
    await page.goto(buildProjectLeaderWorkspaceUrl());

    await assertAllSixLabelsEnglish(page, 'Exception Disposition');
  });

  test('annotator deep link: all six labels English, #navAnnotation reads Annotation', async ({ page }) => {
    await skipGuidelineModal(page);
    await presetEnglish(page);
    await page.goto(buildWorkspaceUrl({ task_id: TASK, sample_id: SAMPLE, role: 'annotator', run_type: RUN_TYPE }));

    // Red today: neither #navAnnotation (no English string for the
    // annotator/else branch) nor the other five labels are English.
    await assertAllSixLabelsEnglish(page, 'Annotation');
  });
});

test.describe('issue #1041 AC-021.3: language toggle re-resolves all six L0 labels immediately, no reload', () => {
  test.describe.configure({ retries: 2 });

  test('dashboard.html: clicking #langToggle updates all six labels from zh to en in place', async ({ page }) => {
    await page.goto('/pages/dashboard/dashboard.html');

    // Non-regression pin: initial zh render is already correct today.
    await assertAllSixLabelsChinese(page, '標記作業');

    await page.locator('#langToggle').click();

    // Red today: applyGlobalLanguage() never re-resolves the six #navXxx
    // nodes, so this click updates langLabel/aria-labels/etc. but leaves
    // all six L0 labels exactly as they were (still Chinese).
    await assertAllSixLabelsEnglish(page, 'Annotation');
  });
});

test.describe('issue #1041 AC-021.4: #navAnnotation matrix — three taskRole x two languages', () => {
  test.describe.configure({ retries: 2 });

  test('reviewer: #navAnnotation reads 審核作業 (zh)', async ({ page }) => {
    await skipGuidelineModal(page);
    await page.goto(buildWorkspaceUrl({ task_id: TASK, sample_id: SAMPLE, role: 'reviewer', run_type: RUN_TYPE }));

    await expect(navAnnotation(page)).toHaveText('審核作業');
  });

  test('reviewer: #navAnnotation reads Review (en, preset before navigation)', async ({ page }) => {
    await skipGuidelineModal(page);
    await presetEnglish(page);
    await page.goto(buildWorkspaceUrl({ task_id: TASK, sample_id: SAMPLE, role: 'reviewer', run_type: RUN_TYPE }));

    await expect(navAnnotation(page)).toHaveText('Review');
  });

  test('project_leader: #navAnnotation reads 例外處置 (zh)', async ({ page }) => {
    await skipGuidelineModal(page);
    await page.goto(buildProjectLeaderWorkspaceUrl());

    await expect(navAnnotation(page)).toHaveText('例外處置');
  });

  test('project_leader: #navAnnotation reads Exception Disposition (en, preset before navigation)', async ({ page }) => {
    await skipGuidelineModal(page);
    await presetEnglish(page);
    await page.goto(buildProjectLeaderWorkspaceUrl());

    await expect(navAnnotation(page)).toHaveText('Exception Disposition');
  });

  test('annotator/none: #navAnnotation reads 標記作業 (zh)', async ({ page }) => {
    await skipGuidelineModal(page);
    await page.goto(buildWorkspaceUrl({ task_id: TASK, sample_id: SAMPLE, role: 'annotator', run_type: RUN_TYPE }));

    await expect(navAnnotation(page)).toHaveText('標記作業');
  });

  /* Red: today the annotator/else branch has no English string, so this
   * renders the untranslated '標記作業' instead of 'Annotation'. */
  test('annotator/none: #navAnnotation reads Annotation (en, preset before navigation)', async ({ page }) => {
    await skipGuidelineModal(page);
    await presetEnglish(page);
    await page.goto(buildWorkspaceUrl({ task_id: TASK, sample_id: SAMPLE, role: 'annotator', run_type: RUN_TYPE }));

    await expect(navAnnotation(page)).toHaveText('Annotation');
  });
});
