(function (global) {
  'use strict';

  var outputTypes = [
    {
      key: 'single_label',
      zh: '單一標籤',
      en: 'Single label',
      badgeClass: 'badge-task-type-single'
    },
    {
      key: 'multi_label',
      zh: '多標籤',
      en: 'Multi-label',
      badgeClass: 'badge-task-type-single'
    },
    {
      key: 'single_dim',
      zh: '單維度',
      en: 'Single dimension',
      badgeClass: 'badge-task-type-scoring'
    },
    {
      key: 'multi_dim',
      zh: '多維度',
      en: 'Multi-dimension',
      badgeClass: 'badge-task-type-scoring'
    },
    {
      key: 'sequence_tagging',
      zh: '序列標註',
      en: 'Sequence Tagging',
      badgeClass: 'badge-task-type-sequence'
    },
    {
      key: 'entity_recognition',
      zh: '實體辨識',
      en: 'Entity Recognition',
      badgeClass: 'badge-task-type-sequence'
    },
    {
      key: 'relation_identification',
      zh: '關係識別',
      en: 'Relation Identification',
      badgeClass: 'badge-task-type-relation'
    },
    {
      key: 'free_text',
      zh: '自由文字',
      en: 'Free text',
      badgeClass: 'badge-task-type-pairs'
    }
  ];

  /*
   * These 13 safe summary records are the docs/product/example-data
   * prototype baseline. They are not a task whitelist or a system limit.
   * Fixture payloads and gold/reference/answer fields are intentionally
   * excluded from this list-facing module.
   */
  var tasks = [
    {
      id: 'T001',
      nameZh: '醫療文本情感分類',
      nameEn: 'Medical Text Sentiment Classification',
      sourceFile: 'single-label.json',
      outputTypes: ['single_label'],
      completionRate: 89,
      iaaStatus: 'pass',
      membershipRole: 'project_leader'
    },
    {
      id: 'T002',
      nameZh: '癌症歷程情緒多標籤分類',
      nameEn: 'Cancer Journey Emotion Multi-label Classification',
      sourceFile: 'multi-label.json',
      outputTypes: ['multi_label'],
      completionRate: 42,
      iaaStatus: 'pending',
      membershipRole: 'reviewer'
    },
    {
      id: 'T003',
      nameZh: '病患情緒與照護情境階層分類',
      nameEn: 'Patient Emotion and Care Context Hierarchical Classification',
      sourceFile: 'multi-label-hierarchical.json',
      outputTypes: ['multi_label'],
      completionRate: 18,
      iaaStatus: 'not_started',
      membershipRole: 'project_leader'
    },
    {
      id: 'T004',
      nameZh: '醫療文本可讀性評分',
      nameEn: 'Medical Text Readability Scoring',
      sourceFile: 'single-dim.json',
      outputTypes: ['single_dim'],
      completionRate: 58,
      iaaStatus: 'pending',
      membershipRole: 'reviewer'
    },
    {
      id: 'T005',
      nameZh: '醫療翻譯品質多維度評分',
      nameEn: 'Medical Translation Quality Scoring',
      sourceFile: 'multi-dim.json',
      outputTypes: ['multi_dim'],
      completionRate: 76,
      iaaStatus: 'pass',
      membershipRole: 'reviewer'
    },
    {
      id: 'T006',
      nameZh: '新聞命名實體序列標註',
      nameEn: 'News NER Sequence Tagging',
      sourceFile: 'sequence-tagging.json',
      outputTypes: ['sequence_tagging'],
      completionRate: 71,
      iaaStatus: 'pass',
      membershipRole: 'reviewer'
    },
    {
      id: 'T007',
      nameZh: '產品評論觀點實體辨識',
      nameEn: 'Product Review Opinion Entity Recognition',
      sourceFile: 'entity-recognition.json',
      outputTypes: ['entity_recognition'],
      completionRate: 64,
      iaaStatus: 'pass',
      membershipRole: 'project_leader'
    },
    {
      id: 'T008',
      nameZh: '醫療文本關係辨識',
      nameEn: 'Medical Relation Identification',
      sourceFile: 'relation-identification.json',
      outputTypes: ['relation_identification'],
      completionRate: 37,
      iaaStatus: 'fail',
      membershipRole: 'project_leader'
    },
    {
      id: 'T009',
      nameZh: '醫療文本摘要',
      nameEn: 'Medical Text Summarization',
      sourceFile: 'free-text.json',
      outputTypes: ['free_text'],
      completionRate: 25,
      iaaStatus: 'not_started',
      membershipRole: 'reviewer'
    },
    {
      id: 'T010',
      nameZh: '醫療實體與關係辨識',
      nameEn: 'Medical Entity and Relation Recognition',
      sourceFile: 'medical-ner-re.json',
      outputTypes: ['entity_recognition', 'relation_identification'],
      completionRate: 53,
      iaaStatus: 'pending',
      membershipRole: 'project_leader'
    },
    {
      id: 'T011',
      nameZh: '醫療自然語言推斷',
      nameEn: 'Medical NLI',
      sourceFile: 'nli.json',
      outputTypes: ['single_label'],
      completionRate: 82,
      iaaStatus: 'pass',
      membershipRole: 'reviewer'
    },
    {
      id: 'T012',
      nameZh: '醫療閱讀理解問答',
      nameEn: 'Medical QA',
      sourceFile: 'mrc.json',
      outputTypes: ['free_text'],
      completionRate: 100,
      iaaStatus: 'pass',
      membershipRole: 'reviewer'
    },
    {
      id: 'T013',
      nameZh: 'ABSA + 情緒回歸（YouTube 留言）',
      nameEn: 'ABSA + Emotion Regression (YouTube Comments)',
      sourceFile: 'absa-va.json',
      outputTypes: [
        'entity_recognition',
        'relation_identification',
        'multi_dim'
      ],
      completionRate: 46,
      iaaStatus: 'fail',
      membershipRole: 'project_leader'
    }
  ];

  global.LabelSuiteDatasetAnalysisListData = {
    outputTypes: outputTypes,
    tasks: tasks
  };
}(window));
