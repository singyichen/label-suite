/*
 * Traceability: openspec/changes/1120-task-lifecycle-alignment/specs/task-management/014-task-detail/spec.md
 *   FR-023 (leader adjudication when arbiter_ids is empty) + its three scenarios,
 *   FR-010t revision + scenario "空仲裁者名冊的發布警示指向負責人裁定通道",
 *   design.md D1 (FR-023 row). Issue #1120 G4b (tasks.md 4.2).
 *
 * Green contract this Red pins (selectors and function names are the ONLY assumptions):
 *   - Section  #leaderAdjudicationSection, in the annotation-progress panel of task-detail.html,
 *     rendered ONLY for project_leader AND an empty task arbiter roster (arbiterIds: []).
 *     Absent or hidden otherwise.
 *   - Rows     [data-leader-adjudication-item]: one per dispute item of the selected run type that
 *     is awaiting arbitration (= LabelSuiteAnnotationWorkspaceData.listReviewPoolItems().awaitingArbitration).
 *     Inside a row: [data-choice="adopt_a|adopt_b|reject"] (clickable controls),
 *     [data-leader-adjudication-reason] (textarea), [data-leader-adjudication-confirm] (button).
 *     Confirming adopt_a / adopt_b / reject-with-reason writes the vote and re-renders; a
 *     reject with an empty reason must not write (button disabled or a validation message).
 *   - Write path  LabelSuiteAnnotationWorkspaceData.submitLeaderAdjudication(taskId, runType,
 *     sampleId, decisions) with decisions = [{ itemId, choice, reason }] (A/B values derived
 *     internally). Returns falsy or { ok: false } and writes nothing when the roster is non-empty,
 *     the unit is not disputed, the choice is not in ARBITRATION_OUTCOMES, or reject has no
 *     reason. A stored vote carries arbiter_id 'mandy@labelsuite.io' and source 'leader'.
 *   - Source label  「負責人裁定（無指定仲裁者）」 appears in the annotation-results history line,
 *     the final exception pool row (fep-arbiter cell) for a leader reject, and the workspace
 *     exception-pool origin line for a leader reject. The JSON export carries
 *     finalization_source: 'leader_adjudication' on the record of an adjudicated item (the exact
 *     nesting level is not pinned: the export is deep-scanned for the key).
 *   - #publishArbiterWarning no longer says 無法結案 (zh) / "block task completion" (en) and
 *     points at 負責人 + 裁定.
 *
 * Fixtures: the empty roster is forced by appending one statement to the served
 * task-detail.data.js (same effect as precedent tests/annotation/issue-868-arbitration-reserve
 * but it survives page navigations/reloads, and both task-detail and the workspace read it).
 * T014 dry_run seed: 15 review units = 7 finalized / 3 disputed / 5 pending, 3 awaiting arbitration.
 *
 * Note on FR-062 (blind isolation): a dispute unit is by derivation one whose reviewer HAS
 * submitted, so "unit whose reviewer has not submitted" cannot appear as a dispute row. The cheap
 * assertions are: the section lists exactly the awaitingArbitration set, and submitLeaderAdjudication
 * refuses a unit whose reviewer has not submitted (pending).
 */
import { test, expect, type Page } from '@playwright/test';
import { openSettingsSection } from './_task-detail-settings-helpers';
import { promises as fs } from 'node:fs';
import { buildWorkspaceUrl, skipGuidelineModal } from '../annotation/_workspace-helpers';
import {
  TASK_DETAIL_URL,
  WAITING_BADGE,
  IN_PROGRESS_BADGE,
  applyDryRunState,
  writeFullySubmittedFlag,
  reasonTexts,
  pick,
  DISPUTED,
  POOL,
  persistedStatus,
} from './_dry-run-completion-helpers';

const TASK = 'T014';
const SAMPLES = 5;
const LEADER_ID = 'mandy@labelsuite.io';
const LEADER_LABEL = '負責人裁定（無指定仲裁者）';
const LEADER_LABEL_EN = 'Leader adjudication (no arbiter designated)';
const SECTION = '#leaderAdjudicationSection';
const ROW = '[data-leader-adjudication-item]';

/** Make the served profile data declare an empty arbiter roster for `taskId`. */
async function forceEmptyRoster(page: Page, taskId = TASK) {
  await page.route('**/task-management/task-detail.data.js*', async (route) => {
    const response = await route.fetch();
    const body = await response.text();
    await route.fulfill({
      response,
      body: `${body}\n;window.LabelSuiteTaskDetailData.profiles['${taskId}'].arbiterIds = [];\n`,
    });
  });
}

