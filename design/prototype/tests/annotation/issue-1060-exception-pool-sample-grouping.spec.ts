import { test, expect, type Page } from '@playwright/test';
import { skipGuidelineModal, patchDataFile } from './_workspace-helpers';

/* issue #1060 (OpenSpec change exception-pool-left-column-sample-grouping,
 * task 1.1, RED): FR-095's AC-4.69 v9.1.0 clause -- the project leader's
 * final-exception left column must group pending exception rows by
 * `sampleId`, showing the sample id, that sample's pending-exception count,
 * and `getRecordPreviewText()` once per group header, plus a human-readable
 * `OUTPUT_TYPE_REGISTRY[outKey][state.lang]` output-type label and a
 * textual "待處置"/distinct-from-tri-state pending status per row -- instead
 * of today's `renderExceptionQueueList()` (annotation-workspace.config.js
 * :2436), which stuffs `sampleId + ' · ' + annotatorId` into one
 * `.sample-snippet` and prints the raw `poolItem.outKey` (e.g.
 * `SINGLE_LABEL`) as the row's only secondary text, with no grouping
 * container and no status label at all.
 *
 * Confirmed by reading the current renderExceptionQueueList() (:2436-2473)
 * directly: no `ws-exception-sample-group` testid exists anywhere in the
 * codebase (grep-confirmed), so every group-scoped assertion below fails on
 * a missing element, not a typo; `ws-exception-queue-output` already exists
 * but its `textContent` is `poolItem.outKey` verbatim (:2464), so the UI-02
 * human-readable-label assertions fail on wrong text, not a missing node.
 *
 * --- Decided Red contract (task 2.1's Green implementation is wrong if it
 *     disagrees, not this test) ---
 *   - New testid `ws-exception-sample-group`: one per distinct `sampleId`
 *     among `listReviewPoolItems(taskId, runType).pendingExceptions`,
 *     `data-sample-id` carrying that sample id -- deliberately NOT
 *     `ws-sample-group` (reviewer-only, issue #455/buildSampleGroup()),
 *     per proposal.md's explicit naming instruction.
 *   - New testids `ws-exception-sample-group-id` (exact text = sampleId,
 *     `title` attribute = sampleId for long-id readability),
 *     `ws-exception-sample-group-count` (contains the group's
 *     pending-exception item count as a substring -- exact template text is
 *     Green's choice), `ws-exception-sample-group-snippet` (exact text =
 *     `getRecordPreviewText(record, fieldRoleMap)`'s output, rendered once
 *     per group).
 *   - Existing `ws-exception-queue-item` keeps its existing
 *     `data-sample-id`/`data-annotator-id` attributes and click-to-navigate
 *     behavior unchanged; it additionally gets an `aria-label` that contains
 *     the row's full (possibly visually-truncated) `annotatorId`.
 *   - Existing `ws-exception-queue-output` (already present today) changes
 *     its text from the raw `outKey` to
 *     `OUTPUT_TYPE_REGISTRY[outKey][state.lang]`.
 *   - New testid `ws-exception-queue-status`: a textual pending-status label
 *     per row, required only to differ from `wsStatusPending`'s own text in
 *     the same language (config.js :41/:200, "待標記"/"Pending") -- this
 *     file does not hardcode Green's new copy beyond the zh "待處置" string
 *     proposal.md's own mockup uses verbatim.
 *   - `#sampleListCount` / `ws-exception-queue-item` count stay item-level
 *     (pending-exception count), never the group (sample) count -- the
 *     existing issue #907 contract this change must not regress.
 *
 * Seeding: UI-01/UI-02 use the real seed-at-boot exception
 * (T016/ofm-05-final-exception/kioleemg12/single_label, the ONLY
 * pendingExceptions entry any task/run_type in this worktree's seed
 * produces -- confirmed by issue-907-exception-pool-screen-shell.spec.ts's
 * own header comment). UI-03/UI-04 need shapes this seed cannot produce
 * (two pending outKeys on one sample; a second annotator's exception on a
 * second sample) without driving the full submit -> review -> reject-vote
 * UI flow across a multi-output-type task, so they inject synthetic
 * `pendingExceptions` entries at runtime by wrapping
 * `listReviewPoolItems()` via `patchDataFile()` (never touches
 * annotation-workspace.data.js's seed arrays, and never runs
 * scripts/check-demo-data-parity.sh since no seed file changes). Every
 * injected item's `sampleId` is a REAL T016 dataset record id (so
 * `findRecordById()`/`getRecordPreviewText()` resolve normally) -- only
 * `annotatorId` is synthetic, which `selectSample()` accepts unconditionally
 * for `role=project_leader` (config.js :2324) the same way a real
 * round-robin-assigned annotator would.
 *
 * Traceability: openspec/changes/exception-pool-left-column-sample-grouping/
 *   specs/annotation/015-annotation-workspace/spec.md FR-095 "v9.1.0 新增
 *   （issue #1060）" and AC-4.69's three new v9.1.0 AND clauses; tasks.md
 *   task 1.1.
 */

