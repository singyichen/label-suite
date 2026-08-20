/* Cross-role lifecycle fixture patch builder (issue #212, PR-A).
 *
 * `buildXRoleSeedPatch(taskId)` returns a patch script string consumable by
 * the existing `patchDataFile()` helper
 * (`../annotation/_workspace-helpers.ts:66-75`): `patchDataFile(page,
 * 'annotation-workspace.data.js', buildXRoleSeedPatch(taskId))`. The script
 * runs AFTER `annotation-workspace.data.js`'s own IIFE has attached its
 * globals (`window.LabelSuiteAnnotationWorkspaceData`), and by load order
 * (`annotation-workspace.html:928-934`: task-list.data.js -> task-
 * detail.data.js -> ... -> annotation-workspace.data.js) it also runs AFTER
 * `window.LabelSuiteTaskListData` / `window.LabelSuiteTaskDetailData` exist.
 * It therefore seeds all three globals the annotation workspace/list pages
 * read from, without touching any file under `pages/`.
 *
 * ── Generator pre-verification (plan ruling #3) ───────────────────────────
 * Read `tests/annotation/annotation-workspace-arbitration.spec.ts` in full
 * before writing this file, to confirm how an arbitrator identity is meant
 * to enter the workspace. Findings:
 *
 * 1. R03 arbitrator URL query-param combination:
 *      role=reviewer & run_type=official_run & reviewer_id=<id>
 *    There is NO `role=arbiter` -- `Role` in `_workspace-helpers.ts:11` is
 *    only `'annotator' | 'reviewer'`. The arbitration layout is a rendering
 *    mode of the ordinary reviewer workspace, triggered when the current
 *    `reviewer_id` is eligible (see #2) AND the review unit is disputed.
 *
 * 2. `can_arbitrate` is NOT a query param -- it is a flag on a roster entry
 *    in `REVIEWER_ROSTER` (`pages/annotation/annotation-workspace.data.js`),
 *    looked up by `identity.reviewerId`:
 *      var REVIEWER_ROSTER = [
 *        { id: 'reviewer_wang', name: '王小明' },
 *        { id: 'reviewer_li', name: '李大華' },
 *        { id: 'reviewer_chen', name: '陳美玲', can_arbitrate: true },
 *      ];                                                          // :132-136
 *      function isArbiterCandidate(taskId, runType, sampleId, identity) {
 *        var entry = REVIEWER_ROSTER.filter(function (r) {
 *          return r.id === identity.reviewerId;
 *        })[0];
 *        if (!entry || !entry.can_arbitrate) return false;
 *        return !getSubmission(taskId, 'reviewer', runType, sampleId, identity);
 *      }                                                            // :1533-1536
 *    i.e. eligibility = (roster flag) AND (not already a reviewer on that
 *    unit). `annotation-workspace-arbitration.spec.ts:51` uses the existing
 *    roster id `reviewer_chen` as its ARBITER constant for exactly this
 *    reason. `REVIEWER_ROSTER` is exported by reference
 *    (`global.LabelSuiteAnnotationWorkspaceData = { ..., REVIEWER_ROSTER:
 *    REVIEWER_ROSTER, ... }`, :1692), so pushing an entry onto
 *    `window.LabelSuiteAnnotationWorkspaceData.REVIEWER_ROSTER` mutates the
 *    same array `isArbiterCandidate` reads. This patch grants the fixture's
 *    R03 identity arbitration eligibility that way, instead of assuming a
 *    URL param exists.
 *
 * 3. Bucket key shape (verified against current source, w5 §2.2 cited
 *    `annotation-workspace.data.js:162-167`; the function now sits at
 *    :167-172 -- a ~5-line drift from intervening edits, shape unchanged):
 *      function submissionBucketKey(taskId, role, runType, identity) {
 *        ...
 *        return taskId + '::' + role + '::' + runType + '::' + annotatorId + '::' + reviewerId;
 *      }                                                            // :167-172
 *      function arbitrationBucketKey(taskId, runType, identity) {
 *        return taskId + '::' + runType + '::' + (identity.annotatorId || DEFAULT_ANNOTATOR_ID);
 *      }                                                            // :1584-1587
 *    `taskId` is the leftmost component of both keys, which is why a unique
 *    `XROLE-*` task_id is sufficient namespace isolation on its own (w5
 *    §2.2) -- no bucket ever needs cleanup code.
 */
