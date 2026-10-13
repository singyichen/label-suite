import { test, expect } from '../fixtures';
import type { Page } from '@playwright/test';

/*
 * Issue #1127: the Overview "stop condition" pills (#stopAgreementPill IAA,
 * #stopAnnotatorPill annotators) used to tell met / unmet / not-computable
 * apart by border and background colour alone -- the pill text ("IAA >= 0.80")
 * was identical in all three states.
 *
 * Contract (colour-independent, deliberately no colour assertions):
 *   - each pill holds a child `[data-stop-pill-cue]` (aria-hidden inline SVG)
 *     whose `data-state` is one of met | unmet | not-computable;
 *   - each pill holds a visible `.stop-pill-state` text giving the state word
 *     (zh-TW 已達標 / 未達標 / 尚無法計算; en Met / Not met / Not computable yet);
 *   - the three states differ in data-state, state word AND full textContent;
 *   - the pre-existing text ("IAA ≥ 0.80") is preserved;
 *   - state derivation is unchanged, and the existing `passed` /
 *     `not-computable` classes stay consistent with data-state (colours are
 *     untouched: this spec only checks the class toggles, not colour values).
 * The annotator pill has only met / unmet. #stopStdPill stays hidden (ignored).
 *
 * Fixtures:
 *   - IAA unmet: T014 (dry-run alpha 0.5882 < 0.80, see issue-489 spec).
 *   - IAA not-computable: T002 / T003 (no alpha derivable from marks).
 *   - IAA met: no seeded task reaches alpha >= target, so the shared
 *     computeIaaAlpha() data function is wrapped at the data boundary
 *     (init script) to lift T014's computable alpha to 0.91.
 *   - Annotator unmet: T014 default (currentAnnotators is null until a
 *     trial round is published).
 *   - Annotator met: T001 &status=draft, then click #publishDryRunBtn, which
 *     sets currentAnnotators = minAnnotators (3).
 */

const URL_BASE = '/pages/task-management/task-detail.html?task_role=project_leader';

type PillState = 'met' | 'unmet' | 'not-computable';

const WORDS = {
  zh: { met: '已達標', unmet: '未達標', 'not-computable': '尚無法計算' },
  en: { met: 'Met', unmet: 'Not met', 'not-computable': 'Not computable yet' },
} as const;

interface PillSnapshot {
  className: string;
  text: string;
  cueState: string | null;
}

async function snapshot(page: Page, id: string): Promise<PillSnapshot> {
  const pill = page.locator(`#${id}`);
  await expect(pill.locator('[data-stop-pill-cue]')).toHaveCount(1);
  return pill.evaluate((el) => ({
    className: el.className,
    text: (el.textContent || '').replace(/\s+/g, ' ').trim(),
    cueState: el.querySelector('[data-stop-pill-cue]')?.getAttribute('data-state') ?? null,
  }));
}

