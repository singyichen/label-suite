import { test, expect, type Page } from '@playwright/test';
import { buildWorkspaceUrl, skipGuidelineModal } from './_workspace-helpers';

/* issue #410 (hardening, not a live bug): getSampleHistory()
 * (annotation-workspace.data.js) merges the annotator bucket plus every
 * reviewer bucket that reviewed that annotator, but never checks
 * entryStatus() -- it currently "gets away with it" only because no live
 * code path writes a 'saved' (unsubmitted) history event into a REVIEWER
 * bucket (the reviewer role's 儲存草稿 button is hidden and unwired; row
 * decisions go through a separate saveReviewRowDecisionDraft() store that
 * getSampleHistory() never reads). Per spec 015 FR-062 (blind-review
 * isolation), an unsubmitted reviewer's judgment -- including its 'saved'
 * history event -- must be visible only to that reviewer, never to peers.
 *
 * This test proves the defensive gap by calling markSampleSaved() directly
 * for a reviewer identity (the same data-layer function a future code path
 * could wire up), bypassing the UI (which has no such path today), and
 * asserting that draft's history event never appears in the merged trail.
 * FR-062 explicitly exempts the ANNOTATOR's own save/submit events from
 * this isolation rule ("annotator 之儲存/提交事件為受審內容之一部分，
 * 不受本條影響"), so the annotator's event must still appear.
 */

const TASK = 'T001';
const SAMPLE = 'sent-001';
const ANNOTATOR = 'kioleemg12';
const DRAFTING_REVIEWER = 'reviewer_wang'; // never submits -- draft only
const SUBMITTING_REVIEWER = 'reviewer_li'; // genuinely submits

type HistoryEvent = { action: string; role: string; actorId: string | null };

function markSampleSubmitted(
  page: Page,
  args: { role: string; payload: unknown; identity: { annotatorId?: string; reviewerId?: string } }
): Promise<void> {
  return page.evaluate((a) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).LabelSuiteAnnotationWorkspaceData.markSampleSubmitted(
      'T001', a.role, 'official_run', 'sent-001', a.payload, '審核已送出', a.identity
    );
  }, args);
}

function markSampleSaved(
  page: Page,
  args: { role: string; payload: unknown; identity: { annotatorId?: string; reviewerId?: string } }
): Promise<void> {
  return page.evaluate((a) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).LabelSuiteAnnotationWorkspaceData.markSampleSaved(
      'T001', a.role, 'official_run', 'sent-001', a.payload, '審核草稿已儲存', a.identity
    );
  }, args);
}

function getSampleHistory(page: Page): Promise<HistoryEvent[]> {
  return page.evaluate(() =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).LabelSuiteAnnotationWorkspaceData.getSampleHistory(
      'T001', 'official_run', 'sent-001', { annotatorId: 'kioleemg12' }
    )
  );
}

const labelPayload = (selected: string) => ({ previewState: { single_label: { selected } } });

test.describe('issue #410 -- getSampleHistory() defensively filters unsubmitted reviewer drafts', () => {
  test('a reviewer draft (saved, never submitted) never appears in the merged trail; the annotator\'s own event and a genuinely submitted peer\'s event still do', async ({ page }) => {
    await skipGuidelineModal(page);
    await page.goto(buildWorkspaceUrl({ task_id: TASK, sample_id: SAMPLE }));

    await markSampleSubmitted(page, {
      role: 'annotator', payload: labelPayload('sad'), identity: { annotatorId: ANNOTATOR },
    });
    await markSampleSaved(page, {
      role: 'reviewer', payload: labelPayload('sad'),
      identity: { annotatorId: ANNOTATOR, reviewerId: DRAFTING_REVIEWER },
    });
    await markSampleSubmitted(page, {
      role: 'reviewer', payload: labelPayload('sad'),
      identity: { annotatorId: ANNOTATOR, reviewerId: SUBMITTING_REVIEWER },
    });

    const history = await getSampleHistory(page);

    expect(history.some((e) => e.actorId === DRAFTING_REVIEWER)).toBe(false);
    expect(history.some((e) => e.actorId === SUBMITTING_REVIEWER && e.action === 'submitted')).toBe(true);
    expect(history.some((e) => e.actorId === ANNOTATOR && e.action === 'submitted')).toBe(true);
  });
});
