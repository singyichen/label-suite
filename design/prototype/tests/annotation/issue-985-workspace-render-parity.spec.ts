import { test, expect, type Page } from '@playwright/test';
import { buildWorkspaceUrl, skipGuidelineModal, fillArbitrationReasons, type RunType } from './_workspace-helpers';

/* issue #985 (follow-up of issue #914 / PR #984): #914 introduced the shared
 * predicate `hasLegitimateFinalizedValue(record)` (annotation-workspace.data.js
 * ~line 2235, exported ~line 3918) and wired it into getReviewUnitStatus()'s
 * `allResolved` derivation (~lines 2294-2300). That fix was deliberately
 * scoped to STATE DERIVATION only -- four RENDER-time call sites in
 * annotation-workspace.config.js were left on their pre-#914 shallow checks
 * (`stored.finalized_by` truthy, or a pool record merely existing), never
 * requiring a LEGITIMATE `finalized_value`:
 *
 *   1. finalizedAnswers() (~line 4350) -- builds the read-only "定稿結果"
 *      (`ws-finalized-result`) on the finalized card. Its `poolRecord`
 *      branch (~4356-4362) only checks `hasOwnProperty('finalized_value')`,
 *      never `hasLegitimateFinalizedValue()`.
 *   2. finalizedBasisLabels() (~line 4396) -- builds the "定稿依據" badge
 *      (`ws-finalized-basis`). Its `exceptionPool` loop (~4412-4415) pushes
 *      a basis label for ANY pool record regardless of legitimacy.
 *   3. renderArbitrationCard() (~line 4479) -- the open-vs-resolved item
 *      filter while a unit is still `disputed`: `if (stored &&
 *      stored.finalized_by)` treats a malformed record (finalized_by set,
 *      finalized_value entirely absent) as already resolved.
 *   4. exceptionPoolQueue() (~line 4560) -- the project leader's final
 *      exception-pool queue: `!!(stored && !stored.finalized_by) &&
 *      !pool[item.outKey]` drops an item from the queue the instant ANY
 *      pool record exists for its outKey, legitimate or not.
 *
 * This file pins the CORRECT (Green) behavior for all four -- each
 * assertion is expected to FAIL today, against the unfixed shallow checks --
 * plus one reverse-invariant test (must pass both today and after the fix)
 * guarding against an overcorrection that would reject every `null`
 * (design.md D3: `finalized_value: null` from a legitimate `adopt_b`/
 * `adopt_reviewer` bypass passthrough is a real "無法判定" sentinel, not an
 * illegitimate value).
 *
 * Fixture: T001/sent-001, single_label (positive/neutral/negative options,
 * task-detail.data.js :28), annotator kioleemg12, ONE disagreeing reviewer
 * reviewer_wang (the FR-093 sticky owner for this unit -- see
 * issue-913-exception-pool-sticky-owner.spec.ts), arbiter reviewer_chen
 * (can_arbitrate, non-participant). official_run throughout. Reused verbatim
 * from issue-914-finalized-value-validation.spec.ts's own fixture, including
 * its raw-localStorage-seeding helpers (writeMalformedArbitrationItem /
 * writeMalformedExceptionPoolRecord) -- same "bypass every production write
 * path" idiom annotation-workspace-arbitration-legacy-store-migration.spec.ts
 * uses for the same reason.
 *
 * Traceability: FR-063 (finalization requires a legitimate resolution),
 * FR-095 (final exception pool / custom_answer), FR-061 (arbitration
 * finalizes), design.md D3 (bypass-passthrough null sentinel).
 */

type Identity = { annotatorId?: string; reviewerId?: string };

type ExceptionPoolRecord = {
  resolver_id?: string;
  action?: string;
  finalized_value?: unknown;
  reason?: string;
  resolved_at?: string;
};

type ArbitrationItem = {
  votes?: Array<{ arbiter_id: string; choice: string; voted_at: string; reason?: string }>;
  finalized_value?: unknown;
  finalized_by?: string;
};

