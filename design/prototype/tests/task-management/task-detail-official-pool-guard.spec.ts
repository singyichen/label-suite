/*
 * Traceability: openspec/changes/1120-task-lifecycle-alignment/specs/task-management/014-task-detail/spec.md
 *   FR-022 points (1)-(5) and its four scenarios; SC-049. Issue #1120 section 4 acceptance 06.
 *
 * Fixtures (no new seed data needed):
 *   - T013: `draft`, own dataset has 1 record and the derived sampling value is 1,
 *     so publishing R1 would leave a remaining official pool of 0 (FR-022(3)).
 *   - T018: `waiting_iaa_confirmation`, own dataset has 5 records and round 1
 *     already consumed all 5 (remaining official pool 0). Its seed has
 *     `iaaComputationStatus: 'failed'`, which would disable the CTA for an IAA
 *     reason, so scenario 2 seeds the persisted trial-run state
 *     (`labelsuite.trialRunState`, the same mechanism the page itself writes in
 *     persistTrialRunState()) with a `done` + `passed` round 1 before load.
 *
 * Contract for Green (selectors/DOM this file pins down; wording is NOT pinned):
 *   - The pool-zero reason is visible text inside #publishActionRow that mentions
 *     「正式標記池」 and the count 0.
 *   - The disabled CTA references that reason through aria-describedby, so the
 *     reason is reachable by screen readers even though a disabled button is not
 *     in the keyboard focus path (FR-022(5)).
 *   - publishOfficialRun()/publishDryRun() re-validate the pool inside the handler
 *     (FR-022(4)); the IAA axis (iaaComputationStatus) is never written by the guard.
 *
 * Direct handler call: window.publishOfficialRun() / publishDryRun() are plain-script
 * globals (pattern from issue-198-publish-double-click-guard.spec.ts), and a second
 * path strips the `disabled` attribute then clicks, which reaches the delegated
 * click handler.
 */
import { test, expect, type Page } from '@playwright/test';

const TASK_DETAIL_URL = '/pages/task-management/task-detail.html';
const TRIAL_RUN_STATE_KEY = 'labelsuite.trialRunState';

const POOL_REASON = /正式標記池.{0,20}0|0.{0,20}正式標記池/;
const IAA_WORDING = /IAA 未達標|IAA 計算中|IAA 計算失敗/;

// T018 round 1: all 5 own records used, computation finished, IAA met.
const T018_DONE_PASSED_STATE = {
  T018: {
    status: 'waiting_iaa_confirmation',
    trialRounds: [
      {
        round: 1,
        sampleCount: 5,
        agreement: 0.91,
        annotators: 3,
        std: 0.02,
        result: 'passed',
        usedSamples: 5,
        date: '2026-08-22',
        noteZh: '第一回合 IAA 已達標。',
        noteEn: 'Round 1 IAA met the target.',
        iaaComputationStatus: 'done',
      },
    ],
  },
};

async function openT018DonePassed(page: Page) {
  await page.addInitScript(
    ([key, state]) => window.localStorage.setItem(key as string, JSON.stringify(state)),
    [TRIAL_RUN_STATE_KEY, T018_DONE_PASSED_STATE],
  );
  await page.goto(`${TASK_DETAIL_URL}?task_id=T018`);
  await expect(page.locator('#statusBadge')).toContainText('待 IAA 確認');
  await expect(page.locator('#publishOfficialRunBtn')).toBeVisible();
}

async function persistedRound(page: Page) {
  return page.evaluate((key) => {
    const all = JSON.parse(window.localStorage.getItem(key) || '{}');
    const rounds = (all.T018 && all.T018.trialRounds) || [];
    return { status: all.T018 ? all.T018.status : null, rounds };
  }, TRIAL_RUN_STATE_KEY);
}

