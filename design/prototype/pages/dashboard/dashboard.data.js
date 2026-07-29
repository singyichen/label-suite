(function (global) {
  'use strict';

  var dashboard = global.LabelSuiteDashboard || {};

  function text(zh, en) {
    return { zh: zh, en: en };
  }

  var outputTypes = [
    {
      key: 'single_label',
      zh: '單一標籤',
      en: 'Single label',
      badgeClass: 'badge-task-type-single',
    },
    {
      key: 'multi_label',
      zh: '多標籤',
      en: 'Multi-label',
      badgeClass: 'badge-task-type-single',
    },
    {
      key: 'single_dim',
      zh: '單維度',
      en: 'Single dimension',
      badgeClass: 'badge-task-type-scoring',
    },
    {
      key: 'multi_dim',
      zh: '多維度',
      en: 'Multi-dimension',
      badgeClass: 'badge-task-type-scoring',
    },
    {
      key: 'sequence_tagging',
      zh: '序列標註',
      en: 'Sequence Tagging',
      badgeClass: 'badge-task-type-sequence',
    },
    {
      key: 'entity_recognition',
      zh: '實體辨識',
      en: 'Entity Recognition',
      badgeClass: 'badge-task-type-sequence',
    },
    {
      key: 'relation_identification',
      zh: '關係識別',
      en: 'Relation Identification',
      badgeClass: 'badge-task-type-relation',
    },
    {
      key: 'free_text',
      zh: '自由文字',
      en: 'Free text',
      badgeClass: 'badge-task-type-pairs',
    },
  ];

  /*
   * These records are safe list summaries derived from
   * docs/product/example-data. They are illustrative data, not a
   * task whitelist or an output-composition limit.
   */
  var tasks = [
    {
      id: 'T001',
      nameZh: '醫療文本情感分類',
      nameEn: 'Medical Text Sentiment Classification',
      sourceFile: 'single-label.json',
      outputTypes: ['single_label'],
    },
    {
      id: 'T002',
      nameZh: '癌症歷程情緒多標籤分類',
      nameEn: 'Cancer Journey Emotion Multi-label Classification',
      sourceFile: 'multi-label.json',
      outputTypes: ['multi_label'],
    },
    {
      id: 'T003',
      nameZh: '病患情緒與照護情境階層分類',
      nameEn: 'Patient Emotion and Care Context Hierarchical Classification',
      sourceFile: 'multi-label-hierarchical.json',
      outputTypes: ['multi_label'],
    },
    {
      id: 'T004',
      nameZh: '醫療文本可讀性評分',
      nameEn: 'Medical Text Readability Scoring',
      sourceFile: 'single-dim.json',
      outputTypes: ['single_dim'],
    },
    {
      id: 'T005',
      nameZh: '醫療翻譯品質多維度評分',
      nameEn: 'Medical Translation Quality Scoring',
      sourceFile: 'multi-dim.json',
      outputTypes: ['multi_dim'],
    },
    {
      id: 'T006',
      nameZh: '新聞命名實體序列標註',
      nameEn: 'News NER Sequence Tagging',
      sourceFile: 'sequence-tagging.json',
      outputTypes: ['sequence_tagging'],
    },
    {
      id: 'T007',
      nameZh: '產品評論觀點實體辨識',
      nameEn: 'Product Review Opinion Entity Recognition',
      sourceFile: 'entity-recognition.json',
      outputTypes: ['entity_recognition'],
    },
    {
      id: 'T008',
      nameZh: '醫療文本關係辨識',
      nameEn: 'Medical Relation Identification',
      sourceFile: 'relation-identification.json',
      outputTypes: ['relation_identification'],
    },
    {
      id: 'T009',
      nameZh: '醫療文本摘要',
      nameEn: 'Medical Text Summarization',
      sourceFile: 'free-text.json',
      outputTypes: ['free_text'],
    },
    {
      id: 'T010',
      nameZh: '醫療實體與關係辨識',
      nameEn: 'Medical Entity and Relation Recognition',
      sourceFile: 'medical-ner-re.json',
      outputTypes: ['entity_recognition', 'relation_identification'],
    },
    {
      id: 'T011',
      nameZh: '醫療自然語言推斷',
      nameEn: 'Medical NLI',
      sourceFile: 'nli.json',
      outputTypes: ['single_label'],
    },
    {
      id: 'T012',
      nameZh: '醫療閱讀理解問答',
      nameEn: 'Medical QA',
      sourceFile: 'mrc.json',
      outputTypes: ['free_text'],
    },
    {
      id: 'T013',
      nameZh: 'ABSA + 情緒回歸（YouTube 留言）',
      nameEn: 'ABSA + Emotion Regression (YouTube Comments)',
      sourceFile: 'absa-va.json',
      outputTypes: [
        'entity_recognition',
        'relation_identification',
        'multi_dim',
      ],
    },
  ];

  var roleLists = {
    admin: [
      {
        exampleTaskId: 'T002',
        slotId: 'adminTask1',
        detail: text(
          '專案負責人A · 審核員A · 8 位標記員 · 已完成 89%',
          'Project Leader A · Reviewer A · 8 Annotators · 89% Completed'
        ),
        progress: 89,
        runType: 'dry_run',
        status: 'waiting_confirmation',
      },
      {
        exampleTaskId: 'T005',
        slotId: 'adminTask2',
        detail: text(
          '專案負責人B · 審核員B · 6 位標記員 · 已完成 42%',
          'Project Leader B · Reviewer B · 6 Annotators · 42% Completed'
        ),
        progress: 42,
        runType: 'official_run',
        status: 'in_progress',
      },
      {
        exampleTaskId: 'T010',
        slotId: 'adminTask3',
        detail: text(
          '專案負責人C · 審核員C · 5 位標記員 · 已完成 53%',
          'Project Leader C · Reviewer C · 5 Annotators · 53% Completed'
        ),
        progress: 53,
        runType: 'official_run',
        status: 'in_progress',
      },
    ],
    projectLeader: [
      {
        exampleTaskId: 'T003',
        slotId: 'plTask1',
        detail: text(
          '審核員A · 8 位標記員 · 已完成 18%',
          'Reviewer A · 8 Annotators · 18% Completed'
        ),
        progress: 18,
        runType: 'dry_run',
        status: 'in_progress',
      },
      {
        exampleTaskId: 'T007',
        slotId: 'plTask2',
        detail: text(
          '審核員B · 6 位標記員 · 已完成 64%',
          'Reviewer B · 6 Annotators · 64% Completed'
        ),
        progress: 64,
        runType: 'official_run',
        status: 'in_progress',
      },
      {
        exampleTaskId: 'T010',
        slotId: 'plTask3',
        detail: text(
          '審核員C · 5 位標記員 · 已完成 53%',
          'Reviewer C · 5 Annotators · 53% Completed'
        ),
        progress: 53,
        runType: 'official_run',
        status: 'in_progress',
      },
    ],
    annotator: [
      {
        exampleTaskId: 'T003',
        navigationTaskId: 'TASK-015-A1',
        latestUnfinishedSampleId: 'A1-002',
        annotationTaskType: 'single_sentence_classification',
        detail: text(
          '已完成 18% · 今日 53 筆 · 平均速度 3.0',
          '18% Completed · 53 Today · Avg Speed 3.0'
        ),
        progress: 18,
        runType: 'official_run',
        status: 'continue',
      },
      {
        exampleTaskId: 'T005',
        navigationTaskId: 'TASK-015-A2',
        latestUnfinishedSampleId: 'A2-003',
        annotationTaskType: 'single_sentence_va_scoring',
        detail: text(
          '已完成 76% · 今日 18 筆 · 平均速度 4.2',
          '76% Completed · 18 Today · Avg Speed 4.2'
        ),
        progress: 76,
        runType: 'dry_run',
        status: 'resume',
      },
      {
        exampleTaskId: 'T006',
        navigationTaskId: 'TASK-015-A6',
        latestUnfinishedSampleId: 'NER-003',
        annotationTaskType: 'sequence_labeling',
        subType: 'ner',
        detail: text(
          '已完成 71% · 今日 12 筆 · 平均速度 2.5',
          '71% Completed · 12 Today · Avg Speed 2.5'
        ),
        progress: 71,
        runType: 'official_run',
        status: 'in_progress',
      },
      {
        exampleTaskId: 'T007',
        navigationTaskId: 'TASK-015-A3',
        latestUnfinishedSampleId: 'AL-003',
        annotationTaskType: 'sequence_labeling',
        subType: 'aspect_list',
        detail: text(
          '已完成 64% · 今日 31 筆 · 平均速度 2.8',
          '64% Completed · 31 Today · Avg Speed 2.8'
        ),
        progress: 64,
        runType: 'official_run',
        status: 'in_progress',
      },
      {
        exampleTaskId: 'T010',
        navigationTaskId: 'TASK-015-A4',
        latestUnfinishedSampleId: 'RE-003',
        annotationTaskType: 'relation_extraction',
        detail: text(
          '已完成 53% · 今日 14 筆 · 平均速度 5.1',
          '53% Completed · 14 Today · Avg Speed 5.1'
        ),
        progress: 53,
        runType: 'official_run',
        status: 'resume',
      },
      {
        exampleTaskId: 'T011',
        navigationTaskId: 'TASK-015-A5',
        latestUnfinishedSampleId: 'A5-003',
        annotationTaskType: 'sentence_pairs',
        detail: text(
          '已完成 82% · 今日 25 筆 · 平均速度 3.4',
          '82% Completed · 25 Today · Avg Speed 3.4'
        ),
        progress: 82,
        runType: 'dry_run',
        status: 'in_progress',
      },
    ],
    reviewer: [
      {
        exampleTaskId: 'T003',
        navigationTaskId: 'TASK-015-R1',
        latestUnfinishedSampleId: 'R1-001',
        annotationTaskType: 'single_sentence_classification',
        detail: text(
          '待審 12 筆 · 進度 18% · IAA 0.81',
          '12 Pending · 18% Progress · IAA 0.81'
        ),
        progress: 18,
        runType: 'official_run',
        status: 'pending_review',
      },
      {
        exampleTaskId: 'T005',
        navigationTaskId: 'TASK-015-R2',
        latestUnfinishedSampleId: 'R2-003',
        annotationTaskType: 'single_sentence_va_scoring',
        detail: text(
          '待審 8 筆 · 進度 76% · IAA 0.78',
          '8 Pending · 76% Progress · IAA 0.78'
        ),
        progress: 76,
        runType: 'dry_run',
        status: 'in_progress',
      },
      {
        exampleTaskId: 'T006',
        navigationTaskId: 'TASK-015-R6',
        latestUnfinishedSampleId: 'NER-003',
        annotationTaskType: 'sequence_labeling',
        subType: 'ner',
        detail: text(
          '待審 10 筆 · 進度 71% · IAA 0.79',
          '10 Pending · 71% Progress · IAA 0.79'
        ),
        progress: 71,
        runType: 'official_run',
        status: 'pending_review',
      },
      {
        exampleTaskId: 'T007',
        navigationTaskId: 'TASK-015-R3',
        latestUnfinishedSampleId: 'AL-003',
        annotationTaskType: 'sequence_labeling',
        detail: text(
          '待審 15 筆 · 進度 64% · IAA 0.83',
          '15 Pending · 64% Progress · IAA 0.83'
        ),
        progress: 64,
        runType: 'official_run',
        status: 'pending_review',
      },
      {
        exampleTaskId: 'T010',
        navigationTaskId: 'TASK-015-R4',
        latestUnfinishedSampleId: 'RE-003',
        annotationTaskType: 'relation_extraction',
        detail: text(
          '待審 9 筆 · 進度 53% · IAA 0.79',
          '9 Pending · 53% Progress · IAA 0.79'
        ),
        progress: 53,
        runType: 'official_run',
        status: 'in_progress',
      },
      {
        exampleTaskId: 'T011',
        navigationTaskId: 'TASK-015-R5',
        latestUnfinishedSampleId: 'R5-003',
        annotationTaskType: 'sentence_pairs',
        detail: text(
          '待審 11 筆 · 進度 82% · IAA 0.82',
          '11 Pending · 82% Progress · IAA 0.82'
        ),
        progress: 82,
        runType: 'dry_run',
        status: 'pending_review',
      },
    ],
  };

  dashboard.data = {
    outputTypes: outputTypes,
    tasks: tasks,
    roleLists: roleLists,
  };
  global.LabelSuiteDashboard = dashboard;
}(window));
