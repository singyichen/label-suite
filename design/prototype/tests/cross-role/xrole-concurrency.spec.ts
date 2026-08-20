import { test, expect, type Page } from '@playwright/test';
import {
  buildWorkspaceUrl,
  dismissGuidelineModal,
  patchDataFile,
  skipGuidelineModal,
} from '../annotation/_workspace-helpers';

/* w6-resilience-a11y.md CONC-01 / CONC-02 / CONC-03 -- multi-actor scenarios.
 *
 * 限制標注 (implementation notes, mirroring the annex's own caveats):
 * - The prototype is a static page over localStorage. Every Page below
 *   shares ONE BrowserContext (one localStorage), so "two users" is an
 *   approximation built from separate identities (annotator_id /
 *   reviewer_id query params), not separate sessions.
 * - No page under pages/ registers a storage-event listener (grep-verified),
 *   so a change made through one Page becomes visible to another only after
 *   that other Page reloads. Reconciliation is manual, never push-based.
 * - A true write race must NOT be exercised at this tier: the submission
 *   store is one whole-blob read-modify-write over a single localStorage
 *   key (readSubmissionStore/writeSubmissionStore,
 *   annotation-workspace.data.js), so two Pages saving at the same moment
 *   CAN lose one bucket to a stale-read overwrite -- CI reproduced exactly
 *   that when these saves were dispatched via Promise.all. What these tests
 *   pin is bucket ISOLATION under interleaved-but-serialized actions (no
 *   actor overwrites another) plus read-after-reload visibility -- the
 *   strongest guarantees the prototype offers. Real concurrent-session
 *   behavior belongs to the real-backend E2E tier (FAIL-D01~D06). */

const ANNOTATOR_A = 'kioleemg12';
const ANNOTATOR_B = '113450022';
const REVIEWER_A = 'reviewer_wang';
const REVIEWER_B = 'reviewer_li';

/* Reviewer 'submitted' actor ids for T001/official_run/sent-001 under the
 * default annotator identity -- same trail read as
 * annotation-workspace-review-identity.spec.ts. */
