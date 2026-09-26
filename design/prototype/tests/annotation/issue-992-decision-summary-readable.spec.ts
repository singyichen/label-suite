import { test, expect, type Page } from '@playwright/test';
import { dismissGuidelineModal, gotoReviewerWorkspace, skipGuidelineModal } from './_workspace-helpers';

const ANNOTATOR = 'kioleemg12';
const REVIEWER = 'reviewer_wang';
const BYPASS_REASON = '審核員無法依現有標準裁決，需退回標記員確認語境（issue #992 測試用）。';

function historyCard(page: Page, action: string) {
  return page
    .locator(`#wsHistoryContainer .history-action-badge[data-action="${action}"]`)
    .locator('xpath=ancestor::div[contains(concat(" ", normalize-space(@class), " "), " history-item ")][1]');
}

function occurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
});

test.describe('issue #992: readable reviewer decision summary in the history panel', () => {
  test('a live reviewer approve decision renders a translated outKey/decision pair while the persisted summary keeps the old internal format', async ({ page }) => {
    /* issue #921/#960: resolve the real FR-093 assignee instead of
       hardcoding one, same as every other affected spec (see
       issue-881-history-reason-dedup.spec.ts's third test). */
    const reviewerId = await gotoReviewerWorkspace(page, {
      task_id: 'T001',
      sample_id: 'sent-001',
      run_type: 'official_run',
      annotator_id: ANNOTATOR,
    });
    await dismissGuidelineModal(page);

    await page.getByTestId('ws-review-row-approve').click();
    await page.getByTestId('ws-review-submit-btn').click();
    await expect(page.locator('#toastMsg')).toHaveText('審核已送出');

    await page.getByTestId('ws-guideline-tab-history').click();

    /* approve -> `accepted` action (FR-086/FR-092 point 1, single-owner
       relay table REVIEW_DECISION_EVENT_ACTION). */
    const accepted = historyCard(page, 'accepted');
    await expect(accepted).toHaveCount(1);
    /* toContainText, not toHaveText: a live reviewer submit's stored summary
       carries an extra leading line from the unrelated buildHistorySummary()
       ("outKey: describedAnswer") ahead of the "outKey · actor: decision"
       line this issue translates -- that leading line is out of scope and
       stays untranslated. */
    await expect(accepted.locator('.history-summary')).toContainText('單一標籤 · kioleemg12：通過');

    await page.evaluate(() => window.localStorage.setItem('labelsuite.lang', 'en'));
    await page.reload();
    await page.getByTestId('ws-guideline-tab-history').click();

    const englishAccepted = historyCard(page, 'accepted');
    await expect(englishAccepted.locator('.history-summary')).toContainText('Single label · kioleemg12: Approve');

    /* issue #992: the persisted event.summary must stay byte-for-byte in the
       OLD internal format -- the translation is display-only and is never
       written back to localStorage. */
    const event = await page.evaluate(({ annotatorId, reviewerId: actorId }) => {
      const data = (window as unknown as {
        LabelSuiteAnnotationWorkspaceData: {
          getSampleHistory: (
            taskId: string,
            runType: string,
            sampleId: string,
            identity: { annotatorId: string },
          ) => Array<{ action: string; actorId?: string; summary: string }>;
        };
      }).LabelSuiteAnnotationWorkspaceData;
      return data
        .getSampleHistory('T001', 'official_run', 'sent-001', { annotatorId })
        .filter((item) => item.action === 'accepted' && item.actorId === actorId)
        .pop();
    }, { annotatorId: ANNOTATOR, reviewerId });

    expect(event).toBeDefined();
    if (!event) {
      throw new Error('Expected the reviewer approve event to be stored');
    }
    expect(event.summary).toContain(`single_label · ${ANNOTATOR}: approve`);
  });

  test('a seeded legacy bypass summary renders translated with the reason shown exactly once, and old localStorage data needs no migration', async ({ page }) => {
    const bucketKey = `labelsuite.wsSubmissions.T001::reviewer::official_run::${ANNOTATOR}::${REVIEWER}`;
    /* issue #992: this seeds the OLD internal-format summary directly into
       localStorage (the exact shape written before this fix existed), the
       same way issue-901-history-summary-fallback.spec.ts's second test
       seeds via markSampleSubmitted -- proving pre-existing localStorage
       data renders translated automatically, with no migration step. */
    await page.addInitScript(([key, summary, reason]) => {
      window.localStorage.setItem(key as string, JSON.stringify({
        'sent-001': {
          status: 'submitted',
          submittedAt: '2026-09-23T07:55:00.000Z',
          answers: {},
          history: [{
            action: 'bypassed',
            role: 'reviewer',
            actorId: 'reviewer_wang',
            at: '2026-09-23T07:55:00.000Z',
            summary,
            reason,
          }],
        },
      }));
    }, [bucketKey, `single_label · ${ANNOTATOR}: bypass`, BYPASS_REASON] as const);

    await page.goto(
      `/pages/annotation/annotation-workspace.html?task_id=T001&sample_id=sent-001&role=reviewer&run_type=official_run&annotator_id=${ANNOTATOR}&reviewer_id=${REVIEWER}`
    );
    await dismissGuidelineModal(page);
    await page.getByTestId('ws-guideline-tab-history').click();

    const bypassed = historyCard(page, 'bypassed');
    await expect(bypassed).toHaveCount(1);
    /* Clean, single-line seeded summary -- exact match is safe here, unlike
       the live-submit test above. */
    await expect(bypassed.locator('.history-summary')).toHaveText(`單一標籤 · ${ANNOTATOR}：無法裁決`);
    await expect(bypassed.locator('.history-reason')).toHaveText(`理由：${BYPASS_REASON}`);
    expect(occurrences(await bypassed.innerText(), BYPASS_REASON)).toBe(1);

    const persistedSummary = await page.evaluate(([key]) => {
      const bucket = JSON.parse(window.localStorage.getItem(key as string) || '{}');
      return bucket['sent-001'].history[0].summary;
    }, [bucketKey] as const);
    /* The underlying persisted summary is unchanged: still the old internal
       format, never rewritten to the translated string. */
    expect(persistedSummary).toBe(`single_label · ${ANNOTATOR}: bypass`);
  });
});