import fs from 'fs';
import path from 'path';

type SeedRecord = { id: string; text: string; gold_label: 'positive' | 'negative' | 'neutral' };

/* Lazy-loaded so the sync read happens on first call, not at module import
 * time (bot review, PR #247): Playwright workers import every spec/fixture
 * module up front, so a top-level readFileSync would run during worker
 * bootstrap rather than when a test actually needs the fixture. */
let SEED_RECORDS: SeedRecord[] | undefined;
function loadSeedRecords(): SeedRecord[] {
  if (!SEED_RECORDS) {
    const SEED_PATH = path.join(__dirname, 'xrole-lifecycle-seed.json');
    const loaded: SeedRecord[] = JSON.parse(fs.readFileSync(SEED_PATH, 'utf8'));
    SEED_RECORDS = loaded;
  }
  return SEED_RECORDS;
}

/* w5 §1.2: 2 dry_run records + 3 official_run records; `xr-off-002` is the
 * forced-divergence official sample (R01 approves the annotator's answer,
 * R02 corrects it, so the review unit lands in the dispute pool).
 *
 * The prototype itself never filters `datasetRecords` by run_type (neither
 * `resolveTaskProfile` nor `annotation-list.html`'s row builders do; only
 * the `materializedRuns` count badge is run_type-aware), because no
 * existing seed task carries both runs. The XROLE lifecycle is the first
 * task that does, and the canonical journey audits per-run counts (w4
 * XROLE-07: 2 common dry samples; XROLE-10: 3 assigned official samples),
 * so the patch script scopes the seeded `datasetRecords` to the page's
 * `run_type` query param at seed time (bot review, PR #247). Pages
 * navigated without a `run_type` param see all 5 records. */
export const DRY_RUN_RECORD_IDS = ['xr-dry-001', 'xr-dry-002'];
export const OFFICIAL_RUN_RECORD_IDS = ['xr-off-001', 'xr-off-002', 'xr-off-003'];
export const FORCED_DIVERGENCE_RECORD_ID = 'xr-off-002';

/* Annotator seat plan (w4 §1): the 3 annotators jointly mark both dry
 * samples (XROLE-07 needs 2 common samples × 3 annotators for the IAA
 * gate), while each official record is assigned round-robin to exactly one
 * annotator (w4 §1.1's stated assumption for XROLE-10; 013/014 leave the
 * official assignment algorithm undefined, so the fixture pins one).
 * `annotation-list.html` builds reviewer rows exclusively from
 * `REVIEWER_MOCK_ROWS[taskId]` (buildReviewUnitRows -> getReviewerMockRows,
 * `annotation-list.html:1345-1374`) -- without these rows the reviewer list
 * is empty and the review/dispute/arbitration stages are unreachable (bot
 * review, PR #247), so `buildXRoleSeedPatch` seeds them per record. */
export const DRY_RUN_ANNOTATOR_IDS = ['A01', 'A02', 'A03'];
export const OFFICIAL_RUN_ASSIGNMENTS: Record<string, string> = {
  'xr-off-001': 'A01',
  'xr-off-002': 'A02',
  'xr-off-003': 'A03',
};

/* Mock reviewer rows follow the existing REVIEWER_MOCK_ROWS convention
 * (`annotation-workspace.data.js:394-399`): each row's answers derive from
 * the record's gold answer. The row enumerates the review unit; once an
 * annotator stores a real submission, status/timestamps read from it. */
function buildReviewerMockRows(): Record<string, { annotator: string; answers: { single_label: string } }[]> {
  const rows: Record<string, { annotator: string; answers: { single_label: string } }[]> = {};
  for (const record of loadSeedRecords()) {
    rows[record.id] = DRY_RUN_RECORD_IDS.includes(record.id)
      ? DRY_RUN_ANNOTATOR_IDS.map((annotator) => ({ annotator, answers: { single_label: record.gold_label } }))
      : [{ annotator: OFFICIAL_RUN_ASSIGNMENTS[record.id], answers: { single_label: record.gold_label } }];
  }
  return rows;
}

