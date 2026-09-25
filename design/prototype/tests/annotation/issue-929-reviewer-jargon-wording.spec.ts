import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { dismissGuidelineModal, gotoReviewerWorkspace, skipGuidelineModal } from './_workspace-helpers';

/* Reviewer UI jargon/identifier leakage into zh text (issue #929).
 *
 * The issue originally reported three leaks; the maintainer narrowed scope
 * to exactly two. Item 3 ("無法判定 (Bypass)") is explicitly OUT OF SCOPE,
 * deferred to issue #927 -- this spec does not assert anything about it and
 * does not touch design/prototype/pages/shared/sidebar.js.
 *
 * Item 1 -- submit-blocking toast shows a raw output-type KEY instead of its
 * display name (handleReviewSubmit(), annotation-workspace.config.js:5374):
 *   showToast(t(toastKey).replace('{list}', pendingOutputKeys.join('、')), 'warning');
 * `pendingOutputKeys` holds raw registry keys (`single_label`,
 * `entity_recognition`, ...). A zh-reading reviewer sees an internal
 * snake_case identifier inside an otherwise natural-language sentence. The
 * fix must join `window.OUTPUT_TYPE_REGISTRY[key].zh` (already loaded on
 * this page via task-config.data.js, and already read the same way at
 * annotation-workspace.config.js:5233) instead of the raw key. The `、`
 * separator itself is untouched -- a separate, pre-existing, out-of-scope
 * concern.
 *
 * Item 2 -- the raw English word "Reviewer" leaking into Traditional-Chinese
 * i18n text:
 *   - `reviewCorrectionTitle` (:74) is RENDERED (`t('reviewCorrectionTitle')`
 *     -> `ws-review-corrected-answer-title`, config.js:3468-3469); asserted
 *     via DOM below.
 *   - `reviewCorrectedAnswerLabel` (:155) has no `t('reviewCorrectedAnswerLabel')`
 *     call anywhere in the codebase today (confirmed by grep) -- it is
 *     orphaned/dead i18n text with no rendered element to assert against, so
 *     it is guarded only at the source-text level below, following this
 *     repo's own precedent for that pattern
 *     (issue-766-no-actionable-wording-single-source.spec.ts's
 *     fs.readFileSync + path.resolve(__dirname, ...) idiom).
 *   - The **en** i18n block is intentionally unchanged (`wsHistoryRoleReviewer:
 *     'Reviewer'` etc. are correct English) -- nothing here asserts anything
 *     about the en block.
 *
 * Traceability: specs/annotation/015-annotation-workspace/spec.md FR-083
 * (`toastSelectDecision`'s `{list}` contract: must name every pending outKey,
 * must reuse the same derivation source as the submit-validation check
 * itself -- silent on raw-key-vs-display-name, which is exactly the gap this
 * issue closes) and AC-3.45 (which documents `ws-review-corrected-answer-
 * title` / `reviewCorrectionTitle`, originally introduced by issue #453 /
 * spec 015 v4.32.0). Neither FR/AC mandates a display name over a raw key or
 * forbids "Reviewer" in the zh block today -- this is a Lightweight Path
 * wording clarification (no FR/AC added or removed), not a new requirement.
 */

function gotoT001Official(page: Page) {
  return gotoReviewerWorkspace(page, { task_id: 'T001', sample_id: 'sent-001', run_type: 'official_run' });
}

/* T013 (absa-001) ships entity_recognition + relation_identification +
 * multi_dim -- the multi-output case where the toast must name more than one
 * display name, joined by the (untouched) `、` separator. */
function gotoT013Official(page: Page) {
  return gotoReviewerWorkspace(page, { task_id: 'T013', sample_id: 'absa-001', run_type: 'official_run' });
}

