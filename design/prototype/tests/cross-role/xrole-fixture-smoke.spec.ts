import { test, expect } from '@playwright/test';
import { buildListUrl, buildWorkspaceUrl, patchDataFile } from '../annotation/_workspace-helpers';
import { buildXRoleSeedPatch } from './fixtures/build-xrole-patch';

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

const EXPECTED_RECORD_IDS = ['xr-dry-001', 'xr-dry-002', 'xr-off-001', 'xr-off-002', 'xr-off-003'];

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

    const profile = await page.evaluate(
      (id) =>
        (window as unknown as { LabelSuiteAnnotationWorkspaceData: WorkspaceData })
          .LabelSuiteAnnotationWorkspaceData.resolveTaskProfile(id),
      taskId
    );
    expect(profile).toBeTruthy();
    expect(profile?.datasetRecords).toHaveLength(5);
    expect(profile?.datasetRecords.map((r) => r.id)).toEqual(EXPECTED_RECORD_IDS);
  });

  test('the annotation list surfaces all 5 seeded records for the annotator role', async ({ page }, testInfo) => {
    const taskId = xroleTaskId(testInfo.workerIndex);
    await patchDataFile(page, 'annotation-workspace.data.js', buildXRoleSeedPatch(taskId));

    await page.goto(buildListUrl({ task_id: taskId, role: 'annotator', run_type: 'official_run', annotator_id: 'A01' }));

    await expect(page.getByTestId('ws-sample-item')).toHaveCount(5);
  });
});
