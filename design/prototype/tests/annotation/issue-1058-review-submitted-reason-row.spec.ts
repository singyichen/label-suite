import { test, expect, type Locator, type Page } from '@playwright/test';
import { buildWorkspaceUrl, skipGuidelineModal, trackPageErrors, assertNoPageErrors } from './_workspace-helpers';

/**
 * issue #1058 -- the "你已提交此單位的審核決策" read-only summary card
 * (`data-testid="ws-review-submitted-card"`, built by
 * `buildReviewSubmittedDecisionSection()`, annotation-workspace.config.js
 * :5004) currently concatenates the required reason directly into the same
 * `.rv-finalized-summary-value` span's `textContent` as the decision (e.g.
 * `single_label：無法裁決 理由（必填）：<reason>`), with no structural
 * separation.
 *
 * Direction 2 (maintainer-approved, issue #1058 body): the reason becomes
 * its own `[label, value]` pair -- a new `.rv-finalized-summary-label` span
 * (text = `t('reviewReasonLabel') + '：'`) plus a new
 * `.rv-finalized-summary-value` span -- appended as DIRECT CHILDREN of the
 * `.rv-finalized-summary` section (the same element carrying
 * `data-testid="ws-review-submitted-decision"`), NOT nested inside the
 * existing `.rv-finalized-summary-values` wrapper. The section is a CSS
 * grid (`grid-template-columns: 112px minmax(0,1fr)`,
 * annotation-workspace.html:467-469) with default row-major auto-flow, so
 * the two new direct children land in the grid's next row automatically,
 * left-aligning the reason label under the decision label and the reason
 * value under the decision value column.
 *
 * Fixture (seedReviewFlowDemo() scripts table, annotation-workspace.data.js
 * :3574): T014/dry_run/dry-05-pending-review, annotator A = 'kioleemg12'.
 * reviewer_li's decision is `bypass` (`bypassBy: 'reviewer_li'`, no
 * corrected answer value recorded) with reason '依 [[難以判定時的處理]]，
 * 正負面線索交雜，難以判定情緒傾向為何' -- exactly the scenario quoted in
 * the issue body's repro (single output type, so no outKey prefix on the
 * reason per the issue's own direction-2 note).
 *
 * Traceability: specs/annotation/015-annotation-workspace/spec.md (PATCH
 * pending per issue-dispatch checkpoint, issue #1058).
 */

interface Identity {
  annotatorId?: string;
  reviewerId?: string;
}

interface Submission {
  previewState?: Record<string, { selected?: string }>;
  decisions?: Record<string, string>;
  reasons?: Record<string, string>;
}

interface WorkspaceData {
  getSubmission: (taskId: string, role: string, runType: string, sampleId: string, identity: Identity) => Submission | null;
}

async function getSubmission(
  page: Page,
  taskId: string,
  role: string,
  runType: string,
  sampleId: string,
  identity: Identity
): Promise<Submission | null> {
  return page.evaluate(
    ([t, r, rt, s, id]) =>
      (window as unknown as { LabelSuiteAnnotationWorkspaceData: WorkspaceData }).LabelSuiteAnnotationWorkspaceData
        .getSubmission(t, r, rt, s, id as Identity),
    [taskId, role, runType, sampleId, identity] as const
  );
}

/* Reads a live translation string via the workspace's own `window.t`
 * (exposed at annotation-workspace.config.js:430) instead of hardcoding a
 * guessed literal, so the expected label text always matches whatever the
 * current `state.lang` actually renders. */
async function readI18n(page: Page, key: string): Promise<string> {
  return page.evaluate((k) => (window as unknown as { t: (key: string) => string }).t(k), key);
}

/* Mirrors REVIEW_DECISION_LABEL_KEYS, annotation-workspace.config.js
 * :3358-3362 -- not exposed on `window`, so this is the smallest local copy
 * needed to look up the i18n key for whichever decision the fixture's own
 * stored submission actually reports (never assumed). */
const REVIEW_DECISION_LABEL_KEYS: Record<string, string> = {
  approve: 'reviewApproveLabel',
  modify: 'reviewModifyLabel',
  bypass: 'reviewBypassLabel',
};

/* A locator for an EXACT-text direct child of `scope` carrying `className`
 * -- used both for the pre-existing decision label/value (still exactly one
 * match before and after the fix) and for the reason label/value direction
 * 2 adds as new direct children of the same `.rv-finalized-summary` section
 * (zero matches before the fix, exactly one after). `:text-is()` requires
 * trimmed-text equality, so this never accidentally matches the
 * concatenated pre-fix decision value line. */
function directChildExact(scope: Locator, className: string, text: string): Locator {
  return scope.locator(`> ${className}:text-is(${JSON.stringify(text)})`);
}

const TASK_014 = 'T014';
const RUN_DRY = 'dry_run';
const SAMPLE = 'dry-05-pending-review';
const ANNOTATOR_A = 'kioleemg12'; // seed's `A` -- verified via grep against annotation-workspace.data.js:3476
const REVIEWER_LI = 'reviewer_li';
const OUT_KEY = 'single_label';

const REPRO_URL = buildWorkspaceUrl({
  task_id: TASK_014,
  sample_id: SAMPLE,
  role: 'reviewer',
  run_type: RUN_DRY,
  reviewer_id: REVIEWER_LI,
  annotator_id: ANNOTATOR_A,
});

