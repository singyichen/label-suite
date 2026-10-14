import { test, expect } from '../fixtures';
import type { Page } from '@playwright/test';

/*
 * Issue #1127 (non-colour cue), retargeted by issue #1403 (openspec/changes/task-detail-next-step-card,
 * tasks.md 5.1; FR-027(4): icons are only check / circle / info, each with visible text, never colour alone).
 *
 * The stop pills (#stopAgreementPill, #stopAnnotatorPill) and their `[data-stop-pill-cue]` SVG + `.stop-pill-state`
 * word are removed by FR-027(1). What #1127 protected -- met / unmet / informational states being
 * distinguishable without colour -- now lives on the condition rows of #nextStepCard:
 *   - each `li.next-step-cond` has `data-status` (met | unmet | info) and a visible `.next-step-cond-icon`
 *     whose TEXT is the glyph for that status (✓ met, ○ unmet, ⓘ info);
 *   - the three statuses differ in glyph and are never aria-hidden-only: the row keeps its text label;
 *   - IAA appears only as the iaa-advisory (miss) / iaa-undetermined (cannot determine) info rows, and
 *     is absent when the computed alpha meets the target (the old "met" pill state);
 *   - switching language re-renders the card on the same page.
 *
 * Fixtures: T001 draft (met + info rows; one active annotator disabled -> unmet row);
 * T014 persisted waiting round (alpha 0.5882 < 0.80 -> iaa-advisory); same with computeIaaAlpha lifted to 0.91
 * at the data boundary (-> no IAA row); T002 waiting + IAA undetermined (-> iaa-undetermined).
 * No colour assertion belongs here (colours: issue-1403-next-step-card.spec.ts).
 */

const URL_BASE = '/pages/task-management/task-detail.html?task_role=project_leader';
const GLYPH = { met: '✓', unmet: '○', info: 'ⓘ' } as const;
const WAITING = '&status=waiting_iaa_confirmation';

const row = (page: Page, key: string) => page.locator(`#nextStepCard li.next-step-cond[data-cond="${key}"]`);

async function expectGlyph(page: Page, key: string, status: keyof typeof GLYPH) {
  const r = row(page, key);
  await expect(r).toHaveAttribute('data-status', status);
  await expect(r.locator('.next-step-cond-icon')).toHaveText(GLYPH[status]);
  await expect(r.locator('.next-step-cond-icon')).toBeVisible();
  await expect(r.locator('.next-step-cond-label')).toBeVisible();
}

/* Seeds a persisted waiting round (same localStorage mechanism as persistTrialRunState()). */
async function seedMissedRound(page: Page) {
  await page.addInitScript(
    ([key, state]) => window.localStorage.setItem(key as string, JSON.stringify(state)),
    [
      'labelsuite.trialRunState',
      {
        T014: {
          status: 'waiting_iaa_confirmation',
          trialRounds: [
            {
              round: 1, sampleCount: 3, agreement: 0.5882, annotators: 3, std: 0.1, result: 'failed', usedSamples: 3,
              date: '2026-08-22', noteZh: 'QA fixture', noteEn: 'QA fixture', iaaComputationStatus: 'done',
            },
          ],
        },
      },
    ],
  );
}

/* Wraps the shared IAA derivation so a computable alpha clears any target. */
async function liftIaaAlpha(page: Page) {
  await page.addInitScript(() => {
    let data: any;
    Object.defineProperty(window, 'LabelSuiteAnnotationWorkspaceData', {
      configurable: true,
      get: () => data,
      set: (value) => {
        if (value && typeof value.computeIaaAlpha === 'function') {
          const original = value.computeIaaAlpha;
          value.computeIaaAlpha = function (...args: unknown[]) {
            const result = original.apply(this, args);
            return result && result.computable ? { ...result, alpha: 0.91 } : result;
          };
        }
        data = value;
      },
    });
  });
}

