import { test, expect, type Page } from '@playwright/test';
import { buildWorkspaceUrl, skipGuidelineModal, fillArbitrationReasons, type RunType } from './_workspace-helpers';

/* issue #596 (OpenSpec change 2026-09-01-single-owner-review-relay, task 6.1,
 * RED): FR-095's final exception pool -- the project leader's per-item
 * disposition screen for arbitration `reject` (兩者皆非) outcomes.
 *
 * NONE of this exists yet. Confirmed by exhaustive grep of
 * annotation-workspace.config.js: no `ws-exception-pool*` testid, and no
 * `project_leader` / `projectLeader` / `PROJECT_LEADER` string anywhere in
 * the file. `role=project_leader` degrades silently to `currentRole =
 * 'annotator'` today (config.js :5165 -- `params.get('role') === 'reviewer'
 * ? 'reviewer' : 'annotator'`), so every case below fails because the
 * disposition screen never renders, never a selector typo or a thrown error.
 *
 * The READ side already exists and is correct today, un-touched by this
 * change: `getExceptionPool()` (data.js :2257, read-only, returns `{}` when
 * nothing is written yet), `getReviewUnitStatus()` (data.js :1952 -- already
 * treats a non-`exclude_from_dataset` pool record as "resolved" for
 * finalization, and any `exclude_from_dataset` record as a finalize-blocking
 * `disputed` marker per FR-063), and `getSampleHistory()`. Only the WRITE
 * path (the disposition screen + its persistence call) is missing, which is
 * exactly this task's Red target.
 *
 * --- Decided Red contract (task 6.2's Green implementation is wrong if it
 *     disagrees, not this test) ---
 *   - Visibility (per team-lead's decided design constraint): the screen
 *     renders ONLY when `role=project_leader` AND the unit has an unresolved
 *     exception-pool item. No other role sees it; there is no redirect and
 *     no error message to assert -- non-project_leader is simply "screen
 *     absent". This PR has no navigation entry point either -- every case
 *     below reaches the screen by direct URL, matching that constraint.
 *   - New testids: `ws-exception-pool` (root container), `ws-exception-pool-item`
 *     (one per unresolved item), `ws-exception-pool-action-<action>` (one
 *     button per `EXCEPTION_POOL_ACTIONS` entry, scoped inside the item --
 *     asserted data-driven off the exported constant, never a hardcoded
 *     4-item or 3-item list), `ws-exception-pool-custom-answer` (the panel
 *     that expands under the item when `custom_answer` is chosen),
 *     `ws-exception-pool-reason` (its required reason field), and
 *     `ws-exception-pool-custom-answer-confirm` (confirms the custom-answer
 *     resolution; blocked while the reason is empty).
 *   - design.md D4: `custom_answer`'s expanded control MUST be the SAME
 *     config-driven control the annotator/reviewer workspaces already use
 *     (task-config.engine.js `renderOutputPreview()` -> for `single_label`,
 *     `renderSingleLabelPreview()`'s plain `<button>` chips, one per
 *     `label_options` entry, no per-chip testid, accessible name = the
 *     option's `name`). This file asserts those buttons by role/name inside
 *     the panel -- an exception-pool-only free-text box would NOT satisfy
 *     this and must fail the assertion.
 *   - Reason gating: FR-095 point 3 requires a reason ONLY for
 *     `custom_answer`, and this file tests that gate exactly there (empty
 *     reason blocks finalize; a legal value + a reason resolves it).
 *     `adopt_annotator` / `adopt_reviewer` / `exclude_from_dataset` are
 *     tested as pure one-click actions per FR-095 points 1/2/4's literal
 *     "一鍵完成" wording -- this file does NOT assert a reason field exists
 *     (or doesn't) for those three, and clicks the action testid exactly
 *     once before reading the persisted result. NOTE for the Green
 *     implementer: design.md D2's `exceptionPool` shape lists `reason` as
 *     non-optional for every action, which is in tension with "one click, no
 *     reason field" -- if Green needs a reason for those three too, that
 *     reason must come from a fixed default string written automatically by
 *     the one click, not from an interactive prompt this test does not fill.
 *     Flagging this ambiguity explicitly rather than silently picking a side
 *     the spec text doesn't fully settle.
 *   - FR-063 / FR-051: `adopt_annotator` / `adopt_reviewer` / `custom_answer`
 *     resolve the item and the unit derives `finalized` once every dispute
 *     item is resolved (verified via the pre-existing, unmodified
 *     `getReviewUnitStatus()`). `exclude_from_dataset` also resolves the
 *     item but the unit MUST NOT derive `finalized` (stays `disputed`).
 *   - FR-086: every disposition writes one history event via the
 *     pre-existing `getSampleHistory()` -- action `exception_resolved` for
 *     the three resolving actions, `excluded` for `exclude_from_dataset`
 *     (both action strings are named explicitly in FR-095's closing line).
 *
 * Seeding: same markSampleSubmitted() data-layer idiom as the sibling
 * issue-596-arbitration.spec.ts, PLUS driving that file's already-Green(-able)
 * three-exit arbitration UI (`ws-arbitration-choose-reject` +
 * fillArbitrationReasons() + `ws-arbitration-submit`) to produce the
 * unresolved reject vote that feeds the exception-pool queue -- per that
 * file's own header, a completed reject persists as an ARBITRATION vote with
 * no `finalized_by`, which is exactly the "queued" state this file's
 * disposition screen must act on. Seeded values are T001's real legal
 * single_label options (positive/neutral/negative, task-detail.data.js :28)
 * so the custom_answer test can prove the expanded control is genuinely
 * config-bound rather than accepting arbitrary strings.
 *
 * Traceability: openspec/changes/2026-09-01-single-owner-review-relay/
 *   specs/annotation/015-annotation-workspace/spec.md FR-095 (AC-4.56,
 *   AC-4.57), FR-063, FR-086; design.md D2 (exceptionPool shape), D4
 *   (custom_answer control reuse); tasks.md task 6.1.
 */

