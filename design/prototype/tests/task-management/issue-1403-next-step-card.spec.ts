/*
 * Traceability: issue #1403, openspec/changes/task-detail-next-step-card (tasks.md 1.1 / 2.1 / 3.1 / 4.1).
 * Delta of specs/task-management/014-task-detail/spec.md: FR-027 (1)(4)(6), FR-013 (8), FR-010o-4 (2)-(6),
 * AC-3.69, AC-3.15, AC-3.17, AC-3.18, AC-3.20, AC-3.10, AC-3.14, AC-3.37, AC-3.9, AC-3.72.
 *
 * Selector contract (tasks.md header; Green must not rename):
 *   #nextStepCard, #nextStepTitle, #nextStepDesc, #nextStepConditions, #publishActionRow (card header, right),
 *   .next-step-group[data-group=required|both|official-only|reminder] > .next-step-group-title,
 *   li.next-step-cond[data-cond][data-status=met|unmet|info] > .next-step-cond-icon / -label / -value,
 *   unmet row ids: nextStepCond-<data-cond>, plus kept ids publishPoolReason, publishIaaReason, publishUndeterminedNote.
 *
 * Fixtures: T018 waiting + IAA failed (retry click -> pending); T018 with a persisted `done` round (pool 0);
 * T014 persisted waiting round with alpha 0.5882 (IAA miss, pool > 0); T001&status=waiting (IAA met path, pool > 0);
 * T001 draft (3 active annotators vs min 3; disabling Alex Wang opens a gap of 1); T014 dry_run_in_progress;
 * T016 official_run_in_progress; T003&status=completed. Every URL carries task_role.
 * Colours and token values are resolved at runtime from the CSS custom properties (no rgb literals).
 */
import { test, expect } from '../fixtures';
import type { Locator, Page } from '@playwright/test';
import { openGateSatisfiedT016 } from './_completion-gate-helpers';

const BASE = '/pages/task-management/task-detail.html';
const url = (task: string, role = 'project_leader', extra = '') => `${BASE}?task_id=${task}&task_role=${role}${extra}`;
const CARD = '#nextStepCard';

async function open(page: Page, target: string) {
  await page.goto(target);
  await expect(page.locator('#loadingSkeleton')).toBeHidden({ timeout: 15000 });
  await expect(page.locator('#overviewPanel')).toBeVisible();
  await expect(page.locator(CARD)).toBeVisible();
}

const cond = (page: Page, key: string) => page.locator(`${CARD} li.next-step-cond[data-cond="${key}"]`);
const inGroup = (page: Page, group: string, key: string) =>
  page.locator(`${CARD} .next-step-group[data-group="${group}"] li.next-step-cond[data-cond="${key}"]`);
const condKeys = (page: Page) =>
  page.locator(`${CARD} li.next-step-cond`).evaluateAll((els) => els.map((e) => e.getAttribute('data-cond')));

async function describedIds(btn: Locator): Promise<string[]> {
  return ((await btn.getAttribute('aria-describedby')) || '').split(/\s+/).filter(Boolean);
}

/** Resolve a custom property to a computed `color` / `background-color` string. */
function resolveToken(page: Page, token: string, prop: 'color' | 'backgroundColor'): Promise<string> {
  return page.evaluate(([tok, p]) => {
    const probe = document.createElement('div');
    probe.style.cssText = `position:absolute;${p === 'color' ? 'color' : 'background-color'}:var(${tok})`;
    document.body.appendChild(probe);
    const c = getComputedStyle(probe)[p as 'color' | 'backgroundColor'];
    probe.remove();
    return c;
  }, [token, prop] as const);
}

/** Seed a persisted trial round (same localStorage mechanism as persistTrialRunState()). */
async function seedWaitingRound(page: Page, task: string, round: Record<string, unknown>) {
  await page.addInitScript(
    ([key, state]) => window.localStorage.setItem(key as string, JSON.stringify(state)),
    [
      'labelsuite.trialRunState',
      {
        [task]: {
          status: 'waiting_iaa_confirmation',
          trialRounds: [
            {
              round: 1, sampleCount: 3, annotators: 3, std: 0.1, usedSamples: 3, date: '2026-08-22',
              noteZh: 'QA fixture', noteEn: 'QA fixture', ...round,
            },
          ],
        },
      },
    ],
  );
}

