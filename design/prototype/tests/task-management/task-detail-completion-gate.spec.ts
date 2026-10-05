/*
 * Traceability: specs/task-management/014-task-detail/spec.md FR-008b (five completion
 * preconditions), AC-3.9, SC-037, FR-018(5) (the exception pool gate counts only
 * `official_run`). Issue #1120 section 4 acceptance 07 / 08. Review-unit status
 * derivation is 015 FR-051; `exclude_from_dataset` counts as satisfied (FR-008b(2)).
 * No new FR: this file pins the EXISTING FR-008b contract that the prototype fakes
 * (task-detail.html getTaskCompletionBlockerMessages() hardcodes
 * `submissionComplete: true`; task-detail.data.js getTaskCompletionBlockers() treats an
 * omitted condition 2/3/5 as satisfied).
 *
 * Fixture facts (verified on the real page through the public
 * LabelSuiteAnnotationWorkspaceData API, official_run scope, annotator kioleemg12):
 *   - T015: status official_run_in_progress; submissions 4/5
 *     (ANNOTATION_PROGRESS_BY_TASK.T015.official, task-detail.html ~3697); review units 4 =
 *     finalized 2 / disputed 1 / pending 1; pending exceptions 0.
 *   - T016: status official_run_in_progress; submissions 5/5 (T016.official ~3708);
 *     review units 5 = finalized 2 / disputed 3 (ofm-03, ofm-04 awaiting arbitration,
 *     ofm-05 rejected -> pending exception); pending exceptions 1.
 *   Note: design.md D5 lists T015 without a disputed unit; the real seed has one
 *   (ofs-02-modified-dispute), so the T015 disputed reason IS expected here.
 *
 * Contract for Green (structure pinned; WORDING is not):
 *   - While any FR-008b condition is unmet, #publishCompleteBtn is natively `disabled` and
 *     each unmet condition is ONE visible `li` inside #publishActionRow (not hover/colour
 *     only). The button's aria-describedby points at that list so screen readers get the
 *     same text (toHaveAccessibleDescription).
 *   - Reason categories are told apart by keyword only: submission = /提交/ (not mixed with
 *     審核/爭議/例外池), review = /定稿|定案/ without 爭議, disputed = /爭議/, pool = /例外池/.
 *     Disputed and pool reasons carry the unit count as a digit (T015 disputed 1; T016
 *     disputed 3, pool 1; after the pool is cleared T016 disputed 2).
 *   - publishComplete() re-validates inside the handler, so a direct call or
 *     `disabled` removal + click leaves status official_run_in_progress.
 *   - All conditions satisfied: the click goes straight to `completed` (no modal), and the
 *     status is persisted in labelsuite.trialRunState like the other transitions.
 *   - A missing signal is NEVER satisfied: review units whose status is null (no review
 *     state established) must not read as "all finalized" (vacuous truth).
 *
 * Known ambiguity: 015 derives an exclude_from_dataset unit as `disputed` while FR-008b(2)
 * counts it as satisfied; one case below pins the issue's intent (exclusion must not
 * block completion) and is flagged to the lead.
 *
 * How states are produced (no invented app hooks): the review-flow demo seed runs on first
 * load; the tests then resolve disputes through the workspace module's own PUBLIC write
 * paths (resolveExceptionPoolItem / submitArbitration, the same functions the final
 * exception pool screen and the arbitration screen call) and reload. The missing-data
 * state pre-sets the page's own seed marker (labelsuite.reviewFlowDemoSeed.v5) so no review
 * state is ever created: listReviewUnits() still enumerates the dataset records, every
 * status stays null. T001 forced to official_run_in_progress is the same state with no seed
 * at all.
 *
 * Quality metrics (FR-008b(5)) is NOT asserted as its own reason here: no fixture carries
 * a metrics-readiness source today, so a reason cannot be derived from data. Green must
 * define one so T016's resolved state can still complete (see the QA report).
 */
import { test, expect, type Page } from '@playwright/test';

const TASK_DETAIL_URL = '/pages/task-management/task-detail.html';
const TRIAL_RUN_STATE_KEY = 'labelsuite.trialRunState';
const DEMO_SEED_KEY = 'labelsuite.reviewFlowDemoSeed.v5';
const IN_PROGRESS_BADGE = '正式標記進行中';
const COMPLETED_BADGE = '已完成';

const T016_IDENTITY = { annotatorId: 'kioleemg12' };

function digit(n: number) {
  return new RegExp(`(^|\\D)${n}(\\D|$)`);
}

