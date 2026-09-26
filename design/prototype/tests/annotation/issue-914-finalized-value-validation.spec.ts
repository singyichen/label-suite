import { test, expect, type Page } from '@playwright/test';
import { buildListUrl, buildWorkspaceUrl, skipGuidelineModal, fillArbitrationReasons, type RunType } from './_workspace-helpers';

/* issue #914: getReviewUnitStatus() (annotation-workspace.data.js, around
 * line 2242, `allResolved` around lines 2263-2268) reads a review unit as
 * FINALIZED off two checks that never verify a LEGITIMATE `finalized_value`
 * is actually present:
 *   - the arbitration branch only checks `stored.finalized_by` truthy --
 *     never that `stored.finalized_value` exists.
 *   - the exception-pool branch only checks `poolRecord.action !==
 *     'exclude_from_dataset'` -- never that `poolRecord.finalized_value`
 *     exists or is non-null.
 *
 * The value-CONSUMING side is stricter: getFinalizedOverwrites()
 * (annotation-list.html ~line 1496) requires
 * `Object.prototype.hasOwnProperty.call(poolRecord, 'finalized_value')` for
 * the exception-pool branch, and only falls back to the annotator's
 * original answer when arbitration has no `finalized_by` at all. This gap
 * produces two concrete failure shapes:
 *
 *   1. A record with NO `finalized_value` property at all (a legacy/
 *      malformed shape issue #913 could produce before its own fix, or any
 *      future shape that omits the key) -- getReviewUnitStatus() still
 *      reads `finalized`, while a page that trusted `hasOwnProperty` would
 *      correctly treat it as not-yet-legitimately-resolved.
 *   2. A record that DOES have the `finalized_value` property, but the
 *      value is the illegitimate sentinel `null` -- produced today by the
 *      project leader's `custom_answer` disposition
 *      (annotation-workspace.config.js `expandExceptionPoolAction()`
 *      confirm handler, ~line 4490) when confirmed with a reason but NO
 *      answer picked in the reused config-driven preview control
 *      (`convertSubmissionAnswer()` returns `null` for an unselected
 *      `single_label`, data.js `case 'single_label': return ps.selected ||
 *      null;`). `hasOwnProperty` alone does NOT catch this shape --
 *      `finalized_value: null` passes it -- so today's
 *      getFinalizedOverwrites() ALSO mis-treats it as a legitimate
 *      overwrite (`overwrites[outKey] = null`), and
 *      getFinalizationSourceKeys() attaches the `reviewFinalizationPlCustom`
 *      badge unconditionally for any `custom_answer` disposition regardless
 *      of value legitimacy.
 *
 * This file only pins the required BEHAVIOR through the existing public API
 * (getReviewUnitStatus, getExceptionPool, getArbitrationState,
 * markSampleSubmitted, submitArbitration-via-UI, and the rendered DOM) --
 * the Green fix's shared predicate (name TBD, e.g.
 * `hasLegitimateFinalizedValue()`) is not referenced here.
 *
 * Fixture: T001/sent-001, single_label (positive/neutral/negative options,
 * task-detail.data.js :28), annotator kioleemg12, ONE disagreeing reviewer
 * reviewer_wang (the FR-093 sticky owner for this unit -- see the sibling
 * issue-913-exception-pool-sticky-owner.spec.ts header, where reviewer_wang
 * is established as the intended owner of this exact unit), arbiter
 * reviewer_chen (can_arbitrate, non-participant). official_run throughout
 * (custom_answer is only offered there, AC-4.57).
 *
 * Traceability: FR-063 (finalization requires a legitimate resolution),
 * FR-095 (final exception pool / custom_answer), FR-061 (arbitration
 * finalizes), getReviewUnitStatus() / getFinalizedOverwrites() /
 * getFinalizationSourceKeys().
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
  getExceptionPool: (
    taskId: string, runType: string, sampleId: string, identity: Identity
  ) => Record<string, ExceptionPoolRecord>;
  getArbitrationState: (
    taskId: string, runType: string, sampleId: string, identity: Identity
  ) => Record<string, ArbitrationItem>;
};

/* No `declare global` here: other specs in this directory already
 * declare/cast this window property with their own shapes -- cast per
 * evaluate call instead, same idiom (see issue-596-exception-pool.spec.ts,
 * issue-913-exception-pool-sticky-owner.spec.ts). */

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

