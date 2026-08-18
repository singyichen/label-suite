import { test, expect, type Page } from '@playwright/test';
import { buildWorkspaceUrl, skipGuidelineModal } from './_workspace-helpers';

/* Dispute item derivation (spec 015 v4.6.0, issue #147 P3a).
 *
 * A DisputeItem is one disagreed label/span/token inside a review unit --
 * NOT the whole unit. Parts both sides agree on never enter the pool
 * (issue #147 requirement 1). Like the review unit status itself, dispute
 * items are DERIVED at read time from the annotator submission plus every
 * reviewer submission on it; nothing is materialized. Only arbitration
 * votes and the finalized value get stored, and those arrive in P3c.
 *
 * This file pins the derivation contract only -- no layout:
 *   getDisputeItems() -- the per-item union across reviewers, merged by
 *   the FR-052 merge key, carrying A (annotator) and per-reviewer B values.
 */

type DisputeItem = {
  outKey: string;
  key: string;
  annotatorValue: unknown;
  reviewerValues: Record<string, unknown>;
};

type WorkspaceData = {
  getDisputeItems: (
    taskId: string,
    runType: string,
    sampleId: string,
    identity: { annotatorId: string },
    outKeys: string[]
  ) => DisputeItem[];
  markSampleSubmitted: (
    taskId: string,
    role: string,
    runType: string,
    sampleId: string,
    payload: unknown,
    historySummary: string,
    identity: { annotatorId?: string; reviewerId?: string }
  ) => void;
};

const ANNOTATOR = 'kioleemg12';
const REVIEWER_A = 'reviewer_wang';
const REVIEWER_B = 'reviewer_li';
const TASK = 'T001';
const SAMPLE = 'sent-001';

/* Seeds a submission bucket directly rather than driving the UI: this PR
 * changes no layout. The arbitration card that consumes these items only
 * arrives in P3c. */
function seed(
  page: Page,
  args: { role: string; runType: string; payload: unknown; identity: { annotatorId?: string; reviewerId?: string } }
): Promise<void> {
  return page.evaluate(
    (a) => {
      (window as unknown as { LabelSuiteAnnotationWorkspaceData: WorkspaceData })
        .LabelSuiteAnnotationWorkspaceData.markSampleSubmitted(
          'T001',
          a.role,
          a.runType,
          'sent-001',
          a.payload,
          '',
          a.identity
        );
    },
    args
  );
}

function disputeItems(page: Page, outKeys: string[]): Promise<DisputeItem[]> {
  return page.evaluate(
    (a) =>
      (window as unknown as { LabelSuiteAnnotationWorkspaceData: WorkspaceData })
        .LabelSuiteAnnotationWorkspaceData.getDisputeItems(
          'T001',
          'official_run',
          'sent-001',
          { annotatorId: 'kioleemg12' },
          a.outKeys
        ),
    { outKeys }
  );
}

const labelPayload = (selected: string) => ({ previewState: { single_label: { selected } } });
const entityPayload = (entities: Array<{ text: string; type: string }>) => ({ previewEntities: entities });
const dimsPayload = (dims: Record<string, number>) => ({
  previewState: {
    multi_dim: {
      dims: Object.fromEntries(Object.entries(dims).map(([name, value]) => [name, { value }])),
    },
  },
});

const seedAnnotator = (page: Page, payload: unknown) =>
  seed(page, { role: 'annotator', runType: 'official_run', payload, identity: { annotatorId: ANNOTATOR } });
const seedReviewer = (page: Page, reviewerId: string, payload: unknown) =>
  seed(page, {
    role: 'reviewer',
    runType: 'official_run',
    payload,
    identity: { annotatorId: ANNOTATOR, reviewerId },
  });

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
  await page.goto(buildWorkspaceUrl({ task_id: TASK, sample_id: SAMPLE }));
});

test.describe('dispute items: derivation boundaries', () => {
  test('no annotator submission yields no dispute items', async ({ page }) => {
    expect(await disputeItems(page, ['single_label'])).toEqual([]);
  });

  test('an unreviewed submission yields no dispute items', async ({ page }) => {
    await seedAnnotator(page, labelPayload('sad'));
    expect(await disputeItems(page, ['single_label'])).toEqual([]);
  });

  test('a fully agreeing reviewer yields no dispute items', async ({ page }) => {
    await seedAnnotator(page, labelPayload('sad'));
    await seedReviewer(page, REVIEWER_A, labelPayload('sad'));
    expect(await disputeItems(page, ['single_label'])).toEqual([]);
  });
});