type WorkspaceData = {
  markSampleSubmitted: (
    taskId: string, role: string, runType: string, sampleId: string,
    payload: unknown, historySummary: string, identity: Identity
  ) => void;
  getReviewUnitStatus: (
    taskId: string, runType: string, sampleId: string,
    identity: Identity, outKeys: string[]
  ) => string | null;
  getArbitrationState: (
    taskId: string, runType: string, sampleId: string, identity: Identity
  ) => Record<string, ArbitrationItem>;
};

/* No `declare global` here -- same per-evaluate cast idiom every sibling
 * spec in this directory (and issue-914's own template) uses. */

const TASK = 'T001';
const SAMPLE = 'sent-001';
const OUT_KEY = 'single_label';
const ITEM_ID = `${OUT_KEY}::${OUT_KEY}`;
const ANNOTATOR = 'kioleemg12';
const ANNOTATOR_ANSWER = 'positive';
/* FR-093 sticky owner for this exact unit -- see
 * issue-913-exception-pool-sticky-owner.spec.ts. */
const REVIEWER = 'reviewer_wang';
const REVIEWER_ANSWER = 'negative';
const ARBITER = 'reviewer_chen';

const EXCEPTION_POOL_KEY_PREFIX = 'labelsuite.wsExceptionPool.';
const ARBITRATION_KEY_PREFIX = 'labelsuite.wsArbitration.';

function exceptionPoolStorageKey(runType: RunType): string {
  return `${EXCEPTION_POOL_KEY_PREFIX}${TASK}::${runType}::${ANNOTATOR}::${SAMPLE}`;
}

function arbitrationItemStorageKey(runType: RunType): string {
  return `${ARBITRATION_KEY_PREFIX}${TASK}::${runType}::${ANNOTATOR}::${SAMPLE}::${ITEM_ID}`;
}

const labelPayload = (selected: string) => ({ previewState: { single_label: { selected } } });

/* page.evaluate callbacks are serialized and re-executed in the browser
 * context -- they cannot close over module-scope Node consts, only over
 * their own `args` parameter (same reason issue-914's `seed()` hardcodes
 * literals here instead of referencing the outer consts). */
function seed(
  page: Page,
  args: { role: string; runType: RunType; payload: unknown; identity: Identity }
): Promise<void> {
  return page.evaluate((a) => {
    (window as unknown as { LabelSuiteAnnotationWorkspaceData: WorkspaceData })
      .LabelSuiteAnnotationWorkspaceData.markSampleSubmitted(
        'T001', a.role, a.runType, 'sent-001', a.payload, '', a.identity
      );
  }, args);
}

/* Seeds the annotator's answer plus the single FR-093-owning reviewer's
 * disagreeing answer, producing exactly one open dispute item on
 * OUT_KEY -- no arbitration or exception-pool state yet. */
async function seedDisputedUnit(page: Page, runType: RunType): Promise<void> {
  await page.goto(buildWorkspaceUrl({ task_id: TASK, sample_id: SAMPLE, role: 'annotator', run_type: runType }));
  await seed(page, {
    role: 'annotator', runType, payload: labelPayload(ANNOTATOR_ANSWER),
    identity: { annotatorId: ANNOTATOR },
  });
  await seed(page, {
    role: 'reviewer', runType, payload: labelPayload(REVIEWER_ANSWER),
    identity: { annotatorId: ANNOTATOR, reviewerId: REVIEWER },
  });
}

async function gotoArbiterWorkspace(page: Page, runType: RunType): Promise<void> {
  await page.goto(buildWorkspaceUrl({
    task_id: TASK, sample_id: SAMPLE, role: 'reviewer', run_type: runType,
    annotator_id: ANNOTATOR, reviewer_id: ARBITER,
  }));
}

async function gotoParticipantReviewerWorkspace(page: Page, runType: RunType): Promise<void> {
  await page.goto(buildWorkspaceUrl({
    task_id: TASK, sample_id: SAMPLE, role: 'reviewer', run_type: runType,
    annotator_id: ANNOTATOR, reviewer_id: REVIEWER,
  }));
}