async function openProgressTab(page: Page, taskId = TASK) {
  await page.goto(`${TASK_DETAIL_URL}?task_id=${taskId}`);
  await expect(page.locator('#statusBadge')).toBeAttached();
  await page.locator('#tabAnnotationProgress').click();
  await expect(page.locator('#annotationProgressPanel')).not.toHaveClass(/hidden/);
}

/** Reviews done (so only disputes remain), progress flag written, reload, then open the progress tab. */
async function openReviewedWithEmptyRoster(page: Page) {
  await forceEmptyRoster(page);
  await page.goto(`${TASK_DETAIL_URL}?task_id=${TASK}`);
  await expect(page.locator('#statusBadge')).toBeAttached();
  expect(
    await page.evaluate((t) => (window as any).LabelSuiteAnnotationWorkspaceData.taskArbiterRoster(t), TASK),
    'precondition: the served profile declares an empty arbiter roster',
  ).toEqual([]);
  const facts = await applyDryRunState(page, TASK, { review: true });
  expect(facts.byStatus.disputed, 'precondition: three disputed units').toBe(3);
  expect(facts.awaitingArbitration, 'precondition: three dispute items').toBe(3);
  await writeFullySubmittedFlag(page, TASK, SAMPLES);
  await page.reload();
  await expect(page.locator('#statusBadge')).toBeAttached();
  await page.locator('#tabAnnotationProgress').click();
  await expect(page.locator('#annotationProgressPanel')).not.toHaveClass(/hidden/);
}

type Choice = 'adopt_a' | 'adopt_b' | 'reject';

/** Adjudicate the first listed row through the UI; returns after the row left the list. */
async function adjudicateFirstRow(page: Page, choice: Choice, reason: string) {
  await expect(page.locator(SECTION), `${SECTION} must be rendered for an empty roster`).toBeVisible();
  const rows = page.locator(`${SECTION} ${ROW}`);
  const before = await rows.count();
  const row = rows.first();
  await row.locator(`[data-choice="${choice}"]`).click();
  await row.locator('[data-leader-adjudication-reason]').fill(reason);
  await row.locator('[data-leader-adjudication-confirm]').click();
  await expect(page.locator(`${SECTION} ${ROW}`)).toHaveCount(before - 1);
}

async function adjudicateAll(page: Page, choices: Choice[]) {
  for (const [index, choice] of choices.entries()) {
    await adjudicateFirstRow(page, choice, `QA leader reason ${index + 1}`);
  }
}

async function unitStatuses(page: Page): Promise<Record<string, number>> {
  return page.evaluate((task) => {
    const ws = (window as any).LabelSuiteAnnotationWorkspaceData;
    const by: Record<string, number> = {};
    ws.listReviewUnits(task, 'dry_run').forEach((u: any) => {
      by[String(u.status)] = (by[String(u.status)] || 0) + 1;
    });
    return by;
  }, TASK);
}

/** Every stored arbitration vote of the task's dry_run units. */
async function allVotes(page: Page): Promise<any[]> {
  return page.evaluate((task) => {
    const ws = (window as any).LabelSuiteAnnotationWorkspaceData;
    const votes: any[] = [];
    ws.listReviewUnits(task, 'dry_run').forEach((u: any) => {
      const state = ws.getArbitrationState(task, 'dry_run', u.sampleId, { annotatorId: u.annotatorId });
      Object.keys(state).forEach((key) => (state[key].votes || []).forEach((v: any) => votes.push({ key, ...v })));
    });
    return votes;
  }, TASK);
}

async function expandAllResultRows(page: Page) {
  await page.locator('#tabAnnotationResults').click();
  await expect(page.locator('#arTableSection')).toBeVisible({ timeout: 15000 });
  const count = await page.locator('#arResultTableBody tr.ar-summary-row').count();
  for (let i = 0; i < count; i += 1) {
    const btn = page.locator('#arResultTableBody tr.ar-summary-row').nth(i).locator('.ar-expand-btn');
    if ((await btn.getAttribute('aria-expanded')) !== 'true') await btn.click();
  }
}

function collectValues(node: unknown, key: string, out: unknown[]) {
  if (Array.isArray(node)) node.forEach((n) => collectValues(n, key, out));
  else if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      if (k === key) out.push(v);
      collectValues(v, key, out);
    }
  }
}

