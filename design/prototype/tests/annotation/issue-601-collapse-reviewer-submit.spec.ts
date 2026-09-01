import { test, expect, type Page } from '@playwright/test';
import { buildWorkspaceUrl, skipGuidelineModal } from './_workspace-helpers';

/* issue #601 (spec 015 v4.62.0 Changelog note, derived from issue #600):
 * markSampleSubmitted() is shared by annotator and reviewer, and always
 * writes one envelope `submitted` history event before
 * appendReviewDecisionEvents() writes one `accepted`/`modified` event per
 * approved outKey. A reviewer's 歷程 panel therefore shows a bare 已提交 card
 * next to the 審核修正/審核通過 cards that carry the actual result -- the
 * envelope adds no information the decision event doesn't already carry.
 *
 * This change folds the envelope away IN THE RENDER LAYER ONLY
 * (renderHistoryPanel(), annotation-workspace.config.js:1846). The stored
 * history events themselves are unchanged; only which of them get a card.
 *
 * Rule (as stated on the issue): a `submitted` event whose `role` is
 * `reviewer` MUST NOT render when that same reviewer's next event in the
 * trail is `accepted` or `modified`. Two carve-outs guard against an
 * over-broad implementation:
 *   - the annotator's own `submitted` event always renders (it is the only
 *     event carrying their answer) -- even when something else immediately
 *     follows it in the merged trail;
 *   - a reviewer `submitted` event with NO following decision event (e.g.
 *     every outKey rejected, which routes through markSampleRejected into
 *     the annotator's bucket instead) still renders -- it is that
 *     reviewer's only trace in the reviewer bucket.
 */

const TASK = 'T001';
const SAMPLE = 'sent-001';
const RUN_TYPE = 'official_run';
const ANNOTATOR = 'kioleemg12'; // DEFAULT_ANNOTATOR_ID (annotation-workspace.data.js)
const REVIEWER = 'reviewer_wang'; // DEFAULT_REVIEWER_ID (REVIEWER_ROSTER[0])

const ANNOTATOR_BUCKET_KEY = `labelsuite.wsSubmissions.${TASK}::annotator::${RUN_TYPE}::${ANNOTATOR}::-`;
const REVIEWER_BUCKET_KEY = `labelsuite.wsSubmissions.${TASK}::reviewer::${RUN_TYPE}::${ANNOTATOR}::${REVIEWER}`;

type SeededEvent = { action: string; role: string; actorId: string; at: string; summary?: string };

/* Writes one bucket's single-sample entry directly into localStorage --
 * mirrors issue-578-history-actions.spec.ts's seedHistory(), generalized to
 * an explicit bucket key so a test can seed the annotator bucket and the
 * reviewer bucket independently and let getSampleHistory() merge them, the
 * same way the real data layer does. */
function seedBucket(page: Page, bucketKey: string, sampleId: string, history: SeededEvent[]) {
  return page.addInitScript(
    ([key, sample, events]) => {
      window.localStorage.setItem(
        key as string,
        JSON.stringify({
          [sample as string]: {
            status: 'submitted',
            submittedAt: '2026-08-31T09:00:00.000Z',
            answers: {},
            history: events,
          },
        })
      );
    },
    [bucketKey, sampleId, history] as const
  );
}

async function openHistoryAsReviewer(page: Page) {
  // Viewing as the reviewer means maskHistoryForViewer() is a no-op (masking
  // only applies to an annotator viewer), so every seeded event is eligible
  // to render and the assertions below exercise the render-layer collapse
  // rule directly, not FR-090's viewer-role masking.
  await page.goto(buildWorkspaceUrl({ task_id: TASK, sample_id: SAMPLE, role: 'reviewer', run_type: RUN_TYPE }));
  await page.getByTestId('ws-guideline-tab-history').click();
}

