/**
 * issue #824 (openspec/changes/sticky-review-assignment) -- review
 * assignment is today pure position-over-the-current-roster:
 * getReviewAssignments() (annotation-workspace.data.js:2209) recomputes
 * `roster[index % roster.length]` (official_run) or
 * `roster[sampleOrder.length % roster.length]` (dry_run) from scratch on
 * every call, and getAssignedReviewUnits() (:2261) derives its roster from
 * the task's CURRENT reviewer_ids. Neither consults who has already
 * submitted a review. Two consequences this suite pins as Red:
 *
 *  - A roster edit (or a change to the units set) reshuffles ALREADY
 *    reviewed units onto a different reviewer.
 *  - A reviewer removed from reviewer_ids can no longer retrieve units they
 *    personally reviewed -- getAssignedReviewUnits() filters by
 *    `reviewer_id === reviewerId` against a roster that no longer contains
 *    them, so the result is unconditionally empty.
 *
 * Source spec delta: openspec/changes/sticky-review-assignment/specs/
 *   annotation/015-annotation-workspace/spec.md, FR-093 本版修訂
 *   (issue #824) points 1-5, and its four new (not yet AC-numbered)
 *   Scenarios: 已審單位不因名冊異動而改派 / 離冊審核員對其審過的單位唯讀
 *   可見 / 平均分配只約束尚未被審核的單位 / 試標樣本內任一單位已被審核即
 *   整個樣本黏住.
 * Design: openspec/changes/sticky-review-assignment/design.md D1 (sticky
 *   lookup derived from existing submitted-review buckets, no second
 *   persisted table), D2 (per-unit stickiness for official_run, per-sample
 *   stickiness for dry_run), D4 (`ws-review-off-roster` read-only card,
 *   submit control hidden).
 *
 * tasks.md 1.1's contract does not hardcode any task's total unit count
 * (bullet 7): every test below either builds its own synthetic units array
 * (bullets 1/4/5/6, where the data layer never needs the units to exist in
 * a task's real dataset) or asserts before/after deltas against one real,
 * still-pending T015 unit (bullets 2/3, which need real navigation through
 * annotation-list.html / annotation-workspace.html).
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

interface Unit {
  sample_id: string;
  annotator_id: string;
}

interface TaskDetailProfile {
  reviewerIds?: string[];
}

interface TaskDetailDataWindow {
  LabelSuiteTaskDetailData?: { profiles: Record<string, TaskDetailProfile> };
}

interface ReviewIdentity {
  annotatorId?: string;
  reviewerId?: string;
}

interface WorkspaceData {
  markSampleSubmitted: (
    taskId: string,
    role: string,
    runType: string,
    sampleId: string,
    payload: Record<string, unknown>,
    historySummary: string,
    identity: ReviewIdentity
  ) => void;
  markSampleSaved: (
    taskId: string,
    role: string,
    runType: string,
    sampleId: string,
    payload: Record<string, unknown>,
    historySummary: string,
    identity: ReviewIdentity
  ) => void;
  getAssignedReviewUnits: (taskId: string, runType: string, reviewerId: string, units: Unit[]) => Unit[];
  taskArbiterRoster: (taskId: string) => string[];
  reviewAssignmentRoster: (reviewerIds: string[], arbiterIds: string[]) => string[];
}

interface DataWindow {
  LabelSuiteAnnotationWorkspaceData: WorkspaceData;
}

const TASK_OFFICIAL = 'T015';
const RUN_OFFICIAL = 'official_run';
const TASK_DRY = 'T014';
const RUN_DRY = 'dry_run';
/* Real, still-pending (no reviewer submission seeded) T015 official_run
 * unit -- confirmed against annotation-workspace.data.js's seedReviewFlowDemo
 * `scripts` table: `{ t: 'T015', r: 'official_run', s:
 * 'ofs-04-pending-review', a: 'kioleemg12', v: 'positive' }` carries no `rev`
 * entry at all. Only bullets 2/3 (real navigation) use it; bullets 1/4/5/6
 * use fully synthetic sample/annotator ids instead. */
const OFFICIAL_SAMPLE = 'ofs-04-pending-review';
const OFFICIAL_ANNOTATOR = 'kioleemg12';