test.describe('Official pool zero publish guard (FR-022, SC-049)', () => {
  test('draft task whose sampling leaves official pool 0 shows the reason before publishing and disables the CTA (FR-022(3))', async ({
    page,
  }) => {
    await page.goto(`${TASK_DETAIL_URL}?task_id=T013`);
    await expect(page.locator('#statusBadge')).toContainText('草稿');
    await expect(page.locator('#publishDryRunBtn')).toBeVisible();

    await expect(page.locator('#publishActionRow')).toContainText(POOL_REASON);
    await expect(page.locator('#publishDryRunBtn')).toBeDisabled();
  });

  test('the draft pool-zero reason is visible text wired to the CTA via aria-describedby, not hover-only (FR-022(5))', async ({
    page,
  }) => {
    await page.goto(`${TASK_DETAIL_URL}?task_id=T013`);
    const cta = page.locator('#publishDryRunBtn');
    await expect(cta).toBeVisible();

    const describedBy = await cta.getAttribute('aria-describedby');
    expect(describedBy, 'CTA must carry aria-describedby pointing at the pool reason').toBeTruthy();
    const reason = page.locator(`[id="${describedBy}"]`);
    await expect(reason).toBeVisible();
    await expect(reason).toContainText(POOL_REASON);
    await expect(reason).not.toHaveAttribute('aria-hidden', 'true');
    // A title attribute alone (hover-only) must not be the carrier of the reason.
    await expect(reason).toHaveText(/\S/);
  });

  test('done + IAA met + pool 0: the official-run CTA is disabled and the pool reason is listed (FR-022(1)(2))', async ({
    page,
  }) => {
    await openT018DonePassed(page);

    await expect(page.locator('#publishOfficialRunBtn')).toBeDisabled();
    await expect(page.locator('#publishActionRow')).toContainText(POOL_REASON);
  });

  test('done + IAA met + pool 0: bypassing the disabled button via a direct handler call keeps status and creates nothing (FR-022(1)(4))', async ({
    page,
  }) => {
    await openT018DonePassed(page);

    await page.evaluate(() => {
      (window as unknown as { publishOfficialRun: () => void }).publishOfficialRun();
    });

    await expect(page.locator('#statusBadge')).toContainText('待 IAA 確認');
    await expect(page.locator('#statusBadge')).not.toContainText('正式標記進行中');
    const state = await persistedRound(page);
    expect(state.status).toBe('waiting_iaa_confirmation');
    expect(state.rounds).toHaveLength(1);
  });

  test('done + IAA met + pool 0: removing `disabled` and clicking still does not publish (FR-022(1)(4))', async ({
    page,
  }) => {
    await openT018DonePassed(page);

    await page.evaluate(() => {
      document.getElementById('publishOfficialRunBtn')!.removeAttribute('disabled');
    });
    await page.locator('#publishOfficialRunBtn').click();

    await expect(page.locator('#statusBadge')).toContainText('待 IAA 確認');
    await expect(page.locator('#publishCompleteBtn')).toHaveCount(0);
    const state = await persistedRound(page);
    expect(state.status).toBe('waiting_iaa_confirmation');
  });

  test('the pool reason has no IAA wording and the latest round iaa_computation_status stays done (FR-022(2))', async ({
    page,
  }) => {
    await openT018DonePassed(page);

    // Reason must exist first, so the no-IAA-wording check below cannot pass vacuously.
    await expect(page.locator('#publishActionRow')).toContainText(POOL_REASON);
    await expect(page.locator('#publishActionRow')).not.toContainText(IAA_WORDING);

    await page.evaluate(() => {
      (window as unknown as { publishOfficialRun: () => void }).publishOfficialRun();
    });

    await expect(page.locator('#publishActionRow')).not.toContainText(IAA_WORDING);
    const state = await persistedRound(page);
    expect(state.rounds[state.rounds.length - 1].iaaComputationStatus).toBe('done');
  });

  test('lock-in: draft direct publishDryRun() call with pool 0 does not create a trial round (FR-022(4))', async ({
    page,
  }) => {
    await page.goto(`${TASK_DETAIL_URL}?task_id=T013`);
    await expect(page.locator('#publishDryRunBtn')).toBeVisible();

    // Lock-in (passes today): canPublish() already blocks this call on the pool
    // check (Green runs the pool check first, before validateSampling()), so this
    // guards against that path loosening rather than proving new behavior.
    await page.evaluate(() => {
      (window as unknown as { publishDryRun: () => void }).publishDryRun();
    });

    await expect(page.locator('#statusBadge')).toContainText('草稿');
    await expect(page.locator('#trialRoundTimeline .round-timeline-item')).toHaveCount(0);
  });
});

