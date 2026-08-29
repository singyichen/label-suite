import { test, expect, type Page } from '@playwright/test';
import {
  buildWorkspaceUrl,
  dismissGuidelineModal,
  patchDataFile,
  skipGuidelineModal,
} from './_workspace-helpers';

/* issue #524: a fixed virtual epoch so the heartbeat window arithmetic
   below is exact instead of "boot plus however long navigation took".
   CLOCK_PAUSE sits a virtual minute ahead of CLOCK_BASE purely so the
   pauseAt jump is unambiguously forwards; nothing is scheduled in that
   gap because the page has not been navigated to yet. */
const CLOCK_BASE = Date.UTC(2026, 0, 1);
const CLOCK_PAUSE = CLOCK_BASE + 60_000;

/* Issue #470: the bottom-bar autosave indicator claimed 草稿已自動儲存
 * regardless of whether anything was ever actually persisted --
 * triggerAutosave() (annotation-workspace.config.js:1453) is purely
 * visual, real persistence only ever happens via 儲存草稿 (handleSave), and
 * the initial HTML (annotation-workspace.html:974) plus
 * applyStaticI18nText() (annotation-workspace.config.js:3925) both hardcode
 * the "saved" wording before the annotator has touched anything.
 *
 * This spec pins the maintainer-decided Direction B contract: three honest
 * PER-SAMPLE states -- 尚未儲存 (INITIAL) / 尚未儲存的變更 (DIRTY) /
 * 上次儲存於 MM/DD HH:mm (SAVED, reading an actually persisted write) --
 * the removal of the 15s visual-only heartbeat, and the indicator being
 * hidden entirely for role=reviewer (who has no 儲存草稿 button at all).
 *
 * Traceability: issue #470. No merged spec revision existed at RED time;
 * this file is the executable contract until one lands.
 */

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
  // Strip every record's gold_label output-role prefill so clicking an
  // answer chip below is unambiguously the annotator's own edit -- same
  // rationale as annotation-workspace-save-draft.spec.ts's beforeEach.
  await patchDataFile(page, 'task-detail.data.js', `
    window.LabelSuiteTaskDetailData.profiles.T001.datasetRecords.forEach(function (r) { r.gold_label = null; });
  `);
});

async function gotoSample(page: Page, sampleId: string) {
  await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: sampleId }));
  await dismissGuidelineModal(page);
}

function autosaveStatus(page: Page) {
  return page.getByTestId('ws-autosave-status');
}

/* Reproduces formatHistoryTime()'s own MM/DD HH:mm algorithm
 * (annotation-workspace.config.js:1487) so the assertion pins the SAME
 * format contract the spec table requires, without importing production
 * code into the test. */