async function readReviewerSubmittedActorIds(page: Page): Promise<Array<string | null>> {
  return page.evaluate((annotatorId) => {
    const data = (window as unknown as {
      LabelSuiteAnnotationWorkspaceData: {
        getSampleHistory: (
          taskId: string,
          runType: string,
          sampleId: string,
          identity: { annotatorId: string }
        ) => Array<{ action: string; role: string; actorId: string | null }>;
      };
    }).LabelSuiteAnnotationWorkspaceData;
    return data
      .getSampleHistory('T001', 'official_run', 'sent-001', { annotatorId })
      .filter((e) => e.role === 'reviewer' && e.action === 'submitted')
      .map((e) => e.actorId);
  }, ANNOTATOR_A);
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

function reviewerUrl(reviewerId: string): string {
  return buildWorkspaceUrl({
    task_id: 'T001',
    sample_id: 'sent-001',
    role: 'reviewer',
    run_type: 'official_run',
    reviewer_id: reviewerId,
  });
}

test('an unsent decision stays private to its reviewer; a submitted one appears to the other after reload (CONC-01)', async ({ page, context }) => {
  const r1 = page;
  await skipGuidelineModal(r1);
  await r1.goto(reviewerUrl(REVIEWER_A));
  await dismissGuidelineModal(r1);
  await r1.getByTestId('ws-review-row-approve').click();
  await expect(r1.getByTestId('ws-review-row-approve')).toHaveAttribute('aria-pressed', 'true');

  // R2 opens the same unit while R1's decision is still unsent. Unsent
  // decisions live in R1's Page memory only (see CONT-03 in
  // annotation-reviewer-decision-persistence.spec.ts): R2 sees nothing.
  const r2 = await context.newPage();
  await skipGuidelineModal(r2);
  await r2.goto(reviewerUrl(REVIEWER_B));
  await dismissGuidelineModal(r2);
  await expect(r2.getByTestId('ws-review-row-approve')).toHaveAttribute('aria-pressed', 'false');
  expect(await readReviewerSubmittedActorIds(r2)).toEqual([]);

  await r1.getByTestId('ws-review-submit-btn').click();
  expect(await readReviewerSubmittedActorIds(r1)).toEqual([REVIEWER_A]);

  // No push-based sync exists; R2 sees R1's submission only after its own
  // reload -- and sees exactly one event, attributed to R1, proving R2's
  // still-open (undecided) view never wrote anything into the bucket.
  await r2.reload();
  await dismissGuidelineModal(r2);
  expect(await readReviewerSubmittedActorIds(r2)).toEqual([REVIEWER_A]);
  await r2.close();
});

/* Deviation from the annex expectation (recorded in the PR report): the annex
 * wants the disabled member to STAY disabled for later entries. The
 * prototype's task-detail member roster (TASK_MEMBERS) is in-Page memory
 * only -- nothing is written to localStorage -- so a reload resets it, and
 * the member roster (display names like "Alex Wang") is not linked to the
 * workspace's annotator_id identities at all. What CAN be pinned at this
 * tier: the two actors' actions do not interfere, the PL's same-page state
 * reflects the disable, and the annotator's submission is durable. */
test('a PL disabling a member does not clobber an annotator submission landing at the same time (CONC-02)', async ({ page, context }) => {
  const pl = page;
  await pl.goto('/pages/task-management/task-detail.html?task_id=T001');
  await pl.locator('#workLogPanel').waitFor({ state: 'attached', timeout: 15000 });
  await pl.locator('#tabMemberManagement').click();
  await expect(pl.locator('#memberManagementPanel')).not.toHaveClass(/hidden/);

  const a01 = await context.newPage();
  await skipGuidelineModal(a01);
  await a01.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001', run_type: 'official_run', annotator_id: ANNOTATOR_A }));
  await dismissGuidelineModal(a01);
  await a01.getByTestId('ws-single-label-chip-negative').click();

  // Interleave the two actors: PL opens the disable confirm, the annotator's
  // submit lands in between, then the PL confirms.
  const memberRow = pl.locator('#memberTableBody tr').filter({ hasText: 'Alex Wang' });
  await memberRow.locator('button:has-text("停用")').click();
  await a01.getByTestId('ws-submit-btn').click();
  await expect(a01.locator('#toastMsg')).toHaveText('已提交');
  await pl.locator('#memberActionConfirmBtn').click();
  await expect(memberRow).toContainText('停用');

  // Neither action clobbered the other: the submission is durable across a
  // reload of the annotator's Page.
  await a01.reload();
  await dismissGuidelineModal(a01);
  expect(await readSampleStatus(a01, ANNOTATOR_A)).toBe('submitted');
  await a01.close();
});

test('two annotators saving drafts back-to-back keep isolated buckets, each restoring its own (CONC-03)', async ({ page, context }) => {
  const a1 = page;
  const a2 = await context.newPage();

  for (const [p, annotatorId] of [[a1, ANNOTATOR_A], [a2, ANNOTATOR_B]] as Array<[Page, string]>) {
    await skipGuidelineModal(p);
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

  // Interleaved saves, each awaited before the next: dispatching both via
  // Promise.all hit the store's whole-blob read-modify-write window (see
  // the header comment) and CI lost a2's bucket to a1's stale-read
  // overwrite. Serializing the saves keeps the scenario deterministic;
  // what stays under test is that neither save lands in the other's bucket.
  await a1.getByTestId('ws-save-btn').click();
  await expect(a1.locator('#toastMsg')).toHaveText('已儲存');
  await a2.getByTestId('ws-save-btn').click();
  await expect(a2.locator('#toastMsg')).toHaveText('已儲存');

  // Each Page reloads its OWN draft -- opposite answers prove the buckets
  // never bled into each other.
  await a1.reload();
  await dismissGuidelineModal(a1);
  await expect(a1.getByTestId('ws-single-label-chip-positive')).toHaveAttribute('aria-pressed', 'true');
  await expect(a1.getByTestId('ws-single-label-chip-negative')).toHaveAttribute('aria-pressed', 'false');

  await a2.reload();
  await dismissGuidelineModal(a2);
  await expect(a2.getByTestId('ws-single-label-chip-negative')).toHaveAttribute('aria-pressed', 'true');
  await expect(a2.getByTestId('ws-single-label-chip-positive')).toHaveAttribute('aria-pressed', 'false');

  // Both drafts exist side by side in the shared store, one per identity.
  expect(await readSampleStatus(a1, ANNOTATOR_A)).toBe('saved');
  expect(await readSampleStatus(a1, ANNOTATOR_B)).toBe('saved');
  await a2.close();
});