/*
 * FR-022(3): the early disclosure of the pool-zero reason MUST NOT replace the
 * FR-010t member-count check; both are listed independently.
 *
 * Fixture: T013 (draft, pool 0 at the derived sampling value) has 3 active
 * annotators against min_annotators=3, i.e. no member gap. Disabling one
 * annotator through the real member-management action (same mechanism as
 * issue-505-publish-member-gate.spec.ts) opens an annotator gap of 1
 * ("標記員還差 1 位"), so the pool block and a member gap apply together.
 *
 * Assertion choice (does not overfit markup): both reasons must be visible text
 * inside #publishActionRow, and the combined text of every element referenced by
 * the disabled CTA's aria-describedby (space-separated id list) must contain both.
 * Neither element ids nor the number of spans are pinned.
 */
const MEMBER_GAP = /標記員還差 1 位/;

async function disableAnnotatorThenOpenOverview(page: Page, name: string) {
  await page.goto(`${TASK_DETAIL_URL}?task_id=T013`);
  await page.locator('#workLogPanel').waitFor({ state: 'attached', timeout: 15000 });
  await page.locator('#tabMemberManagement').click();
  await expect(page.locator('#memberManagementPanel')).not.toHaveClass(/hidden/);
  const row = page.locator('#memberTableBody tr').filter({ hasText: name });
  await row.locator('button:has-text("停用")').click();
  await page.locator('#memberActionConfirmBtn').click();
  await expect(row).toContainText('停用');
  await page.locator('#tabOverview').click();
  await expect(page.locator('#overviewPanel')).not.toHaveClass(/hidden/);
}

test.describe('Pool reason and member gap are shown independently (FR-022(3), SC-049)', () => {
  test('draft with pool 0 and a member gap lists both reasons as visible text and in the CTA description (FR-022(3))', async ({
    page,
  }) => {
    await disableAnnotatorThenOpenOverview(page, 'Alex Wang');

    const cta = page.locator('#publishDryRunBtn');
    await expect(cta).toBeDisabled();
    // Pool reason stays present (passes today) ...
    await expect(page.locator('#publishActionRow')).toContainText(POOL_REASON);
    // ... and the member gap must be present at the same time (fails today).
    await expect(page.locator('#publishActionRow')).toContainText(MEMBER_GAP);

    const describedBy = ((await cta.getAttribute('aria-describedby')) || '').split(/\s+/).filter(Boolean);
    expect(describedBy.length, 'CTA must carry aria-describedby').toBeGreaterThan(0);
    const described = await page.evaluate(
      (ids) => ids.map((id) => (document.getElementById(id) || { textContent: '' }).textContent).join(' '),
      describedBy,
    );
    expect(described).toMatch(POOL_REASON);
    expect(described).toMatch(MEMBER_GAP);
  });

  test('direct publishDryRun() with pool 0 and a member gap keeps draft and the blocking toast lists both (FR-022(3))', async ({
    page,
  }) => {
    await disableAnnotatorThenOpenOverview(page, 'Alex Wang');

    await page.evaluate(() => {
      (window as unknown as { publishDryRun: () => void }).publishDryRun();
    });

    await expect(page.locator('#statusBadge')).toContainText('草稿');
    await expect(page.locator('#trialRoundTimeline .round-timeline-item')).toHaveCount(0);
    await expect(page.locator('#toastMsg')).toContainText(POOL_REASON);
    await expect(page.locator('#toastMsg')).toContainText(MEMBER_GAP);
  });

  test('control: pool 0 with no member gap shows no member-gap text (FR-022(3))', async ({ page }) => {
    await page.goto(`${TASK_DETAIL_URL}?task_id=T013`);
    await page.locator('#workLogPanel').waitFor({ state: 'attached', timeout: 15000 });
    await expect(page.locator('#publishActionRow')).toContainText(POOL_REASON);
    await expect(page.locator('#publishActionRow')).not.toContainText(/還差/);

    await page.evaluate(() => {
      (window as unknown as { publishDryRun: () => void }).publishDryRun();
    });
    await expect(page.locator('#toastMsg')).toContainText(POOL_REASON);
    await expect(page.locator('#toastMsg')).not.toContainText(/還差/);
  });
});
