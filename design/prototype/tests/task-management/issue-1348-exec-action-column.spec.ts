/*
 * Traceability: issue #1348 (Plan A, maintainer ruling 2026-10-13), retargeted by issue #1403
 * (openspec/changes/task-detail-next-step-card, tasks.md 5.1). The vertical action column and the
 * `.exec-action-reasons` blocks are replaced by the "next step" card (FR-027(4), FR-013(8)); this spec keeps
 * the behaviours #1348 pinned and carries them over to the card contract. Clarifies
 * specs/task-management/014-task-detail/spec.md FR-013 (1), FR-022, FR-008a, FR-027 (6).
 *
 * Card contract used here (see issue-1403-next-step-card.spec.ts for the full list):
 *   #nextStepCard                    the card; #publishActionRow is its header-right button container.
 *   #nextStepDesc                    one-line description (dry_run: the dryRunNextRoundReason text).
 *   #nextStepConditions li.next-step-cond[data-cond]   one row per condition; each reason text appears once.
 *   #retryIaaComputationBtn          lives inside the iaa-computed row, never in #publishActionRow.
 *   .exec-action-readonly-note       reviewer-only visible line under the buttons (reviewerHint text).
 *   #publishUndeterminedNote         id of the iaa-undetermined info row (contains 無法判定); only in that state.
 *
 * Fixtures: T018 waiting + IAA failed + pool 0; T013 draft; T014 dry_run_in_progress; T003 / T015 / T016
 * official_run_in_progress; T002 waiting + IAA done (undetermined); T003&status=completed for completed.
 * Every URL carries task_role explicitly.
 */
import { test, expect } from '../fixtures';
import type { Page } from '@playwright/test';

const BASE = '/pages/task-management/task-detail.html';
const url = (task: string, role = 'project_leader', extra = '') => `${BASE}?task_id=${task}&task_role=${role}${extra}`;
const CARD = '#nextStepCard';
const ROW = `${CARD} #publishActionRow`;
const CONDS = `${CARD} #nextStepConditions`;
const READONLY_TEXT = '僅 project leader 可操作';

async function open(page: Page, target: string, width?: number) {
  if (width) await page.setViewportSize({ width, height: 900 });
  await page.goto(target);
  await expect(page.locator('#loadingSkeleton')).toBeHidden({ timeout: 15000 });
  await expect(page.locator('#overviewPanel')).toBeVisible();
  await expect(page.locator(CARD)).toBeVisible();
}

function resolveBg(page: Page, token: string): Promise<string> {
  return page.evaluate((tok) => {
    const probe = document.createElement('div');
    probe.style.cssText = `position:absolute;background-color:var(${tok})`;
    document.body.appendChild(probe);
    const c = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return c;
  }, token);
}

const countOf = (haystack: string, needle: string) => haystack.split(needle).length - 1;

