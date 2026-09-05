import { test, expect, type Page } from '@playwright/test';
import { buildListUrl, buildWorkspaceUrl, skipGuidelineModal } from './_workspace-helpers';

/* sequence_tagging review comparison and label-distribution stats over the
 * span model (issue #581, OpenSpec change seq-tagging-span-workspace).
 *
 * Both consumers still read the retired per-token BIO CompactAnswer:
 *   - compareOutputAnswer() walks the pair list positionally, so retagging
 *     an n-character entity reads as n diffs and a reordered but identical
 *     answer reads as a wholesale rewrite;
 *   - countKeysForRow() counts `pair.tag`, so one 3-character entity is
 *     counted three times and the distribution is written in B-/I- prefixes
 *     the annotator never chose.
 *
 * Traceability: specs/annotation/015-annotation-workspace/spec.md
 *   FR-052, FR-047
 */

type Diff = { key: string; annotator: unknown; reviewer: unknown };
type Comparison = { equal: boolean; diffs: Diff[] };

/* The four pre-annotations sequence-tagging-001 ships, as spans:
 * 台積電 ORG [0,3) · 魏哲家 PER [6,9) · 今天 TIME [9,11) · 台北 LOC [13,15). */
const TSMC = { text: '台積電', label: 'ORG', start: 0, end: 3 };
const TSMC_AS_LOC = { text: '台積電', label: 'LOC', start: 0, end: 3 };
const TAIPEI = { text: '台北', label: 'LOC', start: 13, end: 15 };

function compare(page: Page, annotator: unknown, reviewer: unknown): Promise<Comparison> {
  return page.evaluate(
    (a) =>
      (
        window as unknown as {
          LabelSuiteAnnotationWorkspaceData: {
            compareOutputAnswer: (k: string, x: unknown, y: unknown) => Comparison;
          };
        }
      ).LabelSuiteAnnotationWorkspaceData.compareOutputAnswer('sequence_tagging', a.annotator, a.reviewer),
    { annotator, reviewer }
  );
}

test.describe('sequence_tagging diff over spans', () => {
  test.beforeEach(async ({ page }) => {
    await skipGuidelineModal(page);
    await page.goto(buildWorkspaceUrl({ task_id: 'T006', sample_id: 'sequence-tagging-001' }));
  });

  test('an identical span list reports no diff, in either order', async ({ page }) => {
    expect(await compare(page, [TSMC, TAIPEI], [TSMC, TAIPEI])).toMatchObject({ equal: true, diffs: [] });

    /* Spans are a set keyed by (start, end, label): the array order is a
       rendering detail, not part of the answer. */
    expect(await compare(page, [TSMC, TAIPEI], [TAIPEI, TSMC])).toMatchObject({ equal: true, diffs: [] });
  });

  test('retagging a 3-character entity is 2 diff items, not 3', async ({ page }) => {
    const retagged = await compare(page, [TSMC, TAIPEI], [TSMC_AS_LOC, TAIPEI]);

    expect(retagged.equal).toBe(false);
    /* One removal plus one addition -- the span's length must not inflate
       the count, and the span nobody touched must not appear at all. */
    expect(retagged.diffs).toHaveLength(2);
    expect(retagged.diffs).toEqual(
      expect.arrayContaining([
        { key: expect.any(String), annotator: TSMC, reviewer: null },
        { key: expect.any(String), annotator: null, reviewer: TSMC_AS_LOC },
      ])
    );
  });

  test('dropping a span is one diff item whatever its length', async ({ page }) => {
    const dropped = await compare(page, [TSMC, TAIPEI], [TAIPEI]);

    expect(dropped.equal).toBe(false);
    expect(dropped.diffs).toEqual([{ key: expect.any(String), annotator: TSMC, reviewer: null }]);
  });
});

test.describe('sequence_tagging label distribution', () => {
  test('the stats column counts label types once per span, without BIO prefixes', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: 'T006', role: 'reviewer', run_type: 'official_run' }));

    /* sequence-tagging-001 is the first row; its three annotators each
       carry the same four spans, so every label type is counted 3 times --
       not 9 for the 3-character ORG span, and never as B-ORG / I-ORG. */
    const stats = page.getByTestId('list-review-stats').first();
    await expect(stats).toHaveText('ORG×3 · PER×3 · TIME×3 · LOC×3');
  });
});
