/**
 * issue #988 -- the three read-only reviewer gates (OFF_ROSTER issue #824,
 * NOT_ASSIGNED issue #921, EMPTY issue #307) each append a "why can't I
 * submit" note directly below the reviewed data card. Today that note is a
 * plain `.content-card` -- the exact same class, and therefore the exact
 * same visual weight, as the data card sitting right above it -- with no
 * heading and no semantic color, so a reviewer can misread system copy as
 * sample content (annotation-workspace.config.js:5218-5268).
 *
 * This Red spec locks four gate-agnostic, DOM-observable contracts the
 * planned Green fix (a shared info-callout renderer, `.guideline-summary`'s
 * soft-blue/ⓘ token, reused across all three gates per DRY) must satisfy,
 * without coupling to any implementation detail (class name, tag name, or
 * whether the three gates share one helper):
 *
 *   (a) the gate's data-testid element is no longer a `.content-card`
 *   (b) that same element gains a distinct child element (the new title)
 *       rather than staying a flat text node
 *   (c) the data-testid stays on the outer visible container (regression
 *       guard: Green must not move it onto some inner wrapper)
 *   (d) the existing i18n note copy (reviewOffRosterNote /
 *       reviewNotAssignedNote / reviewEmptyUnitNote) is unchanged and still
 *       contained in the callout
 *
 * All three fixtures below are reused verbatim from their originating
 * specs (same task/sample/reviewer combinations), per this issue's own
 * instruction to avoid inventing new demo-data-parity surface:
 *   - OFF_ROSTER: issue-824-sticky-review-assignment.spec.ts's "an
 *     off-roster reviewer sees no submittable review control" test (submit
 *     a disputed "modify" review as a roster reviewer, then remove that
 *     reviewer from the roster).
 *   - NOT_ASSIGNED: issue-921-review-assignment-gate.spec.ts's
 *     WANG_OWNED_SAMPLE ('ofs-04-pending-review', assigned to reviewer_wang)
 *     opened by reviewer_li instead.
 *   - EMPTY: issue-307-empty-review-unit-gate.spec.ts's
 *     'ofs-05-not-submitted' opened by reviewer_chen before the annotator
 *     ever submits it.
 */
import { test, expect, type Page } from '@playwright/test';
import {
  buildListUrl,
  buildWorkspaceUrl,
  skipGuidelineModal,
  patchDataFile,
  trackPageErrors,
  assertNoPageErrors,
} from './_workspace-helpers';

/* Same known static-server <script src> flake guard as the sibling
 * review-unit specs (issue #582 lineage). */
test.describe.configure({ retries: 2 });

const TASK = 'T015';
const RUN = 'official_run';

/* ---- OFF_ROSTER fixture: mirrors issue-824-sticky-review-assignment.
 * spec.ts's "official_run: an off-roster reviewer sees no submittable
 * review control" test verbatim (same sample/annotator, same "modify"
 * decision to stay DISPUTED rather than FINALIZED, same roster removal via
 * patchDataFile on task-detail.data.js). */
const OFF_ROSTER_SAMPLE = 'ofs-04-pending-review';
const OFF_ROSTER_ANNOTATOR = 'kioleemg12';

async function currentRoster(page: Page): Promise<string[]> {
  return page.evaluate((taskId) => {
    const profiles = (window as any).LabelSuiteTaskDetailData?.profiles || {};
    return profiles[taskId]?.reviewerIds ? profiles[taskId].reviewerIds.slice() : [];
  }, TASK);
}

async function submitDisputedReview(page: Page, reviewerId: string): Promise<void> {
  await page.evaluate(
    ({ taskId, runType, sampleId, annotatorId, reviewerId }) => {
      const data = (window as any).LabelSuiteAnnotationWorkspaceData;
      data.markSampleSubmitted(
        taskId,
        'reviewer',
        runType,
        sampleId,
        { previewState: { single_label: { selected: 'negative' } }, decisions: { single_label: 'modify' } },
        '',
        { annotatorId, reviewerId }
      );
    },
    { taskId: TASK, runType: RUN, sampleId: OFF_ROSTER_SAMPLE, annotatorId: OFF_ROSTER_ANNOTATOR, reviewerId }
  );
}

async function removeReviewerFromRoster(page: Page, reviewerId: string): Promise<void> {
  await patchDataFile(
    page,
    'task-detail.data.js',
    `
      var profile = window.LabelSuiteTaskDetailData.profiles['${TASK}'];
      profile.reviewerIds = (profile.reviewerIds || []).filter(function (id) { return id !== '${reviewerId}'; });
    `
  );
}

async function gotoOffRosterUnit(page: Page): Promise<Error[]> {
  const errors = trackPageErrors(page);
  await skipGuidelineModal(page);
  await page.goto(buildListUrl({ task_id: TASK, role: 'reviewer', run_type: RUN }));
  const roster = await currentRoster(page);
  const reviewerId = roster[0];
  await submitDisputedReview(page, reviewerId);
  await removeReviewerFromRoster(page, reviewerId);
  await page.goto(
    buildWorkspaceUrl({
      task_id: TASK,
      sample_id: OFF_ROSTER_SAMPLE,
      role: 'reviewer',
      run_type: RUN,
      reviewer_id: reviewerId,
    })
  );
  return errors;
}

