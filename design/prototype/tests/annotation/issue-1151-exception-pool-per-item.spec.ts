import { test, expect, type Page } from '@playwright/test';
import { buildWorkspaceUrl, skipGuidelineModal, fillArbitrationReasons } from './_workspace-helpers';

/* issue #1151: the final exception pool must record a disposition PER DISPUTE
 * ITEM (`outKey × merge key`, itemId = `outKey::key`), not per outKey.
 *
 * Bug: resolveExceptionPoolItem() (annotation-workspace.data.js) does
 * `pool[outKey] = record`, and every consumer (getReviewUnitStatus,
 * itemResolved, exceptionPoolQueue) looks the record up by `item.outKey`. When
 * one multi_label review unit has two dispute items that were both arbitrated
 * 兩者皆非 (reject), resolving ONE writes the whole outKey, so the other item
 * is also treated as resolved.
 *
 * Contract this file pins (Green must implement):
 *   - resolveExceptionPoolItem(taskId, runType, sampleId, identity, key, ...)
 *     keeps its signature; the UI passes the full itemId `outKey::key`.
 *   - a pool record keyed by itemId closes ONLY that item.
 *   - a legacy record keyed by the bare outKey still closes every item of
 *     that outKey (backward compat for existing seeds/tests).
 *
 * Fixture: T002 (multi_label only), official_run, sample emo-001.
 *   annotator answers [sad, fear]; reviewer answers [sad, angry]
 *   => FR-052 set diff yields two dispute items: multi_label::fear (annotator
 *   only) and multi_label::angry (reviewer only).
 *
 * Traceability: 015 FR-059(4), FR-061(7), FR-095.
 */

type Identity = { annotatorId?: string; reviewerId?: string };
type PoolItem = { sampleId: string; outKey: string; key: string };
type WorkspaceData = {
  markSampleSubmitted: (
    taskId: string, role: string, runType: string, sampleId: string,
    payload: unknown, historySummary: string, identity: Identity
  ) => void;
  getReviewUnitStatus: (
    taskId: string, runType: string, sampleId: string, identity: Identity, outKeys: string[]
  ) => string | null;
  listReviewPoolItems: (taskId: string, runType: string) => { pendingExceptions: PoolItem[] };
  resolveExceptionPoolItem: (
    taskId: string, runType: string, sampleId: string, identity: Identity,
    key: string, action: string, value: unknown, reason: string
  ) => void;
};

const TASK = 'T002';
const SAMPLE = 'emo-001';
const RUN = 'official_run';
const OUT_KEY = 'multi_label';
const ANNOTATOR = 'kioleemg12';
const REVIEWER = 'reviewer_wang';
const ARBITER = 'reviewer_chen';
const IDENTITY: Identity = { annotatorId: ANNOTATOR };
const ITEM_FEAR = `${OUT_KEY}::fear`;
const ITEM_ANGRY = `${OUT_KEY}::angry`;

function projectLeaderUrl(): string {
  return `/pages/annotation/annotation-workspace.html?task_id=${TASK}&sample_id=${SAMPLE}&role=project_leader&run_type=${RUN}&annotator_id=${ANNOTATOR}`;
}

async function seedTwoRejectedItems(page: Page): Promise<void> {
  await page.goto(buildWorkspaceUrl({ task_id: TASK, sample_id: SAMPLE, role: 'annotator', run_type: RUN }));
  const submit = (role: string, selected: string[], identity: Identity) =>
    page.evaluate(
      (a) => {
        (window as unknown as { LabelSuiteAnnotationWorkspaceData: WorkspaceData })
          .LabelSuiteAnnotationWorkspaceData.markSampleSubmitted(
            a.task, a.role, a.run, a.sample,
            { previewState: { [a.outKey]: { selected: a.selected } } }, '', a.identity
          );
      },
      { task: TASK, run: RUN, sample: SAMPLE, outKey: OUT_KEY, role, selected, identity }
    );
  await submit('annotator', ['sad', 'fear'], IDENTITY);
  await submit('reviewer', ['sad', 'angry'], { annotatorId: ANNOTATOR, reviewerId: REVIEWER });

  // Arbiter votes 兩者皆非 (reject) on BOTH dispute items through the real UI.
  await page.goto(buildWorkspaceUrl({
    task_id: TASK, sample_id: SAMPLE, role: 'reviewer', run_type: RUN,
    annotator_id: ANNOTATOR, reviewer_id: ARBITER,
  }));
  const items = page.getByTestId('ws-arbitration-item');
  await expect(items).toHaveCount(2);
  for (let i = 0; i < 2; i += 1) {
    await items.nth(i).getByTestId('ws-arbitration-choose-reject').click();
  }
  await fillArbitrationReasons(page);
  await page.getByTestId('ws-arbitration-submit').click();
}

async function pendingExceptionKeys(page: Page): Promise<string[]> {
  const list = await page.evaluate(
    (a) => (window as unknown as { LabelSuiteAnnotationWorkspaceData: WorkspaceData })
      .LabelSuiteAnnotationWorkspaceData.listReviewPoolItems(a.task, a.run),
    { task: TASK, run: RUN }
  );
  return list.pendingExceptions
    .filter((i) => i.sampleId === SAMPLE)
    .map((i) => `${i.outKey}::${i.key}`)
    .sort();
}