test.describe('Leader adjudication when arbiter_ids is empty (FR-023)', () => {
  test('empty roster: the leader adjudicates every open dispute through the UI, units finalize, and the trial gate stops listing arbitration (FR-023 scenario 1)', async ({
    page,
  }) => {
    await openReviewedWithEmptyRoster(page);

    const section = page.locator(SECTION);
    await expect(section).toBeVisible();
    // Rows = the awaiting-arbitration set (FR-062: nothing else is listed).
    await expect(section.locator(ROW)).toHaveCount(3);

    await adjudicateAll(page, ['adopt_a', 'adopt_b', 'adopt_a']);

    expect(await unitStatuses(page)).toEqual({ finalized: 15 });
    const votes = await allVotes(page);
    const leaderVotes = votes.filter((v) => v.source === 'leader');
    expect(leaderVotes).toHaveLength(3);
    for (const v of leaderVotes) {
      expect(v.arbiter_id).toBe(LEADER_ID);
      expect(v.reason).toMatch(/^QA leader reason \d$/);
      expect(v.voted_at).toBeTruthy();
    }

    // The gate (G4a) no longer lists any arbitration blocker and the task advances.
    await page.reload();
    await expect(page.locator('#statusBadge')).toContainText(WAITING_BADGE);
    expect(await persistedStatus(page, TASK)).toBe('waiting_iaa_confirmation');
  });

  test('before adjudication the trial gate lists the disputed units; the leader entry point is the only way out (FR-023 scenario 1, SC-051)', async ({
    page,
  }) => {
    await openReviewedWithEmptyRoster(page);
    await page.locator('#tabOverview').click();
    await expect(page.locator('#statusBadge')).toContainText(IN_PROGRESS_BADGE);
    expect(pick(await reasonTexts(page), DISPUTED.accept, DISPUTED.reject)).toHaveLength(1);
    await page.locator('#tabAnnotationProgress').click();
    await expect(page.locator(`${SECTION} ${ROW}`)).toHaveCount(3);
  });

  test('a leader adjudication is labelled 負責人裁定（無指定仲裁者） in the annotation-results history, not as a plain arbiter (FR-023(3))', async ({
    page,
  }) => {
    await openReviewedWithEmptyRoster(page);
    await adjudicateAll(page, ['adopt_a', 'adopt_b', 'adopt_a']);

    await expandAllResultRows(page);
    // The T014 seed already carries one finalized reviewer_chen arbitration
    // (dry-04-dispute-resolved); it must stay a plain arbiter line.
    const allLines = page.locator('.ar-history-arbitration');
    const leaderLines = allLines.filter({ hasText: LEADER_LABEL });
    await expect(leaderLines).toHaveCount(3);
    const seededLines = allLines.filter({ hasNotText: LEADER_LABEL });
    await expect(seededLines).toHaveCount(1);
    await expect(seededLines.first()).not.toContainText(LEADER_LABEL_EN);
  });

  test('the JSON export marks a leader-adjudicated item with finalization_source leader_adjudication (FR-023(3))', async ({
    page,
  }) => {
    await openReviewedWithEmptyRoster(page);
    await adjudicateAll(page, ['adopt_a', 'adopt_b', 'adopt_a']);

    await page.locator('#tabAnnotationResults').click();
    await expect(page.locator('#arTableSection')).toBeVisible({ timeout: 15000 });
    const downloadPromise = page.waitForEvent('download');
    await page.locator('#arExportJsonBtn').click();
    const download = await downloadPromise;
    const path = await download.path();
    expect(path).not.toBeNull();
    const payload = JSON.parse(await fs.readFile(path as string, 'utf8'));

    const sources: unknown[] = [];
    collectValues(payload, 'finalization_source', sources);
    expect(sources.filter((s) => s === 'leader_adjudication').length).toBeGreaterThanOrEqual(3);
  });

  test('roster unchanged (reviewer_chen): no leader entry point, and a direct submitLeaderAdjudication call fails and leaves the unit disputed (FR-023 scenario 2)', async ({
    page,
  }) => {
    await openProgressTab(page);
    await expect(page.locator(SECTION)).toBeHidden();

    const outcome = await page.evaluate((task) => {
      const ws = (window as any).LabelSuiteAnnotationWorkspaceData;
      const hasFn = typeof ws.submitLeaderAdjudication === 'function';
      const unit = ws.listReviewUnits(task, 'dry_run').filter((u: any) => u.status === 'disputed')[0];
      const identity = { annotatorId: unit.annotatorId };
      const item = ws.getDisputeItems(task, 'dry_run', unit.sampleId, identity, ['single_label'])[0];
      const countVotes = () => {
        const state = ws.getArbitrationState(task, 'dry_run', unit.sampleId, identity);
        return Object.keys(state).reduce((n, k) => n + (state[k].votes || []).length, 0);
      };
      const rosterSize = ws.taskArbiterRoster(task).length;
      const before = countVotes();
      // Well-formed call on a genuinely disputed unit: only the non-empty roster can refuse it.
      const result = hasFn
        ? ws.submitLeaderAdjudication(task, 'dry_run', unit.sampleId, [
            { annotatorId: unit.annotatorId, itemId: `${item.outKey}::${item.key}`, choice: 'adopt_a', reason: 'QA must be refused' },
          ])
        : 'missing';
      const votes = countVotes() - before;
      const after = ws.listReviewUnits(task, 'dry_run').filter((u: any) => u.sampleId === unit.sampleId && u.annotatorId === unit.annotatorId)[0];
      return { hasFn, rosterSize, refused: !result || result.ok === false, votes, status: after.status };
    }, TASK);

    expect(outcome.rosterSize, 'precondition: the roster is not empty').toBeGreaterThan(0);
    expect(outcome.hasFn, 'submitLeaderAdjudication must be exported on LabelSuiteAnnotationWorkspaceData').toBe(true);
    expect(outcome.refused).toBe(true);
    expect(outcome.votes).toBe(0);
    expect(outcome.status).toBe('disputed');
  });

  test('submitLeaderAdjudication guards: unit not disputed, reviewer not submitted, unknown choice and reject without reason all write nothing (FR-023(1)(2)(3), FR-062)', async ({
    page,
  }) => {
    await forceEmptyRoster(page);
    await openProgressTab(page);

    const outcome = await page.evaluate((task) => {
      const ws = (window as any).LabelSuiteAnnotationWorkspaceData;
      const hasFn = typeof ws.submitLeaderAdjudication === 'function';
      if (!hasFn) return { hasFn };
      const units = ws.listReviewUnits(task, 'dry_run');
      const disputed = units.filter((u: any) => u.status === 'disputed')[0];
      const pending = units.filter((u: any) => u.status === 'pending' || u.status === null)[0];
      const itemsOf = (u: any) => ws.getDisputeItems(task, 'dry_run', u.sampleId, { annotatorId: u.annotatorId }, ['single_label']);
      // Prefer a finalized unit that still has dispute items (the seeded resolved dispute).
      const finalizedUnits = units.filter((u: any) => u.status === 'finalized');
      const finalized = finalizedUnits.filter((u: any) => itemsOf(u).length)[0] || finalizedUnits[0];
      const itemIdOf = (u: any) => {
        const i = itemsOf(u)[0];
        return i ? `${i.outKey}::${i.key}` : 'single_label::single_label';
      };
      const voteCount = () =>
        units.reduce((n: number, u: any) => {
          const s = ws.getArbitrationState(task, 'dry_run', u.sampleId, { annotatorId: u.annotatorId });
          return n + Object.keys(s).reduce((m, k) => m + (s[k].votes || []).length, 0);
        }, 0);
      const refused = (r: any) => !r || r.ok === false;
      const call = (u: any, decision: any) =>
        ws.submitLeaderAdjudication(task, 'dry_run', u.sampleId, [
          { annotatorId: u.annotatorId, itemId: itemIdOf(u), ...decision },
        ]);
      const rosterSize = ws.taskArbiterRoster(task).length;
      const baseline = voteCount();
      const results = {
        finalizedUnit: refused(call(finalized, { choice: 'adopt_a', reason: 'x' })),
        pendingUnit: refused(call(pending, { choice: 'adopt_a', reason: 'x' })),
        unknownChoice: refused(call(disputed, { choice: 'custom_answer', reason: 'x' })),
        rejectNoReason: refused(call(disputed, { choice: 'reject', reason: '' })),
        rejectBlankReason: refused(call(disputed, { choice: 'reject', reason: '   ' })),
      };
      return { hasFn, rosterSize, results, baseline, votes: voteCount() };
    }, TASK);

    expect(outcome.hasFn, 'submitLeaderAdjudication must be exported on LabelSuiteAnnotationWorkspaceData').toBe(true);
    expect(outcome.rosterSize, 'precondition: the roster is empty, so only the unit/choice/reason guards can refuse').toBe(0);
    expect(outcome.results).toEqual({
      finalizedUnit: true,
      pendingUnit: true,
      unknownChoice: true,
      rejectNoReason: true,
      rejectBlankReason: true,
    });
    // Refused calls write nothing: the seeded arbitration vote is untouched.
    expect(outcome.votes).toBe(outcome.baseline);
  });

  test('positive control: with an empty roster a well-formed direct call on a disputed unit succeeds and writes one leader vote (FR-023(1))', async ({
    page,
  }) => {
    await forceEmptyRoster(page);
    await openProgressTab(page);

    const outcome = await page.evaluate((task) => {
      const ws = (window as any).LabelSuiteAnnotationWorkspaceData;
      const unit = ws.listReviewUnits(task, 'dry_run').filter((u: any) => u.status === 'disputed')[0];
      const identity = { annotatorId: unit.annotatorId };
      const item = ws.getDisputeItems(task, 'dry_run', unit.sampleId, identity, ['single_label'])[0];
      const leaderVotes = () => {
        const state = ws.getArbitrationState(task, 'dry_run', unit.sampleId, identity);
        return Object.keys(state).reduce(
          (n, k) => n + (state[k].votes || []).filter((v: any) => v.source === 'leader').length, 0);
      };
      const before = leaderVotes();
      const result = ws.submitLeaderAdjudication(task, 'dry_run', unit.sampleId, [
        { annotatorId: unit.annotatorId, itemId: `${item.outKey}::${item.key}`, choice: 'adopt_a', reason: 'QA positive control' },
      ]);
      return { result, written: leaderVotes() - before };
    }, TASK);

    expect(outcome.result).toMatchObject({ ok: true });
    expect(outcome.written).toBe(1);
  });

  test('reject without a reason does not submit: the item stays awaiting arbitration and no vote is written (FR-023(3))', async ({
    page,
  }) => {
    await openReviewedWithEmptyRoster(page);

    await expect(page.locator(SECTION)).toBeVisible();
    const row = page.locator(`${SECTION} ${ROW}`).first();
    await row.locator('[data-choice="reject"]').click();
    const confirm = row.locator('[data-leader-adjudication-confirm]');
    if (await confirm.isEnabled()) await confirm.click();

    await expect(page.locator(`${SECTION} ${ROW}`)).toHaveCount(3);
    expect((await allVotes(page)).filter((v) => v.source === 'leader')).toHaveLength(0);
    expect(await unitStatuses(page)).toMatchObject({ disputed: 3 });
  });

  test('empty roster, leader picks 兩者皆非: the item lands in the final exception pool with the leader label, the unit stays disputed, the gate still blocks and dry_run offers no custom_answer (FR-023 scenario 3)', async ({
    page,
  }) => {
    await openReviewedWithEmptyRoster(page);

    await adjudicateFirstRow(page, 'reject', 'QA leader: neither value is supported');
    await adjudicateAll(page, ['adopt_a', 'adopt_b']);
    await expect(page.locator(`${SECTION} ${ROW}`)).toHaveCount(0);

    // Unit stays disputed: reject never finalizes (FR-018 / 015 FR-095).
    expect(await unitStatuses(page)).toEqual({ finalized: 14, disputed: 1 });

    const pool = page.locator('#finalExceptionPoolSection [data-testid="final-exception-pool-row"]');
    await expect(pool).toHaveCount(1);
    await expect(pool.locator('[data-testid="fep-arbiter"]')).toContainText(LEADER_LABEL);
    await expect(pool.locator('[data-testid="fep-arbiter"]')).toContainText('QA leader: neither value is supported');

    // The trial gate still blocks: only the exception-pool reason remains.
    await page.reload();
    await expect(page.locator('#statusBadge')).toContainText(IN_PROGRESS_BADGE);
    await page.locator('#tabOverview').click();
    const texts = await reasonTexts(page);
    expect(pick(texts, POOL.accept)).toHaveLength(1);
    expect(pick(texts, DISPUTED.accept, DISPUTED.reject)).toHaveLength(0);

    // The closure screen: leader origin, and no custom_answer in dry_run.
    await page.locator('#tabAnnotationProgress').click();
    await page.locator('[data-testid="fep-resolve-link"]').first().click();
    const item = page.getByTestId('ws-exception-pool-item').first();
    await expect(item).toBeVisible();
    const origin = item.getByTestId('ws-exception-pool-origin');
    await expect(origin).toContainText(LEADER_LABEL);
    await expect(origin).not.toContainText('仲裁者：');
    await expect(item.getByTestId('ws-exception-pool-action-custom_answer')).toHaveCount(0);
    await expect(item.getByTestId('ws-exception-pool-action-exclude_from_dataset')).toHaveCount(1);
  });
});

