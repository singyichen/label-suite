/*
 * Traceability: openspec/changes/1141-task-detail-quality-metrics-gate/specs/task-management/
 * 014-task-detail/spec.md FR-008b item 5 (quality metrics ready, derived from the LATEST trial
 * round's iaa computation status) and its two new scenarios; issue #1141, issue #1120
 * acceptance 07(5). Canonical rule name: dataset/017 QUALITY_METRICS_READY_RULE.
 *
 * Contract: on an official_run_in_progress task whose FR-008b conditions 1-4 are all satisfied,
 *   - latest round `pending` / `failed`: #publishCompleteBtn is natively disabled, ONE visible
 *     `li` in #publishActionRow explains the quality-metrics problem in Traditional Chinese
 *     (computing vs failed told apart by keyword), the button's accessible description carries
 *     it, and publishComplete() (direct call, or `disabled` removed + click) leaves the status
 *     official_run_in_progress.
 *   - latest round `done` (including a not-computable result with null agreement) or with no
 *     status signal: item 5 never blocks; the task completes directly.
 *
 * Setup: the T016 official fixture (submissions 5/5) is driven to "conditions 1-4 satisfied"
 * through the workspace module's PUBLIC write paths (same as task-detail-completion-gate.spec.ts),
 * then ONLY the latest trial round's iaaComputationStatus is seeded through the page's own
 * persisted record (labelsuite.trialRunState, written by persistTrialRunState()). Wording is not
 * pinned beyond keywords; structure is.
 *
 * Today (before Green) getCompletionSignals() never passes qualityMetricsReady, so the
 * pending/failed cases are expected RED (button enabled, no reason) while the done / no-status
 * cases are regression guards that already pass.
 */
import { test, expect, type Page } from '@playwright/test';

const TASK_DETAIL_URL = '/pages/task-management/task-detail.html';
const TRIAL_RUN_STATE_KEY = 'labelsuite.trialRunState';
const IN_PROGRESS_BADGE = '正式標記進行中';
const COMPLETED_BADGE = '已完成';
const IDENTITY = { annotatorId: 'kioleemg12' };

type LatestRound = { status?: 'pending' | 'failed' | 'done'; notComputable?: boolean };

async function reasonTexts(page: Page): Promise<string[]> {
  return page.locator('#publishActionRow li').allInnerTexts();
}

async function persistedStatus(page: Page) {
  return page.evaluate(
    (key) => {
      const all = JSON.parse(window.localStorage.getItem(key) || '{}');
      return all.T016 ? all.T016.status : null;
    },
    TRIAL_RUN_STATE_KEY,
  );
}

/** Drive T016 to FR-008b conditions 1-4 satisfied, seed ONLY the latest round status, reload. */
async function openReadyT016(page: Page, latest: LatestRound) {
  await page.goto(`${TASK_DETAIL_URL}?task_id=T016`);
  await expect(page.locator('#statusBadge')).toContainText(IN_PROGRESS_BADGE);
  const statuses = await page.evaluate(
    ({ identity, round }) => {
      const ws = (window as any).LabelSuiteAnnotationWorkspaceData;
      ws.resolveExceptionPoolItem(
        'T016', 'official_run', 'ofm-05-final-exception', identity,
        'single_label', 'adopt_reviewer', 'positive', 'QA fixture: adopt the reviewer value',
      );
      ['ofm-03-awaiting-arbitration', 'ofm-04-reviewer-bypass'].forEach((sampleId) => {
        ws.submitArbitration(
          'T016', 'official_run', sampleId, { annotatorId: identity.annotatorId, reviewerId: 'reviewer_chen' },
          [{ itemId: 'single_label::single_label', choice: 'adopt_b', value: 'neutral', reason: 'QA fixture' }],
        );
      });
      const base = { sampleCount: 1, annotators: 3, usedSamples: 1, noteZh: 'QA', noteEn: 'QA' };
      const first = { ...base, round: 1, agreement: 0.62, std: 0.1, result: 'failed', date: '2026-08-18', iaaComputationStatus: 'done' };
      const last: Record<string, unknown> = {
        ...base,
        round: 2,
        agreement: round.notComputable ? null : 0.84,
        std: round.notComputable ? null : 0.1,
        result: round.pending ? null : 'passed',
        date: '2026-08-19',
      };
      if (round.status) last.iaaComputationStatus = round.status;
      const all = JSON.parse(window.localStorage.getItem('labelsuite.trialRunState') || '{}');
      all.T016 = { status: 'official_run_in_progress', trialRounds: [first, last] };
      window.localStorage.setItem('labelsuite.trialRunState', JSON.stringify(all));
      return ws.listReviewUnits('T016', 'official_run').map((u: any) => u.status);
    },
    { identity: IDENTITY, round: { status: latest.status, notComputable: latest.notComputable, pending: latest.status === 'pending' } },
  );
  // sanity: conditions 2-4 hold (all finalized, no pending exception); submissions are 5/5 (condition 1).
  expect(statuses).toEqual(['finalized', 'finalized', 'finalized', 'finalized', 'finalized']);
  await page.reload();
  await expect(page.locator('#statusBadge')).toContainText(IN_PROGRESS_BADGE);
  await expect(page.locator('#publishCompleteBtn')).toBeVisible();
}