test.describe('Item 1: submit-blocking toast names output types by display name, not raw key (issue #929)', () => {
  test.beforeEach(async ({ page }) => {
    await skipGuidelineModal(page);
  });

  test('T001 (single output): toast shows the zh display name, not the raw key', async ({ page }) => {
    await gotoT001Official(page);
    await dismissGuidelineModal(page);

    const displayName = await page.evaluate(() => {
      const reg = (window as unknown as { OUTPUT_TYPE_REGISTRY: Record<string, { zh: string }> }).OUTPUT_TYPE_REGISTRY;
      return reg.single_label.zh;
    });

    await page.getByTestId('ws-review-submit-btn').click();
    const toast = page.locator('#toastMsg');
    await expect(toast).toContainText(displayName);
    await expect(toast).not.toContainText('single_label');
  });

  test('T013 (3 outputs): submitting with zero decisions names all three output types by display name', async ({
    page,
  }) => {
    await gotoT013Official(page);
    await dismissGuidelineModal(page);

    const displayNames = await page.evaluate(() => {
      const reg = (window as unknown as { OUTPUT_TYPE_REGISTRY: Record<string, { zh: string }> }).OUTPUT_TYPE_REGISTRY;
      return {
        entity_recognition: reg.entity_recognition.zh,
        relation_identification: reg.relation_identification.zh,
        multi_dim: reg.multi_dim.zh,
      };
    });

    await page.getByTestId('ws-review-submit-btn').click();
    const toast = page.locator('#toastMsg');
    await expect(toast).toContainText(displayNames.entity_recognition);
    await expect(toast).toContainText(displayNames.relation_identification);
    await expect(toast).toContainText(displayNames.multi_dim);
    await expect(toast).not.toContainText('entity_recognition');
    await expect(toast).not.toContainText('relation_identification');
    await expect(toast).not.toContainText('multi_dim');
  });

  test('T013 (3 outputs): after deciding one, the toast names only the remaining two by display name', async ({
    page,
  }) => {
    await gotoT013Official(page);
    await dismissGuidelineModal(page);

    const displayNames = await page.evaluate(() => {
      const reg = (window as unknown as { OUTPUT_TYPE_REGISTRY: Record<string, { zh: string }> }).OUTPUT_TYPE_REGISTRY;
      return {
        entity_recognition: reg.entity_recognition.zh,
        relation_identification: reg.relation_identification.zh,
        multi_dim: reg.multi_dim.zh,
      };
    });

    await page.getByTestId('ws-review-row-approve').first().click();
    await page.getByTestId('ws-review-submit-btn').click();

    const toast = page.locator('#toastMsg');
    await expect(toast).toContainText(displayNames.relation_identification);
    await expect(toast).toContainText(displayNames.multi_dim);
    await expect(toast).not.toContainText(displayNames.entity_recognition);
    await expect(toast).not.toContainText('entity_recognition');
    await expect(toast).not.toContainText('relation_identification');
    await expect(toast).not.toContainText('multi_dim');
  });
});

test.describe('Item 2: reviewCorrectionTitle renders without raw "Reviewer" jargon (issue #929)', () => {
  test.beforeEach(async ({ page }) => {
    await skipGuidelineModal(page);
  });

  test('the corrected-answer title reads 審核員修正後答案, not "Reviewer"', async ({ page }) => {
    await gotoT001Official(page);
    await dismissGuidelineModal(page);

    const title = page.getByTestId('ws-review-corrected-answer-title');
    await expect(title).toHaveText('直接修正（審核員修正後答案）');
    await expect(title).not.toContainText('Reviewer');
  });
});

test.describe('Item 2 (source-level): the zh i18n block carries zero raw "Reviewer" occurrences (issue #929)', () => {
  test('the zh: {...} block has zero standalone occurrences of the English word "Reviewer"', () => {
    const configPath = path.resolve(__dirname, '../../pages/annotation/annotation-workspace.config.js');
    const source = fs.readFileSync(configPath, 'utf8');

    const zhStart = source.indexOf('zh: {');
    const enStart = source.indexOf('en: {', zhStart);
    expect(zhStart, 'the I18N object must declare a zh: { ... } block').toBeGreaterThan(-1);
    expect(enStart, 'the I18N object must declare an en: { ... } block after zh: {').toBeGreaterThan(zhStart);

    const zhBlock = source.slice(zhStart, enStart);
    // Word-boundary match, not a plain substring count: the zh block's KEY
    // names legitimately contain "Reviewer" as part of a camelCase code
    // identifier (wsHistoryRoleReviewer, crumbWorkAreaReviewer,
    // finalizedBasisArbitrationReviewer, finalizedBasisExceptionReviewer,
    // exceptionActionAdoptReviewer) -- those are code identifiers, not
    // user-facing jargon leaks, and are out of this issue's two-item scope.
    // \bReviewer\b only matches the word as a standalone token, which is
    // exactly how it leaks into the rendered VALUE strings at
    // reviewCorrectionTitle (:74) and reviewCorrectedAnswerLabel (:155).
    const occurrences = (zhBlock.match(/\bReviewer\b/g) || []).length;

    // Covers BOTH the consumed key (reviewCorrectionTitle, :74) and the
    // orphaned key (reviewCorrectedAnswerLabel, :155) in one assertion,
    // without hardcoding which i18n keys exist -- a drift guard against any
    // future zh value that reintroduces the raw English word.
    expect(
      occurrences,
      `the zh i18n block must not contain the raw English word "Reviewer" as a standalone token in any ` +
        `value -- found ${occurrences} occurrence(s). This is the only regression guard for ` +
        'reviewCorrectedAnswerLabel, which no t(...) call currently consumes and therefore has no ' +
        'rendered DOM to assert against.',
    ).toBe(0);
  });
});
