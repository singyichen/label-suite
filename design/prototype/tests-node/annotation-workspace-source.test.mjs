/* Static source gate over pages/annotation/annotation-workspace.config.js
 * (migrated by issue #1059 group 2 out of two Playwright specs).
 *
 * Grouped by the scanned artifact, not by originating spec: every case here
 * is an occurrence/ban-word scan over the same one config file, which is also
 * the only artifact a mutation has to touch to prove the guard works.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = resolve(HERE, '../pages/annotation/annotation-workspace.config.js');
const source = readFileSync(CONFIG_PATH, 'utf8');

/* ------------------------------------------------------------------ *
 * From tests/annotation/issue-719-review-submit-auto-advance.spec.ts
 *
 * SC-004Y clause 2 (spec 015): the review-submit and arbitration-submit
 * paths MUST derive "what's next" and "where does the list return go" from
 * the SAME two functions, and "which units are actionable" MUST have
 * exactly one implementation in the whole workspace. This is a structural
 * claim -- no sequence of clicks can prove a single shared function is
 * being called from two call sites versus two near-identical copies -- so
 * it is checked by scanning the source file itself.
 *
 * Traceability: specs/annotation/015-annotation-workspace/spec.md SC-004Y
 *   clause 2, FR-081 §3 (list-return view state); issue #719
 * ------------------------------------------------------------------ */
describe('SC-004Y clause 2: one shared next-unit function, one shared list-return builder, one actionable-unit judgement', () => {
  function occurrences(needle) {
    return source.split(needle).length - 1;
  }

  it('findNextActionableReviewUnit( is called exactly once -- both submit handlers must share one call site, not each carry their own copy', () => {
    // A count of 2 would mean handleReviewSubmit() and
    // handleArbitrationSubmit() each grew their own private call instead
    // of sharing one, defeating the point of a single derivation function.
    const count = occurrences('findNextActionableReviewUnit(');
    assert.strictEqual(
      count,
      1,
      `annotation-workspace.config.js must call findNextActionableReviewUnit( exactly once, found ${count}`,
    );
  });

  it("'annotation-list.html?' appears exactly once -- buildListReturnUrl() must stay the sole writer of the list-return URL (FR-081 §3)", () => {
    // Regression floor: it must not grow a second, independently-built
    // query string for either submit path to return to.
    const count = occurrences('annotation-list.html?');
    assert.strictEqual(
      count,
      1,
      `only buildListReturnUrl() may build an annotation-list.html? URL, found ${count} occurrence(s)`,
    );
  });

  it('REVIEW_UNIT_ACTION_PRIORITY does not appear in the config file -- actionable-unit priority must live only in the data layer', () => {
    // Regression floor. The action-rank table belongs exclusively to
    // annotation-workspace.data.js's findNextActionableReviewUnit();
    // config.js may only call it.
    const count = occurrences('REVIEW_UNIT_ACTION_PRIORITY');
    assert.strictEqual(
      count,
      0,
      `REVIEW_UNIT_ACTION_PRIORITY must stay in the data layer, found ${count} occurrence(s) in the config file`,
    );
  });

  it('reviewUnitActionRank does not appear in the config file -- there must be exactly one actionable-rank implementation, in the data layer', () => {
    // Regression floor, same reasoning: a second ranking function in
    // config.js would mean two independent "what's actionable" judgements
    // that can silently drift apart.
    const count = occurrences('reviewUnitActionRank');
    assert.strictEqual(
      count,
      0,
      `reviewUnitActionRank must have exactly one implementation (data layer), found ${count} occurrence(s) in the config file`,
    );
  });
});

/* ------------------------------------------------------------------ *
 * From tests/annotation/issue-929-reviewer-jargon-wording.spec.ts
 *
 * Item 2, source-level half: the raw English word "Reviewer" leaking into
 * Traditional-Chinese i18n text. `reviewCorrectedAnswerLabel` (:155) has no
 * `t('reviewCorrectedAnswerLabel')` call anywhere in the codebase today --
 * it is orphaned i18n text with no rendered element to assert against, so it
 * is guarded only at the source-text level. The rendered half
 * (`reviewCorrectionTitle` -> ws-review-corrected-answer-title) stays in the
 * Playwright spec. The **en** i18n block is intentionally unchanged
 * (`wsHistoryRoleReviewer: 'Reviewer'` etc. are correct English).
 *
 * Traceability: specs/annotation/015-annotation-workspace/spec.md FR-083,
 *   AC-3.45; issue #929
 * ------------------------------------------------------------------ */
describe('Item 2 (source-level): the zh i18n block carries zero raw "Reviewer" occurrences (issue #929)', () => {
  it('the zh: {...} block has zero standalone occurrences of the English word "Reviewer"', () => {
    const zhStart = source.indexOf('zh: {');
    const enStart = source.indexOf('en: {', zhStart);
    assert.ok(zhStart > -1, 'the I18N object must declare a zh: { ... } block');
    assert.ok(
      enStart > zhStart,
      'the I18N object must declare an en: { ... } block after zh: {',
    );

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
    assert.strictEqual(
      occurrences,
      0,
      `the zh i18n block must not contain the raw English word "Reviewer" as a standalone token in any ` +
        `value -- found ${occurrences} occurrence(s). This is the only regression guard for ` +
        'reviewCorrectedAnswerLabel, which no t(...) call currently consumes and therefore has no ' +
        'rendered DOM to assert against.',
    );
  });
});
