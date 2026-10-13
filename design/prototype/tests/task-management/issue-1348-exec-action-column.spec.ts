/*
 * Traceability: issue #1348 (Plan A, maintainer ruling 2026-10-13) -- the overview "execution control"
 * cell (#execStopRow > #publishActionRow) becomes a vertical action column. Clarifies
 * specs/task-management/014-task-detail/spec.md FR-013 (1), FR-022, FR-008a, FR-027 (6); no FR/AC is
 * added or removed. Production code under test: renderPublishActions() in
 * design/prototype/pages/task-management/task-detail.html.
 *
 * Selector contract for Green (the Red spec pins these; Green must not rename them):
 *   #publishActionRow                the action column container (existing id, kept). In every state,
 *                                    including completed, it is the single container of the column.
 *   .exec-action-buttons             button row inside #publishActionRow (every <button>, except
 *                                    #retryIaaComputationBtn, lives here; the first button is the primary CTA).
 *   .exec-action-reasons             light-background "still missing" block inside #publishActionRow.
 *   .exec-action-reasons-title       heading of that block (dry_run: the dryRunNextRoundReason text).
 *   .exec-action-reasons li          one item per unmet reason; each reason text appears exactly once.
 *   #retryIaaComputationBtn          lives inside the IAA reason <li>, never in .exec-action-buttons.
 *   .exec-action-readonly-note       reviewer-only visible line under the buttons (reviewerHint text).
 *   #publishUndeterminedNote         visible note under the buttons when waiting + IAA computed but
 *                                    undetermined (contains 無法判定); only in that state.
 *   Kept ids: publishPoolReason, publishMemberGapReason, publishDryRunReasons, publishCompleteReasons,
 *   publishOfficialRunBtn, publishDryRunBtn, publishCompleteBtn, stopConditionTitle, .exec-stop-main.
 *
 * Fixtures: T018 waiting + IAA failed + pool 0; T013 draft; T014 dry_run_in_progress; T003 / T015 / T016
 * official_run_in_progress; T002 waiting + IAA done (undetermined); T003&status=completed for completed.
 * Every URL carries task_role explicitly.
 */
import { test, expect } from '../fixtures';
import type { Page } from '@playwright/test';

const BASE = '/pages/task-management/task-detail.html';
const url = (task: string, role = 'project_leader', extra = '') => `${BASE}?task_id=${task}&task_role=${role}${extra}`;
const ROW = '#publishActionRow';
const READONLY_TEXT = '僅 project leader 可操作';

async function open(page: Page, target: string, width?: number) {
  if (width) await page.setViewportSize({ width, height: 900 });
  await page.goto(target);
  await expect(page.locator('#loadingSkeleton')).toBeHidden({ timeout: 15000 });
  await expect(page.locator('#overviewPanel')).toBeVisible();
  await expect(page.locator(ROW)).toBeVisible();
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
    const text = await page.locator(ROW).innerText();
    expect(countOf(text, 'IAA 計算失敗')).toBe(1);

    const reasons = page.locator(`${ROW} .exec-action-reasons li`);
    const iaaItem = reasons.filter({ hasText: 'IAA 計算失敗' });
    const poolItem = reasons.filter({ hasText: '正式標記池剩餘 0 筆' });
    await expect(iaaItem).toHaveCount(1);
    await expect(poolItem).toHaveCount(1);
    await expect(iaaItem).not.toContainText('正式標記池');
    await expect(iaaItem.locator('#retryIaaComputationBtn')).toBeVisible();
    await expect(page.locator(`${ROW} .exec-action-buttons #retryIaaComputationBtn`)).toHaveCount(0);
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

  test('T014: dryRunNextRoundReason stays visible as the reasons-list heading, not duplicated (FR-013(1))', async ({ page }) => {
    await open(page, url('T014'));
    const reason = '本回合的標註、必要審核與必要仲裁全部完成後才能新增下一回合';
    expect(countOf(await page.locator(ROW).innerText(), reason)).toBe(1);
    const title = page.locator(`${ROW} .exec-action-reasons .exec-action-reasons-title`);
    await expect(title).toBeVisible();
    await expect(title).toContainText(reason);
    await expect(page.locator(`${ROW} .exec-action-buttons`)).not.toContainText(reason);
    await expect(page.locator(`${ROW} .exec-action-reasons li`).first()).toBeVisible();
    await expect(page.locator(`${ROW} .exec-action-reasons li`).filter({ hasText: reason })).toHaveCount(0);
  });

  for (const task of ['T003', 'T014', 'T015', 'T016']) {
    test(`${task}: reason items do not overlap any button (problem 3)`, async ({ page }) => {
      await open(page, url(task));
      const items = page.locator(`${ROW} .exec-action-reasons li`);
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

  test('T018 at 1100px: the action column is at most 420px wide and does not overflow horizontally', async ({ page }) => {
    await open(page, url('T018'), 1100);
    const m = await page.locator(ROW).evaluate((el) => ({
      width: el.getBoundingClientRect().width,
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
    }));
    expect(m.width).toBeLessThanOrEqual(424);
    expect(m.scrollWidth).toBeLessThanOrEqual(m.clientWidth);
  });

  for (const task of ['T014', 'T015', 'T018']) {
    test(`${task} at 400px: .exec-stop-main keeps >= 120px and the stop-condition heading is one line (problem 7)`, async ({ page }) => {
      await open(page, url(task), 400);
      const main = await page.locator('.exec-stop-main').boundingBox();
      expect(main!.width).toBeGreaterThanOrEqual(120);
      const title = page.locator('#stopConditionTitle');
      await expect(title).toContainText('達標條件');
      const h = await title.evaluate((el) => {
        const s = getComputedStyle(el);
        const fs = parseFloat(s.fontSize);
        const lh = parseFloat(s.lineHeight);
        return { height: el.getBoundingClientRect().height, line: Number.isFinite(lh) ? lh : fs * 1.6 };
      });
      expect(h.height).toBeLessThanOrEqual(h.line * 1.1);
    });
  }

  for (const [label, target] of [
    ['T002', url('T002')],
    ['T001 waiting_iaa_confirmation', url('T001', 'project_leader', '&status=waiting_iaa_confirmation')],
  ] as const) {
    test(`${label}: undetermined note is visible while both buttons stay enabled (problem 5)`, async ({ page }) => {
      await open(page, target);
      const note = page.locator(`${ROW} #publishUndeterminedNote`);
      await expect(note).toBeVisible();
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
      const note = page.locator(`${ROW} .exec-action-readonly-note`);
      await expect(note).toBeVisible();
      await expect(note).toContainText(READONLY_TEXT);
      await expect(page.locator(`${ROW} button`).first()).toHaveAttribute('title', READONLY_TEXT);
      await expect(page.locator(`${ROW} .exec-action-reasons`)).toHaveCount(0);
      await expect(page.locator('#publishCompleteReasons')).toHaveCount(0);
    });
  }

  test('completed: the same action column shows 任務已完成 (plan item 8)', async ({ page }) => {
    await open(page, url('T003', 'project_leader', '&status=completed'));
    await expect(page.locator(ROW)).toContainText('任務已完成');
    await expect(page.locator(ROW)).not.toContainText('此狀態不提供發布操作');
  });
});