/* Drops active annotators below min (3 -> 2) via the real member-management disable action,
   then re-renders the overview (applyLang re-runs it). */
async function makeAnnotatorsShort(page: Page) {
  await page.locator('#workLogPanel').waitFor({ state: 'attached', timeout: 15000 });
  await page.locator('#tabMemberManagement').click();
  const memberRow = page.locator('#memberTableBody tr').filter({ hasText: 'Alex Wang' });
  await memberRow.locator('button:has-text("停用")').click();
  await page.locator('#memberActionConfirmBtn').click();
  await expect(memberRow).toContainText('停用');
  await page.locator('#tabOverview').click();
  await page.evaluate(() => (window as any).applyLang('en'));
  await page.evaluate(() => (window as any).applyLang('zh'));
}

test.describe('next-step card rows carry a non-colour cue (issue #1127 / #1403)', () => {
  test('met, unmet and info rows each show their own glyph text next to the label', async ({ page }) => {
    await page.goto(`${URL_BASE}&task_id=T001`);
    await expectGlyph(page, 'annotators', 'met');
    await expectGlyph(page, 'iaa-later', 'info');
    await makeAnnotatorsShort(page);
    await expectGlyph(page, 'annotators', 'unmet');
    await expectGlyph(page, 'pool', 'met');
  });

  test('annotators met and unmet differ without colour (glyph, data-status and row text)', async ({ page }) => {
    await page.goto(`${URL_BASE}&task_id=T001`);
    const snap = (key: string) =>
      row(page, key).evaluate((el) => ({
        status: el.getAttribute('data-status'),
        glyph: el.querySelector('.next-step-cond-icon')?.textContent?.trim() ?? '',
        text: (el.textContent || '').replace(/\s+/g, ' ').trim(),
      }));
    await expect(row(page, 'annotators')).toBeVisible();
    const met = await snap('annotators');
    await makeAnnotatorsShort(page);
    const unmet = await snap('annotators');
    expect(met.status).toBe('met');
    expect(unmet.status).toBe('unmet');
    expect(unmet.glyph).not.toBe(met.glyph);
    expect(unmet.text).not.toBe(met.text);
  });

  test('IAA miss shows an info advisory row; a met alpha shows no IAA row; undetermined shows its own info row', async ({ page }) => {
    await seedMissedRound(page);
    await page.goto(`${URL_BASE}&task_id=T014${WAITING}`);
    await expectGlyph(page, 'iaa-advisory', 'info');
    await expect(row(page, 'iaa-undetermined')).toHaveCount(0);

    const lifted = await page.context().newPage();
    await seedMissedRound(lifted);
    await liftIaaAlpha(lifted);
    await lifted.goto(`${URL_BASE}&task_id=T014${WAITING}`);
    await expect(lifted.locator('#nextStepCard')).toBeVisible();
    await expect(lifted.locator('#nextStepCard li.next-step-cond[data-cond="iaa-advisory"]')).toHaveCount(0);
    await expect(lifted.locator('#nextStepCard li.next-step-cond[data-cond="iaa-undetermined"]')).toHaveCount(0);

    await page.goto(`${URL_BASE}&task_id=T002`);
    await expectGlyph(page, 'iaa-undetermined', 'info');
    await expect(row(page, 'iaa-advisory')).toHaveCount(0);
  });

  test('en: the card title and glyphs survive a language switch on the same page', async ({ page }) => {
    await page.goto(`${URL_BASE}&task_id=T001`);
    await expectGlyph(page, 'annotators', 'met');
    await page.evaluate(() => (window as any).applyLang('en'));
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('#nextStepTitle')).toHaveText(/^Next step: /);
    await expectGlyph(page, 'annotators', 'met');
    await expectGlyph(page, 'iaa-later', 'info');
    await page.evaluate(() => (window as any).applyLang('zh'));
    await expect(page.locator('#nextStepTitle')).toHaveText(/^下一步：/);
  });
});