const TASK = 'T016';
const RUN_TYPE = 'official_run';
const ANNOTATOR = 'kioleemg12';
const SAMPLE_EXCEPTION = 'ofm-05-final-exception'; // pre-seeded final exception at boot
const SAMPLE_SECOND = 'ofm-01-reviewer-corrects-b'; // real T016 record, no seeded exception
const SAMPLE_THIRD = 'ofm-02-reviewer-accepts-a'; // real T016 record, no seeded exception

// Verified verbatim against task-detail.data.js's T016.datasetRecords (grep
// -n "ofm-05-final-exception\|ofm-01-reviewer-corrects-b" -A 2
// task-detail.data.js). fieldRoleMap maps only `text` to `input`, so this is
// the sole source getRecordPreviewText() may read (Data Fairness).
const SAMPLE_PREVIEW_TEXT: Record<string, string> = {
  [SAMPLE_EXCEPTION]: '餐點好吃但服務很糟，價格又偏貴，實在說不上推不推薦。',
  [SAMPLE_SECOND]: '從前菜到甜點每一道都很用心，擺盤精緻、味道也無可挑剔，值得專程前往。',
};

// Verified verbatim against task-config.data.js's OUTPUT_TYPE_REGISTRY
// (grep -n "single_label:\|multi_label:" -A 1 task-config.data.js).
const SINGLE_LABEL_ZH = '單一標籤';
const SINGLE_LABEL_EN = 'Single label';
const MULTI_LABEL_ZH = '多標籤';

/* `_workspace-helpers.ts`'s `Role` type is intentionally `'annotator' |
 * 'reviewer'` only (this task must not edit that shared file), so this
 * local builder mirrors its exact path/query convention for the one role
 * value this screen renders under -- same pattern
 * issue-907-exception-pool-screen-shell.spec.ts's buildProjectLeaderUrl()
 * and issue-913-exception-pool-sticky-owner.spec.ts's own copy use. */
function buildProjectLeaderUrl(sampleId: string, annotatorId: string = ANNOTATOR): string {
  return `/pages/annotation/annotation-workspace.html?task_id=${TASK}&sample_id=${sampleId}&role=project_leader&run_type=${RUN_TYPE}&annotator_id=${annotatorId}`;
}

type ExtraPoolItemSpec = { sampleId: string; annotatorId: string; outKey: string };

/* Wraps `window.LabelSuiteAnnotationWorkspaceData.listReviewPoolItems()` so
 * it concats the given synthetic entries onto T016/official_run's real
 * `pendingExceptions` list -- entirely a runtime patch via patchDataFile(),
 * never a seed-file edit. Must be called BEFORE page.goto(); the underlying
 * page.route() interception applies to every subsequent navigation on this
 * page. `key`/`outputType` mirror `outKey` (matching the "no merge key"
 * shape real single_label/multi_label pool items already carry per
 * getDisputeItems()'s own comment), and the remaining fields carry
 * plausible non-empty values -- none of this test's assertions read them,
 * but a real poolItem always has them populated. */
