import { test, expect, type Page } from '@playwright/test';
import {
  buildWorkspaceUrl,
  skipGuidelineModal,
  trackPageErrors,
  assertNoPageErrors,
} from './_workspace-helpers';

/* issue #578 / spec 015 v4.61.0 -- FR-087, position-bearing half (AC-2.18).
 *
 * The plain-value diff group B shipped compares one stringified answer per
 * output key, so for `entity_recognition` it compares the joined entity
 * texts. That reads "unchanged" for the single most common review edit
 * there is: the same entity with a corrected boundary. The whole point of
 * AC-2.18's second AND is that equal entity counts must not imply an empty
 * diff, so these tests pin the per-entity kinds rather than a rendered
 * sentence -- `data-diff-kind` keeps the contract off the i18n strings.
 */

const TASK = 'T001';
const SAMPLE = 'sent-001';
const ANNOTATOR = 'kioleemg12';

type Entity = { text: string; type: string; start: number; end: number };

/* previewState carries the key (that is what historyOutputKeys enumerates),
   previewEntities carries the spans -- the same split the engine writes. */
const entityPayload = (entities: Entity[]) => ({
  previewState: { entity_recognition: {} },
  previewEntities: entities,
});

/* A draft followed by a submit, rather than two submits: the issue-#201
   double-submit guard drops a second consecutive `submitted` from the same
   actor, and what this file needs is simply two adjacent snapshots. */
async function seedTwoSnapshots(page: Page, before: Entity[], after: Entity[]) {
  await page.evaluate(
    (a: { before: Entity[]; after: Entity[] }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = (window as any).LabelSuiteAnnotationWorkspaceData;
      const payload = (entities: Entity[]) => ({
        previewState: { entity_recognition: {} },
        previewEntities: entities,
      });
      const identity = { annotatorId: 'kioleemg12' };
      data.markSampleSaved('T001', 'annotator', 'official_run', 'sent-001', payload(a.before), 'draft', identity);
      data.markSampleSubmitted('T001', 'annotator', 'official_run', 'sent-001', payload(a.after), 'submit', identity);
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

test.describe('issue #578 -- position-bearing output diffs', () => {
  test('AC-2.18: a new entity plus a moved boundary render as one added and one boundary item', async ({ page }) => {
    const errors = trackPageErrors(page);
    await skipGuidelineModal(page);
    await page.goto(buildWorkspaceUrl({ task_id: TASK, sample_id: SAMPLE, annotator_id: ANNOTATOR }));

    await seedTwoSnapshots(
      page,
      [
        { text: '台北市政府', type: 'LOC', start: 0, end: 4 },
        { text: '王小明', type: 'PER', start: 8, end: 10 },
        { text: '台積電', type: 'ORG', start: 14, end: 16 },
      ],
      [
        { text: '台北市政府大樓', type: 'LOC', start: 0, end: 6 },
        { text: '王小明', type: 'PER', start: 8, end: 10 },
        { text: '台積電', type: 'ORG', start: 14, end: 16 },
        { text: '新竹', type: 'LOC', start: 20, end: 21 },
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
    await expect(boundary).toContainText('4');
    await expect(boundary).toContainText('6');
    assertNoPageErrors(errors);
  });

  test('AC-2.18: an equal entity count with one different boundary still produces a non-empty diff', async ({ page }) => {
    const errors = trackPageErrors(page);
    await skipGuidelineModal(page);
    await page.goto(buildWorkspaceUrl({ task_id: TASK, sample_id: SAMPLE, annotator_id: ANNOTATOR }));

    /* Identical texts on purpose: the joined-text comparison group B ships
       cannot tell these two snapshots apart at all. */
    await seedTwoSnapshots(
      page,
      [
        { text: '台北市', type: 'LOC', start: 0, end: 2 },
        { text: '王小明', type: 'PER', start: 8, end: 10 },
      ],
      [
        { text: '台北市', type: 'LOC', start: 0, end: 3 },
        { text: '王小明', type: 'PER', start: 8, end: 10 },
      ]
    );
    await openHistory(page);

    const items = latestCard(page).locator('.history-diff-item');
    await expect(items).toHaveCount(1);
    await expect(items.filter({ has: page.locator('[data-diff-kind="boundary"]') })).toHaveCount(1);
    assertNoPageErrors(errors);
  });

  test('AC-2.18: the same start under a different label reads as one delete plus one add, not a boundary change', async ({ page }) => {
    const errors = trackPageErrors(page);
    await skipGuidelineModal(page);
    await page.goto(buildWorkspaceUrl({ task_id: TASK, sample_id: SAMPLE, annotator_id: ANNOTATOR }));

    await seedTwoSnapshots(
      page,
      [{ text: '台北市', type: 'LOC', start: 0, end: 2 }],
      [{ text: '台北市', type: 'ORG', start: 0, end: 2 }]
    );
    await openHistory(page);

    const items = latestCard(page).locator('.history-diff-item');
    await expect(items).toHaveCount(2);
    await expect(items.filter({ has: page.locator('[data-diff-kind="removed"]') })).toHaveCount(1);
    await expect(items.filter({ has: page.locator('[data-diff-kind="added"]') })).toHaveCount(1);
    await expect(items.filter({ has: page.locator('[data-diff-kind="boundary"]') })).toHaveCount(0);
    assertNoPageErrors(errors);
  });
});