function formatMmDdHhMm(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => (n < 10 ? '0' + n : String(n));
  return `${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/* Reads the LAST persisted 'saved' history event's timestamp straight out
 * of the localStorage-backed submission store, via the already-exposed
 * getSampleHistory() data helper -- not the DOM. This is what pins honesty
 * rather than wording: a test that only regexes the displayed text would
 * still pass a "fix" that shows a plausible-looking but fabricated
 * timestamp instead of the one actually written to storage. */
async function lastPersistedSaveTime(page: Page, sampleId: string): Promise<string> {
  const iso = await page.evaluate((sid) => {
    const data = (
      window as unknown as {
        LabelSuiteAnnotationWorkspaceData: {
          getSampleHistory: (
            taskId: string,
            runType: string,
            sampleId: string,
            identity: Record<string, never>
          ) => Array<{ action: string; at: string }>;
        };
      }
    ).LabelSuiteAnnotationWorkspaceData;
    const saved = data.getSampleHistory('T001', 'official_run', sid, {}).filter((e) => e.action === 'saved');
    return saved.length ? saved[saved.length - 1].at : null;
  }, sampleId);
  if (!iso) throw new Error(`no persisted 'saved' history event for sample ${sampleId}`);
  return formatMmDdHhMm(iso);
}

test.describe('Autosave indicator honesty (issue #470)', () => {
  test('fresh load, never saved, no interaction shows 尚未儲存', async ({ page }) => {
    await gotoSample(page, 'sent-001');

    const status = autosaveStatus(page);
    await expect(status).toHaveText('尚未儲存');
    await expect(status).not.toContainText('草稿已自動儲存');
    await expect(status).not.toContainText('儲存中');
  });

  test('editing without saving shows 尚未儲存的變更', async ({ page }) => {
    await gotoSample(page, 'sent-001');

    await page.getByTestId('ws-single-label-chip-positive').click();

    await expect(autosaveStatus(page)).toHaveText('尚未儲存的變更');
  });

  test('saving a draft shows the actually persisted save time', async ({ page }) => {
    await gotoSample(page, 'sent-001');

    await page.getByTestId('ws-single-label-chip-positive').click();
    await page.getByTestId('ws-save-btn').click();

    const expectedTime = await lastPersistedSaveTime(page, 'sent-001');
    await expect(autosaveStatus(page)).toHaveText(`上次儲存於 ${expectedTime}`);
  });

  test('a reload after saving still reads the persisted save time, not memory', async ({ page }) => {
    await gotoSample(page, 'sent-001');

    await page.getByTestId('ws-single-label-chip-positive').click();
    await page.getByTestId('ws-save-btn').click();

    await gotoSample(page, 'sent-001');

    const expectedTime = await lastPersistedSaveTime(page, 'sent-001');
    await expect(autosaveStatus(page)).toHaveText(`上次儲存於 ${expectedTime}`);
  });

  test("switching from a dirty sample to a never-saved one shows the new sample's own 尚未儲存 state", async ({
    page,
  }) => {
    await gotoSample(page, 'sent-001');

    await page.getByTestId('ws-single-label-chip-positive').click();
    await expect(autosaveStatus(page)).toHaveText('尚未儲存的變更');

    await page.getByTestId('ws-next-btn').click();

    await expect(autosaveStatus(page)).toHaveText('尚未儲存');
  });

  test('the removed 15s heartbeat leaves the indicator text unchanged', async ({ page }) => {
    // Fake clock installed BEFORE navigation so boot()'s own
    // `setInterval(triggerAutosave, 15000)` (annotation-workspace.config.js:4027)
    // -- if it still exists -- runs on virtual time under our control,
    // instead of the suite needing a real 15s+ sleep.
    await page.clock.install({ time: CLOCK_BASE });
    // Pause BEFORE navigating, not after. Pausing after boot used to read
    // `pauseAt(Date.now())`, which races: Date.now() is evaluated in the
    // test process while the page's fake clock keeps ticking, so a slow
    // enough round-trip left the clock already past that timestamp and
    // pauseAt threw `Cannot fast-forward to the past` (issue #524).
    // Pausing first freezes virtual time across the whole navigation, so
    // boot() registers its timers at exactly CLOCK_PAUSE and the
    // fast-forward below covers a known distance from boot rather than
    // "boot plus however long navigation happened to take".
    // The jump to CLOCK_PAUSE is always forwards: only milliseconds of real
    // time elapse between install() and pauseAt(), never the full minute.
    await page.clock.pauseAt(CLOCK_PAUSE);
    await gotoSample(page, 'sent-001');

    const status = autosaveStatus(page);
    const initialText = await status.textContent();

    // Stop just past the 15000ms mark but before triggerAutosave's own
    // chained 700ms "saving" -> "saved" settle
    // (annotation-workspace.config.js:1459), so a still-firing heartbeat is
    // caught mid-flight as 儲存中… instead of having already settled back
    // to indistinguishable text by the time we look.
    await page.clock.fastForward(15050);

    await expect(status).toHaveText(initialText ?? '');
  });

  test('role=reviewer hides the autosave indicator, including after a persisted review decision', async ({
    page,
  }) => {
    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001', role: 'annotator' }));
    await dismissGuidelineModal(page);
    await page.getByTestId('ws-single-label-chip-positive').click();
    await page.getByTestId('ws-submit-btn').click();

    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001', role: 'reviewer' }));
    await dismissGuidelineModal(page);

    const status = autosaveStatus(page);
    await expect(status).toBeHidden();

    // persistReviewDraft() (annotation-workspace.config.js:2331) is a real
    // persisted write, not a visual-only flourish -- the indicator must
    // stay hidden through it, not just at first paint.
    await page.getByTestId('ws-review-row-approve').first().click();
    await expect(status).toBeHidden();
  });

  test('a rejected sample shows 尚未儲存, never the pre-rejection save time', async ({ page }) => {
    // Setup path reused from issue-192-dry-run-reject-guard.spec.ts's
    // official_run reject flow: annotator saves + submits, then a reviewer
    // rejects the row and submits their review, which flips the sample's
    // status back to 'pending' via markSampleRejected
    // (annotation-workspace.data.js:452) WITHOUT clearing savedAt/
    // submittedAt. getSampleSavedAt() (annotation-workspace.data.js:291)
    // must still gate on entryStatus being 'saved'/'submitted' so this
    // stale timestamp never resurfaces once the sample is back with the
    // annotator for re-annotation.
    await gotoSample(page, 'sent-001');
    await page.getByTestId('ws-single-label-chip-positive').click();
    await page.getByTestId('ws-save-btn').click();
    await page.getByTestId('ws-submit-btn').click();

    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001', role: 'reviewer' }));
    await dismissGuidelineModal(page);
    await page.getByTestId('ws-review-row-reject').click();
    // issue #552 (FR-016A): a reject needs a reason before submit goes through.
    await page.getByTestId('ws-review-reject-reason').fill('理由');
    await page.getByTestId('ws-review-submit-btn').click();
    await expect(page.locator('#toastMsg')).toHaveText('審核已送出');

    await gotoSample(page, 'sent-001');

    const status = autosaveStatus(page);
    await expect(status).toHaveText('尚未儲存');
    await expect(status).not.toContainText('上次儲存於');
  });
});
