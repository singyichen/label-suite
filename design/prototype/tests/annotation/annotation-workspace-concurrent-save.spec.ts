import { test, expect, type Page } from '@playwright/test';
import {
  buildWorkspaceUrl,
  dismissGuidelineModal,
  patchDataFile,
  skipGuidelineModal,
} from './_workspace-helpers';

/* Regression test for issue #283: the submission store USED to be a single
 * localStorage key with whole-blob read-modify-write, so two pages
 * (multi-tab / multi-role windows) saving concurrently could each hold a
 * stale snapshot of the blob and the later writer clobbered the bucket the
 * other page just wrote -- reproduced in PR #277's first CI run (scenario
 * CONC-03) when the saves were dispatched via Promise.all, which is why
 * CONC-03 serialized its saves at the time. The store now keeps each bucket
 * under its own key (annotation-workspace.data.js SUBMISSION_KEY_PREFIX);
 * this test exercises the real race directly (Promise.all) to pin that. */

const ANNOTATOR_A = 'kioleemg12';
const ANNOTATOR_B = '113450022';

/* Widens the race window so the lost update is deterministic instead of a
 * rare CI flake: stretches each page's synchronous save block by 400ms so
 * the two blocks are guaranteed to overlap in wall time. The delay is ARMED
 * right before clicking 儲存 (a first-call-only hook would be consumed by
 * the page-load draft-restore read instead) and fires on the next getItem
 * against the submission store, i.e. inside the save flow. While a page's
 * save block runs, writes committed by the OTHER page are not yet visible
 * to it (cross-process localStorage propagation needs the reader's event
 * loop to turn), so under a shared-blob store both saves rebuild the blob
 * from a snapshot that lacks the other annotator's bucket -- the later
 * write clobbers the earlier one. Key match is by prefix so the hook keeps
 * stretching the window (and the test keeps guarding the invariant) now
 * that each bucket lives under its own prefixed key. */
async function delayArmedSubmissionStoreRead(page: Page) {
  await page.addInitScript(() => {
    const originalGetItem = Storage.prototype.getItem;
    Storage.prototype.getItem = function (key: string) {
      const value = originalGetItem.call(this, key);
      const w = window as unknown as { __delayNextSubmissionRead?: boolean };
      if (key.indexOf('labelsuite.wsSubmissions') === 0 && w.__delayNextSubmissionRead) {
        w.__delayNextSubmissionRead = false;
        const until = Date.now() + 400;
        while (Date.now() < until) {
          /* busy-wait: synchronous by design, matches localStorage's own
             synchronous API so the delay lands inside the save block. */
        }
      }
      return value;
    };
  });
}

async function armSubmissionStoreReadDelay(page: Page) {
  await page.evaluate(() => {
    (window as unknown as { __delayNextSubmissionRead?: boolean }).__delayNextSubmissionRead = true;
  });
}

async function readSampleStatus(page: Page, annotatorId: string): Promise<string> {
  return page.evaluate((id) => {
    const data = (window as unknown as {
      LabelSuiteAnnotationWorkspaceData: {
        getSampleStatus: (
          taskId: string,
          role: string,
          runType: string,
          sampleId: string,
          identity: { annotatorId: string }
        ) => string;
      };
    }).LabelSuiteAnnotationWorkspaceData;
    return data.getSampleStatus('T001', 'annotator', 'official_run', 'sent-001', { annotatorId: id });
  }, annotatorId);
}

test('two annotators saving at the same moment never lose either bucket (issue #283)', async ({ page, context }) => {
  const a1 = page;
  const a2 = await context.newPage();

  for (const [p, annotatorId] of [[a1, ANNOTATOR_A], [a2, ANNOTATOR_B]] as Array<[Page, string]>) {
    await skipGuidelineModal(p);
    await delayArmedSubmissionStoreRead(p);
    // Strip the single_label prefill so each chip click below is
    // unambiguously that annotator's own answer (same rationale as
    // annotation-workspace-save-draft.spec.ts).
    await patchDataFile(p, 'task-detail.data.js', `
      window.LabelSuiteTaskDetailData.profiles.T001.datasetRecords.forEach(function (r) { r.gold_label = null; });
    `);
    await p.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001', run_type: 'official_run', annotator_id: annotatorId }));
    await dismissGuidelineModal(p);
  }

  await a1.getByTestId('ws-single-label-chip-positive').click();
  await a2.getByTestId('ws-single-label-chip-negative').click();

  // Dispatch both saves concurrently -- this is the exact shape CI hit in
  // PR #277 (CONC-03): two pages racing the whole-blob RMW.
  await armSubmissionStoreReadDelay(a1);
  await armSubmissionStoreReadDelay(a2);
  await Promise.all([
    a1.getByTestId('ws-save-btn').click(),
    a2.getByTestId('ws-save-btn').click(),
  ]);
  await expect(a1.locator('#toastMsg')).toHaveText('已儲存');
  await expect(a2.locator('#toastMsg')).toHaveText('已儲存');

  // Both buckets must survive: reload each page and confirm both drafts,
  // then confirm both are readable from either page's storage snapshot.
  await a1.reload();
  await dismissGuidelineModal(a1);
  await expect(a1.getByTestId('ws-single-label-chip-positive')).toHaveAttribute('aria-pressed', 'true');

  await a2.reload();
  await dismissGuidelineModal(a2);
  await expect(a2.getByTestId('ws-single-label-chip-negative')).toHaveAttribute('aria-pressed', 'true');

  expect(await readSampleStatus(a1, ANNOTATOR_A)).toBe('saved');
  expect(await readSampleStatus(a1, ANNOTATOR_B)).toBe('saved');
  await a2.close();
});