test.describe('Empty arbiter roster publish warning (FR-010t revision)', () => {
  async function openPublishWarning(page: Page, language: 'zh' | 'en') {
    // issue #1146: T001 seeds arbiterIds explicitly, so declare it empty here.
    await forceEmptyRoster(page, 'T001');
    await page.goto(`${TASK_DETAIL_URL}?task_id=T001&status=draft`);
    await page.locator('#workLogPanel').waitFor({ state: 'attached', timeout: 15000 });
    if (language === 'en') await page.getByTestId('lang-toggle').click();
    await page.locator('#tabOverview').click();
    await expect(page.locator('#overviewPanel')).not.toHaveClass(/hidden/);
    await page.locator('#publishDryRunBtn').click();
    await expect(page.locator('#trialRoundTimeline .round-timeline-item')).toHaveCount(1);
    await expect(page.locator('#publishArbiterWarning')).toBeVisible();
  }

  test('zh: the warning no longer says 無法結案 and points the disputes at the project leader ruling (FR-010t scenario)', async ({
    page,
  }) => {
    await openPublishWarning(page, 'zh');
    const warning = page.locator('#publishArbiterWarning');
    await expect(warning).not.toContainText('無法結案');
    await expect(warning).not.toContainText('無人可仲裁');
    await expect(warning).toContainText('負責人');
    await expect(warning).toContainText('裁定');
  });

  test('en: the warning no longer says it blocks task completion and names the project leader (FR-010t scenario)', async ({
    page,
  }) => {
    await openPublishWarning(page, 'en');
    const warning = page.locator('#publishArbiterWarning');
    await expect(warning).not.toContainText(/block task completion/i);
    await expect(warning).toContainText(/project leader|leader/i);
    await expect(warning).toContainText(/adjudicat|rule|decide/i);
  });
});