async function expectPill(
  page: Page,
  id: string,
  state: PillState,
  lang: 'zh' | 'en',
  baseText: RegExp,
): Promise<PillSnapshot> {
  const pill = page.locator(`#${id}`);
  const cue = pill.locator('[data-stop-pill-cue]');
  await expect(cue).toHaveCount(1);
  await expect(cue).toHaveAttribute('data-state', state);
  await expect(cue).toHaveAttribute('aria-hidden', 'true');
  expect(await cue.evaluate((el) => el.tagName.toLowerCase())).toBe('svg');

  const word = pill.locator('.stop-pill-state');
  await expect(word).toBeVisible();
  await expect(word).toHaveText(WORDS[lang][state]);
  await expect(pill).toContainText(baseText);

  const snap = await snapshot(page, id);
  /* Existing colour hooks stay consistent with data-state (colours unchanged). */
  expect(snap.className.split(/\s+/).includes('passed')).toBe(state === 'met');
  expect(snap.className.split(/\s+/).includes('not-computable')).toBe(state === 'not-computable');
  return snap;
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

async function useEnglish(page: Page) {
  await page.addInitScript(() => window.localStorage.setItem('labelsuite.lang', 'en'));
}

test.describe('stop pills carry a non-colour cue (issue #1127)', () => {
  test('IAA pill unmet (T014, alpha 0.59 < 0.80) shows unmet cue and word', async ({ page }) => {
    await page.goto(`${URL_BASE}&task_id=T014`);
    await expect(page.locator('#currentAgreementValue')).toHaveText('0.59');
    await expectPill(page, 'stopAgreementPill', 'unmet', 'zh', /IAA ≥ 0\.80/);
  });

  test('IAA pill not-computable (T002, T003) shows not-computable cue and word', async ({ page }) => {
    for (const id of ['T002', 'T003']) {
      await page.goto(`${URL_BASE}&task_id=${id}`);
      await expect(page.locator('#currentAgreementValue')).toHaveText('無法計算');
      await expectPill(page, 'stopAgreementPill', 'not-computable', 'zh', /IAA ≥ 0\.80/);
    }
  });

  test('IAA pill met (alpha lifted above target at the data boundary) shows met cue and word', async ({ page }) => {
    await liftIaaAlpha(page);
    await page.goto(`${URL_BASE}&task_id=T014`);
    /* The wrapper must have reached the pill's derivation (class hook is
       pre-existing), otherwise the "met" assertions below are meaningless. */
    await expect(page.locator('#stopAgreementPill')).toHaveClass(/\bpassed\b/);
    await expectPill(page, 'stopAgreementPill', 'met', 'zh', /IAA ≥ 0\.80/);
  });

  test('annotator pill unmet (T014, currentAnnotators not yet set)', async ({ page }) => {
    await page.goto(`${URL_BASE}&task_id=T014`);
    await expectPill(page, 'stopAnnotatorPill', 'unmet', 'zh', /標記者 ≥ 3/);
  });

  test('annotator pill met after publishing a trial round (T001 draft)', async ({ page }) => {
    await page.goto(`${URL_BASE}&task_id=T001&status=draft`);
    await expectPill(page, 'stopAnnotatorPill', 'unmet', 'zh', /標記者 ≥ 3/);
    await page.locator('#publishDryRunBtn').click();
    await expect(page.locator('#trialRoundTimeline .round-timeline-item')).toHaveCount(1);
    await expectPill(page, 'stopAnnotatorPill', 'met', 'zh', /標記者 ≥ 3/);
  });

  test('IAA pill states are distinguishable without colour (data-state, word, full text)', async ({ page }) => {
    const seen: Record<string, PillSnapshot> = {};

    await page.goto(`${URL_BASE}&task_id=T014`);
    seen.unmet = await snapshot(page, 'stopAgreementPill');
    await page.goto(`${URL_BASE}&task_id=T002`);
    seen['not-computable'] = await snapshot(page, 'stopAgreementPill');

    const lifted = await page.context().newPage();
    await liftIaaAlpha(lifted);
    await lifted.goto(`${URL_BASE}&task_id=T014`);
    await expect(lifted.locator('#stopAgreementPill')).toHaveClass(/\bpassed\b/);
    seen.met = await snapshot(lifted, 'stopAgreementPill');

    const states = Object.keys(seen) as PillState[];
    expect(states.sort()).toEqual(['met', 'not-computable', 'unmet']);
    for (const s of states) expect(seen[s].cueState).toBe(s);
    expect(new Set(states.map((s) => seen[s].cueState)).size).toBe(3);
    expect(new Set(states.map((s) => seen[s].text)).size).toBe(3);
    for (const s of states) expect(seen[s].text).toContain('IAA ≥ 0.80');
    for (const s of states) expect(seen[s].text).toContain(WORDS.zh[s]);
  });

  test('annotator pill met and unmet differ without colour', async ({ page }) => {
    await page.goto(`${URL_BASE}&task_id=T014`);
    const unmet = await snapshot(page, 'stopAnnotatorPill');
    await page.goto(`${URL_BASE}&task_id=T001&status=draft`);
    await page.locator('#publishDryRunBtn').click();
    await expect(page.locator('#trialRoundTimeline .round-timeline-item')).toHaveCount(1);
    const met = await snapshot(page, 'stopAnnotatorPill');

    expect(unmet.cueState).toBe('unmet');
    expect(met.cueState).toBe('met');
    expect(unmet.text).not.toBe(met.text);
    expect(unmet.text).toContain('標記者 ≥ 3');
    expect(met.text).toContain('標記者 ≥ 3');
  });

  test('en: IAA pill shows Not met / Not computable yet', async ({ page }) => {
    await useEnglish(page);
    await page.goto(`${URL_BASE}&task_id=T014`);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expectPill(page, 'stopAgreementPill', 'unmet', 'en', /IAA ≥ 0\.80/);

    await page.goto(`${URL_BASE}&task_id=T002`);
    await expectPill(page, 'stopAgreementPill', 'not-computable', 'en', /IAA ≥ 0\.80/);
  });

  test('en: IAA pill met shows Met', async ({ page }) => {
    await useEnglish(page);
    await liftIaaAlpha(page);
    await page.goto(`${URL_BASE}&task_id=T014`);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expectPill(page, 'stopAgreementPill', 'met', 'en', /IAA ≥ 0\.80/);
  });

  test('en: annotator pill shows Not met, then Met after publishing a trial round', async ({ page }) => {
    await useEnglish(page);
    await page.goto(`${URL_BASE}&task_id=T001&status=draft`);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expectPill(page, 'stopAnnotatorPill', 'unmet', 'en', /annotators ≥ 3/);
    await page.locator('#publishDryRunBtn').click();
    await expect(page.locator('#trialRoundTimeline .round-timeline-item')).toHaveCount(1);
    await expectPill(page, 'stopAnnotatorPill', 'met', 'en', /annotators ≥ 3/);
  });

  test('switching language re-renders the state word on the same page', async ({ page }) => {
    await page.goto(`${URL_BASE}&task_id=T014`);
    await expectPill(page, 'stopAgreementPill', 'unmet', 'zh', /IAA ≥ 0\.80/);
    await page.evaluate(() => (window as any).applyLang('en'));
    await expectPill(page, 'stopAgreementPill', 'unmet', 'en', /IAA ≥ 0\.80/);
  });
});
