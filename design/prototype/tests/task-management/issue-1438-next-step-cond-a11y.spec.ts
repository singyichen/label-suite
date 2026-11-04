/*
 * Traceability: issue #1438 (follow-up of #1403 next-step card, FR-027 condition rows in
 * specs/task-management/014-task-detail/spec.md).
 *
 * Contract for Green:
 *   (a) every `.next-step-cond-icon` carries aria-hidden="true"; each row gains
 *       `<span class="sr-only next-step-cond-status">` right after the icon, localized through t():
 *       met = 已滿足 / Met, unmet = 未滿足 / Not met, info = 提醒 / Reminder.
 *       The text must stay in the a11y tree (not display:none / visibility:hidden) but be visually clipped (<= 1px box).
 *   (b) row.label / row.value / group.title are HTML-escaped; extraHtml stays raw.
 *   (c) regression guard: the retry button inside the iaa-computed row is still a real <button>.
 *
 * Fixtures: T001 draft (met + info rows), T014 dry_run_in_progress (unmet rows), T018 waiting + IAA failed (unmet + retry),
 * T014 seeded waiting round with an IAA miss (info row). Language is switched through localStorage `labelsuite.lang`.
 * Injection hook for (b): label/value/title are all i18n strings or counts, so no user-controlled text reaches them
 * through app data. The only seam is window.LabelSuiteTaskDetailData.getTaskCompletionBlockers, whose `count` is
 * interpolated into the exception-pool row value; an init script wraps it to always report that blocker with count = '<b>x</b>'.
 * Every URL carries task_role.
 */
import { test, expect } from '../fixtures';
import type { Page } from '@playwright/test';

const BASE = '/pages/task-management/task-detail.html';
const url = (task: string, role = 'project_leader', extra = '') => `${BASE}?task_id=${task}&task_role=${role}${extra}`;
const CARD = '#nextStepCard';
const ROWS = `${CARD} li.next-step-cond`;

const STATUS_TEXT = {
  zh: { met: '已滿足', unmet: '未滿足', info: '提醒' },
  en: { met: 'Met', unmet: 'Not met', info: 'Reminder' },
} as const;
type Lang = keyof typeof STATUS_TEXT;

async function open(page: Page, target: string, lang: Lang = 'zh') {
  await page.addInitScript((l) => window.localStorage.setItem('labelsuite.lang', l), lang);
  await page.goto(target);
  await expect(page.locator('#loadingSkeleton')).toBeHidden({ timeout: 15000 });
  await expect(page.locator('#overviewPanel')).toBeVisible();
  await expect(page.locator(CARD)).toBeVisible();
}

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

type Fixture = { name: string; expect: 'met' | 'unmet' | 'info'; target: string; seed?: (page: Page) => Promise<void> };
const FIXTURES: Fixture[] = [
  { name: 'T001 draft (met rows)', expect: 'met', target: url('T001') },
  { name: 'T001 draft (info reminder row)', expect: 'info', target: url('T001') },
  { name: 'T014 dry_run_in_progress (unmet rows)', expect: 'unmet', target: url('T014') },
  { name: 'T018 waiting + IAA failed (unmet row)', expect: 'unmet', target: url('T018') },
  {
    name: 'T014 waiting + IAA miss (info row)',
    expect: 'info',
    target: url('T014', 'project_leader', '&status=waiting_iaa_confirmation'),
    seed: (page) => seedWaitingRound(page, 'T014', {
      agreement: 0.5882, result: 'failed', iaaComputationStatus: 'done',
      noteZh: '第一回合 IAA 未達標。', noteEn: 'Round 1 IAA missed the target.',
    }),
  },
];