test.describe('Leader label wording is available in English too (FR-023(3))', () => {
  test('the English leader source label is shown in the final exception pool when the page language is en', async ({
    page,
  }) => {
    await openReviewedWithEmptyRoster(page);
    await adjudicateFirstRow(page, 'reject', 'QA leader: neither value is supported');
    await page.getByTestId('lang-toggle').click();
    await expect(
      page.locator('#finalExceptionPoolSection [data-testid="fep-arbiter"]').first(),
    ).toContainText(LEADER_LABEL_EN);
  });
});

/* ---- Review findings M2 / M3 / M1 / L1 (issue #1120 G4b) ---------------------- */

type PoolItem = { sampleId: string; annotatorId: string; outKey: string; key: string };

/** First open dispute item (awaiting arbitration) of the task's dry_run. */
async function firstOpenItem(page: Page): Promise<PoolItem> {
  return page.evaluate((task) => {
    const ws = (window as any).LabelSuiteAnnotationWorkspaceData;
    const item = ws.listReviewPoolItems(task, 'dry_run').awaitingArbitration[0];
    return { sampleId: item.sampleId, annotatorId: item.annotatorId, outKey: item.outKey, key: item.key };
  }, TASK);
}

/** Vote count of one item plus the pool queues, as a comparable snapshot. */
async function itemSnapshot(page: Page, item: PoolItem) {
  return page.evaluate(
    ({ task, it }) => {
      const ws = (window as any).LabelSuiteAnnotationWorkspaceData;
      const state = ws.getArbitrationState(task, 'dry_run', it.sampleId, { annotatorId: it.annotatorId });
      const stored = state[`${it.outKey}::${it.key}`] || { votes: [] };
      const pools = ws.listReviewPoolItems(task, 'dry_run');
      const has = (list: any[]) => list.some((p) => p.sampleId === it.sampleId && p.outKey === it.outKey && p.key === it.key);
      return {
        votes: (stored.votes || []).length,
        finalizedBy: stored.finalized_by || null,
        inAwaiting: has(pools.awaitingArbitration),
        inPending: has(pools.pendingExceptions),
        status: ws.listReviewUnits(task, 'dry_run').filter((u: any) => u.sampleId === it.sampleId && u.annotatorId === it.annotatorId)[0].status,
      };
    },
    { task: TASK, it: item },
  );
}