/* Same known static-server <script src> flake guard as the sibling
 * review-unit specs (issue #582 lineage). */
test.describe.configure({ retries: 2 });

async function currentRoster(page: Page, taskId: string): Promise<string[]> {
  return page.evaluate((taskId) => {
    const profiles = (window as unknown as TaskDetailDataWindow).LabelSuiteTaskDetailData?.profiles || {};
    return profiles[taskId]?.reviewerIds ? profiles[taskId].reviewerIds!.slice() : [];
  }, taskId);
}

async function setRoster(page: Page, taskId: string, reviewerIds: string[]): Promise<void> {
  await page.evaluate(
    ({ taskId, reviewerIds }) => {
      const profiles = (window as unknown as TaskDetailDataWindow).LabelSuiteTaskDetailData?.profiles;
      if (profiles && profiles[taskId]) profiles[taskId].reviewerIds = reviewerIds;
    },
    { taskId, reviewerIds }
  );
}

async function submitReview(
  page: Page,
  taskId: string,
  runType: string,
  sampleId: string,
  annotatorId: string,
  reviewerId: string,
  payload: Record<string, unknown> = {}
): Promise<void> {
  await page.evaluate(
    ({ taskId, runType, sampleId, annotatorId, reviewerId, payload }) => {
      const data = (window as unknown as DataWindow).LabelSuiteAnnotationWorkspaceData;
      data.markSampleSubmitted(taskId, 'reviewer', runType, sampleId, payload, '', { annotatorId, reviewerId });
    },
    { taskId, runType, sampleId, annotatorId, reviewerId, payload }
  );
}

async function saveDraftReview(
  page: Page,
  taskId: string,
  runType: string,
  sampleId: string,
  annotatorId: string,
  reviewerId: string
): Promise<void> {
  await page.evaluate(
    ({ taskId, runType, sampleId, annotatorId, reviewerId }) => {
      const data = (window as unknown as DataWindow).LabelSuiteAnnotationWorkspaceData;
      data.markSampleSaved(taskId, 'reviewer', runType, sampleId, {}, '', { annotatorId, reviewerId });
    },
    { taskId, runType, sampleId, annotatorId, reviewerId }
  );
}

async function assignedTo(page: Page, taskId: string, runType: string, reviewerId: string, units: Unit[]): Promise<Unit[]> {
  return page.evaluate(
    ({ taskId, runType, reviewerId, units }) => {
      const data = (window as unknown as DataWindow).LabelSuiteAnnotationWorkspaceData;
      return data.getAssignedReviewUnits(taskId, runType, reviewerId, units);
    },
    { taskId, runType, reviewerId, units }
  );
}

async function effectiveAssignmentRoster(page: Page, taskId: string, reviewerIds: string[]): Promise<string[]> {
  return page.evaluate(
    ({ taskId, reviewerIds }) => {
      const data = (window as unknown as DataWindow).LabelSuiteAnnotationWorkspaceData;
      return data.reviewAssignmentRoster(reviewerIds, data.taskArbiterRoster(taskId));
    },
    { taskId, reviewerIds }
  );
}

function hasUnit(units: Unit[], target: Unit): boolean {
  return units.some((u) => u.sample_id === target.sample_id && u.annotator_id === target.annotator_id);
}

async function removeReviewerFromRoster(page: Page, taskId: string, reviewerId: string): Promise<void> {
  await patchDataFile(
    page,
    'task-detail.data.js',
    `
      var profile = window.LabelSuiteTaskDetailData.profiles['${taskId}'];
      profile.reviewerIds = (profile.reviewerIds || []).filter(function (id) { return id !== '${reviewerId}'; });
    `
  );
}

