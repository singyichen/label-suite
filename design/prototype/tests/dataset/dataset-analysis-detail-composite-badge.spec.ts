import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

const DETAIL_URL = '/pages/dataset/dataset-analysis-detail.html';

async function gotoQualityWithLang(page: Page, taskId: string, lang: 'zh' | 'en') {
  await page.addInitScript((storedLang: 'zh' | 'en') => {
    window.localStorage.setItem('labelsuite.lang', storedLang);
  }, lang);

  await page.goto(`${DETAIL_URL}?task_id=${taskId}&tab=quality`);
}

test.describe('Dataset analysis detail composite IAA badge math (outputs[] iteration)', () => {
  test('T007: partial-pass composite badge shows x/y with excluded-type suffix and mirrors secondary output cards without a title', async ({ page }) => {
    await gotoQualityWithLang(page, 'T007', 'zh');

    // entity_recognition (fail) + single_label (pass) count toward the gate; free_text is
    // excluded from both numerator and denominator (IAA_GATE_EXCLUDED_TYPES).
    const badge = page.locator('#iaaSummaryBadge');
    await expect(badge).toHaveText('1/2 達標 · 1 型排除');
    await expect(badge).toHaveClass(/badge-fail/);

    // Primary output type (entity_recognition, outputs[0]) is mounted in full, so its own
    // section titles still appear in document order; secondary cards contribute no panel-title.
    const titles = await page.locator('#qualityReady .panel .panel-title').allTextContents();
    expect(titles).toEqual([
      'IAA 報告',
      '一致性最低樣本清單',
      '標記員品質排名',
      '邊界分歧分析',
      '異常偵測',
      '標記員風險評估',
      '標記一致性偏離分析',
    ]);

    // single_label (secondary, pass) renders as an IAA-only card with a type label subtitle.
    const singleLabelCard = page.locator('section[data-output-type="single_label"]');
    await expect(singleLabelCard.locator('.iaa-type-label')).toHaveText('單選標籤');
    await expect(singleLabelCard.locator('.iaa-card-value')).toHaveText('0.85');

    // free_text (secondary, gate-excluded) renders its not-applicable note, not a score card.
    const freeTextCard = page.locator('section[data-output-type="free_text"]');
    await expect(freeTextCard.locator('.iaa-type-label')).toHaveText('自由文字');
    await expect(freeTextCard.locator('.iaa-not-applicable-note')).toBeVisible();
    await expect(freeTextCard.locator('.iaa-score-grid')).toHaveCount(0);
  });

  test('T007: composite badge translates to English without mixed Chinese', async ({ page }) => {
    await gotoQualityWithLang(page, 'T007', 'en');

    await expect(page.locator('#iaaSummaryBadge')).toHaveText('1/2 Passed · 1 type(s) excluded');
    await expect(page.locator('section[data-output-type="single_label"] .iaa-type-label')).toHaveText('Single-label');
    await expect(page.locator('section[data-output-type="free_text"] .iaa-type-label')).toHaveText('Free Text');
  });

  test('T008: single-output small-sample badge appears alongside a fully-passed composite badge', async ({ page }) => {
    await gotoQualityWithLang(page, 'T008', 'zh');

    const badge = page.locator('#iaaSummaryBadge');
    await expect(badge).toHaveText('1/1 達標');
    await expect(badge).toHaveClass(/badge-pass/);

    // n=3 is below IAA_SMALL_SAMPLE_THRESHOLD (5), so the small-sample warning is appended
    // to the primary output type's threshold row.
    await expect(page.locator('#qualityPanelMount .small-sample-badge')).toHaveText('小樣本估計');
  });

  const LIST_RANK_SCOPE: Array<{ taskId: string; type: string; hasBoundary: boolean }> = [
    { taskId: 'T001', type: 'multi_label', hasBoundary: false },
    { taskId: 'T002', type: 'multi_dim', hasBoundary: false },
    { taskId: 'T003', type: 'sequence_tagging', hasBoundary: true },
    { taskId: 'T004', type: 'relation_identification', hasBoundary: false },
    { taskId: 'T005', type: 'single_label', hasBoundary: false },
    { taskId: 'T006', type: 'entity_recognition', hasBoundary: true },
    { taskId: 'T008', type: 'single_dim', hasBoundary: false },
  ];

  for (const { taskId, type, hasBoundary } of LIST_RANK_SCOPE) {
    test(`${taskId} (${type}): exposes low-consistency sample list and annotator quality ranking (FR-035/FR-036 scope covers all types except free_text)`, async ({ page }) => {
      await gotoQualityWithLang(page, taskId, 'zh');

      await expect(page.locator('#qualityPanelMount #lowConsistencyTitle')).toHaveText('一致性最低樣本清單');
      await expect(page.locator('#qualityPanelMount #rankingTitle')).toHaveText('標記員品質排名');

      // Boundary-disagreement analysis stays scoped to entity_recognition + sequence_tagging only
      // (BOUNDARY_DISAGREEMENT_SCOPE, spec.md FR-037) — every other in-scope type must not render it.
      const boundaryCount = await page.locator('#qualityPanelMount #boundaryTitle').count();
      expect(boundaryCount).toBe(hasBoundary ? 1 : 0);
    });
  }

  test('T007: small-sample badge is evaluated per output type, not only outputs[0] — the secondary single_label (n=4) is flagged while the primary entity_recognition (n=12) is not', async ({ page }) => {
    await gotoQualityWithLang(page, 'T007', 'zh');

    const primaryBadges = page.locator('section[aria-labelledby="iaaTitle"] .small-sample-badge');
    await expect(primaryBadges).toHaveCount(0);

    const secondaryBadge = page.locator('section[data-output-type="single_label"] .small-sample-badge');
    await expect(secondaryBadge).toHaveCount(1);
    await expect(secondaryBadge).toHaveText('小樣本估計');
  });

  test('T009: free_text-only task shows a not_applicable badge instead of pass/fail', async ({ page }) => {
    await gotoQualityWithLang(page, 'T009', 'zh');

    const badge = page.locator('#iaaSummaryBadge');
    await expect(badge).toHaveText('不適用');
    await expect(badge).toHaveClass(/badge-neutral/);
    await expect(badge).not.toHaveClass(/badge-pass|badge-fail/);

    await expect(page.locator('#freeTextIaaLead')).toHaveText('不適用—由審核員評估');
    await expect(page.locator('#qualityPanelMount .small-sample-badge')).toHaveCount(0);
  });

  test('T009: not_applicable badge translates to English', async ({ page }) => {
    await gotoQualityWithLang(page, 'T009', 'en');

    await expect(page.locator('#iaaSummaryBadge')).toHaveText('Not applicable');
    await expect(page.locator('#freeTextIaaLead')).toHaveText('Not applicable — assessed by reviewer');
  });

  test('computeCompositeBadge: pending Dry Run state renders "—/{y}" and never a numeric x', async ({ page }) => {
    // No shipped fixture task currently has a counted output type awaiting its first Dry Run,
    // so this exercises the pure badge-math function directly with a synthetic taskMeta —
    // covering the pending-state branch documented at spec.md IAA_PENDING_BADGE_FORMAT.
    await gotoQualityWithLang(page, 'T001', 'zh');

    const zhText = await page.evaluate(() => {
      const taskMeta = {
        outputs: ['multi_label', 'entity_recognition'],
        iaaData: { multi_label: { pass: true, n: 15 } }, // entity_recognition has no entry yet.
      };
      const result = (window as unknown as { computeCompositeBadge: (m: unknown) => { state: string; x: number | null; y: number; excludedCount: number } }).computeCompositeBadge(taskMeta);
      const text = (window as unknown as { compositeBadgeText: (r: unknown) => string }).compositeBadgeText(result);
      return JSON.stringify({ result, text });
    });
    const parsed = JSON.parse(zhText) as { result: { state: string; x: number | null; y: number }; text: string };

    expect(parsed.result.state).toBe('pending');
    expect(parsed.result.x).toBeNull();
    expect(parsed.result.y).toBe(2);
    expect(parsed.text).toBe('—/2 待完成 Dry Run');
  });
});