async function directAdjudicate(page: Page, item: PoolItem, choice: Choice, reason: string) {
  return page.evaluate(
    ({ task, it, choice, reason }) =>
      (window as any).LabelSuiteAnnotationWorkspaceData.submitLeaderAdjudication(task, 'dry_run', it.sampleId, [
        { annotatorId: it.annotatorId, itemId: `${it.outKey}::${it.key}`, choice, reason },
      ]),
    { task: TASK, it: item, choice, reason },
  );
}

test.describe('Leader adjudication refuses items already in the final exception pool (review M2)', () => {
  test('M2a: an item with an unresolved leader reject vote is refused and nothing is written (FR-023, FR-018)', async ({ page }) => {
    await forceEmptyRoster(page);
    await openProgressTab(page);
    const item = await firstOpenItem(page);

    expect(await directAdjudicate(page, item, 'reject', 'QA first ruling: neither')).toMatchObject({ ok: true });
    const baseline = await itemSnapshot(page, item);
    expect(baseline, 'precondition: item sits in the final exception pool').toMatchObject({ inPending: true, inAwaiting: false });

    const second = await directAdjudicate(page, item, 'adopt_a', 'QA second ruling');
    expect(second?.ok, 'a pooled item must not be adjudicated again').not.toBe(true);
    expect(await itemSnapshot(page, item)).toEqual(baseline);
  });

  test('M2a (arbiter origin): an item whose unresolved reject vote came from an arbiter is refused too', async ({ page }) => {
    await forceEmptyRoster(page);
    await openProgressTab(page);
    const item = await firstOpenItem(page);
    await page.evaluate(
      ({ task, it }) => {
        (window as any).LabelSuiteAnnotationWorkspaceData.submitArbitration(
          task, 'dry_run', it.sampleId, { annotatorId: it.annotatorId, reviewerId: 'reviewer_chen' },
          [{ itemId: `${it.outKey}::${it.key}`, choice: 'reject', value: null, reason: 'QA arbiter: neither' }],
        );
      },
      { task: TASK, it: item },
    );
    const baseline = await itemSnapshot(page, item);
    expect(baseline, 'precondition: item sits in the final exception pool').toMatchObject({ inPending: true, inAwaiting: false });

    const result = await directAdjudicate(page, item, 'adopt_b', 'QA leader override attempt');
    expect(result?.ok, 'a pooled item must not be adjudicated').not.toBe(true);
    expect(await itemSnapshot(page, item)).toEqual(baseline);
  });

  test('M2b: an item already resolved by an exception-pool record is refused and nothing is written (FR-023)', async ({ page }) => {
    await forceEmptyRoster(page);
    await openProgressTab(page);
    const item = await firstOpenItem(page);
    await page.evaluate(
      ({ task, it }) => {
        (window as any).LabelSuiteAnnotationWorkspaceData.resolveExceptionPoolItem(
          task, 'dry_run', it.sampleId, { annotatorId: it.annotatorId }, it.outKey, 'exclude_from_dataset', null, 'QA excluded',
        );
      },
      { task: TASK, it: item },
    );
    const baseline = await itemSnapshot(page, item);
    expect(baseline, 'precondition: resolved by the pool record, in neither queue, unit still disputed').toMatchObject({
      inAwaiting: false, inPending: false, status: 'disputed', votes: 0,
    });

    const result = await directAdjudicate(page, item, 'adopt_a', 'QA late ruling');
    expect(result?.ok, 'a pool-resolved item must not be adjudicated').not.toBe(true);
    expect(await itemSnapshot(page, item)).toEqual(baseline);
  });
});