test('official_run: shrinking reviewer_ids (removing a DIFFERENT reviewer) does not move a submitted unit off its submitter', async ({
  page,
}) => {
  await page.goto(buildListUrl({ task_id: TASK_OFFICIAL, role: 'reviewer', run_type: RUN_OFFICIAL }));
  const roster = await currentRoster(page, TASK_OFFICIAL);
  expect(roster.length).toBeGreaterThanOrEqual(3);

  const submitterId = roster[1];
  const filler: Unit = { sample_id: 'sticky-off-a', annotator_id: 'x' };
  const target: Unit = { sample_id: 'sticky-off-b', annotator_id: 'x' };
  const units = [filler, target];

  await submitReview(page, TASK_OFFICIAL, RUN_OFFICIAL, target.sample_id, target.annotator_id, submitterId);

  /* Remove roster[0] -- an earlier member, NOT the submitter. Under today's
   * pure `roster[index % roster.length]` rule this necessarily reassigns
   * target (sorted index 1) to a different roster slot once the roster
   * shrinks; that reassignment is exactly the defect this bullet pins. */
  const shrunk = roster.filter((id) => id !== roster[0]);
  await setRoster(page, TASK_OFFICIAL, shrunk);

  const owned = await assignedTo(page, TASK_OFFICIAL, RUN_OFFICIAL, submitterId, units);
  expect(hasUnit(owned, target)).toBe(true);
});

test('official_run: growing reviewer_ids (adding a reviewer) does not move a submitted unit off its submitter', async ({
  page,
}) => {
  await page.goto(buildListUrl({ task_id: TASK_OFFICIAL, role: 'reviewer', run_type: RUN_OFFICIAL }));
  const roster = await currentRoster(page, TASK_OFFICIAL);
  expect(roster.length).toBeGreaterThanOrEqual(2);

  const submitterId = roster[1];
  const filler: Unit = { sample_id: 'sticky-off-a', annotator_id: 'x' };
  const target: Unit = { sample_id: 'sticky-off-b', annotator_id: 'x' };
  const units = [filler, target];

  await submitReview(page, TASK_OFFICIAL, RUN_OFFICIAL, target.sample_id, target.annotator_id, submitterId);

  /* Prepend a brand-new reviewer id. Every existing member's array slot
   * shifts by one, so target's owner (looked up by its fixed sorted index
   * 1) moves under today's positional rule even though nobody who already
   * held work was removed -- "adding also has no effect" is the second
   * half of this bullet. */
  const grown = ['sticky-off-roster-new-reviewer', ...roster];
  await setRoster(page, TASK_OFFICIAL, grown);

  const owned = await assignedTo(page, TASK_OFFICIAL, RUN_OFFICIAL, submitterId, units);
  expect(hasUnit(owned, target)).toBe(true);
});

test('official_run: a reviewer removed from reviewer_ids can still retrieve/view/navigate to a unit they reviewed', async ({
  page,
}) => {
  const errors = trackPageErrors(page);
  await skipGuidelineModal(page);
  await page.goto(buildListUrl({ task_id: TASK_OFFICIAL, role: 'reviewer', run_type: RUN_OFFICIAL }));

  const roster = await currentRoster(page, TASK_OFFICIAL);
  expect(roster.length).toBeGreaterThan(0);
  const reviewerId = roster[0];

  await submitReview(page, TASK_OFFICIAL, RUN_OFFICIAL, OFFICIAL_SAMPLE, OFFICIAL_ANNOTATOR, reviewerId, {
    previewState: { single_label: { selected: 'negative' } },
    decisions: { single_label: 'modify' },
  });
  await removeReviewerFromRoster(page, TASK_OFFICIAL, reviewerId);

  /* Data layer: getAssignedReviewUnits() called AS the now off-roster
   * reviewer must still return the unit. */
  const assigned = await assignedTo(page, TASK_OFFICIAL, RUN_OFFICIAL, reviewerId, [
    { sample_id: OFFICIAL_SAMPLE, annotator_id: OFFICIAL_ANNOTATOR },
  ]);
  expect(hasUnit(assigned, { sample_id: OFFICIAL_SAMPLE, annotator_id: OFFICIAL_ANNOTATOR })).toBe(true);

  /* annotation-list reviewer view: the row must still be listed. */
  await page.goto(
    buildListUrl({ task_id: TASK_OFFICIAL, role: 'reviewer', run_type: RUN_OFFICIAL, reviewer_id: reviewerId })
  );
  await expect(page.getByTestId('list-review-id').filter({ hasText: OFFICIAL_SAMPLE })).toBeVisible();

  /* Workspace: left-nav must still contain the unit, and the history tab
   * must still open. */
  await page.goto(
    buildWorkspaceUrl({
      task_id: TASK_OFFICIAL,
      sample_id: OFFICIAL_SAMPLE,
      role: 'reviewer',
      run_type: RUN_OFFICIAL,
      reviewer_id: reviewerId,
    })
  );
  await expect(page.locator(`[data-testid="ws-sample-item"][data-sample-id="${OFFICIAL_SAMPLE}"]`)).toBeVisible();

  await page.getByTestId('ws-guideline-tab-history').click();
  await expect(page.getByTestId('ws-history-panel')).toBeVisible();

  assertNoPageErrors(errors);
});