const IDENTITY: Identity = { annotatorId: ANNOTATOR };

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
 * context -- they cannot close over module-scope Node consts like TASK/
 * SAMPLE, only over their own `args` parameter (same reason
 * issue-596-exception-pool.spec.ts's `seed()` hardcodes 'T001'/'sent-001'
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
  await seed(page, { role: 'annotator', runType, payload: labelPayload(ANNOTATOR_ANSWER), identity: IDENTITY });
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

/* No shared helper builds a `role=project_leader` URL: _workspace-helpers.ts's
 * `Role` type is intentionally `'annotator' | 'reviewer'` only (out of scope
 * to edit here), so this local builder mirrors the sibling
 * issue-596-exception-pool.spec.ts / issue-913-exception-pool-sticky-owner
 * .spec.ts exact path/query convention. */
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

function readExceptionPool(page: Page, runType: RunType): Promise<Record<string, ExceptionPoolRecord>> {
  return page.evaluate((rt) =>
    (window as unknown as { LabelSuiteAnnotationWorkspaceData: WorkspaceData })
      .LabelSuiteAnnotationWorkspaceData.getExceptionPool('T001', rt, 'sent-001', { annotatorId: 'kioleemg12' }),
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
 * every production write path -- simulates a record shape today's normal
 * UI/API flow can no longer produce (issue #913's producer bug is already
 * fixed), matching the raw-localStorage-seeding idiom
 * annotation-workspace-arbitration-legacy-store-migration.spec.ts uses for
 * the same reason. */
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

/* Drives the REAL UI through: seeded dispute -> arbiter rejects (兩者皆非) ->
 * project leader picks custom_answer, fills a reason, but confirms WITHOUT
 * selecting any answer in the reused single_label preview control. This is
 * the exact write-path documented in the file header that leaves
 * `finalized_value: null` in the exception-pool record -- reused by both
 * scenario 3 (data-layer assertions) and scenario 4 (list-page assertions)
 * so each stays an independent, self-seeding test per this directory's
 * convention. */
async function seedCustomAnswerNullValueDisposition(page: Page, runType: RunType): Promise<void> {
  await seedDisputedUnit(page, runType);

  await gotoArbiterWorkspace(page, runType);
  const disputeItem = page.getByTestId('ws-arbitration-item').first();
  await disputeItem.getByTestId('ws-arbitration-choose-reject').click();
  await fillArbitrationReasons(page);
  await page.getByTestId('ws-arbitration-submit').click();
  await expect.poll(() => arbitrationStateJson(page, runType)).toContain('"choice":"reject"');

  await page.goto(buildProjectLeaderUrl(runType));
  const poolItem = page.getByTestId('ws-exception-pool-item').first();
  await poolItem.getByTestId('ws-exception-pool-action-custom_answer').click();

  // Deliberately do NOT click any preview-control answer button.
  await poolItem.getByTestId('ws-exception-pool-reason').fill('自訂答案（未選擇答案，測試理由）');
  // issue #920: the old per-action `ws-exception-pool-custom-answer-confirm`
  // testid is retired in favor of the unified `ws-exception-pool-confirm`.
  await poolItem.getByTestId('ws-exception-pool-confirm').click();
}

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
});

test.describe('issue #914: getReviewUnitStatus() must require a legitimate finalized_value, not just its shallow presence markers', () => {
  test('exception-pool record missing finalized_value entirely must not read the unit as finalized', async ({ page }) => {
    await seedDisputedUnit(page, 'official_run');

    // Simulates a pre-existing/legacy malformed record (the shape issue
    // #913 could produce before its own fix): `action: 'adopt_reviewer'`
    // with NO `finalized_value` key at all.
    await writeMalformedExceptionPoolRecord(page, 'official_run', {
      resolver_id: 'mandy@labelsuite.io',
      action: 'adopt_reviewer',
      reason: '',
      resolved_at: new Date().toISOString(),
    });

    // Red: today's exception-pool branch only checks
    // `poolRecord.action !== 'exclude_from_dataset'`, never that
    // `finalized_value` exists -- so it reads `finalized` here.
    expect(await unitStatus(page, 'official_run')).toBe('disputed');
  });

  test('arbitration record with finalized_by set but finalized_value entirely absent must not read the unit as finalized', async ({ page }) => {
    await seedDisputedUnit(page, 'official_run');

    // Simulates a malformed adopt_b record: `finalized_by` is set but
    // `finalized_value` is entirely absent.
    await writeMalformedArbitrationItem(page, 'official_run', {
      votes: [{ arbiter_id: ARBITER, choice: 'reject', voted_at: new Date().toISOString() }],
      finalized_by: ARBITER,
    });

    // Red: today's arbitration branch only checks `stored.finalized_by`
    // truthy, never that `finalized_value` exists -- so it reads
    // `finalized` here.
    expect(await unitStatus(page, 'official_run')).toBe('disputed');
  });

  test('custom_answer confirmed with no answer selected writes finalized_value: null and must not read the unit as finalized', async ({ page }) => {
    await seedCustomAnswerNullValueDisposition(page, 'official_run');

    // Sanity check: the fixture reached the documented write-path state
    // (custom_answer resolved the item to the null sentinel). This part
    // already passes today -- it is not the Red assertion.
    const pool = await readExceptionPool(page, 'official_run');
    expect(pool[OUT_KEY]).toBeDefined();
    expect(pool[OUT_KEY].action).toBe('custom_answer');
    expect(pool[OUT_KEY].finalized_value).toBeNull();

    // Red: today's exception-pool branch treats any non-exclude action as
    // resolving, regardless of whether `finalized_value` is a legitimate
    // answer -- so it reads `finalized` here even though `null` was never a
    // real disposition.
    expect(await unitStatus(page, 'official_run')).toBe('disputed');
  });

  test('list page falls back to the annotator\'s original answer and suppresses the finalization badge for a custom_answer -> null record', async ({ page }) => {
    await seedCustomAnswerNullValueDisposition(page, 'official_run');

    await page.goto(buildListUrl({
      task_id: TASK, role: 'reviewer', run_type: 'official_run', reviewer_id: REVIEWER,
    }));

    // sent-001 renders one row per demo annotator (FR-055/#792) -- filter
    // on ANNOTATOR too so this matches exactly our seeded unit's row.
    const row = page.getByTestId('ws-sample-item')
      .filter({ hasText: SAMPLE })
      .filter({ hasText: ANNOTATOR });

    const answerCell = row.getByTestId('list-review-answer');
    // Red: today's getFinalizedOverwrites() only checks
    // `hasOwnProperty(poolRecord, 'finalized_value')`, which the
    // custom_answer -> null record satisfies, so it treats `null` as a
    // legitimate overwrite and the cell renders the reviewNoAnswer
    // placeholder (`（無）`) instead of falling back to the annotator's
    // real original answer.
    await expect(answerCell).toHaveText(ANNOTATOR_ANSWER);
    await expect(answerCell).not.toHaveText('（無）');
    await expect(answerCell).not.toHaveText('');

    // Red: today's getFinalizationSourceKeys() attaches
    // `reviewFinalizationPlCustom` unconditionally for any custom_answer
    // disposition, regardless of value legitimacy -- so the badge renders
    // even though the answer cell shows no real custom value.
    await expect(row.getByTestId('list-review-finalization-source-badge')).not.toBeVisible();
  });
});