async function reasonTexts(page: Page): Promise<string[]> {
  return page.locator('#publishActionRow li').allInnerTexts();
}

function pick(texts: string[], accept: RegExp, reject?: RegExp) {
  return texts.filter((t) => accept.test(t) && !(reject && reject.test(t)));
}

const SUBMISSION = { accept: /提交/, reject: /審核|爭議|例外池/ };
const REVIEW = { accept: /定稿|定案/, reject: /爭議/ };
const DISPUTED = { accept: /爭議/ };
const POOL = { accept: /例外池/ };

async function openTask(page: Page, taskId: string) {
  await page.goto(`${TASK_DETAIL_URL}?task_id=${taskId}`);
  await expect(page.locator('#statusBadge')).toContainText(IN_PROGRESS_BADGE);
  await expect(page.locator('#publishCompleteBtn')).toBeVisible();
}

/** Resolve T016 disputes through the workspace module's public write paths, then reload.
 *  `pool: 'adopt_reviewer'` closes ofm-05 with a real final value (unit becomes finalized);
 *  `pool: 'exclude'` closes it with exclude_from_dataset (015 still derives that unit as
 *  `disputed`, see the exclusion case below). */
async function resolveT016(
  page: Page,
  parts: { pool?: 'adopt_reviewer' | 'exclude'; arbitration?: boolean },
) {
  await openTask(page, 'T016');
  const statuses = await page.evaluate(
    ({ identity, pool, doArb }) => {
      const ws = (window as any).LabelSuiteAnnotationWorkspaceData;
      if (pool === 'exclude') {
        ws.resolveExceptionPoolItem(
          'T016', 'official_run', 'ofm-05-final-exception', identity,
          'single_label', 'exclude_from_dataset', undefined, 'QA fixture: excluded from dataset',
        );
      } else if (pool === 'adopt_reviewer') {
        ws.resolveExceptionPoolItem(
          'T016', 'official_run', 'ofm-05-final-exception', identity,
          'single_label', 'adopt_reviewer', 'positive', 'QA fixture: adopt the reviewer value',
        );
      }
      if (doArb) {
        ['ofm-03-awaiting-arbitration', 'ofm-04-reviewer-bypass'].forEach((sampleId) => {
          ws.submitArbitration(
            'T016', 'official_run', sampleId, { annotatorId: identity.annotatorId, reviewerId: 'reviewer_chen' },
            [{ itemId: 'single_label::single_label', choice: 'adopt_b', value: 'neutral', reason: 'QA fixture' }],
          );
        });
      }
      return ws.listReviewUnits('T016', 'official_run').map((u: any) => u.status);
    },
    { identity: T016_IDENTITY, pool: parts.pool, doArb: !!parts.arbitration },
  );
  await page.reload();
  await expect(page.locator('#statusBadge')).toContainText(IN_PROGRESS_BADGE);
  return statuses as string[];
}

async function unitStatuses(page: Page, taskId: string): Promise<Array<string | null>> {
  return page.evaluate(
    (id) => (window as any).LabelSuiteAnnotationWorkspaceData.listReviewUnits(id, 'official_run').map((u: any) => u.status),
    taskId,
  );
}

async function persistedStatus(page: Page, taskId: string) {
  return page.evaluate(
    ([key, id]) => {
      const all = JSON.parse(window.localStorage.getItem(key as string) || '{}');
      return all[id as string] ? all[id as string].status : null;
    },
    [TRIAL_RUN_STATE_KEY, taskId],
  );
}

async function expectStillBlocked(page: Page, taskId: string) {
  await expect(page.locator('#statusBadge')).toContainText(IN_PROGRESS_BADGE);
  await expect(page.locator('#publishCompleteBtn')).toHaveCount(1);
  expect(await persistedStatus(page, taskId)).not.toBe('completed');
}

