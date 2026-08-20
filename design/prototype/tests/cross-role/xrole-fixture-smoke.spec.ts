import { test, expect } from '@playwright/test';
import { buildListUrl, buildWorkspaceUrl, patchDataFile } from '../annotation/_workspace-helpers';
import {
  buildXRoleSeedPatch,
  DRY_RUN_ANNOTATOR_IDS,
  DRY_RUN_RECORD_IDS,
  OFFICIAL_RUN_RECORD_IDS,
} from './fixtures/build-xrole-patch';

type SeedRecord = { id: string; text: string; gold_label: string };
type TaskProfile = { id: string; datasetRecords: SeedRecord[] };
type WorkspaceData = { resolveTaskProfile: (taskId: string) => TaskProfile | null };

/* Cross-role lifecycle fixture smoke test (issue #212, PR-A).
 *
 * This is infrastructure verification, not a journey test: it proves the
 * `buildXRoleSeedPatch` / `patchDataFile` combination actually seeds a
 * usable XROLE task, so later PRs can build the full canonical journey
 * (w4) on top of it without re-deriving the fixture mechanics. Kept to a
 * handful of assertions on purpose (plan §4).
 *
 * Evidence config (plan §7): local `test.use()` override, not the global
 * `playwright.config.ts`, so only this directory's specs capture
 * screenshots/video on failure.
 */
test.use({ screenshot: 'only-on-failure', video: 'retain-on-failure' });

function xroleTaskId(workerIndex: number): string {
  return `XROLE-fixture-smoke-${workerIndex}-${Date.now()}`;
}

test.beforeEach(async ({ page }) => {
  /* Shared-context multi-role journeys (later PRs) can't rely on Playwright's
     per-test fresh-context isolation the way single-page specs do (w4 §2
     Given); this smoke spec is single-page, but seeds the same habit so the
     pattern is proven before the journey spec depends on it. */
  await page.addInitScript(() => window.localStorage.clear());
});

test.describe('XROLE fixture: buildXRoleSeedPatch + patchDataFile', () => {
  test('the workspace resolves the patched task profile for an annotator identity', async ({ page }, testInfo) => {
    const taskId = xroleTaskId(testInfo.workerIndex);
    await patchDataFile(page, 'annotation-workspace.data.js', buildXRoleSeedPatch(taskId));

    await page.goto(
      buildWorkspaceUrl({
        task_id: taskId,
        sample_id: 'xr-dry-001',
        role: 'annotator',
        run_type: 'dry_run',
        annotator_id: 'A01',
      })
    );

    // A missing profile redirects to annotation-list.html (annotation-workspace.config.js:3013-3015);
    // staying on the workspace URL proves resolveTaskProfile(taskId) found the patched profile.
    await expect(page).toHaveURL(/annotation-workspace\.html/);
    await expect(page.getByTestId('ws-root')).toBeVisible();
    await expect(page.getByTestId('ws-single-label-chip-positive')).toBeVisible();
    await expect(page.getByTestId('ws-single-label-chip-negative')).toBeVisible();
    await expect(page.getByTestId('ws-single-label-chip-neutral')).toBeVisible();

    // The patch scopes datasetRecords to the URL's run_type, so a dry_run
    // page resolves exactly the 2 dry records (w4 XROLE-07 count audit).
    const profile = await page.evaluate(
      (id) =>
        (window as unknown as { LabelSuiteAnnotationWorkspaceData: WorkspaceData })
          .LabelSuiteAnnotationWorkspaceData.resolveTaskProfile(id),
      taskId
    );
    expect(profile).toBeTruthy();
    expect(profile?.datasetRecords.map((r) => r.id)).toEqual(DRY_RUN_RECORD_IDS);
  });

  test('the annotation list scopes seeded records to the run_type of the visit', async ({ page }, testInfo) => {
    const taskId = xroleTaskId(testInfo.workerIndex);
    await patchDataFile(page, 'annotation-workspace.data.js', buildXRoleSeedPatch(taskId));

    await page.goto(buildListUrl({ task_id: taskId, role: 'annotator', run_type: 'official_run', annotator_id: 'A01' }));
    await expect(page.getByTestId('ws-sample-item')).toHaveCount(OFFICIAL_RUN_RECORD_IDS.length);

    await page.goto(buildListUrl({ task_id: taskId, role: 'annotator', run_type: 'dry_run', annotator_id: 'A01' }));
    await expect(page.getByTestId('ws-sample-item')).toHaveCount(DRY_RUN_RECORD_IDS.length);
  });

  test('the reviewer list surfaces one review unit per seeded annotator row', async ({ page }, testInfo) => {
    const taskId = xroleTaskId(testInfo.workerIndex);
    await patchDataFile(page, 'annotation-workspace.data.js', buildXRoleSeedPatch(taskId));

    // official_run: each of the 3 records is assigned to exactly one
    // annotator (OFFICIAL_RUN_ASSIGNMENTS) -> 3 review-unit rows.
    await page.goto(buildListUrl({ task_id: taskId, role: 'reviewer', run_type: 'official_run', reviewer_id: 'R01' }));
    await expect(page.getByTestId('ws-sample-item')).toHaveCount(OFFICIAL_RUN_RECORD_IDS.length);
    await expect(page.getByTestId('list-review-annotator').first()).toBeVisible();

    // dry_run: all 3 annotators mark both common samples -> 2 × 3 rows.
    await page.goto(buildListUrl({ task_id: taskId, role: 'reviewer', run_type: 'dry_run', reviewer_id: 'R01' }));
    await expect(page.getByTestId('ws-sample-item')).toHaveCount(
      DRY_RUN_RECORD_IDS.length * DRY_RUN_ANNOTATOR_IDS.length
    );
  });
});
