(function (global) {
  'use strict';

  function text(zh, en) {
    return { zh: zh, en: en };
  }

  function workItem(
    sampleId,
    detailZh,
    detailEn,
    progress,
    runType,
    status,
    reviewerId
  ) {
    return {
      latestUnfinishedSampleId: sampleId,
      detail: text(detailZh, detailEn),
      progress: progress,
      runType: runType,
      status: status,
      reviewerId: reviewerId || '',
    };
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
      reviewer: workItem(
        'sent-001',
        '待審 7 筆 · 進度 34% · IAA 0.80',
        '7 Pending · 34% Progress · IAA 0.80',
        34,
        'official_run',
        'pending_review'
      ),
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
      reviewer: workItem(
        'emo-001',
        '待審 6 筆 · 進度 48% · IAA 0.76',
        '6 Pending · 48% Progress · IAA 0.76',
        48,
        'dry_run',
        'pending_review'
      ),
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
      reviewer: workItem(
        'taxonomy-001',
        '待審 12 筆 · 進度 18% · IAA 0.81',
        '12 Pending · 18% Progress · IAA 0.81',
        18,
        'official_run',
        'pending_review'
      ),
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
      reviewer: workItem(
        'read-001',
        '待審 5 筆 · 進度 61% · IAA 0.84',
        '5 Pending · 61% Progress · IAA 0.84',
        61,
        'dry_run',
        'in_progress'
      ),
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
      reviewer: workItem(
        'mt-001',
        '待審 8 筆 · 進度 76% · IAA 0.78',
        '8 Pending · 76% Progress · IAA 0.78',
        76,
        'dry_run',
        'in_progress'
      ),
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
      reviewer: workItem(
        'sequence-tagging-001',
        '待審 10 筆 · 進度 71% · IAA 0.79',
        '10 Pending · 71% Progress · IAA 0.79',
        71,
        'official_run',
        'pending_review'
      ),
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
      reviewer: workItem(
        'entity-recognition-001',
        '待審 15 筆 · 進度 64% · IAA 0.83',
        '15 Pending · 64% Progress · IAA 0.83',
        64,
        'official_run',
        'pending_review'
      ),
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
      reviewer: workItem(
        'rel-001',
        '待審 13 筆 · 進度 45% · IAA 0.77',
        '13 Pending · 45% Progress · IAA 0.77',
        45,
        'official_run',
        'pending_review'
      ),
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
      reviewer: workItem(
        'sum-001',
        '待審 4 筆 · 進度 37% · IAA 0.74',
        '4 Pending · 37% Progress · IAA 0.74',
        37,
        'dry_run',
        'in_progress'
      ),
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
      reviewer: workItem(
        'med-001',
        '待審 9 筆 · 進度 53% · IAA 0.79',
        '9 Pending · 53% Progress · IAA 0.79',
        53,
        'official_run',
        'in_progress'
      ),
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
      reviewer: workItem(
        '00183',
        '待審 11 筆 · 進度 82% · IAA 0.82',
        '11 Pending · 82% Progress · IAA 0.82',
        82,
        'dry_run',
        'pending_review'
      ),
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
      reviewer: workItem(
        'eac8d013',
        '待審 5 筆 · 進度 29% · IAA 0.75',
        '5 Pending · 29% Progress · IAA 0.75',
        29,
        'official_run',
        'pending_review'
      ),
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
      reviewer: workItem(
        'absa-001',
        '待審 8 筆 · 進度 58% · IAA 0.80',
        '8 Pending · 58% Progress · IAA 0.80',
        58,
        'official_run',
        'pending_review'
      ),
    },
    /* T014-T017: review-flow demo tasks (issue #302). Numbers follow the
       seeded review-state matrix staged at boot by
       annotation-workspace.data.js: pending counts are the review units
       still 待審 (T014=6 of 15, T015=1 of 4, T016=0 of 5, T017=1 of 5)
       and the percentage is the share of units past 待審 — labeled
       審核覆蓋率 (review coverage), not 進度, because a unit past MY review
       is not necessarily finalized (issue #310): T016 sits at coverage
       100% with 3 units still unfinalized (1 approved + 1 modified +
       1 disputed awaiting arbitration), so its summary swaps the vacuous
       待審 0 for the 未定稿 3 · 爭議 1 breakdown. Reviewer
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
      reviewer: workItem(
        'dry-01-all-agree',
        '待審 6 筆 · 審核覆蓋率 60% · IAA 0.72',
        '6 Pending · 60% Review Coverage · IAA 0.72',
        60,
        'dry_run',
        'pending_review',
        'reviewer_chen'
      ),
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
      reviewer: workItem(
        'ofs-01-agree-gold',
        '待審 1 筆 · 審核覆蓋率 75% · IAA 0.81',
        '1 Pending · 75% Review Coverage · IAA 0.81',
        75,
        'official_run',
        'pending_review',
        'reviewer_chen'
      ),
    },
    {
      exampleTaskId: 'T016',
      annotationTaskType: 'single_sentence_classification',
      annotator: workItem(
        'ofm-01-unanimous-gold',
        '已完成 100% · 今日 15 筆 · 平均速度 2.9',
        '100% Completed · 15 Today · Avg Speed 2.9',
        100,
        'official_run',
        'in_progress'
      ),
      reviewer: workItem(
        'ofm-01-unanimous-gold',
        '審核覆蓋率 100% · 未定稿 3 筆 · 爭議 1 筆 · IAA 0.68',
        '100% Review Coverage · 3 Unfinalized · 1 Disputed · IAA 0.68',
        100,
        'official_run',
        'in_progress',
        'reviewer_chen'
      ),
    },
    {
      exampleTaskId: 'T017',
      annotationTaskType: 'single_sentence_classification',
      annotator: workItem(
        'oft-01-even-tie',
        '已完成 100% · 今日 10 筆 · 平均速度 3.2',
        '100% Completed · 10 Today · Avg Speed 3.2',
        100,
        'official_run',
        'in_progress'
      ),
      reviewer: workItem(
        'oft-01-even-tie',
        '待審 1 筆 · 審核覆蓋率 80% · IAA 0.70',
        '1 Pending · 80% Review Coverage · IAA 0.70',
        80,
        'official_run',
        'pending_review',
        'reviewer_chen'
      ),
    },
  ];

  /* Shared export: annotation-list.html reads the same seeds so its task
     info card shows the exact stats/progress the dashboard row shows
     (spec 015 FR-007C/FR-007D). Published before the dashboard guard so
     pages without LabelSuiteDashboard can still consume it. */
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
    };
  }

  dashboard.data.roleLists.annotator = assignments.map(function (assignment) {
    return createRoleEntry(assignment, 'annotator');
  });
  dashboard.data.roleLists.reviewer = assignments.map(function (assignment) {
    return createRoleEntry(assignment, 'reviewer');
  });
}(window));
