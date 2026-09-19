/*
 * Traceability: specs/dataset/017-dataset-analysis-detail/spec.md
 *   FR-012L, AC-3.7
 * issue #835: #iaaMethodSuffix on the sequence_tagging quality panel must
 * always carry the span-level wording. Both panel loaders used to re-apply
 * SIMPLE_IDS across the whole document, so whichever partial fetch resolved
 * last decided the text -- a stats panel landing after the quality panel
 * overwrote sequenceTaggingQuality.methodSuffix with the generic
 * iaaMethodSuffix key. Delaying the stats partial makes that ordering
 * deterministic instead of load-dependent.
 */
import { test, expect } from '@playwright/test';

const DETAIL_URL = '/pages/dataset/dataset-analysis-detail.html?task_id=T103&tab=quality';
const STATS_PARTIAL = '**/dataset-analysis-detail.partials/stats-sequence_tagging.html';

const CASES = [
  { lang: 'en', expected: '— Primary metric (span-level)' },
  { lang: 'zh', expected: '— 主要指標（span 為計算單位）' },
] as const;

for (const { lang, expected } of CASES) {
  test(`keeps the span-level method suffix when the stats panel loads after the quality panel (${lang})`, async ({ page }) => {
    await page.addInitScript((l) => {
      window.localStorage.setItem('labelsuite.lang', l);
    }, lang);
    let releaseStats: () => void = () => {};
    const statsGate = new Promise<void>((resolve) => { releaseStats = resolve; });
    await page.route(STATS_PARTIAL, async (route) => {
      await statsGate;
      await route.continue();
    });

    await page.goto(DETAIL_URL);
    await expect(page.locator('#iaaMethodSuffix')).toHaveText(expected);

    releaseStats();
    await expect(page.locator('#statsPanelMount > *').first()).toBeAttached();

    await expect(page.locator('#iaaMethodSuffix')).toHaveText(expected);
  });
}