test.describe('Workspace history labels a leader adjudication (review M3)', () => {
  test('M3: the history card shows 負責人裁定（無指定仲裁者） and never the raw "leader adjudication:" marker (FR-023(3))', async ({ page }) => {
    await skipGuidelineModal(page);
    await forceEmptyRoster(page);
    await openProgressTab(page);
    const item = await firstOpenItem(page);
    expect(await directAdjudicate(page, item, 'adopt_a', 'QA history ruling')).toMatchObject({ ok: true });
    const reviewerId = await page.evaluate(
      ({ task, it }) => {
        const ws = (window as any).LabelSuiteAnnotationWorkspaceData;
        return ws.listReviewUnits(task, 'dry_run').filter((u: any) => u.sampleId === it.sampleId)[0].reviewerId;
      },
      { task: TASK, it: item },
    );

    await page.goto(
      buildWorkspaceUrl({
        task_id: TASK, sample_id: item.sampleId, role: 'reviewer', run_type: 'dry_run',
        annotator_id: item.annotatorId, ...(reviewerId ? { reviewer_id: reviewerId } : {}),
      }),
    );
    await page.getByTestId('ws-guideline-tab-history').click();
    const history = page.locator('#wsHistoryContainer');
    await expect(history).toContainText(LEADER_LABEL);
    await expect(history).not.toContainText('leader adjudication:');
  });
});