type Identity = { annotatorId?: string; reviewerId?: string };

type ExceptionPoolRecord = {
  resolver_id?: string;
  action?: string;
  finalized_value?: unknown;
  reason?: string;
  resolved_at?: string;
};

type HistoryEvent = { action?: string; role?: string; actorId?: string; at?: string; reason?: string };

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
  ) => unknown;
  getExceptionPool: (
    taskId: string, runType: string, sampleId: string, identity: Identity
  ) => Record<string, ExceptionPoolRecord>;
  getSampleHistory: (
    taskId: string, runType: string, sampleId: string, identity: Identity, viewer?: unknown
  ) => HistoryEvent[];
  EXCEPTION_POOL_ACTIONS: string[];
};

/* No `declare global` here: annotation-workspace-arbitration.spec.ts and
 * issue-596-arbitration.spec.ts already declare/cast this window property
 * with their own shapes -- cast per evaluate call instead, same idiom. */

const TASK = 'T001';
const SAMPLE = 'sent-001';
const OUT_KEY = 'single_label';
const ANNOTATOR = 'kioleemg12';
const PARTICIPANT = 'reviewer_wang'; // dispute participant; must not arbitrate
const ARBITER = 'reviewer_chen'; // demo roster: can_arbitrate, non-participant

const IDENTITY: Identity = { annotatorId: ANNOTATOR };

const labelPayload = (selected: string) => ({ previewState: { single_label: { selected } } });

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

function arbitrationStateJson(page: Page, runType: RunType): Promise<string> {
  return page.evaluate((rt) =>
    JSON.stringify(
      (window as unknown as { LabelSuiteAnnotationWorkspaceData: WorkspaceData })
        .LabelSuiteAnnotationWorkspaceData.getArbitrationState('T001', rt, 'sent-001', { annotatorId: 'kioleemg12' }) || {}
    ), runType
  );
}

/* Seeds a dispute (annotator answers `annotatorValue`, reviewer corrects to
 * `reviewerValue`) then drives the already-implemented three-exit
 * arbitration UI to a completed 兩者皆非 (reject) -- the state FR-095's
 * exception pool queues from. */
async function seedRejectedDisputeUnit(
  page: Page,
  args: { runType: RunType; annotatorValue: string; reviewerValue: string }
): Promise<void> {
  const { runType, annotatorValue, reviewerValue } = args;
  await page.goto(buildWorkspaceUrl({ task_id: TASK, sample_id: SAMPLE, role: 'annotator', run_type: runType }));
  await seed(page, { role: 'annotator', runType, payload: labelPayload(annotatorValue), identity: IDENTITY });
  await seed(page, {
    role: 'reviewer', runType, payload: labelPayload(reviewerValue),
    identity: { annotatorId: ANNOTATOR, reviewerId: PARTICIPANT },
  });

  await page.goto(buildWorkspaceUrl({
    task_id: TASK, sample_id: SAMPLE, role: 'reviewer', run_type: runType,
    annotator_id: ANNOTATOR, reviewer_id: ARBITER,
  }));
  const item = page.getByTestId('ws-arbitration-item').first();
  await item.getByTestId('ws-arbitration-choose-reject').click();
  await fillArbitrationReasons(page);
  await page.getByTestId('ws-arbitration-submit').click();
  await expect.poll(() => arbitrationStateJson(page, runType)).toContain('"choice":"reject"');
}

