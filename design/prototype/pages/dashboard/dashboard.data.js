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
  };

  dashboard.data = {
    outputTypes: outputTypes,
    tasks: tasks,
    roleLists: roleLists,
  };
  global.LabelSuiteDashboard = dashboard;
}(window));