test('official_run: an off-roster reviewer sees no submittable review control, only the read-only off-roster card', async ({
  page,
}) => {
  const errors = trackPageErrors(page);
  await skipGuidelineModal(page);
  await page.goto(buildListUrl({ task_id: TASK_OFFICIAL, role: 'reviewer', run_type: RUN_OFFICIAL }));

  const roster = await currentRoster(page, TASK_OFFICIAL);
  expect(roster.length).toBeGreaterThan(0);
  const reviewerId = roster[0];

  /* A divergent ("modify") decision keeps the unit DISPUTED rather than
   * FINALIZED. Today's reviewUnitBlockReason() (annotation-workspace.
   * config.js:3460) only special-cases ARBITRATION/FINALIZED/EMPTY, so a
   * DISPUTED, non-arbitrable unit is NOT blocked today regardless of
   * roster membership -- this isolates the off-roster gate itself as the
   * thing under test, rather than piggy-backing on the pre-existing
   * FINALIZED block, which would mask this unit either way. */
  await submitReview(page, TASK_OFFICIAL, RUN_OFFICIAL, OFFICIAL_SAMPLE, OFFICIAL_ANNOTATOR, reviewerId, {
    previewState: { single_label: { selected: 'negative' } },
    decisions: { single_label: 'modify' },
  });
  await removeReviewerFromRoster(page, TASK_OFFICIAL, reviewerId);

  await page.goto(
    buildWorkspaceUrl({
      task_id: TASK_OFFICIAL,
      sample_id: OFFICIAL_SAMPLE,
      role: 'reviewer',
      run_type: RUN_OFFICIAL,
      reviewer_id: reviewerId,
    })
  );

  await expect(page.getByTestId('ws-review-submit-btn')).toBeHidden();
  await expect(page.getByTestId('ws-review-off-roster')).toBeVisible();

  assertNoPageErrors(errors);
});

test('official_run: a draft-only (unsubmitted) review does not stick -- the unit still follows plain positional assignment', async ({
  page,
}) => {
  await page.goto(buildListUrl({ task_id: TASK_OFFICIAL, role: 'reviewer', run_type: RUN_OFFICIAL }));
  const roster = await currentRoster(page, TASK_OFFICIAL);
  expect(roster.length).toBeGreaterThanOrEqual(3);

  const draftAuthor = roster[1];
  const filler: Unit = { sample_id: 'sticky-draft-a', annotator_id: 'x' };
  const target: Unit = { sample_id: 'sticky-draft-b', annotator_id: 'x' };
  const units = [filler, target];

  await saveDraftReview(page, TASK_OFFICIAL, RUN_OFFICIAL, target.sample_id, target.annotator_id, draftAuthor);

  const shrunk = roster.filter((id) => id !== roster[0]);
  await setRoster(page, TASK_OFFICIAL, shrunk);

  /* A draft (never submitted) MUST NOT stick: the unit follows the same
   * plain positional recompute as if nothing had been written, so the
   * ORIGINAL author (whose slot moved away) no longer owns it... */
  const ownedByDraftAuthor = await assignedTo(page, TASK_OFFICIAL, RUN_OFFICIAL, draftAuthor, units);
  expect(hasUnit(ownedByDraftAuthor, target)).toBe(false);

  /* ...and whoever the plain positional rule now points to (index 1 in the
   * effective shrunk roster, excluding reserved arbiters) does own it. This
   * assertion is expected to PASS even
   * against today's pre-fix code -- drafts already have zero effect on
   * assignment today, which is exactly the baseline this bullet must keep
   * once stickiness ships. */
  const effectiveRoster = await effectiveAssignmentRoster(page, TASK_OFFICIAL, shrunk);
  const newOwnerId = effectiveRoster[1 % effectiveRoster.length];
  const ownedByNewOwner = await assignedTo(page, TASK_OFFICIAL, RUN_OFFICIAL, newOwnerId, units);
  expect(hasUnit(ownedByNewOwner, target)).toBe(true);
});