test.describe('issue #601 -- collapse the reviewer envelope submitted event', () => {
  test('a reviewer submitted event is hidden when the same reviewer\'s next event is accepted', async ({ page }) => {
    const pageErrors: Error[] = [];
    page.on('pageerror', (err) => pageErrors.push(err));

    await skipGuidelineModal(page);
    await seedBucket(page, ANNOTATOR_BUCKET_KEY, SAMPLE, [
      { action: 'submitted', role: 'annotator', actorId: ANNOTATOR, at: '2026-08-31T09:00:00.000Z', summary: '標記員提交' },
    ]);
    await seedBucket(page, REVIEWER_BUCKET_KEY, SAMPLE, [
      { action: 'submitted', role: 'reviewer', actorId: REVIEWER, at: '2026-08-31T09:01:00.000Z', summary: '審核員提交' },
      { action: 'accepted', role: 'reviewer', actorId: REVIEWER, at: '2026-08-31T09:02:00.000Z', summary: '審核通過 single_label' },
    ]);
    await openHistoryAsReviewer(page);

    const cards = page.locator('#wsHistoryContainer .history-item');
    // Three events were written; the reviewer's envelope submitted collapses
    // away, leaving two rendered cards.
    await expect(cards).toHaveCount(2);

    const submittedCards = page.locator('#wsHistoryContainer .history-item').filter({
      has: page.locator('.history-action-badge[data-action="submitted"]'),
    });
    // The one surviving submitted card belongs to the annotator, not a
    // reviewer -- proves the reviewer's envelope specifically collapsed,
    // rather than every submitted card being suppressed.
    await expect(submittedCards).toHaveCount(1);
    await expect(submittedCards.locator('.history-actor')).toHaveText(`標記員 · ${ANNOTATOR}`);

    const acceptedBadges = page.locator('#wsHistoryContainer .history-action-badge[data-action="accepted"]');
    await expect(acceptedBadges).toHaveCount(1);

    expect(pageErrors, pageErrors.map((e) => e.message).join('; ')).toEqual([]);
  });

  test('a reviewer submitted event is hidden when the same reviewer\'s next event is modified', async ({ page }) => {
    const pageErrors: Error[] = [];
    page.on('pageerror', (err) => pageErrors.push(err));

    await skipGuidelineModal(page);
    await seedBucket(page, ANNOTATOR_BUCKET_KEY, SAMPLE, [
      { action: 'submitted', role: 'annotator', actorId: ANNOTATOR, at: '2026-08-31T09:00:00.000Z', summary: '標記員提交' },
    ]);
    await seedBucket(page, REVIEWER_BUCKET_KEY, SAMPLE, [
      { action: 'submitted', role: 'reviewer', actorId: REVIEWER, at: '2026-08-31T09:01:00.000Z', summary: '審核員提交' },
      { action: 'modified', role: 'reviewer', actorId: REVIEWER, at: '2026-08-31T09:02:00.000Z', summary: '審核修正 single_label' },
    ]);
    await openHistoryAsReviewer(page);

    const cards = page.locator('#wsHistoryContainer .history-item');
    await expect(cards).toHaveCount(2);

    const submittedCards = page.locator('#wsHistoryContainer .history-item').filter({
      has: page.locator('.history-action-badge[data-action="submitted"]'),
    });
    await expect(submittedCards).toHaveCount(1);
    await expect(submittedCards.locator('.history-actor')).toHaveText(`標記員 · ${ANNOTATOR}`);

    const modifiedBadges = page.locator('#wsHistoryContainer .history-action-badge[data-action="modified"]');
    await expect(modifiedBadges).toHaveCount(1);

    expect(pageErrors, pageErrors.map((e) => e.message).join('; ')).toEqual([]);
  });

  test('the annotator\'s own submitted event still renders even when a reviewer accepted event immediately follows it', async ({ page }) => {
    const pageErrors: Error[] = [];
    page.on('pageerror', (err) => pageErrors.push(err));

    await skipGuidelineModal(page);
    // Deliberately unrealistic ordering (no reviewer submitted event
    // precedes the accepted decision): this isolates the collapse rule to
    // `role === 'reviewer'` specifically, rather than "hide any submitted
    // event immediately followed by accepted/modified" regardless of whose
    // submitted event it is. If the implementation collapses on action
    // adjacency alone, the annotator's only event -- the one carrying their
    // answer -- would vanish.
    await seedBucket(page, ANNOTATOR_BUCKET_KEY, SAMPLE, [
      { action: 'submitted', role: 'annotator', actorId: ANNOTATOR, at: '2026-08-31T09:00:00.000Z', summary: '標記員提交' },
    ]);
    await seedBucket(page, REVIEWER_BUCKET_KEY, SAMPLE, [
      { action: 'accepted', role: 'reviewer', actorId: REVIEWER, at: '2026-08-31T09:01:00.000Z', summary: '審核通過 single_label' },
    ]);
    await openHistoryAsReviewer(page);

    const cards = page.locator('#wsHistoryContainer .history-item');
    await expect(cards).toHaveCount(2);

    const submittedCards = page.locator('#wsHistoryContainer .history-item').filter({
      has: page.locator('.history-action-badge[data-action="submitted"]'),
    });
    await expect(submittedCards).toHaveCount(1);
    await expect(submittedCards.locator('.history-actor')).toHaveText(`標記員 · ${ANNOTATOR}`);

    expect(pageErrors, pageErrors.map((e) => e.message).join('; ')).toEqual([]);
  });

  test('a reviewer submitted event with no following decision (every outKey rejected) still renders as that reviewer\'s only trace', async ({ page }) => {
    const pageErrors: Error[] = [];
    page.on('pageerror', (err) => pageErrors.push(err));

    await skipGuidelineModal(page);
    // Mirrors the real official_run all-reject shape: markSampleSubmitted()
    // writes the reviewer's own bucket's submitted event (no decisions
    // followed, since appendReviewDecisionEvents only emits for 'approve'),
    // and the separate markSampleRejected() call writes a 'rejected' event
    // into the ANNOTATOR's bucket with role 'reviewer'.
    await seedBucket(page, ANNOTATOR_BUCKET_KEY, SAMPLE, [
      { action: 'submitted', role: 'annotator', actorId: ANNOTATOR, at: '2026-08-31T09:00:00.000Z', summary: '標記員提交' },
      { action: 'rejected', role: 'reviewer', actorId: REVIEWER, at: '2026-08-31T09:02:00.000Z', summary: '全數退回' },
    ]);
    await seedBucket(page, REVIEWER_BUCKET_KEY, SAMPLE, [
      { action: 'submitted', role: 'reviewer', actorId: REVIEWER, at: '2026-08-31T09:01:00.000Z', summary: '審核員提交' },
    ]);
    await openHistoryAsReviewer(page);

    const cards = page.locator('#wsHistoryContainer .history-item');
    await expect(cards).toHaveCount(3);

    const submittedCards = page.locator('#wsHistoryContainer .history-item').filter({
      has: page.locator('.history-action-badge[data-action="submitted"]'),
    });
    await expect(submittedCards).toHaveCount(2);
    const reviewerSubmittedCard = submittedCards.filter({ hasText: `審核員 · ${REVIEWER}` });
    await expect(reviewerSubmittedCard).toHaveCount(1);
    await expect(reviewerSubmittedCard.locator('.history-actor')).toHaveText(`審核員 · ${REVIEWER}`);

    const rejectedBadges = page.locator('#wsHistoryContainer .history-action-badge[data-action="rejected"]');
    await expect(rejectedBadges).toHaveCount(1);

    expect(pageErrors, pageErrors.map((e) => e.message).join('; ')).toEqual([]);
  });
});