/* No shared helper builds a `role=project_leader` URL: _workspace-helpers.ts's
 * `Role` type is intentionally `'annotator' | 'reviewer'` only (out of scope
 * to edit here) -- same local builder issue-914-finalized-value-validation
 * .spec.ts / issue-596-exception-pool.spec.ts / issue-913
 * -exception-pool-sticky-owner.spec.ts already use. */
function buildProjectLeaderUrl(runType: RunType): string {
  return `/pages/annotation/annotation-workspace.html?task_id=${TASK}&sample_id=${SAMPLE}&role=project_leader&run_type=${runType}&annotator_id=${ANNOTATOR}`;
}

function unitStatus(page: Page, runType: RunType): Promise<string | null> {
  return page.evaluate((rt) =>
    (window as unknown as { LabelSuiteAnnotationWorkspaceData: WorkspaceData })
      .LabelSuiteAnnotationWorkspaceData.getReviewUnitStatus(
        'T001', rt, 'sent-001', { annotatorId: 'kioleemg12' }, ['single_label']
      ),
    runType
  );
}

function arbitrationStateJson(page: Page, runType: RunType): Promise<string> {
  return page.evaluate((rt) =>
    JSON.stringify(
      (window as unknown as { LabelSuiteAnnotationWorkspaceData: WorkspaceData })
        .LabelSuiteAnnotationWorkspaceData.getArbitrationState('T001', rt, 'sent-001', { annotatorId: 'kioleemg12' }) || {}
    ), runType
  );
}

/* Directly writes a hand-built exception-pool blob for OUT_KEY, bypassing
 * every production write path -- same idiom as issue-914's own helper of
 * the same name. */
async function writeMalformedExceptionPoolRecord(
  page: Page, runType: RunType, record: ExceptionPoolRecord
): Promise<void> {
  await page.evaluate(
    (a) => window.localStorage.setItem(a.key, JSON.stringify({ [a.outKey]: a.record })),
    { key: exceptionPoolStorageKey(runType), outKey: OUT_KEY, record }
  );
}

async function writeMalformedArbitrationItem(
  page: Page, runType: RunType, item: ArbitrationItem
): Promise<void> {
  await page.evaluate(
    (a) => window.localStorage.setItem(a.key, JSON.stringify(a.item)),
    { key: arbitrationItemStorageKey(runType), item }
  );
}

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
});

