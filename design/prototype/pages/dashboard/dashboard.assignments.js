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
    reviewerId,
    iaa
  ) {
    return {
      latestUnfinishedSampleId: sampleId,
      detail: text(detailZh, detailEn),
      progress: progress,
      runType: runType,
      status: status,
      reviewerId: reviewerId || '',
      /* issue #450: IAA is a structured seed value, not a slice of a
         prebuilt display string -- the derived reviewer summary composes
         its own text and appends this number. Reviewer entries only.
         issue #491: the three states stay distinct all the way to
         formatReviewSummary -- a number, `null` for "derived, not
         computable", and `undefined` for "this task has no IAA line".
         Collapsing undefined into null here would make every task without
         an IAA seed claim its agreement could not be computed. */
      iaa: iaa,
    };
  }

  /* issue #489/#491: T014's reviewer summary must show the IAA that
   * computeIaaAlpha() derives from the marked submissions instead of an
   * independent hardcoded figure -- the seed text, the seed's English
   * text, and the workItem() `iaa` argument all read the same value.
   * When alpha is not computable the label says so explicitly: 0.00 would
   * misread as "total disagreement" when it actually means "not enough
   * data" (issue #491), so a missing/undefined value never reaches the
   * numeric slot either. computeIaaAlpha lives in
   * annotation-workspace.data.js, loaded before this script on every page
   * that includes both (dashboard.html, annotation-list.html); the guard
   * below only protects against that script being absent entirely. */
  function deriveDemoIaaAlpha(taskId, runType, outKey) {
    var workspaceData = global.LabelSuiteAnnotationWorkspaceData;
    if (!workspaceData || !workspaceData.computeIaaAlpha) return null;
    var result = workspaceData.computeIaaAlpha(taskId, runType, outKey);
    return result.computable ? result.alpha : null;
  }

  function demoIaaSummary(taskId, runType, outKey) {
    var alpha = deriveDemoIaaAlpha(taskId, runType, outKey);
    return {
      value: alpha,
      label: alpha === null
        ? text('IAA 無法計算', 'IAA Not computable')
        : text('IAA ' + alpha.toFixed(2), 'IAA ' + alpha.toFixed(2)),
    };
  }

  /* issue #501: T001-T013's reviewer summary previously carried three
   * independent hardcoded numbers (待審 N 個審核單位 / 任務覆蓋率 N% / IAA
   * N.NN), none derived from any seed data. Unlike T014-T017 (issue #489),
   * these thirteen tasks have no staged review-unit state -- no equivalent
   * of seedReviewFlowDemo() ever writes their REVIEWER_MOCK_ROWS answers
   * into a submission bucket -- so computeReviewSummary() is never
   * derivable for them and computeIaaAlpha() never has marks to read.
   * dataset-017 FR-039.4 requires an explicit "not computable" state
   * instead of a fabricated fallback number, so both derivations run for
   * real here and the wording only changes based on what they return.
   * The condition is data presence (summary.derivable), never a task id
   * (Generalization-First): if a future seed stages real review-unit state
   * for one of these tasks, this same helper renders the live
   * computeReviewSummary()/formatReviewSummary() text automatically. */
  function demoReviewerSummary(taskId, runType, outKey) {
    var workspaceData = global.LabelSuiteAnnotationWorkspaceData;
    var iaaSummary = demoIaaSummary(taskId, runType, outKey);
    var reviewSummary = workspaceData && workspaceData.computeReviewSummary
      ? workspaceData.computeReviewSummary(taskId, runType)
      : null;
    if (reviewSummary && reviewSummary.derivable && workspaceData.formatReviewSummary) {
      return {
        value: iaaSummary.value,
        progress: reviewSummary.coveragePct,
        label: workspaceData.formatReviewSummary(reviewSummary, iaaSummary.value),
      };
    }
    return {
      value: iaaSummary.value,
      progress: 0,
      label: {
        zh: '審核單位狀態無法推導 · ' + iaaSummary.label.zh,
        en: 'Review unit status not derivable · ' + iaaSummary.label.en,
      },
    };
  }

  var t001ReviewerSummary = demoReviewerSummary('T001', 'official_run', 'single_label');
  var t002ReviewerSummary = demoReviewerSummary('T002', 'dry_run', 'multi_label');
  var t003ReviewerSummary = demoReviewerSummary('T003', 'official_run', 'multi_label');
  var t004ReviewerSummary = demoReviewerSummary('T004', 'dry_run', 'single_dim');
  var t005ReviewerSummary = demoReviewerSummary('T005', 'dry_run', 'multi_dim');
  var t006ReviewerSummary = demoReviewerSummary('T006', 'official_run', 'sequence_tagging');
  var t007ReviewerSummary = demoReviewerSummary('T007', 'official_run', 'entity_recognition');
  var t008ReviewerSummary = demoReviewerSummary('T008', 'official_run', 'relation_identification');
  var t009ReviewerSummary = demoReviewerSummary('T009', 'dry_run', 'free_text');
  var t010ReviewerSummary = demoReviewerSummary('T010', 'official_run', 'entity_recognition');
  var t011ReviewerSummary = demoReviewerSummary('T011', 'dry_run', 'single_label');
  var t012ReviewerSummary = demoReviewerSummary('T012', 'official_run', 'free_text');
  var t013ReviewerSummary = demoReviewerSummary('T013', 'official_run', 'entity_recognition');

  var t014ReviewerIaa = demoIaaSummary('T014', 'dry_run', 'single_label');

  /* T015-T017 are official_run: exactly one annotator per sample, so there
   * is no second rater to disagree with -- alpha is undefined, not low.
   * These seeds previously carried 0.81 / 0.68 / 0.70, fabricated precision
   * for a measurement that cannot exist for this run type. Routed through
   * the same helper so they say "not computable" instead of inventing one. */
  var t015ReviewerIaa = demoIaaSummary('T015', 'official_run', 'single_label');
  var t016ReviewerIaa = demoIaaSummary('T016', 'official_run', 'single_label');
  var t017ReviewerIaa = demoIaaSummary('T017', 'official_run', 'single_label');

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
        t001ReviewerSummary.label.zh,
        t001ReviewerSummary.label.en,
        t001ReviewerSummary.progress,
        'official_run',
        'pending_review',
        '',
        t001ReviewerSummary.value
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
        t002ReviewerSummary.label.zh,
        t002ReviewerSummary.label.en,
        t002ReviewerSummary.progress,
        'dry_run',
        'pending_review',
        '',
        t002ReviewerSummary.value
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
        t003ReviewerSummary.label.zh,
        t003ReviewerSummary.label.en,
        t003ReviewerSummary.progress,
        'official_run',
        'pending_review',
        '',
        t003ReviewerSummary.value
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
        t004ReviewerSummary.label.zh,
        t004ReviewerSummary.label.en,
        t004ReviewerSummary.progress,
        'dry_run',
        'in_progress',
        '',
        t004ReviewerSummary.value
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
        t005ReviewerSummary.label.zh,
        t005ReviewerSummary.label.en,
        t005ReviewerSummary.progress,
        'dry_run',
        'in_progress',
        '',
        t005ReviewerSummary.value
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
        t006ReviewerSummary.label.zh,
        t006ReviewerSummary.label.en,
        t006ReviewerSummary.progress,
        'official_run',
        'pending_review',
        '',
        t006ReviewerSummary.value
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
        t007ReviewerSummary.label.zh,
        t007ReviewerSummary.label.en,
        t007ReviewerSummary.progress,
        'official_run',
        'pending_review',
        '',
        t007ReviewerSummary.value
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
        t008ReviewerSummary.label.zh,
        t008ReviewerSummary.label.en,
        t008ReviewerSummary.progress,
        'official_run',
        'pending_review',
        '',
        t008ReviewerSummary.value
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
        t009ReviewerSummary.label.zh,
        t009ReviewerSummary.label.en,
        t009ReviewerSummary.progress,
        'dry_run',
        'in_progress',
        '',
        t009ReviewerSummary.value
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
        t010ReviewerSummary.label.zh,
        t010ReviewerSummary.label.en,
        t010ReviewerSummary.progress,
        'official_run',
        'in_progress',
        '',
        t010ReviewerSummary.value
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
        t011ReviewerSummary.label.zh,
        t011ReviewerSummary.label.en,
        t011ReviewerSummary.progress,
        'dry_run',
        'pending_review',
        '',
        t011ReviewerSummary.value
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
        t012ReviewerSummary.label.zh,
        t012ReviewerSummary.label.en,
        t012ReviewerSummary.progress,
        'official_run',
        'pending_review',
        '',
        t012ReviewerSummary.value
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
        t013ReviewerSummary.label.zh,
        t013ReviewerSummary.label.en,
        t013ReviewerSummary.progress,
        'official_run',
        'pending_review',
        '',
        t013ReviewerSummary.value
      ),
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
      reviewer: workItem(
        'dry-01-all-agree',
        '任務覆蓋 9 / 15 個審核單位 · 待審 6 個 · ' + t014ReviewerIaa.label.zh,
        'Task coverage 9 / 15 review units · 6 pending · ' + t014ReviewerIaa.label.en,
        60,
        'dry_run',
        'pending_review',
        'reviewer_chen',
        t014ReviewerIaa.value
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
        '任務覆蓋 3 / 4 個審核單位 · 待審 1 個 · ' + t015ReviewerIaa.label.zh,
        'Task coverage 3 / 4 review units · 1 pending · ' + t015ReviewerIaa.label.en,
        75,
        'official_run',
        'pending_review',
        'reviewer_chen',
        t015ReviewerIaa.value
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
        '任務覆蓋 5 / 5 個審核單位 · 未達定稿門檻 3 個 · 爭議中 1 個 · ' + t016ReviewerIaa.label.zh,
        'Task coverage 5 / 5 review units · 3 short of finalize threshold · 1 disputed · ' + t016ReviewerIaa.label.en,
        100,
        'official_run',
        'in_progress',
        'reviewer_chen',
        t016ReviewerIaa.value
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
        '任務覆蓋 4 / 5 個審核單位 · 待審 1 個 · ' + t017ReviewerIaa.label.zh,
        'Task coverage 4 / 5 review units · 1 pending · ' + t017ReviewerIaa.label.en,
        80,
        'official_run',
        'pending_review',
        'reviewer_chen',
        t017ReviewerIaa.value
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