(['zh', 'en'] as const).forEach((lang) => {
  test(`issue #1058 -- reason row aligns as its own [label, value] grid pair under the decision (${lang})`, async ({
    page,
  }) => {
    const errors = trackPageErrors(page);
    await skipGuidelineModal(page);
    await page.addInitScript((l) => {
      window.localStorage.setItem('labelsuite.lang', l);
    }, lang);

    await page.goto(REPRO_URL);

    const card = page.getByTestId('ws-review-submitted-card');
    await expect(card).toBeVisible();
    const section = page.getByTestId('ws-review-submitted-decision');
    await expect(section).toBeVisible();

    // Ground truth: confirm the fixture's actual stored submission before
    // asserting on it, so expected values are read from the fixture, not
    // guessed.
    const mySubmission = await getSubmission(page, TASK_014, 'reviewer', RUN_DRY, SAMPLE, {
      annotatorId: ANNOTATOR_A,
      reviewerId: REVIEWER_LI,
    });
    expect(mySubmission).not.toBeNull();
    const decision = mySubmission!.decisions?.[OUT_KEY];
    expect(decision).toBeTruthy();
    const rawReason = mySubmission!.reasons?.[OUT_KEY];
    expect(rawReason).toBeTruthy();

    const decisionLabelText = (await readI18n(page, 'reviewSubmittedDecisionLabel')) + '：';
    const reasonLabelText = (await readI18n(page, 'reviewReasonLabel')) + '：';
    const decisionValueLabelText = await readI18n(page, REVIEW_DECISION_LABEL_KEYS[decision!]);

    // The pre-existing decision label is unaffected by this change -- still
    // the section's one-and-only `.rv-finalized-summary-label` direct child
    // today; stays exactly one after the fix too, since the reason label is
    // matched by its own distinct text via `directChildExact`.
    const decisionLabelEl = directChildExact(section, '.rv-finalized-summary-label', decisionLabelText);
    await expect(decisionLabelEl).toHaveCount(1);

    // Today's (pre-fix) concatenated decision+reason line, nested inside
    // `.rv-finalized-summary-values` -- read it to derive the exact
    // "decision only" and "reason only" substrings direction 2 must
    // preserve byte-for-byte once split into separate elements.
    const decisionValueLine = section.locator('.rv-finalized-summary-values .rv-finalized-summary-value').first();
    await expect(decisionValueLine).toBeVisible();
    const decisionFullText = (await decisionValueLine.textContent()) ?? '';
    const reasonIdx = decisionFullText.indexOf(reasonLabelText);
    expect(reasonIdx).toBeGreaterThan(0);
    const decisionOnlyText = decisionFullText.slice(0, reasonIdx).trimEnd();
    const reasonTextFromDom = decisionFullText.slice(reasonIdx + reasonLabelText.length);

    // AC: decision text unchanged -- still `single_label：<decision label>`.
    expect(decisionOnlyText).toBe(`${OUT_KEY}：${decisionValueLabelText}`);
    // AC: reason text unchanged -- matches both the DOM substring parsed
    // above and the fixture's own stored raw reason string.
    expect(reasonTextFromDom).toBe(rawReason);

    // Core Red assertions (issue #1058 direction 2): a reason label/value
    // pair must exist as direct children of `.rv-finalized-summary`,
    // sibling to (not nested inside) `.rv-finalized-summary-values`. Under
    // current (unfixed) code neither element exists at all -- the reason
    // text lives inside `decisionValueLine` above instead.
    const reasonLabelEl = directChildExact(section, '.rv-finalized-summary-label', reasonLabelText);
    await expect(reasonLabelEl).toHaveCount(1);
    const reasonValueEl = directChildExact(section, '.rv-finalized-summary-value', rawReason!);
    await expect(reasonValueEl).toHaveCount(1);

    // Structural guard: the new reason label/value must NOT be nested
    // inside `.rv-finalized-summary-values` (that wrapper still holds only
    // the decision value line).
    const valuesWrapper = section.locator('.rv-finalized-summary-values');
    await expect(valuesWrapper.locator(`:text-is(${JSON.stringify(reasonLabelText)})`)).toHaveCount(0);

    // Left-edge alignment: the reason label's left edge matches the
    // decision label's left edge (both land in the grid's 112px label
    // column); the reason value's left edge matches the decision value's
    // left edge (both land in the grid's content column).
    const decisionLabelBox = await decisionLabelEl.boundingBox();
    const reasonLabelBox = await reasonLabelEl.boundingBox();
    expect(decisionLabelBox).not.toBeNull();
    expect(reasonLabelBox).not.toBeNull();
    expect(Math.abs(reasonLabelBox!.x - decisionLabelBox!.x)).toBeLessThanOrEqual(1);

    const decisionValueBox = await decisionValueLine.boundingBox();
    const reasonValueBox = await reasonValueEl.boundingBox();
    expect(decisionValueBox).not.toBeNull();
    expect(reasonValueBox).not.toBeNull();
    expect(Math.abs(reasonValueBox!.x - decisionValueBox!.x)).toBeLessThanOrEqual(1);

    assertNoPageErrors(errors);
  });
});