test.describe('Official completion gate (FR-008b, AC-3.9, SC-037)', () => {
  test('T015 fixture facts: official in progress, 4 review units = 2 finalized / 1 disputed / 1 pending, no pending exception', async ({
    page,
  }) => {
    await openTask(page, 'T015');
    const facts = await page.evaluate(() => {
      const ws = (window as any).LabelSuiteAnnotationWorkspaceData;
      const by: Record<string, number> = {};
      ws.listReviewUnits('T015', 'official_run').forEach((u: any) => {
        by[String(u.status)] = (by[String(u.status)] || 0) + 1;
      });
      return { by, pending: ws.listReviewPoolItems('T015', 'official_run').pendingExceptions.length };
    });
    expect(facts.by).toEqual({ finalized: 2, disputed: 1, pending: 1 });
    expect(facts.pending).toBe(0);
  });

  test('T015: 標記完成 is disabled and each unmet condition (submission, review, disputed) is its own visible reason; no pool reason (FR-008b(1)(2)(3))', async ({
    page,
  }) => {
    await openTask(page, 'T015');

    await expect(page.locator('#publishCompleteBtn')).toBeDisabled();
    const texts = await reasonTexts(page);
    expect(pick(texts, SUBMISSION.accept, SUBMISSION.reject)).toHaveLength(1);
    expect(pick(texts, REVIEW.accept, REVIEW.reject)).toHaveLength(1);
    const disputed = pick(texts, DISPUTED.accept);
    expect(disputed).toHaveLength(1);
    expect(disputed[0]).toMatch(digit(1));
    // The exception pool is empty for T015, so it must not be listed as a reason.
    expect(pick(texts, POOL.accept)).toHaveLength(0);
    for (const reason of texts) {
      await expect(page.locator('#publishActionRow li', { hasText: reason }).first()).toBeVisible();
    }
  });

  test('T015: the reasons are exposed to screen readers through aria-describedby on the disabled button (AC-3.9, SC-037)', async ({
    page,
  }) => {
    await openTask(page, 'T015');

    await expect(page.locator('#publishCompleteBtn')).toHaveAttribute('aria-describedby', /\S+/);
    const texts = await reasonTexts(page);
    expect(texts.length).toBeGreaterThanOrEqual(3);
    for (const reason of texts) {
      const escaped = reason.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
      await expect(page.locator('#publishCompleteBtn')).toHaveAccessibleDescription(new RegExp(escaped));
    }
  });

  test('T016: 標記完成 is disabled and review, disputed(3) and exception-pool(1) reasons are listed independently; no submission reason (FR-008b(2)(3)(4))', async ({
    page,
  }) => {
    await openTask(page, 'T016');

    await expect(page.locator('#publishCompleteBtn')).toBeDisabled();
    const texts = await reasonTexts(page);
    expect(pick(texts, REVIEW.accept, REVIEW.reject)).toHaveLength(1);
    const disputed = pick(texts, DISPUTED.accept);
    expect(disputed).toHaveLength(1);
    expect(disputed[0]).toMatch(digit(3));
    const pool = pick(texts, POOL.accept);
    expect(pool).toHaveLength(1);
    expect(pool[0]).toMatch(digit(1));
    // Submissions are 5/5, so the submission condition is met and must not be listed.
    expect(pick(texts, SUBMISSION.accept, SUBMISSION.reject)).toHaveLength(0);
    await expect(page.locator('#publishCompleteBtn')).toHaveAttribute('aria-describedby', /\S+/);
  });

  test('T015: calling window.publishComplete() directly keeps official_run_in_progress and persists nothing (FR-008b, AC-3.9)', async ({
    page,
  }) => {
    await openTask(page, 'T015');

    await page.evaluate(() => (window as unknown as { publishComplete: () => void }).publishComplete());

    await expectStillBlocked(page, 'T015');
  });

  test('T015: removing `disabled` and clicking 標記完成 still does not complete the task (FR-008b, AC-3.9)', async ({
    page,
  }) => {
    await openTask(page, 'T015');

    await page.evaluate(() => document.getElementById('publishCompleteBtn')!.removeAttribute('disabled'));
    await page.locator('#publishCompleteBtn').click();

    await expectStillBlocked(page, 'T015');
  });

  test('T016 with the exception pool cleared: still blocked by review and disputed(2); the pool reason is gone (FR-008b(2)(3)(4))', async ({
    page,
  }) => {
    const statuses = await resolveT016(page, { pool: 'adopt_reviewer' });
    // sanity: ofm-05 is finalized by the exception-pool value; ofm-03/04 stay disputed.
    expect(statuses.filter((s) => s === 'finalized')).toHaveLength(3);
    expect(statuses.filter((s) => s === 'disputed')).toHaveLength(2);

    await expect(page.locator('#publishCompleteBtn')).toBeDisabled();
    const texts = await reasonTexts(page);
    expect(pick(texts, POOL.accept)).toHaveLength(0);
    const disputed = pick(texts, DISPUTED.accept);
    expect(disputed).toHaveLength(1);
    expect(disputed[0]).toMatch(digit(2));
    expect(pick(texts, REVIEW.accept, REVIEW.reject)).toHaveLength(1);
  });

  test('T016 with the exception pool cleared: a direct publishComplete() call is still refused because units remain disputed (FR-008b(3))', async ({
    page,
  }) => {
    await resolveT016(page, { pool: 'adopt_reviewer' });

    await page.evaluate(() => (window as unknown as { publishComplete: () => void }).publishComplete());

    await expectStillBlocked(page, 'T016');
  });

  test('T016 with every dispute resolved: 標記完成 is enabled, lists no reason, and completes directly with no extra confirmation step (AC-3.9, AC-08)', async ({
    page,
  }) => {
    const statuses = await resolveT016(page, { pool: 'adopt_reviewer', arbitration: true });
    // sanity: all 5 units are finalized (2 seeded + 2 arbitrated + 1 closed by an exception-pool value), none disputed.
    expect(statuses).toEqual(['finalized', 'finalized', 'finalized', 'finalized', 'finalized']);

    await expect(page.locator('#publishCompleteBtn')).toBeEnabled();
    expect(await reasonTexts(page)).toHaveLength(0);

    await page.locator('#publishCompleteBtn').click();

    // Immediately completed: no modal, no second confirmation control.
    await expect(page.locator('#statusBadge')).toContainText(COMPLETED_BADGE);
    await expect(page.locator('.modal-overlay.show')).toHaveCount(0);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(await persistedStatus(page, 'T016')).toBe('completed');
  });

  test('T016 with ofm-05 closed by exclude_from_dataset and the rest resolved: the exclusion satisfies FR-008b(2) and the task can complete (FR-008b(2), issue #1120 section 1)', async ({
    page,
  }) => {
    /* CONTRACT AMBIGUITY (reported to lead): 015's getReviewUnitStatus() keeps a unit with an
     * exclude_from_dataset marker as `disputed` (annotation-workspace.data.js ~2295-2299,
     * FR-063), while FR-008b(2) says a unit closed by exclusion is satisfied and issue #1120
     * forbids turning a legitimate disposition into "can never complete". This case pins the
     * issue's intent: a pool-resolved exclusion must NOT keep blocking completion. Green must
     * therefore not read FR-008b(3) off the raw `disputed` status for pool-resolved units. */
    const statuses = await resolveT016(page, { pool: 'exclude', arbitration: true });
    expect(statuses[4]).toBe('disputed'); // fact: 015 still derives the excluded unit as disputed
    const pending = await page.evaluate(
      () => (window as any).LabelSuiteAnnotationWorkspaceData.listReviewPoolItems('T016', 'official_run').pendingExceptions.length,
    );
    expect(pending).toBe(0);

    await expect(page.locator('#publishCompleteBtn')).toBeEnabled();
    expect(await reasonTexts(page)).toHaveLength(0);
    await page.locator('#publishCompleteBtn').click();
    await expect(page.locator('#statusBadge')).toContainText(COMPLETED_BADGE);
  });

  test('missing data is not completion: T016 with no review state at all (every unit status null) stays blocked even though submissions read 5/5 (FR-008b(2), issue #1120 section 2)', async ({
    page,
  }) => {
    // Pre-set the page's own seed marker so no review unit / arbitration record is created.
    await page.addInitScript((key) => window.localStorage.setItem(key, new Date().toISOString()), DEMO_SEED_KEY);
    await openTask(page, 'T016');
    // sanity: units are enumerated (5 dataset records) but none has an established status.
    const units = await unitStatuses(page, 'T016');
    expect(units).toHaveLength(5);
    expect(units.every((status) => status === null)).toBe(true);

    await expect(page.locator('#publishCompleteBtn')).toBeDisabled();
    expect((await reasonTexts(page)).length).toBeGreaterThanOrEqual(1);

    await page.evaluate(() => (window as unknown as { publishComplete: () => void }).publishComplete());
    await expectStillBlocked(page, 'T016');
  });

  test('missing data is not completion: T001 forced to official_run_in_progress has no review state and cannot be completed (FR-008b)', async ({
    page,
  }) => {
    await page.goto(`${TASK_DETAIL_URL}?task_id=T001&status=official_run_in_progress`);
    await expect(page.locator('#statusBadge')).toContainText(IN_PROGRESS_BADGE);
    // sanity: no unit of T001 has an established review status.
    const units = await unitStatuses(page, 'T001');
    expect(units.length).toBeGreaterThan(0);
    expect(units.every((status) => status === null)).toBe(true);

    await expect(page.locator('#publishCompleteBtn')).toBeDisabled();
    expect((await reasonTexts(page)).length).toBeGreaterThanOrEqual(1);

    await page.evaluate(() => (window as unknown as { publishComplete: () => void }).publishComplete());
    await expect(page.locator('#statusBadge')).toContainText(IN_PROGRESS_BADGE);
  });
});