test.describe('Issue #1403 -- next-step card: skeleton and waiting_iaa_confirmation (tasks 1.1)', () => {
  test('(a) the card replaces the pill row: #nextStepCard exists, pill elements are gone (AC-3.69)', async ({ page }) => {
    await open(page, url('T001', 'project_leader', '&status=waiting_iaa_confirmation'));
    await expect(page.locator(CARD)).toHaveAttribute('data-testid', 'next-step-card');
    await expect(page.locator(`${CARD} #nextStepTitle`)).toContainText('下一步：');
    await expect(page.locator(`${CARD} #nextStepDesc`)).toBeVisible();
    await expect(page.locator(`${CARD} #nextStepConditions`)).toBeAttached();
    await expect(page.locator(`${CARD} #publishActionRow`)).toBeVisible();
    for (const sel of ['#execStopRow', '#execStopPills', '#stopConditionTitle', '#stopAgreementPill', '#stopStdPill', '#stopAnnotatorPill', '.stop-pill']) {
      await expect(page.locator(sel), sel).toHaveCount(0);
    }
  });

  test('(b) done: two header buttons, only 開始正式標記 is --color-cta, pool row sits in official-only (AC-3.69)', async ({ page }) => {
    await open(page, url('T001', 'project_leader', '&status=waiting_iaa_confirmation'));
    const buttons = page.locator(`${CARD} #publishActionRow button`);
    await expect(buttons).toHaveCount(2);
    const cta = await resolveToken(page, '--color-cta', 'backgroundColor');
    const bgs = await buttons.evaluateAll((els) => els.map((e) => ({ id: e.id, bg: getComputedStyle(e).backgroundColor })));
    expect(bgs.filter((b) => b.bg === cta).map((b) => b.id)).toEqual(['publishOfficialRunBtn']);
    await expect(inGroup(page, 'official-only', 'pool')).toHaveCount(1);
    await expect(page.locator(`${CARD} .next-step-group[data-group="both"]`)).toHaveCount(0);
  });

  test('(b) done + IAA miss: iaa-advisory is an info row saying 不阻擋, outside every needs group, buttons clickable (AC-3.15)', async ({ page }) => {
    await seedWaitingRound(page, 'T014', {
      agreement: 0.5882, result: 'failed', iaaComputationStatus: 'done',
      noteZh: '第一回合 IAA 未達標。', noteEn: 'Round 1 IAA missed the target.',
    });
    await open(page, url('T014', 'project_leader', '&status=waiting_iaa_confirmation'));
    const row = cond(page, 'iaa-advisory');
    await expect(row).toHaveCount(1);
    await expect(row).toHaveAttribute('data-status', 'info');
    await expect(row).toContainText('不阻擋');
    for (const group of ['required', 'both', 'official-only']) {
      await expect(inGroup(page, group, 'iaa-advisory'), group).toHaveCount(0);
    }
    await expect(page.locator(`${CARD} .next-step-group[data-group="reminder"] li[data-cond="iaa-advisory"]`)).toHaveCount(1);
    await expect(page.locator('#publishOfficialRunBtn')).toBeEnabled();
    await expect(page.locator('#publishDryRunBtn')).toBeEnabled();
  });

  test('(c) pending: iaa-computed is an unmet row in the both group, no IAA number in the card, both buttons disabled (AC-3.17)', async ({ page }) => {
    await open(page, url('T018'));
    await page.locator('#retryIaaComputationBtn').click();
    const row = inGroup(page, 'both', 'iaa-computed');
    await expect(row).toHaveCount(1);
    await expect(row).toHaveAttribute('data-status', 'unmet');
    await expect(row).toContainText('IAA 計算中');
    await expect(row).toHaveAttribute('id', 'publishIaaReason');
    await expect(page.locator(`${CARD} #retryIaaComputationBtn`)).toHaveCount(0);
    expect(await page.locator(CARD).innerText()).not.toMatch(/\b[01]\.\d{2}\b/);
    for (const id of ['publishOfficialRunBtn', 'publishDryRunBtn']) {
      const btn = page.locator(`#${id}`);
      await expect(btn).toBeDisabled();
      expect(await describedIds(btn), id).toContain('publishIaaReason');
    }
  });

  test('(d) failed: #retryIaaComputationBtn lives inside the iaa-computed row, right of the label (AC-3.18, AC-3.20)', async ({ page }) => {
    await open(page, url('T018'));
    const row = inGroup(page, 'both', 'iaa-computed');
    await expect(row).toHaveAttribute('data-status', 'unmet');
    await expect(row).toContainText('IAA 計算失敗');
    const retry = row.locator('#retryIaaComputationBtn');
    await expect(retry).toBeVisible();
    const [label, btn] = [await row.locator('.next-step-cond-label').boundingBox(), await retry.boundingBox()];
    expect(btn!.x).toBeGreaterThanOrEqual(label!.x + label!.width - 1);
    await expect(page.locator(`${CARD} .next-step-group-title`).first()).toContainText('兩個動作都需要');
  });

  test('(e) official pool 0: pool row is unmet and 開始正式標記 is disabled by it, 新增試標回合 stays clickable', async ({ page }) => {
    await seedWaitingRound(page, 'T018', { sampleCount: 5, usedSamples: 5, agreement: 0.9, result: 'passed', iaaComputationStatus: 'done' });
    await open(page, url('T018'));
    const row = inGroup(page, 'official-only', 'pool');
    await expect(row).toHaveAttribute('data-status', 'unmet');
    await expect(row).toHaveAttribute('id', 'publishPoolReason');
    await expect(cond(page, 'iaa-computed')).toHaveCount(0);
    const official = page.locator('#publishOfficialRunBtn');
    await expect(official).toBeDisabled();
    expect(await describedIds(official)).toContain('publishPoolReason');
    await expect(page.locator('#publishDryRunBtn')).toBeEnabled();
  });
});