async function patchExtraExceptions(page: Page, items: ExtraPoolItemSpec[]): Promise<void> {
  const extra = items.map((item) => ({
    taskId: TASK,
    runType: RUN_TYPE,
    sampleId: item.sampleId,
    annotatorId: item.annotatorId,
    outKey: item.outKey,
    key: item.outKey,
    outputType: item.outKey,
    reviewerIds: ['reviewer_wang'],
    arbiterId: 'reviewer_chen',
    reason: 'issue #1060 test fixture reject reason',
    fellAt: '2026-09-29T00:00:00.000Z',
  }));
  await patchDataFile(
    page,
    'annotation-workspace.data.js',
    `
    var data = window.LabelSuiteAnnotationWorkspaceData;
    var orig = data.listReviewPoolItems;
    var extra = ${JSON.stringify(extra)};
    data.listReviewPoolItems = function (taskId, runType) {
      var result = orig(taskId, runType);
      if (taskId === ${JSON.stringify(TASK)} && runType === ${JSON.stringify(RUN_TYPE)}) {
        result.pendingExceptions = result.pendingExceptions.concat(extra);
      }
      return result;
    };
    `
  );
}

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
});

test.describe('issue #1060: exception pool left column sample grouping', () => {
  test('UI-01: total is 1 pending-exception item, no general sample and no annotation-progress text', async ({
    page,
  }) => {
    await page.goto(buildProjectLeaderUrl(SAMPLE_EXCEPTION));

    await expect(page.getByTestId('ws-exception-queue-item')).toHaveCount(1);
    await expect(page.locator('#sampleListCount')).toContainText('1');
    await expect(page.getByTestId('ws-sample-item')).toHaveCount(0);

    const listText = (await page.locator('#sampleList').textContent()) || '';
    expect(listText).not.toContain('待標記');
    expect(listText).not.toContain('已儲存');
    expect(listText).not.toContain('已提交');
  });

  test('UI-02 (zh): sample id and preview text appear once in the group header; row shows annotator, human-readable output type, and a distinct pending status', async ({
    page,
  }) => {
    await page.goto(buildProjectLeaderUrl(SAMPLE_EXCEPTION));

    const group = page.locator(
      `[data-testid="ws-exception-sample-group"][data-sample-id="${SAMPLE_EXCEPTION}"]`
    );
    await expect(group).toHaveCount(1);
    await expect(group.getByTestId('ws-exception-sample-group-id')).toHaveText(SAMPLE_EXCEPTION);
    // "每樣本群組僅呈現一次" -- exactly one group-id / one snippet node task-wide,
    // not merely one inside this group (this task has only one group, so this
    // also proves the header is not duplicated per row).
    await expect(page.getByTestId('ws-exception-sample-group-id')).toHaveCount(1);
    await expect(group.getByTestId('ws-exception-sample-group-snippet')).toHaveText(
      SAMPLE_PREVIEW_TEXT[SAMPLE_EXCEPTION]
    );
    await expect(page.getByTestId('ws-exception-sample-group-snippet')).toHaveCount(1);

    const item = page.getByTestId('ws-exception-queue-item').first();
    await expect(item).toContainText(ANNOTATOR);
    await expect(item.getByTestId('ws-exception-queue-output')).toHaveText(SINGLE_LABEL_ZH);
    await expect(item.getByTestId('ws-exception-queue-status')).toHaveText('待處置');

    const itemText = (await item.textContent()) || '';
    expect(itemText).not.toContain('SINGLE_LABEL');
  });

  test('UI-02 (en): switching language changes output-type and status text; data identifiers stay unchanged', async ({
    page,
  }) => {
    await page.addInitScript(() => window.localStorage.setItem('labelsuite.lang', 'en'));
    await page.goto(buildProjectLeaderUrl(SAMPLE_EXCEPTION));
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');

    const group = page.locator(
      `[data-testid="ws-exception-sample-group"][data-sample-id="${SAMPLE_EXCEPTION}"]`
    );
    // Data identifiers (sampleId, annotatorId) are unaffected by language.
    await expect(group.getByTestId('ws-exception-sample-group-id')).toHaveText(SAMPLE_EXCEPTION);

    const item = page.getByTestId('ws-exception-queue-item').first();
    await expect(item).toContainText(ANNOTATOR);
    await expect(item.getByTestId('ws-exception-queue-output')).toHaveText(SINGLE_LABEL_EN);

    const statusText = (await item.getByTestId('ws-exception-queue-status').textContent())?.trim();
    expect(statusText).toBeTruthy();
    // Must not silently reuse wsStatusPending's English text ("Pending",
    // config.js :200) -- the two states are explicitly required to stay
    // textually distinct (proposal.md, issue #1060).
    expect(statusText).not.toBe('Pending');

    const itemText = (await item.textContent()) || '';
    expect(itemText).not.toContain('SINGLE_LABEL');
  });

  test('UI-03: same-sample multi-outKey grouping, separate-annotator grouping, and preserved per-row data attributes', async ({
    page,
  }) => {
    const SECOND_ANNOTATOR = 'annotator_test_second_1060';
    await patchExtraExceptions(page, [
      // (a) A second pending outKey on the SAME sample + SAME annotator as
      // the real seeded exception -- group count 2, still 2 separate rows.
      { sampleId: SAMPLE_EXCEPTION, annotatorId: ANNOTATOR, outKey: 'multi_label' },
      // (b) A different annotator's exception on a DIFFERENT sample -- its
      // own separate group.
      { sampleId: SAMPLE_SECOND, annotatorId: SECOND_ANNOTATOR, outKey: 'single_label' },
    ]);
    await page.goto(buildProjectLeaderUrl(SAMPLE_EXCEPTION));

    // Group count (samples) and item count (pending exceptions) are two
    // different counts: 2 groups, 3 items. Top total stays item-level.
    await expect(page.getByTestId('ws-exception-queue-item')).toHaveCount(3);
    await expect(page.getByTestId('ws-exception-sample-group')).toHaveCount(2);
    await expect(page.locator('#sampleListCount')).toContainText('3');

    const group1 = page.locator(
      `[data-testid="ws-exception-sample-group"][data-sample-id="${SAMPLE_EXCEPTION}"]`
    );
    await expect(group1.getByTestId('ws-exception-sample-group-count')).toContainText('2');
    const group1Items = group1.getByTestId('ws-exception-queue-item');
    await expect(group1Items).toHaveCount(2);

    // Both pending outKeys for this unit remain visible -- neither dropped
    // by grouping -- and neither row merges into the other.
    const group1OutputTexts = (
      await group1Items.evaluateAll((nodes) =>
        nodes.map((node) => node.querySelector('[data-testid="ws-exception-queue-output"]')?.textContent?.trim())
      )
    ).sort();
    expect(group1OutputTexts).toEqual([MULTI_LABEL_ZH, SINGLE_LABEL_ZH].sort());
    for (let i = 0; i < (await group1Items.count()); i += 1) {
      await expect(group1Items.nth(i)).toHaveAttribute('data-sample-id', SAMPLE_EXCEPTION);
      await expect(group1Items.nth(i)).toHaveAttribute('data-annotator-id', ANNOTATOR);
    }

    const group2 = page.locator(
      `[data-testid="ws-exception-sample-group"][data-sample-id="${SAMPLE_SECOND}"]`
    );
    await expect(group2.getByTestId('ws-exception-sample-group-count')).toContainText('1');
    const group2Item = group2.getByTestId('ws-exception-queue-item');
    await expect(group2Item).toHaveCount(1);
    await expect(group2Item).toHaveAttribute('data-sample-id', SAMPLE_SECOND);
    await expect(group2Item).toHaveAttribute('data-annotator-id', SECOND_ANNOTATOR);

    // Clicking a row still navigates to exactly that sample_id x
    // annotator_id unit -- the pre-existing ws-exception-queue-item click
    // contract (issue #907) must survive grouping.
    await group2Item.click();
    const crumb = page.locator('#entryBreadcrumb [aria-current="page"]');
    await expect(crumb).toContainText(SAMPLE_SECOND);
    await expect(crumb).toContainText(SECOND_ANNOTATOR);
  });

  test('UI-04: long IDs stay readable via title/aria-label, rows are keyboard reachable, current state is shown by an attribute not color alone', async ({
    page,
  }) => {
    const LONG_ANNOTATOR = 'annotator_with_an_unusually_long_account_identifier_for_overflow_testing_1060';
    await patchExtraExceptions(page, [{ sampleId: SAMPLE_THIRD, annotatorId: LONG_ANNOTATOR, outKey: 'single_label' }]);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(buildProjectLeaderUrl(SAMPLE_EXCEPTION));

    const longGroup = page.locator(
      `[data-testid="ws-exception-sample-group"][data-sample-id="${SAMPLE_THIRD}"]`
    );
    await expect(longGroup.getByTestId('ws-exception-sample-group-id')).toHaveAttribute('title', SAMPLE_THIRD);

    const longItem = longGroup.getByTestId('ws-exception-queue-item');
    await expect(longItem).toHaveCount(1);
    const ariaLabel = await longItem.getAttribute('aria-label');
    expect(ariaLabel, 'row aria-label must carry the full annotatorId for AT/no-overflow readability').toBeTruthy();
    expect(ariaLabel).toContain(LONG_ANNOTATOR);

    // No horizontal overflow at desktop width.
    const overflow = await page.locator('#sampleList').evaluate((node) => node.scrollWidth - node.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);

    // Keyboard: Tab-reachable (a real <button>) and Enter selects it.
    await expect(longItem).toHaveJSProperty('tagName', 'BUTTON');
    await longItem.focus();
    await expect(longItem).toBeFocused();
    await page.keyboard.press('Enter');

    // Current-item indication via an attribute, not a computed CSS color.
    const active = page.locator('.sample-item.active');
    await expect(active).toHaveAttribute('data-annotator-id', LONG_ANNOTATOR);
    await expect(active).toHaveAttribute('data-sample-id', SAMPLE_THIRD);
  });

  test('UI-05 (1024px): left and center columns neither overlap nor get clipped', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 900 });
    await page.goto(buildProjectLeaderUrl(SAMPLE_EXCEPTION));

    const overflow = await page.locator('#sampleList').evaluate((node) => node.scrollWidth - node.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);

    const samplesBox = await page.locator('.col-samples').boundingBox();
    const contentBox = await page.locator('.col-content').boundingBox();
    expect(samplesBox, '.col-samples must be visible/measurable at 1024px').not.toBeNull();
    expect(contentBox, '.col-content must be visible/measurable at 1024px').not.toBeNull();
    if (samplesBox && contentBox) {
      expect(samplesBox.width).toBeGreaterThan(0);
      expect(contentBox.width).toBeGreaterThan(0);
      // No overlap: the samples column's right edge sits at or before the
      // content column's left edge.
      expect(samplesBox.x + samplesBox.width).toBeLessThanOrEqual(contentBox.x + 1);
    }
  });

  test('UI-05 (375px): left column follows the existing collapse rule; breadcrumb still identifies the current unit', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(buildProjectLeaderUrl(SAMPLE_EXCEPTION));

    // AC-5.2 (reused, same rule issue-455-workspace-unit-grouping.spec.ts
    // asserts for the reviewer role): the sample column is hidden below
    // 768px.
    await expect(page.locator('.col-samples')).toBeHidden();
    const crumb = page.locator('#entryBreadcrumb [aria-current="page"]');
    await expect(crumb).toContainText(SAMPLE_EXCEPTION);
    await expect(crumb).toContainText(ANNOTATOR);
  });
});