test.describe('Quality-metrics completion gate (FR-008b(5), issue #1141)', () => {
  test('latest round pending: 標記完成 is disabled with exactly one visible 品質指標 computing reason, exposed via aria-describedby (FR-008b(5))', async ({
    page,
  }) => {
    await openReadyT016(page, { status: 'pending' });

    await expect(page.locator('#publishCompleteBtn')).toBeDisabled();
    const texts = await reasonTexts(page);
    expect(texts).toHaveLength(1);
    expect(texts[0]).toMatch(/品質指標/);
    expect(texts[0]).toMatch(/計算中|尚在計算|進行中/);
    expect(texts[0]).not.toMatch(/失敗/);
    await expect(page.locator('#publishActionRow li', { hasText: '品質指標' }).first()).toBeVisible();
    await expect(page.locator('#publishCompleteBtn')).toHaveAttribute('aria-describedby', /\S+/);
    await expect(page.locator('#publishCompleteBtn')).toHaveAccessibleDescription(/品質指標/);
  });

  test('latest round failed: 標記完成 is disabled with exactly one visible 品質指標 failure reason (FR-008b(5))', async ({
    page,
  }) => {
    await openReadyT016(page, { status: 'failed' });

    await expect(page.locator('#publishCompleteBtn')).toBeDisabled();
    const texts = await reasonTexts(page);
    expect(texts).toHaveLength(1);
    expect(texts[0]).toMatch(/品質指標/);
    expect(texts[0]).toMatch(/失敗/);
    await expect(page.locator('#publishActionRow li', { hasText: '品質指標' }).first()).toBeVisible();
  });

  test('latest round pending: a direct publishComplete() call keeps official_run_in_progress and persists nothing (FR-008b(5))', async ({
    page,
  }) => {
    await openReadyT016(page, { status: 'pending' });

    await page.evaluate(() => (window as unknown as { publishComplete: () => void }).publishComplete());

    await expect(page.locator('#statusBadge')).toContainText(IN_PROGRESS_BADGE);
    expect(await persistedStatus(page)).toBe('official_run_in_progress');
  });

  test('latest round failed: removing `disabled` and clicking 標記完成 still does not complete the task (FR-008b(5))', async ({
    page,
  }) => {
    await openReadyT016(page, { status: 'failed' });

    await page.evaluate(() => document.getElementById('publishCompleteBtn')!.removeAttribute('disabled'));
    await page.locator('#publishCompleteBtn').click();

    await expect(page.locator('#statusBadge')).toContainText(IN_PROGRESS_BADGE);
    expect(await persistedStatus(page)).toBe('official_run_in_progress');
  });

  test('latest round done: item 5 does not block, no reason is listed and the task completes (FR-008b(5))', async ({
    page,
  }) => {
    await openReadyT016(page, { status: 'done' });

    await expect(page.locator('#publishCompleteBtn')).toBeEnabled();
    expect(await reasonTexts(page)).toHaveLength(0);
    await page.locator('#publishCompleteBtn').click();
    await expect(page.locator('#statusBadge')).toContainText(COMPLETED_BADGE);
    expect(await persistedStatus(page)).toBe('completed');
  });

  test('latest round done with a not-computable result (null agreement, De = 0): not blocked and the task completes (FR-008b(5))', async ({
    page,
  }) => {
    await openReadyT016(page, { status: 'done', notComputable: true });

    await expect(page.locator('#publishCompleteBtn')).toBeEnabled();
    expect(await reasonTexts(page)).toHaveLength(0);
    await page.locator('#publishCompleteBtn').click();
    await expect(page.locator('#statusBadge')).toContainText(COMPLETED_BADGE);
    expect(await persistedStatus(page)).toBe('completed');
  });

  test('latest round with no status signal: a missing signal reads as ready, so item 5 does not block completion (FR-008b(5))', async ({
    page,
  }) => {
    await openReadyT016(page, {});

    await expect(page.locator('#publishCompleteBtn')).toBeEnabled();
    expect(await reasonTexts(page)).toHaveLength(0);
    await page.locator('#publishCompleteBtn').click();
    await expect(page.locator('#statusBadge')).toContainText(COMPLETED_BADGE);
    expect(await persistedStatus(page)).toBe('completed');
  });
});