/* Drops active annotators below min (3 -> 2) via the real member-management disable action,
   then re-renders the overview (applyLang re-runs it), as task-detail-overview-annotator-pill-active-derivation does. */
async function disableAlexWang(page: Page) {
  await page.locator('#workLogPanel').waitFor({ state: 'attached', timeout: 15000 });
  await page.locator('#tabMemberManagement').click();
  const row = page.locator('#memberTableBody tr').filter({ hasText: 'Alex Wang' });
  await row.locator('button:has-text("停用")').click();
  await page.locator('#memberActionConfirmBtn').click();
  await expect(row).toContainText('停用');
  await page.locator('#tabOverview').click();
  await page.evaluate(() => (window as any).applyLang('en'));
  await page.evaluate(() => (window as any).applyLang('zh'));
}

test.describe('Issue #1403 -- next-step card: draft condition list (tasks 2.1)', () => {
  test('draft lists pool, annotators and reviewers as required rows plus the iaa-later info row (AC-3.10)', async ({ page }) => {
    await open(page, url('T001'));
    await expect(page.locator(`${CARD} #nextStepTitle`)).toContainText('下一步：');
    for (const key of ['pool', 'annotators', 'reviewers']) {
      await expect(inGroup(page, 'required', key), key).toHaveCount(1);
    }
    const later = cond(page, 'iaa-later');
    await expect(later).toHaveCount(1);
    await expect(later).toHaveAttribute('data-status', 'info');
    await expect(later).toContainText('第一回合');
    expect(await page.locator(`${CARD} .next-step-group[data-group="required"] li.next-step-cond[data-status="info"]`).count()).toBe(0);
    expect(await condKeys(page)).toEqual(['pool', 'annotators', 'reviewers', 'iaa-later']);
  });

  test('all conditions met: the three required rows are met and 新增試標回合 R1 is clickable', async ({ page }) => {
    await open(page, url('T001'));
    for (const key of ['pool', 'annotators', 'reviewers']) {
      await expect(cond(page, key), key).toHaveAttribute('data-status', 'met');
    }
    await expect(page.locator('#publishDryRunBtn')).toBeEnabled();
  });

  test('annotator shortfall: annotators row is unmet with 還差 1 位, the button is disabled and described by it (FR-010t)', async ({ page }) => {
    await open(page, url('T001'));
    await disableAlexWang(page);
    const row = cond(page, 'annotators');
    await expect(row).toHaveAttribute('data-status', 'unmet');
    await expect(row.locator('.next-step-cond-value')).toContainText(/還差 1 位/);
    await expect(row).toHaveAttribute('id', 'nextStepCond-annotators');
    await expect(cond(page, 'pool')).toHaveAttribute('data-status', 'met');
    const btn = page.locator('#publishDryRunBtn');
    await expect(btn).toBeDisabled();
    expect(await describedIds(btn)).toContain('nextStepCond-annotators');
    expect(await describedIds(btn)).not.toContain('nextStepCond-pool');
  });

  test('pool exhausted (T013): pool row is unmet and the button is described by publishPoolReason (FR-022(3))', async ({ page }) => {
    await open(page, url('T013'));
    const row = cond(page, 'pool');
    await expect(row).toHaveAttribute('data-status', 'unmet');
    await expect(row).toHaveAttribute('id', 'publishPoolReason');
    const btn = page.locator('#publishDryRunBtn');
    await expect(btn).toBeDisabled();
    expect(await describedIds(btn)).toContain('publishPoolReason');
    for (const id of await describedIds(btn)) {
      await expect(page.locator(`${CARD} [id="${id}"]`), id).toBeVisible();
    }
  });
});