/* No shared helper builds a `role=project_leader` URL: _workspace-helpers.ts's
 * `Role` type is intentionally `'annotator' | 'reviewer'` only (this task
 * must not edit that shared file), so this local builder mirrors its exact
 * path/query convention for the one new role value this change introduces. */
function buildProjectLeaderUrl(runType: RunType): string {
  return `/pages/annotation/annotation-workspace.html?task_id=${TASK}&sample_id=${SAMPLE}&role=project_leader&run_type=${runType}&annotator_id=${ANNOTATOR}`;
}

function readExceptionPool(page: Page, runType: RunType): Promise<Record<string, ExceptionPoolRecord>> {
  return page.evaluate((rt) =>
    (window as unknown as { LabelSuiteAnnotationWorkspaceData: WorkspaceData })
      .LabelSuiteAnnotationWorkspaceData.getExceptionPool('T001', rt, 'sent-001', { annotatorId: 'kioleemg12' }),
    runType
  );
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

function sampleHistory(page: Page, runType: RunType): Promise<HistoryEvent[]> {
  return page.evaluate((rt) =>
    (window as unknown as { LabelSuiteAnnotationWorkspaceData: WorkspaceData })
      .LabelSuiteAnnotationWorkspaceData.getSampleHistory('T001', rt, 'sent-001', { annotatorId: 'kioleemg12' }, undefined),
    runType
  );
}

function readActions(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    (window as unknown as { LabelSuiteAnnotationWorkspaceData: WorkspaceData })
      .LabelSuiteAnnotationWorkspaceData.EXCEPTION_POOL_ACTIONS
  );
}

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
});

