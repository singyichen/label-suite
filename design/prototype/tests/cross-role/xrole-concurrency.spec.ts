import { test, expect, type Page } from '@playwright/test';
import {
  buildWorkspaceUrl,
  dismissGuidelineModal,
  patchDataFile,
  skipGuidelineModal,
} from '../annotation/_workspace-helpers';

/* w6-resilience-a11y.md CONC-02 / CONC-03 -- multi-actor scenarios. CONC-01
 * was retired (issue #970); see the note further down where it used to sit.
 *
 * 限制標注 (implementation notes, mirroring the annex's own caveats):
 * - The prototype is a static page over localStorage. Every Page below
 *   shares ONE BrowserContext (one localStorage), so "two users" is an
 *   approximation built from separate identities (annotator_id /
 *   reviewer_id query params), not separate sessions.
 * - No page under pages/ registers a storage-event listener (grep-verified),
 *   so a change made through one Page becomes visible to another only after
 *   that other Page reloads. Reconciliation is manual, never push-based.
 * - The submission store keeps each bucket under its own localStorage key
 *   (issue #283 fix, annotation-workspace.data.js SUBMISSION_KEY_PREFIX),
 *   so a true two-annotator write race is safe and IS exercised -- by
 *   tests/annotation/annotation-workspace-concurrent-save.spec.ts. What
 *   these tests pin is bucket ISOLATION under interleaved actions (no
 *   actor overwrites another) plus read-after-reload visibility. Writes to
 *   the SAME bucket (e.g. reviewer reject vs. annotator save) still race
 *   last-write-wins at the prototype tier; real concurrent-session
 *   behavior belongs to the real-backend E2E tier (FAIL-D01~D06).
 *
 * Traceability: specs/annotation/015-annotation-workspace/spec.md
 *   FR-014S, FR-049, FR-050, FR-062 */

const ANNOTATOR_A = 'kioleemg12';
const ANNOTATOR_B = '113450022';

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

/* issue #970: CONC-01 ('an unsent decision stays private to its reviewer; a
 * submitted one appears to the other after reload') was retired here (was
 * "FLAGGED, NOT FIXED" under issue #960). It opened ONE unit
 * (T001/sent-001/official_run) as TWO DIFFERENT reviewer identities
 * (REVIEWER_A, REVIEWER_B) -- but FR-093 gives a unit exactly one assignee
 * (spec.md:1004), so no reviewer_id choice could keep both interactive once
 * #921's gate lands: the unassigned identity would see the read-only
 * NOT_ASSIGNED replacement instead of the ws-review-row-approve button this
 * test drove.
 *
 * Not rewritten to the SAME identity opening a second Page (the CONT-04
 * pattern `annotation-workspace-review-identity.spec.ts` uses for the
 * annotator role): that substitution was tried and does not hold. A
 * reviewer's unsent decision is a genuine, deliberately-persisted draft
 * (`labelsuite.wsReviewDecisionDrafts.<task>::reviewer::<runType>::
 * <annotatorId>::<reviewerId>`, restored on both reload AND a second Page in
 * the same browser context) -- confirmed empirically against the running
 * prototype while investigating this issue. So "stays private until submit"
 * was never a property of a single reviewer identity; it was specifically
 * about ISOLATION BETWEEN two different reviewers' in-progress state, which
 * FR-093 makes impossible to construct at all (a unit has exactly one
 * assignee, so there is no second reviewer identity left to isolate from).
 * Retired rather than rewritten, per the same precedent as XROLE-16's
 * retirement (docs/product/e2e/issue-180/phase3-drafts/w4-canonical-journey.md,
 * issue #916). */

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

  // Interleaved saves, each awaited before the next. (Historical note:
  // dispatching both via Promise.all once hit the old shared-blob store's
  // read-modify-write window and CI lost a2's bucket -- fixed by per-bucket
  // keys in issue #283, and the true concurrent shape is now pinned by
  // tests/annotation/annotation-workspace-concurrent-save.spec.ts.) What
  // stays under test here is that neither save lands in the other's bucket.
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
