(function (global) {
  'use strict';

  var dashboard = global.LabelSuiteDashboard;
  if (!dashboard || !dashboard.data || !dashboard.data.roleLists) return;

  function text(zh, en) {
    return { zh: zh, en: en };
  }

  function workItem(
    navigationTaskId,
    sampleId,
    detailZh,
    detailEn,
    progress,
    runType,
    status
  ) {
    return {
      navigationTaskId: navigationTaskId,
      latestUnfinishedSampleId: sampleId,
      detail: text(detailZh, detailEn),
      progress: progress,
      runType: runType,
      status: status,
    };
  }

  /*
   * annotationTaskType is an explicit compatibility route for the
   * current static annotation prototype. It is not derived from the
   * task outputs and does not redefine the output-type contract.
   */
  var assignments = [
    {
      exampleTaskId: 'T001',
      annotationTaskType: 'single_sentence_classification',
      annotator: workItem(
        'TASK-015-A7',
        'R2-003',
        '已完成 34% · 今日 21 筆 · 平均速度 3.1',
        '34% Completed · 21 Today · Avg Speed 3.1',
        34,
        'official_run',
        'continue'
      ),
      reviewer: workItem(
        'TASK-015-R7',
        'R2-003',
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
        'TASK-015-A8',
        'R2-003',
        '已完成 48% · 今日 17 筆 · 平均速度 3.6',
        '48% Completed · 17 Today · Avg Speed 3.6',
        48,
        'dry_run',
        'resume'
      ),
      reviewer: workItem(
        'TASK-015-R8',
        'R2-003',
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
        'TASK-015-A1',
        'A1-002',
        '已完成 18% · 今日 53 筆 · 平均速度 3.0',
        '18% Completed · 53 Today · Avg Speed 3.0',
        18,
        'official_run',
        'continue'
      ),
      reviewer: workItem(
        'TASK-015-R1',
        'R1-001',
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
        'TASK-015-A9',
        'R2-003',
        '已完成 61% · 今日 29 筆 · 平均速度 2.9',
        '61% Completed · 29 Today · Avg Speed 2.9',
        61,
        'dry_run',
        'resume'
      ),
      reviewer: workItem(
        'TASK-015-R9',
        'R2-003',
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
        'TASK-015-A2',
        'A2-003',
        '已完成 76% · 今日 18 筆 · 平均速度 4.2',
        '76% Completed · 18 Today · Avg Speed 4.2',
        76,
        'dry_run',
        'resume'
      ),
      reviewer: workItem(
        'TASK-015-R2',
        'R2-003',
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
      subType: 'ner',
      annotator: workItem(
        'TASK-015-A6',
        'NER-003',
        '已完成 71% · 今日 12 筆 · 平均速度 2.5',
        '71% Completed · 12 Today · Avg Speed 2.5',
        71,
        'official_run',
        'in_progress'
      ),
      reviewer: workItem(
        'TASK-015-R6',
        'NER-003',
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
      subType: 'aspect_list',
      annotator: workItem(
        'TASK-015-A3',
        'AL-003',
        '已完成 64% · 今日 31 筆 · 平均速度 2.8',
        '64% Completed · 31 Today · Avg Speed 2.8',
        64,
        'official_run',
        'in_progress'
      ),
      reviewer: workItem(
        'TASK-015-R3',
        'AL-003',
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
        'TASK-015-A10',
        'RE-003',
        '已完成 45% · 今日 16 筆 · 平均速度 4.8',
        '45% Completed · 16 Today · Avg Speed 4.8',
        45,
        'official_run',
        'resume'
      ),
      reviewer: workItem(
        'TASK-015-R10',
        'RE-003',
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
        'TASK-015-A11',
        'R2-003',
        '已完成 37% · 今日 9 筆 · 平均速度 5.4',
        '37% Completed · 9 Today · Avg Speed 5.4',
        37,
        'dry_run',
        'in_progress'
      ),
      reviewer: workItem(
        'TASK-015-R11',
        'R2-003',
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
        'TASK-015-A4',
        'RE-003',
        '已完成 53% · 今日 14 筆 · 平均速度 5.1',
        '53% Completed · 14 Today · Avg Speed 5.1',
        53,
        'official_run',
        'resume'
      ),
      reviewer: workItem(
        'TASK-015-R4',
        'RE-003',
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
        'TASK-015-A5',
        'A5-003',
        '已完成 82% · 今日 25 筆 · 平均速度 3.4',
        '82% Completed · 25 Today · Avg Speed 3.4',
        82,
        'dry_run',
        'in_progress'
      ),
      reviewer: workItem(
        'TASK-015-R5',
        'R5-003',
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
        'TASK-015-A12',
        'SP-003',
        '已完成 29% · 今日 8 筆 · 平均速度 5.8',
        '29% Completed · 8 Today · Avg Speed 5.8',
        29,
        'official_run',
        'continue'
      ),
      reviewer: workItem(
        'TASK-015-R12',
        'SP-003',
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
        'TASK-015-A13',
        'RE-003',
        '已完成 58% · 今日 13 筆 · 平均速度 5.0',
        '58% Completed · 13 Today · Avg Speed 5.0',
        58,
        'official_run',
        'resume'
      ),
      reviewer: workItem(
        'TASK-015-R13',
        'RE-003',
        '待審 8 筆 · 進度 58% · IAA 0.80',
        '8 Pending · 58% Progress · IAA 0.80',
        58,
        'official_run',
        'pending_review'
      ),
    },
  ];

  function createRoleEntry(assignment, role) {
    var work = assignment[role];
    var entry = {
      exampleTaskId: assignment.exampleTaskId,
      navigationTaskId: work.navigationTaskId,
      latestUnfinishedSampleId: work.latestUnfinishedSampleId,
      annotationTaskType: assignment.annotationTaskType,
      detail: work.detail,
      progress: work.progress,
      runType: work.runType,
      status: work.status,
    };
    if (assignment.subType) entry.subType = assignment.subType;
    return entry;
  }

  dashboard.data.roleLists.annotator = assignments.map(function (assignment) {
    return createRoleEntry(assignment, 'annotator');
  });
  dashboard.data.roleLists.reviewer = assignments.map(function (assignment) {
    return createRoleEntry(assignment, 'reviewer');
  });
}(window));