/** Every unmet row has an id and the disabled button points at exactly those ids (FR-027(4), FR-013(8)). */
async function expectDescribedByEveryUnmetRow(page: Page, button: Locator) {
  const unmetIds = await page
    .locator(`${CARD} li.next-step-cond[data-status="unmet"]`)
    .evaluateAll((els) => els.map((e) => e.id));
  expect(unmetIds.length, 'at least one unmet row').toBeGreaterThan(0);
  for (const id of unmetIds) expect(id, 'unmet row has an id').not.toBe('');
  expect((await describedIds(button)).sort()).toEqual([...unmetIds].sort());
}

test.describe('Issue #1403 -- next-step card: dry_run_in_progress and official_run_in_progress (tasks 3.1)', () => {
  test('dry_run_in_progress: description is the AC-3.14 reason; rows are the FR-008a four and never a pool row', async ({ page }) => {
    await open(page, url('T014'));
    await expect(page.locator('#nextStepDesc')).toContainText('本回合的標註、必要審核與必要仲裁全部完成後才能新增下一回合');
    expect(await condKeys(page)).toEqual(['submission', 'review', 'dispute', 'exception-pool']);
    await expect(cond(page, 'pool')).toHaveCount(0);
    for (const k of ['annotators', 'reviewers', 'iaa-computed', 'iaa-advisory', 'iaa-undetermined', 'iaa-later', 'quality-metrics']) {
      await expect(cond(page, k), k).toHaveCount(0);
    }
  });

  test('dry_run_in_progress: 新增試標回合 is disabled and described by every unmet row (AC-3.14)', async ({ page }) => {
    await open(page, url('T014'));
    const buttons = page.locator(`${CARD} #publishActionRow button`);
    await expect(buttons).toHaveCount(1);
    const btn = page.locator('#publishDryRunBtn');
    await expect(btn).toContainText('新增試標回合 R2');
    await expect(btn).toBeDisabled();
    await expectDescribedByEveryUnmetRow(page, btn);
  });

  test('official_run_in_progress: rows are the FR-008b five, without annotators or iaa rows (AC-3.9)', async ({ page }) => {
    await open(page, url('T016'));
    expect(await condKeys(page)).toEqual(['submission', 'review', 'dispute', 'exception-pool', 'quality-metrics']);
    for (const k of ['pool', 'annotators', 'reviewers', 'iaa-computed', 'iaa-advisory', 'iaa-undetermined', 'iaa-later']) {
      await expect(cond(page, k), k).toHaveCount(0);
    }
  });

  test('official_run_in_progress (T016 seed): dispute and exception-pool rows are unmet, 標記完成 is disabled and described by them (AC-3.9, SC-037)', async ({ page }) => {
    await open(page, url('T016'));
    await expect(cond(page, 'submission')).toHaveAttribute('data-status', 'met');
    await expect(cond(page, 'dispute')).toHaveAttribute('data-status', 'unmet');
    await expect(cond(page, 'exception-pool')).toHaveAttribute('data-status', 'unmet');
    await expect(cond(page, 'dispute').locator('.next-step-cond-value')).toContainText(/\d/);
    const btn = page.locator('#publishCompleteBtn');
    await expect(btn).toBeDisabled();
    await expectDescribedByEveryUnmetRow(page, btn);
  });

  test('official_run_in_progress with every dispute resolved: all five rows are met and 標記完成 is enabled (FR-008b)', async ({ page }) => {
    await openGateSatisfiedT016(page, BASE);
    await expect(page.locator(CARD)).toBeVisible();
    expect(await page.locator(`${CARD} li.next-step-cond[data-status="met"]`).count()).toBe(5);
    await expect(page.locator(`${CARD} li.next-step-cond[data-status="unmet"]`)).toHaveCount(0);
  });
});

const READONLY_TEXT = '僅 project leader 可操作';

