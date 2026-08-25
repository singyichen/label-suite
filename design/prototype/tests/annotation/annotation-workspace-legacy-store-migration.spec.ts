import { test, expect, type Page } from '@playwright/test';
import { buildListUrl } from './_workspace-helpers';

/* Boot-time migration of the pre-issue-#283 submission store. Before the
 * per-bucket-key fix everything lived in ONE whole-blob localStorage key
 * (`labelsuite.wsSubmissions`); a returning visitor has that blob (their own
 * drafts plus the already-run review-flow demo seed) AND the
 * `labelsuite.reviewFlowDemoSeed.v1` marker, so without a migration the
 * seeder short-circuits, the new per-bucket readers see nothing, and the
 * prototype silently renders everything as pending. The migration fans the
 * legacy blob out into per-bucket keys once and removes the legacy key.
 *
 * Traceability: specs/annotation/015-annotation-workspace/spec.md
 *   FR-049
 */

const LEGACY_KEY = 'labelsuite.wsSubmissions';
const BUCKET_KEY = 'T001::annotator::official_run::kioleemg12::-';
const PER_BUCKET_KEY = 'labelsuite.wsSubmissions.' + BUCKET_KEY;

function statusBadge(page: Page, sampleId: string) {
  return page
    .getByTestId('ws-sample-item')
    .filter({ hasText: sampleId })
    .locator('.status-badge');
}

test('a legacy whole-blob store is fanned out into per-bucket keys at boot', async ({ page }) => {
  await page.addInitScript(
    ([legacyKey, bucketKey]) => {
      window.localStorage.setItem(
        legacyKey,
        JSON.stringify({ [bucketKey]: { 'sent-002': { status: 'saved', answers: {} } } })
      );
    },
    [LEGACY_KEY, BUCKET_KEY]
  );
  await page.goto(buildListUrl({ task_id: 'T001' }));

  await expect(statusBadge(page, 'sent-002')).toHaveText('已儲存');
  const keys = await page.evaluate(
    ([legacyKey, perBucketKey]) => ({
      legacy: window.localStorage.getItem(legacyKey),
      migrated: window.localStorage.getItem(perBucketKey),
    }),
    [LEGACY_KEY, PER_BUCKET_KEY]
  );
  expect(keys.legacy).toBeNull();
  expect(keys.migrated).toContain('sent-002');
});

test('a corrupt per-bucket value reads as an empty bucket instead of crashing', async ({ page }) => {
  await page.addInitScript((perBucketKey) => {
    window.localStorage.setItem(perBucketKey, 'null');
  }, PER_BUCKET_KEY);
  await page.goto(buildListUrl({ task_id: 'T001' }));

  await expect(statusBadge(page, 'sent-001')).toHaveText('待處理');
});
