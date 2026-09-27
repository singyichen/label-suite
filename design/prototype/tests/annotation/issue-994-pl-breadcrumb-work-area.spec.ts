/**
 * issue #994: on the project-leader final-exception-disposition screen of
 * annotation-workspace.html, `renderEntryBreadcrumb()` (:1466-1472) picks the
 * FIRST breadcrumb segment (the work-area label) with:
 *
 *   appendCrumbLink(nav, '../dashboard/dashboard.html',
 *     t(currentRole === 'reviewer' ? 'crumbWorkAreaReviewer' : 'crumbWorkAreaAnnotator'));
 *
 * `project_leader` has no branch of its own here, so it falls into the same
 * `else` as `annotator` and renders `crumbWorkAreaAnnotator` ("標記作業" /
 * "Annotate"). That is wrong: per FR-095, `project_leader` on this screen is
 * doing FR-095's final exception disposition, not annotation — the THIRD
 * breadcrumb segment already got its own project_leader branch for exactly
 * this reason (issue #922, `crumbExceptionUnitTpl`, :1493-1501), but the
 * FIRST segment's work-area label was never updated to match.
 *
 * The Green fix (not part of this file) adds a third i18n key and a
 * `project_leader` branch alongside the existing `reviewer` check at
 * :1471-1472. This file asserts the fix's OUTPUT TEXT ("例外處置" /
 * "Exception Disposition"), not the i18n key name, since the key name is an
 * implementation detail.
 *
 * Traceability: issue #994; specs/annotation/015-annotation-workspace/spec.md
 * FR-095 (project_leader's final-exception-disposition screen must not
 * present itself as the annotator's own work area).
 */
import { test, expect, type Page } from '@playwright/test';
import { skipGuidelineModal } from './_workspace-helpers';

const TASK = 'T016';
const RUN_TYPE = 'official_run';
const ANNOTATOR = 'kioleemg12';
const SAMPLE_EXCEPTION = 'ofm-05-final-exception'; // pre-seeded final exception at boot

/* _workspace-helpers.ts's `Role` type is intentionally `'annotator' |
 * 'reviewer'` only, so `project_leader` deep links are built locally here,
 * mirroring issue-922-exception-breadcrumb.spec.ts's own builder. */
function buildProjectLeaderUrl(sampleId: string): string {
  return `/pages/annotation/annotation-workspace.html?task_id=${TASK}&sample_id=${sampleId}&role=project_leader&run_type=${RUN_TYPE}&annotator_id=${ANNOTATOR}`;
}

function buildReviewerUrl(sampleId: string): string {
  return `/pages/annotation/annotation-workspace.html?task_id=${TASK}&sample_id=${sampleId}&role=reviewer&run_type=${RUN_TYPE}&annotator_id=${ANNOTATOR}`;
}

function buildAnnotatorUrl(taskId: string, sampleId: string): string {
  return `/pages/annotation/annotation-workspace.html?task_id=${taskId}&sample_id=${sampleId}&role=annotator&run_type=${RUN_TYPE}`;
}

/** First breadcrumb segment — the work-area label link. */
function workAreaCrumb(page: Page) {
  return page.locator('nav.breadcrumb[data-testid="entry-breadcrumb"] a').first();
}

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
});

test.describe('issue #994: project_leader work-area breadcrumb must read "Exception Disposition", not "Annotate"', () => {
  test('project_leader sees the exception-disposition work-area label (zh)', async ({ page }) => {
    await page.goto(buildProjectLeaderUrl(SAMPLE_EXCEPTION));

    // Red: today this renders "標記作業" (crumbWorkAreaAnnotator) because
    // project_leader falls into the same else-branch as annotator.
    await expect(workAreaCrumb(page)).toHaveText('例外處置');
  });

  test('project_leader sees the exception-disposition work-area label (en)', async ({ page }) => {
    await page.goto(buildProjectLeaderUrl(SAMPLE_EXCEPTION));
    await page.getByTestId('lang-toggle').click();

    await expect(workAreaCrumb(page)).toHaveText('Exception Disposition');
  });

  /* Regression guard: the two existing work-area labels (reviewer,
   * annotator) must keep reading exactly as they do today. Both assertions
   * below are green before any Green-phase code change — they pin the
   * pre-existing, correct behavior so a fix that touches the shared
   * ternary/ if-chain cannot silently break it while adding the
   * project_leader branch. */
  test('regression guard: reviewer work-area label unchanged (zh/en)', async ({ page }) => {
    await page.goto(buildReviewerUrl(SAMPLE_EXCEPTION));
    await expect(workAreaCrumb(page)).toHaveText('審核作業');

    await page.getByTestId('lang-toggle').click();
    await expect(workAreaCrumb(page)).toHaveText('Review');
  });

  test('regression guard: annotator work-area label unchanged (zh/en)', async ({ page }) => {
    await page.goto(buildAnnotatorUrl('T001', 'sent-002'));
    await expect(workAreaCrumb(page)).toHaveText('標記作業');

    await page.getByTestId('lang-toggle').click();
    await expect(workAreaCrumb(page)).toHaveText('Annotate');
  });
});
