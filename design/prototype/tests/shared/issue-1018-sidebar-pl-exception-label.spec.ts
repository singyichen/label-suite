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
 *
 * Traceability: issue #1018; openspec/changes/fix-1018-sidebar-pl-label/tasks.md
 * task 1.1; specs/shared/008-sidebar-navbar-shared/spec.md FR-020.
 */
import { test, expect } from '@playwright/test';
import { buildWorkspaceUrl, skipGuidelineModal } from '../annotation/_workspace-helpers';

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
    const breadcrumbText = await workAreaCrumb(page).textContent();
    const sidebarText = await navAnnotation(page).textContent();

    expect(sidebarText).toBe('例外處置');
    expect(sidebarText).toBe(breadcrumbText);
  });
});

test.describe('issue #1018: project_leader #navAnnotation reads Exception Disposition (en)', () => {
  test.describe.configure({ retries: 2 });

  test('project_leader: #navAnnotation reads Exception Disposition after lang-toggle', async ({ page }) => {
    await skipGuidelineModal(page);
    await page.goto(buildProjectLeaderUrl(SAMPLE_EXCEPTION));
    await page.getByTestId('lang-toggle').click();

    await expect(navAnnotation(page)).toHaveText('Exception Disposition');
  });
});

test.describe('issue #1018: regression guard — reviewer #navAnnotation unchanged (zh/en)', () => {
  test.describe.configure({ retries: 2 });

  /* Non-regression pin: reviewer's existing branch (taskRoleLabels.annotationLabel)
   * must keep reading exactly as it does today, both before and after the
   * Green fix adds the project_leader branch alongside it. This case is
   * expected to PASS already. */
  test('reviewer: #navAnnotation stays 審核作業 / Review', async ({ page }) => {
    await skipGuidelineModal(page);
    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001', role: 'reviewer', run_type: 'dry_run' }));

    await expect(navAnnotation(page)).toHaveText('審核作業');

    await page.getByTestId('lang-toggle').click();
    await expect(navAnnotation(page)).toHaveText('Review');
  });
});

test.describe('issue #1018: regression guard — annotator #navAnnotation unchanged (zh/en)', () => {
  test.describe.configure({ retries: 2 });

  /* Non-regression pin: the pre-existing default ('標記作業' / 'Annotate')
   * must keep rendering for the true annotator role once the else-branch
   * gains a project_leader sibling. This case is expected to PASS already. */
  test('annotator: #navAnnotation stays 標記作業 / Annotate', async ({ page }) => {
    await skipGuidelineModal(page);
    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001', role: 'annotator', run_type: 'dry_run' }));

    await expect(navAnnotation(page)).toHaveText('標記作業');

    await page.getByTestId('lang-toggle').click();
    await expect(navAnnotation(page)).toHaveText('Annotate');
  });
});
