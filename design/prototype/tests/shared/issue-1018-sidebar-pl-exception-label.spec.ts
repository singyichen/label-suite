/**
 * issue #1018: on the project-leader final-exception-disposition screen of
 * annotation-workspace.html, the shared sidebar's `renderSidebar()`
 * (design/prototype/pages/shared/sidebar.js ~485-512) resolves the
 * `#navAnnotation` L0 nav item's label with:
 *
 *   defaultLabel: taskRole === 'reviewer' ? taskRoleLabels.annotationLabel : '標記作業'
 *
 * `project_leader` has no branch of its own here, so it falls into the same
 * `else` as `annotator` and renders '標記作業' ("Annotate"). That is wrong:
 * the SAME screen's entry breadcrumb first segment already got its own
 * `project_leader` branch (issue #994, `crumbWorkAreaProjectLeader`) and
 * reads "例外處置" / "Exception Disposition" — so today the sidebar and the
 * breadcrumb disagree on the very same screen.
 *
 * The Green fix (not part of this file) adds a `project_leader` branch to
 * `taskRoleI18n` / the `navItems` `annotation` entry's `defaultLabel`
 * resolution in sidebar.js, alongside the existing `reviewer` check. This
 * file asserts the fix's OUTPUT TEXT ("例外處置" / "Exception Disposition"),
 * matching the literal `crumbWorkAreaProjectLeader` strings in
 * annotation-workspace.config.js, not any i18n key name.
 *
 * Structural conventions:
 * - project_leader URL construction mirrors buildProjectLeaderUrl() in
 *   issue-994-pl-breadcrumb-work-area.spec.ts, since `_workspace-helpers.ts`'s
 *   `Role` type is intentionally `'annotator' | 'reviewer'` only.
 * - Each scenario lives in its own `test.describe` (retries: 2), mirroring
 *   issue-944-sidebar-role-aware-labels.spec.ts's guard against the shared
 *   static server's occasional keep-alive drop under parallel load, rather
 *   than one serial block whose early failure would hide a later
 *   non-regression pin as "did not run" instead of reporting it as passed.
 * - English assertions preset `localStorage.labelsuite.lang = 'en'` via
 *   `addInitScript` BEFORE `page.goto`, instead of clicking the sidebar's
 *   `data-testid="lang-toggle"` after navigation. Root cause: `sidebar.js`'s
 *   `mountSidebar()` (annotation-workspace.html:1108-1116) bakes
 *   `#navAnnotation`'s text into static HTML once, at mount, from
 *   `taskRoleI18n[readStoredLang()]` (sidebar.js:486,511-512).
 *   `annotation-workspace.config.js`'s `setupLangToggle()` (:6374-6386)
 *   persists the new language and re-renders the breadcrumb/workspace, but
 *   never re-invokes `mountSidebar()`, so `#navAnnotation` never reflects a
 *   post-navigation `lang-toggle` click for ANY role -- confirmed by running
 *   the lang-toggle-click version of this file's reviewer/annotator
 *   regression guards, which failed on the English half even though nothing
 *   in this issue's scope touches that path. Presetting the stored language
 *   before navigation matches the point `mountSidebar()` actually reads it.
 *
 * Traceability: issue #1018; openspec/changes/fix-1018-sidebar-pl-label/tasks.md
 * task 1.1; specs/shared/008-sidebar-navbar-shared/spec.md FR-020.
 */
import { test, expect, type Page } from '@playwright/test';
import { buildWorkspaceUrl, skipGuidelineModal } from '../annotation/_workspace-helpers';

/* Mirrors skipGuidelineModal()'s addInitScript pattern: presets the shared
 * sidebar's stored language BEFORE navigation, so mountSidebar() resolves
 * `#navAnnotation` in English at mount time (see file-header note on why a
 * post-navigation lang-toggle click does not work for this element). */
async function presetEnglish(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('labelsuite.lang', 'en');
  });
}

const TASK = 'T016';
const RUN_TYPE = 'official_run';
const ANNOTATOR = 'kioleemg12';
const SAMPLE_EXCEPTION = 'ofm-05-final-exception'; // pre-seeded final exception at boot

/* `_workspace-helpers.ts`'s `Role` type is intentionally `'annotator' |
 * 'reviewer'` only, so the project_leader deep link is built locally here,
 * mirroring issue-994-pl-breadcrumb-work-area.spec.ts's own builder. */
