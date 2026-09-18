import { test, expect, type Page } from '@playwright/test';
import { buildWorkspaceUrl, skipGuidelineModal } from './_workspace-helpers';

/* issue #810 (RED): AC-4.54 (spec 015:596) ties the arbitration B option's
 * wording to the REVIEWER'S DECISION, not to whether a value happens to be
 * stored -- 「項目 1 之審核員決策為 `修正`……項目 2 為 `無法判定`…… Then 項目 1
 * 之 B 選項顯示審核員修正值、項目 2 之 B 選項顯示 `審核員 Bypass（無法判定）`」.
 *
 * arbitrationBChoiceText() (annotation-workspace.config.js :3617) still
 * decides by EMPTINESS instead, on the premise its own comment states: "a
 * `modify` decision always carries a real replacement value". That premise
 * is false on the live submit path -- :4866 stores
 * `values[outKey] = currentRowAnswer(outKey)` unconditionally, so a reviewer
 * who clears the answer panel and clicks 修正 persists `modify` with an empty
 * value. The arbiter is then told the reviewer chose 無法判定 when they chose
 * 修正: the B option misreports the decision it exists to represent, and the
 * arbiter's adopt-B is made on a false premise.
 *
 * The data layer already made exactly this move for the opposite direction
 * in issue #753 (annotation-workspace.data.js :2238): "`bypass` is decided by
 * the DECISION, never by the diff". This file pins the same rule on the
 * remaining consumer.
 *
 * --- Decided Red contract (Green is wrong if it disagrees, not this file) ---
 *   1. An explicit stored decision GOVERNS the wording. `bypass` renders
 *      `審核員 Bypass（無法判定）`; any other decision renders the 修正 wording
 *      with whatever value is stored -- including `（無）` when the reviewer
 *      stored nothing. Reporting an empty modify honestly is the point: the
 *      arbiter must be able to tell "審核員改成空的" from "審核員無法判定".
 *   2. The emptiness heuristic survives ONLY as the no-decision fallback.
 *      `decisions` is absent on every pre-#551 submission and on seeds that
 *      do not set it (data.js :1946), so removing the heuristic outright
 *      would regress issue-596-arbitration.spec.ts's derived-bypass case.
 *
 * NOT in scope: the submit-side guard that would stop an empty `modify`
 * being stored at all. FR-083 (015:901) fixes reviewRowBlocker()'s return
 * set to `null | 'undecided' | 'reason'` and its toast to two keys, so a
 * third blocker category ADDS a requirement and needs the full OpenSpec
 * flow, not this Lightweight-Path fix. Wording convergence (`無法裁決`) is
 * issue #811's copy-only PR.
 *
 * Traceability: specs/annotation/015-annotation-workspace/spec.md AC-4.54,
 * FR-061 point 2, FR-092(2); issue #810; issue #753 (PR #764) precedent.
 */

type Identity = { annotatorId?: string; reviewerId?: string };

type WorkspaceData = {
  markSampleSubmitted: (
    taskId: string, role: string, runType: string, sampleId: string,
    payload: unknown, historySummary: string, identity: Identity
  ) => void;
};

const TASK = 'T001';
const SAMPLE = 'sent-001';
const ANNOTATOR = 'kioleemg12';
const PARTICIPANT = 'reviewer_wang'; // dispute participant; must not arbitrate
const ARBITER = 'reviewer_chen'; // demo roster: can_arbitrate, non-participant

function seed(
  page: Page,
  args: { role: string; payload: unknown; identity: Identity }
): Promise<void> {
  return page.evaluate((a) => {
    (window as unknown as { LabelSuiteAnnotationWorkspaceData: WorkspaceData })
      .LabelSuiteAnnotationWorkspaceData.markSampleSubmitted(
        'T001', a.role, 'official_run', 'sent-001', a.payload, '', a.identity
      );
  }, args);
}

/* Seeds a disputed unit whose single reviewer submitted `reviewerPayload`.
 * Same idiom as issue-596-arbitration.spec.ts: load the workspace once so the
 * data layer exists, then drive markSampleSubmitted() through page.evaluate. */
async function seedDisputedUnit(page: Page, reviewerPayload: unknown): Promise<void> {
  await page.goto(buildWorkspaceUrl({ task_id: TASK, sample_id: SAMPLE, role: 'annotator' }));
  await seed(page, {
    role: 'annotator',
    payload: { previewState: { single_label: { selected: 'sad' } } },
    identity: { annotatorId: ANNOTATOR },
  });
  await seed(page, {
    role: 'reviewer',
    payload: reviewerPayload,
    identity: { annotatorId: ANNOTATOR, reviewerId: PARTICIPANT },
  });
}

function gotoAsArbiter(page: Page) {
  return page.goto(buildWorkspaceUrl({
    task_id: TASK, sample_id: SAMPLE, role: 'reviewer', run_type: 'official_run',
    annotator_id: ANNOTATOR, reviewer_id: ARBITER,
  }));
}

function bChoice(page: Page) {
  return page.getByTestId('ws-arbitration-item').first().getByTestId('ws-arbitration-choose-b');
}

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
});

test.describe('issue #810: B 選項依決策值渲染，不依值是否為空 (AC-4.54)', () => {
  test('修正 with an empty stored value still renders as 修正, never as Bypass', async ({ page }) => {
    /* The live submit path's shape: an explicit `modify` decision whose
       stored answer is empty because the reviewer cleared the panel first
       (config.js :4866 stores currentRowAnswer() unconditionally). */
    await seedDisputedUnit(page, {
      previewState: {},
      decisions: { single_label: 'modify' },
      values: { single_label: '' },
    });
    await gotoAsArbiter(page);

    /* Fails today: arbitrationBChoiceText() sees an empty reviewerValue and
       returns the Bypass wording, reporting a decision the reviewer never
       made. */
    await expect(bChoice(page)).not.toContainText('審核員 Bypass');
    await expect(bChoice(page)).toContainText('B・審核員');
  });

  test('an explicit 無法判定 decision still renders the Bypass wording', async ({ page }) => {
    /* Regression guard for the direction that already works -- the Green
       change must not trade one misreport for the other. */
    await seedDisputedUnit(page, {
      previewState: { single_label: { selected: 'fear' } },
      decisions: { single_label: 'bypass' },
    });
    await gotoAsArbiter(page);

    await expect(bChoice(page)).toContainText('審核員 Bypass（無法判定）');
  });

  test('a submission with no decisions map falls back to the emptiness reading', async ({ page }) => {
    /* Compat guard (contract point 2): pre-#551 and seeded submissions carry
       no `decisions`, so the heuristic must stay reachable for them. */
    await seedDisputedUnit(page, { previewState: {} });
    await gotoAsArbiter(page);

    await expect(bChoice(page)).toContainText('審核員 Bypass（無法判定）');
  });
});