test.describe('Issue #1403 -- next-step card: reviewer, completed and disabled styling (tasks 4.1)', () => {
  for (const [task, name] of [['T013', '新增試標回合'], ['T016', '標記完成']] as const) {
    test(`reviewer ${task}: button (${name}) is disabled, 僅 project leader 可操作 is visible, no condition rows (AC-3.72)`, async ({ page }) => {
      await open(page, url(task, 'reviewer'));
      const btn = page.locator(`${CARD} #publishActionRow button`).first();
      await expect(btn).toBeDisabled();
      await expect(btn).toContainText(name);
      await expect(btn).toHaveAttribute('title', READONLY_TEXT);
      await expect(page.locator(`${CARD} .exec-action-readonly-note`)).toBeVisible();
      await expect(page.locator(`${CARD} .exec-action-readonly-note`)).toContainText(READONLY_TEXT);
      await expect(page.locator(`${CARD} li.next-step-cond`)).toHaveCount(0);
    });
  }

  test('completed: title is 任務已完成，無待執行動作, no button and no condition rows (FR-027(6))', async ({ page }) => {
    await open(page, url('T003', 'project_leader', '&status=completed'));
    await expect(page.locator('#nextStepTitle')).toHaveText('任務已完成，無待執行動作');
    await expect(page.locator(`${CARD} button`)).toHaveCount(0);
    await expect(page.locator(`${CARD} li.next-step-cond`)).toHaveCount(0);
  });

  test('disabled buttons in the card: opacity 1, --color-text-soft text, not --color-cta, not dashed (FR-027(6))', async ({ page }) => {
    await open(page, url('T018'));
    const soft = await resolveToken(page, '--color-text-soft', 'color');
    const cta = await resolveToken(page, '--color-cta', 'backgroundColor');
    const disabled = page.locator(`${CARD} button:disabled`);
    expect(await disabled.count()).toBeGreaterThanOrEqual(2);
    const styles = await disabled.evaluateAll((bs) =>
      bs.map((b) => {
        const s = getComputedStyle(b);
        return { id: b.id, opacity: s.opacity, color: s.color, bg: s.backgroundColor, borderStyle: s.borderTopStyle };
      }),
    );
    for (const s of styles) {
      expect(s.opacity, `${s.id} opacity`).toBe('1');
      expect(s.color, `${s.id} text colour`).toBe(soft);
      expect(s.bg, `${s.id} background`).not.toBe(cta);
      expect(s.borderStyle, `${s.id} border`).not.toBe('dashed');
    }
  });

  test('the disabled style stays scoped to the card: a .btn:disabled outside it keeps the site-wide opacity 0.4', async ({ page }) => {
    await open(page, url('T001'));
    const outside = await page.evaluate(() => {
      const b = document.createElement('button');
      b.className = 'btn';
      b.disabled = true;
      document.body.appendChild(b);
      const opacity = getComputedStyle(b).opacity;
      b.remove();
      return opacity;
    });
    expect(outside).toBe('0.4');
  });

  test('icon colours: met / unmet / info resolve to --color-success / --color-ink-muted / --color-warning, with text glyphs', async ({ page }) => {
    const [success, muted, warning] = [
      await (async () => { await open(page, url('T001')); return resolveToken(page, '--color-success', 'color'); })(),
      await resolveToken(page, '--color-ink-muted', 'color'),
      await resolveToken(page, '--color-warning', 'color'),
    ];
    const iconOf = (key: string) => cond(page, key).locator('.next-step-cond-icon');
    await expect(cond(page, 'pool')).toHaveAttribute('data-status', 'met');
    await expect(iconOf('pool')).toHaveText('✓');
    expect(await iconOf('pool').evaluate((e) => getComputedStyle(e).color)).toBe(success);
    await expect(cond(page, 'iaa-later')).toHaveAttribute('data-status', 'info');
    await expect(iconOf('iaa-later')).toHaveText('ⓘ');
    expect(await iconOf('iaa-later').evaluate((e) => getComputedStyle(e).color)).toBe(warning);

    await open(page, url('T018'));
    await expect(cond(page, 'iaa-computed')).toHaveAttribute('data-status', 'unmet');
    await expect(iconOf('iaa-computed')).toHaveText('○');
    expect(await iconOf('iaa-computed').evaluate((e) => getComputedStyle(e).color)).toBe(muted);
  });

  for (const [label, target] of [
    ['draft T013', url('T013')],
    ['waiting T018', url('T018')],
    ['dry_run T014', url('T014')],
    ['official T016', url('T016')],
  ] as const) {
    test(`${label}: the card never shows a red ✗ (FR-027(4))`, async ({ page }) => {
      await open(page, target);
      expect(await page.locator(CARD).innerText()).not.toContain('✗');
      const hasErrorIcon = await page.locator(`${CARD} .next-step-cond-icon`).evaluateAll((els) => {
        const probe = document.createElement('div');
        probe.style.cssText = 'position:absolute;color:var(--color-error)';
        document.body.appendChild(probe);
        const error = getComputedStyle(probe).color;
        probe.remove();
        return els.some((e) => getComputedStyle(e).color === error);
      });
      expect(hasErrorIcon).toBe(false);
    });
  }
});