test.describe('Issue #1348 -- vertical execution action column', () => {
  test('T018: IAA failure reason appears once, pool reason is its own item, retry sits in the IAA item (problem 1, 2)', async ({ page }) => {
    await open(page, url('T018'));
    const text = await page.locator(CONDS).innerText();
    expect(countOf(text, 'IAA 計算失敗')).toBe(1);

    const reasons = page.locator(`${CONDS} li.next-step-cond`);
    const iaaItem = reasons.filter({ hasText: 'IAA 計算失敗' });
    const poolItem = reasons.filter({ hasText: '正式標記池剩餘 0 筆' });
    await expect(iaaItem).toHaveCount(1);
    await expect(poolItem).toHaveCount(1);
    await expect(iaaItem).toHaveAttribute('data-cond', 'iaa-computed');
    await expect(poolItem).toHaveAttribute('data-cond', 'pool');
    await expect(iaaItem).not.toContainText('正式標記池');
    await expect(iaaItem.locator('#retryIaaComputationBtn')).toBeVisible();
    await expect(page.locator(`${ROW} #retryIaaComputationBtn`)).toHaveCount(0);
  });

  for (const task of ['T013', 'T014', 'T015', 'T018']) {
    test(`${task}: every disabled button's aria-describedby resolves to visible reason elements (problem 8)`, async ({ page }) => {
      await open(page, url(task));
      const disabled = page.locator(`${ROW} button:disabled`);
      expect(await disabled.count()).toBeGreaterThan(0);
      const described = await disabled.evaluateAll((buttons) =>
        buttons.map((b) => {
          const ids = (b.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
          return {
            id: b.id,
            ids,
            resolved: ids.map((i) => {
              const el = document.getElementById(i);
              const r = el ? el.getBoundingClientRect() : null;
              return { exists: !!el, visible: !!r && r.width > 0 && r.height > 0, text: el ? el.textContent || '' : '' };
            }),
          };
        }),
      );
      for (const b of described) {
        expect(b.ids.length, `${b.id} has aria-describedby`).toBeGreaterThan(0);
        for (const r of b.resolved) {
          expect(r.exists).toBe(true);
          expect(r.visible).toBe(true);
        }
      }
      if (task === 'T018') {
        const byId = Object.fromEntries(described.map((b) => [b.id, b.resolved.map((r) => r.text).join('|')]));
        expect(byId['publishOfficialRunBtn']).toContain('IAA 計算失敗');
        expect(byId['publishOfficialRunBtn']).toContain('正式標記池剩餘 0 筆');
        expect(byId['publishDryRunBtn']).toContain('IAA 計算失敗');
      }
    });
  }

  test('T014: dryRunNextRoundReason stays visible as the card description, not duplicated (FR-013(1), FR-013(8))', async ({ page }) => {
    await open(page, url('T014'));
    const reason = '本回合的標註、必要審核與必要仲裁全部完成後才能新增下一回合';
    expect(countOf(await page.locator(CARD).innerText(), reason)).toBe(1);
    const desc = page.locator('#nextStepDesc');
    await expect(desc).toBeVisible();
    await expect(desc).toContainText(reason);
    await expect(page.locator(ROW)).not.toContainText(reason);
    await expect(page.locator(`${CONDS} li.next-step-cond`).first()).toBeVisible();
    await expect(page.locator(`${CONDS} li.next-step-cond`).filter({ hasText: reason })).toHaveCount(0);
  });

  for (const task of ['T003', 'T014', 'T015', 'T016']) {
    test(`${task}: reason items do not overlap any button (problem 3)`, async ({ page }) => {
      await open(page, url(task));
      const items = page.locator(`${CONDS} li.next-step-cond`);
      const n = await items.count();
      expect(n).toBeGreaterThan(0);
      const buttons = page.locator(`${ROW} button`);
      const boxes = [] as { x: number; y: number; width: number; height: number }[];
      for (let i = 0; i < (await buttons.count()); i++) {
        const b = await buttons.nth(i).boundingBox();
        if (b) boxes.push(b);
      }
      for (let i = 0; i < n; i++) {
        const li = await items.nth(i).boundingBox();
        expect(li).not.toBeNull();
        for (const b of boxes) {
          const overlapX = li!.x < b.x + b.width && b.x < li!.x + li!.width;
          const overlapY = li!.y < b.y + b.height && b.y < li!.y + li!.height;
          expect(overlapX && overlapY, `reason item ${i} overlaps a button`).toBe(false);
        }
      }
    });
  }

  for (const task of ['T014', 'T018']) {
    test(`${task}: disabled CTA is neutral, not an opacity-faded --color-cta (problem 4)`, async ({ page }) => {
      await open(page, url(task));
      const cta = await resolveBg(page, '--color-cta');
      const disabled = page.locator(`${ROW} button:disabled`);
      expect(await disabled.count()).toBeGreaterThan(0);
      const styles = await disabled.evaluateAll((bs) =>
        bs.map((b) => ({ opacity: getComputedStyle(b).opacity, bg: getComputedStyle(b).backgroundColor })),
      );
      for (const s of styles) {
        expect(s.opacity).toBe('1');
        expect(s.bg).not.toBe(cta);
      }
    });
  }

  for (const [task, width] of [['T018', 1100], ['T014', 400], ['T015', 400], ['T018', 400]] as const) {
    test(`${task} at ${width}px: the card does not overflow horizontally and its title stays visible (problem 7)`, async ({ page }) => {
      await open(page, url(task), width);
      const m = await page.locator(CARD).evaluate((el) => ({
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
        right: el.getBoundingClientRect().right,
      }));
      expect(m.scrollWidth).toBeLessThanOrEqual(m.clientWidth);
      expect(m.right).toBeLessThanOrEqual(width);
      await expect(page.locator('#nextStepTitle')).toBeVisible();
    });
  }

  for (const [label, target] of [
    ['T002', url('T002')],
    ['T001 waiting_iaa_confirmation', url('T001', 'project_leader', '&status=waiting_iaa_confirmation')],
  ] as const) {
    test(`${label}: undetermined note is visible while both buttons stay enabled (problem 5)`, async ({ page }) => {
      await open(page, target);
      const note = page.locator(`${CONDS} #publishUndeterminedNote`);
      await expect(note).toBeVisible();
      await expect(note).toHaveAttribute('data-cond', 'iaa-undetermined');
      await expect(note).toHaveAttribute('data-status', 'info');
      await expect(note).toContainText('無法判定');
      await expect(page.locator('#publishOfficialRunBtn')).toBeEnabled();
      await expect(page.locator('#publishDryRunBtn')).toBeEnabled();
    });
  }

  for (const [task, name] of [
    ['T016', '標記完成'],
    ['T013', '新增試標回合'],
  ] as const) {
    test(`reviewer ${task}: button name follows the state (${name}) (problem 6)`, async ({ page }) => {
      await open(page, url(task, 'reviewer'));
      const btn = page.locator(`${ROW} button`).first();
      await expect(btn).toBeDisabled();
      await expect(btn).toContainText(name);
    });

    test(`reviewer ${task}: visible read-only note under the buttons, title kept, no blocker list (FR-027(6))`, async ({ page }) => {
      await open(page, url(task, 'reviewer'));
      const note = page.locator(`${CARD} .exec-action-readonly-note`);
      await expect(note).toBeVisible();
      await expect(note).toContainText(READONLY_TEXT);
      await expect(page.locator(`${ROW} button`).first()).toHaveAttribute('title', READONLY_TEXT);
      await expect(page.locator(`${CARD} li.next-step-cond`)).toHaveCount(0);
      await expect(page.locator('#publishCompleteReasons')).toHaveCount(0);
    });
  }

  test('completed: the same action column shows 任務已完成 (plan item 8)', async ({ page }) => {
    await open(page, url('T003', 'project_leader', '&status=completed'));
    await expect(page.locator('#nextStepTitle')).toContainText('任務已完成');
    await expect(page.locator(CARD)).not.toContainText('此狀態不提供發布操作');
  });
});