test.describe('Issue #1438 -- next-step condition rows: a11y status text', () => {
  for (const fx of FIXTURES) {
    for (const lang of ['zh', 'en'] as const) {
      test(`(a) ${lang} / ${fx.name}: icons are aria-hidden and each row has a localized sr-only ${fx.expect} status`, async ({ page }) => {
        if (fx.seed) await fx.seed(page);
        await open(page, fx.target, lang);
        const rows = await page.locator(ROWS).evaluateAll((els) =>
          els.map((li) => {
            const icon = li.querySelector('.next-step-cond-icon');
            const status = li.querySelector('.next-step-cond-status');
            return {
              cond: li.getAttribute('data-cond'),
              status: li.getAttribute('data-status') as string,
              iconHidden: icon?.getAttribute('aria-hidden') ?? null,
              statusText: status ? (status.textContent || '').trim() : null,
              afterIcon: !!icon && icon.nextElementSibling === status,
            };
          }),
        );
        expect(rows.map((r) => r.status), `${fx.name}: fixture must expose a ${fx.expect} row`).toContain(fx.expect);
        for (const r of rows) {
          expect(r.iconHidden, `${r.cond}: icon aria-hidden`).toBe('true');
          expect(r.statusText, `${r.cond}: status text (${lang})`).toBe(STATUS_TEXT[lang][r.status as 'met']);
          expect(r.afterIcon, `${r.cond}: status span follows icon`).toBe(true);
        }
      });
    }
  }

  test('(a) status text is visually clipped (<= 1px) yet stays in the a11y tree (not display:none)', async ({ page }) => {
    await open(page, url('T001'));
    const status = page.locator(`${ROWS} .next-step-cond-status`).first();
    await expect(status).toBeAttached();
    const info = await status.evaluate((el) => {
      const cs = getComputedStyle(el);
      const box = el.getBoundingClientRect();
      return { display: cs.display, visibility: cs.visibility, w: box.width, h: box.height, hasClass: el.classList.contains('sr-only') };
    });
    expect(info.hasClass).toBe(true);
    expect(info.display).not.toBe('none');
    expect(info.visibility).not.toBe('hidden');
    expect(info.w).toBeLessThanOrEqual(1);
    expect(info.h).toBeLessThanOrEqual(1);
  });
});

test.describe('Issue #1438 -- next-step condition rows: HTML escaping', () => {
  test('(b) a value carrying markup renders as literal text; labels and group titles contain no injected elements', async ({ page }) => {
    await page.addInitScript(() => {
      let data: any;
      Object.defineProperty(window, 'LabelSuiteTaskDetailData', {
        configurable: true,
        get: () => data,
        set: (v) => {
          data = v;
          if (v && typeof v.getTaskCompletionBlockers === 'function') {
            const orig = v.getTaskCompletionBlockers;
            v.getTaskCompletionBlockers = (...args: unknown[]) =>
              orig.apply(v, args)
                .filter((b: any) => b.code !== 'exception_pool_pending')
                .concat([{ code: 'exception_pool_pending', count: '<b>x</b>' }]);
          }
        },
      });
    });
    await open(page, url('T014'));
    const row = page.locator(`${ROWS}[data-cond="exception-pool"]`);
    await expect(row).toHaveAttribute('data-status', 'unmet');
    const value = row.locator('.next-step-cond-value');
    await expect(value).toContainText('<b>x</b>');
    await expect(value.locator('b')).toHaveCount(0);
    await expect(row.locator('.next-step-cond-label b')).toHaveCount(0);
    await expect(page.locator(`${CARD} .next-step-group-title b`)).toHaveCount(0);
  });
});

test.describe('Issue #1438 -- next-step condition rows: extraHtml regression guard', () => {
  test('(c) the iaa-computed retry control is still a real <button> inside its row (extraHtml stays raw)', async ({ page }) => {
    await open(page, url('T018'));
    const retry = page.locator(`${ROWS}[data-cond="iaa-computed"] #retryIaaComputationBtn`);
    await expect(retry).toHaveCount(1);
    expect(await retry.evaluate((el) => el.tagName)).toBe('BUTTON');
    await expect(page.getByRole('button', { name: /重新計算|重試|Retry/ })).toBeVisible();
  });
});