test('dry_run: a submitted review on one unit of a sample sticks the WHOLE sample to that reviewer, surviving a roster change', async ({
  page,
}) => {
  await page.goto(buildListUrl({ task_id: TASK_DRY, role: 'reviewer', run_type: RUN_DRY }));
  const roster = await currentRoster(page, TASK_DRY);
  expect(roster.length).toBeGreaterThanOrEqual(3);

  const reviewerId = roster[1];
  const fillerUnit: Unit = { sample_id: 'sticky-dry-a', annotator_id: 'ann-x' };
  const targetSampleUnits: Unit[] = ['ann-a', 'ann-b', 'ann-c'].map((a) => ({
    sample_id: 'sticky-dry-b',
    annotator_id: a,
  }));
  const units = [fillerUnit, ...targetSampleUnits];

  /* Only ONE of the target sample's three units gets a submitted review. */
  await submitReview(page, TASK_DRY, RUN_DRY, 'sticky-dry-b', 'ann-b', reviewerId);

  /* Remove a DIFFERENT, earlier-indexed reviewer -- guaranteed to shift the
   * target sample's positional slot under today's pure per-sample
   * round-robin (getReviewAssignments's dry_run branch), which is exactly
   * the defect under test. */
  const shrunk = roster.filter((id) => id !== roster[0]);
  await setRoster(page, TASK_DRY, shrunk);

  const owned = await assignedTo(page, TASK_DRY, RUN_DRY, reviewerId, units);
  targetSampleUnits.forEach((u) => expect(hasUnit(owned, u)).toBe(true));
});

test('official_run: the even-distribution diff constraint (<=1) applies only to the non-sticky pool, not to already-reviewed units', async ({
  page,
}) => {
  await page.goto(buildListUrl({ task_id: TASK_OFFICIAL, role: 'reviewer', run_type: RUN_OFFICIAL }));
  const roster = (await currentRoster(page, TASK_OFFICIAL)).slice(0, 3);
  expect(roster.length).toBe(3);
  const [ownerA, ownerB, ownerC] = roster;
  await setRoster(page, TASK_OFFICIAL, roster);

  /* Mirrors the spec's own scenario numbers (6 units, 4 already reviewed by
   * the same reviewer, 3-member roster). */
  const stickyUnits: Unit[] = ['sticky-dist-a', 'sticky-dist-b', 'sticky-dist-c', 'sticky-dist-d'].map((s) => ({
    sample_id: s,
    annotator_id: 'x',
  }));
  const poolUnits: Unit[] = ['sticky-dist-e', 'sticky-dist-f'].map((s) => ({ sample_id: s, annotator_id: 'x' }));
  const allUnits = [...stickyUnits, ...poolUnits];

  for (const u of stickyUnits) {
    await submitReview(page, TASK_OFFICIAL, RUN_OFFICIAL, u.sample_id, u.annotator_id, ownerA);
  }

  const ownedByA = await assignedTo(page, TASK_OFFICIAL, RUN_OFFICIAL, ownerA, allUnits);
  const ownedByB = await assignedTo(page, TASK_OFFICIAL, RUN_OFFICIAL, ownerB, allUnits);
  const ownedByC = await assignedTo(page, TASK_OFFICIAL, RUN_OFFICIAL, ownerC, allUnits);

  /* The 4 already-submitted units must stay with their submitter... */
  stickyUnits.forEach((u) => expect(hasUnit(ownedByA, u)).toBe(true));

  /* ...and the <=1 diff constraint applies only to the remaining
   * (non-sticky) 2-unit pool, spread across all 3 roster members. */
  const poolCount = (owned: Unit[]) => poolUnits.filter((u) => hasUnit(owned, u)).length;
  const counts = [poolCount(ownedByA), poolCount(ownedByB), poolCount(ownedByC)];
  expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
});
