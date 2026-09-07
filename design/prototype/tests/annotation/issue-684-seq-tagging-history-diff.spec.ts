import { test, expect, type Page } from '@playwright/test';
import {
  buildWorkspaceUrl,
  skipGuidelineModal,
  trackPageErrors,
  assertNoPageErrors,
} from './_workspace-helpers';

/* issue #684 / spec 015 v4.61.0 -- FR-087, position-bearing half (AC-2.18).
 *
 * SPAN_EXTRACTORS.sequence_tagging (annotation-history.js:171) still reads
 * `((snapshot.previewState || {}).sequence_tagging || {}).tokens`, a shape
 * that predates issue #581 change (2) / PR #657. Since that change the
 * engine writes `state.previewState.sequence_tagging = { spans: [...],
 * pendingSelection, prefillErrors, textKey, _seeded }`
 * (annotation-workspace.config.js:2725-2734) -- there is no `.tokens` key
 * anywhere in the current shape, so the extractor always maps over
 * `undefined` and returns `[]`. `diffPositional()` then compares two empty
 * span sets no matter what actually changed, so the history panel silently
 * renders "no change" for every sequence_tagging edit -- including the
 * single most common review correction there is, a boundary move on an
 * unchanged entity (AC-2.18's second AND: equal span counts must not imply
 * an empty diff).
 *
 * This mirrors issue-578-entity-diff.spec.ts's two cases but for the
 * sequence_tagging output type, asserting on `data-diff-kind` /
 * `.history-diff-item` rather than any i18n string. */

const TASK = 'T006';
const SAMPLE = 'sequence-tagging-001';
const ANNOTATOR = 'kioleemg12';

/* Character-level offsets (task uses snap_unit: 'character'). Text:
   台積電董事長魏哲家今天出席台北國際半導體論壇並發表主題演講
   Preset spans (sequence-tagging-001 seed data, annotation-workspace.data.js:819-822):
   台積電 ORG [0,3)   魏哲家 PER [6,9)   今天 TIME [9,11)   台北 LOC [13,15) */
type Span = { start: number; end: number; label: string; text: string };

/* A draft followed by a submit, rather than two submits: the issue-#201
   double-submit guard drops a second consecutive `submitted` from the same
   actor, and what this file needs is simply two adjacent snapshots (same
   rationale as issue-578-entity-diff.spec.ts's seedTwoSnapshots). */
async function seedTwoSnapshots(page: Page, before: Span[], after: Span[]) {
  await page.evaluate(
    (a: { before: Span[]; after: Span[] }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = (window as any).LabelSuiteAnnotationWorkspaceData;
      const payload = (spans: Span[]) => ({
        previewState: {
          sequence_tagging: {
            spans,
            pendingSelection: null,
            prefillErrors: [],
            textKey: null,
            _seeded: true,
          },
        },
      });
      const identity = { annotatorId: 'kioleemg12' };
      data.markSampleSaved('T006', 'annotator', 'official_run', 'sequence-tagging-001', payload(a.before), 'draft', identity);
      data.markSampleSubmitted('T006', 'annotator', 'official_run', 'sequence-tagging-001', payload(a.after), 'submit', identity);
    },
    { before, after }
  );
}

async function openHistory(page: Page) {
  await page.reload();
  await skipGuidelineModal(page);
  await page.getByTestId('ws-guideline-tab-history').click();
}

/* Newest-first panel, so the submit card is index 0. */
const latestCard = (page: Page) => page.locator('.history-item').first();

test.describe('issue #684 -- sequence_tagging history diff must read the span model', () => {
  test('AC-2.18: a new span plus a moved boundary render as one added and one boundary item', async ({ page }) => {
    const errors = trackPageErrors(page);
    await skipGuidelineModal(page);
    await page.goto(buildWorkspaceUrl({ task_id: TASK, sample_id: SAMPLE, annotator_id: ANNOTATOR }));

    await seedTwoSnapshots(
      page,
      [
        { text: '台積電', label: 'ORG', start: 0, end: 3 },
        { text: '魏哲家', label: 'PER', start: 6, end: 9 },
        { text: '今天', label: 'TIME', start: 9, end: 11 },
      ],
      [
        { text: '台積電董', label: 'ORG', start: 0, end: 4 },
        { text: '魏哲家', label: 'PER', start: 6, end: 9 },
        { text: '今天', label: 'TIME', start: 9, end: 11 },
        { text: '台北', label: 'LOC', start: 13, end: 15 },
      ]
    );
    await openHistory(page);

    const items = latestCard(page).locator('.history-diff-item');
    await expect(items).toHaveCount(2);
    await expect(items.filter({ has: page.locator('[data-diff-kind="added"]') })).toHaveCount(1);

    const boundary = items.filter({ has: page.locator('[data-diff-kind="boundary"]') });
    await expect(boundary).toHaveCount(1);
    /* The AC requires the before and after spans to be named, not merely
       that something changed. */
    await expect(boundary).toContainText('3');
    await expect(boundary).toContainText('4');
    assertNoPageErrors(errors);
  });

  test('AC-2.18: an equal span count with one different boundary still produces a non-empty diff', async ({ page }) => {
    const errors = trackPageErrors(page);
    await skipGuidelineModal(page);
    await page.goto(buildWorkspaceUrl({ task_id: TASK, sample_id: SAMPLE, annotator_id: ANNOTATOR }));

    await seedTwoSnapshots(
      page,
      [
        { text: '台積電', label: 'ORG', start: 0, end: 3 },
        { text: '魏哲家', label: 'PER', start: 6, end: 9 },
        { text: '今天', label: 'TIME', start: 9, end: 11 },
        { text: '台北', label: 'LOC', start: 13, end: 15 },
      ],
      [
        { text: '台積電', label: 'ORG', start: 0, end: 3 },
        { text: '魏哲家', label: 'PER', start: 6, end: 10 },
        { text: '今天', label: 'TIME', start: 9, end: 11 },
        { text: '台北', label: 'LOC', start: 13, end: 15 },
      ]
    );
    await openHistory(page);

    const items = latestCard(page).locator('.history-diff-item');
    await expect(items).toHaveCount(1);
    await expect(items.filter({ has: page.locator('[data-diff-kind="boundary"]') })).toHaveCount(1);
    assertNoPageErrors(errors);
  });
});