test.describe('Review-settings save keeps both roster sources in sync (review M1)', () => {
  const OPTIONS = '#arbiterOptionList .arbiter-option';

  async function openEdit(page: Page, taskId = 'T013') {
    await page.goto(`${TASK_DETAIL_URL}?task_id=${taskId}`);
    await expect(page.locator('#statusBadge')).toBeAttached();
    await openSettingsSection(page, 'review');
    await page.locator('#reviewEditBtn').click();
    await expect(page.locator('#reviewEditForm')).not.toHaveClass(/hidden/);
  }
  const roster = (page: Page, taskId = 'T013') =>
    page.evaluate(
      (id) => (window as any).LabelSuiteAnnotationWorkspaceData.taskArbiterRoster(id),
      taskId,
    );

  test('M1: saving with arbiter X selected makes taskArbiterRoster return [X]', async ({ page }) => {
    await openEdit(page);
    // issue #1146: T013 seeds reviewer_chen explicitly; clear it so X is the only arbiter.
    await page.locator(`${OPTIONS} input[value="reviewer_chen"]`).uncheck();
    const option = page.locator(OPTIONS).filter({ hasNot: page.locator('input[value="reviewer_chen"]') }).first();
    const chosen = await option.locator('input').getAttribute('value');
    expect(chosen, 'precondition: a non-fallback arbiter option exists').toBeTruthy();
    await option.locator('input').check();
    await page.locator('#reviewSaveBtn').click();
    await expect(page.locator('#reviewEditForm')).toHaveClass(/hidden/);

    expect(await roster(page)).toEqual([chosen]);
  });

  test('M1: saving with no arbiter selected makes taskArbiterRoster return [] (no demo fallback)', async ({ page }) => {
    // T014 is not a draft (review editing is disabled), and T013 is a
    // draft profile seeding only reviewer_chen, so first make a real selection, save, then reopen and clear it.
    await openEdit(page);
    await page.locator(OPTIONS).first().locator('input').check();
    await page.locator('#reviewSaveBtn').click();
    await expect(page.locator('#reviewEditForm')).toHaveClass(/hidden/);
    await openSettingsSection(page, 'review');
    await page.locator('#reviewEditBtn').click();
    await expect(page.locator('#reviewEditForm')).not.toHaveClass(/hidden/);
    const boxes = page.locator(`${OPTIONS} input`);
    let checkedBefore = 0;
    for (let i = 0; i < (await boxes.count()); i += 1) {
      if (await boxes.nth(i).isChecked()) checkedBefore += 1;
    }
    expect(checkedBefore, 'precondition: at least one arbiter box is checked').toBeGreaterThan(0);
    for (let i = 0; i < (await boxes.count()); i += 1) await boxes.nth(i).uncheck();
    await page.locator('#reviewSaveBtn').click();
    await expect(page.locator('#reviewEditForm')).toHaveClass(/hidden/);
    await expect(page.locator('#valueArbiterIdsControl')).toHaveText('未指定仲裁者');

    expect(await roster(page)).toEqual([]);
  });

  test('M1 (legacy): a reviewer-only save keeps the explicitly seeded arbiter roster untouched (issue-761 AC-1.6, issue #1146)', async ({ page }) => {
    // issue #1146: T001 now seeds arbiterIds explicitly; there is no demo
    // fallback, so a reviewer-only save must neither add nor drop arbiters.
    await openEdit(page, 'T001');
    const rosterBefore = await roster(page, 'T001');
    expect(rosterBefore, 'precondition: T001 seeds reviewer_chen as its arbiter').toEqual(['reviewer_chen']);

    const option = page
      .locator('#reviewerOptionList .reviewer-option')
      .filter({ hasNot: page.locator('input[value="reviewer_chen"]') })
      .first();
    await option.locator('input').uncheck();
    await page.locator('#reviewSaveBtn').click();
    await expect(page.locator('#reviewEditForm')).toHaveClass(/hidden/);

    const profileArbiterIds = await page.evaluate(
      () => (window as any).LabelSuiteTaskDetailData.profiles.T001.arbiterIds,
    );
    expect(profileArbiterIds).toEqual(['reviewer_chen']);
    expect(await roster(page, 'T001')).toEqual(rosterBefore);
  });
});

test.describe('Leader adjudication rows follow the selected run type (review L1)', () => {
  test('L1: rows carry data-run-type of the selected run; switching to 正式標記 re-renders them away and back restores them', async ({ page }) => {
    // T014 seed: three awaiting-arbitration items in dry_run (pill R1), none in official_run.
    await forceEmptyRoster(page);
    await openProgressTab(page);
    const rows = page.locator(`${SECTION} ${ROW}`);
    await expect(rows).toHaveCount(3);
    for (let i = 0; i < 3; i += 1) await expect(rows.nth(i)).toHaveAttribute('data-run-type', 'dry_run');

    await page.locator('#progressRoundPills button', { hasText: '正式標記' }).click();
    await expect(rows).toHaveCount(0);

    await page.locator('#progressRoundPills button', { hasText: 'R1' }).click();
    await expect(rows).toHaveCount(3);
    for (let i = 0; i < 3; i += 1) await expect(rows.nth(i)).toHaveAttribute('data-run-type', 'dry_run');
  });
});