/* Arbiter roster entry the patch grants can_arbitrate to. Kept distinct from
 * any reviewer_id a scenario uses as R01/R02 -- isArbiterCandidate() also
 * requires the identity NOT already hold a reviewer submission on the unit. */
const ARBITER_REVIEWER_ID = 'R03';

/** Builds a patch script for `patchDataFile(page, 'annotation-workspace.data.js', ...)`
 * that seeds a `taskId`-scoped XROLE task profile: a task-list entry, a
 * task-detail profile (single_label / positive-negative-neutral, the 5
 * fixture records), and an arbiter-eligible roster entry. */
export function buildXRoleSeedPatch(taskId: string): string {
  const id = JSON.stringify(taskId);
  const records = JSON.stringify(loadSeedRecords());
  const dryIds = JSON.stringify(DRY_RUN_RECORD_IDS);
  const mockRows = JSON.stringify(buildReviewerMockRows());
  const arbiterId = JSON.stringify(ARBITER_REVIEWER_ID);

  return `
    var xroleAllRecords = ${records};
    var xroleDryIds = ${dryIds};
    var xroleRunType = new URLSearchParams(window.location.search).get('run_type');
    var xroleRecords = xroleAllRecords;
    if (xroleRunType === 'dry_run' || xroleRunType === 'official_run') {
      xroleRecords = xroleAllRecords.filter(function (r) {
        return (xroleDryIds.indexOf(r.id) !== -1) === (xroleRunType === 'dry_run');
      });
    }

    if (window.LabelSuiteTaskListData && Array.isArray(window.LabelSuiteTaskListData.tasks)) {
      var xroleListEntry = {
        id: ${id},
        nameZh: 'XROLE 跨角色生命週期驗收',
        nameEn: 'XROLE Cross-Role Lifecycle Acceptance',
        sourceFile: 'xrole-lifecycle-seed.json',
        outputTypes: ['single_label'],
        runType: 'official_run',
        status: 'draft',
        updatedAt: '2026-08-19',
        canViewDetail: true,
        isMine: true,
        deletedAt: ''
      };
      var xroleTasks = window.LabelSuiteTaskListData.tasks;
      var xroleListIdx = xroleTasks.findIndex(function (t) { return t.id === ${id}; });
      if (xroleListIdx === -1) { xroleTasks.push(xroleListEntry); } else { xroleTasks[xroleListIdx] = xroleListEntry; }
    }

    if (window.LabelSuiteTaskDetailData && window.LabelSuiteTaskDetailData.profiles) {
      window.LabelSuiteTaskDetailData.profiles[${id}] = {
        taskCategories: ['classification'],
        taskInputTypes: ['single_item'],
        outputs: [{
          type: 'single_label',
          config: {
            label_options: [
              { name: 'positive', color: '#10B981' },
              { name: 'negative', color: '#EC4899' },
              { name: 'neutral', color: '#F59E0B' }
            ]
          }
        }],
        fieldRoleMap: { text: 'input', gold_label: 'output' },
        datasetFileName: 'xrole-lifecycle-seed.json',
        datasetRecords: xroleRecords,
        /* w5 §1.2: 2 dry_run + 3 official_run records; totals match the
         * run-scoped datasetRecords above. */
        materializedRuns: { dry_run: { round: 1, total: 2 }, official_run: { round: 1, total: 3 } }
      };
    }

    if (window.LabelSuiteAnnotationWorkspaceData && window.LabelSuiteAnnotationWorkspaceData.REVIEWER_MOCK_ROWS) {
      window.LabelSuiteAnnotationWorkspaceData.REVIEWER_MOCK_ROWS[${id}] = ${mockRows};
    }

    if (window.LabelSuiteAnnotationWorkspaceData && Array.isArray(window.LabelSuiteAnnotationWorkspaceData.REVIEWER_ROSTER)) {
      var xroleRoster = window.LabelSuiteAnnotationWorkspaceData.REVIEWER_ROSTER;
      if (!xroleRoster.some(function (r) { return r.id === ${arbiterId}; })) {
        xroleRoster.push({ id: ${arbiterId}, name: 'XROLE Arbiter', can_arbitrate: true });
      }
    }
  `;
}