function buildProjectLeaderUrl(sampleId: string): string {
  return `/pages/annotation/annotation-workspace.html?task_id=${TASK}&sample_id=${sampleId}&role=project_leader&run_type=${RUN_TYPE}&annotator_id=${ANNOTATOR}`;
}

function navAnnotation(page: import('@playwright/test').Page) {
  return page.locator('#navAnnotation');
}

/** First breadcrumb segment — the work-area label link. */
function workAreaCrumb(page: import('@playwright/test').Page) {
  return page.getByTestId('entry-breadcrumb').locator('a').first();
}

test.describe('issue #1018: project_leader #navAnnotation reads 例外處置, matches entry breadcrumb (zh)', () => {
  test.describe.configure({ retries: 2 });

  test('project_leader: #navAnnotation reads 例外處置 and matches entry breadcrumb first crumb', async ({ page }) => {
    await skipGuidelineModal(page);
    await page.goto(buildProjectLeaderUrl(SAMPLE_EXCEPTION));

    // Red: today this renders "標記作業" because project_leader falls into
    // the same else-branch as annotator in sidebar.js's navItems resolution.
    // toHaveText() polls/retries instead of a one-shot textContent() read,
    // avoiding the detached-node race documented in issue #1040.
    await expect(navAnnotation(page)).toHaveText('例外處置');
    await expect(workAreaCrumb(page)).toHaveText('例外處置');
  });
});

test.describe('issue #1018: project_leader #navAnnotation reads Exception Disposition (en)', () => {
  test.describe.configure({ retries: 2 });

  test('project_leader: #navAnnotation reads Exception Disposition with English preset before navigation', async ({ page }) => {
    await skipGuidelineModal(page);
    await presetEnglish(page);
    await page.goto(buildProjectLeaderUrl(SAMPLE_EXCEPTION));

    await expect(navAnnotation(page)).toHaveText('Exception Disposition');
  });
});

test.describe('issue #1018: regression guard — reviewer #navAnnotation unchanged (zh/en)', () => {
  test.describe.configure({ retries: 2 });

  /* Non-regression pin: reviewer's existing branch (taskRoleLabels.annotationLabel)
   * must keep reading exactly as it does today, both before and after the
   * Green fix adds the project_leader branch alongside it. This case is
   * expected to PASS already. */
  test('reviewer: #navAnnotation stays 審核作業 (zh)', async ({ page }) => {
    await skipGuidelineModal(page);
    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001', role: 'reviewer', run_type: 'dry_run' }));

    await expect(navAnnotation(page)).toHaveText('審核作業');
  });

  test('reviewer: #navAnnotation stays Review (en, preset before navigation)', async ({ page }) => {
    await skipGuidelineModal(page);
    await presetEnglish(page);
    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001', role: 'reviewer', run_type: 'dry_run' }));

    await expect(navAnnotation(page)).toHaveText('Review');
  });
});

test.describe('issue #1018: regression guard — annotator #navAnnotation unchanged (zh/en)', () => {
  test.describe.configure({ retries: 2 });

  /* Non-regression pin: the pre-existing default ('標記作業' / 'Annotate')
   * must keep rendering for the true annotator role once the else-branch
   * gains a project_leader sibling. This case is expected to PASS already. */
  test('annotator: #navAnnotation stays 標記作業 (zh)', async ({ page }) => {
    await skipGuidelineModal(page);
    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001', role: 'annotator', run_type: 'dry_run' }));

    await expect(navAnnotation(page)).toHaveText('標記作業');
  });

  /* sidebar.js's else-branch defaultLabel (annotator/project_leader today)
   * is the bare literal '標記作業' with no English variant anywhere in
   * sidebar.js -- confirmed by grep; "Annotate" only exists in
   * annotation-workspace.config.js's separate breadcrumb dictionary, a
   * different component. So under an English-preset context the correct
   * pin is that this branch stays untranslated, same as zh -- that is
   * today's real (if incomplete) behavior, not a claim it's correct, and
   * fixing it is a second, unscoped FR change outside #1018 (task 2.1
   * leaves this else-branch untouched). */
  test('annotator: #navAnnotation stays untranslated 標記作業 (en context, preset before navigation)', async ({ page }) => {
    await skipGuidelineModal(page);
    await presetEnglish(page);
    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001', role: 'annotator', run_type: 'dry_run' }));

    await expect(navAnnotation(page)).toHaveText('標記作業');
  });
});