function unitStatus(page: Page): Promise<string | null> {
  return page.evaluate(
    (a) => (window as unknown as { LabelSuiteAnnotationWorkspaceData: WorkspaceData })
      .LabelSuiteAnnotationWorkspaceData.getReviewUnitStatus(a.task, a.run, a.sample, a.identity, [a.outKey]),
    { task: TASK, run: RUN, sample: SAMPLE, identity: IDENTITY, outKey: OUT_KEY }
  );
}

async function exceptionPoolCountOnTaskDetail(page: Page): Promise<number> {
  await page.goto(`/pages/task-management/task-detail.html?task_id=${TASK}&ap_stage=official`);
  await page.locator('#workLogPanel').waitFor({ state: 'attached' });
  await page.locator('#tabMemberManagement').click();
  await expect(page.locator('#exceptionPoolText')).toHaveText(/\d+/);
  const text = (await page.locator('#exceptionPoolText').textContent()) || '';
  const m = text.match(/(\d+)/);
  expect(m, `#exceptionPoolText must carry a number, got "${text}"`).not.toBeNull();
  return Number(m![1]);
}

/* Resolves the row at `index` of the workspace pool screen with 採標記員答案. */
async function resolveRowAdoptAnnotator(page: Page, index: number): Promise<void> {
  const row = page.getByTestId('ws-exception-pool-item').nth(index);
  await row.getByTestId('ws-exception-pool-action-adopt_annotator').click();
  await row.getByTestId('ws-exception-pool-reason').fill('採用標記員答案（測試理由）');
  await row.getByTestId('ws-exception-pool-confirm').click();
}

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
});

test.describe('issue #1151: exception pool disposition is per dispute item, not per outKey', () => {
  test('UI: resolving one of two rejected multi_label items leaves the other pending (count 2 -> 1)', async ({ page }) => {
    const baseline = await exceptionPoolCountOnTaskDetail(page);
    await seedTwoRejectedItems(page);

    await page.goto(projectLeaderUrl());
    await expect(page.getByTestId('ws-exception-pool-item')).toHaveCount(2);
    expect(await pendingExceptionKeys(page)).toEqual([ITEM_ANGRY, ITEM_FEAR]);
    expect(await exceptionPoolCountOnTaskDetail(page)).toBe(baseline + 2);

    await page.goto(projectLeaderUrl());
    await resolveRowAdoptAnnotator(page, 0);

    // The other item must still be waiting for its own disposition.
    await expect(page.getByTestId('ws-exception-pool-item')).toHaveCount(1);
    expect((await pendingExceptionKeys(page)).length).toBe(1);
    expect(await unitStatus(page), 'unit stays disputed while one item is unresolved').toBe('disputed');
    expect(await exceptionPoolCountOnTaskDetail(page)).toBe(baseline + 1);

    // Resolving the second item finishes the unit.
    await page.goto(projectLeaderUrl());
    await resolveRowAdoptAnnotator(page, 0);
    expect(await pendingExceptionKeys(page)).toEqual([]);
    expect(await unitStatus(page)).toBe('finalized');
    expect(await exceptionPoolCountOnTaskDetail(page)).toBe(baseline);
  });

  test('data layer: a record keyed by itemId closes only that item', async ({ page }) => {
    await seedTwoRejectedItems(page);
    await page.goto(projectLeaderUrl());

    await page.evaluate(
      (a) => (window as unknown as { LabelSuiteAnnotationWorkspaceData: WorkspaceData })
        .LabelSuiteAnnotationWorkspaceData.resolveExceptionPoolItem(
          a.task, a.run, a.sample, a.identity, a.itemId, 'adopt_annotator', 'fear', 'itemId-keyed'
        ),
      { task: TASK, run: RUN, sample: SAMPLE, identity: IDENTITY, itemId: ITEM_FEAR }
    );

    expect(await pendingExceptionKeys(page)).toEqual([ITEM_ANGRY]);
    expect(await unitStatus(page)).toBe('disputed');
  });

  test('data layer: a legacy record keyed by bare outKey still closes every item of that outKey', async ({ page }) => {
    await seedTwoRejectedItems(page);
    await page.goto(projectLeaderUrl());

    await page.evaluate(
      (a) => (window as unknown as { LabelSuiteAnnotationWorkspaceData: WorkspaceData })
        .LabelSuiteAnnotationWorkspaceData.resolveExceptionPoolItem(
          a.task, a.run, a.sample, a.identity, a.outKey, 'adopt_annotator', 'fear', 'legacy outKey-keyed'
        ),
      { task: TASK, run: RUN, sample: SAMPLE, identity: IDENTITY, outKey: OUT_KEY }
    );

    expect(await pendingExceptionKeys(page)).toEqual([]);
    expect(await unitStatus(page)).toBe('finalized');
  });
});