test.describe('issue #596: FR-095 final exception pool disposition screen', () => {
  test('AC-4.56: official_run offers all four EXCEPTION_POOL_ACTIONS, data-driven off the constant', async ({ page }) => {
    await seedRejectedDisputeUnit(page, { runType: 'official_run', annotatorValue: 'positive', reviewerValue: 'negative' });
    await page.goto(buildProjectLeaderUrl('official_run'));

    const actions = await readActions(page);
    expect(actions).toEqual(['adopt_annotator', 'adopt_reviewer', 'custom_answer', 'exclude_from_dataset']);

    await expect(page.getByTestId('ws-exception-pool')).toHaveCount(1);
    const item = page.getByTestId('ws-exception-pool-item').first();
    await expect(page.getByTestId('ws-exception-pool-item')).toHaveCount(1);
    for (const action of actions) {
      await expect(item.getByTestId(`ws-exception-pool-action-${action}`)).toHaveCount(1);
    }
    // No extra/undeclared action buttons -- exactly the constant's length.
    await expect(item.locator('[data-testid^="ws-exception-pool-action-"]')).toHaveCount(actions.length);
  });

  test('AC-4.56: custom_answer expands the config-driven single_label control; empty reason blocks finalize', async ({ page }) => {
    await seedRejectedDisputeUnit(page, { runType: 'official_run', annotatorValue: 'positive', reviewerValue: 'negative' });
    await page.goto(buildProjectLeaderUrl('official_run'));

    const item = page.getByTestId('ws-exception-pool-item').first();
    await item.getByTestId('ws-exception-pool-action-custom_answer').click();

    const panel = item.getByTestId('ws-exception-pool-custom-answer');
    await expect(panel).toHaveCount(1);
    // design.md D4: the SAME renderSingleLabelPreview() chip control the
    // annotator/reviewer workspaces use -- plain buttons named after each
    // label_options entry, not an exception-pool-only free-text box.
    await expect(panel.getByRole('button', { name: 'positive' })).toHaveCount(1);
    await expect(panel.getByRole('button', { name: 'neutral' })).toHaveCount(1);
    await expect(panel.getByRole('button', { name: 'negative' })).toHaveCount(1);

    await panel.getByRole('button', { name: 'neutral' }).click();
    await item.getByTestId('ws-exception-pool-custom-answer-confirm').click();

    // FR-095 point 3: reason required -- blank reason blocks finalize, and
    // nothing is written yet.
    expect((await readExceptionPool(page, 'official_run'))[OUT_KEY]).toBeUndefined();
    expect(await unitStatus(page, 'official_run')).toBe('disputed');

    await item.getByTestId('ws-exception-pool-reason').fill('自訂答案（測試理由）');
    await item.getByTestId('ws-exception-pool-custom-answer-confirm').click();

    const pool = await readExceptionPool(page, 'official_run');
    expect(pool[OUT_KEY]).toMatchObject({
      action: 'custom_answer',
      finalized_value: 'neutral',
      reason: '自訂答案（測試理由）',
    });
    expect(pool[OUT_KEY].resolver_id).toBeTruthy();
    expect(pool[OUT_KEY].resolved_at).toBeTruthy();
    // FR-051/FR-063: custom_answer resolves the item -> unit finalizes.
    expect(await unitStatus(page, 'official_run')).toBe('finalized');

    // FR-086: one history event, action `exception_resolved`, carrying the
    // reason.
    const history = await sampleHistory(page, 'official_run');
    expect(
      history.some((e) => e.action === 'exception_resolved' && e.reason === '自訂答案（測試理由）')
    ).toBe(true);
  });

  test('AC-4.57: dry_run offers only three actions, no custom_answer entry and no answer control', async ({ page }) => {
    await seedRejectedDisputeUnit(page, { runType: 'dry_run', annotatorValue: 'positive', reviewerValue: 'negative' });
    await page.goto(buildProjectLeaderUrl('dry_run'));

    const actions = await readActions(page);
    const dryRunActions = actions.filter((a) => a !== 'custom_answer');

    const item = page.getByTestId('ws-exception-pool-item').first();
    await expect(item.locator('[data-testid^="ws-exception-pool-action-"]')).toHaveCount(dryRunActions.length);
    for (const action of dryRunActions) {
      await expect(item.getByTestId(`ws-exception-pool-action-${action}`)).toHaveCount(1);
    }
    await expect(item.getByTestId('ws-exception-pool-action-custom_answer')).toHaveCount(0);
    await expect(item.getByTestId('ws-exception-pool-custom-answer')).toHaveCount(0);
    await expect(item.getByRole('button', { name: 'neutral' })).toHaveCount(0);
  });

  test('FR-063/FR-086: adopt_annotator one-click resolves the item and finalizes the unit', async ({ page }) => {
    await seedRejectedDisputeUnit(page, { runType: 'official_run', annotatorValue: 'positive', reviewerValue: 'negative' });
    await page.goto(buildProjectLeaderUrl('official_run'));

    const item = page.getByTestId('ws-exception-pool-item').first();
    await item.getByTestId('ws-exception-pool-action-adopt_annotator').click();

    const pool = await readExceptionPool(page, 'official_run');
    expect(pool[OUT_KEY]).toMatchObject({ action: 'adopt_annotator', finalized_value: 'positive' });
    expect(pool[OUT_KEY].resolver_id).toBeTruthy();
    expect(pool[OUT_KEY].resolved_at).toBeTruthy();
    expect(await unitStatus(page, 'official_run')).toBe('finalized');

    const history = await sampleHistory(page, 'official_run');
    expect(history.some((e) => e.action === 'exception_resolved')).toBe(true);
  });

  test('FR-063/FR-086: adopt_reviewer one-click resolves the item and finalizes the unit', async ({ page }) => {
    await seedRejectedDisputeUnit(page, { runType: 'official_run', annotatorValue: 'positive', reviewerValue: 'negative' });
    await page.goto(buildProjectLeaderUrl('official_run'));

    const item = page.getByTestId('ws-exception-pool-item').first();
    await item.getByTestId('ws-exception-pool-action-adopt_reviewer').click();

    const pool = await readExceptionPool(page, 'official_run');
    expect(pool[OUT_KEY]).toMatchObject({ action: 'adopt_reviewer', finalized_value: 'negative' });
    expect(pool[OUT_KEY].resolver_id).toBeTruthy();
    expect(pool[OUT_KEY].resolved_at).toBeTruthy();
    expect(await unitStatus(page, 'official_run')).toBe('finalized');

    const history = await sampleHistory(page, 'official_run');
    expect(history.some((e) => e.action === 'exception_resolved')).toBe(true);
  });

  test('FR-063/FR-086: exclude_from_dataset resolves the item but the unit MUST NOT read as finalized', async ({ page }) => {
    await seedRejectedDisputeUnit(page, { runType: 'official_run', annotatorValue: 'positive', reviewerValue: 'negative' });
    await page.goto(buildProjectLeaderUrl('official_run'));

    const item = page.getByTestId('ws-exception-pool-item').first();
    await item.getByTestId('ws-exception-pool-action-exclude_from_dataset').click();

    const pool = await readExceptionPool(page, 'official_run');
    expect(pool[OUT_KEY]).toMatchObject({ action: 'exclude_from_dataset' });
    expect(pool[OUT_KEY].resolver_id).toBeTruthy();
    expect(pool[OUT_KEY].resolved_at).toBeTruthy();
    // FR-063: an excluded item produces no gold value -- the unit MUST NOT
    // derive `finalized`, unlike the other three resolving actions above.
    expect(await unitStatus(page, 'official_run')).toBe('disputed');

    const history = await sampleHistory(page, 'official_run');
    expect(history.some((e) => e.action === 'excluded')).toBe(true);
  });
});