/* ---- NOT_ASSIGNED fixture: mirrors issue-921-review-assignment-gate.
 * spec.ts's WANG_OWNED_SAMPLE opened by reviewer_li (on T015's roster, but
 * FR-093's round-robin assigns this unit to reviewer_wang instead). */
const NOT_ASSIGNED_SAMPLE = 'ofs-04-pending-review';
const NOT_ASSIGNED_REVIEWER = 'reviewer_li';

async function gotoNotAssignedUnit(page: Page): Promise<Error[]> {
  const errors = trackPageErrors(page);
  await skipGuidelineModal(page);
  await page.goto(
    buildWorkspaceUrl({
      task_id: TASK,
      sample_id: NOT_ASSIGNED_SAMPLE,
      role: 'reviewer',
      run_type: RUN,
      reviewer_id: NOT_ASSIGNED_REVIEWER,
    })
  );
  return errors;
}

/* ---- EMPTY fixture: mirrors issue-307-empty-review-unit-gate.spec.ts's
 * 'ofs-05-not-submitted' opened by reviewer_chen before the annotator has
 * submitted anything -- no stored submission, no REVIEWER_MOCK_ROWS
 * stand-in, so reviewUnitBlockReason() resolves EMPTY. */
const EMPTY_SAMPLE = 'ofs-05-not-submitted';
const EMPTY_REVIEWER = 'reviewer_chen';

async function gotoEmptyUnit(page: Page): Promise<Error[]> {
  const errors = trackPageErrors(page);
  await skipGuidelineModal(page);
  await page.goto(
    buildWorkspaceUrl({
      task_id: TASK,
      sample_id: EMPTY_SAMPLE,
      role: 'reviewer',
      run_type: RUN,
      reviewer_id: EMPTY_REVIEWER,
    })
  );
  return errors;
}

interface Gate {
  name: string;
  testid: string;
  /* Verbatim i18n note copy (annotation-workspace.config.js:119-121) --
   * (d) below asserts this text is unchanged, not merely non-empty. */
  noteCopy: string;
  goto: (page: Page) => Promise<Error[]>;
}

const GATES: Gate[] = [
  {
    name: 'OFF_ROSTER (issue #824)',
    testid: 'ws-review-off-roster',
    noteCopy: '你已不在本任務的審核員名冊中，可檢視自己審核過的內容與歷程，但無法再提交審核決策。',
    goto: gotoOffRosterUnit,
  },
  {
    name: 'NOT_ASSIGNED (issue #921)',
    testid: 'ws-review-not-assigned',
    noteCopy: '這個審核單位未指派給你，可檢視內容但無法提交審核決策。',
    goto: gotoNotAssignedUnit,
  },
  {
    name: 'EMPTY (issue #307)',
    testid: 'ws-review-empty-unit',
    noteCopy: '此標記員尚未提交此樣本，暫無可審核的內容。',
    goto: gotoEmptyUnit,
  },
];

for (const gate of GATES) {
  test.describe(`issue #988 -- ${gate.name} readonly note callout`, () => {
    test('(a) is no longer styled as a .content-card', async ({ page }) => {
      const errors = await gate.goto(page);
      // Today the callout element IS `.content-card` (same visual weight as
      // the reviewed data card above it) -- this must fail until Green
      // swaps it for a dedicated info-callout class.
      await expect(page.getByTestId(gate.testid)).not.toHaveClass(/content-card/);
      assertNoPageErrors(errors);
    });

    test('(b) contains a distinct title element alongside the note body', async ({ page }) => {
      const errors = await gate.goto(page);
      const callout = page.getByTestId(gate.testid);
      // Today the callout's entire content is a flat text node
      // (`el.textContent = t(...)`) with zero child elements -- there is
      // nothing to be a "title". Green must introduce at least one child
      // element (the heading) distinct from the note body.
      const childElementCount = await callout.locator('*').count();
      expect(
        childElementCount,
        `expected data-testid="${gate.testid}" to contain at least one child element (a title), ` +
          'but it is still a flat text node with no child elements'
      ).toBeGreaterThan(0);
      assertNoPageErrors(errors);
    });

    test('(c) keeps the data-testid on the outer visible container', async ({ page }) => {
      const errors = await gate.goto(page);
      // Regression guard: Green must not relocate the testid onto some
      // inner wrapper once the callout gains internal structure.
      await expect(page.getByTestId(gate.testid)).toBeVisible();
      assertNoPageErrors(errors);
    });

    test('(d) keeps the existing i18n note copy unchanged', async ({ page }) => {
      const errors = await gate.goto(page);
      await expect(page.getByTestId(gate.testid)).toContainText(gate.noteCopy);
      assertNoPageErrors(errors);
    });
  });
}
