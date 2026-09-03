(function (global) {
  'use strict';

  function text(zh, en) {
    return { zh: zh, en: en };
  }

  /* Annotator work items only: a reviewer's summary and progress are
     derived at render time, so its seed carries neither (reviewWorkItem). */
  function workItem(sampleId, detailZh, detailEn, progress, runType, status) {
    return {
      latestUnfinishedSampleId: sampleId,
      detail: text(detailZh, detailEn),
      progress: progress,
      runType: runType,
      status: status,
    };
  }

  /* issue #501: a reviewer work item declares only what cannot be derived --
     which unit to open, which run it belongs to, its status badge, and which
     reviewer identity enters the workspace. The summary line and the progress
     bar come from the live review-unit state at render time (dashboard.js
     deriveReviewerEntry / annotation-list.html, both over
     computeReviewSummary), and `iaa` is filled in below.

     These seeds used to hand-write the summary too. On T014-T017 that text
     merely duplicated what the formula produced; on T001-T013 it matched
     nothing at all -- '待審 7 個審核單位 · 任務覆蓋率 34%' sat above fifteen
     unit rows that were all 待審. A second, unbound source of truth for
     numbers a formula already owns can only drift. */
  function reviewWorkItem(sampleId, runType, status, reviewerId) {
    return {
      latestUnfinishedSampleId: sampleId,
      runType: runType,
      status: status,
      reviewerId: reviewerId || '',
    };
  }

  /* issue #489/#491/#501: a reviewer summary's IAA is DERIVED
   * (computeIaaAlpha in annotation-workspace.data.js), never a figure typed
   * next to the prose that reports it. The three states stay distinct all
   * the way to formatReviewSummary:
   *
   *   number     -- alpha came out; rendered at 2 decimals
   *   null       -- alpha is defined for this task and could not be derived
   *                 from its data; 「IAA 無法計算」 says so rather than
   *                 letting 0.00 be misread as total disagreement (#491)
   *   undefined  -- nominal alpha is not defined for ANY of this task's
   *                 output types, so the summary says nothing about IAA.
   *                 Claiming it "could not be computed" would assert a
   *                 measurement was attempted (dataset-017 FR-039.4).
   *
   * Which output type to measure over is read from the task's own outputs[]
   * rather than seeded per task: computeIaaAlpha answers
   * `unsupported_output_type` for the ones it does not cover, so the
   * whitelist stays in the data layer and this never needs a per-task
   * branch (Generalization-First). Both scripts load before this one on
   * every page that includes it (dashboard.html, annotation-list.html); the
   * guards below only protect against one being absent entirely. */
  function demoIaaValue(taskId, runType) {
    var workspaceData = global.LabelSuiteAnnotationWorkspaceData;
    var taskData = global.LabelSuiteTaskListData;
    if (!workspaceData || !workspaceData.computeIaaAlpha || !taskData) return undefined;
    var task = null;
    (taskData.tasks || []).forEach(function (candidate) {
      if (candidate.id === taskId) task = candidate;
    });
    if (!task || !Array.isArray(task.outputTypes)) return undefined;

    var defined = task.outputTypes
      .map(function (outKey) { return workspaceData.computeIaaAlpha(taskId, runType, outKey); })
      .filter(function (result) { return result.reason !== 'unsupported_output_type'; });
    if (!defined.length) return undefined;
    var computed = null;
    defined.forEach(function (result) {
      if (computed === null && result.computable) computed = result;
    });
    return computed ? computed.alpha : null;
  }

  /*
   * exampleTaskId is the real task id from task-list.data.js /
   * task-detail.data.js. Navigation always references that id directly
   * instead of duplicating output-type metadata here; each output-type
   * label/badge is resolved from the shared seeds at render time.
   * latestUnfinishedSampleId references the first datasetRecords[] id of
   * the matching profile in task-detail.data.js.
   * annotationTaskType is the independent legacy routing compatibility
   * field required by spec 012 FR-010B1/FR-011B1 (issue #311). It is an
   * explicit per-task seed, never derived from the task outputs, and does
   * not redefine the output-type contract.
   */
  var assignments = [
    {
      exampleTaskId: 'T001',
      annotationTaskType: 'single_sentence_classification',
      annotator: workItem(
        'sent-001',
        '已完成 34% · 今日 21 筆 · 平均速度 3.1',
        '34% Completed · 21 Today · Avg Speed 3.1',
        34,
        'official_run',
        'continue'
      ),
      reviewer: reviewWorkItem('sent-001', 'official_run', 'pending_review', ''),
    },
    {
      exampleTaskId: 'T002',
      annotationTaskType: 'single_sentence_classification',
      annotator: workItem(
        'emo-001',
        '已完成 48% · 今日 17 筆 · 平均速度 3.6',
        '48% Completed · 17 Today · Avg Speed 3.6',
        48,
        'dry_run',
        'resume'
      ),
      reviewer: reviewWorkItem('emo-001', 'dry_run', 'pending_review', ''),
    },
    {
      exampleTaskId: 'T003',
      annotationTaskType: 'single_sentence_classification',
      annotator: workItem(
        'taxonomy-001',
        '已完成 18% · 今日 53 筆 · 平均速度 3.0',
        '18% Completed · 53 Today · Avg Speed 3.0',
        18,
        'official_run',
        'continue'
      ),
      reviewer: reviewWorkItem('taxonomy-001', 'official_run', 'pending_review', ''),
    },
    {
      exampleTaskId: 'T004',
      annotationTaskType: 'single_sentence_va_scoring',
      annotator: workItem(
        'read-001',
        '已完成 61% · 今日 29 筆 · 平均速度 2.9',
        '61% Completed · 29 Today · Avg Speed 2.9',
        61,
        'dry_run',
        'resume'
      ),
      reviewer: reviewWorkItem('read-001', 'dry_run', 'in_progress', ''),
    },
    {
      exampleTaskId: 'T005',
      annotationTaskType: 'single_sentence_va_scoring',
      annotator: workItem(
        'mt-001',
        '已完成 76% · 今日 18 筆 · 平均速度 4.2',
        '76% Completed · 18 Today · Avg Speed 4.2',
        76,
        'dry_run',
        'resume'
      ),
      reviewer: reviewWorkItem('mt-001', 'dry_run', 'in_progress', ''),
    },
    {
      exampleTaskId: 'T006',
      annotationTaskType: 'sequence_labeling',
      annotator: workItem(
        'sequence-tagging-001',
        '已完成 71% · 今日 12 筆 · 平均速度 2.5',
        '71% Completed · 12 Today · Avg Speed 2.5',
        71,
        'official_run',
        'in_progress'
      ),
      reviewer: reviewWorkItem('sequence-tagging-001', 'official_run', 'pending_review', ''),
    },
    {
      exampleTaskId: 'T007',
      annotationTaskType: 'sequence_labeling',
      annotator: workItem(
        'entity-recognition-001',
        '已完成 64% · 今日 31 筆 · 平均速度 2.8',
        '64% Completed · 31 Today · Avg Speed 2.8',
        64,
        'official_run',
        'in_progress'
      ),
      reviewer: reviewWorkItem('entity-recognition-001', 'official_run', 'pending_review', ''),
    },
    {
      exampleTaskId: 'T008',
      annotationTaskType: 'relation_extraction',
      annotator: workItem(
        'rel-001',
        '已完成 45% · 今日 16 筆 · 平均速度 4.8',
        '45% Completed · 16 Today · Avg Speed 4.8',
        45,
        'official_run',
        'resume'
      ),
      reviewer: reviewWorkItem('rel-001', 'official_run', 'pending_review', ''),
    },
    {
      exampleTaskId: 'T009',
      annotationTaskType: 'single_sentence_classification',
      annotator: workItem(
        'sum-001',
        '已完成 37% · 今日 9 筆 · 平均速度 5.4',
        '37% Completed · 9 Today · Avg Speed 5.4',
        37,
        'dry_run',
        'in_progress'
      ),
      reviewer: reviewWorkItem('sum-001', 'dry_run', 'in_progress', ''),
    },
    {
      exampleTaskId: 'T010',
      annotationTaskType: 'relation_extraction',
      annotator: workItem(
        'med-001',
        '已完成 53% · 今日 14 筆 · 平均速度 5.1',
        '53% Completed · 14 Today · Avg Speed 5.1',
        53,
        'official_run',
        'resume'
      ),
      reviewer: reviewWorkItem('med-001', 'official_run', 'in_progress', ''),
    },
    {
      exampleTaskId: 'T011',
      annotationTaskType: 'sentence_pairs',
      annotator: workItem(
        '00183',
        '已完成 82% · 今日 25 筆 · 平均速度 3.4',
        '82% Completed · 25 Today · Avg Speed 3.4',
        82,
        'dry_run',
        'in_progress'
      ),
      reviewer: reviewWorkItem('00183', 'dry_run', 'pending_review', ''),
    },
    {
      exampleTaskId: 'T012',
      annotationTaskType: 'sentence_pairs',
      annotator: workItem(
        'eac8d013',
        '已完成 29% · 今日 8 筆 · 平均速度 5.8',
        '29% Completed · 8 Today · Avg Speed 5.8',
        29,
        'official_run',
        'continue'
      ),
      reviewer: reviewWorkItem('eac8d013', 'official_run', 'pending_review', ''),
    },
    {
      exampleTaskId: 'T013',
      annotationTaskType: 'relation_extraction',
      annotator: workItem(
        'absa-001',
        '已完成 58% · 今日 13 筆 · 平均速度 5.0',
        '58% Completed · 13 Today · Avg Speed 5.0',
        58,
        'official_run',
        'resume'
      ),
      reviewer: reviewWorkItem('absa-001', 'official_run', 'pending_review', ''),
    },
    /* T014-T017: review-flow demo tasks (issue #302). Numbers follow the
       seeded review-state matrix staged at boot by
       annotation-workspace.data.js: pending counts are the review units
       still 待審 (T014=6 of 15, T015=1 of 4, T016=0 of 5, T017=1 of 5)
       and 任務覆蓋 counts the units past 待審 over the review-unit total
       — a coverage count, not a completion count, because a unit past MY
       review is not necessarily finalized (issue #310): T016 sits at
       5 / 5 coverage with 3 units still short of their finalize threshold
       (1 approved + 1 modified + 1 disputed awaiting arbitration), so its
       summary swaps the vacuous 待審 0 for the 未達定稿門檻 3 · 爭議中 1
       breakdown. Every seeded summary here names its subject and its
       denominator unit (issue #452). Reviewer
       sample ids point at each task's first dataset record so the
       quick-review entry lands on the initial reviewer screen, and every
       demo reviewer entry enters as reviewer_chen -- the only
       can_arbitrate reviewer (FR-060) -- so disputed units surface the
       arbitration entry screen instead of staying invisible under the
       default reviewer identity. */
    {
      exampleTaskId: 'T014',
      annotationTaskType: 'single_sentence_classification',
      annotator: workItem(
        'dry-01-all-agree',
        '已完成 100% · 今日 15 筆 · 平均速度 2.4',
        '100% Completed · 15 Today · Avg Speed 2.4',
        100,
        'dry_run',
        'in_progress'
      ),
      reviewer: reviewWorkItem('dry-01-all-agree', 'dry_run', 'pending_review', 'reviewer_chen'),
    },
    {
      exampleTaskId: 'T015',
      annotationTaskType: 'single_sentence_classification',
      annotator: workItem(
        'ofs-05-not-submitted',
        '已完成 80% · 今日 4 筆 · 平均速度 2.7',
        '80% Completed · 4 Today · Avg Speed 2.7',
        80,
        'official_run',
        'continue'
      ),
      reviewer: reviewWorkItem(
        'ofs-01-agree-gold', 'official_run', 'pending_review', 'reviewer_chen'
      ),
    },
    {
      exampleTaskId: 'T016',
      annotationTaskType: 'single_sentence_classification',
      annotator: workItem(
        'ofm-01-reviewer-corrects-b',
        '已完成 100% · 今日 15 筆 · 平均速度 2.9',
        '100% Completed · 15 Today · Avg Speed 2.9',
        100,
        'official_run',
        'in_progress'
      ),
      reviewer: reviewWorkItem(
        'ofm-01-reviewer-corrects-b', 'official_run', 'in_progress', 'reviewer_chen'
      ),
    },
    {
      exampleTaskId: 'T017',
      annotationTaskType: 'single_sentence_classification',
      annotator: workItem(
        'oft-01-final-exception',
        '已完成 100% · 今日 10 筆 · 平均速度 3.2',
        '100% Completed · 10 Today · Avg Speed 3.2',
        100,
        'official_run',
        'in_progress'
      ),
      reviewer: reviewWorkItem(
        'oft-01-final-exception', 'official_run', 'pending_review', 'reviewer_chen'
      ),
    },
  ];

  /* issue #501: the reviewer seeds' one derived field, applied here rather
     than passed into reviewWorkItem() so the rule is stated once instead of
     repeating each task's own id seventeen times. Read at load time, like
     every other seed on this page. */
  assignments.forEach(function (assignment) {
    assignment.reviewer.iaa = demoIaaValue(assignment.exampleTaskId, assignment.reviewer.runType);
  });

  /* Shared export: annotation-list.html reads the same seeds so its task
     info card and the dashboard row agree (spec 015 FR-007C/FR-007D). For a
     reviewer that agreement now rests on both pages running the same
     formula over the same review-unit state rather than on both reading one
     hand-written string; what the seed still supplies is the `iaa` value
     that formula takes as an argument. Published before the dashboard guard
     so pages without LabelSuiteDashboard can still consume it. */
  global.LabelSuiteAssignmentSeeds = assignments;

  var dashboard = global.LabelSuiteDashboard;
  if (!dashboard || !dashboard.data || !dashboard.data.roleLists) return;

  function createRoleEntry(assignment, role) {
    var work = assignment[role];
    return {
      exampleTaskId: assignment.exampleTaskId,
      annotationTaskType: assignment.annotationTaskType,
      latestUnfinishedSampleId: work.latestUnfinishedSampleId,
      detail: work.detail,
      progress: work.progress,
      runType: work.runType,
      status: work.status,
      reviewerId: work.reviewerId,
      iaa: work.iaa,
    };
  }

  dashboard.data.roleLists.annotator = assignments.map(function (assignment) {
    return createRoleEntry(assignment, 'annotator');
  });
  dashboard.data.roleLists.reviewer = assignments.map(function (assignment) {
    return createRoleEntry(assignment, 'reviewer');
  });
}(window));