test.describe('dispute items: per-item union across reviewers', () => {
  test('a disagreeing reviewer produces one item carrying A and B values', async ({ page }) => {
    await seedAnnotator(page, labelPayload('sad'));
    await seedReviewer(page, REVIEWER_A, labelPayload('fear'));

    expect(await disputeItems(page, ['single_label'])).toEqual([
      {
        outKey: 'single_label',
        key: 'single_label',
        annotatorValue: 'sad',
        reviewerValues: { [REVIEWER_A]: 'fear' },
      },
    ]);
  });

  test('an agreeing reviewer does not appear among the B values', async ({ page }) => {
    await seedAnnotator(page, labelPayload('sad'));
    await seedReviewer(page, REVIEWER_A, labelPayload('sad'));
    await seedReviewer(page, REVIEWER_B, labelPayload('fear'));

    const items = await disputeItems(page, ['single_label']);
    expect(items).toHaveLength(1);
    expect(items[0].reviewerValues).toEqual({ [REVIEWER_B]: 'fear' });
  });

  test('two reviewers disagreeing differently merge into one item, keyed once', async ({ page }) => {
    await seedAnnotator(page, labelPayload('sad'));
    await seedReviewer(page, REVIEWER_A, labelPayload('fear'));
    await seedReviewer(page, REVIEWER_B, labelPayload('joy'));

    expect(await disputeItems(page, ['single_label'])).toEqual([
      {
        outKey: 'single_label',
        key: 'single_label',
        annotatorValue: 'sad',
        reviewerValues: { [REVIEWER_A]: 'fear', [REVIEWER_B]: 'joy' },
      },
    ]);
  });

  test('entity_recognition splits per merge key and keeps agreed spans out of the pool', async ({ page }) => {
    await seedAnnotator(
      page,
      entityPayload([
        { text: '確診', type: 'SYMPTOM' },
        { text: '台北', type: 'LOC' },
      ])
    );
    // Reviewer keeps 台北::LOC, retypes 確診 SYMPTOM -> DIAGNOSIS.
    await seedReviewer(
      page,
      REVIEWER_A,
      entityPayload([
        { text: '確診', type: 'DIAGNOSIS' },
        { text: '台北', type: 'LOC' },
      ])
    );

    const items = await disputeItems(page, ['entity_recognition']);
    expect(items.map((i) => i.key).sort()).toEqual(['確診::DIAGNOSIS', '確診::SYMPTOM']);

    const dropped = items.find((i) => i.key === '確診::SYMPTOM');
    expect(dropped?.annotatorValue).toEqual({ text: '確診', type: 'SYMPTOM' });
    expect(dropped?.reviewerValues).toEqual({ [REVIEWER_A]: null });

    const added = items.find((i) => i.key === '確診::DIAGNOSIS');
    expect(added?.annotatorValue).toBeNull();
    expect(added?.reviewerValues).toEqual({ [REVIEWER_A]: { text: '確診', type: 'DIAGNOSIS' } });
  });

  test('multi_dim pools only the changed dimension', async ({ page }) => {
    await seedAnnotator(page, dimsPayload({ valence: 3, arousal: 5 }));
    await seedReviewer(page, REVIEWER_A, dimsPayload({ valence: 3, arousal: 2 }));

    expect(await disputeItems(page, ['multi_dim'])).toEqual([
      {
        outKey: 'multi_dim',
        key: 'arousal',
        annotatorValue: 5,
        reviewerValues: { [REVIEWER_A]: 2 },
      },
    ]);
  });

  test('items are scoped per output type and keep the composed order', async ({ page }) => {
    await seedAnnotator(page, {
      previewState: { single_label: { selected: 'sad' } },
      previewEntities: [{ text: '確診', type: 'SYMPTOM' }],
    });
    await seedReviewer(page, REVIEWER_A, {
      previewState: { single_label: { selected: 'fear' } },
      previewEntities: [{ text: '確診', type: 'SYMPTOM' }],
    });

    const items = await disputeItems(page, ['single_label', 'entity_recognition']);
    expect(items).toHaveLength(1);
    expect(items[0].outKey).toBe('single_label');
  });
});
