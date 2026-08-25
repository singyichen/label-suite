import { test, expect, type Page } from '@playwright/test';
import { buildWorkspaceUrl, skipGuidelineModal } from './_workspace-helpers';

/* Boot-time migration of the pre-issue-#319 whole-blob arbitration store,
 * mirroring annotation-workspace-legacy-store-migration.spec.ts (issue #283).
 * Before the per-item-key fix everything lived in ONE whole-blob localStorage
 * key (`labelsuite.wsArbitration`, shaped { [bucketKey]: { [sampleId]: {
 * [itemId]: DisputeItem } } }); a returning visitor holding that blob would
 * otherwise see every past arbitration vanish once the store moves to
 * per-item keys, since the new readers never look at the legacy key again.
 * The migration fans the legacy blob out into per-item keys once and removes
 * the legacy key.
 *
 * Traceability: specs/annotation/015-annotation-workspace/spec.md
 *   FR-059, FR-061
 */

const LEGACY_KEY = 'labelsuite.wsArbitration';
const BUCKET_KEY = 'T001::official_run::kioleemg12';
const SAMPLE = 'sent-001';
const ITEM_ID = 'single_label::single_label';
const PER_ITEM_KEY = `labelsuite.wsArbitration.${BUCKET_KEY}::${SAMPLE}::${ITEM_ID}`;

type WorkspaceData = {
  getArbitrationState: (
    taskId: string, runType: string, sampleId: string,
    identity: { annotatorId?: string }
  ) => Record<string, {
    votes: Array<{ arbiter_id: string; choice: 'A' | 'B'; voted_at: string }>;
    finalized_value?: unknown;
    finalized_by?: string;
  }>;
};

function readState(page: Page) {
  return page.evaluate(
    ([task, runType, sampleId, annotatorId]) =>
      (window as unknown as { LabelSuiteAnnotationWorkspaceData: WorkspaceData })
        .LabelSuiteAnnotationWorkspaceData.getArbitrationState(task, runType, sampleId, { annotatorId }),
    ['T001', 'official_run', SAMPLE, 'kioleemg12']
  );
}

function gotoWorkspace(page: Page) {
  return page.goto(buildWorkspaceUrl({
    task_id: 'T001', sample_id: SAMPLE, role: 'reviewer', run_type: 'official_run',
    annotator_id: 'kioleemg12', reviewer_id: 'reviewer_chen',
  }));
}

test('a legacy whole-blob arbitration store is fanned out into per-item keys at boot', async ({ page }) => {
  await page.addInitScript(
    ([legacyKey, bucketKey, sampleId, itemId]) => {
      window.localStorage.setItem(
        legacyKey,
        JSON.stringify({
          [bucketKey]: {
            [sampleId]: {
              [itemId]: {
                votes: [{ arbiter_id: 'reviewer_chen', choice: 'B', voted_at: '2026-01-01T00:00:00.000Z' }],
                finalized_value: 'fear',
                finalized_by: 'reviewer_chen',
              },
            },
          },
        })
      );
    },
    [LEGACY_KEY, BUCKET_KEY, SAMPLE, ITEM_ID]
  );
  await skipGuidelineModal(page);
  await gotoWorkspace(page);

  const state = await readState(page);
  expect(state[ITEM_ID]?.finalized_value).toBe('fear');
  expect(state[ITEM_ID]?.finalized_by).toBe('reviewer_chen');
  expect(state[ITEM_ID]?.votes).toHaveLength(1);

  const keys = await page.evaluate(
    ([legacyKey, perItemKey]) => ({
      legacy: window.localStorage.getItem(legacyKey),
      migrated: window.localStorage.getItem(perItemKey),
    }),
    [LEGACY_KEY, PER_ITEM_KEY]
  );
  expect(keys.legacy).toBeNull();
  expect(keys.migrated).toContain('fear');
});

test('a corrupt legacy blob is dropped instead of blocking boot', async ({ page }) => {
  await page.addInitScript((legacyKey) => {
    window.localStorage.setItem(legacyKey, '{not json');
  }, LEGACY_KEY);
  await skipGuidelineModal(page);
  await gotoWorkspace(page);

  const legacy = await page.evaluate((legacyKey) => window.localStorage.getItem(legacyKey), LEGACY_KEY);
  expect(legacy).toBeNull();
});

test('a corrupt per-item value reads as absent instead of crashing', async ({ page }) => {
  await page.addInitScript((perItemKey) => {
    window.localStorage.setItem(perItemKey, 'null');
  }, PER_ITEM_KEY);
  await skipGuidelineModal(page);
  await gotoWorkspace(page);

  const state = await readState(page);
  expect(state[ITEM_ID]).toBeUndefined();
});