test.describe('issue #985: config.js render sites must require a legitimate finalized_value, not just its shallow presence markers', () => {
  test('Case 3 -- renderArbitrationCard() must not render a malformed finalized_by-only item as resolved', async ({ page }) => {
    await seedDisputedUnit(page, 'official_run');

    // Same malformed shape as issue-914's own arbitration test: `finalized_by`
    // set, `finalized_value` entirely absent.
    await writeMalformedArbitrationItem(page, 'official_run', {
      votes: [{ arbiter_id: ARBITER, choice: 'reject', voted_at: new Date().toISOString() }],
      finalized_by: ARBITER,
    });

    // Sanity (already fixed by #914): getReviewUnitStatus() correctly still
    // reads the unit as disputed.
    expect(await unitStatus(page, 'official_run')).toBe('disputed');

    await gotoArbiterWorkspace(page, 'official_run');

    // Red: today's open-item filter only checks `stored.finalized_by`
    // truthy, so it renders the resolved row even though there is no
    // legitimate finalized_value backing it.
    await expect(page.getByTestId('ws-arbitration-item')).toBeVisible();
    await expect(page.getByTestId('ws-arbitration-finalized')).not.toBeVisible();
  });

  test('Case 4 -- exceptionPoolQueue() must not drop an item once a stale illegitimate pool record exists for its outKey', async ({ page }) => {
    await seedDisputedUnit(page, 'official_run');

    await gotoArbiterWorkspace(page, 'official_run');
    const disputeItem = page.getByTestId('ws-arbitration-item').first();
    await disputeItem.getByTestId('ws-arbitration-choose-reject').click();
    await fillArbitrationReasons(page);
    await page.getByTestId('ws-arbitration-submit').click();
    await expect.poll(() => arbitrationStateJson(page, 'official_run')).toContain('"choice":"reject"');

    // A stale/illegitimate pool record for the SAME outKey -- e.g. a
    // custom_answer disposition confirmed with no answer picked (issue
    // #914's documented `finalized_value: null` shape). This never
    // coexists with an open (no finalized_by) arbState reject vote through
    // normal UI flow -- it simulates a legacy-leftover record, exactly like
    // issue-914's own "malformed" fixtures.
    await writeMalformedExceptionPoolRecord(page, 'official_run', {
      resolver_id: 'mandy@labelsuite.io',
      action: 'custom_answer',
      finalized_value: null,
      reason: '自訂答案（未選擇答案，測試理由）',
      resolved_at: new Date().toISOString(),
    });

    // Sanity (already fixed by #914): the unit still reads disputed --
    // neither the arbState reject vote nor the illegitimate pool record
    // resolves this item.
    expect(await unitStatus(page, 'official_run')).toBe('disputed');

    await page.goto(buildProjectLeaderUrl('official_run'));

    // Red: today's queue filter is `!pool[item.outKey]` -- ANY existing
    // record (legitimate or not) removes the item from the queue, so the
    // project leader has no way to dispose of it.
    await expect(page.getByTestId('ws-exception-pool-item')).toBeVisible();
  });

  /* Cases 1 & 2 share this seeding: a LEGITIMATE arbitration resolution
   * (adopt_a, finalized_by set, a real finalized_value) makes
   * getReviewUnitStatus()'s `allResolved` short-circuit true on the
   * arbState branch for this item -- the unit correctly reads `finalized`
   * without ever consulting the exceptionPool branch for this outKey. A
   * SEPARATE, stale illegitimate exceptionPool record for the SAME outKey
   * (written directly, bypassing every production path -- this shape
   * cannot occur through normal UI flow either) is therefore never
   * filtered out by getReviewUnitStatus() -- yet finalizedAnswers() and
   * finalizedBasisLabels() both scan the exceptionPool unconditionally, so
   * they still pick it up. */
  async function seedFinalizedUnitWithStalePoolRecord(page: Page): Promise<void> {
    await seedDisputedUnit(page, 'official_run');

    await writeMalformedArbitrationItem(page, 'official_run', {
      votes: [{ arbiter_id: ARBITER, choice: 'adopt_a', voted_at: new Date().toISOString(), reason: '仲裁理由（測試）' }],
      finalized_by: ARBITER,
      finalized_value: ANNOTATOR_ANSWER,
    });

    await writeMalformedExceptionPoolRecord(page, 'official_run', {
      resolver_id: 'mandy@labelsuite.io',
      action: 'custom_answer',
      finalized_value: null,
      reason: '自訂答案（未選擇答案，測試理由）',
      resolved_at: new Date().toISOString(),
    });
  }

  test('Case 1 -- finalizedAnswers() must not surface a stale illegitimate pool record once the item is legitimately resolved via arbitration', async ({ page }) => {
    await seedFinalizedUnitWithStalePoolRecord(page);

    // Sanity: allResolved short-circuits true on the arbState branch for
    // this item, so the unit already reads finalized today -- this part is
    // not the Red assertion.
    expect(await unitStatus(page, 'official_run')).toBe('finalized');

    await gotoParticipantReviewerWorkspace(page, 'official_run');

    const resultSection = page.getByTestId('ws-finalized-result');
    await expect(resultSection).toBeVisible();

    // Red: today's `poolRecord` branch only checks `hasOwnProperty
    // ('finalized_value')`, which the illegitimate custom_answer-null
    // record satisfies -- so it wins over the legitimate arbitration
    // resolution and the section shows the "no answer" placeholder instead
    // of the real finalized value.
    await expect(resultSection).toContainText(ANNOTATOR_ANSWER);
    await expect(resultSection).not.toContainText('（無）');
  });

  test('Case 2 -- finalizedBasisLabels() must not attach the illegitimate exception-pool basis label alongside the legitimate arbitration basis', async ({ page }) => {
    await seedFinalizedUnitWithStalePoolRecord(page);

    expect(await unitStatus(page, 'official_run')).toBe('finalized');

    await gotoParticipantReviewerWorkspace(page, 'official_run');

    const basisBadge = page.getByTestId('ws-finalized-basis');
    await expect(basisBadge).toBeVisible();

    // Red: today's `exceptionPool` loop pushes a basis label for ANY pool
    // record regardless of legitimacy, so the illegitimate custom_answer
    // label is concatenated onto the legitimate arbitration label with '；'.
    await expect(basisBadge).toContainText('仲裁採用標記員答案');
    await expect(basisBadge).not.toContainText('例外池採用自訂答案');
  });

  /* Reverse invariant (prevents over-correction): `finalized_value: null`
   * from a legitimate `adopt_reviewer` disposition adopting a reviewer's
   * `bypass` (no-value) decision is design.md D3's "無法判定" sentinel, not
   * an illegitimate value -- exceptionPoolQueue() must keep treating it as
   * disposed (item does not reappear in the PL queue), both today and after
   * the eventual fix for Cases 1-4 above. */
  test('reverse invariant -- a legitimate adopt_reviewer bypass-passthrough null must still be treated as disposed by exceptionPoolQueue()', async ({ page }) => {
    await page.goto(buildWorkspaceUrl({ task_id: TASK, sample_id: SAMPLE, role: 'annotator', run_type: 'official_run' }));
    await seed(page, {
      role: 'annotator', runType: 'official_run', payload: labelPayload(ANNOTATOR_ANSWER),
      identity: { annotatorId: ANNOTATOR },
    });
    // A `bypass` decision forces a dispute regardless of value diff
    // (DISPUTE_FORCING_DECISIONS, data.js ~line 2166) and leaves the dispute
    // item's reviewer value as `null` (data.js ~line 2641) -- the same
    // no-value shape issue-811-bypass-answer-decision-wording.spec.ts's
    // `seedBypassDispute()` constructs for its own arbitration-B assertions.
    await seed(page, {
      role: 'reviewer', runType: 'official_run',
      payload: { previewState: { single_label: { selected: REVIEWER_ANSWER } }, decisions: { single_label: 'bypass' } },
      identity: { annotatorId: ANNOTATOR, reviewerId: REVIEWER },
    });

    await gotoArbiterWorkspace(page, 'official_run');
    const disputeItem = page.getByTestId('ws-arbitration-item').first();
    await disputeItem.getByTestId('ws-arbitration-choose-reject').click();
    await fillArbitrationReasons(page);
    await page.getByTestId('ws-arbitration-submit').click();
    await expect.poll(() => arbitrationStateJson(page, 'official_run')).toContain('"choice":"reject"');

    await page.goto(buildProjectLeaderUrl('official_run'));
    const poolItem = page.getByTestId('ws-exception-pool-item').first();
    await poolItem.getByTestId('ws-exception-pool-action-adopt_reviewer').click();
    await poolItem.getByTestId('ws-exception-pool-reason').fill('採用審核員之無法判定（測試）');
    await poolItem.getByTestId('ws-exception-pool-confirm').click();

    // Sanity: the write-path really produced the D3 bypass-passthrough null
    // sentinel, not a real answer.
    const storedRecord = await page.evaluate(
      (a) => {
        const raw = window.localStorage.getItem(a.key);
        return raw ? JSON.parse(raw)[a.outKey] : undefined;
      },
      { key: exceptionPoolStorageKey('official_run'), outKey: OUT_KEY }
    );
    expect(storedRecord).toMatchObject({ action: 'adopt_reviewer', finalized_value: null });

    // Must hold both today and after the fix: the item does not reappear in
    // the PL queue just because its finalized_value happens to be null.
    await expect(page.getByTestId('ws-exception-pool-item')).not.toBeVisible();
  });
});
